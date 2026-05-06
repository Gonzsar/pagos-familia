'use client';

import { useEffect, useMemo, useState } from 'react';
import { Plus, AlertCircle } from 'lucide-react';
import { Button } from '@/components/ui/button';
import { TotalsCards } from '@/components/totals-cards';
import { PaymentRow } from '@/components/payment-row';
import { PaymentForm } from '@/components/payment-form';
import { combineTotals } from '@/lib/currency';
import { computeDisplayStatus } from '@/lib/payments';
import { toast } from 'sonner';
import type { Category, PaymentWithCategory } from '@/lib/types';

export default function DashboardPage() {
  const [payments, setPayments] = useState<PaymentWithCategory[]>([]);
  const [categories, setCategories] = useState<Category[]>([]);
  const [uyuPerUsd, setUyuPerUsd] = useState<number | null>(null);
  const [loading, setLoading] = useState(true);
  const [editing, setEditing] = useState<PaymentWithCategory | null>(null);
  const [formOpen, setFormOpen] = useState(false);
  const [payingId, setPayingId] = useState<string | null>(null);

  const today = new Date().toISOString().slice(0, 10);

  useEffect(() => {
    Promise.all([
      fetch('/api/payments').then(r => r.json()),
      fetch('/api/categories').then(r => r.json()),
      fetch('/api/exchange-rate').then(r => r.json()),
    ]).then(([p, c, r]) => {
      setPayments(p);
      setCategories(c);
      setUyuPerUsd(r.uyuPerUsd);
      setLoading(false);
    });
  }, []);

  const totals = useMemo(() => combineTotals(payments, uyuPerUsd), [payments, uyuPerUsd]);

  const grouped = useMemo(() => {
    const byCat: Record<string, { category: Category | null; payments: PaymentWithCategory[] }> = {};
    for (const p of payments) {
      const key = p.category?.id ?? 'sin-categoria';
      if (!byCat[key]) byCat[key] = { category: p.category, payments: [] };
      byCat[key].payments.push(p);
    }
    return Object.values(byCat).sort((a, b) => (a.category?.position ?? 99) - (b.category?.position ?? 99));
  }, [payments]);

  const alerts = useMemo(() => {
    let venceHoy = 0;
    let estaSemana = 0;
    for (const p of payments) {
      const s = computeDisplayStatus(p, today);
      if (s === 'vence_hoy' || s === 'vencido') venceHoy++;
      else if (s === 'urgente' || s === 'proximo') estaSemana++;
    }
    return { venceHoy, estaSemana };
  }, [payments, today]);

  function openNew() {
    setEditing(null);
    setFormOpen(true);
  }

  function openEdit(p: PaymentWithCategory) {
    setEditing(p);
    setFormOpen(true);
  }

  function onSaved(p: PaymentWithCategory) {
    setPayments(prev => {
      const exists = prev.some(x => x.id === p.id);
      if (exists) return prev.map(x => (x.id === p.id ? p : x));
      return [...prev, p];
    });
    toast.success(editing ? 'Pago actualizado' : 'Pago agregado');
  }

  function onDeleted(id: string) {
    setPayments(prev => prev.filter(x => x.id !== id));
    toast.success('Pago eliminado');
  }

  async function pay(p: PaymentWithCategory) {
    setPayingId(p.id);
    const res = await fetch(`/api/payments/${p.id}/pay`, { method: 'POST' });
    if (!res.ok) {
      toast.error('No se pudo marcar el pago');
      setPayingId(null);
      return;
    }
    const updated: PaymentWithCategory = await res.json();
    setPayments(prev => prev.map(x => (x.id === updated.id ? updated : x)));
    toast.success(`${p.name} marcado como pagado`, {
      action: {
        label: 'Deshacer',
        onClick: async () => {
          const u = await fetch(`/api/payments/${p.id}/undo-pay`, { method: 'POST' });
          if (u.ok) {
            const restored = await u.json();
            setPayments(prev => prev.map(x => (x.id === restored.id ? restored : x)));
            toast.success('Pago restaurado');
          } else {
            toast.error('No se pudo deshacer');
          }
        },
      },
    });
    setPayingId(null);
  }

  if (loading) {
    return <div className="text-slate-500">Cargando...</div>;
  }

  return (
    <div className="space-y-6">
      <TotalsCards totals={totals} uyuPerUsd={uyuPerUsd} />

      {(alerts.venceHoy > 0 || alerts.estaSemana > 0) && (
        <div className="flex flex-wrap items-center gap-4 rounded-xl border border-amber-200 bg-amber-50 dark:bg-amber-900/20 dark:border-amber-900/40 p-3 text-sm">
          <AlertCircle className="h-5 w-5 text-amber-600" />
          {alerts.venceHoy > 0 && <span><strong>{alerts.venceHoy}</strong> {alerts.venceHoy === 1 ? 'pago vence' : 'pagos vencen'} hoy o ya vencieron</span>}
          {alerts.estaSemana > 0 && <span>📅 <strong>{alerts.estaSemana}</strong> {alerts.estaSemana === 1 ? 'pago' : 'pagos'} esta semana</span>}
        </div>
      )}

      <div className="flex items-center justify-between">
        <h1 className="text-2xl font-semibold">Pagos</h1>
        <Button onClick={openNew}>
          <Plus className="h-4 w-4 mr-1" /> Agregar pago
        </Button>
      </div>

      {grouped.length === 0 ? (
        <div className="rounded-xl border border-dashed p-10 text-center text-slate-500">
          Todavía no agregaste pagos. Click en "Agregar pago" para empezar.
        </div>
      ) : (
        <div className="space-y-4">
          {grouped.map(({ category, payments: ps }) => (
            <div key={category?.id ?? 'sin'} className="rounded-xl border bg-white dark:bg-slate-900 dark:border-slate-800 overflow-hidden">
              <div className="border-b border-slate-100 dark:border-slate-800 px-4 py-2 text-sm font-medium text-slate-700 dark:text-slate-300">
                {category ? `${category.icon ?? ''} ${category.name}` : 'Sin categoría'}
              </div>
              {ps.map(p => (
                <PaymentRow
                  key={p.id}
                  payment={p}
                  today={today}
                  onEdit={openEdit}
                  onPay={pay}
                  isPaying={payingId === p.id}
                />
              ))}
            </div>
          ))}
        </div>
      )}

      <PaymentForm
        open={formOpen}
        onOpenChange={setFormOpen}
        payment={editing}
        categories={categories}
        onSaved={onSaved}
        onDeleted={onDeleted}
      />
    </div>
  );
}

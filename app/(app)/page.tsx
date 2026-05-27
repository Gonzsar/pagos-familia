'use client';

import { useEffect, useMemo, useState } from 'react';
import Link from 'next/link';
import { Plus, AlertCircle, Landmark } from 'lucide-react';
import { Button } from '@/components/ui/button';
import { TotalsCards } from '@/components/totals-cards';
import { PaymentRow } from '@/components/payment-row';
import { PaymentForm } from '@/components/payment-form';
import { combineTotals } from '@/lib/currency';
import { computeDisplayStatus, effectiveDueDate, isPaidThisCycle } from '@/lib/payments';
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
      // No alertar sobre pagos marcados como "no suma al total" — son los que el usuario consideró no importantes.
      if (p.count_in_totals === false) continue;
      const displayDate = effectiveDueDate(p, today);
      const dp = displayDate === p.due_date ? p : { ...p, due_date: displayDate };
      const s = computeDisplayStatus(dp, today);
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
    // Si es recurrente y ya está marcado como pagado para este ciclo, el click deshace.
    const isCurrentlyPaidCycle = p.is_recurring && isPaidThisCycle(p, today);
    const url = isCurrentlyPaidCycle
      ? `/api/payments/${p.id}/undo-pay`
      : `/api/payments/${p.id}/pay`;

    const res = await fetch(url, { method: 'POST' });
    if (!res.ok) {
      toast.error(isCurrentlyPaidCycle ? 'No se pudo deshacer' : 'No se pudo marcar el pago');
      setPayingId(null);
      return;
    }
    const updated: PaymentWithCategory = await res.json();
    setPayments(prev => prev.map(x => (x.id === updated.id ? updated : x)));

    if (isCurrentlyPaidCycle) {
      toast.success(`${p.name} desmarcado`);
    } else {
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
    }
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
        <h1 className="text-3xl font-bold">Pagos</h1>
        <Button onClick={openNew}>
          <Plus className="h-4 w-4 mr-1" /> Agregar pago
        </Button>
      </div>

      {grouped.length === 0 ? (
        <div className="rounded-xl border border-dashed p-10 text-center text-slate-500">
          Todavía no agregaste pagos. Click en "Agregar pago" para empezar.
        </div>
      ) : (
        <div className="space-y-6">
          {grouped.map(({ category, payments: ps }) => (
            <section key={category?.id ?? 'sin'} className="space-y-3">
              <h2 className="text-xl font-semibold flex items-center gap-2">
                {category ? (
                  <>
                    {category.icon && <span className="text-2xl">{category.icon}</span>}
                    {category.name}
                  </>
                ) : (
                  'Sin categoría'
                )}
                <span className="ml-auto text-sm font-normal text-slate-500">
                  {ps.length} {ps.length === 1 ? 'pago' : 'pagos'}
                </span>
              </h2>
              <div className="rounded-xl border bg-white dark:bg-slate-900 dark:border-slate-800 overflow-hidden">
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
            </section>
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

      {/* Botón flotante a Números de cuentas */}
      <Link
        href="/cuentas"
        className="fixed bottom-6 right-6 z-30 inline-flex items-center gap-2 rounded-full bg-blue-600 hover:bg-blue-700 text-white font-medium text-sm px-5 py-3 shadow-lg shadow-blue-600/30 transition-colors"
      >
        <Landmark className="h-5 w-5" />
        <span className="hidden sm:inline">Números de cuentas</span>
        <span className="sm:hidden">Cuentas</span>
      </Link>
    </div>
  );
}

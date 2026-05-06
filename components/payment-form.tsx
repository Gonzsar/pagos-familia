'use client';

import { useEffect, useState } from 'react';
import { Button } from '@/components/ui/button';
import { Input } from '@/components/ui/input';
import { Label } from '@/components/ui/label';
import { Switch } from '@/components/ui/switch';
import { Trash2, X } from 'lucide-react';
import type { Category, PaymentWithCategory, Currency } from '@/lib/types';

interface Props {
  open: boolean;
  onOpenChange: (open: boolean) => void;
  payment: PaymentWithCategory | null;
  categories: Category[];
  onSaved: (p: PaymentWithCategory) => void;
  onDeleted: (id: string) => void;
}

interface FormData {
  name: string;
  amount: string;
  currency: Currency;
  due_date: string;
  category_id: string;
  payment_method: string;
  is_recurring: boolean;
  recurrence_months: number;
  notify_enabled: boolean;
  notes: string;
}

const empty = (): FormData => ({
  name: '',
  amount: '',
  currency: 'USD',
  due_date: new Date().toISOString().slice(0, 10),
  category_id: '',
  payment_method: '',
  is_recurring: true,
  recurrence_months: 1,
  notify_enabled: true,
  notes: '',
});

function fromPayment(p: PaymentWithCategory): FormData {
  return {
    name: p.name,
    amount: String(p.amount),
    currency: p.currency,
    due_date: p.due_date,
    category_id: p.category_id ?? '',
    payment_method: p.payment_method ?? '',
    is_recurring: p.is_recurring,
    recurrence_months: p.recurrence_months,
    notify_enabled: p.notify_enabled,
    notes: p.notes ?? '',
  };
}

const selectClass =
  'flex h-9 w-full rounded-md border border-slate-300 dark:border-slate-700 bg-white dark:bg-slate-900 px-3 py-1 text-sm transition-colors focus:outline-none focus:ring-2 focus:ring-blue-500';

export function PaymentForm({ open, onOpenChange, payment, categories, onSaved, onDeleted }: Props) {
  const [form, setForm] = useState<FormData>(empty());
  const [saving, setSaving] = useState(false);
  const [error, setError] = useState<string | null>(null);
  const [confirmDelete, setConfirmDelete] = useState(false);

  useEffect(() => {
    setForm(payment ? fromPayment(payment) : empty());
    setError(null);
    setConfirmDelete(false);
  }, [payment, open]);

  useEffect(() => {
    if (!open) return;
    function onKey(e: KeyboardEvent) {
      if (e.key === 'Escape') onOpenChange(false);
    }
    document.addEventListener('keydown', onKey);
    return () => document.removeEventListener('keydown', onKey);
  }, [open, onOpenChange]);

  async function save() {
    setSaving(true);
    setError(null);
    const payload = {
      name: form.name.trim(),
      amount: parseFloat(form.amount),
      currency: form.currency,
      due_date: form.due_date,
      category_id: form.category_id || null,
      payment_method: form.payment_method.trim() || null,
      is_recurring: form.is_recurring,
      recurrence_months: form.recurrence_months,
      notify_enabled: form.notify_enabled,
      notes: form.notes.trim() || null,
    };

    const url = payment ? `/api/payments/${payment.id}` : '/api/payments';
    const method = payment ? 'PATCH' : 'POST';
    const res = await fetch(url, {
      method,
      headers: { 'Content-Type': 'application/json' },
      body: JSON.stringify(payload),
    });

    if (!res.ok) {
      const data = await res.json().catch(() => ({}));
      setError(data.error || 'Error al guardar');
      setSaving(false);
      return;
    }

    const saved = await res.json();
    onSaved(saved);
    onOpenChange(false);
    setSaving(false);
  }

  async function actuallyDelete() {
    if (!payment) return;
    setSaving(true);
    setError(null);
    const res = await fetch(`/api/payments/${payment.id}`, { method: 'DELETE' });
    if (res.ok) {
      onDeleted(payment.id);
      setConfirmDelete(false);
      onOpenChange(false);
    } else {
      setError('Error al borrar');
    }
    setSaving(false);
  }

  if (!open) return null;

  const recurrenceValue = !form.is_recurring ? 'unico' : `m${form.recurrence_months}`;

  return (
    <>
      <div
        className="fixed inset-0 z-40 bg-black/50 backdrop-blur-sm animate-backdrop-in"
        aria-hidden="true"
      />
      <div
        className="fixed right-0 top-0 z-50 h-full w-full sm:max-w-md bg-white dark:bg-slate-900 shadow-2xl overflow-y-auto border-l dark:border-slate-800 animate-panel-in"
        role="dialog"
        aria-modal="true"
      >
        <div className="flex items-center justify-between p-4 border-b dark:border-slate-800 sticky top-0 bg-white dark:bg-slate-900 z-10">
          <h2 className="text-lg font-semibold">{payment ? 'Editar pago' : 'Agregar pago'}</h2>
          <button
            type="button"
            onClick={() => onOpenChange(false)}
            className="rounded-md p-1.5 hover:bg-slate-100 dark:hover:bg-slate-800 transition-colors"
            aria-label="Cerrar"
          >
            <X className="h-5 w-5" />
          </button>
        </div>

        <div className="p-4 space-y-4">
          <div className="space-y-2">
            <Label htmlFor="name">Nombre</Label>
            <Input id="name" value={form.name} onChange={e => setForm({ ...form, name: e.target.value })} />
          </div>

          <div className="grid grid-cols-2 gap-3">
            <div className="space-y-2">
              <Label htmlFor="amount">Monto</Label>
              <Input id="amount" type="number" step="0.01" value={form.amount} onChange={e => setForm({ ...form, amount: e.target.value })} />
            </div>
            <div className="space-y-2">
              <Label htmlFor="currency">Moneda</Label>
              <select
                id="currency"
                value={form.currency}
                onChange={e => setForm({ ...form, currency: e.target.value as Currency })}
                className={selectClass}
              >
                <option value="USD">USD</option>
                <option value="UYU">UYU</option>
              </select>
            </div>
          </div>

          <div className="space-y-2">
            <Label htmlFor="due_date">Vencimiento</Label>
            <Input id="due_date" type="date" value={form.due_date} onChange={e => setForm({ ...form, due_date: e.target.value })} />
          </div>

          <div className="space-y-2">
            <Label htmlFor="category">Categoría</Label>
            <select
              id="category"
              value={form.category_id}
              onChange={e => setForm({ ...form, category_id: e.target.value })}
              className={selectClass}
            >
              <option value="">Sin categoría</option>
              {categories.map(c => (
                <option key={c.id} value={c.id}>{c.icon ? `${c.icon} ` : ''}{c.name}</option>
              ))}
            </select>
          </div>

          <div className="space-y-2">
            <Label htmlFor="method">Método de pago</Label>
            <Input id="method" placeholder="ej: PREX GON" value={form.payment_method} onChange={e => setForm({ ...form, payment_method: e.target.value })} />
          </div>

          <div className="space-y-2">
            <Label htmlFor="recurrence">Recurrencia</Label>
            <select
              id="recurrence"
              value={recurrenceValue}
              onChange={e => {
                const v = e.target.value;
                if (v === 'unico') {
                  setForm({ ...form, is_recurring: false, recurrence_months: 1 });
                } else {
                  setForm({ ...form, is_recurring: true, recurrence_months: parseInt(v.slice(1), 10) });
                }
              }}
              className={selectClass}
            >
              <option value="unico">Pago único</option>
              <option value="m1">Cada mes</option>
              <option value="m3">Cada 3 meses</option>
              <option value="m6">Cada 6 meses</option>
              <option value="m12">Cada año</option>
            </select>
          </div>

          <div className="flex items-center justify-between rounded-lg border p-3">
            <div>
              <Label htmlFor="notify" className="font-medium">Recibir avisos</Label>
              <p className="text-xs text-slate-500">7, 3 y 1 días antes</p>
            </div>
            <Switch id="notify" checked={form.notify_enabled} onCheckedChange={(v) => setForm({ ...form, notify_enabled: v })} />
          </div>

          <div className="space-y-2">
            <Label htmlFor="notes">Notas (opcional)</Label>
            <Input id="notes" value={form.notes} onChange={e => setForm({ ...form, notes: e.target.value })} />
          </div>

          {error && <p className="text-sm text-red-600">{error}</p>}
        </div>

        <div className="px-4 pb-6 flex flex-col gap-3">
          <Button onClick={save} disabled={saving} className="w-full" size="lg">
            {saving ? 'Guardando...' : 'Guardar'}
          </Button>
          {payment && (
            <Button
              type="button"
              variant="outline"
              onClick={() => setConfirmDelete(true)}
              disabled={saving}
              className="w-full text-red-600 hover:text-red-700 hover:bg-red-50 dark:hover:bg-red-950/30 border-red-200 dark:border-red-900/50"
            >
              <Trash2 className="h-4 w-4 mr-2" /> Borrar pago
            </Button>
          )}
        </div>

        {confirmDelete && (
          <div
            className="absolute inset-0 z-20 flex items-center justify-center bg-black/40 backdrop-blur-sm animate-backdrop-in p-4"
            onClick={() => setConfirmDelete(false)}
          >
            <div
              className="w-full max-w-sm rounded-xl bg-white dark:bg-slate-800 p-5 shadow-xl border dark:border-slate-700"
              onClick={e => e.stopPropagation()}
            >
              <h3 className="text-lg font-semibold mb-2">¿Borrar pago?</h3>
              <p className="text-sm text-slate-600 dark:text-slate-400 mb-4">
                Esta acción no se puede deshacer. Se eliminará &quot;<strong>{payment?.name}</strong>&quot; permanentemente.
              </p>
              <div className="flex gap-2">
                <Button
                  type="button"
                  variant="outline"
                  onClick={() => setConfirmDelete(false)}
                  disabled={saving}
                  className="flex-1 text-slate-900 dark:text-slate-100"
                >
                  Cancelar
                </Button>
                <Button
                  type="button"
                  onClick={actuallyDelete}
                  disabled={saving}
                  className="flex-1 bg-red-600 hover:bg-red-700 text-white"
                >
                  {saving ? 'Borrando...' : 'Sí, borrar'}
                </Button>
              </div>
            </div>
          </div>
        )}
      </div>
    </>
  );
}

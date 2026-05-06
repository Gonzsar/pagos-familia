'use client';

import { useEffect, useState } from 'react';
import { Sheet, SheetContent, SheetDescription, SheetFooter, SheetHeader, SheetTitle } from '@/components/ui/sheet';
import { Button } from '@/components/ui/button';
import { Input } from '@/components/ui/input';
import { Label } from '@/components/ui/label';
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from '@/components/ui/select';
import { Switch } from '@/components/ui/switch';
import { Trash2 } from 'lucide-react';
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
  recurrence_months: string;
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
  recurrence_months: '1',
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
    recurrence_months: String(p.recurrence_months),
    notify_enabled: p.notify_enabled,
    notes: p.notes ?? '',
  };
}

export function PaymentForm({ open, onOpenChange, payment, categories, onSaved, onDeleted }: Props) {
  const [form, setForm] = useState<FormData>(empty());
  const [saving, setSaving] = useState(false);
  const [error, setError] = useState<string | null>(null);

  useEffect(() => {
    setForm(payment ? fromPayment(payment) : empty());
    setError(null);
  }, [payment, open]);

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
      recurrence_months: parseInt(form.recurrence_months, 10),
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

  async function remove() {
    if (!payment) return;
    if (!confirm(`¿Borrar "${payment.name}"? Esta acción no se puede deshacer.`)) return;
    setSaving(true);
    const res = await fetch(`/api/payments/${payment.id}`, { method: 'DELETE' });
    if (res.ok) {
      onDeleted(payment.id);
      onOpenChange(false);
    } else {
      setError('Error al borrar');
    }
    setSaving(false);
  }

  return (
    <Sheet open={open} onOpenChange={onOpenChange}>
      <SheetContent className="overflow-y-auto sm:max-w-md">
        <SheetHeader>
          <SheetTitle>{payment ? 'Editar pago' : 'Agregar pago'}</SheetTitle>
          <SheetDescription>
            {payment ? 'Modificá los detalles del pago.' : 'Completá los datos del nuevo pago.'}
          </SheetDescription>
        </SheetHeader>

        <div className="space-y-4 py-4 px-4">
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
              <Select value={form.currency} onValueChange={(v) => setForm({ ...form, currency: v as Currency })}>
                <SelectTrigger id="currency"><SelectValue /></SelectTrigger>
                <SelectContent>
                  <SelectItem value="USD">USD</SelectItem>
                  <SelectItem value="UYU">UYU</SelectItem>
                </SelectContent>
              </Select>
            </div>
          </div>

          <div className="space-y-2">
            <Label htmlFor="due_date">Vencimiento</Label>
            <Input id="due_date" type="date" value={form.due_date} onChange={e => setForm({ ...form, due_date: e.target.value })} />
          </div>

          <div className="space-y-2">
            <Label htmlFor="category">Categoría</Label>
            <Select value={form.category_id || 'none'} onValueChange={(v) => setForm({ ...form, category_id: v === 'none' ? '' : (v as string) })}>
              <SelectTrigger id="category"><SelectValue placeholder="Sin categoría" /></SelectTrigger>
              <SelectContent>
                <SelectItem value="none">Sin categoría</SelectItem>
                {categories.map(c => (
                  <SelectItem key={c.id} value={c.id}>{c.icon} {c.name}</SelectItem>
                ))}
              </SelectContent>
            </Select>
          </div>

          <div className="space-y-2">
            <Label htmlFor="method">Método de pago</Label>
            <Input id="method" placeholder="ej: PREX GON" value={form.payment_method} onChange={e => setForm({ ...form, payment_method: e.target.value })} />
          </div>

          <div className="flex items-center justify-between rounded-lg border p-3">
            <div>
              <Label htmlFor="recurring" className="font-medium">Recurrente</Label>
              <p className="text-xs text-slate-500">Se renueva solo al marcar pagado</p>
            </div>
            <Switch id="recurring" checked={form.is_recurring} onCheckedChange={(v) => setForm({ ...form, is_recurring: v })} />
          </div>

          {form.is_recurring && (
            <div className="space-y-2">
              <Label htmlFor="recurrence">Cada cuántos meses</Label>
              <Input id="recurrence" type="number" min="1" value={form.recurrence_months} onChange={e => setForm({ ...form, recurrence_months: e.target.value })} />
            </div>
          )}

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

        <SheetFooter className="gap-2 sm:gap-2 sm:flex-col-reverse">
          <Button onClick={save} disabled={saving} className="w-full">
            {saving ? 'Guardando...' : 'Guardar'}
          </Button>
          {payment && (
            <Button variant="outline" onClick={remove} disabled={saving} className="w-full text-red-600 hover:text-red-700">
              <Trash2 className="h-4 w-4 mr-2" /> Borrar pago
            </Button>
          )}
        </SheetFooter>
      </SheetContent>
    </Sheet>
  );
}

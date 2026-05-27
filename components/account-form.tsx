'use client';

import { useEffect, useState } from 'react';
import { Trash2, X } from 'lucide-react';
import { Button } from '@/components/ui/button';
import { Input } from '@/components/ui/input';
import { Label } from '@/components/ui/label';
import type { Account, Bank } from '@/lib/accounts';

interface Props {
  open: boolean;
  onOpenChange: (open: boolean) => void;
  account: Account | null;
  onSaved: (a: Account) => void;
  onDeleted: (id: string) => void;
}

interface FormData {
  provider: string;
  account_name: string;
  bank: Bank;
  account_type: string;
  account_number: string;
}

const empty = (): FormData => ({
  provider: '',
  account_name: '',
  bank: 'BROU',
  account_type: '',
  account_number: '',
});

function fromAccount(a: Account): FormData {
  return {
    provider: a.provider,
    account_name: a.account_name,
    bank: a.bank,
    account_type: a.account_type ?? '',
    account_number: a.account_number,
  };
}

const selectClass =
  'flex h-9 w-full rounded-md border border-slate-300 dark:border-slate-700 bg-white dark:bg-slate-900 px-3 py-1 text-sm transition-colors focus:outline-none focus:ring-2 focus:ring-blue-500';

export function AccountForm({ open, onOpenChange, account, onSaved, onDeleted }: Props) {
  const [form, setForm] = useState<FormData>(empty());
  const [saving, setSaving] = useState(false);
  const [error, setError] = useState<string | null>(null);
  const [confirmDelete, setConfirmDelete] = useState(false);

  useEffect(() => {
    setForm(account ? fromAccount(account) : empty());
    setError(null);
    setConfirmDelete(false);
  }, [account, open]);

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
      provider: form.provider.trim(),
      account_name: form.account_name.trim(),
      bank: form.bank,
      account_type: form.account_type.trim() || null,
      account_number: form.account_number.trim(),
    };

    const url = account ? `/api/accounts/${account.id}` : '/api/accounts';
    const method = account ? 'PATCH' : 'POST';
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
    if (!account) return;
    setSaving(true);
    setError(null);
    const res = await fetch(`/api/accounts/${account.id}`, { method: 'DELETE' });
    if (res.ok) {
      onDeleted(account.id);
      setConfirmDelete(false);
      onOpenChange(false);
    } else {
      setError('Error al borrar');
    }
    setSaving(false);
  }

  if (!open) return null;

  return (
    <>
      <div
        className="fixed inset-0 z-40 bg-black/50 backdrop-blur-sm animate-backdrop-in"
        aria-hidden="true"
      />
      <div
        className="fixed right-0 top-0 z-50 h-full w-full sm:max-w-md bg-white dark:bg-slate-900 shadow-2xl overflow-y-auto border-l dark:border-slate-800 animate-panel-in flex flex-col"
        role="dialog"
        aria-modal="true"
      >
        <div className="flex items-center justify-between p-4 border-b dark:border-slate-800 sticky top-0 bg-white dark:bg-slate-900 z-10">
          <h2 className="text-lg font-semibold">{account ? 'Editar cuenta' : 'Agregar cuenta'}</h2>
          <button
            type="button"
            onClick={() => onOpenChange(false)}
            className="rounded-md p-1.5 hover:bg-slate-100 dark:hover:bg-slate-800 transition-colors"
            aria-label="Cerrar"
          >
            <X className="h-5 w-5" />
          </button>
        </div>

        <div className="flex-1 p-4 space-y-4">
          <div className="space-y-2">
            <Label htmlFor="provider">Proveedor</Label>
            <Input id="provider" value={form.provider} onChange={e => setForm({ ...form, provider: e.target.value })} placeholder="Ej: TRULYMAXX" />
          </div>

          <div className="space-y-2">
            <Label htmlFor="account_name">Nombre de cuenta</Label>
            <Input id="account_name" value={form.account_name} onChange={e => setForm({ ...form, account_name: e.target.value })} placeholder="Ej: TRULYMAX S.A" />
          </div>

          <div className="space-y-2">
            <Label htmlFor="bank">Banco</Label>
            <select
              id="bank"
              value={form.bank}
              onChange={e => setForm({ ...form, bank: e.target.value as Bank })}
              className={selectClass}
            >
              <option value="BROU">BROU</option>
              <option value="SCOTIA">SCOTIA</option>
              <option value="ITAU">ITAÚ</option>
            </select>
          </div>

          <div className="space-y-2">
            <Label htmlFor="account_type">Tipo de cuenta (opcional)</Label>
            <Input id="account_type" value={form.account_type} onChange={e => setForm({ ...form, account_type: e.target.value })} placeholder="Ej: Caja Ahorro Dólares" />
          </div>

          <div className="space-y-2">
            <Label htmlFor="account_number">Número de cuenta</Label>
            <Input id="account_number" value={form.account_number} onChange={e => setForm({ ...form, account_number: e.target.value })} placeholder="Ej: 001 547 032 000 01" />
          </div>

          {error && <p className="text-sm text-red-600">{error}</p>}
        </div>

        <div className="border-t dark:border-slate-800 p-4 pb-6 flex flex-col gap-3 bg-white dark:bg-slate-900">
          <Button onClick={save} disabled={saving} className="w-full" size="lg">
            {saving ? 'Guardando...' : 'Guardar'}
          </Button>
          {account && (
            <Button
              type="button"
              variant="outline"
              onClick={() => setConfirmDelete(true)}
              disabled={saving}
              className="w-full text-red-600 hover:text-red-700 hover:bg-red-50 dark:hover:bg-red-950/30 border-red-200 dark:border-red-900/50"
            >
              <Trash2 className="h-4 w-4 mr-2" /> Borrar cuenta
            </Button>
          )}
        </div>

        {confirmDelete && (
          <div
            className="absolute inset-0 z-20 flex items-center justify-center bg-black/40 backdrop-blur-sm animate-backdrop-in p-4"
            onClick={() => !saving && setConfirmDelete(false)}
          >
            <div
              className="w-full max-w-sm rounded-xl bg-white dark:bg-slate-800 p-5 shadow-xl border dark:border-slate-700"
              onClick={e => e.stopPropagation()}
            >
              <h3 className="text-lg font-semibold mb-2">¿Borrar cuenta?</h3>
              <p className="text-sm text-slate-600 dark:text-slate-400 mb-4">
                Esta acción no se puede deshacer. Se eliminará la cuenta de &quot;<strong>{account?.provider}</strong>&quot; permanentemente.
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

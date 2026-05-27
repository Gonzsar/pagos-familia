'use client';

import Link from 'next/link';
import { useEffect, useMemo, useState } from 'react';
import { ArrowLeft, Copy, Check, Landmark, Plus, Pencil } from 'lucide-react';
import { Input } from '@/components/ui/input';
import { Button } from '@/components/ui/button';
import { AccountForm } from '@/components/account-form';
import { toast } from 'sonner';
import { type Account, type Bank, BANK_ORDER, bankStyle } from '@/lib/accounts';

const cardClass =
  'rounded-xl border bg-white dark:bg-slate-900 dark:border-slate-800 p-4 transition-colors hover:border-slate-300 dark:hover:border-slate-700';

const BANK_HEADING: Record<Bank, string> = {
  BROU: 'BROU',
  SCOTIA: 'Scotiabank',
  ITAU: 'Itaú',
};

export default function CuentasPage() {
  const [accounts, setAccounts] = useState<Account[]>([]);
  const [loading, setLoading] = useState(true);
  const [filter, setFilter] = useState('');
  const [copiedId, setCopiedId] = useState<string | null>(null);
  const [editing, setEditing] = useState<Account | null>(null);
  const [formOpen, setFormOpen] = useState(false);

  useEffect(() => {
    fetch('/api/accounts').then(r => r.json()).then((d: Account[]) => {
      setAccounts(d);
      setLoading(false);
    });
  }, []);

  const filtered = useMemo(() => {
    const q = filter.trim().toLowerCase();
    if (!q) return accounts;
    return accounts.filter(a =>
      a.provider.toLowerCase().includes(q) ||
      a.account_name.toLowerCase().includes(q) ||
      a.bank.toLowerCase().includes(q) ||
      a.account_number.toLowerCase().includes(q),
    );
  }, [accounts, filter]);

  const grouped = useMemo(() => {
    const groups: Record<Bank, Account[]> = { BROU: [], SCOTIA: [], ITAU: [] };
    for (const a of filtered) groups[a.bank].push(a);
    return BANK_ORDER.map(b => ({ bank: b, items: groups[b] })).filter(g => g.items.length > 0);
  }, [filtered]);

  async function copy(a: Account) {
    const digits = a.account_number.replace(/\D/g, '');
    try {
      await navigator.clipboard.writeText(digits);
      setCopiedId(a.id);
      toast.success(`Número de ${a.provider} copiado`);
      setTimeout(() => setCopiedId(prev => (prev === a.id ? null : prev)), 2000);
    } catch {
      toast.error('No se pudo copiar al portapapeles');
    }
  }

  function openNew() {
    setEditing(null);
    setFormOpen(true);
  }

  function openEdit(a: Account) {
    setEditing(a);
    setFormOpen(true);
  }

  function onSaved(a: Account) {
    setAccounts(prev => {
      const exists = prev.some(x => x.id === a.id);
      if (exists) return prev.map(x => (x.id === a.id ? a : x));
      return [...prev, a];
    });
    toast.success(editing ? 'Cuenta actualizada' : 'Cuenta agregada');
  }

  function onDeleted(id: string) {
    setAccounts(prev => prev.filter(x => x.id !== id));
    toast.success('Cuenta eliminada');
  }

  return (
    <div className="space-y-6">
      <div className="flex items-center gap-3">
        <Link
          href="/"
          className="inline-flex items-center gap-1.5 rounded-lg border bg-white dark:bg-slate-900 dark:border-slate-800 px-3 py-2 text-sm font-medium hover:bg-slate-50 dark:hover:bg-slate-800/60 transition-colors"
        >
          <ArrowLeft className="h-4 w-4" /> Volver
        </Link>
      </div>

      <div>
        <h1 className="text-3xl font-bold flex items-center gap-2">
          <Landmark className="h-7 w-7 text-blue-600" />
          Números de cuentas
        </h1>
        <p className="mt-1 text-slate-600 dark:text-slate-400">
          Cuentas bancarias de los proveedores para transferencias.
        </p>
      </div>

      <div className="flex flex-col sm:flex-row items-stretch sm:items-center gap-3">
        <Input
          type="search"
          placeholder="Buscar por proveedor, banco o número..."
          value={filter}
          onChange={e => setFilter(e.target.value)}
          className="flex-1 max-w-md"
        />
        <Button onClick={openNew}>
          <Plus className="h-4 w-4 mr-1" /> Agregar cuenta
        </Button>
      </div>

      {loading ? (
        <p className="text-slate-500">Cargando...</p>
      ) : grouped.length === 0 ? (
        <div className="rounded-xl border border-dashed p-10 text-center text-slate-500">
          {filter ? 'No hay cuentas que coincidan con tu búsqueda.' : 'Todavía no agregaste cuentas.'}
        </div>
      ) : (
        <div className="space-y-8">
          {grouped.map(({ bank, items }) => {
            const bs = bankStyle(bank);
            return (
              <section key={bank} className="space-y-3">
                <h2 className="text-xl font-semibold flex items-center gap-2">
                  <span className={`text-xs font-semibold px-2 py-0.5 rounded-md ${bs.class}`}>
                    {bs.label}
                  </span>
                  <span>{BANK_HEADING[bank]}</span>
                  <span className="ml-auto text-sm font-normal text-slate-500">
                    {items.length} {items.length === 1 ? 'cuenta' : 'cuentas'}
                  </span>
                </h2>

                <div className="grid gap-3 sm:grid-cols-2">
                  {items.map(a => {
                    const isCopied = copiedId === a.id;
                    return (
                      <div key={a.id} className={`${cardClass} relative group`}>
                        <button
                          type="button"
                          onClick={() => openEdit(a)}
                          aria-label="Editar"
                          className="absolute top-2 right-2 inline-flex items-center justify-center h-7 w-7 rounded-md text-slate-400 hover:text-slate-700 dark:hover:text-slate-200 hover:bg-slate-100 dark:hover:bg-slate-800 opacity-60 hover:opacity-100 transition-opacity"
                        >
                          <Pencil className="h-3.5 w-3.5" />
                        </button>

                        <p className="text-xs text-slate-500 dark:text-slate-400 uppercase tracking-wide pr-8">
                          {a.account_name}
                        </p>
                        <h3 className="text-lg font-semibold mt-0.5 pr-8">{a.provider}</h3>

                        {a.account_type && (
                          <p className="mt-2 text-xs text-slate-600 dark:text-slate-400">
                            {a.account_type}
                          </p>
                        )}

                        <div className="mt-3 flex items-center gap-2">
                          <button
                            type="button"
                            onClick={() => copy(a)}
                            title="Click para copiar"
                            className="flex-1 px-3 py-2.5 rounded-md bg-slate-100 dark:bg-slate-800/80 border border-slate-200 dark:border-slate-700 hover:border-blue-500 dark:hover:border-blue-500 font-display font-semibold text-base sm:text-lg tabular-nums tracking-wide select-all break-all text-left transition-colors cursor-pointer"
                          >
                            {a.account_number}
                          </button>
                          <button
                            type="button"
                            onClick={() => copy(a)}
                            aria-label="Copiar número"
                            className={`inline-flex items-center justify-center h-10 w-10 rounded-md transition-colors shrink-0 ${
                              isCopied
                                ? 'bg-emerald-600 hover:bg-emerald-700 text-white'
                                : 'bg-blue-600 hover:bg-blue-700 text-white'
                            }`}
                          >
                            {isCopied ? <Check className="h-5 w-5" /> : <Copy className="h-5 w-5" />}
                          </button>
                        </div>
                      </div>
                    );
                  })}
                </div>
              </section>
            );
          })}
        </div>
      )}

      <p className="text-xs text-slate-500 dark:text-slate-400 pt-2">
        Al copiar, se copian solo los dígitos (sin espacios ni guiones) — listos para pegar en cualquier
        formulario bancario.
      </p>

      <AccountForm
        open={formOpen}
        onOpenChange={setFormOpen}
        account={editing}
        onSaved={onSaved}
        onDeleted={onDeleted}
      />
    </div>
  );
}

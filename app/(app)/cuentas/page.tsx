'use client';

import Link from 'next/link';
import { useState } from 'react';
import { ArrowLeft, Copy, Check, Landmark } from 'lucide-react';
import { Input } from '@/components/ui/input';
import { toast } from 'sonner';
import { ACCOUNTS, bankStyle, type AccountEntry } from '@/lib/accounts';

const cardClass =
  'rounded-xl border bg-white dark:bg-slate-900 dark:border-slate-800 p-4 transition-colors hover:border-slate-300 dark:hover:border-slate-700';

export default function CuentasPage() {
  const [filter, setFilter] = useState('');
  const [copiedId, setCopiedId] = useState<string | null>(null);

  const filtered = ACCOUNTS.filter(a => {
    const q = filter.trim().toLowerCase();
    if (!q) return true;
    return (
      a.provider.toLowerCase().includes(q) ||
      a.accountName.toLowerCase().includes(q) ||
      a.bank.toLowerCase().includes(q) ||
      a.accountNumber.toLowerCase().includes(q)
    );
  });

  async function copy(a: AccountEntry) {
    // Copia solo los dígitos (sin espacios ni guiones) para pegar sin problema
    // en formularios bancarios. Si querés el formateado, usá selección manual.
    const digits = a.accountNumber.replace(/\D/g, '');
    try {
      await navigator.clipboard.writeText(digits);
      setCopiedId(a.provider);
      toast.success(`Número de ${a.provider} copiado`);
      setTimeout(() => setCopiedId(prev => (prev === a.provider ? null : prev)), 2000);
    } catch {
      toast.error('No se pudo copiar al portapapeles');
    }
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

      <Input
        type="search"
        placeholder="Buscar por proveedor, banco o número..."
        value={filter}
        onChange={e => setFilter(e.target.value)}
        className="max-w-md"
      />

      {filtered.length === 0 ? (
        <div className="rounded-xl border border-dashed p-10 text-center text-slate-500">
          No hay cuentas que coincidan con tu búsqueda.
        </div>
      ) : (
        <div className="grid gap-3 sm:grid-cols-2">
          {filtered.map(a => {
            const bank = bankStyle(a.bank);
            const isCopied = copiedId === a.provider;
            return (
              <div key={a.provider} className={cardClass}>
                <p className="text-xs text-slate-500 dark:text-slate-400 uppercase tracking-wide">
                  {a.accountName}
                </p>
                <h2 className="text-lg font-semibold mt-0.5">{a.provider}</h2>

                <div className="mt-3 flex flex-wrap items-center gap-2">
                  <span className={`text-xs font-semibold px-2 py-0.5 rounded-md ${bank.class}`}>
                    {bank.label}
                  </span>
                  {a.accountType && (
                    <span className="text-xs text-slate-600 dark:text-slate-400">
                      {a.accountType}
                    </span>
                  )}
                </div>

                <div className="mt-3 flex items-center gap-2">
                  <span className="flex-1 px-3 py-2.5 rounded-md bg-slate-100 dark:bg-slate-800/80 border border-slate-200 dark:border-slate-700 font-display font-semibold text-base sm:text-lg tabular-nums tracking-wide select-all break-all">
                    {a.accountNumber}
                  </span>
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
      )}

      <p className="text-xs text-slate-500 dark:text-slate-400 pt-2">
        Al copiar, se copian solo los dígitos (sin espacios ni guiones) — listos para pegar en cualquier
        formulario bancario.
      </p>
    </div>
  );
}

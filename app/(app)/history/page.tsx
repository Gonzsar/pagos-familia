'use client';

import { useEffect, useMemo, useState } from 'react';
import { Input } from '@/components/ui/input';
import { Label } from '@/components/ui/label';
import { formatAmount } from '@/lib/currency';
import { History as HistoryIcon } from 'lucide-react';

interface HistoryEntry {
  id: string;
  payment_id: string;
  paid_at: string;
  paid_amount: number;
  paid_currency: 'USD' | 'UYU';
  due_date_at_payment: string;
  payment: {
    name: string;
    category: { name: string; icon: string | null } | null;
  } | null;
}

export default function HistoryPage() {
  const [entries, setEntries] = useState<HistoryEntry[]>([]);
  const [loading, setLoading] = useState(true);
  const [from, setFrom] = useState('');
  const [to, setTo] = useState('');

  useEffect(() => {
    setLoading(true);
    const params = new URLSearchParams();
    if (from) params.set('from', from);
    if (to) params.set('to', to);
    fetch(`/api/history?${params.toString()}`).then(r => r.json()).then(d => {
      setEntries(d);
      setLoading(false);
    });
  }, [from, to]);

  const totals = useMemo(() => {
    let usd = 0, uyu = 0;
    for (const e of entries) {
      if (e.paid_currency === 'USD') usd += e.paid_amount;
      else uyu += e.paid_amount;
    }
    return { usd, uyu };
  }, [entries]);

  return (
    <div className="space-y-6">
      <div>
        <h1 className="text-3xl font-bold flex items-center gap-2">
          <HistoryIcon className="h-7 w-7 text-blue-600" />
          Historial de pagos
        </h1>
        <p className="mt-1 text-slate-600 dark:text-slate-400">
          Todos los pagos que marcaste como pagados.
        </p>
      </div>

      <div className="rounded-xl border bg-white dark:bg-slate-900 dark:border-slate-800 grid grid-cols-1 sm:grid-cols-3 gap-4 p-4">
        <div className="space-y-2">
          <Label htmlFor="from">Desde</Label>
          <Input id="from" type="date" value={from} onChange={e => setFrom(e.target.value)} />
        </div>
        <div className="space-y-2">
          <Label htmlFor="to">Hasta</Label>
          <Input id="to" type="date" value={to} onChange={e => setTo(e.target.value)} />
        </div>
        <div className="space-y-2">
          <Label>Total pagado</Label>
          <div className="font-display text-sm tabular-nums space-y-1 pt-1">
            <div>USD: <strong>${totals.usd.toFixed(2)}</strong></div>
            <div>UYU: <strong>${totals.uyu.toFixed(2)}</strong></div>
          </div>
        </div>
      </div>

      {loading ? (
        <p className="text-slate-500">Cargando...</p>
      ) : entries.length === 0 ? (
        <div className="rounded-xl border border-dashed p-10 text-center text-slate-500">
          No hay pagos en este rango. Cuando marques pagos como pagados, van a aparecer acá.
        </div>
      ) : (
        <div className="rounded-xl border bg-white dark:bg-slate-900 dark:border-slate-800 overflow-hidden">
          {entries.map(e => (
            <div key={e.id} className="flex items-center gap-3 border-b border-slate-100 dark:border-slate-800 px-4 py-3 last:border-b-0 hover:bg-slate-50 dark:hover:bg-slate-800/40 transition-colors">
              <div className="flex-1 min-w-0">
                <p className="font-medium truncate">{e.payment?.name ?? '(pago borrado)'}</p>
                <p className="text-xs text-slate-500 dark:text-slate-400 truncate">
                  {e.payment?.category ? `${e.payment.category.icon ?? ''} ${e.payment.category.name}` : 'Sin categoría'}
                  {' • pagado '}
                  {new Date(e.paid_at).toLocaleString('es-UY', { dateStyle: 'short', timeStyle: 'short' })}
                </p>
              </div>
              <div className="font-display text-sm font-semibold tabular-nums whitespace-nowrap">
                {formatAmount(e.paid_amount, e.paid_currency)}
              </div>
            </div>
          ))}
        </div>
      )}
    </div>
  );
}

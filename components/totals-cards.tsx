'use client';

import { Card, CardContent } from '@/components/ui/card';
import { Wallet, DollarSign, Coins } from 'lucide-react';
import type { Totals } from '@/lib/currency';

interface Props {
  totals: Totals;
  uyuPerUsd: number | null;
}

function formatUsdNumber(n: number) {
  return n.toLocaleString('es-UY', { minimumFractionDigits: 2, maximumFractionDigits: 2 });
}

function formatUyuNumber(n: number) {
  return n.toLocaleString('es-UY', {
    minimumFractionDigits: Number.isInteger(n) ? 0 : 2,
    maximumFractionDigits: 2,
  });
}

export function TotalsCards({ totals, uyuPerUsd }: Props) {
  return (
    <div className="grid gap-4 sm:grid-cols-3">
      <Card>
        <CardContent className="p-5">
          <div className="flex items-center justify-between">
            <p className="text-sm font-medium text-slate-600 dark:text-slate-400">Total USD</p>
            <DollarSign className="h-5 w-5 text-blue-600" />
          </div>
          <p className="mt-2 font-display text-3xl font-semibold tabular-nums">
            ${formatUsdNumber(totals.usd)}
          </p>
        </CardContent>
      </Card>

      <Card>
        <CardContent className="p-5">
          <div className="flex items-center justify-between">
            <p className="text-sm font-medium text-slate-600 dark:text-slate-400">Total UYU</p>
            <Coins className="h-5 w-5 text-emerald-600" />
          </div>
          <p className="mt-2 font-display text-3xl font-semibold tabular-nums">
            ${formatUyuNumber(totals.uyu)}
          </p>
        </CardContent>
      </Card>

      <Card>
        <CardContent className="p-5">
          <div className="flex items-center justify-between">
            <p className="text-sm font-medium text-slate-600 dark:text-slate-400">Total combinado</p>
            <Wallet className="h-5 w-5 text-violet-600" />
          </div>
          {totals.combinedUsd !== null ? (
            <>
              <p className="mt-2 font-display text-3xl font-semibold tabular-nums">
                ~${formatUsdNumber(totals.combinedUsd)}
              </p>
              {uyuPerUsd && (
                <p className="mt-1 text-xs text-slate-500 dark:text-slate-500">
                  1 USD = ${uyuPerUsd.toFixed(2)} UYU
                </p>
              )}
            </>
          ) : (
            <p className="mt-2 text-sm text-slate-500">Cotización no disponible</p>
          )}
        </CardContent>
      </Card>
    </div>
  );
}

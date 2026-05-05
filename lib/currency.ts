import type { Payment } from '@/lib/types';

export interface Totals {
  usd: number;
  uyu: number;
  combinedUsd: number | null;
}

export function combineTotals(payments: Payment[], uyuPerUsd: number | null): Totals {
  const pending = payments.filter(p => p.status === 'pendiente');

  const usd = round2(pending.filter(p => p.currency === 'USD').reduce((s, p) => s + p.amount, 0));
  const uyu = round2(pending.filter(p => p.currency === 'UYU').reduce((s, p) => s + p.amount, 0));

  let combinedUsd: number | null;
  if (uyuPerUsd === null) {
    combinedUsd = null;
  } else if (uyuPerUsd === 0) {
    combinedUsd = null;
  } else {
    combinedUsd = round2(usd + uyu / uyuPerUsd);
  }

  return { usd, uyu, combinedUsd };
}

function round2(n: number): number {
  return Math.round(n * 100) / 100;
}

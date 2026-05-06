import { describe, it, expect } from 'vitest';
import { combineTotals, type Totals } from '@/lib/currency';
import type { Payment } from '@/lib/types';

const p = (
  currency: 'USD' | 'UYU',
  amount: number,
  status: 'pendiente' | 'pagado' = 'pendiente',
  countInTotals: boolean = true,
): Payment => ({
  id: Math.random().toString(),
  name: 'x',
  amount,
  currency,
  due_date: '2026-05-05',
  category_id: null,
  payment_method: null,
  is_recurring: true,
  recurrence_months: 1,
  status,
  notify_enabled: true,
  count_in_totals: countInTotals,
  notes: null,
  created_by: null,
  created_at: '',
  updated_at: '',
});

describe('combineTotals', () => {
  it('suma USD y UYU separadas', () => {
    const result = combineTotals([p('USD', 10), p('USD', 20), p('UYU', 200)], 40);
    expect(result.usd).toBe(30);
    expect(result.uyu).toBe(200);
  });

  it('combina en USD usando la cotización', () => {
    const result = combineTotals([p('USD', 10), p('UYU', 200)], 40);
    // 10 USD + (200 / 40) USD = 15 USD
    expect(result.combinedUsd).toBe(15);
  });

  it('ignora pagos pagados', () => {
    const result = combineTotals([p('USD', 10), p('USD', 20, 'pagado')], 40);
    expect(result.usd).toBe(10);
  });

  it('ignora pagos con count_in_totals=false', () => {
    const result = combineTotals([p('USD', 10), p('USD', 50, 'pendiente', false)], 40);
    expect(result.usd).toBe(10);
  });

  it('combinedUsd es null si no hay cotización', () => {
    const result = combineTotals([p('USD', 10), p('UYU', 200)], null);
    expect(result.combinedUsd).toBeNull();
  });

  it('lista vacía devuelve ceros', () => {
    const result = combineTotals([], 40);
    expect(result).toEqual({ usd: 0, uyu: 0, combinedUsd: 0 });
  });
});

import { formatAmount } from '@/lib/currency';

describe('formatAmount', () => {
  it('formato USD con 2 decimales', () => {
    expect(formatAmount(20, 'USD')).toBe('$20,00 USD');
    expect(formatAmount(6.5, 'USD')).toBe('$6,50 USD');
  });

  it('formato UYU sin decimales si es entero', () => {
    expect(formatAmount(200, 'UYU')).toBe('$200 UYU');
    expect(formatAmount(12.99, 'UYU')).toBe('$12,99 UYU');
  });
});

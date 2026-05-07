import { describe, it, expect } from 'vitest';
import { daysRemaining } from '@/lib/payments';

describe('daysRemaining', () => {
  it('devuelve 0 si la fecha es hoy', () => {
    expect(daysRemaining('2026-05-05', '2026-05-05')).toBe(0);
  });

  it('devuelve negativo si la fecha pasó', () => {
    expect(daysRemaining('2026-05-01', '2026-05-05')).toBe(-4);
  });

  it('devuelve positivo si la fecha es futura', () => {
    expect(daysRemaining('2026-05-12', '2026-05-05')).toBe(7);
  });

  it('cruza meses correctamente', () => {
    expect(daysRemaining('2026-06-04', '2026-05-05')).toBe(30);
  });
});

import { computeDisplayStatus } from '@/lib/payments';
import type { Payment } from '@/lib/types';

const base: Payment = {
  id: 'x', name: 'Test', amount: 10, currency: 'USD',
  due_date: '2026-05-05', category_id: null, payment_method: null,
  is_recurring: true, recurrence_months: 1,
  status: 'pendiente', notify_enabled: true, count_in_totals: true, notes: null,
  created_by: null, created_at: '', updated_at: '',
};

describe('computeDisplayStatus', () => {
  it('"pagado" si status=pagado, sin importar fecha', () => {
    expect(computeDisplayStatus({ ...base, status: 'pagado', due_date: '2026-04-01' }, '2026-05-05')).toBe('pagado');
  });

  it('"vencido" si pendiente y due_date < hoy', () => {
    expect(computeDisplayStatus({ ...base, due_date: '2026-05-04' }, '2026-05-05')).toBe('vencido');
  });

  it('"vence_hoy" si due_date == hoy', () => {
    expect(computeDisplayStatus({ ...base, due_date: '2026-05-05' }, '2026-05-05')).toBe('vence_hoy');
  });

  it('"urgente" si faltan 1-3 días', () => {
    expect(computeDisplayStatus({ ...base, due_date: '2026-05-08' }, '2026-05-05')).toBe('urgente');
    expect(computeDisplayStatus({ ...base, due_date: '2026-05-06' }, '2026-05-05')).toBe('urgente');
  });

  it('"proximo" si faltan 4-7 días', () => {
    expect(computeDisplayStatus({ ...base, due_date: '2026-05-12' }, '2026-05-05')).toBe('proximo');
    expect(computeDisplayStatus({ ...base, due_date: '2026-05-09' }, '2026-05-05')).toBe('proximo');
  });

  it('"futuro" si faltan más de 7 días', () => {
    expect(computeDisplayStatus({ ...base, due_date: '2026-05-13' }, '2026-05-05')).toBe('futuro');
    expect(computeDisplayStatus({ ...base, due_date: '2026-06-04' }, '2026-05-05')).toBe('futuro');
  });
});

import { nextDueDate } from '@/lib/payments';

describe('nextDueDate', () => {
  it('avanza 1 mes para mensual', () => {
    expect(nextDueDate('2026-05-05', 1)).toBe('2026-06-05');
  });

  it('avanza 12 meses para anual', () => {
    expect(nextDueDate('2026-05-05', 12)).toBe('2027-05-05');
  });

  it('maneja fin de mes (30 enero → 28/29 febrero)', () => {
    expect(nextDueDate('2026-01-30', 1)).toBe('2026-02-28');
    expect(nextDueDate('2024-01-30', 1)).toBe('2024-02-29');
  });

  it('maneja 31 → mes con 30 días', () => {
    expect(nextDueDate('2026-03-31', 1)).toBe('2026-04-30');
  });
});

import { effectiveDueDate } from '@/lib/payments';

describe('effectiveDueDate', () => {
  it('devuelve la fecha tal cual si no es recurrente', () => {
    const p = { ...base, is_recurring: false, due_date: '2026-05-01' };
    expect(effectiveDueDate(p, '2026-05-07')).toBe('2026-05-01');
  });

  it('devuelve la fecha tal cual si es recurrente y todavía no vence', () => {
    const p = { ...base, is_recurring: true, recurrence_months: 1, due_date: '2026-05-15' };
    expect(effectiveDueDate(p, '2026-05-07')).toBe('2026-05-15');
  });

  it('devuelve la fecha tal cual si recurrente y vence hoy', () => {
    const p = { ...base, is_recurring: true, recurrence_months: 1, due_date: '2026-05-07' };
    expect(effectiveDueDate(p, '2026-05-07')).toBe('2026-05-07');
  });

  it('avanza al próximo ciclo si recurrente y ya venció', () => {
    const p = { ...base, is_recurring: true, recurrence_months: 1, due_date: '2026-05-06' };
    expect(effectiveDueDate(p, '2026-05-07')).toBe('2026-06-06');
  });

  it('avanza varios ciclos si está muy atrasada', () => {
    const p = { ...base, is_recurring: true, recurrence_months: 1, due_date: '2026-01-15' };
    expect(effectiveDueDate(p, '2026-05-07')).toBe('2026-05-15');
  });

  it('respeta la cadencia anual', () => {
    const p = { ...base, is_recurring: true, recurrence_months: 12, due_date: '2025-12-01' };
    expect(effectiveDueDate(p, '2026-05-07')).toBe('2026-12-01');
  });
});

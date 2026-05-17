import { describe, it, expect } from 'vitest';
import { shouldNotify, NOTIFICATION_WINDOWS } from '@/lib/notifications';
import type { Payment } from '@/lib/types';

const base: Payment = {
  id: 'x', name: 'Test', amount: 10, currency: 'USD',
  due_date: '2026-05-13', category_id: null, payment_method: null,
  is_recurring: true, recurrence_months: 1,
  status: 'pendiente', notify_enabled: true, count_in_totals: true, paid_for_cycle: null,
  notes: null, created_by: null, created_at: '', updated_at: '',
};

describe('NOTIFICATION_WINDOWS', () => {
  it('exporta las ventanas 7, 3, 1, 0', () => {
    expect(NOTIFICATION_WINDOWS).toEqual([7, 3, 1, 0]);
  });
});

describe('shouldNotify', () => {
  it('true si está en una ventana y notify_enabled=true', () => {
    expect(shouldNotify({ ...base, due_date: '2026-05-13' }, '2026-05-06')).toBe(true);  // 7 días
    expect(shouldNotify({ ...base, due_date: '2026-05-09' }, '2026-05-06')).toBe(true);  // 3 días
    expect(shouldNotify({ ...base, due_date: '2026-05-07' }, '2026-05-06')).toBe(true);  // 1 día
    expect(shouldNotify({ ...base, due_date: '2026-05-06' }, '2026-05-06')).toBe(true);  // 0 días
  });

  it('false si está fuera de las ventanas', () => {
    expect(shouldNotify({ ...base, due_date: '2026-05-12' }, '2026-05-06')).toBe(false); // 6 días
    expect(shouldNotify({ ...base, due_date: '2026-05-08' }, '2026-05-06')).toBe(false); // 2 días
    expect(shouldNotify({ ...base, due_date: '2026-05-14' }, '2026-05-06')).toBe(false); // 8 días
  });

  it('false si ya venció (negativo)', () => {
    expect(shouldNotify({ ...base, due_date: '2026-05-05' }, '2026-05-06')).toBe(false);
  });

  it('false si notify_enabled=false', () => {
    expect(shouldNotify({ ...base, due_date: '2026-05-13', notify_enabled: false }, '2026-05-06')).toBe(false);
  });

  it('false si status=pagado', () => {
    expect(shouldNotify({ ...base, due_date: '2026-05-13', status: 'pagado' }, '2026-05-06')).toBe(false);
  });
});

describe('shouldNotify — devuelve la ventana exacta cuando opts.returnWindow=true', () => {
  it('matchedWindow es 7/3/1/0 según corresponde', () => {
    expect(shouldNotify({ ...base, due_date: '2026-05-13' }, '2026-05-06', { returnWindow: true })).toBe(7);
    expect(shouldNotify({ ...base, due_date: '2026-05-09' }, '2026-05-06', { returnWindow: true })).toBe(3);
    expect(shouldNotify({ ...base, due_date: '2026-05-07' }, '2026-05-06', { returnWindow: true })).toBe(1);
    expect(shouldNotify({ ...base, due_date: '2026-05-06' }, '2026-05-06', { returnWindow: true })).toBe(0);
  });

  it('matchedWindow es null si no matchea', () => {
    expect(shouldNotify({ ...base, due_date: '2026-05-12' }, '2026-05-06', { returnWindow: true })).toBeNull();
  });

  it('matchedWindow es null si notify_enabled=false', () => {
    expect(shouldNotify({ ...base, due_date: '2026-05-13', notify_enabled: false }, '2026-05-06', { returnWindow: true })).toBeNull();
  });
});

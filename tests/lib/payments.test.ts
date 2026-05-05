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

import { describe, it, expect } from 'vitest';
import {
  nextBirthday,
  daysUntilBirthday,
  ageTurning,
  formatDayMonth,
  sortByUpcoming,
  type Reminder,
} from '@/lib/reminders';

describe('nextBirthday', () => {
  it('devuelve el cumpleaños de este año si todavía no pasó', () => {
    expect(nextBirthday(7, 6, '2026-06-01')).toBe('2026-06-07');
  });

  it('devuelve hoy si el cumpleaños es hoy', () => {
    expect(nextBirthday(7, 6, '2026-06-07')).toBe('2026-06-07');
  });

  it('salta al año siguiente si el cumpleaños ya pasó', () => {
    expect(nextBirthday(7, 6, '2026-06-08')).toBe('2027-06-07');
  });

  it('29/02 en año no bisiesto rueda al 01/03', () => {
    expect(nextBirthday(29, 2, '2027-01-01')).toBe('2027-03-01');
  });
});

describe('daysUntilBirthday', () => {
  it('0 si es hoy', () => {
    expect(daysUntilBirthday(7, 6, '2026-06-07')).toBe(0);
  });

  it('cuenta días dentro del mismo año', () => {
    expect(daysUntilBirthday(7, 6, '2026-06-01')).toBe(6);
  });

  it('cuenta hacia el año siguiente cuando ya pasó', () => {
    expect(daysUntilBirthday(1, 1, '2026-12-31')).toBe(1);
  });
});

describe('ageTurning', () => {
  it('null si no hay año de nacimiento', () => {
    expect(ageTurning(null, 7, 6, '2026-06-01')).toBeNull();
  });

  it('edad que cumple este año si no pasó', () => {
    expect(ageTurning(2000, 7, 6, '2026-06-01')).toBe(26);
  });

  it('edad del año siguiente si ya pasó', () => {
    expect(ageTurning(2000, 7, 6, '2026-06-08')).toBe(27);
  });
});

describe('formatDayMonth', () => {
  it('formatea día y mes en español', () => {
    expect(formatDayMonth(7, 6)).toBe('7 de junio');
    expect(formatDayMonth(26, 6)).toBe('26 de junio');
  });
});

describe('sortByUpcoming', () => {
  const mk = (id: string, day: number, month: number): Reminder => ({
    id, name: id, day, month, birth_year: null, notes: null,
    created_at: '', updated_at: '',
  });

  it('ordena del cumpleaños más cercano al más lejano', () => {
    const list = [mk('lejos', 26, 6), mk('cerca', 7, 6)];
    const sorted = sortByUpcoming(list, '2026-06-01');
    expect(sorted.map(r => r.id)).toEqual(['cerca', 'lejos']);
  });
});

/**
 * Tipos y helpers para recordatorios (cumpleaños).
 * Los datos viven en la tabla `reminders` de Supabase; CRUD vía /api/reminders.
 *
 * Un cumpleaños se repite todos los años: guardamos día y mes (y opcionalmente
 * el año de nacimiento para mostrar la edad). El conteo siempre apunta al
 * próximo cumpleaños — nunca "vence".
 */
import { differenceInCalendarDays, parseISO } from 'date-fns';

export interface Reminder {
  id: string;
  name: string;
  day: number; // 1-31
  month: number; // 1-12
  birth_year: number | null;
  notes: string | null;
  created_at: string;
  updated_at: string;
}

export const MESES = [
  'enero', 'febrero', 'marzo', 'abril', 'mayo', 'junio',
  'julio', 'agosto', 'septiembre', 'octubre', 'noviembre', 'diciembre',
];

/**
 * Fecha (yyyy-MM-dd) del próximo cumpleaños, en o después de `today`.
 * Usa UTC para evitar corrimientos de zona horaria. El 29/02 en años no
 * bisiestos rueda naturalmente al 01/03.
 */
export function nextBirthday(day: number, month: number, today: string): string {
  const [ty, tm, td] = today.split('-').map(Number);
  const todayMs = Date.UTC(ty, tm - 1, td);
  let candidate = new Date(Date.UTC(ty, month - 1, day));
  if (candidate.getTime() < todayMs) {
    candidate = new Date(Date.UTC(ty + 1, month - 1, day));
  }
  return candidate.toISOString().slice(0, 10);
}

/** Días hasta el próximo cumpleaños (0 = es hoy). */
export function daysUntilBirthday(day: number, month: number, today: string): number {
  const next = nextBirthday(day, month, today);
  return differenceInCalendarDays(parseISO(next), parseISO(today));
}

/** Edad que cumple en el próximo cumpleaños (null si no hay año de nacimiento). */
export function ageTurning(
  birthYear: number | null,
  day: number,
  month: number,
  today: string,
): number | null {
  if (!birthYear) return null;
  const next = nextBirthday(day, month, today);
  const nextYear = Number(next.slice(0, 4));
  return nextYear - birthYear;
}

/** "7 de junio" */
export function formatDayMonth(day: number, month: number): string {
  return `${day} de ${MESES[month - 1] ?? '?'}`;
}

/** Ordena por proximidad: el cumpleaños más cercano primero. */
export function sortByUpcoming(reminders: Reminder[], today: string): Reminder[] {
  return [...reminders].sort(
    (a, b) =>
      daysUntilBirthday(a.day, a.month, today) - daysUntilBirthday(b.day, b.month, today),
  );
}

import { addMonths, differenceInCalendarDays, format, parseISO } from 'date-fns';
import type { Payment, DisplayStatus } from '@/lib/types';

export function daysRemaining(dueDate: string, today: string): number {
  return differenceInCalendarDays(parseISO(dueDate), parseISO(today));
}

export function computeDisplayStatus(payment: Payment, today: string): DisplayStatus {
  if (payment.status === 'pagado') return 'pagado';
  const days = daysRemaining(payment.due_date, today);
  if (days < 0) return 'vencido';
  if (days === 0) return 'vence_hoy';
  if (days <= 3) return 'urgente';
  if (days <= 7) return 'proximo';
  return 'futuro';
}

export function nextDueDate(currentDueDate: string, recurrenceMonths: number): string {
  const next = addMonths(parseISO(currentDueDate), recurrenceMonths);
  return format(next, 'yyyy-MM-dd');
}

/**
 * Para pagos recurrentes (que se cobran automáticamente en la realidad), si la
 * due_date guardada en la DB ya pasó, avanzamos al próximo ciclo para mostrar.
 * Para pagos únicos devolvemos la due_date tal cual (puede mostrar "vencido").
 */
export function effectiveDueDate(payment: Payment, today: string): string {
  if (!payment.is_recurring) return payment.due_date;
  let date = payment.due_date;
  // Loop por las dudas: si está muy atrasada, avanza varios ciclos.
  while (daysRemaining(date, today) < 0) {
    date = nextDueDate(date, payment.recurrence_months);
  }
  return date;
}

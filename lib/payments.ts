import { differenceInCalendarDays, parseISO } from 'date-fns';
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

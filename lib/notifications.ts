import { differenceInCalendarDays, parseISO } from 'date-fns';
import type { Payment } from '@/lib/types';

export const NOTIFICATION_WINDOWS = [7, 3, 1, 0] as const;

export function shouldNotify(payment: Payment, today: string): boolean;
export function shouldNotify(payment: Payment, today: string, opts: { returnWindow: true }): number | null;
export function shouldNotify(
  payment: Payment,
  today: string,
  opts?: { returnWindow?: boolean },
): boolean | number | null {
  if (!payment.notify_enabled || payment.status === 'pagado') {
    return opts?.returnWindow ? null : false;
  }
  const days = differenceInCalendarDays(parseISO(payment.due_date), parseISO(today));
  const matched = (NOTIFICATION_WINDOWS as readonly number[]).includes(days);
  if (opts?.returnWindow) return matched ? days : null;
  return matched;
}

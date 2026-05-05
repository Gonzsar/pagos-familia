import { differenceInCalendarDays, parseISO } from 'date-fns';

export function daysRemaining(dueDate: string, today: string): number {
  return differenceInCalendarDays(parseISO(dueDate), parseISO(today));
}

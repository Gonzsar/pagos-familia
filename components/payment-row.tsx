'use client';

import { Check, Pencil } from 'lucide-react';
import { Button } from '@/components/ui/button';
import { formatAmount } from '@/lib/currency';
import { computeDisplayStatus, daysRemaining } from '@/lib/payments';
import { statusStyle } from '@/lib/styles';
import type { PaymentWithCategory } from '@/lib/types';

interface Props {
  payment: PaymentWithCategory;
  today: string;
  onEdit: (p: PaymentWithCategory) => void;
  onPay: (p: PaymentWithCategory) => void;
  isPaying: boolean;
}

export function PaymentRow({ payment, today, onEdit, onPay, isPaying }: Props) {
  const status = computeDisplayStatus(payment, today);
  const days = daysRemaining(payment.due_date, today);
  const style = statusStyle(status);

  return (
    <div className="group flex items-center gap-3 border-b border-slate-100 dark:border-slate-800 px-4 py-3 last:border-b-0 hover:bg-slate-50 dark:hover:bg-slate-800/40 transition-colors">
      <span className={`h-2 w-2 rounded-full ${style.dotClass}`} aria-hidden />

      <div className="flex-1 min-w-0">
        <p className="font-medium truncate">{payment.name}</p>
        <p className="text-xs text-slate-500 dark:text-slate-400 truncate">
          {payment.payment_method ?? '—'}
        </p>
      </div>

      <div className="hidden sm:block text-right tabular-nums font-mono text-sm w-32">
        {formatAmount(payment.amount, payment.currency)}
      </div>

      <div className="hidden md:block text-right text-sm w-28 text-slate-600 dark:text-slate-400 tabular-nums">
        {payment.due_date.split('-').reverse().join('/')}
      </div>

      <span className={`text-xs px-2 py-1 rounded-md whitespace-nowrap ${style.badgeClass}`}>
        {style.label(days)}
      </span>

      <Button
        size="sm"
        variant="ghost"
        onClick={() => onEdit(payment)}
        className="opacity-0 group-hover:opacity-100 transition-opacity"
        aria-label="Editar"
      >
        <Pencil className="h-4 w-4" />
      </Button>

      <Button
        size="sm"
        onClick={() => onPay(payment)}
        disabled={isPaying || status === 'pagado'}
        className="gap-1"
      >
        <Check className="h-4 w-4" />
        <span className="hidden sm:inline">Pagar</span>
      </Button>
    </div>
  );
}

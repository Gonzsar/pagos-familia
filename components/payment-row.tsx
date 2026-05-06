'use client';

import { Check, Pencil, EyeOff } from 'lucide-react';
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
  const isPaid = status === 'pagado';
  const isUnicoPagado = !payment.is_recurring && isPaid;
  const isUnicoPendiente = !payment.is_recurring && !isPaid;
  // Solo los pagos únicos tienen botón de pagar.
  // Los recurrentes son automáticos en la vida real, así que solo importa ver la fecha del próximo vencimiento.
  const showPayButton = !payment.is_recurring;

  let buttonLabel: string;
  let buttonClass: string;
  if (isUnicoPagado) {
    buttonLabel = 'Pagado';
    buttonClass = 'bg-emerald-600 hover:bg-emerald-700 text-white disabled:opacity-100';
  } else if (isUnicoPendiente) {
    buttonLabel = 'No pagado';
    buttonClass = 'bg-red-600 hover:bg-red-700 text-white';
  } else {
    buttonLabel = 'Pagar';
    buttonClass = '';
  }

  const strikeClass = isUnicoPagado ? 'line-through text-slate-500 dark:text-slate-500' : '';

  return (
    <div
      className={`group flex items-center gap-3 border-b border-slate-100 dark:border-slate-800 px-4 py-3 last:border-b-0 transition-colors ${
        isPaid
          ? 'bg-emerald-50 dark:bg-emerald-900/10 hover:bg-emerald-100/60 dark:hover:bg-emerald-900/20'
          : 'hover:bg-slate-50 dark:hover:bg-slate-800/40'
      }`}
    >
      <span className={`h-2 w-2 rounded-full ${style.dotClass}`} aria-hidden />

      <div className="flex-1 min-w-0">
        <p className={`font-medium truncate flex items-center gap-1.5 ${strikeClass}`}>
          {payment.name}
          {payment.count_in_totals === false && (
            <span
              className="inline-flex items-center gap-0.5 text-[10px] font-normal text-slate-500 dark:text-slate-400 bg-slate-100 dark:bg-slate-800 px-1.5 py-0.5 rounded"
              title="Este pago no se suma al total"
            >
              <EyeOff className="h-3 w-3" />
              No suma
            </span>
          )}
        </p>
        {payment.notes && (
          <p className="text-xs italic text-slate-500 dark:text-slate-400 truncate">
            {payment.notes}
          </p>
        )}
        <p className="text-xs text-slate-500 dark:text-slate-400 truncate">
          {payment.payment_method ?? '—'}
        </p>
      </div>

      <div className={`hidden sm:block text-right tabular-nums font-mono text-sm w-32 ${strikeClass}`}>
        {formatAmount(payment.amount, payment.currency)}
      </div>

      <div className="hidden md:block text-right text-sm w-28 text-slate-800 dark:text-slate-200 font-medium tabular-nums">
        {payment.due_date.split('-').reverse().join('/')}
      </div>

      <span className={`text-xs px-2 py-1 rounded-md whitespace-nowrap font-medium ${style.badgeClass}`}>
        {style.label(days)}
      </span>

      <Button
        size="sm"
        variant="ghost"
        onClick={() => onEdit(payment)}
        className="opacity-60 hover:opacity-100 text-slate-500 dark:text-slate-400 transition-opacity"
        aria-label="Editar"
      >
        <Pencil className="h-4 w-4" />
      </Button>

      {showPayButton && (
        <Button
          size="sm"
          onClick={() => onPay(payment)}
          disabled={isPaying || isPaid}
          className={`gap-1 transition-colors ${buttonClass}`}
        >
          <Check className="h-4 w-4" />
          <span className="hidden sm:inline">{buttonLabel}</span>
        </Button>
      )}
    </div>
  );
}

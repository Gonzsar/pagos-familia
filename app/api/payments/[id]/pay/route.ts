import { NextResponse } from 'next/server';
import { createClient } from '@/lib/supabase/server';
import { nextDueDate } from '@/lib/payments';
import type { Payment } from '@/lib/types';

export async function POST(_req: Request, { params }: { params: { id: string } }) {
  const supabase = createClient();
  const { data: { user } } = await supabase.auth.getUser();
  if (!user) return NextResponse.json({ error: 'No autorizado' }, { status: 401 });

  const { data: payment, error: readErr } = await supabase
    .from('payments')
    .select('*')
    .eq('id', params.id)
    .single<Payment>();
  if (readErr || !payment) return NextResponse.json({ error: 'Pago no encontrado' }, { status: 404 });

  const { error: histErr } = await supabase.from('payment_history').insert({
    payment_id: payment.id,
    paid_amount: payment.amount,
    paid_currency: payment.currency,
    due_date_at_payment: payment.due_date,
    paid_by: user.id,
  });
  if (histErr) return NextResponse.json({ error: histErr.message }, { status: 500 });

  let updatePayload: Partial<Payment>;
  if (payment.is_recurring) {
    updatePayload = {
      due_date: nextDueDate(payment.due_date, payment.recurrence_months),
      status: 'pendiente',
    };
  } else {
    updatePayload = { status: 'pagado' };
  }

  const { data: updated, error: updErr } = await supabase
    .from('payments')
    .update(updatePayload)
    .eq('id', params.id)
    .select('*, category:categories(*)')
    .single();
  if (updErr) return NextResponse.json({ error: updErr.message }, { status: 500 });

  return NextResponse.json(updated);
}

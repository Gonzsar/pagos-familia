import { NextResponse } from 'next/server';
import { createClient } from '@/lib/supabase/server';
import { effectiveDueDate } from '@/lib/payments';
import type { Payment } from '@/lib/types';

function todayUYT(): string {
  // UTC-3, sin DST.
  return new Date(Date.now() - 3 * 60 * 60 * 1000).toISOString().slice(0, 10);
}

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

  // Fecha del ciclo activo (lo que la UI le está mostrando al usuario).
  const today = todayUYT();
  const cycleDate = payment.is_recurring ? effectiveDueDate(payment, today) : payment.due_date;

  // Anotamos en el historial (snapshot).
  const { error: histErr } = await supabase.from('payment_history').insert({
    payment_id: payment.id,
    paid_amount: payment.amount,
    paid_currency: payment.currency,
    due_date_at_payment: cycleDate,
    paid_by: user.id,
  });
  if (histErr) return NextResponse.json({ error: histErr.message }, { status: 500 });

  // Update:
  // - Recurrente: marcamos paid_for_cycle con la fecha del ciclo activo. Los días siguen contando.
  // - Único: status = 'pagado'.
  let updatePayload: Partial<Payment>;
  if (payment.is_recurring) {
    updatePayload = { paid_for_cycle: cycleDate };
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

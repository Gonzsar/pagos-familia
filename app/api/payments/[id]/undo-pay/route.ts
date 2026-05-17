import { NextResponse } from 'next/server';
import { createClient } from '@/lib/supabase/server';
import type { Payment, PaymentHistoryEntry } from '@/lib/types';

export async function POST(_req: Request, { params }: { params: { id: string } }) {
  const supabase = createClient();

  const { data: lastEntry, error: histErr } = await supabase
    .from('payment_history')
    .select('*')
    .eq('payment_id', params.id)
    .order('paid_at', { ascending: false })
    .limit(1)
    .single<PaymentHistoryEntry>();
  if (histErr || !lastEntry) return NextResponse.json({ error: 'No hay nada para deshacer' }, { status: 404 });

  const paidAt = new Date(lastEntry.paid_at).getTime();
  if (Date.now() - paidAt > 24 * 60 * 60 * 1000) {
    return NextResponse.json({ error: 'Solo podés deshacer pagos de las últimas 24 horas' }, { status: 400 });
  }

  // Leer el pago para saber si es recurrente.
  const { data: payment, error: pErr } = await supabase
    .from('payments')
    .select('*')
    .eq('id', params.id)
    .single<Payment>();
  if (pErr || !payment) return NextResponse.json({ error: 'Pago no encontrado' }, { status: 404 });

  // Recurrente: limpiar paid_for_cycle. Único: volver a pendiente.
  const updatePayload: Partial<Payment> = payment.is_recurring
    ? { paid_for_cycle: null }
    : { status: 'pendiente' };

  const { data: updated, error: updErr } = await supabase
    .from('payments')
    .update(updatePayload)
    .eq('id', params.id)
    .select('*, category:categories(*)')
    .single<Payment>();
  if (updErr) return NextResponse.json({ error: updErr.message }, { status: 500 });

  const { error: delErr } = await supabase.from('payment_history').delete().eq('id', lastEntry.id);
  if (delErr) return NextResponse.json({ error: delErr.message }, { status: 500 });

  return NextResponse.json(updated);
}

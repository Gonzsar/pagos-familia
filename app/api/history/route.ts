import { NextResponse } from 'next/server';
import { createClient } from '@/lib/supabase/server';

export async function GET(req: Request) {
  const url = new URL(req.url);
  const from = url.searchParams.get('from');  // YYYY-MM-DD
  const to = url.searchParams.get('to');

  const supabase = createClient();
  let query = supabase
    .from('payment_history')
    .select('*, payment:payments(*, category:categories(*))')
    .order('paid_at', { ascending: false });

  if (from) query = query.gte('paid_at', from);
  if (to) query = query.lte('paid_at', `${to}T23:59:59`);

  const { data, error } = await query;
  if (error) return NextResponse.json({ error: error.message }, { status: 500 });
  return NextResponse.json(data);
}

import { NextResponse } from 'next/server';
import { z } from 'zod';
import { createClient } from '@/lib/supabase/server';

const updateSchema = z.object({
  name: z.string().min(1).max(120).optional(),
  amount: z.number().positive().optional(),
  currency: z.enum(['USD', 'UYU']).optional(),
  due_date: z.string().regex(/^\d{4}-\d{2}-\d{2}$/).optional(),
  category_id: z.string().uuid().nullable().optional(),
  payment_method: z.string().max(60).nullable().optional(),
  is_recurring: z.boolean().optional(),
  recurrence_months: z.number().int().positive().optional(),
  status: z.enum(['pendiente', 'pagado']).optional(),
  notify_enabled: z.boolean().optional(),
  count_in_totals: z.boolean().optional(),
  notes: z.string().max(500).nullable().optional(),
});

export async function PATCH(req: Request, { params }: { params: { id: string } }) {
  const body = await req.json().catch(() => null);
  const parsed = updateSchema.safeParse(body);
  if (!parsed.success) return NextResponse.json({ error: 'Datos inválidos' }, { status: 400 });

  const supabase = createClient();
  const { data, error } = await supabase
    .from('payments')
    .update(parsed.data)
    .eq('id', params.id)
    .select('*, category:categories(*)')
    .single();
  if (error) return NextResponse.json({ error: error.message }, { status: 500 });
  return NextResponse.json(data);
}

export async function DELETE(_req: Request, { params }: { params: { id: string } }) {
  const supabase = createClient();
  const { error } = await supabase.from('payments').delete().eq('id', params.id);
  if (error) return NextResponse.json({ error: error.message }, { status: 500 });
  return NextResponse.json({ ok: true });
}

import { NextResponse } from 'next/server';
import { z } from 'zod';
import { createClient } from '@/lib/supabase/server';

export async function GET() {
  const supabase = createClient();
  const { data, error } = await supabase
    .from('payments')
    .select('*, category:categories(*)')
    .order('due_date', { ascending: true });

  if (error) return NextResponse.json({ error: error.message }, { status: 500 });
  return NextResponse.json(data);
}

const createSchema = z.object({
  name: z.string().min(1).max(120),
  amount: z.number().positive(),
  currency: z.enum(['USD', 'UYU']),
  due_date: z.string().regex(/^\d{4}-\d{2}-\d{2}$/),
  category_id: z.string().uuid().nullable(),
  payment_method: z.string().max(60).nullable(),
  is_recurring: z.boolean(),
  recurrence_months: z.number().int().positive(),
  notify_enabled: z.boolean().optional().default(true),
  count_in_totals: z.boolean().optional().default(true),
  notes: z.string().max(500).nullable().optional(),
});

export async function POST(req: Request) {
  const body = await req.json().catch(() => null);
  const parsed = createSchema.safeParse(body);
  if (!parsed.success) {
    return NextResponse.json({ error: 'Datos inválidos', details: parsed.error.flatten() }, { status: 400 });
  }

  const supabase = createClient();
  const { data: { user } } = await supabase.auth.getUser();
  if (!user) return NextResponse.json({ error: 'No autorizado' }, { status: 401 });

  const { data, error } = await supabase
    .from('payments')
    .insert({ ...parsed.data, created_by: user.id })
    .select('*, category:categories(*)')
    .single();
  if (error) return NextResponse.json({ error: error.message }, { status: 500 });

  return NextResponse.json(data, { status: 201 });
}

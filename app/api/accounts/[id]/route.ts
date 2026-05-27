import { NextResponse } from 'next/server';
import { z } from 'zod';
import { createClient } from '@/lib/supabase/server';

const updateSchema = z.object({
  provider: z.string().min(1).max(120).optional(),
  account_name: z.string().min(1).max(200).optional(),
  bank: z.enum(['BROU', 'SCOTIA', 'ITAU']).optional(),
  account_type: z.string().max(60).nullable().optional(),
  account_number: z.string().min(1).max(60).optional(),
  position: z.number().int().nonnegative().optional(),
});

export async function PATCH(req: Request, { params }: { params: { id: string } }) {
  const body = await req.json().catch(() => null);
  const parsed = updateSchema.safeParse(body);
  if (!parsed.success) return NextResponse.json({ error: 'Datos inválidos' }, { status: 400 });

  const supabase = createClient();
  const { data, error } = await supabase
    .from('accounts')
    .update(parsed.data)
    .eq('id', params.id)
    .select()
    .single();
  if (error) return NextResponse.json({ error: error.message }, { status: 500 });
  return NextResponse.json(data);
}

export async function DELETE(_req: Request, { params }: { params: { id: string } }) {
  const supabase = createClient();
  const { error } = await supabase.from('accounts').delete().eq('id', params.id);
  if (error) return NextResponse.json({ error: error.message }, { status: 500 });
  return NextResponse.json({ ok: true });
}

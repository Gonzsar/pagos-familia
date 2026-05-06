import { NextResponse } from 'next/server';
import { createClient } from '@/lib/supabase/server';

function genCode(): string {
  // 6 chars alfanuméricos en mayúscula
  return Math.random().toString(36).slice(2, 8).toUpperCase();
}

export async function POST() {
  const supabase = createClient();
  const { data: { user } } = await supabase.auth.getUser();
  if (!user) return NextResponse.json({ error: 'No autorizado' }, { status: 401 });

  const code = genCode();
  const { data, error } = await supabase
    .from('user_settings')
    .upsert({
      user_id: user.id,
      telegram_link_code: code,
      telegram_chat_id: null,  // limpiamos chat_id viejo si existía
    })
    .select()
    .single();

  if (error) return NextResponse.json({ error: error.message }, { status: 500 });
  return NextResponse.json({ code, settings: data });
}

export async function DELETE() {
  const supabase = createClient();
  const { data: { user } } = await supabase.auth.getUser();
  if (!user) return NextResponse.json({ error: 'No autorizado' }, { status: 401 });

  const { error } = await supabase
    .from('user_settings')
    .update({ telegram_chat_id: null, telegram_link_code: null })
    .eq('user_id', user.id);

  if (error) return NextResponse.json({ error: error.message }, { status: 500 });
  return NextResponse.json({ ok: true });
}

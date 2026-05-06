import { NextResponse } from 'next/server';
import { z } from 'zod';
import { createClient } from '@/lib/supabase/server';
import { isAllowedEmail } from '@/lib/auth';

const schema = z.object({ email: z.string().email() });

export async function POST(req: Request) {
  const body = await req.json().catch(() => null);
  const parsed = schema.safeParse(body);
  if (!parsed.success) {
    return NextResponse.json({ error: 'Email inválido' }, { status: 400 });
  }

  const email = parsed.data.email;
  if (!isAllowedEmail(email, process.env.ALLOWED_EMAILS)) {
    return NextResponse.json({ error: 'No tenés acceso a esta aplicación. Contactá al administrador.' }, { status: 403 });
  }

  const supabase = createClient();
  const appUrl = process.env.NEXT_PUBLIC_APP_URL || 'http://localhost:3000';

  const { error } = await supabase.auth.signInWithOtp({
    email,
    options: {
      emailRedirectTo: `${appUrl}/auth/callback`,
      shouldCreateUser: true,
    },
  });

  if (error) {
    return NextResponse.json({ error: 'No se pudo mandar el mail. Intentá más tarde.' }, { status: 500 });
  }

  return NextResponse.json({ ok: true });
}

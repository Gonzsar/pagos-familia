import { createServerClient, type CookieOptions } from '@supabase/ssr';
import { NextResponse, type NextRequest } from 'next/server';

export async function updateSession(request: NextRequest) {
  let response = NextResponse.next({ request });

  const supabase = createServerClient(
    process.env.NEXT_PUBLIC_SUPABASE_URL!,
    process.env.NEXT_PUBLIC_SUPABASE_ANON_KEY!,
    {
      cookies: {
        get(name: string) {
          return request.cookies.get(name)?.value;
        },
        set(name: string, value: string, options: CookieOptions) {
          request.cookies.set({ name, value, ...options });
          response = NextResponse.next({ request });
          response.cookies.set({ name, value, ...options });
        },
        remove(name: string, options: CookieOptions) {
          request.cookies.set({ name, value: '', ...options });
          response = NextResponse.next({ request });
          response.cookies.set({ name, value: '', ...options });
        },
      },
    }
  );

  const { data: { user } } = await supabase.auth.getUser();

  const url = request.nextUrl;
  const isPublic =
    url.pathname.startsWith('/login') ||
    url.pathname.startsWith('/auth') ||                  // /auth/callback
    url.pathname.startsWith('/api/auth') ||              // /api/auth/magic-link, /api/auth/logout
    url.pathname.startsWith('/api/telegram/webhook');    // Telegram bot webhook (auth via secret token)

  if (!user && !isPublic) {
    return NextResponse.redirect(new URL('/login', url));
  }

  if (user && url.pathname === '/login') {
    return NextResponse.redirect(new URL('/', url));
  }

  return response;
}

# Plan A — MVP Web App Implementation Plan

> **For agentic workers:** REQUIRED SUB-SKILL: Use superpowers:subagent-driven-development (recommended) or superpowers:executing-plans to implement this plan task-by-task. Steps use checkbox (`- [ ]`) syntax for tracking.

**Goal:** Construir y desplegar la web de Plan de Pagos Familiar con login, CRUD de pagos y categorías, dashboard con totales y cotización, historial con deshacer, y datos iniciales cargados. Al final del plan la app funciona online y reemplaza al Excel; los recordatorios automáticos se agregan en el Plan B.

**Architecture:** Next.js 14 (App Router) en Vercel, Supabase (Postgres + Auth) como backend, Tailwind CSS + shadcn/ui para la UI, Vitest para tests de lógica pura. Allowlist de emails como gate de auth.

**Tech Stack:** Next.js 14, React 18, TypeScript, Tailwind CSS, shadcn/ui, Lucide Icons, Supabase JS v2, Vitest, Zod, date-fns, next-themes.

**Spec base:** [docs/superpowers/specs/2026-05-05-plan-pagos-familiar-design.md](../specs/2026-05-05-plan-pagos-familiar-design.md)

---

## Convenciones del plan

- **Working directory:** `C:\Users\Usuario\OneDrive\Desktop\Plan de Pagos Familiar` (en bash: `/c/Users/Usuario/OneDrive/Desktop/Plan de Pagos Familiar`).
- **Shell:** bash. Usar `/` en paths siempre.
- **Tests:** Vitest. Comando base: `npx vitest run <file>`.
- **Estilo de commit:** [Conventional Commits](https://www.conventionalcommits.org/). En español.
- **Co-author en commits:** sí, igual que los anteriores.

---

## Fase 0 — Setup del proyecto

### Task 0.1: Inicializar Next.js

**Files:**
- Create: `package.json`, `tsconfig.json`, `next.config.mjs`, `app/layout.tsx`, `app/page.tsx`, etc. (los crea el wizard)

- [ ] **Step 1: Correr el wizard de Next.js sin instalar git ni cambiar de carpeta**

```bash
npx create-next-app@14 . --typescript --tailwind --app --no-src-dir --import-alias='@/*' --no-eslint --use-npm
```

Cuando pregunte si querés sobrescribir, responder `y` (la carpeta actual ya tiene `.git` y `docs/` que se preservan; create-next-app solo agrega).

Expected: crea `package.json`, `app/`, `tailwind.config.ts`, `next.config.mjs`, etc.

- [ ] **Step 2: Verificar que arranca**

```bash
npm run dev
```

Abrir http://localhost:3000 → debería verse la landing por defecto. Cerrar con Ctrl+C.

- [ ] **Step 3: Commit**

```bash
git add -A
git commit -m "feat: init Next.js 14 con TypeScript y Tailwind"
```

---

### Task 0.2: Instalar dependencias core

**Files:**
- Modify: `package.json`

- [ ] **Step 1: Instalar runtime deps**

```bash
npm install @supabase/supabase-js @supabase/ssr zod date-fns lucide-react next-themes clsx tailwind-merge class-variance-authority
```

- [ ] **Step 2: Instalar dev deps (testing + tipos)**

```bash
npm install -D vitest @vitejs/plugin-react @types/node typescript@5.4.5 prettier
```

- [ ] **Step 3: Verificar que `npm install` quedó limpio**

```bash
npm ls --depth=0
```

Expected: sin errores `UNMET DEPENDENCY` ni warnings críticos.

- [ ] **Step 4: Commit**

```bash
git add package.json package-lock.json
git commit -m "chore: instalar deps (supabase, zod, date-fns, vitest, etc.)"
```

---

### Task 0.3: Configurar Vitest

**Files:**
- Create: `vitest.config.ts`
- Modify: `package.json` (scripts)

- [ ] **Step 1: Crear `vitest.config.ts`**

```ts
import { defineConfig } from 'vitest/config';
import react from '@vitejs/plugin-react';
import path from 'node:path';

export default defineConfig({
  plugins: [react()],
  test: {
    environment: 'node',
    globals: true,
    include: ['tests/**/*.test.ts', 'tests/**/*.test.tsx'],
  },
  resolve: {
    alias: {
      '@': path.resolve(__dirname, '.'),
    },
  },
});
```

- [ ] **Step 2: Agregar scripts a `package.json`**

Editar la sección `"scripts"` de `package.json` para que quede:

```json
"scripts": {
  "dev": "next dev",
  "build": "next build",
  "start": "next start",
  "test": "vitest run",
  "test:watch": "vitest",
  "typecheck": "tsc --noEmit"
}
```

- [ ] **Step 3: Verificar que vitest corre (sin tests aún)**

```bash
npx vitest run
```

Expected: "No test files found" — eso está bien.

- [ ] **Step 4: Commit**

```bash
git add vitest.config.ts package.json
git commit -m "chore: configurar Vitest"
```

---

### Task 0.4: Inicializar shadcn/ui

**Files:**
- Create: `components.json`, `lib/utils.ts`
- Modify: `tailwind.config.ts`, `app/globals.css`

- [ ] **Step 1: Correr el init de shadcn**

```bash
npx shadcn@latest init
```

Responder:
- Style: **Default**
- Base color: **Slate**
- CSS variables: **Yes**

Esto crea `components.json`, `lib/utils.ts`, y modifica `tailwind.config.ts` y `app/globals.css` con las variables de tema.

- [ ] **Step 2: Instalar componentes base que vamos a usar**

```bash
npx shadcn@latest add button input label dialog sheet dropdown-menu select badge card toast sonner separator switch tabs
```

Cada componente se agrega bajo `components/ui/`.

- [ ] **Step 3: Verificar que `tsc` compila**

```bash
npm run typecheck
```

Expected: sin errores.

- [ ] **Step 4: Commit**

```bash
git add -A
git commit -m "feat: inicializar shadcn/ui con componentes base"
```

---

### Task 0.5: Configurar fuentes Inter + JetBrains Mono

**Files:**
- Modify: `app/layout.tsx`, `tailwind.config.ts`, `app/globals.css`

- [ ] **Step 1: Editar `app/layout.tsx`**

Reemplazar el contenido completo:

```tsx
import type { Metadata } from 'next';
import { Inter, JetBrains_Mono } from 'next/font/google';
import './globals.css';

const inter = Inter({
  subsets: ['latin'],
  variable: '--font-inter',
  display: 'swap',
});

const jetbrainsMono = JetBrains_Mono({
  subsets: ['latin'],
  variable: '--font-mono',
  display: 'swap',
});

export const metadata: Metadata = {
  title: 'Plan de Pagos Familiar',
  description: 'Gestión centralizada de pagos mensuales y únicos',
};

export default function RootLayout({ children }: { children: React.ReactNode }) {
  return (
    <html lang="es" suppressHydrationWarning>
      <body className={`${inter.variable} ${jetbrainsMono.variable} font-sans antialiased`}>
        {children}
      </body>
    </html>
  );
}
```

- [ ] **Step 2: Configurar las fuentes en `tailwind.config.ts`**

En el objeto `theme.extend`, agregar:

```ts
fontFamily: {
  sans: ['var(--font-inter)', 'system-ui', 'sans-serif'],
  mono: ['var(--font-mono)', 'monospace'],
},
```

- [ ] **Step 3: Verificar typecheck**

```bash
npm run typecheck
```

Expected: sin errores.

- [ ] **Step 4: Commit**

```bash
git add -A
git commit -m "feat: configurar fuentes Inter + JetBrains Mono"
```

---

### Task 0.6: Estructura de carpetas y `.env.example`

**Files:**
- Create: `lib/supabase/`, `lib/`, `tests/`, `scripts/`, `supabase/migrations/`, `.env.example`

- [ ] **Step 1: Crear las carpetas vacías con `.gitkeep`**

```bash
mkdir -p lib/supabase tests/lib tests/api scripts supabase/migrations supabase
touch lib/supabase/.gitkeep tests/lib/.gitkeep tests/api/.gitkeep scripts/.gitkeep supabase/migrations/.gitkeep
```

- [ ] **Step 2: Crear `.env.example`**

```bash
# Supabase
NEXT_PUBLIC_SUPABASE_URL=
NEXT_PUBLIC_SUPABASE_ANON_KEY=
SUPABASE_SERVICE_ROLE_KEY=

# App
NEXT_PUBLIC_APP_URL=http://localhost:3000
ALLOWED_EMAILS=

# (Plan B — todavía no usados)
RESEND_API_KEY=
RESEND_FROM_EMAIL=
TELEGRAM_BOT_TOKEN=
TELEGRAM_WEBHOOK_SECRET=
```

- [ ] **Step 3: Crear `.env.local` vacío (ignorado por git)**

```bash
touch .env.local
```

- [ ] **Step 4: Commit**

```bash
git add -A
git commit -m "chore: estructura de carpetas y .env.example"
```

---

## Fase 1 — Setup externo (manual del usuario)

> **Estas tareas requieren acción manual del usuario.** El agente debe pausar y darle instrucciones claras a Gonzalo, esperar confirmación, y avanzar.

### Task 1.1: Crear proyecto Supabase

- [ ] **Step 1: Instrucciones al usuario**

Decirle al usuario:

> 1. Andá a https://supabase.com → "Start your project" → registrate con tu Google.
> 2. Crear proyecto: nombre `plan-pagos-familiar`, password de DB segura (guardala en un lugar seguro), región **South America (São Paulo)**.
> 3. Esperar ~2 minutos a que termine de provisionar.
> 4. Una vez listo, ir a **Project Settings → API** y copiar:
>    - **Project URL** → guardar como `NEXT_PUBLIC_SUPABASE_URL`
>    - **anon public** key → guardar como `NEXT_PUBLIC_SUPABASE_ANON_KEY`
>    - **service_role** key (secreta!) → guardar como `SUPABASE_SERVICE_ROLE_KEY`
> 5. Pasame esos 3 valores.

- [ ] **Step 2: Pegar valores en `.env.local`**

Cuando el usuario los pasa, escribirlos en `.env.local`:

```
NEXT_PUBLIC_SUPABASE_URL=https://xxxxx.supabase.co
NEXT_PUBLIC_SUPABASE_ANON_KEY=eyJ...
SUPABASE_SERVICE_ROLE_KEY=eyJ...
NEXT_PUBLIC_APP_URL=http://localhost:3000
ALLOWED_EMAILS=sardigonzalo01@gmail.com
```

(Por ahora la allowlist solo incluye a Gonzalo; agregamos más mails de la familia después.)

- [ ] **Step 3: NO commitear `.env.local`** — ya está en `.gitignore`. Confirmar:

```bash
git status
```

Expected: `.env.local` NO debe aparecer.

---

### Task 1.2: Configurar Auth en Supabase

- [ ] **Step 1: Instrucciones al usuario**

> En el dashboard de Supabase:
> 1. Ir a **Authentication → Providers → Email**.
> 2. Asegurate que está habilitado.
> 3. Desactivar "Confirm email" (queremos que el magic link entre directo, no que pida confirmar primero).
> 4. En **Authentication → URL Configuration**:
>    - Site URL: `http://localhost:3000` (después lo cambiamos a la URL de Vercel).
>    - Redirect URLs: agregar `http://localhost:3000/auth/callback` y `http://localhost:3000/**`.
> 5. Guardar cambios.

- [ ] **Step 2: Confirmar con el usuario que terminó.**

---

### Task 1.3: Crear repo en GitHub y push inicial

- [ ] **Step 1: Instrucciones al usuario**

> 1. Andá a https://github.com/new
> 2. Nombre del repo: `plan-pagos-familiar`. Privado.
> 3. NO inicializar con README ni .gitignore (ya los tenemos).
> 4. Crear el repo y copiar la URL HTTPS (ej: `https://github.com/Gonzalo/plan-pagos-familiar.git`).
> 5. Pasame esa URL.

- [ ] **Step 2: Conectar y pushear**

Cuando el usuario pasa la URL:

```bash
git remote add origin <URL>
git push -u origin main
```

Expected: el push sube la rama main con todos los commits hechos hasta ahora.

---

## Fase 2 — Base de datos

### Task 2.1: Migración inicial — esquema completo

**Files:**
- Create: `supabase/migrations/0001_init.sql`

- [ ] **Step 1: Escribir la migración**

Contenido completo de `supabase/migrations/0001_init.sql`:

```sql
-- Plan de Pagos Familiar — esquema inicial

-- Extensiones
create extension if not exists "uuid-ossp";

-- ============================================================================
-- Tabla: categories
-- ============================================================================
create table public.categories (
  id uuid primary key default gen_random_uuid(),
  name text not null unique,
  icon text,
  color text,
  position int not null default 0,
  created_at timestamptz not null default now()
);

-- ============================================================================
-- Tabla: payments
-- ============================================================================
create table public.payments (
  id uuid primary key default gen_random_uuid(),
  name text not null,
  amount numeric(12,2) not null,
  currency text not null check (currency in ('USD', 'UYU')),
  due_date date not null,
  category_id uuid references public.categories(id) on delete set null,
  payment_method text,
  is_recurring boolean not null default true,
  recurrence_months int not null default 1 check (recurrence_months > 0),
  status text not null default 'pendiente' check (status in ('pendiente', 'pagado')),
  notify_enabled boolean not null default true,
  notes text,
  created_by uuid references auth.users(id) on delete set null,
  created_at timestamptz not null default now(),
  updated_at timestamptz not null default now()
);

create index payments_due_status_idx on public.payments (due_date, status);
create index payments_category_idx on public.payments (category_id);

-- Trigger updated_at
create or replace function public.set_updated_at()
returns trigger language plpgsql as $$
begin
  new.updated_at := now();
  return new;
end $$;

create trigger payments_set_updated_at
before update on public.payments
for each row execute function public.set_updated_at();

-- ============================================================================
-- Tabla: payment_history
-- ============================================================================
create table public.payment_history (
  id uuid primary key default gen_random_uuid(),
  payment_id uuid not null references public.payments(id) on delete cascade,
  paid_at timestamptz not null default now(),
  paid_amount numeric(12,2) not null,
  paid_currency text not null,
  due_date_at_payment date not null,
  paid_by uuid references auth.users(id) on delete set null
);

create index payment_history_payment_idx on public.payment_history (payment_id);
create index payment_history_paid_at_idx on public.payment_history (paid_at desc);

-- ============================================================================
-- Tabla: notification_log (usada en Plan B, definida ya para no migrar después)
-- ============================================================================
create table public.notification_log (
  id uuid primary key default gen_random_uuid(),
  payment_id uuid not null references public.payments(id) on delete cascade,
  window_days int not null,
  due_date date not null,
  channel text not null check (channel in ('email', 'telegram')),
  sent_at timestamptz not null default now(),
  success boolean not null,
  error_message text,
  unique (payment_id, window_days, due_date, channel)
);

-- ============================================================================
-- Tabla: user_settings (definida ya, se usa más en Plan B)
-- ============================================================================
create table public.user_settings (
  user_id uuid primary key references auth.users(id) on delete cascade,
  notification_email text,
  telegram_chat_id text,
  telegram_link_code text,
  receives_reminders boolean not null default false,
  created_at timestamptz not null default now(),
  updated_at timestamptz not null default now()
);

create trigger user_settings_set_updated_at
before update on public.user_settings
for each row execute function public.set_updated_at();

-- ============================================================================
-- Row Level Security
-- ============================================================================
alter table public.categories enable row level security;
alter table public.payments enable row level security;
alter table public.payment_history enable row level security;
alter table public.notification_log enable row level security;
alter table public.user_settings enable row level security;

-- Cualquier usuario autenticado puede CRUD en categories, payments, payment_history
create policy "auth_all_categories" on public.categories
  for all using (auth.role() = 'authenticated')
  with check (auth.role() = 'authenticated');

create policy "auth_all_payments" on public.payments
  for all using (auth.role() = 'authenticated')
  with check (auth.role() = 'authenticated');

create policy "auth_all_history" on public.payment_history
  for all using (auth.role() = 'authenticated')
  with check (auth.role() = 'authenticated');

-- notification_log: solo lectura para usuarios; el cron usa service_role que bypassa RLS
create policy "auth_select_notif_log" on public.notification_log
  for select using (auth.role() = 'authenticated');

-- user_settings: cada uno solo ve y modifica el suyo
create policy "own_user_settings_select" on public.user_settings
  for select using (auth.uid() = user_id);
create policy "own_user_settings_insert" on public.user_settings
  for insert with check (auth.uid() = user_id);
create policy "own_user_settings_update" on public.user_settings
  for update using (auth.uid() = user_id) with check (auth.uid() = user_id);
```

- [ ] **Step 2: Aplicar la migración en Supabase**

Decirle al usuario:

> En Supabase, ir a **SQL Editor → New query**, pegar todo el contenido de `supabase/migrations/0001_init.sql`, click "Run". Confirmá que dice "Success".

- [ ] **Step 3: Verificar tablas en el dashboard**

> En **Table Editor** deben aparecer: `categories`, `payments`, `payment_history`, `notification_log`, `user_settings`. Confirmar.

- [ ] **Step 4: Commit**

```bash
git add supabase/migrations/0001_init.sql
git commit -m "feat: migración inicial — esquema completo con RLS"
git push
```

---

### Task 2.2: Seed de categorías

**Files:**
- Create: `supabase/seed.sql`

- [ ] **Step 1: Escribir el seed**

Contenido de `supabase/seed.sql`:

```sql
insert into public.categories (name, icon, color, position) values
  ('Entretenimiento', '🎬', '#8B5CF6', 1),
  ('Empresa', '💼', '#2563EB', 2),
  ('Hogar y Servicios', '🏠', '#10B981', 3),
  ('Transporte', '🚗', '#F59E0B', 4),
  ('Otros', '🛒', '#64748B', 5)
on conflict (name) do nothing;
```

- [ ] **Step 2: Aplicar el seed**

Decirle al usuario que pegue el contenido en SQL Editor y corra "Run". Verificar en Table Editor que aparecen las 5 filas.

- [ ] **Step 3: Commit**

```bash
git add supabase/seed.sql
git commit -m "feat: seed de categorías iniciales"
git push
```

---

## Fase 3 — Cliente de Supabase y middleware de auth

### Task 3.1: Cliente browser

**Files:**
- Create: `lib/supabase/client.ts`
- Delete: `lib/supabase/.gitkeep`

- [ ] **Step 1: Borrar el `.gitkeep`** (la carpeta ahora va a tener contenido)

```bash
rm lib/supabase/.gitkeep
```

- [ ] **Step 2: Crear `lib/supabase/client.ts`**

```ts
import { createBrowserClient } from '@supabase/ssr';

export function createClient() {
  return createBrowserClient(
    process.env.NEXT_PUBLIC_SUPABASE_URL!,
    process.env.NEXT_PUBLIC_SUPABASE_ANON_KEY!
  );
}
```

- [ ] **Step 3: Verificar typecheck**

```bash
npm run typecheck
```

Expected: sin errores.

- [ ] **Step 4: Commit**

```bash
git add lib/supabase/client.ts
git rm lib/supabase/.gitkeep 2>/dev/null || true
git commit -m "feat(supabase): cliente browser"
```

---

### Task 3.2: Cliente server

**Files:**
- Create: `lib/supabase/server.ts`

- [ ] **Step 1: Crear `lib/supabase/server.ts`**

```ts
import { createServerClient, type CookieOptions } from '@supabase/ssr';
import { cookies } from 'next/headers';

export function createClient() {
  const cookieStore = cookies();

  return createServerClient(
    process.env.NEXT_PUBLIC_SUPABASE_URL!,
    process.env.NEXT_PUBLIC_SUPABASE_ANON_KEY!,
    {
      cookies: {
        get(name: string) {
          return cookieStore.get(name)?.value;
        },
        set(name: string, value: string, options: CookieOptions) {
          try {
            cookieStore.set({ name, value, ...options });
          } catch {
            // ignored — Server Components no permiten setear cookies
          }
        },
        remove(name: string, options: CookieOptions) {
          try {
            cookieStore.set({ name, value: '', ...options });
          } catch {
            // ignored
          }
        },
      },
    }
  );
}

export function createServiceClient() {
  return createServerClient(
    process.env.NEXT_PUBLIC_SUPABASE_URL!,
    process.env.SUPABASE_SERVICE_ROLE_KEY!,
    {
      cookies: {
        get() { return undefined; },
        set() {},
        remove() {},
      },
    }
  );
}
```

- [ ] **Step 2: Typecheck**

```bash
npm run typecheck
```

Expected: sin errores.

- [ ] **Step 3: Commit**

```bash
git add lib/supabase/server.ts
git commit -m "feat(supabase): cliente server (con SSR cookies + service role)"
```

---

### Task 3.3: Middleware de auth (refresh + redirect)

**Files:**
- Create: `middleware.ts`, `lib/supabase/middleware.ts`

- [ ] **Step 1: Crear `lib/supabase/middleware.ts`**

```ts
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
    url.pathname.startsWith('/auth') ||         // /auth/callback
    url.pathname.startsWith('/api/auth');       // /api/auth/magic-link, /api/auth/logout

  if (!user && !isPublic) {
    return NextResponse.redirect(new URL('/login', url));
  }

  if (user && url.pathname === '/login') {
    return NextResponse.redirect(new URL('/', url));
  }

  return response;
}
```

- [ ] **Step 2: Crear `middleware.ts` en la raíz**

```ts
import { type NextRequest } from 'next/server';
import { updateSession } from '@/lib/supabase/middleware';

export async function middleware(request: NextRequest) {
  return await updateSession(request);
}

export const config = {
  matcher: [
    '/((?!_next/static|_next/image|favicon.ico|.*\\.(?:svg|png|jpg|jpeg|gif|webp)$).*)',
  ],
};
```

- [ ] **Step 3: Typecheck**

```bash
npm run typecheck
```

- [ ] **Step 4: Commit**

```bash
git add middleware.ts lib/supabase/middleware.ts
git commit -m "feat(auth): middleware con refresh de sesión y redirect a login"
```

---

## Fase 4 — Lógica pura (TDD)

### Task 4.1: Tipos compartidos

**Files:**
- Create: `lib/types.ts`

- [ ] **Step 1: Crear `lib/types.ts`**

```ts
export type Currency = 'USD' | 'UYU';
export type PaymentStatus = 'pendiente' | 'pagado';

export interface Category {
  id: string;
  name: string;
  icon: string | null;
  color: string | null;
  position: number;
  created_at: string;
}

export interface Payment {
  id: string;
  name: string;
  amount: number;
  currency: Currency;
  due_date: string;          // YYYY-MM-DD
  category_id: string | null;
  payment_method: string | null;
  is_recurring: boolean;
  recurrence_months: number;
  status: PaymentStatus;
  notify_enabled: boolean;
  notes: string | null;
  created_by: string | null;
  created_at: string;
  updated_at: string;
}

export interface PaymentWithCategory extends Payment {
  category: Category | null;
}

export interface PaymentHistoryEntry {
  id: string;
  payment_id: string;
  paid_at: string;
  paid_amount: number;
  paid_currency: Currency;
  due_date_at_payment: string;
  paid_by: string | null;
}

export type DisplayStatus =
  | 'pagado'
  | 'vencido'
  | 'vence_hoy'
  | 'urgente'    // ≤3 días
  | 'proximo'    // ≤7 días
  | 'futuro';    // >7 días
```

- [ ] **Step 2: Typecheck**

```bash
npm run typecheck
```

- [ ] **Step 3: Commit**

```bash
git add lib/types.ts
git commit -m "feat: tipos compartidos del dominio"
```

---

### Task 4.2: `lib/payments.ts` — `daysRemaining` (TDD)

**Files:**
- Test: `tests/lib/payments.test.ts`
- Create: `lib/payments.ts`

- [ ] **Step 1: Escribir test fallando**

`tests/lib/payments.test.ts`:

```ts
import { describe, it, expect } from 'vitest';
import { daysRemaining } from '@/lib/payments';

describe('daysRemaining', () => {
  it('devuelve 0 si la fecha es hoy', () => {
    expect(daysRemaining('2026-05-05', '2026-05-05')).toBe(0);
  });

  it('devuelve negativo si la fecha pasó', () => {
    expect(daysRemaining('2026-05-01', '2026-05-05')).toBe(-4);
  });

  it('devuelve positivo si la fecha es futura', () => {
    expect(daysRemaining('2026-05-12', '2026-05-05')).toBe(7);
  });

  it('cruza meses correctamente', () => {
    expect(daysRemaining('2026-06-04', '2026-05-05')).toBe(30);
  });
});
```

- [ ] **Step 2: Correr el test → debe fallar**

```bash
npx vitest run tests/lib/payments.test.ts
```

Expected: FAIL — "Cannot find module '@/lib/payments'".

- [ ] **Step 3: Implementar mínimo**

`lib/payments.ts`:

```ts
import { differenceInCalendarDays, parseISO } from 'date-fns';

export function daysRemaining(dueDate: string, today: string): number {
  return differenceInCalendarDays(parseISO(dueDate), parseISO(today));
}
```

- [ ] **Step 4: Correr → pasa**

```bash
npx vitest run tests/lib/payments.test.ts
```

Expected: PASS, 4 tests.

- [ ] **Step 5: Commit**

```bash
git add lib/payments.ts tests/lib/payments.test.ts
git commit -m "feat(payments): daysRemaining con tests"
```

---

### Task 4.3: `computeDisplayStatus` (TDD)

**Files:**
- Modify: `tests/lib/payments.test.ts`, `lib/payments.ts`

- [ ] **Step 1: Agregar tests al final del archivo**

Agregar a `tests/lib/payments.test.ts`:

```ts
import { computeDisplayStatus } from '@/lib/payments';
import type { Payment } from '@/lib/types';

const base: Payment = {
  id: 'x', name: 'Test', amount: 10, currency: 'USD',
  due_date: '2026-05-05', category_id: null, payment_method: null,
  is_recurring: true, recurrence_months: 1,
  status: 'pendiente', notify_enabled: true, notes: null,
  created_by: null, created_at: '', updated_at: '',
};

describe('computeDisplayStatus', () => {
  it('"pagado" si status=pagado, sin importar fecha', () => {
    expect(computeDisplayStatus({ ...base, status: 'pagado', due_date: '2026-04-01' }, '2026-05-05')).toBe('pagado');
  });

  it('"vencido" si pendiente y due_date < hoy', () => {
    expect(computeDisplayStatus({ ...base, due_date: '2026-05-04' }, '2026-05-05')).toBe('vencido');
  });

  it('"vence_hoy" si due_date == hoy', () => {
    expect(computeDisplayStatus({ ...base, due_date: '2026-05-05' }, '2026-05-05')).toBe('vence_hoy');
  });

  it('"urgente" si faltan 1-3 días', () => {
    expect(computeDisplayStatus({ ...base, due_date: '2026-05-08' }, '2026-05-05')).toBe('urgente');
    expect(computeDisplayStatus({ ...base, due_date: '2026-05-06' }, '2026-05-05')).toBe('urgente');
  });

  it('"proximo" si faltan 4-7 días', () => {
    expect(computeDisplayStatus({ ...base, due_date: '2026-05-12' }, '2026-05-05')).toBe('proximo');
    expect(computeDisplayStatus({ ...base, due_date: '2026-05-09' }, '2026-05-05')).toBe('proximo');
  });

  it('"futuro" si faltan más de 7 días', () => {
    expect(computeDisplayStatus({ ...base, due_date: '2026-05-13' }, '2026-05-05')).toBe('futuro');
    expect(computeDisplayStatus({ ...base, due_date: '2026-06-04' }, '2026-05-05')).toBe('futuro');
  });
});
```

- [ ] **Step 2: Correr → falla**

```bash
npx vitest run tests/lib/payments.test.ts
```

Expected: FAIL — "computeDisplayStatus is not a function".

- [ ] **Step 3: Implementar**

Agregar a `lib/payments.ts`:

```ts
import type { Payment, DisplayStatus } from '@/lib/types';

export function computeDisplayStatus(payment: Payment, today: string): DisplayStatus {
  if (payment.status === 'pagado') return 'pagado';
  const days = daysRemaining(payment.due_date, today);
  if (days < 0) return 'vencido';
  if (days === 0) return 'vence_hoy';
  if (days <= 3) return 'urgente';
  if (days <= 7) return 'proximo';
  return 'futuro';
}
```

- [ ] **Step 4: Correr → pasa**

```bash
npx vitest run tests/lib/payments.test.ts
```

Expected: PASS, 10 tests totales.

- [ ] **Step 5: Commit**

```bash
git add lib/payments.ts tests/lib/payments.test.ts
git commit -m "feat(payments): computeDisplayStatus con tests"
```

---

### Task 4.4: `nextDueDate` para recurrentes (TDD)

**Files:**
- Modify: `tests/lib/payments.test.ts`, `lib/payments.ts`

- [ ] **Step 1: Agregar tests**

```ts
import { nextDueDate } from '@/lib/payments';

describe('nextDueDate', () => {
  it('avanza 1 mes para mensual', () => {
    expect(nextDueDate('2026-05-05', 1)).toBe('2026-06-05');
  });

  it('avanza 12 meses para anual', () => {
    expect(nextDueDate('2026-05-05', 12)).toBe('2027-05-05');
  });

  it('maneja fin de mes (30 enero → 28/29 febrero)', () => {
    expect(nextDueDate('2026-01-30', 1)).toBe('2026-02-28');
    expect(nextDueDate('2024-01-30', 1)).toBe('2024-02-29');
  });

  it('maneja 31 → mes con 30 días', () => {
    expect(nextDueDate('2026-03-31', 1)).toBe('2026-04-30');
  });
});
```

- [ ] **Step 2: Correr → falla**

- [ ] **Step 3: Implementar**

Agregar en `lib/payments.ts`:

```ts
import { addMonths, format } from 'date-fns';

export function nextDueDate(currentDueDate: string, recurrenceMonths: number): string {
  const next = addMonths(parseISO(currentDueDate), recurrenceMonths);
  return format(next, 'yyyy-MM-dd');
}
```

- [ ] **Step 4: Correr → pasa**

- [ ] **Step 5: Commit**

```bash
git add lib/payments.ts tests/lib/payments.test.ts
git commit -m "feat(payments): nextDueDate para recurrentes"
```

---

### Task 4.5: `lib/currency.ts` — `combineTotals` (TDD)

**Files:**
- Test: `tests/lib/currency.test.ts`
- Create: `lib/currency.ts`

- [ ] **Step 1: Tests**

`tests/lib/currency.test.ts`:

```ts
import { describe, it, expect } from 'vitest';
import { combineTotals, type Totals } from '@/lib/currency';
import type { Payment } from '@/lib/types';

const p = (currency: 'USD' | 'UYU', amount: number, status: 'pendiente' | 'pagado' = 'pendiente'): Payment => ({
  id: Math.random().toString(),
  name: 'x',
  amount,
  currency,
  due_date: '2026-05-05',
  category_id: null,
  payment_method: null,
  is_recurring: true,
  recurrence_months: 1,
  status,
  notify_enabled: true,
  notes: null,
  created_by: null,
  created_at: '',
  updated_at: '',
});

describe('combineTotals', () => {
  it('suma USD y UYU separadas', () => {
    const result = combineTotals([p('USD', 10), p('USD', 20), p('UYU', 200)], 40);
    expect(result.usd).toBe(30);
    expect(result.uyu).toBe(200);
  });

  it('combina en USD usando la cotización', () => {
    const result = combineTotals([p('USD', 10), p('UYU', 200)], 40);
    // 10 USD + (200 / 40) USD = 15 USD
    expect(result.combinedUsd).toBe(15);
  });

  it('ignora pagos pagados', () => {
    const result = combineTotals([p('USD', 10), p('USD', 20, 'pagado')], 40);
    expect(result.usd).toBe(10);
  });

  it('combinedUsd es null si no hay cotización', () => {
    const result = combineTotals([p('USD', 10), p('UYU', 200)], null);
    expect(result.combinedUsd).toBeNull();
  });

  it('lista vacía devuelve ceros', () => {
    const result = combineTotals([], 40);
    expect(result).toEqual({ usd: 0, uyu: 0, combinedUsd: 0 });
  });
});
```

- [ ] **Step 2: Correr → falla**

- [ ] **Step 3: Implementar**

`lib/currency.ts`:

```ts
import type { Payment } from '@/lib/types';

export interface Totals {
  usd: number;
  uyu: number;
  combinedUsd: number | null;
}

export function combineTotals(payments: Payment[], uyuPerUsd: number | null): Totals {
  const pending = payments.filter(p => p.status === 'pendiente');

  const usd = round2(pending.filter(p => p.currency === 'USD').reduce((s, p) => s + p.amount, 0));
  const uyu = round2(pending.filter(p => p.currency === 'UYU').reduce((s, p) => s + p.amount, 0));

  let combinedUsd: number | null;
  if (uyuPerUsd === null) {
    combinedUsd = null;
  } else if (uyuPerUsd === 0) {
    combinedUsd = null;
  } else {
    combinedUsd = round2(usd + uyu / uyuPerUsd);
  }

  return { usd, uyu, combinedUsd };
}

function round2(n: number): number {
  return Math.round(n * 100) / 100;
}
```

- [ ] **Step 4: Correr → pasa**

- [ ] **Step 5: Commit**

```bash
git add lib/currency.ts tests/lib/currency.test.ts
git commit -m "feat(currency): combineTotals con tests"
```

---

### Task 4.6: Helper `formatAmount` para UI (TDD)

**Files:**
- Modify: `tests/lib/currency.test.ts`, `lib/currency.ts`

- [ ] **Step 1: Tests**

```ts
import { formatAmount } from '@/lib/currency';

describe('formatAmount', () => {
  it('formato USD con 2 decimales', () => {
    expect(formatAmount(20, 'USD')).toBe('$20,00 USD');
    expect(formatAmount(6.5, 'USD')).toBe('$6,50 USD');
  });

  it('formato UYU sin decimales si es entero', () => {
    expect(formatAmount(200, 'UYU')).toBe('$200 UYU');
    expect(formatAmount(12.99, 'UYU')).toBe('$12,99 UYU');
  });
});
```

- [ ] **Step 2: Implementar**

Agregar a `lib/currency.ts`:

```ts
import type { Currency } from '@/lib/types';

export function formatAmount(amount: number, currency: Currency): string {
  const isInt = Number.isInteger(amount);
  if (currency === 'UYU' && isInt) {
    return `$${amount.toLocaleString('es-UY')} UYU`;
  }
  const formatted = amount.toLocaleString('es-UY', {
    minimumFractionDigits: 2,
    maximumFractionDigits: 2,
  });
  return `$${formatted} ${currency}`;
}
```

- [ ] **Step 3: Correr → pasa**

- [ ] **Step 4: Commit**

```bash
git add lib/currency.ts tests/lib/currency.test.ts
git commit -m "feat(currency): formatAmount para UI"
```

---

### Task 4.7: Validador de allowlist (TDD)

**Files:**
- Test: `tests/lib/auth.test.ts`
- Create: `lib/auth.ts`

- [ ] **Step 1: Tests**

`tests/lib/auth.test.ts`:

```ts
import { describe, it, expect } from 'vitest';
import { isAllowedEmail } from '@/lib/auth';

describe('isAllowedEmail', () => {
  it('true si está en la lista', () => {
    expect(isAllowedEmail('user@a.com', 'user@a.com,other@b.com')).toBe(true);
    expect(isAllowedEmail('other@b.com', 'user@a.com,other@b.com')).toBe(true);
  });

  it('false si no está', () => {
    expect(isAllowedEmail('intruso@x.com', 'user@a.com,other@b.com')).toBe(false);
  });

  it('case-insensitive', () => {
    expect(isAllowedEmail('USER@a.com', 'user@a.com')).toBe(true);
  });

  it('ignora espacios alrededor', () => {
    expect(isAllowedEmail('user@a.com', ' user@a.com , other@b.com ')).toBe(true);
  });

  it('false si la lista está vacía', () => {
    expect(isAllowedEmail('user@a.com', '')).toBe(false);
    expect(isAllowedEmail('user@a.com', undefined)).toBe(false);
  });
});
```

- [ ] **Step 2: Implementar**

`lib/auth.ts`:

```ts
export function isAllowedEmail(email: string, allowlistCsv: string | undefined): boolean {
  if (!allowlistCsv) return false;
  const normalized = email.trim().toLowerCase();
  const allowed = allowlistCsv
    .split(',')
    .map(e => e.trim().toLowerCase())
    .filter(Boolean);
  return allowed.includes(normalized);
}
```

- [ ] **Step 3: Correr → pasa**

- [ ] **Step 4: Commit**

```bash
git add lib/auth.ts tests/lib/auth.test.ts
git commit -m "feat(auth): isAllowedEmail con tests"
```

---

## Fase 5 — Auth UI y flujo de login

### Task 5.1: Página de login

**Files:**
- Create: `app/(auth)/login/page.tsx`, `app/(auth)/layout.tsx`
- Delete: `app/page.tsx` (la default de create-next-app)

- [ ] **Step 1: Borrar la home default**

```bash
rm app/page.tsx
```

(La vamos a recrear más adelante como dashboard.)

- [ ] **Step 2: Crear `app/(auth)/layout.tsx`**

```tsx
export default function AuthLayout({ children }: { children: React.ReactNode }) {
  return (
    <main className="flex min-h-screen items-center justify-center bg-slate-50 dark:bg-slate-900 p-4">
      {children}
    </main>
  );
}
```

- [ ] **Step 3: Crear `app/(auth)/login/page.tsx`**

```tsx
'use client';

import { useState } from 'react';
import { Button } from '@/components/ui/button';
import { Input } from '@/components/ui/input';
import { Label } from '@/components/ui/label';
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from '@/components/ui/card';
import { Wallet } from 'lucide-react';

export default function LoginPage() {
  const [email, setEmail] = useState('');
  const [loading, setLoading] = useState(false);
  const [message, setMessage] = useState<{ type: 'ok' | 'err'; text: string } | null>(null);

  async function onSubmit(e: React.FormEvent) {
    e.preventDefault();
    setLoading(true);
    setMessage(null);

    const res = await fetch('/api/auth/magic-link', {
      method: 'POST',
      headers: { 'Content-Type': 'application/json' },
      body: JSON.stringify({ email }),
    });

    if (res.ok) {
      setMessage({ type: 'ok', text: 'Listo. Revisá tu mail y hacé click en el link para entrar.' });
    } else {
      const data = await res.json().catch(() => ({}));
      setMessage({ type: 'err', text: data.error || 'No se pudo mandar el link. Intentá de nuevo.' });
    }
    setLoading(false);
  }

  return (
    <Card className="w-full max-w-sm">
      <CardHeader className="space-y-2 text-center">
        <div className="mx-auto flex h-12 w-12 items-center justify-center rounded-xl bg-blue-600 text-white">
          <Wallet className="h-6 w-6" />
        </div>
        <CardTitle className="text-2xl">Plan de Pagos Familiar</CardTitle>
        <CardDescription>Ingresá con tu email. Te mandamos un link para entrar sin contraseña.</CardDescription>
      </CardHeader>
      <CardContent>
        <form onSubmit={onSubmit} className="space-y-4">
          <div className="space-y-2">
            <Label htmlFor="email">Email</Label>
            <Input
              id="email"
              type="email"
              required
              autoComplete="email"
              placeholder="tu@email.com"
              value={email}
              onChange={e => setEmail(e.target.value)}
              disabled={loading}
            />
          </div>
          <Button type="submit" className="w-full" disabled={loading}>
            {loading ? 'Mandando...' : 'Mandame el link'}
          </Button>
          {message && (
            <p className={`text-sm ${message.type === 'ok' ? 'text-emerald-600' : 'text-red-600'}`}>
              {message.text}
            </p>
          )}
        </form>
      </CardContent>
    </Card>
  );
}
```

- [ ] **Step 4: Typecheck**

```bash
npm run typecheck
```

Expected: sin errores. (El fetch a `/api/auth/magic-link` es solo un string para TypeScript; lo creamos en la siguiente task.)

- [ ] **Step 5: Commit**

```bash
git add -A
git commit -m "feat(auth): página de login con magic link"
```

---

### Task 5.2: API `/api/auth/magic-link`

**Files:**
- Create: `app/api/auth/magic-link/route.ts`

- [ ] **Step 1: Crear el endpoint**

`app/api/auth/magic-link/route.ts`:

```ts
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
    // Mensaje genérico — no revelamos si existe o no
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
```

- [ ] **Step 2: Typecheck**

```bash
npm run typecheck
```

Expected: sin errores.

- [ ] **Step 3: Commit**

```bash
git add app/api/auth/magic-link/route.ts
git commit -m "feat(auth): endpoint de magic link con allowlist"
```

---

### Task 5.3: Callback de auth (intercambio de token)

**Files:**
- Create: `app/auth/callback/route.ts`

- [ ] **Step 1: Crear el callback**

`app/auth/callback/route.ts`:

```ts
import { NextResponse } from 'next/server';
import { createClient } from '@/lib/supabase/server';

export async function GET(request: Request) {
  const { searchParams, origin } = new URL(request.url);
  const code = searchParams.get('code');
  const next = searchParams.get('next') ?? '/';

  if (code) {
    const supabase = createClient();
    const { error } = await supabase.auth.exchangeCodeForSession(code);
    if (!error) {
      return NextResponse.redirect(`${origin}${next}`);
    }
  }

  return NextResponse.redirect(`${origin}/login?error=auth_failed`);
}
```

- [ ] **Step 2: Typecheck**

```bash
npm run typecheck
```

- [ ] **Step 3: Commit**

```bash
git add app/auth/callback/route.ts
git commit -m "feat(auth): callback que intercambia code por sesión"
```

---

### Task 5.4: API de logout

**Files:**
- Create: `app/api/auth/logout/route.ts`

- [ ] **Step 1: Crear**

```ts
import { NextResponse } from 'next/server';
import { createClient } from '@/lib/supabase/server';

export async function POST() {
  const supabase = createClient();
  await supabase.auth.signOut();
  return NextResponse.json({ ok: true });
}
```

- [ ] **Step 2: Commit**

```bash
git add app/api/auth/logout/route.ts
git commit -m "feat(auth): endpoint de logout"
```

---

### Task 5.5: Probar el flujo de login end-to-end (manual)

- [ ] **Step 1: Levantar el dev server**

```bash
npm run dev
```

- [ ] **Step 2: Test 1 — email no permitido**

Abrir http://localhost:3000 → debería redirigir a `/login`.
Ingresar `test@noautorizado.com` → debería mostrar error "No tenés acceso a esta aplicación".

- [ ] **Step 3: Test 2 — email permitido**

Ingresar `sardigonzalo01@gmail.com` → mensaje "Listo. Revisá tu mail...".

Abrir Gmail → debe llegar email de Supabase con un link.
Click en el link → redirige a `/auth/callback?code=...` → redirige a `/` → muestra... 404 (porque todavía no creamos el dashboard, esperado).

Verificar que la cookie de sesión está seteada:
- DevTools → Application → Cookies → http://localhost:3000 → debe haber cookies `sb-*`.

- [ ] **Step 4: Test 3 — sesión persistente**

Cerrar la pestaña, abrir http://localhost:3000 → debería NO redirigir a `/login` (ya logueado).

- [ ] **Step 5: Si todo OK, parar el dev server (Ctrl+C) y avanzar.**

(No hay commit en esta task — es solo verificación.)

---

## Fase 6 — Layout autenticado y theme

### Task 6.1: ThemeProvider (modo claro/oscuro automático)

**Files:**
- Create: `components/theme-provider.tsx`

- [ ] **Step 1: Crear**

`components/theme-provider.tsx`:

```tsx
'use client';

import * as React from 'react';
import { ThemeProvider as NextThemesProvider } from 'next-themes';
import type { ThemeProviderProps } from 'next-themes';

export function ThemeProvider({ children, ...props }: ThemeProviderProps) {
  return <NextThemesProvider {...props}>{children}</NextThemesProvider>;
}
```

- [ ] **Step 2: Modificar `app/layout.tsx` para usarlo**

Reemplazar el `body` de `app/layout.tsx`:

```tsx
<body className={`${inter.variable} ${jetbrainsMono.variable} font-sans antialiased`}>
  <ThemeProvider attribute="class" defaultTheme="system" enableSystem disableTransitionOnChange>
    {children}
  </ThemeProvider>
</body>
```

Importar al tope:

```tsx
import { ThemeProvider } from '@/components/theme-provider';
```

- [ ] **Step 3: Commit**

```bash
git add -A
git commit -m "feat(ui): ThemeProvider con detección automática del sistema"
```

---

### Task 6.2: Layout autenticado con header

**Files:**
- Create: `app/(app)/layout.tsx`, `components/app-header.tsx`

- [ ] **Step 1: Crear `components/app-header.tsx`**

```tsx
'use client';

import Link from 'next/link';
import { useRouter } from 'next/navigation';
import { Button } from '@/components/ui/button';
import { DropdownMenu, DropdownMenuContent, DropdownMenuItem, DropdownMenuLabel, DropdownMenuSeparator, DropdownMenuTrigger } from '@/components/ui/dropdown-menu';
import { Wallet, Settings, History, LogOut, User } from 'lucide-react';

interface Props {
  userEmail: string;
}

export function AppHeader({ userEmail }: Props) {
  const router = useRouter();

  async function logout() {
    await fetch('/api/auth/logout', { method: 'POST' });
    router.push('/login');
    router.refresh();
  }

  return (
    <header className="sticky top-0 z-30 border-b bg-white/80 backdrop-blur dark:bg-slate-900/80 dark:border-slate-800">
      <div className="mx-auto flex max-w-6xl items-center justify-between px-4 py-3">
        <Link href="/" className="flex items-center gap-2 font-semibold">
          <span className="flex h-8 w-8 items-center justify-center rounded-lg bg-blue-600 text-white">
            <Wallet className="h-4 w-4" />
          </span>
          <span>Plan de Pagos</span>
        </Link>

        <DropdownMenu>
          <DropdownMenuTrigger asChild>
            <Button variant="ghost" size="sm" className="gap-2">
              <User className="h-4 w-4" />
              <span className="hidden sm:inline">{userEmail}</span>
            </Button>
          </DropdownMenuTrigger>
          <DropdownMenuContent align="end">
            <DropdownMenuLabel>{userEmail}</DropdownMenuLabel>
            <DropdownMenuSeparator />
            <DropdownMenuItem asChild>
              <Link href="/history" className="flex items-center gap-2">
                <History className="h-4 w-4" /> Historial
              </Link>
            </DropdownMenuItem>
            <DropdownMenuItem asChild>
              <Link href="/settings" className="flex items-center gap-2">
                <Settings className="h-4 w-4" /> Configuración
              </Link>
            </DropdownMenuItem>
            <DropdownMenuSeparator />
            <DropdownMenuItem onClick={logout} className="flex items-center gap-2 text-red-600">
              <LogOut className="h-4 w-4" /> Cerrar sesión
            </DropdownMenuItem>
          </DropdownMenuContent>
        </DropdownMenu>
      </div>
    </header>
  );
}
```

- [ ] **Step 2: Crear `app/(app)/layout.tsx`**

```tsx
import { redirect } from 'next/navigation';
import { createClient } from '@/lib/supabase/server';
import { AppHeader } from '@/components/app-header';
import { Toaster } from '@/components/ui/sonner';

export default async function AppLayout({ children }: { children: React.ReactNode }) {
  const supabase = createClient();
  const { data: { user } } = await supabase.auth.getUser();

  if (!user) redirect('/login');

  return (
    <div className="min-h-screen bg-slate-50 dark:bg-slate-950">
      <AppHeader userEmail={user.email ?? ''} />
      <main className="mx-auto max-w-6xl px-4 py-6">{children}</main>
      <Toaster />
    </div>
  );
}
```

- [ ] **Step 3: Crear placeholder de dashboard `app/(app)/page.tsx`**

```tsx
export default function DashboardPage() {
  return (
    <div>
      <h1 className="text-2xl font-semibold">Dashboard</h1>
      <p className="mt-2 text-slate-600 dark:text-slate-400">El dashboard se construye en las próximas tasks.</p>
    </div>
  );
}
```

- [ ] **Step 4: Verificar que renderiza**

```bash
npm run dev
```

Abrir http://localhost:3000 → debería mostrar el header con tu email y el placeholder del dashboard. El dropdown del usuario debe funcionar y "Cerrar sesión" debe llevarte de vuelta al login.

- [ ] **Step 5: Commit**

```bash
git add -A
git commit -m "feat(ui): layout autenticado con header y theme provider"
```

---

## Fase 7 — API de categorías

### Task 7.1: GET /api/categories

**Files:**
- Create: `app/api/categories/route.ts`

- [ ] **Step 1: Crear endpoint**

```ts
import { NextResponse } from 'next/server';
import { z } from 'zod';
import { createClient } from '@/lib/supabase/server';

export async function GET() {
  const supabase = createClient();
  const { data, error } = await supabase
    .from('categories')
    .select('*')
    .order('position', { ascending: true });

  if (error) return NextResponse.json({ error: error.message }, { status: 500 });
  return NextResponse.json(data);
}

const createSchema = z.object({
  name: z.string().min(1).max(60),
  icon: z.string().nullable().optional(),
  color: z.string().nullable().optional(),
  position: z.number().int().nonnegative().optional(),
});

export async function POST(req: Request) {
  const body = await req.json().catch(() => null);
  const parsed = createSchema.safeParse(body);
  if (!parsed.success) return NextResponse.json({ error: 'Datos inválidos' }, { status: 400 });

  const supabase = createClient();
  const { data, error } = await supabase.from('categories').insert(parsed.data).select().single();
  if (error) return NextResponse.json({ error: error.message }, { status: 500 });
  return NextResponse.json(data, { status: 201 });
}
```

- [ ] **Step 2: Smoke test**

Con dev server corriendo, en otra terminal:

```bash
curl -i http://localhost:3000/api/categories -H "Cookie: $(cat /tmp/cookie.txt 2>/dev/null)"
```

(El curl simple va a fallar por auth — más simple es probar abriendo la URL en el navegador estando logueado.)

Abrir http://localhost:3000/api/categories → debe devolver JSON con las 5 categorías del seed.

- [ ] **Step 3: Commit**

```bash
git add app/api/categories/route.ts
git commit -m "feat(api): GET y POST /api/categories"
```

---

### Task 7.2: PATCH y DELETE /api/categories/[id]

**Files:**
- Create: `app/api/categories/[id]/route.ts`

- [ ] **Step 1: Crear**

```ts
import { NextResponse } from 'next/server';
import { z } from 'zod';
import { createClient } from '@/lib/supabase/server';

const updateSchema = z.object({
  name: z.string().min(1).max(60).optional(),
  icon: z.string().nullable().optional(),
  color: z.string().nullable().optional(),
  position: z.number().int().nonnegative().optional(),
});

export async function PATCH(req: Request, { params }: { params: { id: string } }) {
  const body = await req.json().catch(() => null);
  const parsed = updateSchema.safeParse(body);
  if (!parsed.success) return NextResponse.json({ error: 'Datos inválidos' }, { status: 400 });

  const supabase = createClient();
  const { data, error } = await supabase
    .from('categories')
    .update(parsed.data)
    .eq('id', params.id)
    .select()
    .single();
  if (error) return NextResponse.json({ error: error.message }, { status: 500 });
  return NextResponse.json(data);
}

export async function DELETE(_req: Request, { params }: { params: { id: string } }) {
  const supabase = createClient();
  const { error } = await supabase.from('categories').delete().eq('id', params.id);
  if (error) return NextResponse.json({ error: error.message }, { status: 500 });
  return NextResponse.json({ ok: true });
}
```

- [ ] **Step 2: Commit**

```bash
git add app/api/categories/[id]/route.ts
git commit -m "feat(api): PATCH y DELETE de categoría"
```

---

## Fase 8 — API de pagos

### Task 8.1: GET y POST /api/payments

**Files:**
- Create: `app/api/payments/route.ts`

- [ ] **Step 1: Crear**

```ts
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
```

- [ ] **Step 2: Smoke test**

Abrir http://localhost:3000/api/payments → debe devolver `[]` (todavía no hay pagos).

- [ ] **Step 3: Commit**

```bash
git add app/api/payments/route.ts
git commit -m "feat(api): GET y POST /api/payments"
```

---

### Task 8.2: PATCH y DELETE /api/payments/[id]

**Files:**
- Create: `app/api/payments/[id]/route.ts`

- [ ] **Step 1: Crear**

```ts
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
```

- [ ] **Step 2: Commit**

```bash
git add app/api/payments/[id]/route.ts
git commit -m "feat(api): PATCH y DELETE de pago"
```

---

### Task 8.3: POST /api/payments/[id]/pay (marcar pagado)

**Files:**
- Create: `app/api/payments/[id]/pay/route.ts`

- [ ] **Step 1: Crear**

```ts
import { NextResponse } from 'next/server';
import { createClient } from '@/lib/supabase/server';
import { nextDueDate } from '@/lib/payments';
import type { Payment } from '@/lib/types';

export async function POST(_req: Request, { params }: { params: { id: string } }) {
  const supabase = createClient();
  const { data: { user } } = await supabase.auth.getUser();
  if (!user) return NextResponse.json({ error: 'No autorizado' }, { status: 401 });

  // Leer el pago actual
  const { data: payment, error: readErr } = await supabase
    .from('payments')
    .select('*')
    .eq('id', params.id)
    .single<Payment>();
  if (readErr || !payment) return NextResponse.json({ error: 'Pago no encontrado' }, { status: 404 });

  // Insertar en historial (snapshot del momento)
  const { error: histErr } = await supabase.from('payment_history').insert({
    payment_id: payment.id,
    paid_amount: payment.amount,
    paid_currency: payment.currency,
    due_date_at_payment: payment.due_date,
    paid_by: user.id,
  });
  if (histErr) return NextResponse.json({ error: histErr.message }, { status: 500 });

  // Actualizar estado del pago
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
```

- [ ] **Step 2: Commit**

```bash
git add app/api/payments/[id]/pay/route.ts
git commit -m "feat(api): marcar pago como pagado (con historial)"
```

---

### Task 8.4: POST /api/payments/[id]/undo-pay (deshacer último pago)

**Files:**
- Create: `app/api/payments/[id]/undo-pay/route.ts`

- [ ] **Step 1: Crear**

```ts
import { NextResponse } from 'next/server';
import { createClient } from '@/lib/supabase/server';
import type { Payment, PaymentHistoryEntry } from '@/lib/types';

export async function POST(_req: Request, { params }: { params: { id: string } }) {
  const supabase = createClient();

  // Buscar la entrada más reciente en el historial
  const { data: lastEntry, error: histErr } = await supabase
    .from('payment_history')
    .select('*')
    .eq('payment_id', params.id)
    .order('paid_at', { ascending: false })
    .limit(1)
    .single<PaymentHistoryEntry>();
  if (histErr || !lastEntry) return NextResponse.json({ error: 'No hay nada para deshacer' }, { status: 404 });

  // Solo permitir deshacer si el pago se hizo hace menos de 24 horas
  const paidAt = new Date(lastEntry.paid_at).getTime();
  if (Date.now() - paidAt > 24 * 60 * 60 * 1000) {
    return NextResponse.json({ error: 'Solo podés deshacer pagos de las últimas 24 horas' }, { status: 400 });
  }

  // Restaurar el pago
  const { data: updated, error: updErr } = await supabase
    .from('payments')
    .update({
      due_date: lastEntry.due_date_at_payment,
      status: 'pendiente',
    })
    .eq('id', params.id)
    .select('*, category:categories(*)')
    .single<Payment>();
  if (updErr) return NextResponse.json({ error: updErr.message }, { status: 500 });

  // Borrar la entrada del historial
  const { error: delErr } = await supabase.from('payment_history').delete().eq('id', lastEntry.id);
  if (delErr) return NextResponse.json({ error: delErr.message }, { status: 500 });

  return NextResponse.json(updated);
}
```

- [ ] **Step 2: Commit**

```bash
git add app/api/payments/[id]/undo-pay/route.ts
git commit -m "feat(api): deshacer último pago (window de 24h)"
```

---

## Fase 9 — Cotización del dólar

### Task 9.1: API endpoint de cotización con cache

**Files:**
- Create: `app/api/exchange-rate/route.ts`, `lib/exchange-rate.ts`

- [ ] **Step 1: Crear `lib/exchange-rate.ts` (cache en memoria)**

```ts
interface CachedRate {
  uyuPerUsd: number;
  fetchedAt: number;
}

let cache: CachedRate | null = null;
const TTL_MS = 60 * 60 * 1000;  // 1 hora

export async function getUyuPerUsd(): Promise<number | null> {
  if (cache && Date.now() - cache.fetchedAt < TTL_MS) {
    return cache.uyuPerUsd;
  }

  try {
    const res = await fetch('https://uy.dolarapi.com/v1/cotizaciones/usd', {
      next: { revalidate: 3600 },
    });
    if (!res.ok) return cache?.uyuPerUsd ?? null;

    const data = await res.json();
    // dolarapi devuelve { compra, venta, ... }. Usamos el promedio.
    const avg = (Number(data.compra) + Number(data.venta)) / 2;
    if (!Number.isFinite(avg) || avg <= 0) return cache?.uyuPerUsd ?? null;

    cache = { uyuPerUsd: avg, fetchedAt: Date.now() };
    return avg;
  } catch {
    return cache?.uyuPerUsd ?? null;
  }
}
```

- [ ] **Step 2: Crear endpoint `app/api/exchange-rate/route.ts`**

```ts
import { NextResponse } from 'next/server';
import { getUyuPerUsd } from '@/lib/exchange-rate';

export async function GET() {
  const rate = await getUyuPerUsd();
  return NextResponse.json({ uyuPerUsd: rate });
}
```

- [ ] **Step 3: Smoke test**

Con dev server corriendo, abrir http://localhost:3000/api/exchange-rate → debe devolver `{"uyuPerUsd": 40.X}` o similar.

- [ ] **Step 4: Commit**

```bash
git add lib/exchange-rate.ts app/api/exchange-rate/route.ts
git commit -m "feat: cotización USD/UYU desde dolarapi.com con cache"
```

---

## Fase 10 — Dashboard UI

### Task 10.1: Componente `TotalsCards`

**Files:**
- Create: `components/totals-cards.tsx`

- [ ] **Step 1: Crear**

```tsx
'use client';

import { Card, CardContent } from '@/components/ui/card';
import { Wallet, DollarSign, Coins } from 'lucide-react';
import type { Totals } from '@/lib/currency';

interface Props {
  totals: Totals;
  uyuPerUsd: number | null;
}

function formatUsdNumber(n: number) {
  return n.toLocaleString('es-UY', { minimumFractionDigits: 2, maximumFractionDigits: 2 });
}

function formatUyuNumber(n: number) {
  return n.toLocaleString('es-UY', {
    minimumFractionDigits: Number.isInteger(n) ? 0 : 2,
    maximumFractionDigits: 2,
  });
}

export function TotalsCards({ totals, uyuPerUsd }: Props) {
  return (
    <div className="grid gap-4 sm:grid-cols-3">
      <Card>
        <CardContent className="p-5">
          <div className="flex items-center justify-between">
            <p className="text-sm font-medium text-slate-600 dark:text-slate-400">Total USD</p>
            <DollarSign className="h-5 w-5 text-blue-600" />
          </div>
          <p className="mt-2 font-mono text-3xl font-semibold tabular-nums">
            ${formatUsdNumber(totals.usd)}
          </p>
        </CardContent>
      </Card>

      <Card>
        <CardContent className="p-5">
          <div className="flex items-center justify-between">
            <p className="text-sm font-medium text-slate-600 dark:text-slate-400">Total UYU</p>
            <Coins className="h-5 w-5 text-emerald-600" />
          </div>
          <p className="mt-2 font-mono text-3xl font-semibold tabular-nums">
            ${formatUyuNumber(totals.uyu)}
          </p>
        </CardContent>
      </Card>

      <Card>
        <CardContent className="p-5">
          <div className="flex items-center justify-between">
            <p className="text-sm font-medium text-slate-600 dark:text-slate-400">Total combinado</p>
            <Wallet className="h-5 w-5 text-violet-600" />
          </div>
          {totals.combinedUsd !== null ? (
            <>
              <p className="mt-2 font-mono text-3xl font-semibold tabular-nums">
                ~${formatUsdNumber(totals.combinedUsd)}
              </p>
              {uyuPerUsd && (
                <p className="mt-1 text-xs text-slate-500 dark:text-slate-500">
                  1 USD = ${uyuPerUsd.toFixed(2)} UYU
                </p>
              )}
            </>
          ) : (
            <p className="mt-2 text-sm text-slate-500">Cotización no disponible</p>
          )}
        </CardContent>
      </Card>
    </div>
  );
}
```

- [ ] **Step 2: Commit**

```bash
git add components/totals-cards.tsx
git commit -m "feat(ui): componente TotalsCards"
```

---

### Task 10.2: Helper de estilos de estado

**Files:**
- Create: `lib/styles.ts`

- [ ] **Step 1: Crear**

```ts
import type { DisplayStatus } from '@/lib/types';

export function statusStyle(status: DisplayStatus): {
  badgeClass: string;
  dotClass: string;
  label: (days: number) => string;
} {
  switch (status) {
    case 'pagado':
      return {
        badgeClass: 'bg-emerald-100 text-emerald-700 dark:bg-emerald-900/30 dark:text-emerald-400',
        dotClass: 'bg-emerald-500',
        label: () => 'Pagado',
      };
    case 'vencido':
      return {
        badgeClass: 'bg-red-100 text-red-700 dark:bg-red-900/30 dark:text-red-400',
        dotClass: 'bg-red-500',
        label: (d) => `Vencido hace ${Math.abs(d)} d`,
      };
    case 'vence_hoy':
      return {
        badgeClass: 'bg-red-100 text-red-700 dark:bg-red-900/30 dark:text-red-400 font-semibold',
        dotClass: 'bg-red-500 animate-pulse',
        label: () => 'VENCE HOY',
      };
    case 'urgente':
      return {
        badgeClass: 'bg-orange-100 text-orange-700 dark:bg-orange-900/30 dark:text-orange-400',
        dotClass: 'bg-orange-500',
        label: (d) => `Faltan ${d} d`,
      };
    case 'proximo':
      return {
        badgeClass: 'bg-amber-100 text-amber-700 dark:bg-amber-900/30 dark:text-amber-400',
        dotClass: 'bg-amber-500',
        label: (d) => `Faltan ${d} d`,
      };
    case 'futuro':
      return {
        badgeClass: 'bg-slate-100 text-slate-600 dark:bg-slate-800 dark:text-slate-400',
        dotClass: 'bg-slate-400',
        label: (d) => `Faltan ${d} d`,
      };
  }
}
```

- [ ] **Step 2: Commit**

```bash
git add lib/styles.ts
git commit -m "feat(ui): helper statusStyle por DisplayStatus"
```

---

### Task 10.3: Componente `PaymentRow`

**Files:**
- Create: `components/payment-row.tsx`

- [ ] **Step 1: Crear**

```tsx
'use client';

import { Check, Pencil } from 'lucide-react';
import { Button } from '@/components/ui/button';
import { formatAmount } from '@/lib/currency';
import { computeDisplayStatus, daysRemaining } from '@/lib/payments';
import { statusStyle } from '@/lib/styles';
import type { PaymentWithCategory } from '@/lib/types';

interface Props {
  payment: PaymentWithCategory;
  today: string;
  onEdit: (p: PaymentWithCategory) => void;
  onPay: (p: PaymentWithCategory) => void;
  isPaying: boolean;
}

export function PaymentRow({ payment, today, onEdit, onPay, isPaying }: Props) {
  const status = computeDisplayStatus(payment, today);
  const days = daysRemaining(payment.due_date, today);
  const style = statusStyle(status);

  return (
    <div className="group flex items-center gap-3 border-b border-slate-100 dark:border-slate-800 px-4 py-3 last:border-b-0 hover:bg-slate-50 dark:hover:bg-slate-800/40 transition-colors">
      <span className={`h-2 w-2 rounded-full ${style.dotClass}`} aria-hidden />

      <div className="flex-1 min-w-0">
        <p className="font-medium truncate">{payment.name}</p>
        <p className="text-xs text-slate-500 dark:text-slate-400 truncate">
          {payment.payment_method ?? '—'}
        </p>
      </div>

      <div className="hidden sm:block text-right tabular-nums font-mono text-sm w-32">
        {formatAmount(payment.amount, payment.currency)}
      </div>

      <div className="hidden md:block text-right text-sm w-28 text-slate-600 dark:text-slate-400 tabular-nums">
        {payment.due_date.split('-').reverse().join('/')}
      </div>

      <span className={`text-xs px-2 py-1 rounded-md whitespace-nowrap ${style.badgeClass}`}>
        {style.label(days)}
      </span>

      <Button
        size="sm"
        variant="ghost"
        onClick={() => onEdit(payment)}
        className="opacity-0 group-hover:opacity-100 transition-opacity"
        aria-label="Editar"
      >
        <Pencil className="h-4 w-4" />
      </Button>

      <Button
        size="sm"
        onClick={() => onPay(payment)}
        disabled={isPaying || status === 'pagado'}
        className="gap-1"
      >
        <Check className="h-4 w-4" />
        <span className="hidden sm:inline">Pagar</span>
      </Button>
    </div>
  );
}
```

- [ ] **Step 2: Commit**

```bash
git add components/payment-row.tsx
git commit -m "feat(ui): componente PaymentRow con badge de estado"
```

---

### Task 10.4: Componente `PaymentForm` (Sheet de crear/editar)

**Files:**
- Create: `components/payment-form.tsx`

- [ ] **Step 1: Crear**

```tsx
'use client';

import { useEffect, useState } from 'react';
import { Sheet, SheetContent, SheetDescription, SheetFooter, SheetHeader, SheetTitle } from '@/components/ui/sheet';
import { Button } from '@/components/ui/button';
import { Input } from '@/components/ui/input';
import { Label } from '@/components/ui/label';
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from '@/components/ui/select';
import { Switch } from '@/components/ui/switch';
import { Trash2 } from 'lucide-react';
import type { Category, PaymentWithCategory, Currency } from '@/lib/types';

interface Props {
  open: boolean;
  onOpenChange: (open: boolean) => void;
  payment: PaymentWithCategory | null;
  categories: Category[];
  onSaved: (p: PaymentWithCategory) => void;
  onDeleted: (id: string) => void;
}

interface FormData {
  name: string;
  amount: string;
  currency: Currency;
  due_date: string;
  category_id: string;
  payment_method: string;
  is_recurring: boolean;
  recurrence_months: string;
  notify_enabled: boolean;
  notes: string;
}

const empty = (): FormData => ({
  name: '',
  amount: '',
  currency: 'USD',
  due_date: new Date().toISOString().slice(0, 10),
  category_id: '',
  payment_method: '',
  is_recurring: true,
  recurrence_months: '1',
  notify_enabled: true,
  notes: '',
});

function fromPayment(p: PaymentWithCategory): FormData {
  return {
    name: p.name,
    amount: String(p.amount),
    currency: p.currency,
    due_date: p.due_date,
    category_id: p.category_id ?? '',
    payment_method: p.payment_method ?? '',
    is_recurring: p.is_recurring,
    recurrence_months: String(p.recurrence_months),
    notify_enabled: p.notify_enabled,
    notes: p.notes ?? '',
  };
}

export function PaymentForm({ open, onOpenChange, payment, categories, onSaved, onDeleted }: Props) {
  const [form, setForm] = useState<FormData>(empty());
  const [saving, setSaving] = useState(false);
  const [error, setError] = useState<string | null>(null);

  useEffect(() => {
    setForm(payment ? fromPayment(payment) : empty());
    setError(null);
  }, [payment, open]);

  async function save() {
    setSaving(true);
    setError(null);
    const payload = {
      name: form.name.trim(),
      amount: parseFloat(form.amount),
      currency: form.currency,
      due_date: form.due_date,
      category_id: form.category_id || null,
      payment_method: form.payment_method.trim() || null,
      is_recurring: form.is_recurring,
      recurrence_months: parseInt(form.recurrence_months, 10),
      notify_enabled: form.notify_enabled,
      notes: form.notes.trim() || null,
    };

    const url = payment ? `/api/payments/${payment.id}` : '/api/payments';
    const method = payment ? 'PATCH' : 'POST';
    const res = await fetch(url, {
      method,
      headers: { 'Content-Type': 'application/json' },
      body: JSON.stringify(payload),
    });

    if (!res.ok) {
      const data = await res.json().catch(() => ({}));
      setError(data.error || 'Error al guardar');
      setSaving(false);
      return;
    }

    const saved = await res.json();
    onSaved(saved);
    onOpenChange(false);
    setSaving(false);
  }

  async function remove() {
    if (!payment) return;
    if (!confirm(`¿Borrar "${payment.name}"? Esta acción no se puede deshacer.`)) return;
    setSaving(true);
    const res = await fetch(`/api/payments/${payment.id}`, { method: 'DELETE' });
    if (res.ok) {
      onDeleted(payment.id);
      onOpenChange(false);
    } else {
      setError('Error al borrar');
    }
    setSaving(false);
  }

  return (
    <Sheet open={open} onOpenChange={onOpenChange}>
      <SheetContent className="overflow-y-auto sm:max-w-md">
        <SheetHeader>
          <SheetTitle>{payment ? 'Editar pago' : 'Agregar pago'}</SheetTitle>
          <SheetDescription>
            {payment ? 'Modificá los detalles del pago.' : 'Completá los datos del nuevo pago.'}
          </SheetDescription>
        </SheetHeader>

        <div className="space-y-4 py-4">
          <div className="space-y-2">
            <Label htmlFor="name">Nombre</Label>
            <Input id="name" value={form.name} onChange={e => setForm({ ...form, name: e.target.value })} />
          </div>

          <div className="grid grid-cols-2 gap-3">
            <div className="space-y-2">
              <Label htmlFor="amount">Monto</Label>
              <Input id="amount" type="number" step="0.01" value={form.amount} onChange={e => setForm({ ...form, amount: e.target.value })} />
            </div>
            <div className="space-y-2">
              <Label htmlFor="currency">Moneda</Label>
              <Select value={form.currency} onValueChange={(v: Currency) => setForm({ ...form, currency: v })}>
                <SelectTrigger id="currency"><SelectValue /></SelectTrigger>
                <SelectContent>
                  <SelectItem value="USD">USD</SelectItem>
                  <SelectItem value="UYU">UYU</SelectItem>
                </SelectContent>
              </Select>
            </div>
          </div>

          <div className="space-y-2">
            <Label htmlFor="due_date">Vencimiento</Label>
            <Input id="due_date" type="date" value={form.due_date} onChange={e => setForm({ ...form, due_date: e.target.value })} />
          </div>

          <div className="space-y-2">
            <Label htmlFor="category">Categoría</Label>
            <Select value={form.category_id || 'none'} onValueChange={v => setForm({ ...form, category_id: v === 'none' ? '' : v })}>
              <SelectTrigger id="category"><SelectValue placeholder="Sin categoría" /></SelectTrigger>
              <SelectContent>
                <SelectItem value="none">Sin categoría</SelectItem>
                {categories.map(c => (
                  <SelectItem key={c.id} value={c.id}>{c.icon} {c.name}</SelectItem>
                ))}
              </SelectContent>
            </Select>
          </div>

          <div className="space-y-2">
            <Label htmlFor="method">Método de pago</Label>
            <Input id="method" placeholder="ej: PREX GON" value={form.payment_method} onChange={e => setForm({ ...form, payment_method: e.target.value })} />
          </div>

          <div className="flex items-center justify-between rounded-lg border p-3">
            <div>
              <Label htmlFor="recurring" className="font-medium">Recurrente</Label>
              <p className="text-xs text-slate-500">Se renueva solo al marcar pagado</p>
            </div>
            <Switch id="recurring" checked={form.is_recurring} onCheckedChange={v => setForm({ ...form, is_recurring: v })} />
          </div>

          {form.is_recurring && (
            <div className="space-y-2">
              <Label htmlFor="recurrence">Cada cuántos meses</Label>
              <Input id="recurrence" type="number" min="1" value={form.recurrence_months} onChange={e => setForm({ ...form, recurrence_months: e.target.value })} />
            </div>
          )}

          <div className="flex items-center justify-between rounded-lg border p-3">
            <div>
              <Label htmlFor="notify" className="font-medium">Recibir avisos</Label>
              <p className="text-xs text-slate-500">7, 3 y 1 días antes</p>
            </div>
            <Switch id="notify" checked={form.notify_enabled} onCheckedChange={v => setForm({ ...form, notify_enabled: v })} />
          </div>

          <div className="space-y-2">
            <Label htmlFor="notes">Notas (opcional)</Label>
            <Input id="notes" value={form.notes} onChange={e => setForm({ ...form, notes: e.target.value })} />
          </div>

          {error && <p className="text-sm text-red-600">{error}</p>}
        </div>

        <SheetFooter className="gap-2 sm:gap-2 sm:flex-col-reverse">
          <Button onClick={save} disabled={saving} className="w-full">
            {saving ? 'Guardando...' : 'Guardar'}
          </Button>
          {payment && (
            <Button variant="outline" onClick={remove} disabled={saving} className="w-full text-red-600 hover:text-red-700">
              <Trash2 className="h-4 w-4 mr-2" /> Borrar pago
            </Button>
          )}
        </SheetFooter>
      </SheetContent>
    </Sheet>
  );
}
```

- [ ] **Step 2: Commit**

```bash
git add components/payment-form.tsx
git commit -m "feat(ui): componente PaymentForm (sheet de crear/editar)"
```

---

### Task 10.5: Página de dashboard

**Files:**
- Replace: `app/(app)/page.tsx`

- [ ] **Step 1: Reemplazar el placeholder**

`app/(app)/page.tsx`:

```tsx
'use client';

import { useEffect, useMemo, useState } from 'react';
import { Plus, AlertCircle } from 'lucide-react';
import { Button } from '@/components/ui/button';
import { TotalsCards } from '@/components/totals-cards';
import { PaymentRow } from '@/components/payment-row';
import { PaymentForm } from '@/components/payment-form';
import { combineTotals } from '@/lib/currency';
import { computeDisplayStatus } from '@/lib/payments';
import { toast } from 'sonner';
import type { Category, PaymentWithCategory } from '@/lib/types';

export default function DashboardPage() {
  const [payments, setPayments] = useState<PaymentWithCategory[]>([]);
  const [categories, setCategories] = useState<Category[]>([]);
  const [uyuPerUsd, setUyuPerUsd] = useState<number | null>(null);
  const [loading, setLoading] = useState(true);
  const [editing, setEditing] = useState<PaymentWithCategory | null>(null);
  const [formOpen, setFormOpen] = useState(false);
  const [payingId, setPayingId] = useState<string | null>(null);

  const today = new Date().toISOString().slice(0, 10);

  useEffect(() => {
    Promise.all([
      fetch('/api/payments').then(r => r.json()),
      fetch('/api/categories').then(r => r.json()),
      fetch('/api/exchange-rate').then(r => r.json()),
    ]).then(([p, c, r]) => {
      setPayments(p);
      setCategories(c);
      setUyuPerUsd(r.uyuPerUsd);
      setLoading(false);
    });
  }, []);

  const totals = useMemo(() => combineTotals(payments, uyuPerUsd), [payments, uyuPerUsd]);

  const grouped = useMemo(() => {
    const byCat: Record<string, { category: Category | null; payments: PaymentWithCategory[] }> = {};
    for (const p of payments) {
      const key = p.category?.id ?? 'sin-categoria';
      if (!byCat[key]) byCat[key] = { category: p.category, payments: [] };
      byCat[key].payments.push(p);
    }
    return Object.values(byCat).sort((a, b) => (a.category?.position ?? 99) - (b.category?.position ?? 99));
  }, [payments]);

  const alerts = useMemo(() => {
    let venceHoy = 0;
    let estaSemana = 0;
    for (const p of payments) {
      const s = computeDisplayStatus(p, today);
      if (s === 'vence_hoy' || s === 'vencido') venceHoy++;
      else if (s === 'urgente' || s === 'proximo') estaSemana++;
    }
    return { venceHoy, estaSemana };
  }, [payments, today]);

  function openNew() {
    setEditing(null);
    setFormOpen(true);
  }

  function openEdit(p: PaymentWithCategory) {
    setEditing(p);
    setFormOpen(true);
  }

  function onSaved(p: PaymentWithCategory) {
    setPayments(prev => {
      const exists = prev.some(x => x.id === p.id);
      if (exists) return prev.map(x => (x.id === p.id ? p : x));
      return [...prev, p];
    });
    toast.success(editing ? 'Pago actualizado' : 'Pago agregado');
  }

  function onDeleted(id: string) {
    setPayments(prev => prev.filter(x => x.id !== id));
    toast.success('Pago eliminado');
  }

  async function pay(p: PaymentWithCategory) {
    setPayingId(p.id);
    const res = await fetch(`/api/payments/${p.id}/pay`, { method: 'POST' });
    if (!res.ok) {
      toast.error('No se pudo marcar el pago');
      setPayingId(null);
      return;
    }
    const updated: PaymentWithCategory = await res.json();
    setPayments(prev => prev.map(x => (x.id === updated.id ? updated : x)));
    toast.success(`${p.name} marcado como pagado`, {
      action: {
        label: 'Deshacer',
        onClick: async () => {
          const u = await fetch(`/api/payments/${p.id}/undo-pay`, { method: 'POST' });
          if (u.ok) {
            const restored = await u.json();
            setPayments(prev => prev.map(x => (x.id === restored.id ? restored : x)));
            toast.success('Pago restaurado');
          } else {
            toast.error('No se pudo deshacer');
          }
        },
      },
    });
    setPayingId(null);
  }

  if (loading) {
    return <div className="text-slate-500">Cargando...</div>;
  }

  return (
    <div className="space-y-6">
      <TotalsCards totals={totals} uyuPerUsd={uyuPerUsd} />

      {(alerts.venceHoy > 0 || alerts.estaSemana > 0) && (
        <div className="flex flex-wrap items-center gap-4 rounded-xl border border-amber-200 bg-amber-50 dark:bg-amber-900/20 dark:border-amber-900/40 p-3 text-sm">
          <AlertCircle className="h-5 w-5 text-amber-600" />
          {alerts.venceHoy > 0 && <span><strong>{alerts.venceHoy}</strong> {alerts.venceHoy === 1 ? 'pago vence' : 'pagos vencen'} hoy o ya vencieron</span>}
          {alerts.estaSemana > 0 && <span>📅 <strong>{alerts.estaSemana}</strong> {alerts.estaSemana === 1 ? 'pago' : 'pagos'} esta semana</span>}
        </div>
      )}

      <div className="flex items-center justify-between">
        <h1 className="text-2xl font-semibold">Pagos</h1>
        <Button onClick={openNew}>
          <Plus className="h-4 w-4 mr-1" /> Agregar pago
        </Button>
      </div>

      {grouped.length === 0 ? (
        <div className="rounded-xl border border-dashed p-10 text-center text-slate-500">
          Todavía no agregaste pagos. Click en "Agregar pago" para empezar.
        </div>
      ) : (
        <div className="space-y-4">
          {grouped.map(({ category, payments: ps }) => (
            <div key={category?.id ?? 'sin'} className="rounded-xl border bg-white dark:bg-slate-900 dark:border-slate-800 overflow-hidden">
              <div className="border-b border-slate-100 dark:border-slate-800 px-4 py-2 text-sm font-medium text-slate-700 dark:text-slate-300">
                {category ? `${category.icon ?? ''} ${category.name}` : 'Sin categoría'}
              </div>
              {ps.map(p => (
                <PaymentRow
                  key={p.id}
                  payment={p}
                  today={today}
                  onEdit={openEdit}
                  onPay={pay}
                  isPaying={payingId === p.id}
                />
              ))}
            </div>
          ))}
        </div>
      )}

      <PaymentForm
        open={formOpen}
        onOpenChange={setFormOpen}
        payment={editing}
        categories={categories}
        onSaved={onSaved}
        onDeleted={onDeleted}
      />
    </div>
  );
}
```

- [ ] **Step 2: Probar manual**

```bash
npm run dev
```

Abrir http://localhost:3000 → debería mostrar dashboard vacío con totales en $0 y mensaje "Todavía no agregaste pagos".

Click en **Agregar pago** → se abre el sheet, completar:
- Nombre: ChatGPT
- Monto: 20
- Moneda: USD
- Vencimiento: 2026-05-05
- Categoría: Entretenimiento
- Método: PREX GON
- Guardar

Verificar que aparece el pago en el dashboard, en la categoría correcta, con badge "VENCE HOY" rojo.

Click en ✓ Pagar → toast "ChatGPT marcado como pagado" + botón "Deshacer". El pago se mueve al mes siguiente y vuelve a verse en estado "futuro".

Click en "Deshacer" del toast → vuelve al estado previo.

- [ ] **Step 3: Commit**

```bash
git add app/\(app\)/page.tsx
git commit -m "feat(dashboard): página principal con totales, lista agrupada y form"
```

---

## Fase 11 — Configuración (CRUD de categorías)

### Task 11.1: Página de Settings con tabs

**Files:**
- Create: `app/(app)/settings/page.tsx`

- [ ] **Step 1: Crear**

```tsx
import { Tabs, TabsContent, TabsList, TabsTrigger } from '@/components/ui/tabs';
import { CategoriesSettings } from '@/components/settings/categories-settings';

export default function SettingsPage() {
  return (
    <div className="space-y-6">
      <h1 className="text-2xl font-semibold">Configuración</h1>

      <Tabs defaultValue="categories">
        <TabsList>
          <TabsTrigger value="categories">Categorías</TabsTrigger>
          <TabsTrigger value="account" disabled>Mi cuenta (Plan B)</TabsTrigger>
          <TabsTrigger value="notifications" disabled>Avisos (Plan B)</TabsTrigger>
        </TabsList>

        <TabsContent value="categories" className="mt-6">
          <CategoriesSettings />
        </TabsContent>
      </Tabs>
    </div>
  );
}
```

- [ ] **Step 2: Commit (incompleto, falta el componente)**

(No commitear todavía. Sigue en la próxima task.)

---

### Task 11.2: Componente `CategoriesSettings`

**Files:**
- Create: `components/settings/categories-settings.tsx`

- [ ] **Step 1: Crear**

```tsx
'use client';

import { useEffect, useState } from 'react';
import { Plus, Trash2, Save } from 'lucide-react';
import { Button } from '@/components/ui/button';
import { Input } from '@/components/ui/input';
import { Card, CardContent } from '@/components/ui/card';
import { toast } from 'sonner';
import type { Category } from '@/lib/types';

export function CategoriesSettings() {
  const [cats, setCats] = useState<Category[]>([]);
  const [loading, setLoading] = useState(true);
  const [newName, setNewName] = useState('');
  const [newIcon, setNewIcon] = useState('🛒');

  useEffect(() => {
    fetch('/api/categories').then(r => r.json()).then(d => {
      setCats(d);
      setLoading(false);
    });
  }, []);

  async function add() {
    if (!newName.trim()) return;
    const res = await fetch('/api/categories', {
      method: 'POST',
      headers: { 'Content-Type': 'application/json' },
      body: JSON.stringify({ name: newName.trim(), icon: newIcon, color: '#64748B', position: cats.length + 1 }),
    });
    if (res.ok) {
      const c = await res.json();
      setCats(prev => [...prev, c]);
      setNewName('');
      toast.success('Categoría creada');
    } else {
      const d = await res.json().catch(() => ({}));
      toast.error(d.error || 'Error al crear');
    }
  }

  async function update(id: string, patch: Partial<Category>) {
    const res = await fetch(`/api/categories/${id}`, {
      method: 'PATCH',
      headers: { 'Content-Type': 'application/json' },
      body: JSON.stringify(patch),
    });
    if (res.ok) {
      const c = await res.json();
      setCats(prev => prev.map(x => (x.id === id ? c : x)));
      toast.success('Guardado');
    } else {
      toast.error('Error al guardar');
    }
  }

  async function remove(id: string, name: string) {
    if (!confirm(`¿Borrar la categoría "${name}"? Los pagos quedarán sin categoría.`)) return;
    const res = await fetch(`/api/categories/${id}`, { method: 'DELETE' });
    if (res.ok) {
      setCats(prev => prev.filter(x => x.id !== id));
      toast.success('Categoría borrada');
    } else {
      toast.error('Error al borrar');
    }
  }

  if (loading) return <p className="text-slate-500">Cargando...</p>;

  return (
    <div className="space-y-4">
      <Card>
        <CardContent className="flex flex-wrap items-end gap-2 p-4">
          <div className="space-y-1 w-20">
            <label className="text-xs text-slate-600">Icono</label>
            <Input value={newIcon} onChange={e => setNewIcon(e.target.value)} className="text-center" />
          </div>
          <div className="space-y-1 flex-1 min-w-[200px]">
            <label className="text-xs text-slate-600">Nombre</label>
            <Input placeholder="Nueva categoría" value={newName} onChange={e => setNewName(e.target.value)} onKeyDown={e => e.key === 'Enter' && add()} />
          </div>
          <Button onClick={add}><Plus className="h-4 w-4 mr-1" /> Crear</Button>
        </CardContent>
      </Card>

      <div className="space-y-2">
        {cats.map(c => (
          <CategoryRow key={c.id} category={c} onSave={p => update(c.id, p)} onDelete={() => remove(c.id, c.name)} />
        ))}
      </div>
    </div>
  );
}

function CategoryRow({ category, onSave, onDelete }: { category: Category; onSave: (p: Partial<Category>) => Promise<void>; onDelete: () => void }) {
  const [name, setName] = useState(category.name);
  const [icon, setIcon] = useState(category.icon ?? '');
  const dirty = name !== category.name || icon !== (category.icon ?? '');

  return (
    <Card>
      <CardContent className="flex flex-wrap items-center gap-2 p-3">
        <Input value={icon} onChange={e => setIcon(e.target.value)} className="w-16 text-center" />
        <Input value={name} onChange={e => setName(e.target.value)} className="flex-1 min-w-[180px]" />
        <Button size="sm" variant="outline" onClick={() => onSave({ name, icon })} disabled={!dirty}>
          <Save className="h-4 w-4 mr-1" /> Guardar
        </Button>
        <Button size="sm" variant="ghost" onClick={onDelete} className="text-red-600">
          <Trash2 className="h-4 w-4" />
        </Button>
      </CardContent>
    </Card>
  );
}
```

- [ ] **Step 2: Probar manual**

```bash
npm run dev
```

http://localhost:3000/settings → ver las 5 categorías iniciales. Crear una nueva, editarla, borrarla. Toasts deben aparecer.

- [ ] **Step 3: Commit**

```bash
git add -A
git commit -m "feat(settings): CRUD de categorías"
```

---

## Fase 12 — Historial

### Task 12.1: GET /api/history

**Files:**
- Create: `app/api/history/route.ts`

- [ ] **Step 1: Crear**

```ts
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
```

- [ ] **Step 2: Commit**

```bash
git add app/api/history/route.ts
git commit -m "feat(api): GET /api/history con filtro de fechas"
```

---

### Task 12.2: Página de historial

**Files:**
- Create: `app/(app)/history/page.tsx`

- [ ] **Step 1: Crear**

```tsx
'use client';

import { useEffect, useMemo, useState } from 'react';
import { Card, CardContent } from '@/components/ui/card';
import { Input } from '@/components/ui/input';
import { Label } from '@/components/ui/label';
import { formatAmount } from '@/lib/currency';

interface HistoryEntry {
  id: string;
  payment_id: string;
  paid_at: string;
  paid_amount: number;
  paid_currency: 'USD' | 'UYU';
  due_date_at_payment: string;
  payment: {
    name: string;
    category: { name: string; icon: string | null } | null;
  } | null;
}

export default function HistoryPage() {
  const [entries, setEntries] = useState<HistoryEntry[]>([]);
  const [loading, setLoading] = useState(true);
  const [from, setFrom] = useState('');
  const [to, setTo] = useState('');

  useEffect(() => {
    const params = new URLSearchParams();
    if (from) params.set('from', from);
    if (to) params.set('to', to);
    fetch(`/api/history?${params.toString()}`).then(r => r.json()).then(d => {
      setEntries(d);
      setLoading(false);
    });
  }, [from, to]);

  const totals = useMemo(() => {
    let usd = 0, uyu = 0;
    for (const e of entries) {
      if (e.paid_currency === 'USD') usd += e.paid_amount;
      else uyu += e.paid_amount;
    }
    return { usd, uyu };
  }, [entries]);

  return (
    <div className="space-y-6">
      <h1 className="text-2xl font-semibold">Historial de pagos</h1>

      <Card>
        <CardContent className="grid grid-cols-1 sm:grid-cols-3 gap-4 p-4">
          <div className="space-y-2">
            <Label>Desde</Label>
            <Input type="date" value={from} onChange={e => setFrom(e.target.value)} />
          </div>
          <div className="space-y-2">
            <Label>Hasta</Label>
            <Input type="date" value={to} onChange={e => setTo(e.target.value)} />
          </div>
          <div className="space-y-2">
            <Label>Total pagado</Label>
            <div className="font-mono text-sm">
              <div>USD: ${totals.usd.toFixed(2)}</div>
              <div>UYU: ${totals.uyu.toFixed(2)}</div>
            </div>
          </div>
        </CardContent>
      </Card>

      {loading ? (
        <p className="text-slate-500">Cargando...</p>
      ) : entries.length === 0 ? (
        <p className="text-slate-500">No hay pagos en este rango.</p>
      ) : (
        <div className="rounded-xl border bg-white dark:bg-slate-900 dark:border-slate-800 overflow-hidden">
          {entries.map(e => (
            <div key={e.id} className="flex items-center gap-3 border-b border-slate-100 dark:border-slate-800 px-4 py-3 last:border-b-0">
              <div className="flex-1 min-w-0">
                <p className="font-medium truncate">{e.payment?.name ?? '(borrado)'}</p>
                <p className="text-xs text-slate-500">
                  {e.payment?.category ? `${e.payment.category.icon ?? ''} ${e.payment.category.name}` : 'Sin categoría'} •
                  pagado {new Date(e.paid_at).toLocaleString('es-UY')}
                </p>
              </div>
              <div className="font-mono text-sm tabular-nums">
                {formatAmount(e.paid_amount, e.paid_currency)}
              </div>
            </div>
          ))}
        </div>
      )}
    </div>
  );
}
```

- [ ] **Step 2: Probar manual**

http://localhost:3000/history → debería mostrar las entradas que se hayan creado al marcar pagos como pagados.

- [ ] **Step 3: Commit**

```bash
git add app/\(app\)/history/page.tsx
git commit -m "feat: página de historial con filtros y totales"
```

---

## Fase 13 — Tests pasan + verificación final local

### Task 13.1: Correr toda la suite de tests

- [ ] **Step 1: Tests + typecheck + build**

```bash
npm run test
npm run typecheck
npm run build
```

Expected: tests pasan, typecheck limpio, build sin errores.

Si alguno falla, arreglar antes de avanzar.

- [ ] **Step 2: Commit (si hubo arreglos)**

```bash
git add -A
git commit -m "chore: arreglos para que todo verde"
```

(Skipear si no hubo arreglos.)

---

### Task 13.2: Checklist manual de Plan A

Con `npm run dev` corriendo, ir tildando:

- [ ] Login con magic link funciona en PC.
- [ ] Logout funciona.
- [ ] Re-login (segunda vez): la cookie persiste, abrís y entra directo sin pedir mail otra vez.
- [ ] Email no en allowlist da error 403.
- [ ] Crear pago → aparece en dashboard.
- [ ] Editar pago → cambios reflejados.
- [ ] Borrar pago → desaparece.
- [ ] Marcar pagado un recurrente → fecha avanza, vuelve a pendiente.
- [ ] Marcar pagado un único (recurrente=off) → queda como pagado, aparece en /history.
- [ ] "Deshacer" en el toast funciona.
- [ ] Los 3 totales (USD/UYU/combinado) suman bien.
- [ ] Cotización del dólar aparece (si dolarapi responde).
- [ ] Filtro/agrupación por categoría se ve.
- [ ] Crear/editar/borrar categorías en /settings funciona.
- [ ] Modo oscuro responde al sistema (cambiar el theme del SO y refrescar).
- [ ] Vista responsive en móvil (DevTools → mobile view).
- [ ] Header dropdown funciona.

Si algún ítem falla, abrir tarea aparte para arreglarlo antes de seguir.

---

## Fase 14 — Deploy a Vercel

### Task 14.1: Preparar para deploy

- [ ] **Step 1: Verificar `package.json`**

Confirmar que `package.json` tiene `"build": "next build"` y `"start": "next start"`.

- [ ] **Step 2: Push final antes del deploy**

```bash
git push
```

---

### Task 14.2: Crear proyecto en Vercel (manual del usuario)

- [ ] **Step 1: Instrucciones**

> 1. Andá a https://vercel.com → "Sign up with GitHub".
> 2. Click "Add New Project" → Importar el repo `plan-pagos-familiar`.
> 3. Framework Preset: Next.js (autodetectado).
> 4. **Antes de hacer Deploy**, en "Environment Variables", pegar TODAS las variables de tu `.env.local`:
>    - `NEXT_PUBLIC_SUPABASE_URL`
>    - `NEXT_PUBLIC_SUPABASE_ANON_KEY`
>    - `SUPABASE_SERVICE_ROLE_KEY`
>    - `ALLOWED_EMAILS`
>    - `NEXT_PUBLIC_APP_URL` ← **ojo**: poner aquí la URL que te asigne Vercel (ej `https://plan-pagos-familiar.vercel.app`). Si todavía no la sabés, dejala con un valor temporal y la editás después.
> 5. Click Deploy. Esperar ~2 minutos.

- [ ] **Step 2: Una vez deployed, capturar la URL**

> Pasame la URL final (ej `https://plan-pagos-familiar.vercel.app`).

- [ ] **Step 3: Actualizar `NEXT_PUBLIC_APP_URL` en Vercel si quedó mal**

> Si tuviste que poner un valor temporal, ahora andá a Project Settings → Environment Variables → editar `NEXT_PUBLIC_APP_URL` con la URL real → Redeploy.

---

### Task 14.3: Configurar Supabase para producción

- [ ] **Step 1: Instrucciones**

> En Supabase, **Authentication → URL Configuration**:
> 1. Cambiar Site URL a la URL de Vercel (ej `https://plan-pagos-familiar.vercel.app`).
> 2. Agregar a Redirect URLs: `https://plan-pagos-familiar.vercel.app/auth/callback` y `https://plan-pagos-familiar.vercel.app/**`.
> 3. (Opcional) Mantener también las URLs de localhost para seguir probando localmente.
> 4. Guardar.

- [ ] **Step 2: Probar login en producción**

> Abrir la URL de Vercel → ingresar tu email → recibís el magic link → click → entrás. ✅

---

## Fase 15 — Carga de datos iniciales

### Task 15.1: Cargar los 8 pagos del Excel

- [ ] **Step 1: Ya en producción (o local), abrir la app y agregar:**

| Nombre | Monto | Moneda | Vencimiento | Categoría | Método | Recurrente | Cada N meses |
|---|---|---|---|---|---|---|---|
| Canva | 6.50 | USD | 2026-05-16 | Entretenimiento | PREX GON | Sí | 1 |
| XBOX Game Pass Gon y Cari | 16.00 | USD | 2026-05-22 | Entretenimiento | PREX GON | Sí | 1 |
| EA Play Pro | 17.00 | USD | 2026-05-30 | Entretenimiento | PREX GON | Sí | 1 |
| ChatGPT | 20.00 | USD | 2026-05-05 | Entretenimiento | PREX GON | Sí | 1 |
| Claude | 20.00 | USD | 2026-06-04 | Entretenimiento | PREX GON | Sí | 1 |
| HBO MAX | 200.00 | UYU | 2026-05-14 | Entretenimiento | PREX MAMA | Sí | 1 |
| Disney Plus | 12.99 | USD | 2026-05-15 | Entretenimiento | OCA 0436 | Sí | 1 |
| Amazon Prime | 6.00 | USD | 2026-05-24 | Entretenimiento | VISA 6366 | Sí | 1 |

(Cargarlos todos vía la UI con "Agregar pago".)

- [ ] **Step 2: Verificar el dashboard**

Comparar los totales y la disposición con el screenshot original del Excel. Deben coincidir. ChatGPT debe mostrarse "VENCE HOY" en rojo.

---

### Task 15.2: Agregar a la familia a la allowlist

- [ ] **Step 1: Pedirle a Gonzalo los emails de la familia**

> Pasame los emails de mamá, papá, etc. para sumarlos a la allowlist.

- [ ] **Step 2: Actualizar `ALLOWED_EMAILS` en Vercel**

> En Vercel → Project Settings → Environment Variables → editar `ALLOWED_EMAILS` y agregar separados por coma:
> `sardigonzalo01@gmail.com,mama@gmail.com,papa@gmail.com,...`
> Guardar y "Redeploy".

- [ ] **Step 3: Probar con un mail de la familia**

> Pedile a alguien de la familia que entre y se loguee. Debe llegar el magic link y poder entrar.

---

## Cierre del Plan A

Al terminar todas las tasks anteriores:

- ✅ La app está online en `https://...vercel.app`.
- ✅ Toda la familia puede entrar con magic link.
- ✅ Los 8 pagos están cargados.
- ✅ Totales, fechas, estados y filtros funcionan.
- ✅ Marcar pagado en recurrentes los renueva al mes siguiente.
- ✅ Modo oscuro funciona.
- ✅ Tests automáticos pasan.

**Lo que NO está hecho aún (Plan B):**
- ❌ Avisos automáticos por Email + Telegram.
- ❌ Backup semanal a GitHub.
- ❌ Configuración de notificación_email y telegram en `/settings`.

Esos los implementamos en Plan B. La app es plenamente usable como reemplazo del Excel mientras tanto.

---

## Resumen de archivos creados (Plan A)

```
app/
├── (auth)/
│   ├── layout.tsx
│   └── login/page.tsx
├── (app)/
│   ├── layout.tsx
│   ├── page.tsx                 # Dashboard
│   ├── history/page.tsx
│   └── settings/page.tsx
├── api/
│   ├── auth/
│   │   ├── magic-link/route.ts
│   │   └── logout/route.ts
│   ├── categories/
│   │   ├── route.ts
│   │   └── [id]/route.ts
│   ├── payments/
│   │   ├── route.ts
│   │   └── [id]/
│   │       ├── route.ts
│   │       ├── pay/route.ts
│   │       └── undo-pay/route.ts
│   ├── history/route.ts
│   └── exchange-rate/route.ts
├── auth/callback/route.ts
└── layout.tsx
components/
├── ui/                          # shadcn
├── theme-provider.tsx
├── app-header.tsx
├── totals-cards.tsx
├── payment-row.tsx
├── payment-form.tsx
└── settings/
    └── categories-settings.tsx
lib/
├── supabase/{client,server,middleware}.ts
├── auth.ts
├── currency.ts
├── exchange-rate.ts
├── payments.ts
├── styles.ts
├── types.ts
└── utils.ts
tests/
└── lib/{auth,currency,payments}.test.ts
supabase/
├── migrations/0001_init.sql
└── seed.sql
middleware.ts
.env.example
.gitignore
package.json
tailwind.config.ts
tsconfig.json
vitest.config.ts
```

# Plan B — Recordatorios + Backups Implementation Plan

> **For agentic workers:** REQUIRED SUB-SKILL: Use superpowers:subagent-driven-development to execute task-by-task.

**Goal:** Agregar recordatorios automáticos (Email + Telegram) que se mandan a Gonzalo a 7, 3 y 1 día antes de cada vencimiento, y un backup semanal de los datos a GitHub. Al terminar, la app está completa: el sistema avisa solo, sin intervención.

**Architecture:** GitHub Actions corre un cron diario a las 09:00 UYT (12:00 UTC) que ejecuta un script Node. El script lee `payments` desde Supabase, filtra los que vencen en {7, 3, 1, 0} días, y manda Email vía Resend + Telegram vía Bot API. Anti-duplicado vía `notification_log` (UNIQUE constraint ya existe). Backup semanal corre los domingos a las 03:00 UTC y exporta JSON a la carpeta `backups/` del repo.

**Tech Stack:** Node 20, Resend SDK, Telegram Bot API (sin SDK, vía fetch directo), GitHub Actions, Supabase Service Role client.

**Spec base:** [docs/superpowers/specs/2026-05-05-plan-pagos-familiar-design.md](../specs/2026-05-05-plan-pagos-familiar-design.md) (sección 8 — Recordatorios; sección 11 — Backups)

**Plan A:** [docs/superpowers/plans/2026-05-05-plan-a-mvp-web.md](2026-05-05-plan-a-mvp-web.md) — completo y deployado.

---

## Convenciones

- Working dir: `C:\Users\Usuario\OneDrive\Desktop\Plan de Pagos Familiar`.
- Branch: `main`. Push después de cada fase importante.
- Tests: Vitest. Mismo patrón que Plan A.
- Commits en español, conventional commits, co-author Claude.

---

## Variables de entorno nuevas (van en Vercel y en `.env.local`)

```
RESEND_API_KEY=re_...
RESEND_FROM_EMAIL=Plan Pagos <onboarding@resend.dev>
TELEGRAM_BOT_TOKEN=12345:ABC...
TELEGRAM_WEBHOOK_SECRET=<random hex>
```

Las primeras dos se obtienen de la cuenta de Resend (Phase B0). Las dos de Telegram, de @BotFather.

Para el cron de GitHub Actions, los secretos van en **GitHub repo Settings → Secrets and variables → Actions**:

```
NEXT_PUBLIC_SUPABASE_URL
SUPABASE_SERVICE_ROLE_KEY
RESEND_API_KEY
RESEND_FROM_EMAIL
TELEGRAM_BOT_TOKEN
NEXT_PUBLIC_APP_URL
```

(El cron NO usa el anon key, va con service_role para bypassar RLS.)

---

## Phase B0 — Setup externo (manual del usuario)

### Task B0.1: Crear cuenta Resend + API key

Instrucciones al usuario:

1. Ir a https://resend.com → "Sign up" con GitHub.
2. En el dashboard: **API Keys** → "Create API Key" → nombre `plan-pagos-familiar`, permission "Sending access". Copiar la key (empieza con `re_`). **Guardarla** — solo se muestra una vez.
3. Para el email "From": usar el dominio default `onboarding@resend.dev` (limitado pero funciona sin verificar dominio). Más adelante si querés un dominio propio (ej `pagos@tudominio.com`) lo verificás. Para v1 con `onboarding@resend.dev` alcanza.
4. **Importante:** Resend en plan free solo manda mails al email con el que te registraste. Eso está bien para Gonzalo (es él el único que recibe avisos en v1).

### Task B0.2: Crear bot de Telegram

Instrucciones al usuario:

1. Abrir Telegram, buscar `@BotFather` (oficial, con tilde verde).
2. `/newbot`
3. Cuando pregunta el nombre: `Plan de Pagos Familiar`
4. Cuando pregunta el username: `PlanPagosFamiliar_bot` (debe terminar en `_bot` o `bot`; si está tomado, probá variaciones).
5. Botfather devuelve un token tipo `1234567890:ABCdef...`. **Guardarlo** — es el `TELEGRAM_BOT_TOKEN`.
6. Para el `TELEGRAM_WEBHOOK_SECRET`: generamos uno random nosotros (paso siguiente).

### Task B0.3: Generar webhook secret y completar `.env.local`

Como agente, generar 32 bytes hex random:

```bash
node -e "console.log(require('crypto').randomBytes(32).toString('hex'))"
```

Pegar resultado como `TELEGRAM_WEBHOOK_SECRET`.

Editar `.env.local` agregando:

```
RESEND_API_KEY=<paste>
RESEND_FROM_EMAIL=Plan Pagos <onboarding@resend.dev>
TELEGRAM_BOT_TOKEN=<paste>
TELEGRAM_WEBHOOK_SECRET=<paste>
```

### Task B0.4: Agregar las 4 variables a Vercel

Manual: Vercel → Settings → Environment Variables → Add para cada una de las 4. Production scope.

Después de agregarlas: Redeploy desde Deployments tab.

### Task B0.5: Agregar secretos al GitHub Actions

Manual: GitHub → repo `pagos-familia` → Settings → Secrets and variables → Actions → "New repository secret" para cada uno:

- `NEXT_PUBLIC_SUPABASE_URL` (mismo valor que en Vercel)
- `SUPABASE_SERVICE_ROLE_KEY`
- `RESEND_API_KEY`
- `RESEND_FROM_EMAIL`
- `TELEGRAM_BOT_TOKEN`
- `NEXT_PUBLIC_APP_URL` (la URL de Vercel)

---

## Phase B1 — Lógica de notificaciones (TDD)

### Task B1.1: `lib/notifications.ts` — `shouldNotify` (TDD)

**Files:**
- Test: `tests/lib/notifications.test.ts`
- Create: `lib/notifications.ts`

- [ ] **Step 1: Crear test fallando**

```ts
import { describe, it, expect } from 'vitest';
import { shouldNotify, NOTIFICATION_WINDOWS } from '@/lib/notifications';
import type { Payment } from '@/lib/types';

const base: Payment = {
  id: 'x', name: 'Test', amount: 10, currency: 'USD',
  due_date: '2026-05-13', category_id: null, payment_method: null,
  is_recurring: true, recurrence_months: 1,
  status: 'pendiente', notify_enabled: true, count_in_totals: true,
  notes: null, created_by: null, created_at: '', updated_at: '',
};

describe('NOTIFICATION_WINDOWS', () => {
  it('exporta las ventanas 7, 3, 1, 0', () => {
    expect(NOTIFICATION_WINDOWS).toEqual([7, 3, 1, 0]);
  });
});

describe('shouldNotify', () => {
  it('true si está en una ventana y notify_enabled=true', () => {
    expect(shouldNotify({ ...base, due_date: '2026-05-13' }, '2026-05-06')).toBe(true);  // 7 días
    expect(shouldNotify({ ...base, due_date: '2026-05-09' }, '2026-05-06')).toBe(true);  // 3 días
    expect(shouldNotify({ ...base, due_date: '2026-05-07' }, '2026-05-06')).toBe(true);  // 1 día
    expect(shouldNotify({ ...base, due_date: '2026-05-06' }, '2026-05-06')).toBe(true);  // 0 días
  });

  it('false si está fuera de las ventanas', () => {
    expect(shouldNotify({ ...base, due_date: '2026-05-12' }, '2026-05-06')).toBe(false); // 6 días
    expect(shouldNotify({ ...base, due_date: '2026-05-08' }, '2026-05-06')).toBe(false); // 2 días
    expect(shouldNotify({ ...base, due_date: '2026-05-14' }, '2026-05-06')).toBe(false); // 8 días
  });

  it('false si ya venció (negativo)', () => {
    expect(shouldNotify({ ...base, due_date: '2026-05-05' }, '2026-05-06')).toBe(false);
  });

  it('false si notify_enabled=false', () => {
    expect(shouldNotify({ ...base, due_date: '2026-05-13', notify_enabled: false }, '2026-05-06')).toBe(false);
  });

  it('false si status=pagado', () => {
    expect(shouldNotify({ ...base, due_date: '2026-05-13', status: 'pagado' }, '2026-05-06')).toBe(false);
  });
});

describe('shouldNotify — devuelve la ventana exacta', () => {
  it('matchedWindow es 7/3/1/0 según corresponde', () => {
    expect(shouldNotify({ ...base, due_date: '2026-05-13' }, '2026-05-06', { returnWindow: true })).toBe(7);
    expect(shouldNotify({ ...base, due_date: '2026-05-09' }, '2026-05-06', { returnWindow: true })).toBe(3);
    expect(shouldNotify({ ...base, due_date: '2026-05-07' }, '2026-05-06', { returnWindow: true })).toBe(1);
    expect(shouldNotify({ ...base, due_date: '2026-05-06' }, '2026-05-06', { returnWindow: true })).toBe(0);
  });

  it('matchedWindow es null si no matchea', () => {
    expect(shouldNotify({ ...base, due_date: '2026-05-12' }, '2026-05-06', { returnWindow: true })).toBeNull();
  });
});
```

- [ ] **Step 2: Correr → falla**

```bash
npx vitest run tests/lib/notifications.test.ts
```

- [ ] **Step 3: Implementar**

```ts
import { differenceInCalendarDays, parseISO } from 'date-fns';
import type { Payment } from '@/lib/types';

export const NOTIFICATION_WINDOWS = [7, 3, 1, 0] as const;

export function shouldNotify(payment: Payment, today: string): boolean;
export function shouldNotify(payment: Payment, today: string, opts: { returnWindow: true }): number | null;
export function shouldNotify(payment: Payment, today: string, opts?: { returnWindow?: boolean }): boolean | number | null {
  if (!payment.notify_enabled || payment.status === 'pagado') {
    return opts?.returnWindow ? null : false;
  }
  const days = differenceInCalendarDays(parseISO(payment.due_date), parseISO(today));
  const matched = (NOTIFICATION_WINDOWS as readonly number[]).includes(days);
  if (opts?.returnWindow) return matched ? days : null;
  return matched;
}
```

- [ ] **Step 4: Correr → pasa**

- [ ] **Step 5: Commit**

```bash
git add lib/notifications.ts tests/lib/notifications.test.ts
git commit -m "feat(notifications): shouldNotify con ventanas 7/3/1/0"
```

---

## Phase B2 — Senders (Email + Telegram)

### Task B2.1: `lib/email.ts` — wrapper de Resend

**Files:**
- Create: `lib/email.ts`

```ts
import type { Payment, Category } from '@/lib/types';
import { formatAmount } from '@/lib/currency';

interface ReminderEmailOpts {
  to: string;
  payment: Payment & { category: Category | null };
  windowDays: number;
  appUrl: string;
}

function getUrgencyColor(window: number): string {
  if (window === 0) return '#EF4444';   // rojo (vence hoy)
  if (window === 1) return '#F97316';   // naranja
  if (window === 3) return '#F59E0B';   // ámbar
  return '#3B82F6';                      // azul (7 días)
}

function getUrgencyText(window: number): string {
  if (window === 0) return 'VENCE HOY';
  if (window === 1) return 'Vence mañana';
  return `Vence en ${window} días`;
}

export async function sendReminderEmail(opts: ReminderEmailOpts): Promise<void> {
  const apiKey = process.env.RESEND_API_KEY;
  const from = process.env.RESEND_FROM_EMAIL || 'Plan Pagos <onboarding@resend.dev>';

  if (!apiKey) throw new Error('RESEND_API_KEY no configurado');

  const color = getUrgencyColor(opts.windowDays);
  const urgency = getUrgencyText(opts.windowDays);
  const cat = opts.payment.category;
  const dateFormatted = opts.payment.due_date.split('-').reverse().join('/');

  const html = `<!DOCTYPE html>
<html lang="es"><head><meta charset="utf-8"></head>
<body style="font-family: -apple-system, sans-serif; background: #f8fafc; padding: 24px; margin: 0;">
  <table role="presentation" width="100%" style="max-width: 480px; margin: 0 auto; background: white; border-radius: 12px; overflow: hidden; box-shadow: 0 2px 8px rgba(0,0,0,0.06);">
    <tr><td style="background: ${color}; color: white; padding: 16px 24px; font-weight: 600; font-size: 18px;">${urgency}</td></tr>
    <tr><td style="padding: 24px;">
      <h1 style="margin: 0 0 16px 0; font-size: 22px; color: #0f172a;">${escapeHtml(opts.payment.name)}</h1>
      <table style="width: 100%; font-size: 15px; color: #334155; border-collapse: collapse;">
        <tr><td style="padding: 4px 0;">💵 Monto:</td><td style="padding: 4px 0; text-align: right; font-weight: 600;">${formatAmount(opts.payment.amount, opts.payment.currency)}</td></tr>
        <tr><td style="padding: 4px 0;">📅 Fecha:</td><td style="padding: 4px 0; text-align: right;">${dateFormatted}</td></tr>
        ${opts.payment.payment_method ? `<tr><td style="padding: 4px 0;">💳 Método:</td><td style="padding: 4px 0; text-align: right;">${escapeHtml(opts.payment.payment_method)}</td></tr>` : ''}
        ${cat ? `<tr><td style="padding: 4px 0;">🏷️ Categoría:</td><td style="padding: 4px 0; text-align: right;">${cat.icon ?? ''} ${escapeHtml(cat.name)}</td></tr>` : ''}
      </table>
      <div style="margin-top: 24px; text-align: center;">
        <a href="${opts.appUrl}" style="display: inline-block; background: #2563eb; color: white; text-decoration: none; padding: 12px 24px; border-radius: 8px; font-weight: 600;">Ver en la web</a>
      </div>
    </td></tr>
    <tr><td style="background: #f1f5f9; padding: 12px 24px; text-align: center; font-size: 12px; color: #64748b;">Plan de Pagos Familiar</td></tr>
  </table>
</body></html>`;

  const subject = opts.windowDays === 0
    ? `🔴 Vence hoy: ${opts.payment.name}`
    : `📌 ${opts.payment.name} vence en ${opts.windowDays} día${opts.windowDays === 1 ? '' : 's'}`;

  const res = await fetch('https://api.resend.com/emails', {
    method: 'POST',
    headers: {
      'Authorization': `Bearer ${apiKey}`,
      'Content-Type': 'application/json',
    },
    body: JSON.stringify({ from, to: opts.to, subject, html }),
  });

  if (!res.ok) {
    const errText = await res.text();
    throw new Error(`Resend API ${res.status}: ${errText}`);
  }
}

function escapeHtml(s: string): string {
  return s.replace(/&/g, '&amp;').replace(/</g, '&lt;').replace(/>/g, '&gt;').replace(/"/g, '&quot;');
}
```

Commit: `feat(email): wrapper de Resend con plantilla HTML del recordatorio`

### Task B2.2: `lib/telegram.ts` — wrapper del Bot API

**Files:**
- Create: `lib/telegram.ts`

```ts
import type { Payment, Category } from '@/lib/types';
import { formatAmount } from '@/lib/currency';

const TG_API = 'https://api.telegram.org';

export async function sendTelegramMessage(chatId: string, text: string, opts?: { parseMode?: 'Markdown' | 'HTML' }): Promise<void> {
  const token = process.env.TELEGRAM_BOT_TOKEN;
  if (!token) throw new Error('TELEGRAM_BOT_TOKEN no configurado');

  const res = await fetch(`${TG_API}/bot${token}/sendMessage`, {
    method: 'POST',
    headers: { 'Content-Type': 'application/json' },
    body: JSON.stringify({
      chat_id: chatId,
      text,
      parse_mode: opts?.parseMode ?? 'Markdown',
      disable_web_page_preview: true,
    }),
  });

  if (!res.ok) {
    const errText = await res.text();
    throw new Error(`Telegram API ${res.status}: ${errText}`);
  }
}

interface ReminderTelegramOpts {
  chatId: string;
  payment: Payment & { category: Category | null };
  windowDays: number;
}

export async function sendReminderTelegram(opts: ReminderTelegramOpts): Promise<void> {
  const cat = opts.payment.category;
  const dateFormatted = opts.payment.due_date.split('-').reverse().join('/');

  const urgencyEmoji = opts.windowDays === 0 ? '🔴' : opts.windowDays === 1 ? '🟠' : opts.windowDays === 3 ? '🟡' : '🔵';
  const urgencyText = opts.windowDays === 0 ? 'VENCE HOY' : opts.windowDays === 1 ? 'Vence mañana' : `Vence en ${opts.windowDays} días`;

  const lines = [
    `${urgencyEmoji} *${escapeMarkdown(opts.payment.name)}* — ${urgencyText}`,
    '',
    `💵 ${formatAmount(opts.payment.amount, opts.payment.currency)}`,
    `📅 ${dateFormatted}`,
  ];
  if (opts.payment.payment_method) lines.push(`💳 ${escapeMarkdown(opts.payment.payment_method)}`);
  if (cat) lines.push(`🏷️ ${cat.icon ?? ''} ${escapeMarkdown(cat.name)}`);

  await sendTelegramMessage(opts.chatId, lines.join('\n'), { parseMode: 'Markdown' });
}

function escapeMarkdown(s: string): string {
  return s.replace(/[_*`[\]]/g, ch => `\\${ch}`);
}
```

Commit: `feat(telegram): wrapper del Bot API con formato Markdown`

### Task B2.3: Tests para email/telegram (smoke con mock)

Solo testeamos el formato del payload, no el network call (mockeamos `fetch`).

**Files:**
- Create: `tests/lib/email.test.ts`
- Create: `tests/lib/telegram.test.ts`

```ts
// tests/lib/email.test.ts
import { describe, it, expect, vi, beforeEach } from 'vitest';
import { sendReminderEmail } from '@/lib/email';
import type { Payment, Category } from '@/lib/types';

const fetchMock = vi.fn();

beforeEach(() => {
  vi.stubGlobal('fetch', fetchMock);
  vi.stubEnv('RESEND_API_KEY', 're_test');
  vi.stubEnv('RESEND_FROM_EMAIL', 'test@from.com');
  fetchMock.mockReset();
  fetchMock.mockResolvedValue({ ok: true, status: 200, text: async () => '' });
});

const cat: Category = { id: 'c1', name: 'Entretenimiento', icon: '🎬', color: null, position: 1, created_at: '' };
const payment: Payment & { category: Category | null } = {
  id: 'p1', name: 'ChatGPT', amount: 20, currency: 'USD',
  due_date: '2026-05-13', category_id: 'c1', payment_method: 'PREX GON',
  is_recurring: true, recurrence_months: 1,
  status: 'pendiente', notify_enabled: true, count_in_totals: true,
  notes: null, created_by: null, created_at: '', updated_at: '',
  category: cat,
};

describe('sendReminderEmail', () => {
  it('manda POST a Resend con el payload correcto', async () => {
    await sendReminderEmail({ to: 'a@b.com', payment, windowDays: 7, appUrl: 'https://app.com' });

    expect(fetchMock).toHaveBeenCalledOnce();
    const [url, init] = fetchMock.mock.calls[0];
    expect(url).toBe('https://api.resend.com/emails');
    expect(init.headers.Authorization).toBe('Bearer re_test');
    const body = JSON.parse(init.body);
    expect(body.to).toBe('a@b.com');
    expect(body.from).toBe('test@from.com');
    expect(body.subject).toContain('ChatGPT');
    expect(body.subject).toContain('7 día');
    expect(body.html).toContain('ChatGPT');
    expect(body.html).toContain('PREX GON');
  });

  it('asunto especial cuando vence hoy', async () => {
    await sendReminderEmail({ to: 'a@b.com', payment, windowDays: 0, appUrl: 'https://app.com' });
    const body = JSON.parse(fetchMock.mock.calls[0][1].body);
    expect(body.subject).toContain('Vence hoy');
  });

  it('tira error si Resend devuelve no-ok', async () => {
    fetchMock.mockResolvedValueOnce({ ok: false, status: 401, text: async () => 'unauthorized' });
    await expect(sendReminderEmail({ to: 'a@b.com', payment, windowDays: 7, appUrl: 'https://app.com' })).rejects.toThrow(/Resend API 401/);
  });
});
```

```ts
// tests/lib/telegram.test.ts
import { describe, it, expect, vi, beforeEach } from 'vitest';
import { sendReminderTelegram, sendTelegramMessage } from '@/lib/telegram';
import type { Payment, Category } from '@/lib/types';

const fetchMock = vi.fn();

beforeEach(() => {
  vi.stubGlobal('fetch', fetchMock);
  vi.stubEnv('TELEGRAM_BOT_TOKEN', '123:abc');
  fetchMock.mockReset();
  fetchMock.mockResolvedValue({ ok: true, status: 200, text: async () => '{}' });
});

const cat: Category = { id: 'c1', name: 'Entretenimiento', icon: '🎬', color: null, position: 1, created_at: '' };
const payment: Payment & { category: Category | null } = {
  id: 'p1', name: 'ChatGPT', amount: 20, currency: 'USD',
  due_date: '2026-05-13', category_id: 'c1', payment_method: 'PREX GON',
  is_recurring: true, recurrence_months: 1,
  status: 'pendiente', notify_enabled: true, count_in_totals: true,
  notes: null, created_by: null, created_at: '', updated_at: '',
  category: cat,
};

describe('sendTelegramMessage', () => {
  it('llama al endpoint del bot con chat_id y texto', async () => {
    await sendTelegramMessage('99999', 'hola');
    const [url, init] = fetchMock.mock.calls[0];
    expect(url).toBe('https://api.telegram.org/bot123:abc/sendMessage');
    const body = JSON.parse(init.body);
    expect(body.chat_id).toBe('99999');
    expect(body.text).toBe('hola');
  });
});

describe('sendReminderTelegram', () => {
  it('formato Markdown con todos los campos', async () => {
    await sendReminderTelegram({ chatId: '99999', payment, windowDays: 1 });
    const body = JSON.parse(fetchMock.mock.calls[0][1].body);
    expect(body.text).toContain('ChatGPT');
    expect(body.text).toContain('Vence mañana');
    expect(body.text).toContain('PREX GON');
    expect(body.text).toContain('Entretenimiento');
  });

  it('vence hoy usa 🔴', async () => {
    await sendReminderTelegram({ chatId: '99999', payment, windowDays: 0 });
    const body = JSON.parse(fetchMock.mock.calls[0][1].body);
    expect(body.text).toMatch(/🔴.*VENCE HOY/);
  });
});
```

Commit: `test(senders): tests con mock de fetch para email y telegram`

---

## Phase B3 — UI de configuración (settings)

### Task B3.1: API `/api/settings` GET y PATCH

**Files:**
- Create: `app/api/settings/route.ts`

```ts
import { NextResponse } from 'next/server';
import { z } from 'zod';
import { createClient } from '@/lib/supabase/server';

export async function GET() {
  const supabase = createClient();
  const { data: { user } } = await supabase.auth.getUser();
  if (!user) return NextResponse.json({ error: 'No autorizado' }, { status: 401 });

  const { data, error } = await supabase
    .from('user_settings')
    .select('*')
    .eq('user_id', user.id)
    .maybeSingle();

  if (error) return NextResponse.json({ error: error.message }, { status: 500 });
  // Si no hay row, devolvemos defaults
  return NextResponse.json(data ?? {
    user_id: user.id,
    notification_email: user.email,
    telegram_chat_id: null,
    telegram_link_code: null,
    receives_reminders: false,
  });
}

const patchSchema = z.object({
  notification_email: z.string().email().nullable().optional(),
  receives_reminders: z.boolean().optional(),
});

export async function PATCH(req: Request) {
  const supabase = createClient();
  const { data: { user } } = await supabase.auth.getUser();
  if (!user) return NextResponse.json({ error: 'No autorizado' }, { status: 401 });

  const body = await req.json().catch(() => null);
  const parsed = patchSchema.safeParse(body);
  if (!parsed.success) return NextResponse.json({ error: 'Datos inválidos' }, { status: 400 });

  // Upsert
  const { data, error } = await supabase
    .from('user_settings')
    .upsert({ user_id: user.id, ...parsed.data })
    .select()
    .single();

  if (error) return NextResponse.json({ error: error.message }, { status: 500 });
  return NextResponse.json(data);
}
```

Commit: `feat(api): GET y PATCH /api/settings`

### Task B3.2: API `/api/settings/telegram-code` (genera código)

**Files:**
- Create: `app/api/settings/telegram-code/route.ts`

```ts
import { NextResponse } from 'next/server';
import { createClient } from '@/lib/supabase/server';

function genCode(): string {
  // Código de 6 caracteres alfanuméricos en mayúscula
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
      // Borramos chat_id viejo por si re-link
      telegram_chat_id: null,
    })
    .select()
    .single();

  if (error) return NextResponse.json({ error: error.message }, { status: 500 });
  return NextResponse.json({ code, settings: data });
}

export async function DELETE() {
  // Para "desvincular" Telegram
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
```

Commit: `feat(api): generar código de vinculación de Telegram`

### Task B3.3: Webhook de Telegram

El bot manda un webhook a nuestra app cuando un usuario le habla. Si manda un código válido, vinculamos el chat_id.

**Files:**
- Create: `app/api/telegram/webhook/route.ts`

```ts
import { NextResponse } from 'next/server';
import { createServiceClient } from '@/lib/supabase/server';

interface TelegramUpdate {
  message?: {
    chat: { id: number };
    from?: { first_name?: string };
    text?: string;
  };
}

export async function POST(req: Request) {
  // Verificación de secret
  const expected = process.env.TELEGRAM_WEBHOOK_SECRET;
  const provided = req.headers.get('x-telegram-bot-api-secret-token');
  if (!expected || provided !== expected) {
    return NextResponse.json({ error: 'forbidden' }, { status: 403 });
  }

  const update: TelegramUpdate = await req.json().catch(() => ({}));
  const msg = update.message;
  if (!msg || !msg.text) return NextResponse.json({ ok: true });

  const text = msg.text.trim();
  const chatId = String(msg.chat.id);
  const firstName = msg.from?.first_name || 'amigo';

  // Importamos el sender adentro para tener envs cargadas
  const { sendTelegramMessage } = await import('@/lib/telegram');

  if (text === '/start') {
    await sendTelegramMessage(chatId,
      `👋 ¡Hola ${firstName}! Soy el bot de Plan de Pagos Familiar.\n\n` +
      'Para vincular este chat con tu cuenta, andá a *Configuración → Avisos* en la web, click en "Vincular Telegram", y mandame el código de 6 caracteres que te muestre.',
      { parseMode: 'Markdown' }
    );
    return NextResponse.json({ ok: true });
  }

  // Si parece un código de vinculación (6 alfanuméricos en mayúscula)
  const codeMatch = text.toUpperCase().match(/^[A-Z0-9]{6}$/);
  if (codeMatch) {
    const code = codeMatch[0];
    const supabase = createServiceClient();
    const { data: row } = await supabase
      .from('user_settings')
      .select('user_id')
      .eq('telegram_link_code', code)
      .maybeSingle();

    if (!row) {
      await sendTelegramMessage(chatId, '❌ Código inválido. Generá uno nuevo en la web y volvé a probar.');
      return NextResponse.json({ ok: true });
    }

    // Vincular: guardamos chat_id y limpiamos código
    await supabase
      .from('user_settings')
      .update({ telegram_chat_id: chatId, telegram_link_code: null })
      .eq('user_id', row.user_id);

    await sendTelegramMessage(chatId,
      '✅ ¡Listo! Telegram vinculado. Vas a recibir recordatorios de tus pagos por acá.',
    );
    return NextResponse.json({ ok: true });
  }

  await sendTelegramMessage(chatId, 'No entendí. Mandame `/start` para ver las instrucciones.', { parseMode: 'Markdown' });
  return NextResponse.json({ ok: true });
}
```

**IMPORTANTE:** registrar el webhook en Telegram. Esto se hace una sola vez (manual del usuario):

```bash
curl -F "url=https://pagos-familia-psi.vercel.app/api/telegram/webhook" \
     -F "secret_token=<TELEGRAM_WEBHOOK_SECRET>" \
     "https://api.telegram.org/bot<TELEGRAM_BOT_TOKEN>/setWebhook"
```

Esto se ejecuta como parte de Phase B5.

También: el middleware de auth bloquea `/api/telegram/webhook` (porque solo `/api/auth` está exento). Hay que agregarlo a la lista de paths públicos:

**Files:**
- Modify: `lib/supabase/middleware.ts`

Cambiar:
```ts
const isPublic =
  url.pathname.startsWith('/login') ||
  url.pathname.startsWith('/auth') ||
  url.pathname.startsWith('/api/auth');
```

Por:
```ts
const isPublic =
  url.pathname.startsWith('/login') ||
  url.pathname.startsWith('/auth') ||
  url.pathname.startsWith('/api/auth') ||
  url.pathname.startsWith('/api/telegram/webhook');
```

Commit: `feat(api): webhook de Telegram para vincular chat con código`

### Task B3.4: UI — sección "Avisos" en Settings

**Files:**
- Modify: `app/(app)/settings/page.tsx`
- Create: `components/settings/notifications-settings.tsx`

Modificar `settings/page.tsx` para agregar la nueva sección antes del bloque "Próximamente":

```tsx
import { CategoriesSettings } from '@/components/settings/categories-settings';
import { NotificationsSettings } from '@/components/settings/notifications-settings';

export default function SettingsPage() {
  return (
    <div className="space-y-8">
      <div>
        <h1 className="text-3xl font-bold">Configuración</h1>
        <p className="mt-1 text-slate-600 dark:text-slate-400">
          Gestioná las categorías y los avisos.
        </p>
      </div>

      <section className="space-y-4">
        <h2 className="text-xl font-semibold">Categorías</h2>
        <CategoriesSettings />
      </section>

      <section className="space-y-4">
        <h2 className="text-xl font-semibold">Avisos</h2>
        <NotificationsSettings />
      </section>
    </div>
  );
}
```

Crear `components/settings/notifications-settings.tsx`:

```tsx
'use client';

import { useEffect, useState } from 'react';
import { Mail, MessageCircle, Check, X, Copy } from 'lucide-react';
import { Button } from '@/components/ui/button';
import { Input } from '@/components/ui/input';
import { Label } from '@/components/ui/label';
import { toast } from 'sonner';

interface UserSettings {
  user_id: string;
  notification_email: string | null;
  telegram_chat_id: string | null;
  telegram_link_code: string | null;
  receives_reminders: boolean;
}

const cardClass = 'rounded-xl border bg-white dark:bg-slate-900 dark:border-slate-800 p-4';

export function NotificationsSettings() {
  const [settings, setSettings] = useState<UserSettings | null>(null);
  const [loading, setLoading] = useState(true);
  const [emailDraft, setEmailDraft] = useState('');
  const [savingEmail, setSavingEmail] = useState(false);
  const [generatingCode, setGeneratingCode] = useState(false);
  const [unlinking, setUnlinking] = useState(false);

  useEffect(() => {
    fetch('/api/settings').then(r => r.json()).then(d => {
      setSettings(d);
      setEmailDraft(d.notification_email ?? '');
      setLoading(false);
    });
  }, []);

  async function saveEmail() {
    setSavingEmail(true);
    const res = await fetch('/api/settings', {
      method: 'PATCH',
      headers: { 'Content-Type': 'application/json' },
      body: JSON.stringify({ notification_email: emailDraft.trim() || null }),
    });
    if (res.ok) {
      const d = await res.json();
      setSettings(d);
      toast.success('Email guardado');
    } else {
      toast.error('Error al guardar el email');
    }
    setSavingEmail(false);
  }

  async function toggleReminders() {
    if (!settings) return;
    const next = !settings.receives_reminders;
    const res = await fetch('/api/settings', {
      method: 'PATCH',
      headers: { 'Content-Type': 'application/json' },
      body: JSON.stringify({ receives_reminders: next }),
    });
    if (res.ok) {
      const d = await res.json();
      setSettings(d);
      toast.success(next ? 'Avisos activados' : 'Avisos desactivados');
    } else {
      toast.error('Error');
    }
  }

  async function generateCode() {
    setGeneratingCode(true);
    const res = await fetch('/api/settings/telegram-code', { method: 'POST' });
    if (res.ok) {
      const d = await res.json();
      setSettings(d.settings);
      toast.success('Código generado');
    } else {
      toast.error('Error al generar código');
    }
    setGeneratingCode(false);
  }

  async function unlink() {
    if (!confirm('¿Desvincular Telegram?')) return;
    setUnlinking(true);
    const res = await fetch('/api/settings/telegram-code', { method: 'DELETE' });
    if (res.ok) {
      setSettings(s => s ? { ...s, telegram_chat_id: null, telegram_link_code: null } : s);
      toast.success('Telegram desvinculado');
    }
    setUnlinking(false);
  }

  function copyCode() {
    if (settings?.telegram_link_code) {
      navigator.clipboard.writeText(settings.telegram_link_code);
      toast.success('Código copiado');
    }
  }

  if (loading || !settings) return <p className="text-slate-500">Cargando...</p>;

  return (
    <div className="space-y-4">
      <button
        type="button"
        onClick={toggleReminders}
        className="flex items-center justify-between rounded-lg border bg-white dark:bg-slate-900 dark:border-slate-700 p-4 w-full text-left hover:bg-slate-50 dark:hover:bg-slate-800/40 transition-colors"
        role="switch"
        aria-checked={settings.receives_reminders}
      >
        <div>
          <p className="font-medium">Recibir avisos automáticos</p>
          <p className="text-xs text-slate-500 dark:text-slate-400">Te avisamos 7, 3 y 1 días antes de cada vencimiento.</p>
        </div>
        <span className={`relative inline-flex h-6 w-11 shrink-0 items-center rounded-full transition-colors ${settings.receives_reminders ? 'bg-blue-600' : 'bg-slate-300 dark:bg-slate-700'}`} aria-hidden>
          <span className={`inline-block h-5 w-5 rounded-full bg-white shadow transition-transform ${settings.receives_reminders ? 'translate-x-5' : 'translate-x-0.5'}`} />
        </span>
      </button>

      <div className={cardClass}>
        <div className="flex items-center gap-2 mb-3">
          <Mail className="h-5 w-5 text-blue-600" />
          <h3 className="font-medium">Email</h3>
        </div>
        <p className="text-xs text-slate-500 dark:text-slate-400 mb-3">A qué dirección te llegan los avisos por mail.</p>
        <div className="flex flex-col sm:flex-row gap-2">
          <Input type="email" value={emailDraft} onChange={e => setEmailDraft(e.target.value)} placeholder="tu@email.com" />
          <Button onClick={saveEmail} disabled={savingEmail || emailDraft === (settings.notification_email ?? '')}>
            {savingEmail ? 'Guardando...' : 'Guardar'}
          </Button>
        </div>
      </div>

      <div className={cardClass}>
        <div className="flex items-center gap-2 mb-3">
          <MessageCircle className="h-5 w-5 text-blue-600" />
          <h3 className="font-medium">Telegram</h3>
          {settings.telegram_chat_id && (
            <span className="ml-auto inline-flex items-center gap-1 text-xs text-emerald-600 dark:text-emerald-400">
              <Check className="h-3.5 w-3.5" /> Vinculado
            </span>
          )}
        </div>

        {settings.telegram_chat_id ? (
          <>
            <p className="text-xs text-slate-500 dark:text-slate-400 mb-3">Telegram está vinculado y vas a recibir avisos por ahí.</p>
            <Button variant="outline" onClick={unlink} disabled={unlinking} className="text-red-600 dark:text-red-400 border-red-200 dark:border-red-900/50">
              <X className="h-4 w-4 mr-1" /> Desvincular
            </Button>
          </>
        ) : settings.telegram_link_code ? (
          <>
            <p className="text-sm text-slate-600 dark:text-slate-400 mb-2">Tu código:</p>
            <div className="flex items-center gap-2 mb-3">
              <code className="flex-1 px-3 py-2 rounded-md bg-slate-100 dark:bg-slate-800 text-lg font-mono tracking-wider text-center">
                {settings.telegram_link_code}
              </code>
              <Button variant="outline" onClick={copyCode}><Copy className="h-4 w-4" /></Button>
            </div>
            <ol className="text-sm text-slate-600 dark:text-slate-400 space-y-1 list-decimal list-inside">
              <li>Abrí Telegram, buscá el bot (te pasamos el username después).</li>
              <li>Mandale <code className="text-xs bg-slate-100 dark:bg-slate-800 px-1 rounded">/start</code></li>
              <li>Después mandale el código de arriba.</li>
              <li>Recargá esta página para confirmar.</li>
            </ol>
          </>
        ) : (
          <>
            <p className="text-xs text-slate-500 dark:text-slate-400 mb-3">Vinculá tu Telegram para recibir avisos por ahí también.</p>
            <Button onClick={generateCode} disabled={generatingCode}>
              {generatingCode ? 'Generando...' : 'Vincular Telegram'}
            </Button>
          </>
        )}
      </div>
    </div>
  );
}
```

Commit: `feat(settings): UI de avisos (email + vincular Telegram)`

---

## Phase B4 — Script de recordatorios + GitHub Action

### Task B4.1: Script `scripts/send-reminders.ts`

**Files:**
- Create: `scripts/send-reminders.ts`
- Modify: `package.json` (script + tsx dep)

Primero agregar `tsx` para correr TS:

```bash
npm install -D tsx
```

Y un script en `package.json`:
```json
"scripts": {
  ...
  "send-reminders": "tsx scripts/send-reminders.ts"
}
```

Crear `scripts/send-reminders.ts`:

```ts
/**
 * Cron diario: lee pagos en ventana 7/3/1/0, manda Email + Telegram al usuario configurado.
 * Anti-duplicado vía notification_log (UNIQUE constraint).
 *
 * Run: npm run send-reminders
 * Env required: NEXT_PUBLIC_SUPABASE_URL, SUPABASE_SERVICE_ROLE_KEY, RESEND_API_KEY,
 *               RESEND_FROM_EMAIL, TELEGRAM_BOT_TOKEN, NEXT_PUBLIC_APP_URL
 */
import { createClient } from '@supabase/supabase-js';
import { format } from 'date-fns';

import type { Payment, Category } from '../lib/types';
import { shouldNotify, NOTIFICATION_WINDOWS } from '../lib/notifications';
import { sendReminderEmail } from '../lib/email';
import { sendReminderTelegram } from '../lib/telegram';

interface UserSettingsRow {
  user_id: string;
  notification_email: string | null;
  telegram_chat_id: string | null;
  receives_reminders: boolean;
}

async function main() {
  const supabaseUrl = process.env.NEXT_PUBLIC_SUPABASE_URL;
  const serviceKey = process.env.SUPABASE_SERVICE_ROLE_KEY;
  const appUrl = process.env.NEXT_PUBLIC_APP_URL || 'https://pagos-familia-psi.vercel.app';
  if (!supabaseUrl || !serviceKey) throw new Error('Faltan SUPABASE env vars');

  const supabase = createClient(supabaseUrl, serviceKey, {
    auth: { autoRefreshToken: false, persistSession: false },
  });

  // Hoy en zona horaria UYT (UTC-3, sin DST)
  const now = new Date();
  const uytNow = new Date(now.getTime() - 3 * 60 * 60 * 1000);
  const today = format(uytNow, 'yyyy-MM-dd');
  console.log(`[send-reminders] today=${today}`);

  // 1. Subscriptores activos
  const { data: subs, error: subsErr } = await supabase
    .from('user_settings')
    .select('user_id, notification_email, telegram_chat_id, receives_reminders')
    .eq('receives_reminders', true);
  if (subsErr) throw subsErr;
  if (!subs || subs.length === 0) {
    console.log('[send-reminders] no subscribers, exiting');
    return;
  }
  console.log(`[send-reminders] ${subs.length} subscribers`);

  // 2. Pagos a notificar
  const { data: payments, error: pErr } = await supabase
    .from('payments')
    .select('*, category:categories(*)')
    .eq('status', 'pendiente')
    .eq('notify_enabled', true);
  if (pErr) throw pErr;
  if (!payments || payments.length === 0) {
    console.log('[send-reminders] no pending payments, exiting');
    return;
  }

  const candidates = payments
    .map((p) => ({ p, w: shouldNotify(p as Payment, today, { returnWindow: true }) }))
    .filter((x) => x.w !== null) as { p: Payment & { category: Category | null }; w: number }[];
  console.log(`[send-reminders] ${candidates.length} payments in notification window`);

  let sent = 0, failed = 0, skipped = 0;
  for (const { p, w } of candidates) {
    for (const sub of subs as UserSettingsRow[]) {
      const channels: ('email' | 'telegram')[] = [];
      if (sub.notification_email) channels.push('email');
      if (sub.telegram_chat_id) channels.push('telegram');

      for (const ch of channels) {
        // Anti-dup: si ya hay log success=true para este (payment, window, due_date, channel), skip
        const { data: existing } = await supabase
          .from('notification_log')
          .select('id, success')
          .eq('payment_id', p.id)
          .eq('window_days', w)
          .eq('due_date', p.due_date)
          .eq('channel', ch)
          .eq('success', true)
          .maybeSingle();
        if (existing) {
          skipped++;
          continue;
        }

        try {
          if (ch === 'email' && sub.notification_email) {
            await sendReminderEmail({ to: sub.notification_email, payment: p, windowDays: w, appUrl });
          } else if (ch === 'telegram' && sub.telegram_chat_id) {
            await sendReminderTelegram({ chatId: sub.telegram_chat_id, payment: p, windowDays: w });
          }
          await supabase.from('notification_log').insert({
            payment_id: p.id, window_days: w, due_date: p.due_date, channel: ch, success: true,
          });
          sent++;
          console.log(`[send-reminders] sent ${ch} for ${p.name} (window=${w})`);
        } catch (e) {
          const msg = e instanceof Error ? e.message : String(e);
          console.error(`[send-reminders] FAIL ${ch} for ${p.name}: ${msg}`);
          await supabase.from('notification_log').insert({
            payment_id: p.id, window_days: w, due_date: p.due_date, channel: ch, success: false, error_message: msg,
          });
          failed++;
        }
      }
    }
  }

  console.log(`[send-reminders] done. sent=${sent} failed=${failed} skipped=${skipped}`);
}

main().catch((e) => {
  console.error(e);
  process.exit(1);
});
```

Commit: `feat(cron): script send-reminders.ts`

### Task B4.2: GitHub Action diario

**Files:**
- Create: `.github/workflows/reminders.yml`

```yaml
name: Daily Reminders

on:
  schedule:
    - cron: '0 12 * * *'  # 12:00 UTC = 09:00 UYT (Uruguay UTC-3 sin DST)
  workflow_dispatch:       # permitir disparo manual desde la UI

jobs:
  send-reminders:
    runs-on: ubuntu-latest
    steps:
      - uses: actions/checkout@v4

      - name: Setup Node
        uses: actions/setup-node@v4
        with:
          node-version: '20'
          cache: 'npm'

      - name: Install deps
        run: npm ci

      - name: Run send-reminders
        env:
          NEXT_PUBLIC_SUPABASE_URL: ${{ secrets.NEXT_PUBLIC_SUPABASE_URL }}
          SUPABASE_SERVICE_ROLE_KEY: ${{ secrets.SUPABASE_SERVICE_ROLE_KEY }}
          RESEND_API_KEY: ${{ secrets.RESEND_API_KEY }}
          RESEND_FROM_EMAIL: ${{ secrets.RESEND_FROM_EMAIL }}
          TELEGRAM_BOT_TOKEN: ${{ secrets.TELEGRAM_BOT_TOKEN }}
          NEXT_PUBLIC_APP_URL: ${{ secrets.NEXT_PUBLIC_APP_URL }}
        run: npm run send-reminders
```

Commit: `feat(ci): GitHub Action diaria a las 09:00 UYT para mandar recordatorios`

---

## Phase B5 — Backups semanales

### Task B5.1: Script `scripts/backup.ts`

**Files:**
- Create: `scripts/backup.ts`

```ts
/**
 * Backup semanal: exporta payments + categories + payment_history + user_settings
 * a backups/YYYY-MM-DD.json.
 *
 * Run: npm run backup
 */
import { createClient } from '@supabase/supabase-js';
import { writeFile, mkdir } from 'node:fs/promises';
import path from 'node:path';
import { format } from 'date-fns';

async function main() {
  const supabaseUrl = process.env.NEXT_PUBLIC_SUPABASE_URL;
  const serviceKey = process.env.SUPABASE_SERVICE_ROLE_KEY;
  if (!supabaseUrl || !serviceKey) throw new Error('Faltan SUPABASE env vars');

  const supabase = createClient(supabaseUrl, serviceKey, {
    auth: { autoRefreshToken: false, persistSession: false },
  });

  const tables = ['payments', 'categories', 'payment_history', 'user_settings'];
  const backup: Record<string, unknown[]> = { __meta: [{ generated_at: new Date().toISOString() }] };

  for (const t of tables) {
    const { data, error } = await supabase.from(t).select('*');
    if (error) throw new Error(`error reading ${t}: ${error.message}`);
    backup[t] = data ?? [];
    console.log(`[backup] ${t}: ${data?.length ?? 0} filas`);
  }

  const today = format(new Date(), 'yyyy-MM-dd');
  const dir = path.join(process.cwd(), 'backups');
  await mkdir(dir, { recursive: true });
  const file = path.join(dir, `${today}.json`);
  await writeFile(file, JSON.stringify(backup, null, 2), 'utf8');
  console.log(`[backup] guardado en ${file}`);
}

main().catch((e) => {
  console.error(e);
  process.exit(1);
});
```

Agregar `"backup": "tsx scripts/backup.ts"` a package.json scripts.

Commit: `feat(backup): script semanal que exporta tablas a backups/`

### Task B5.2: GitHub Action de backup semanal (con commit)

**Files:**
- Create: `.github/workflows/backup.yml`

```yaml
name: Weekly Backup

on:
  schedule:
    - cron: '0 3 * * 0'  # Domingos 03:00 UTC
  workflow_dispatch:

permissions:
  contents: write  # necesario para que el bot pueda commitear

jobs:
  backup:
    runs-on: ubuntu-latest
    steps:
      - uses: actions/checkout@v4

      - name: Setup Node
        uses: actions/setup-node@v4
        with:
          node-version: '20'
          cache: 'npm'

      - name: Install deps
        run: npm ci

      - name: Run backup
        env:
          NEXT_PUBLIC_SUPABASE_URL: ${{ secrets.NEXT_PUBLIC_SUPABASE_URL }}
          SUPABASE_SERVICE_ROLE_KEY: ${{ secrets.SUPABASE_SERVICE_ROLE_KEY }}
        run: npm run backup

      - name: Commit backup
        run: |
          git config user.name "github-actions[bot]"
          git config user.email "github-actions[bot]@users.noreply.github.com"
          git add backups/
          if git diff --staged --quiet; then
            echo "No changes to commit"
          else
            git commit -m "chore(backup): backup semanal $(date -u +%Y-%m-%d)"
            git push
          fi
```

Commit: `feat(ci): GitHub Action semanal de backup que commitea a backups/`

---

## Phase B6 — Setup final + prueba end-to-end (manual)

### Task B6.1: Registrar webhook de Telegram

Una vez que la app está en producción con todas las env vars, registrar el webhook (manual del usuario):

```bash
curl -F "url=https://pagos-familia-psi.vercel.app/api/telegram/webhook" \
     -F "secret_token=<TELEGRAM_WEBHOOK_SECRET>" \
     "https://api.telegram.org/bot<TELEGRAM_BOT_TOKEN>/setWebhook"
```

Verificar:
```bash
curl "https://api.telegram.org/bot<TELEGRAM_BOT_TOKEN>/getWebhookInfo"
```

Tendría que mostrar la URL configurada y `last_error_date: null`.

### Task B6.2: Vincular email + Telegram desde la app

1. Ir a Configuración → Avisos
2. Toggle "Recibir avisos automáticos" ON
3. Ingresar email (default es el del login) → Guardar
4. Click "Vincular Telegram" → muestra código
5. Abrir Telegram → buscar el bot (username configurado en B0.2) → /start → mandar el código
6. La web debería mostrar "Vinculado" después de recargar

### Task B6.3: Probar el cron manualmente

GitHub → repo → Actions tab → "Daily Reminders" → "Run workflow" → main → Run.

Esperar ~1 min. Ver el log:
- Si hay pagos en ventana, debería decir `sent=N`
- Verificar que llega el email + Telegram

Si querés forzar un pago en ventana 0 para test: editar un pago existente, ponerle vencimiento = hoy, correr el workflow.

### Task B6.4: Probar el backup manualmente

GitHub → Actions → "Weekly Backup" → Run workflow.

Después de ~30s: en el repo, debería haber un nuevo commit en `backups/YYYY-MM-DD.json` con todos los datos.

---

## Resumen final

Al terminar Plan B:

- ✅ La app manda recordatorios automáticos por email + Telegram a 7, 3, 1 y 0 días.
- ✅ El usuario puede vincular su email y Telegram desde la app.
- ✅ Cada noche a las 09:00 UYT corre el cron y manda los avisos del día.
- ✅ Cada domingo a las 03:00 UTC se hace un backup en GitHub.
- ✅ La app es 100% funcional y autónoma — Gonzalo no tiene que hacer nada.

**Lo que está fuera del alcance (y queda para v3 si querés):**
- WhatsApp oficial (requiere trámite y dominio).
- Multi-destinatario (por ahora solo Gonzalo recibe avisos).
- Avisos a "dueño del pago" según quién lo creó.
- Dashboard de estadísticas / gráficos del historial.

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

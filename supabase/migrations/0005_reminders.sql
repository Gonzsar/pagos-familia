-- Recordatorios (cumpleaños). Se repiten todos los años: guardamos día y mes,
-- y opcionalmente el año de nacimiento para mostrar la edad.

create table public.reminders (
  id uuid primary key default gen_random_uuid(),
  name text not null,
  day int not null check (day between 1 and 31),
  month int not null check (month between 1 and 12),
  birth_year int check (birth_year between 1900 and 2100),
  notes text,
  created_at timestamptz not null default now(),
  updated_at timestamptz not null default now()
);

alter table public.reminders enable row level security;

create policy "auth_all_reminders" on public.reminders
  for all using (auth.role() = 'authenticated')
  with check (auth.role() = 'authenticated');

create trigger reminders_set_updated_at
before update on public.reminders
for each row execute function public.set_updated_at();

-- ============================================================================
-- Migración: mover los cumpleaños que estaban cargados como "pagos"
-- (categoría "Cumpleaños") hacia la nueva tabla reminders, y limpiar.
-- ============================================================================

-- 1. Copiar a reminders (día y mes salen de la due_date guardada)
insert into public.reminders (name, day, month, notes)
select p.name,
       extract(day from p.due_date)::int,
       extract(month from p.due_date)::int,
       nullif(p.notes, '')
from public.payments p
join public.categories c on c.id = p.category_id
where lower(c.name) = 'cumpleaños';

-- 2. Borrar esos pagos (sus notification_log / payment_history caen por cascade)
delete from public.payments p
using public.categories c
where p.category_id = c.id and lower(c.name) = 'cumpleaños';

-- 3. Borrar la categoría "Cumpleaños"
delete from public.categories where lower(name) = 'cumpleaños';

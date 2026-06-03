-- Tabla de cuentas bancarias de proveedores + seed inicial.

create table public.accounts (
  id uuid primary key default gen_random_uuid(),
  provider text not null,
  account_name text not null,
  bank text not null check (bank in ('BROU', 'SCOTIA', 'ITAU')),
  account_type text,
  account_number text not null,
  position int not null default 0,
  created_at timestamptz not null default now(),
  updated_at timestamptz not null default now()
);

create index accounts_bank_position_idx on public.accounts (bank, position);

alter table public.accounts enable row level security;

create policy "auth_all_accounts" on public.accounts
  for all using (auth.role() = 'authenticated')
  with check (auth.role() = 'authenticated');

create trigger accounts_set_updated_at
before update on public.accounts
for each row execute function public.set_updated_at();

-- Seed con las 13 cuentas iniciales (grupadas por banco)
insert into public.accounts (provider, account_name, bank, account_type, account_number, position) values
  ('TRULYMAXX', 'TRULYMAX S.A', 'BROU', 'Caja Ahorro Dólares', '110 187 499 000 02', 1),
  ('FRIELECTRIC', 'REFRIGERACION FRIELECTRIC S.A', 'BROU', null, '001 547 032 000 01', 2),
  ('CHALAR', 'REFRISHOP S.A', 'BROU', null, '001 561 441 000 02', 3),
  ('CEGA', 'CEGA TEAM SRL', 'BROU', null, '110 143 783 000 04', 4),
  ('CCIAP', 'CCIAP', 'BROU', null, '001 532 412 000 05', 5),
  ('PAMPIN', 'PAMPIN Y CIA S.A', 'BROU', null, '001 548 969 000 01', 6),
  ('TOYIMA', 'TOYIMA', 'BROU', null, '001 566 902 000 07', 7),
  ('HERBI', 'ALEJANDRO BIA Y OTRO', 'BROU', null, '000 420 167 000 01', 8),
  ('ASPIRATUTO', 'ANALIZA RAFFAELLI', 'BROU', 'Caja Ahorro', '198 038 2756', 9),
  ('SCANTECH', 'HOSTING SA', 'SCOTIA', null, '03-3636 74700', 10),
  ('FIVISA', 'FIVISA', 'SCOTIA', 'Cuenta Corriente', '01-0589862500', 11),
  ('TORBUL (TRIZUR)', 'TRIZUR S.A', 'SCOTIA', 'Cuenta Corriente', '002-096 392 1700', 12),
  ('REFRIMAXX', 'REFRIMAXX SAS', 'ITAU', null, '2357192', 13);

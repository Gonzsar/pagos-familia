-- Migración: agregar flag count_in_totals para excluir pagos del total
-- Por defecto en true (todos los pagos existentes siguen sumando al total).

alter table public.payments
  add column if not exists count_in_totals boolean not null default true;

-- Migración: agregar paid_for_cycle a payments
-- Para pagos recurrentes, permite marcar el ciclo actual como pagado.
-- El valor guarda la due_date del ciclo que fue marcado pagado.
-- Cuando avanza el ciclo (effectiveDueDate != paid_for_cycle), vuelve a estar "no pagado".

alter table public.payments
  add column if not exists paid_for_cycle date;

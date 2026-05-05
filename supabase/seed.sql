insert into public.categories (name, icon, color, position) values
  ('Entretenimiento', '🎬', '#8B5CF6', 1),
  ('Empresa', '💼', '#2563EB', 2),
  ('Hogar y Servicios', '🏠', '#10B981', 3),
  ('Transporte', '🚗', '#F59E0B', 4),
  ('Otros', '🛒', '#64748B', 5)
on conflict (name) do nothing;

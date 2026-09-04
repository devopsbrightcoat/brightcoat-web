-- ---------------------------------------------------------------------------
-- BrightCoat Ops — datos iniciales
-- ---------------------------------------------------------------------------

-- Catálogo de tipos de servicio (nivel categoría), según el Excel de Control
-- de Cobros. El detalle (tamaño de unidad, notas) va en services.description.
insert into service_types (name, category) values
  ('Pintura',       'painting'),
  ('Limpieza',      'cleaning'),
  ('Make Ready',    'make_ready'),
  ('Reparaciones',  'repair'),
  ('Otro',          'other')
on conflict do nothing;

-- Propiedades detectadas en el Excel "Control de Cobros 2026" (las 7 hojas).
-- Solo se conoce el nombre por ahora — dirección y contacto quedan pendientes
-- hasta que Blanca/David los confirmen. Descomenta para precargarlas:
--
-- insert into properties (name, client_type, status) values
--   ('Debut Soco',  'multifamily', 'active'),
--   ('Zoey',        'multifamily', 'active'),
--   ('The Lola',    'multifamily', 'active'),
--   ('NEXUS',       'multifamily', 'active'),
--   ('MERRIMAN',    'multifamily', 'active'),
--   ('Urban East',  'multifamily', 'active'),
--   ('Wonderyard',  'multifamily', 'active')
-- on conflict do nothing;

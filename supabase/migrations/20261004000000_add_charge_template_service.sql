-- ---------------------------------------------------------------------------
-- BrightCoat Ops — liga cada "cobro fijo" (charge_templates) a un servicio
-- real del catálogo (service_types)
--
-- Hasta ahora charge_templates.name era texto libre (el label del form
-- decía "Servicio" pero no estaba ligado al catálogo real de
-- service_types) — David pidió poder linkear un servicio de verdad.
--
-- Esta migración:
--   1. Agrega service_type_id a charge_templates (nullable — los cobros
--      fijos existentes no tienen servicio asignado; Javier puede
--      asignárselos a mano desde el Table Editor si quiere, no es
--      obligatorio para que la app siga funcionando).
--   2. `name` se mantiene tal cual (ahora funciona como la descripción del
--      cobro fijo, ej. "Cuota de administración" — el form ya lo etiqueta
--      como "Descripción" en vez de "Servicio").
--   3. Al generar el cobro real desde una plantilla, service_type_id viaja
--      a charges.service_type_id igual que un cobro generado desde
--      Horarios — por eso a partir de ahora SÍ puede chocar con el índice
--      único de charges si ya existe un cobro para esa misma
--      propiedad+unidad+servicio+fecha (ver la migración de schedule_id en
--      charges, que ajusta ese índice).
-- ---------------------------------------------------------------------------

alter table charge_templates
  add column if not exists service_type_id uuid references service_types(id) on delete set null;

create index if not exists charge_templates_service_type_id_idx on charge_templates (service_type_id);

comment on column charge_templates.service_type_id is 'Tipo de servicio del catálogo ligado a este cobro fijo (nullable — los cobros fijos creados antes de esta migración no tienen uno asignado). Se copia a charges.service_type_id al generar el cobro real.';

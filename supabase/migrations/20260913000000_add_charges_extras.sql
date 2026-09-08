-- ---------------------------------------------------------------------------
-- BrightCoat Ops — Extras de un cobro como JSON, sin tabla nueva
--
-- Antes de unificar los cobros (20260912000000_unify_charges.sql), los
-- "extras" de un cobro capturado desde Horarios (cargos adicionales:
-- descripción + costo) vivían en su propia tabla `schedule_charge_extras`.
-- El cliente pidió que, en vez de resucitar una tabla aparte, los extras se
-- guarden como un arreglo JSON directamente en `charges`.
--
-- Formato de `charges.extras`: [{"description": "...", "amount": 123.45}, ...]
-- Los cobros importados de Excel siempre quedan con extras = '[]' (la
-- plantilla no captura cargos adicionales); solo los generados desde
-- Horarios pueden traer extras.
-- ---------------------------------------------------------------------------

alter table charges
  add column if not exists extras jsonb not null default '[]'::jsonb;

comment on column charges.extras is
  'Cargos adicionales del cobro como arreglo JSON: [{"description": "...", "amount": 123.45}, ...]. Se captura desde Horarios al finalizar un servicio; los cobros de Excel quedan en [].';

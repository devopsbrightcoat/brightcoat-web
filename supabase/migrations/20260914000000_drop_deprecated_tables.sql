-- ---------------------------------------------------------------------------
-- BrightCoat Ops — Formalizar el drop de tablas/columnas deprecadas
--
-- Estas tablas ya no las usa el código (y en producción ya se habían
-- borrado a mano, fuera del control de migraciones) — esta migración solo
-- deja el historial de migraciones consistente con el esquema real, para
-- que levantar una base de datos nueva desde cero (staging, otro
-- ambiente) reproduzca exactamente lo que hay hoy en producción:
--
--   - services (20260904000000_init_core_schema.sql): reemplazada por el
--     modelo de Horarios (schedules) — el módulo de Trabajos se eliminó
--     de la app.
--   - schedule_charges / schedule_charge_extras
--     (20260910000000_add_schedules.sql): reemplazadas por
--     `charges.service_type_id` + `charges.extras` — ver
--     20260912000000_unify_charges.sql y
--     20260913000000_add_charges_extras.sql. Los cobros de horarios
--     finalizados ahora se insertan directamente en `charges`.
--
-- `drop table services cascade` se lleva de encuentro el FK
-- `expenses.service_id -> services(id)` (era `on delete set null`, así que
-- ya no tenía filas dependiendo de que la tabla siguiera viva). Esa columna
-- (`expenses.service_id`) nunca se llegó a usar desde que se quitó
-- Trabajos — ningún código la lee ni la escribe — así que se elimina
-- también, junto con `serviceId` en el tipo `Expense` del frontend.
-- ---------------------------------------------------------------------------

drop table if exists schedule_charge_extras;
drop table if exists schedule_charges;
drop table if exists services cascade;

alter table expenses drop column if exists service_id;

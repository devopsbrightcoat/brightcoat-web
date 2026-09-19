-- ---------------------------------------------------------------------------
-- BrightCoat Ops — liga cada cobro generado desde Horarios a su horario
-- (charges.schedule_id), en vez de identificarlo por
-- propiedad+unidad+servicio+fecha
--
-- Contexto (pedido de David): con el índice único actual
-- (charges_unique_identity, de 20260912000000_unify_charges.sql) dos
-- horarios DISTINTOS que comparten propiedad+unidad+mismo tipo de
-- servicio+misma fecha no pueden cobrarse ambos — el segundo choca contra
-- el primero. Y al hacer clic en "Entregado" sobre un horario que YA tiene
-- cobro, la app no tiene forma de saber que hay que EDITAR ese cobro en vez
-- de intentar crear uno nuevo (que también choca contra el índice), porque
-- el cobro nunca quedó ligado al horario que lo generó, solo a esos 4
-- campos.
--
-- Esta migración:
--   1. Agrega charges.schedule_id (nullable — los cobros de Excel y los
--      cobros fijos nunca vienen de un horario; on delete set null porque
--      Horarios permite eliminar un horario y NO queremos borrar en
--      cascada un cobro/registro financiero ya capturado).
--   2. Rellena schedule_id para los cobros ya generados desde Horarios,
--      cruzando por la misma combinación que usaba el índice viejo — en
--      este punto de la migración esa combinación todavía es única, así
--      que el cruce no es ambiguo.
--   3. Reemplaza el índice único viejo (propiedad+unidad+servicio+fecha,
--      que aplicaba a CUALQUIER cobro con esos datos) por uno que solo
--      cubre schedule_id — sigue siendo imposible que un mismo horario
--      termine con dos cobros, pero ya no bloquea a dos horarios distintos
--      que coincidan en propiedad/unidad/servicio/fecha.
--
-- Los cobros fijos (is_fixed=true) y los importados de Excel no tenían
-- protección de duplicados antes de esta migración salvo cuando un cobro
-- fijo empezó a traer service_type_id (ver
-- 20261004000000_add_charge_template_service.sql) — a partir de ahora
-- tampoco la tienen contra sí mismos, ya que el índice viejo se elimina por
-- completo. Si en algún momento se pide evitar cobros fijos duplicados,
-- eso es un índice aparte, no parte de este cambio.
-- ---------------------------------------------------------------------------

alter table charges
  add column if not exists schedule_id uuid references schedules(id) on delete set null;

update charges c
set schedule_id = s.id
from schedules s
where c.schedule_id is null
  and c.is_fixed = false
  and c.service_type_id is not null
  and c.generated_date is not null
  and s.status = 'delivered'
  and s.property_id = c.property_id
  and coalesce(s.unit_label, '') = coalesce(c.unit_label, '')
  and s.service_type_id = c.service_type_id
  and s.scheduled_date = c.generated_date;

drop index if exists charges_unique_identity;

create unique index if not exists charges_schedule_id_idx
  on charges (schedule_id)
  where schedule_id is not null;

comment on column charges.schedule_id is 'Horario (schedules) que generó este cobro — solo presente en cobros creados desde Horarios al marcar "Entregado". Único cuando está presente: un horario nunca tiene más de un cobro. on delete set null porque Horarios permite eliminar un horario sin borrar el cobro ya capturado.';

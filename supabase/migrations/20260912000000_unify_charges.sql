-- ---------------------------------------------------------------------------
-- BrightCoat Ops — Unificar cobros en una sola tabla (`charges`)
--
-- Hasta ahora había dos tablas de cobros con orígenes distintos:
--   - charges: importados desde la plantilla Excel ("Subidos a OPS" /
--     "Pendientes por Subir").
--   - schedule_charges (+ schedule_charge_extras): capturados a mano al
--     marcar un horario como "Entregado/Finalizado" en Horarios.
--
-- El cliente pidió unificarlos en una sola tabla, identificada de forma
-- única por propiedad + unidad + tipo de servicio + fecha, de modo que no
-- se pueda registrar dos veces un servicio/cobro con esos mismos datos.
--
-- Esta migración:
--   1. Agrega `service_type_id` a `charges` (nullable — los cobros
--      importados de Excel no traen tipo de servicio, la plantilla no lo
--      captura; solo los generados desde Horarios lo tendrán siempre).
--   2. Agrega un índice único PARCIAL que solo aplica cuando
--      service_type_id y generated_date están presentes — es decir, protege
--      contra duplicados en los cobros generados desde Horarios (que
--      siempre traen ambos datos) sin afectar los cobros de Excel que no
--      los tengan.
--   3. Copia los `schedule_charges` existentes (con sus extras sumados) a
--      `charges`, para no perder cobros ya capturados desde Horarios.
--
-- Las tablas `schedule_charges` / `schedule_charge_extras` quedan en
-- desuso a partir de esta migración (el código ya no les escribe ni las
-- lee) pero NO se borran aquí — quedan como respaldo de los datos
-- originales. Una vez confirmado en la app que los cobros migrados se ven
-- bien en Cobros, se pueden borrar manualmente con:
--
--   drop table if exists schedule_charge_extras;
--   drop table if exists schedule_charges;
-- ---------------------------------------------------------------------------

alter table charges
  add column if not exists service_type_id uuid references service_types(id) on delete set null;

create unique index if not exists charges_unique_identity
  on charges (property_id, (coalesce(unit_label, '')), service_type_id, generated_date)
  where service_type_id is not null and generated_date is not null;

comment on index charges_unique_identity is
  'Evita duplicar un cobro para la misma propiedad + unidad + tipo de servicio + fecha. Solo aplica cuando service_type_id y generated_date están presentes (siempre el caso para cobros generados desde Horarios).';

insert into charges (property_id, unit_label, service_type_id, amount, status, generated_date, notes)
select
  s.property_id,
  s.unit_label,
  s.service_type_id,
  sc.total_cost + coalesce(extras.total_extra, 0),
  'pending',
  s.scheduled_date,
  nullif(sc.notes, '')
from schedule_charges sc
join schedules s on s.id = sc.schedule_id
left join (
  select schedule_charge_id, sum(amount) as total_extra
  from schedule_charge_extras
  group by schedule_charge_id
) extras on extras.schedule_charge_id = sc.id
on conflict (property_id, (coalesce(unit_label, '')), service_type_id, generated_date)
  where service_type_id is not null and generated_date is not null
  do nothing;

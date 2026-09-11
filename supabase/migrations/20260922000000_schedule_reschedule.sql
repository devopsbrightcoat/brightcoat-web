-- ---------------------------------------------------------------------------
-- BrightCoat Ops — reagendar horarios
--
-- David pidió poder reagendar un horario: cambiarlo de fecha sin perder el
-- registro original. En vez de solo actualizar scheduled_date, se agrega un
-- nuevo estatus 'rescheduled' — el horario viejo se queda con ese estatus
-- (bloqueado: no se puede editar, eliminar ni volver a cambiar de estatus,
-- igual que 'delivered') y apunta al horario nuevo vía rescheduled_to_id,
-- que se crea con la fecha nueva y el resto de los datos (propiedad/unidad/
-- servicio/empleado) copiados tal cual — ver rescheduleSchedule() en
-- src/lib/api.ts.
-- ---------------------------------------------------------------------------

alter table schedules drop constraint if exists schedules_status_check;
alter table schedules add constraint schedules_status_check
  check (status in ('pending', 'in_progress', 'delivered', 'cancelled', 'rescheduled'));

alter table schedules add column if not exists rescheduled_to_id uuid references schedules(id) on delete set null;

comment on column schedules.rescheduled_to_id is 'Si el horario fue reagendado, apunta al horario nuevo con la fecha nueva. El horario viejo queda con status = rescheduled y bloqueado (no se puede editar, eliminar ni cambiar de estatus).';

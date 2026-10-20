-- ---------------------------------------------------------------------------
-- BrightCoat Ops — Planillas de "cobro fijo"
--
-- Pedido de David: los servicios de cobro fijo (ej. limpieza de oficina
-- varias veces por semana, facturada una sola vez al mes con un cobro fijo
-- en Cobros — ver 20261006000000_schedules_fixed_charge.sql) nunca tienen
-- un cobro individual por trabajo. Como el "Cobro" de una planilla sale de
-- ese cobro individual, esas planillas se quedaban en "Pendiente" para
-- siempre (y contaban como "planillas pendientes de cobro").
--
-- is_fixed_charge marca la planilla como finalizada / incluida en un cobro
-- fijo: deja de contar como pendiente de cobro y no lleva Cobro propio
-- (amount queda en null). El pago al empleado (desglose) no cambia.
-- ---------------------------------------------------------------------------

alter table payroll_entries
  add column if not exists is_fixed_charge boolean not null default false;

comment on column payroll_entries.is_fixed_charge is 'La planilla es de un servicio de cobro fijo (se cobra una vez al mes en Cobros) — no lleva Cobro propio y no cuenta como pendiente de cobro.';

-- Planillas ya creadas a partir de un horario de cobro fijo: se marcan solas.
-- Si alguien les había puesto $0 como Cobro para quitar el "Pendiente", se
-- limpia ese $0 (no era un cobro real y hacía que la ganancia saliera
-- negativa).
update payroll_entries pe
  set is_fixed_charge = true,
      amount = case when pe.amount = 0 then null else pe.amount end
  from schedules s
  where pe.schedule_id = s.id
    and s.is_fixed_charge
    and not pe.is_fixed_charge;

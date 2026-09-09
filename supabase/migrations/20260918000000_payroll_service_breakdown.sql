-- ---------------------------------------------------------------------------
-- BrightCoat Ops — Planillas: desglose de servicio y campos obligatorios
--
-- Flujo real: Blanca recibe de un empleado "hoy trabajé en tal unidad, tal
-- propiedad, tal servicio" — con el pago completo del servicio y un
-- desglose de los sub-servicios/trabajos que lo componen, cada uno con su
-- propia descripción y costo. Ejemplo:
--
--   Servicio: "Vacante reparación tape and float"
--     1x 5X1 en cocina           135.00
--     1x 1X1 en cielo baño        25.00
--     1x 1X1 en lavandería        25.00
--
-- El desglose se usa para calcular, en la tabla de Planillas:
--   - Ventas   = suma de los montos del desglose
--   - Ganancia = Ventas - Pago (el campo `amount` ya existente)
-- Ninguno de los dos se guarda — se calculan en la app a partir del
-- desglose.
--
-- Esta migración:
--   1. Agrega `unit_label` (unidad) y `service_name` (nombre del servicio,
--      texto libre) a payroll_entries.
--   2. Crea `payroll_entry_items` — el desglose de cada planilla.
--   3. Hace obligatorios property_id, employee_id, unit_label y
--      service_name en payroll_entries (antes property_id/employee_id eran
--      opcionales) — cambia también sus FK de "on delete set null" a
--      "on delete restrict", ya que ahora no pueden quedar en null.
--   4. Quita la columna `description`, reemplazada por `service_name`.
--
-- Si ya existen filas en payroll_entries sin propiedad o empleado (por
-- ejemplo, migradas desde gastos de categoría 'labor' que no tenían esos
-- datos), el paso 3 falla con un error claro de Postgres — hay que
-- completar esos datos a mano (o borrar esas filas) antes de volver a
-- correr esta migración.
-- ---------------------------------------------------------------------------

alter table payroll_entries add column if not exists unit_label text;
alter table payroll_entries add column if not exists service_name text;

-- Backfill de filas existentes que no tengan estos campos nuevos, para que
-- el paso de "not null" de abajo no falle por datos cargados antes de este
-- cambio.
update payroll_entries set unit_label = 'N/A' where unit_label is null;
update payroll_entries set service_name = coalesce(nullif(trim(description), ''), 'Sin especificar') where service_name is null;

alter table payroll_entries alter column unit_label set not null;
alter table payroll_entries alter column service_name set not null;

alter table payroll_entries drop constraint if exists payroll_entries_property_id_fkey;
alter table payroll_entries add constraint payroll_entries_property_id_fkey
  foreign key (property_id) references properties(id) on delete restrict;
alter table payroll_entries alter column property_id set not null;

alter table payroll_entries drop constraint if exists payroll_entries_employee_id_fkey;
alter table payroll_entries add constraint payroll_entries_employee_id_fkey
  foreign key (employee_id) references employees(id) on delete restrict;
alter table payroll_entries alter column employee_id set not null;

alter table payroll_entries drop column if exists description;

comment on table payroll_entries is 'Planillas — pago de mano de obra por trabajo completo (propiedad + unidad + empleado + servicio, todos obligatorios). El desglose del servicio vive en payroll_entry_items; Ventas y Ganancia se calculan a partir de ahí, no se guardan.';
comment on column payroll_entries.amount is 'Pago al empleado por el servicio completo.';
comment on column payroll_entries.service_name is 'Nombre del servicio reportado por el empleado (texto libre, ej. "Vacante reparación tape and float").';

create table if not exists payroll_entry_items (
  id                uuid primary key default gen_random_uuid(),
  payroll_entry_id  uuid not null references payroll_entries(id) on delete cascade,
  description       text not null,
  amount            numeric(10, 2) not null,
  position          integer not null default 0,
  created_at        timestamptz not null default now()
);

comment on table payroll_entry_items is 'Desglose de sub-servicios de una planilla (payroll_entries) — descripción + costo de cada trabajo que compone el servicio completo. La suma de estos montos es la "Venta" de esa planilla.';

create index if not exists payroll_entry_items_entry_id_idx on payroll_entry_items (payroll_entry_id);

alter table payroll_entry_items enable row level security;

create policy "payroll_entry_items_all_authenticated" on payroll_entry_items
  for all to authenticated using (true) with check (true);

-- ---------------------------------------------------------------------------
-- BrightCoat Ops — tabla charges (plantilla "Cobros" por apartamento)
--
-- Basado en la plantilla-cobros.xlsx: una pestaña por propiedad, con dos
-- tablas lado a lado — "Cobros Subidos a OPS" (ya cobrado) y "Pendientes
-- por Subir / Cobrar" (falta cobrar/subir). A diferencia de `services`,
-- estas filas no están ligadas a un tipo de servicio ni a un trabajo
-- puntual — son solo el registro de cobro por unidad/apartamento, así que
-- viven en su propia tabla en vez de forzar un service_type_id falso.
--
-- status='paid'    = tabla izquierda "Cobros Subidos a OPS"
-- status='pending' = tabla derecha "Pendientes por Subir / Cobrar"
-- ---------------------------------------------------------------------------

create table if not exists charges (
  id             uuid primary key default gen_random_uuid(),
  property_id    uuid not null references properties(id) on delete restrict,
  unit_label     text,        -- "# Apartamento"
  description    text,        -- "Descripcion"
  amount         numeric(10, 2) not null,
  status         text not null default 'pending' check (status in ('pending', 'paid')),
  generated_date date,        -- "Fecha Cobro Generado" — solo cuando status = paid
  payroll_period text,        -- "Fecha / Quincena Planilla" — texto libre (fecha o "1-15 agosto")
  responsible    text,        -- "Responsable" — solo cuando status = pending
  notes          text,        -- "Notas / Observaciones"
  created_at     timestamptz not null default now(),
  updated_at     timestamptz not null default now()
);

comment on table charges is 'Cobros por unidad/apartamento (plantilla "Cobros"). status=paid = "Cobros Subidos a OPS"; status=pending = "Pendientes por Subir / Cobrar".';
comment on column charges.payroll_period is 'A qué quincena/periodo de planilla corresponde. Texto libre porque en la plantilla puede venir como fecha (AAAA-MM-DD) o como rango ("1-15 agosto").';

create index if not exists charges_property_id_idx on charges (property_id);
create index if not exists charges_status_idx      on charges (status);

create trigger charges_set_updated_at before update on charges
  for each row execute function set_updated_at();

alter table charges enable row level security;

create policy "charges_all_authenticated" on charges
  for all to authenticated using (true) with check (true);

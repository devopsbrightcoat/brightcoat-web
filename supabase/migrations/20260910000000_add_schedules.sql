-- ---------------------------------------------------------------------------
-- BrightCoat Ops — Horarios (scheduler semanal de servicios)
--
-- Basado en la llamada con David: una pantalla de horarios por semana
-- (lunes a domingo) donde cada fila es una unidad + servicio puntual,
-- asignado a un empleado en una propiedad, a una hora específica del día.
--
-- Al crear un horario desde el formulario se puede cargar varias unidades
-- de una vez para el mismo empleado/propiedad — pero eso es solo azúcar en
-- el formulario: cada unidad+servicio queda como su propia fila en
-- `schedules`, con su propio ciclo de vida de estatus.
--
-- Cuando un horario pasa a "delivered" (Entregado/Finalizado) hay que
-- capturar un cobro: costo total + notas + una lista abierta de "extras"
-- (descripción + costo adicional). Eso vive en schedule_charges (1 a 1 con
-- el horario) y schedule_charge_extras (muchos por cobro).
--
-- IMPORTANTE (decisión explícita con el cliente): estos cobros NO se
-- mezclan con la tabla `charges` (los "Cobros Subidos a OPS" del Excel) —
-- son conceptos separados por ahora. Más adelante habrá que ver cómo
-- cruzarlos/linkearlos para evitar duplicados y generar invoices, pero eso
-- se resuelve cuando llegue ese momento, no en esta migración.
-- ---------------------------------------------------------------------------

create table if not exists schedules (
  id              uuid primary key default gen_random_uuid(),
  property_id     uuid not null references properties(id) on delete restrict,
  unit_label      text,        -- "# Apartamento" / unidad puntual de esta visita
  service_type_id uuid not null references service_types(id) on delete restrict,
  employee_id     uuid not null references employees(id) on delete restrict,
  scheduled_date  date not null,
  scheduled_time  time not null,
  status          text not null default 'pending'
                    check (status in ('pending', 'in_progress', 'delivered', 'cancelled')),
  created_at      timestamptz not null default now(),
  updated_at      timestamptz not null default now()
);

comment on table schedules is 'Horarios de servicios (scheduler semanal). Una fila = una unidad+servicio asignado a un empleado en una propiedad a una hora puntual. status: pending (recién creado) | in_progress | delivered (finalizado, requiere schedule_charges) | cancelled.';

create index if not exists schedules_property_id_idx    on schedules (property_id);
create index if not exists schedules_employee_id_idx    on schedules (employee_id);
create index if not exists schedules_service_type_id_idx on schedules (service_type_id);
create index if not exists schedules_scheduled_date_idx on schedules (scheduled_date);
create index if not exists schedules_status_idx         on schedules (status);

create trigger schedules_set_updated_at before update on schedules
  for each row execute function set_updated_at();

alter table schedules enable row level security;

create policy "schedules_all_authenticated" on schedules
  for all to authenticated using (true) with check (true);

-- ---------------------------------------------------------------------------
-- schedule_charges — cobro capturado al marcar un horario como "delivered".
-- 1 a 1 con schedules (un horario finalizado tiene un solo cobro).
-- ---------------------------------------------------------------------------

create table if not exists schedule_charges (
  id          uuid primary key default gen_random_uuid(),
  schedule_id uuid not null unique references schedules(id) on delete cascade,
  total_cost  numeric(10, 2) not null,
  notes       text,
  created_at  timestamptz not null default now(),
  updated_at  timestamptz not null default now()
);

comment on table schedule_charges is 'Cobro de un horario finalizado (1 a 1 con schedules). Separado de la tabla `charges` (Cobros Subidos a OPS) — ver nota arriba sobre el link pendiente a futuro.';

create index if not exists schedule_charges_schedule_id_idx on schedule_charges (schedule_id);

create trigger schedule_charges_set_updated_at before update on schedule_charges
  for each row execute function set_updated_at();

alter table schedule_charges enable row level security;

create policy "schedule_charges_all_authenticated" on schedule_charges
  for all to authenticated using (true) with check (true);

-- ---------------------------------------------------------------------------
-- schedule_charge_extras — lista abierta de cargos adicionales dentro de un
-- mismo cobro (ej. "material extra", "acceso difícil"), cada uno con su
-- descripción y su costo.
-- ---------------------------------------------------------------------------

create table if not exists schedule_charge_extras (
  id                 uuid primary key default gen_random_uuid(),
  schedule_charge_id uuid not null references schedule_charges(id) on delete cascade,
  description        text not null,
  amount             numeric(10, 2) not null,
  created_at         timestamptz not null default now()
);

comment on table schedule_charge_extras is 'Cargos adicionales indefinidos dentro de un schedule_charge (descripción + costo cada uno).';

create index if not exists schedule_charge_extras_charge_id_idx on schedule_charge_extras (schedule_charge_id);

alter table schedule_charge_extras enable row level security;

create policy "schedule_charge_extras_all_authenticated" on schedule_charge_extras
  for all to authenticated using (true) with check (true);

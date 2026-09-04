-- ---------------------------------------------------------------------------
-- BrightCoat Ops — esquema inicial (Fase 1)
-- Cubre: properties, service_types, employees, services, income
-- Basado en el Excel "Control de Cobros 2026" (propiedades multifamiliares).
-- Pendiente para una fase siguiente: expenses / payroll (falta el 2º Excel).
--
-- Decisiones confirmadas con el cliente:
--   - "Subido a OPS" en el Excel = ya cobrado -> income.status solo tiene
--     dos estados: pending | paid (no hay estado intermedio "facturado").
--   - employee_id en services es OPCIONAL (no todo el historial lo trae).
--   - El tamaño de unidad (1x1, 2x2, 3x3 TH, etc.) NO se separa en su propio
--     campo — se queda dentro de services.description junto con el resto
--     del texto libre, para no perder detalle de trabajos con notas largas.
-- ---------------------------------------------------------------------------

-- gen_random_uuid() vive en pgcrypto, ya viene habilitado por defecto en
-- proyectos de Supabase; este create es solo por seguridad si no lo estuviera.
create extension if not exists pgcrypto;

-- ---------------------------------------------------------------------------
-- properties
-- ---------------------------------------------------------------------------
create table if not exists properties (
  id              uuid primary key default gen_random_uuid(),
  name            text not null,
  address         text,
  client_type     text not null check (client_type in ('residential', 'multifamily', 'property_manager')),
  manager_contact text,
  status          text not null default 'active' check (status in ('active', 'inactive')),
  created_at      timestamptz not null default now(),
  updated_at      timestamptz not null default now()
);

comment on table properties is 'Propiedades / clientes de property management que atiende BrightCoat.';

-- ---------------------------------------------------------------------------
-- service_types
-- Catálogo a nivel de categoría. El detalle específico (tamaño de unidad,
-- notas del trabajo) vive en services.description como texto libre.
-- ---------------------------------------------------------------------------
create table if not exists service_types (
  id         uuid primary key default gen_random_uuid(),
  name       text not null,
  category   text not null check (category in ('painting', 'cleaning', 'make_ready', 'repair', 'other')),
  created_at timestamptz not null default now()
);

comment on table service_types is 'Catálogo de tipos de servicio (nivel categoría).';

-- ---------------------------------------------------------------------------
-- employees
-- ---------------------------------------------------------------------------
create table if not exists employees (
  id          uuid primary key default gen_random_uuid(),
  name        text not null,
  role        text,
  hourly_rate numeric(10, 2),
  status      text not null default 'active' check (status in ('active', 'inactive')),
  created_at  timestamptz not null default now(),
  updated_at  timestamptz not null default now()
);

comment on table employees is 'Empleados / cuadrillas que ejecutan los servicios.';

-- ---------------------------------------------------------------------------
-- services
-- Una fila por trabajo ejecutado (pintura, limpieza, reparación, etc).
-- ---------------------------------------------------------------------------
create table if not exists services (
  id               uuid primary key default gen_random_uuid(),
  property_id      uuid not null references properties(id) on delete restrict,
  service_type_id  uuid not null references service_types(id) on delete restrict,
  employee_id      uuid references employees(id) on delete set null,
  unit_label       text,        -- "# Apartamento" del Excel: texto libre (ej. "L303", "4102", "Pasillos", "Oficina")
  description      text,        -- descripción completa del trabajo (incluye tamaño de unidad y notas)
  status           text not null default 'pending' check (status in ('pending', 'in_progress', 'completed')),
  scheduled_date   date,
  completed_date   date,
  cost             numeric(10, 2) not null default 0,
  created_at       timestamptz not null default now(),
  updated_at       timestamptz not null default now()
);

comment on table services is 'Órdenes de trabajo / servicios ejecutados por propiedad.';

create index if not exists services_property_id_idx     on services (property_id);
create index if not exists services_service_type_id_idx on services (service_type_id);
create index if not exists services_employee_id_idx     on services (employee_id);
create index if not exists services_status_idx          on services (status);

-- ---------------------------------------------------------------------------
-- income
-- Lo cobrado (o por cobrar) por cada servicio. Vinculado al service que lo
-- generó cuando se conoce; nullable por si en el futuro hay ingresos que no
-- vienen de un service puntual.
-- ---------------------------------------------------------------------------
create table if not exists income (
  id               uuid primary key default gen_random_uuid(),
  property_id      uuid not null references properties(id) on delete restrict,
  service_id       uuid references services(id) on delete set null,
  amount           numeric(10, 2) not null,
  date             date not null,
  status           text not null default 'pending' check (status in ('pending', 'paid')),
  client_reference text,       -- referencia libre (ej. "Debut Soco — L303 — Full Painting 1x1")
  created_at       timestamptz not null default now(),
  updated_at       timestamptz not null default now()
);

comment on table income is 'Cobros por propiedad. status=paid equivale a "Subido a OPS" en el Excel (ya cobrado).';

create index if not exists income_property_id_idx on income (property_id);
create index if not exists income_service_id_idx  on income (service_id);
create index if not exists income_status_idx      on income (status);
create index if not exists income_date_idx        on income (date);

-- ---------------------------------------------------------------------------
-- updated_at automático
-- ---------------------------------------------------------------------------
create or replace function set_updated_at()
returns trigger as $$
begin
  new.updated_at = now();
  return new;
end;
$$ language plpgsql;

create trigger properties_set_updated_at before update on properties
  for each row execute function set_updated_at();

create trigger employees_set_updated_at before update on employees
  for each row execute function set_updated_at();

create trigger services_set_updated_at before update on services
  for each row execute function set_updated_at();

create trigger income_set_updated_at before update on income
  for each row execute function set_updated_at();

-- ---------------------------------------------------------------------------
-- RLS: se habilita desde ya (sin políticas) para que quede seguro por
-- defecto. Las políticas reales se agregan cuando conectemos autenticación
-- (tabla profiles / rol owner) — ver blueprint, sección 02.
-- ---------------------------------------------------------------------------
alter table properties    enable row level security;
alter table service_types enable row level security;
alter table employees     enable row level security;
alter table services      enable row level security;
alter table income        enable row level security;

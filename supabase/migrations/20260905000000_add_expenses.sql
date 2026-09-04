-- ---------------------------------------------------------------------------
-- BrightCoat Ops — tabla expenses (Fase 1, parte 2)
-- Basado en el Excel de nómina quincenal ("VENTAS DEL 03 AL 15 AGOSTO 2026").
--
-- Ese Excel no es un registro de gastos generales — es la nómina por
-- trabajo: cuánto se le paga a cada empleado/subcontratista por cada
-- servicio que hizo. Esos pagos son justamente lo que va aquí, con
-- category='labor', ligados a services y employees cuando se conoce el
-- trabajo puntual.
--
-- También hay pagos sin servicio facturable de por medio (limpieza de
-- pasillos, tareas de oficina) — esos quedan con service_id nulo pero
-- property_id y employee_id presentes.
--
-- Los gastos de materiales/herramientas/transporte generales (compresor,
-- pintura suelta, gasolina) no aparecen en ninguno de los dos Excel — por
-- ahora se capturarían a mano desde la web, el campo category ya los cubre.
-- ---------------------------------------------------------------------------

create table if not exists expenses (
  id          uuid primary key default gen_random_uuid(),
  property_id uuid references properties(id) on delete set null,
  service_id  uuid references services(id) on delete set null,
  employee_id uuid references employees(id) on delete set null,
  category    text not null check (category in ('materials', 'labor', 'transport', 'tools', 'other')),
  amount      numeric(10, 2) not null,
  date        date not null,
  description text,
  created_at  timestamptz not null default now(),
  updated_at  timestamptz not null default now()
);

comment on table expenses is 'Gastos por propiedad. category=labor cubre los pagos a empleados/subcontratistas por trabajo (nómina quincenal); service_id nulo = gasto general de la propiedad (no ligado a un servicio puntual).';

create index if not exists expenses_property_id_idx on expenses (property_id);
create index if not exists expenses_service_id_idx  on expenses (service_id);
create index if not exists expenses_employee_id_idx on expenses (employee_id);
create index if not exists expenses_category_idx    on expenses (category);
create index if not exists expenses_date_idx         on expenses (date);

create trigger expenses_set_updated_at before update on expenses
  for each row execute function set_updated_at();

alter table expenses enable row level security;

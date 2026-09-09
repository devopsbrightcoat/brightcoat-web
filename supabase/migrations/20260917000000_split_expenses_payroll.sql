-- ---------------------------------------------------------------------------
-- BrightCoat Ops — Separar Planillas de Gastos
--
-- Gastos y Planillas compartían la tabla `expenses` (category='labor' =
-- planilla). El cliente pidió que Gastos sea un módulo totalmente
-- independiente: factura, monto, fecha y descripción — sin propiedad,
-- empleado ni categoría. Planillas sigue necesitando propiedad + empleado,
-- así que pasa a su propia tabla `payroll_entries`.
--
-- Esta migración:
--   1. Crea `payroll_entries` (propiedad + empleado + monto + fecha +
--      descripción), con RLS igual al resto de tablas del negocio.
--   2. Copia las filas de `expenses` con category='labor' a
--      `payroll_entries`.
--   3. Agrega `invoice_number` a `expenses` (número de factura del gasto).
--   4. Quita `property_id`, `employee_id`, `service_id` y `category` de
--      `expenses` — Gastos queda desligado de todo lo demás.
--
-- El paso 2 solo corre si `expenses` todavía tiene la columna `category`
-- (esta migración corre una sola vez; si ya se corrió antes, `category` ya
-- no existe y ese bloque se salta solo en vez de fallar).
-- ---------------------------------------------------------------------------

create table if not exists payroll_entries (
  id          uuid primary key default gen_random_uuid(),
  property_id uuid references properties(id) on delete set null,
  employee_id uuid references employees(id) on delete set null,
  amount      numeric(10, 2) not null,
  date        date not null,
  description text,
  created_at  timestamptz not null default now(),
  updated_at  timestamptz not null default now()
);

comment on table payroll_entries is 'Pago de mano de obra por propiedad/empleado (planillas) — separado de expenses (gastos), que ahora es un módulo independiente.';

create index if not exists payroll_entries_property_id_idx on payroll_entries (property_id);
create index if not exists payroll_entries_employee_id_idx on payroll_entries (employee_id);
create index if not exists payroll_entries_date_idx on payroll_entries (date);

create trigger payroll_entries_set_updated_at before update on payroll_entries
  for each row execute function set_updated_at();

alter table payroll_entries enable row level security;

create policy "payroll_entries_all_authenticated" on payroll_entries
  for all to authenticated using (true) with check (true);

-- Copia los gastos de categoría 'labor' (planilla) a payroll_entries.
do $$
begin
  if exists (
    select 1 from information_schema.columns
    where table_name = 'expenses' and column_name = 'category'
  ) then
    insert into payroll_entries (property_id, employee_id, amount, date, description)
    select property_id, employee_id, amount, date, description
    from expenses
    where category = 'labor';
  end if;
end $$;

alter table expenses add column if not exists invoice_number text;

alter table expenses drop column if exists property_id;
alter table expenses drop column if exists employee_id;
alter table expenses drop column if exists service_id;
alter table expenses drop column if exists category;

comment on table expenses is 'Gastos — módulo independiente: factura, monto, fecha y descripción. No está ligado a propiedades, empleados ni servicios (ver payroll_entries para pagos de mano de obra).';

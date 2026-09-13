-- ---------------------------------------------------------------------------
-- BrightCoat Ops — Proveedores (catálogo) + expenses.vendor_id
--
-- A diferencia de "Gastos fijos" (expense_templates, que NO tiene ningún
-- vínculo hacia expenses — solo precarga el formulario), Proveedores SÍ
-- queda ligado: cada gasto puede registrar de qué proveedor fue la compra
-- (opcional — hay gastos sin proveedor puntual, ej. renta o seguro).
-- ---------------------------------------------------------------------------

create table if not exists vendors (
  id          uuid primary key default gen_random_uuid(),
  name        text not null,
  notes       text,
  created_at  timestamptz not null default now(),
  updated_at  timestamptz not null default now()
);

comment on table vendors is 'Catálogo de proveedores — de dónde se hace la compra al registrar un gasto (ver expenses.vendor_id).';

create index if not exists vendors_name_idx on vendors (name);

create trigger vendors_set_updated_at before update on vendors
  for each row execute function set_updated_at();

alter table vendors enable row level security;

create policy "vendors_all_authenticated" on vendors
  for all to authenticated using (true) with check (true);

-- Gastos: de qué proveedor fue la compra (opcional).
alter table expenses add column if not exists vendor_id uuid references vendors(id) on delete set null;

create index if not exists expenses_vendor_id_idx on expenses (vendor_id);

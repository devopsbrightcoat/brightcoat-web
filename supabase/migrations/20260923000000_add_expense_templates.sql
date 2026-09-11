-- ---------------------------------------------------------------------------
-- BrightCoat Ops — tabla expense_templates ("Gastos fijos")
--
-- Catálogo de tipos de gasto recurrentes (renta, seguro, internet, etc.)
-- que sirve como plantilla al capturar un gasto real en `expenses` — NO
-- crea gastos automáticamente ni queda ligada a ellos de ninguna forma.
-- Elegir una plantilla en "Agregar gasto" solo precarga monto y
-- descripción en el formulario; el gasto creado es una fila normal de
-- `expenses`, sin ninguna referencia hacia expense_templates. Mismo
-- espíritu de independencia que ya tiene expenses (ver
-- 20260917000000_split_expenses_payroll.sql).
-- ---------------------------------------------------------------------------

create table if not exists expense_templates (
  id          uuid primary key default gen_random_uuid(),
  name        text not null,
  amount      numeric(10, 2),
  description text,
  created_at  timestamptz not null default now(),
  updated_at  timestamptz not null default now()
);

comment on table expense_templates is 'Catálogo de "gastos fijos" — plantillas de nombre/monto/descripción para precargar el formulario de Agregar gasto. Sin vínculo hacia expenses.';
comment on column expense_templates.amount is 'Monto sugerido, opcional — hay gastos fijos con monto constante y otros que varían.';

create index if not exists expense_templates_name_idx on expense_templates (name);

create trigger expense_templates_set_updated_at before update on expense_templates
  for each row execute function set_updated_at();

alter table expense_templates enable row level security;

create policy "expense_templates_all_authenticated" on expense_templates
  for all to authenticated using (true) with check (true);

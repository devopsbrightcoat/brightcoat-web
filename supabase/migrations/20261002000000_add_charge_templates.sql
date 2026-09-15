-- ---------------------------------------------------------------------------
-- BrightCoat Ops — tabla charge_templates ("Cobros fijos")
--
-- Catálogo de cargos recurrentes ligados a una propiedad (cuota de
-- administración, mantenimiento mensual, etc.) que sirve como plantilla
-- OBLIGATORIA al agregar un cobro fijo en Cobros (ver
-- AddFixedChargeModal.tsx) — a diferencia de "Gastos fijos"
-- (expense_templates), donde elegir una plantilla es opcional, acá Javier
-- pidió que "Agregar cobro fijo" siempre parta de un cobro fijo del
-- catálogo: no se puede escribir un monto libre sin elegir uno primero.
-- Cada cobro fijo del catálogo ya trae su propiedad — Javier pidió que
-- "Agregar cobro fijo" en Cobros ya NO pida propiedad por separado: al
-- elegir un cobro fijo se precargan propiedad, monto Y servicio (nombre)
-- directo desde esta tabla. El nombre pasa a `charges.description` y la
-- propiedad a `charges.property_id` — el cobro creado sigue siendo una fila
-- normal de `charges` (con is_fixed=true, ver
-- 20261001000000_add_charges_is_fixed.sql), sin ninguna referencia hacia
-- charge_templates.
-- ---------------------------------------------------------------------------

create table if not exists charge_templates (
  id          uuid primary key default gen_random_uuid(),
  property_id uuid not null references properties(id) on delete restrict,
  name        text not null,
  amount      numeric(10, 2) not null,
  created_at  timestamptz not null default now(),
  updated_at  timestamptz not null default now()
);

comment on table charge_templates is 'Catálogo de "cobros fijos" — plantillas de propiedad/servicio/monto para precargar "Agregar cobro fijo" en Cobros. Sin vínculo hacia charges.';
comment on column charge_templates.property_id is 'Propiedad a la que pertenece el cobro fijo — se precarga directo en el cobro creado, ya no se pide por separado en el formulario de Cobros.';
comment on column charge_templates.amount is 'Monto del cargo fijo — a diferencia de expense_templates.amount, acá es obligatorio: un cobro fijo siempre tiene un monto conocido.';

create index if not exists charge_templates_name_idx on charge_templates (name);
create index if not exists charge_templates_property_id_idx on charge_templates (property_id);

create trigger charge_templates_set_updated_at before update on charge_templates
  for each row execute function set_updated_at();

alter table charge_templates enable row level security;

create policy "charge_templates_all_authenticated" on charge_templates
  for all to authenticated using (true) with check (true);

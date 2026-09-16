-- ---------------------------------------------------------------------------
-- BrightCoat Ops — agrega property_id a charge_templates ("Cobros fijos")
--
-- La tabla charge_templates ya existía en producción (creada por
-- 20261002000000_add_charge_templates.sql antes de que esa migración se
-- editara para incluir property_id desde el inicio) — por eso ese
-- `create table if not exists` no vuelve a aplicarse y la columna nunca
-- llega a una base ya migrada. Esta migración la agrega con ALTER TABLE,
-- que sí aplica sobre una tabla existente.
--
-- El ALTER a NOT NULL al final falla si ya tienes algún cobro fijo
-- guardado sin propiedad — en ese caso, coméntalo (--), asígnale una
-- propiedad a esas filas a mano desde el Table Editor, y corre esa línea
-- después por separado.
-- ---------------------------------------------------------------------------

alter table charge_templates
  add column if not exists property_id uuid references properties(id) on delete restrict;

create index if not exists charge_templates_property_id_idx on charge_templates (property_id);

comment on column charge_templates.property_id is 'Propiedad a la que pertenece el cobro fijo — se precarga directo en el cobro creado, ya no se pide por separado en el formulario de Cobros.';

alter table charge_templates alter column property_id set not null;

-- ---------------------------------------------------------------------------
-- BrightCoat Ops — Cobros fijos
--
-- Hasta ahora un cobro solo se podía crear de dos formas: generado solo
-- desde Horarios (al marcar un trabajo entregado) o importado de la
-- plantilla Excel — no existía ningún botón para agregar un cobro a mano
-- desde la pantalla de Cobros.
--
-- Javier pidió poder agregar, a mano, un "cobro fijo" — un cargo recurrente
-- ligado a una propiedad (ej. una cuota fija de administración) que NO
-- viene de un trabajo puntual, así que no lleva unidad ni tipo de servicio:
-- solo propiedad + monto + fecha de cobro. Esto es justo lo que ya permite
-- el esquema actual de `charges` (unit_label y service_type_id son
-- nullable, y el índice único charges_unique_identity solo aplica cuando
-- service_type_id Y generated_date están presentes — un cobro fijo nunca
-- trae service_type_id, así que nunca choca con ese índice).
--
-- Lo único que falta es poder DISTINGUIR estos cobros de los demás en la
-- UI (la columna "Apartamento" les muestra "N/A" en vez de "—", porque a
-- diferencia de un cobro de Excel sin unidad, un cobro fijo nunca va a
-- tener una) y, sobre todo, restringir el nuevo botón "Agregar cobro fijo"
-- de Cobros para que solo pueda crear ESTE tipo de cobro — nunca un cobro
-- "regular" a mano (esos se siguen generando solo desde Horarios o Excel).
-- ---------------------------------------------------------------------------

alter table charges
  add column if not exists is_fixed boolean not null default false;

comment on column charges.is_fixed is
  'true cuando el cobro se creó a mano desde el botón "Agregar cobro fijo" en Cobros (propiedad + monto + fecha de cobro, sin unidad ni tipo de servicio). false para cobros generados desde Horarios o importados de Excel.';

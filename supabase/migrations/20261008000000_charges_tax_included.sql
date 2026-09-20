-- ---------------------------------------------------------------------------
-- Impuesto de ventas incluido o no en el monto del cobro.
--
-- Contexto (pedido de Javier): al capturar el cobro de un horario (paso
-- "Entregado" en Horarios), el monto que se ingresa a veces ya trae el
-- 8.25% de impuesto de ventas incluido (ej. el cliente pagó $194.75 "todo
-- incluido") y a veces no (el impuesto se suma aparte sobre ese monto).
-- Hasta ahora, la pantalla de Impuestos siempre calculaba el 8.25% como un
-- extra sobre `amount`, sin importar cuál de los dos casos era.
--
-- `tax_included = false` (default) mantiene el comportamiento de siempre:
-- impuesto = amount * 8.25%, sumado aparte. `tax_included = true` le dice a
-- Impuestos que ya viene incluido, y ahí se desglosa hacia atrás (impuesto =
-- amount - amount/1.0825).
-- ---------------------------------------------------------------------------

alter table charges
  add column if not exists tax_included boolean not null default false;

comment on column charges.tax_included is 'true si el monto del cobro (amount) ya incluye el 8.25% de impuesto de ventas (se desglosa hacia atrás en Impuestos); false (default) si el impuesto se calcula aparte sobre amount, como siempre.';

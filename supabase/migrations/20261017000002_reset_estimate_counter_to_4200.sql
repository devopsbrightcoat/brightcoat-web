-- ---------------------------------------------------------------------------
-- BrightCoat Ops — Ajusta el próximo número de Estimado a 4200
--
-- David confirmó que el número de correlativo a seguir es el 4200 (en vez
-- del 2266 con el que se había sembrado estimate_counter). Esta migración
-- solo pisa el valor ya existente — no vuelve a correr si la tabla no
-- existiera todavía (en ese caso ya queda sembrada en 4200 por la migración
-- 20261017000000).
-- ---------------------------------------------------------------------------

update estimate_counter
  set next_number = 4200
  where id = (select id from estimate_counter order by id limit 1);

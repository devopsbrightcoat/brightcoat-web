-- ---------------------------------------------------------------------------
-- SSN / ITIN del empleado, y retiro de la tarifa por hora.
--
-- Contexto (pedido de Javier): en Empleados se necesita guardar el número
-- de Seguro Social (SSN) o el ITIN de cada empleado, para trámites de W2.
-- Un empleado normalmente tiene uno de los dos, no ambos — pero se guardan
-- como dos campos de texto libres y opcionales, sin forzar esa regla.
--
-- También se quitó de la app el campo "Tarifa por hora" del empleado (ya
-- no se pide ni se muestra en Agregar/Editar empleado). La columna
-- `hourly_rate` se deja en la tabla sin tocar — por si ya tiene datos
-- cargados — simplemente la app deja de leerla y escribirla.
-- ---------------------------------------------------------------------------

alter table employees
  add column if not exists ssn text,
  add column if not exists itin text;

comment on column employees.ssn is 'Número de Seguro Social del empleado (opcional, texto libre, ej. 123-45-6789).';
comment on column employees.itin is 'ITIN del empleado (opcional, texto libre) — alternativa al SSN para quienes no califican para uno.';

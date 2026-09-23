-- Permite a owner/admin ocultar un empleado desde la app móvil (pedido de
-- David) sin borrarlo ni afectar sus horarios/planillas/cobros ya
-- existentes, que deben seguir mostrando su nombre igual que hoy en
-- reportes e historial.
--
-- El filtro por "hidden = false" se aplica solo en listas de gestión
-- (Empleados) y en los selectores para asignar trabajo NUEVO (crear
-- horario, crear planilla) — nunca en lookups de registros ya existentes
-- ni en filtros de reportes/historial.
alter table employees add column if not exists hidden boolean not null default false;

comment on column employees.hidden is 'Empleado oculto por owner/admin desde la app móvil — no aparece en Empleados ni en los selectores para asignar horarios/planillas nuevas. Sus horarios/planillas/cobros ya existentes no se modifican.';

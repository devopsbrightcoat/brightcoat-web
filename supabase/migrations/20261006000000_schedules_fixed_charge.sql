-- ---------------------------------------------------------------------------
-- Horarios de "cobro fijo" (ej. Office Cleaning 2x/semana, facturado una
-- sola vez al mes a través de un cobro fijo manual en Cobros).
--
-- Contexto (pedido de David vía Javier): hay servicios que se ejecutan
-- varias veces por semana pero se cobran como un solo monto fijo mensual
-- (charges.is_fixed = true, capturado a mano en Cobros con "Agregar cobro
-- fijo"). Con el flujo actual, cada vez que uno de esos horarios se marca
-- "Entregado" se crea/edita un cobro individual ligado a ese horario
-- (charges.schedule_id) — lo cual no tiene sentido para un servicio que ya
-- está cubierto por el cobro fijo recurrente: terminaría generando varios
-- cobros sueltos en Cobros para algo que en realidad es un solo cargo
-- mensual.
--
-- La solución: marcar el horario como "servicio de cobro fijo" desde su
-- creación. Al entregarlo, se marca directo a "delivered" — igual que
-- Pendiente/En proceso/Cancelado — sin pedir costo ni crear ningún
-- registro en `charges`; el cobro real ya se captura a mano en Cobros
-- como cobro fijo recurrente.
-- ---------------------------------------------------------------------------

alter table schedules
  add column if not exists is_fixed_charge boolean not null default false;

comment on column schedules.is_fixed_charge is 'El servicio de este horario se cobra mediante un cobro fijo recurrente (ej. limpieza de oficina 2x/semana facturada una vez al mes) — al marcarse "Entregado" NO se crea un cobro individual en charges; se marca directo, sin pedir costo.';

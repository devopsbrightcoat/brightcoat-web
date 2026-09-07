-- ---------------------------------------------------------------------------
-- Agrega a `employees` los campos que pidió el cliente para la pantalla de
-- Empleados: número de contacto, dirección, y estatus del W2 (aprobado /
-- pendiente). w2_status es independiente del `status` (activo/inactivo) que
-- ya existía — un empleado puede estar activo con el W2 todavía pendiente.
-- ---------------------------------------------------------------------------

alter table employees
  add column if not exists contact_number text,
  add column if not exists address text,
  add column if not exists w2_status text not null default 'pending' check (w2_status in ('approved', 'pending'));

-- Pedido de Javier: no todos los servicios de una planilla llevan impuesto
-- de ventas — se agrega un checkbox en el modal de Planillas para marcarlo
-- caso por caso, en vez de asumirlo siempre como antes (ver lib/tax.ts).
alter table payroll_entries add column if not exists taxable boolean not null default false;

comment on column payroll_entries.taxable is
  'Si a este trabajo le aplica el impuesto de ventas (8.25%, ya incluido en amount/Cobro) — se marca a mano en el modal de Planillas, no todos los servicios lo llevan.';

-- Impuesto de ventas (8.25% fijo) sobre cobros al estado de Texas. El
-- monto del impuesto NO se guarda — charges.amount ya viene con el
-- impuesto incluido (se captura así desde que David lo ingresa), así que
-- la porción de impuesto se extrae al vuelo en la app:
--   impuesto = amount - amount / 1.0825
--
-- Esta migración solo agrega el seguimiento de si ese impuesto, por cobro,
-- ya se remitió al estado o sigue pendiente — ver pages/Impuestos.tsx.

alter table public.charges
  add column if not exists tax_paid boolean not null default false,
  add column if not exists tax_paid_date date;

comment on column public.charges.tax_paid is
  'Si el impuesto de ventas (8.25%, ya incluido en amount) de este cobro ya se remitió al estado.';
comment on column public.charges.tax_paid_date is
  'Fecha en la que se marcó el impuesto de este cobro como pagado al estado.';

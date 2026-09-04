-- ---------------------------------------------------------------------------
-- BrightCoat Ops — refactor: fusiona income en services, separa unit_size
--
-- Motivo: en el Excel real cada fila es un solo concepto (propiedad + unidad
-- + trabajo + monto + si ya se cobró). Tener services.cost e income.amount
-- por separado duplicaba la captura del mismo dato y corría el riesgo de
-- desincronizarse. El estado de cobro ahora vive directo en services.
--
-- unit_size (1x1, 2x2, 3x3 TH, etc.) se separa de description para poder
-- filtrar/agrupar reportes por tamaño de unidad más adelante.
-- ---------------------------------------------------------------------------

alter table services
  add column if not exists unit_size text,
  add column if not exists payment_status text not null default 'pending' check (payment_status in ('pending', 'paid')),
  add column if not exists paid_date date;

comment on column services.unit_size is 'Tamaño de la unidad (1x1, 2x2, 3x3 TH, etc.), separado de description para poder filtrar/agrupar en reportes.';
comment on column services.payment_status is 'pending | paid — reemplaza a income.status. paid = "Subido a OPS" en el Excel (ya cobrado).';
comment on column services.paid_date is 'Fecha en que se cobró. Nula mientras payment_status = pending.';

-- Si ya había datos capturados en income, se trasladan antes de borrar la tabla.
update services s
set payment_status = i.status,
    paid_date = case when i.status = 'paid' then i.date else null end
from income i
where i.service_id = s.id;

drop table if exists income;

create index if not exists services_payment_status_idx on services (payment_status);

comment on table services is 'Órdenes de trabajo / servicios ejecutados por propiedad. Incluye el estado de cobro (payment_status/paid_date) — ya no existe una tabla income separada.';

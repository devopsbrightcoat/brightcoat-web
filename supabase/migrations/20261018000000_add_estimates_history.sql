-- ---------------------------------------------------------------------------
-- BrightCoat Ops — Historial de Estimados/Invoices
--
-- Hasta ahora los Estimados (formulario -> PDF, ver
-- 20261017000000_add_estimate_counter.sql) no se guardaban: solo se armaba
-- el PDF al momento y se descargaba, sin dejar registro. Esta tabla guarda
-- cada Estimado/Invoice generado para poder listarlo después y volver a
-- descargarlo con la misma información, sin tener que rearmarlo a mano.
--
-- property_id queda opcional (on delete set null) porque el historial debe
-- sobrevivir aunque la propiedad se borre más adelante — por eso también se
-- guarda una copia de property_name/unit_label/property_contact tal como
-- aparecieron en el PDF original (igual que items, que ya es una copia de
-- las líneas, no una referencia a nada editable).
-- ---------------------------------------------------------------------------

create table if not exists estimates (
  id                uuid primary key default gen_random_uuid(),
  estimate_number   integer not null,
  document_title    text not null default 'Estimate',
  date              date not null,
  property_id       uuid references properties(id) on delete set null,
  property_name     text not null,
  unit_label        text,
  property_contact  text,
  items             jsonb not null,
  note              text,
  total             numeric(10, 2) not null default 0,
  created_at        timestamptz not null default now()
);

comment on table estimates is 'Historial de Estimados/Invoices generados — copia de los datos usados para el PDF (sobrevive aunque se borre la propiedad), para listarlos y volver a descargarlos tal como quedaron.';

create index if not exists estimates_estimate_number_idx on estimates (estimate_number desc);
create index if not exists estimates_created_at_idx on estimates (created_at desc);
create index if not exists estimates_property_id_idx on estimates (property_id);

alter table estimates enable row level security;

create policy "estimates_all_authenticated" on estimates
  for all to authenticated using (true) with check (true);

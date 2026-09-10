-- ---------------------------------------------------------------------------
-- BrightCoat Ops — company_settings (Configuración General)
--
-- Tabla singleton: una sola fila con los datos generales del negocio
-- (nombre, dirección, teléfono, correo) y valores por defecto de la app
-- (tarifa por hora sugerida al agregar un empleado nuevo). No hay UI para
-- crear más filas — la app siempre lee y actualiza esta única fila.
--
-- La gestión de cuentas de acceso (profiles/roles) queda fuera de esta
-- migración a propósito — crear cuentas requiere el API admin de Supabase
-- (service role), no algo seguro de exponer desde la app cliente. Se sigue
-- haciendo a mano por ahora (dashboard/SQL), como hasta hoy.
-- ---------------------------------------------------------------------------

create table if not exists company_settings (
  id                   uuid primary key default gen_random_uuid(),
  company_name         text,
  address              text,
  phone                text,
  email                text,
  default_hourly_rate  numeric(10, 2),
  created_at           timestamptz not null default now(),
  updated_at           timestamptz not null default now()
);

comment on table company_settings is 'Datos generales del negocio y valores por defecto de la app — tabla singleton, una sola fila.';

create trigger company_settings_set_updated_at before update on company_settings
  for each row execute function set_updated_at();

alter table company_settings enable row level security;

create policy "company_settings_all_authenticated" on company_settings
  for all to authenticated using (true) with check (true);

-- Semilla: crea la única fila si todavía no existe ninguna (para que
-- fetchCompanySettings() nunca encuentre la tabla vacía).
insert into company_settings (company_name)
select 'BrightCoat Painting & Remodeling'
where not exists (select 1 from company_settings);

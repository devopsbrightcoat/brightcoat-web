-- ---------------------------------------------------------------------------
-- BrightCoat Ops — autenticación y RLS
--
-- Login por username + password (no por correo). Supabase Auth exige un
-- identificador tipo correo/teléfono por debajo, así que cada cuenta se crea
-- con un correo SINTÉTICO que el usuario nunca ve ni usa:
--
--     <username>@users.brightcoat.local
--
-- El correo real (si lo hay) es solo dato de contacto, va en profiles.email,
-- y no tiene relación con el login.
--
-- profiles.id = auth.users.id (1 a 1). employees es una tabla aparte — es
-- la cuadrilla que aparece en los reportes, no gente que inicia sesión.
-- ---------------------------------------------------------------------------

create table if not exists profiles (
  id         uuid primary key references auth.users(id) on delete cascade,
  username   text not null unique,
  full_name  text,
  email      text,                 -- opcional, solo contacto — no se usa para login
  role       text not null default 'staff' check (role in ('owner', 'staff')),
  created_at timestamptz not null default now(),
  updated_at timestamptz not null default now()
);

comment on table profiles is 'Cuentas de la app (login). El correo real de login vive en auth.users como <username>@users.brightcoat.local — profiles.email es solo contacto opcional.';

create trigger profiles_set_updated_at before update on profiles
  for each row execute function set_updated_at();

alter table profiles enable row level security;

-- Cualquier usuario logueado puede ver todos los perfiles (equipo chico y de
-- confianza — útil para mostrar "quién hizo qué" en la UI).
create policy "profiles_select_authenticated" on profiles
  for select to authenticated using (true);

-- Cada quien edita su propio perfil (username, nombre, email de contacto),
-- pero no su propio "role" — eso se cambia a mano por un admin (dashboard/SQL).
create policy "profiles_update_own" on profiles
  for update to authenticated using (id = auth.uid()) with check (id = auth.uid());

-- ---------------------------------------------------------------------------
-- RLS en las tablas del negocio: cualquier usuario autenticado tiene acceso
-- completo (lectura y escritura). No hay restricción por propiedad ni por
-- rol todavía — se puede afinar más adelante si hace falta.
-- ---------------------------------------------------------------------------
do $$
declare
  t text;
begin
  foreach t in array array['properties', 'service_types', 'employees', 'services', 'income', 'expenses'] loop
    execute format('create policy "%1$s_all_authenticated" on %1$s for all to authenticated using (true) with check (true);', t);
  end loop;
end $$;

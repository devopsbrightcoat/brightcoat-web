-- ---------------------------------------------------------------------------
-- BrightCoat Ops — push notifications nativas (Android) para ops-mobile
--
-- Tabla de tokens FCM por dispositivo. Un profile puede tener varios
-- tokens (más de un teléfono, o un token viejo que Firebase todavía no
-- expiró) — por eso es una tabla aparte y no una columna en profiles.
--
-- El envío del push en sí NO ocurre dentro de Postgres: se dispara con un
-- Database Webhook (configurado a mano en el dashboard de Supabase) que
-- llama a una Edge Function (supabase/functions/send-push) cada vez que
-- se inserta una fila nueva en `notifications`. Esa función lee esta
-- tabla para saber a qué dispositivos mandarle el push. Ver instrucciones
-- de despliegue en supabase/functions/send-push/index.ts.
-- ---------------------------------------------------------------------------

create table if not exists device_tokens (
  id         uuid primary key default gen_random_uuid(),
  profile_id uuid not null references profiles(id) on delete cascade,
  token      text not null unique,
  platform   text not null check (platform in ('android', 'ios')),
  created_at timestamptz not null default now(),
  updated_at timestamptz not null default now()
);

comment on table device_tokens is 'Tokens FCM por dispositivo, para mandar push nativo. Ver supabase/functions/send-push.';

create index if not exists device_tokens_profile_idx on device_tokens (profile_id);

create trigger device_tokens_set_updated_at before update on device_tokens
  for each row execute function set_updated_at();

alter table device_tokens enable row level security;

create policy "device_tokens_manage_own" on device_tokens
  for all to authenticated using (profile_id = auth.uid()) with check (profile_id = auth.uid());

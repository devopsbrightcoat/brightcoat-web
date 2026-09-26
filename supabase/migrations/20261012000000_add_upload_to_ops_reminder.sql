-- ---------------------------------------------------------------------------
-- Recordatorio automático "subir a OPS" — pedido explícito de Javier: que
-- el día 15 de cada mes se avise (con la misma notificación real que ya
-- usa la campanita/push — ver 20260924000000_add_notifications.sql y
-- 20260928000000_add_push_webhook_trigger.sql) si quedan cobros pendientes
-- de subir a OPS (charge.status = 'pending'), sin importar qué tan viejos
-- sean — a diferencia de la alerta "Cobros vencidos" del Dashboard, que
-- solo mira cobros de más de 30 días.
--
-- Este es solo la mitad automática del recordatorio. La otra mitad es el
-- banner rojo del Dashboard (computeUploadToOpsReminder en
-- dashboardMetrics.ts, ambas plataformas), que se calcula en el cliente y
-- no necesita esta migración — pero solo se ve si alguien abre la app. Esta
-- migración hace que la alerta llegue solo (campanita + push a Android),
-- aunque nadie entre a la app ese día.
--
-- IMPORTANTE (Javier): esta migración no se aplica sola. Hay que correrla
-- contra la base de datos real, igual que las demás — por ejemplo con
-- `supabase db push` desde ops-web/ (Supabase CLI instalado), o pegando
-- este archivo en el SQL Editor del Dashboard de Supabase.
-- ---------------------------------------------------------------------------

-- 1. Habilitar pg_cron (idempotente) — Supabase lo trae precargado, solo
-- hace falta activarlo una vez por proyecto.
create extension if not exists pg_cron;

-- 2. Función que avisa a TODOS los owners con notifications_enabled = true.
-- A diferencia de notify_owner_users (20260924000000_add_notifications.sql),
-- no depende de auth.uid() — la dispara pg_cron, no hay un usuario
-- autenticado detrás.
create or replace function notify_all_owners(p_entity_type text, p_entity_id uuid, p_message text)
returns void
language plpgsql
security definer
set search_path = public
as $$
begin
  insert into notifications (recipient_id, actor_id, entity_type, entity_id, message)
  select id, null, p_entity_type, p_entity_id, p_message
  from profiles
  where role = 'owner' and notifications_enabled;
end;
$$;

comment on function notify_all_owners is 'Inserta una notificación para todos los owners con notifications_enabled = true. A diferencia de notify_owner_users, no depende de auth.uid() — pensada para jobs de pg_cron sin usuario autenticado.';

-- 3. Función del recordatorio: cuenta los cobros pendientes de subir a OPS
-- y, si hay al menos uno, dispara la notificación (que a su vez dispara el
-- push real vía el trigger on_notification_insert_push, ya existente).
create or replace function notify_upload_to_ops_reminder()
returns void
language plpgsql
security definer
set search_path = public
as $$
declare
  v_count int;
  v_total numeric;
begin
  select count(*), coalesce(sum(amount), 0)
  into v_count, v_total
  from charges
  where status = 'pending';

  if v_count = 0 then
    return;
  end if;

  perform notify_all_owners(
    'charge',
    null,
    format(
      'Recordatorio del día 15: %s cobro(s) todavía pendientes de subir a OPS — %s en total.',
      v_count,
      to_char(v_total, 'FM$999,999,990.00')
    )
  );
end;
$$;

comment on function notify_upload_to_ops_reminder is 'Job mensual (ver cron.schedule abajo): el día 15 de cada mes avisa a los owners si quedan cobros con status pending (sin subir a OPS), sin importar su antigüedad.';

-- 4. Programar el job — día 15 de cada mes, 13:00 UTC (7:00 am
-- Honduras/UTC-6). Se desprograma primero por si esta migración se corre
-- de nuevo (cron.schedule con un nombre que ya existe da error).
do $$
begin
  if exists (select 1 from cron.job where jobname = 'upload-to-ops-reminder') then
    perform cron.unschedule('upload-to-ops-reminder');
  end if;
end $$;

select cron.schedule(
  'upload-to-ops-reminder',
  '0 13 15 * *',
  $$ select notify_upload_to_ops_reminder(); $$
);

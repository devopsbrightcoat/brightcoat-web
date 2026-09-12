-- Push notifications: call the send-push Edge Function directly via pg_net,
-- bypassing the Dashboard "Database Webhooks" UI (broken on this project:
-- "ERROR: 3F000: schema \"supabase_functions\" does not exist").
--
-- pg_net gives us the same underlying mechanism (async outbound HTTP calls
-- from Postgres) that the Webhooks UI uses internally, so this achieves the
-- exact same result: every insert into `notifications` triggers a call to
-- the send-push function, which looks up device tokens and sends the FCM
-- push.

-- 1. Make sure the pg_net extension is enabled (idempotent).
create extension if not exists pg_net with schema extensions;

-- 2. Trigger function: fires the HTTP call to the Edge Function.
create or replace function public.trg_push_on_notification_insert()
returns trigger
language plpgsql
security definer
set search_path = public
as $$
begin
  perform net.http_post(
    url := 'https://spubixsplkekfhqcygbx.supabase.co/functions/v1/send-push',
    headers := jsonb_build_object(
      'Content-Type', 'application/json',
      'x-webhook-secret', 'bc-push-9f3k2m8x7q1z'
    ),
    body := jsonb_build_object(
      'type', 'INSERT',
      'table', 'notifications',
      'record', to_jsonb(new)
    )
  );
  return new;
end;
$$;

-- 3. Trigger: fire on every new notification row.
drop trigger if exists on_notification_insert_push on public.notifications;

create trigger on_notification_insert_push
after insert on public.notifications
for each row
execute function public.trg_push_on_notification_insert();

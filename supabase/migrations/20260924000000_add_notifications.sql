-- ---------------------------------------------------------------------------
-- BrightCoat Ops — sistema de alertas entre usuarios
--
-- Objetivo (pedido explícito de David/Javier): que cada rol se entere
-- cuando el otro rol toca ciertos datos —
--   - el owner (David) agrega propiedades, empleados u horarios  -> se
--     avisa a todo el que NO sea owner (admin/staff, ej. Blanca).
--   - un no-owner (Blanca, admin/staff) registra un gasto, genera una
--     planilla, o modifica un cobro -> se avisa a todos los owners.
--
-- La regla es por ROL, no por usuario fijo, para que siga funcionando si
-- algún día se agrega un tercer usuario (ver comentario en
-- 20260907000000_add_admin_role.sql: los 3 roles hoy tienen el mismo
-- acceso real, role es solo una etiqueta — acá sí empieza a importar).
--
-- Fase web únicamente: esto alimenta la campanita del panel interno.
-- Notificaciones push nativas (Firebase/APNs) para ops-mobile quedan para
-- una fase futura aparte — esta migración no toca nada de la app móvil.
-- ---------------------------------------------------------------------------

-- Interruptor por usuario: "Activar alertas" en Configuración -> Mi perfil.
-- Se revisa ANTES de insertar cada notificación (no es solo un filtro de
-- UI) — un usuario con esto en false no genera fila en notifications.
alter table profiles
  add column if not exists notifications_enabled boolean not null default true;

comment on column profiles.notifications_enabled is 'Si es false, este usuario no recibe alertas de actividad de otros usuarios (toggle "Activar alertas" en Configuración -> Mi perfil).';

-- ---------------------------------------------------------------------------
-- Tabla notifications
-- ---------------------------------------------------------------------------

create table if not exists notifications (
  id           uuid primary key default gen_random_uuid(),
  recipient_id uuid not null references profiles(id) on delete cascade,
  actor_id     uuid references profiles(id) on delete set null,
  entity_type  text not null check (entity_type in ('property', 'employee', 'schedule', 'expense', 'payroll_entry', 'charge')),
  entity_id    uuid,
  message      text not null,
  read_at      timestamptz,
  created_at   timestamptz not null default now()
);

comment on table notifications is 'Alertas de actividad entre usuarios (owner <-> no-owner). El mensaje va pre-armado en español al momento del insert (denormalizado) para que siga siendo legible aunque el registro original se edite o borre después.';
comment on column notifications.read_at is 'null = no leída. Se llena al marcar como leída (una por una o "marcar todas").';

create index if not exists notifications_recipient_idx on notifications (recipient_id, created_at desc);
create index if not exists notifications_recipient_unread_idx on notifications (recipient_id) where read_at is null;

alter table notifications enable row level security;

create policy "notifications_select_own" on notifications
  for select to authenticated using (recipient_id = auth.uid());

create policy "notifications_update_own" on notifications
  for update to authenticated using (recipient_id = auth.uid()) with check (recipient_id = auth.uid());

-- Sin policy de insert: las filas solo se crean desde los triggers de abajo,
-- vía las funciones SECURITY DEFINER (quien dispara el trigger no tiene
-- permiso RLS para insertar una notificación dirigida a OTRO usuario).

-- ---------------------------------------------------------------------------
-- Funciones helper SECURITY DEFINER — insertan una notificación por cada
-- destinatario del "otro lado" del rol de quien hizo la acción. Cada una
-- valida el rol de auth.uid() antes de insertar nada, así que aunque se
-- llamen desde cualquier trigger, un usuario del rol equivocado no genera
-- alertas fantasma.
-- ---------------------------------------------------------------------------

create or replace function notify_non_owner_users(p_entity_type text, p_entity_id uuid, p_message text)
returns void
language plpgsql
security definer
set search_path = public
as $$
declare
  v_actor_role text;
begin
  select role into v_actor_role from profiles where id = auth.uid();
  if v_actor_role is distinct from 'owner' then
    return;
  end if;

  insert into notifications (recipient_id, actor_id, entity_type, entity_id, message)
  select id, auth.uid(), p_entity_type, p_entity_id, p_message
  from profiles
  where role <> 'owner' and notifications_enabled and id <> auth.uid();
end;
$$;

create or replace function notify_owner_users(p_entity_type text, p_entity_id uuid, p_message text)
returns void
language plpgsql
security definer
set search_path = public
as $$
declare
  v_actor_role text;
begin
  select role into v_actor_role from profiles where id = auth.uid();
  if v_actor_role = 'owner' then
    return;
  end if;

  insert into notifications (recipient_id, actor_id, entity_type, entity_id, message)
  select id, auth.uid(), p_entity_type, p_entity_id, p_message
  from profiles
  where role = 'owner' and notifications_enabled and id <> auth.uid();
end;
$$;

comment on function notify_non_owner_users is 'Si quien llama es owner, avisa a todo el resto (admin/staff) con notifications_enabled = true.';
comment on function notify_owner_users is 'Si quien llama NO es owner, avisa a todos los owners con notifications_enabled = true.';

-- ---------------------------------------------------------------------------
-- Triggers: owner -> no-owner (propiedades, empleados, horarios)
-- ---------------------------------------------------------------------------

create or replace function trg_notify_property_created()
returns trigger
language plpgsql
as $$
declare
  v_actor_name text;
begin
  select coalesce(full_name, username) into v_actor_name from profiles where id = auth.uid();
  perform notify_non_owner_users('property', new.id, format('%s agregó la propiedad "%s".', coalesce(v_actor_name, 'Alguien'), new.name));
  return new;
end;
$$;

create trigger notify_property_created after insert on properties
  for each row execute function trg_notify_property_created();

create or replace function trg_notify_employee_created()
returns trigger
language plpgsql
as $$
declare
  v_actor_name text;
begin
  select coalesce(full_name, username) into v_actor_name from profiles where id = auth.uid();
  perform notify_non_owner_users('employee', new.id, format('%s agregó al empleado "%s".', coalesce(v_actor_name, 'Alguien'), new.name));
  return new;
end;
$$;

create trigger notify_employee_created after insert on employees
  for each row execute function trg_notify_employee_created();

create or replace function trg_notify_schedule_created()
returns trigger
language plpgsql
as $$
declare
  v_actor_name text;
  v_employee_name text;
  v_property_name text;
  v_location text;
begin
  select coalesce(full_name, username) into v_actor_name from profiles where id = auth.uid();
  select name into v_employee_name from employees where id = new.employee_id;
  select name into v_property_name from properties where id = new.property_id;

  v_location := coalesce(v_property_name, 'una propiedad');
  if new.unit_label is not null and new.unit_label <> '' then
    v_location := v_location || ' (' || new.unit_label || ')';
  end if;

  perform notify_non_owner_users(
    'schedule',
    new.id,
    format('%s agregó un horario para %s en %s el %s.', coalesce(v_actor_name, 'Alguien'), coalesce(v_employee_name, 'un empleado'), v_location, to_char(new.scheduled_date, 'DD/MM/YYYY'))
  );
  return new;
end;
$$;

create trigger notify_schedule_created after insert on schedules
  for each row execute function trg_notify_schedule_created();

-- ---------------------------------------------------------------------------
-- Triggers: no-owner -> owner (gastos, planillas, cobros)
-- ---------------------------------------------------------------------------

create or replace function trg_notify_expense_created()
returns trigger
language plpgsql
as $$
declare
  v_actor_name text;
  v_detail text;
begin
  select coalesce(full_name, username) into v_actor_name from profiles where id = auth.uid();
  v_detail := to_char(new.amount, 'FM$999,999,990.00');
  if new.description is not null and new.description <> '' then
    v_detail := v_detail || ' — ' || new.description;
  end if;

  perform notify_owner_users('expense', new.id, format('%s registró un gasto de %s.', coalesce(v_actor_name, 'Alguien'), v_detail));
  return new;
end;
$$;

create trigger notify_expense_created after insert on expenses
  for each row execute function trg_notify_expense_created();

create or replace function trg_notify_payroll_entry_created()
returns trigger
language plpgsql
as $$
declare
  v_actor_name text;
  v_employee_name text;
begin
  select coalesce(full_name, username) into v_actor_name from profiles where id = auth.uid();
  select name into v_employee_name from employees where id = new.employee_id;

  perform notify_owner_users(
    'payroll_entry',
    new.id,
    format('%s generó una planilla para %s.', coalesce(v_actor_name, 'Alguien'), coalesce(v_employee_name, 'un empleado'))
  );
  return new;
end;
$$;

create trigger notify_payroll_entry_created after insert on payroll_entries
  for each row execute function trg_notify_payroll_entry_created();

create or replace function trg_notify_charge_updated()
returns trigger
language plpgsql
as $$
declare
  v_actor_name text;
  v_property_name text;
  v_location text;
  v_status_label text;
begin
  select coalesce(full_name, username) into v_actor_name from profiles where id = auth.uid();
  select name into v_property_name from properties where id = new.property_id;

  v_location := coalesce(v_property_name, 'una propiedad');
  if new.unit_label is not null and new.unit_label <> '' then
    v_location := v_location || ' (' || new.unit_label || ')';
  end if;

  v_status_label := case new.status when 'paid' then 'pagado' else 'pendiente' end;

  perform notify_owner_users(
    'charge',
    new.id,
    format('%s modificó un cobro de %s en %s (%s).', coalesce(v_actor_name, 'Alguien'), to_char(new.amount, 'FM$999,999,990.00'), v_location, v_status_label)
  );
  return new;
end;
$$;

create trigger notify_charge_updated after update on charges
  for each row
  when (
    old.status is distinct from new.status or
    old.amount is distinct from new.amount or
    old.generated_date is distinct from new.generated_date or
    old.invoice_number is distinct from new.invoice_number or
    old.description is distinct from new.description or
    old.notes is distinct from new.notes or
    old.unit_label is distinct from new.unit_label or
    old.responsible is distinct from new.responsible or
    old.payroll_period is distinct from new.payroll_period or
    old.extras is distinct from new.extras
  )
  execute function trg_notify_charge_updated();

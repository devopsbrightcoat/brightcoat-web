-- ---------------------------------------------------------------------------
-- BrightCoat Ops — alertas configurables por rol
--
-- El diseño anterior (20260924000000_add_notifications.sql) era de 2
-- direcciones fijas: owner -> avisa a todo no-owner, no-owner -> avisa a
-- todos los owners. Con 'finance' separado de 'admin'
-- (20260925000000_add_finance_role.sql) y el pedido explícito de que el
-- rol admin (Javier) quiere enterarse de TODOS los roles (staff, owner y
-- finance), ese esquema de 2 direcciones ya no alcanza.
--
-- Se generaliza a una suscripción por usuario: cada quien elige de qué
-- roles quiere recibir alertas, en Configuración -> Alertas (pantalla
-- nueva, separada de Configuración -> General). El rol staff no tiene
-- esa pantalla (se oculta en la UI), así que nunca configura nada acá —
-- su notify_roles se queda vacío y no recibe alertas.
-- ---------------------------------------------------------------------------

alter table profiles
  add column if not exists notify_roles text[] not null default '{}';

alter table profiles drop constraint if exists profiles_notify_roles_check;
alter table profiles add constraint profiles_notify_roles_check
  check (notify_roles <@ array['owner', 'admin', 'staff', 'finance']);

comment on column profiles.notify_roles is 'Roles cuya actividad este usuario quiere ver en sus alertas (Configuración -> Alertas). Vacío = no recibe nada, más allá de notifications_enabled.';

-- Preferencia inicial pedida por Javier: su cuenta admin quiere enterarse
-- de la actividad de los otros 3 roles. Se puede ajustar después desde la
-- UI en cualquier momento.
update profiles set notify_roles = array['owner', 'staff', 'finance'] where role = 'admin';

-- ---------------------------------------------------------------------------
-- Nueva función helper genérica — reemplaza notify_owner_users /
-- notify_non_owner_users: ya no hay una dirección fija, el destinatario
-- se decide por su propio notify_roles.
-- ---------------------------------------------------------------------------

create or replace function notify_users_subscribed_to_role(p_actor_role text, p_entity_type text, p_entity_id uuid, p_message text)
returns void
language plpgsql
security definer
set search_path = public
as $$
begin
  insert into notifications (recipient_id, actor_id, entity_type, entity_id, message)
  select id, auth.uid(), p_entity_type, p_entity_id, p_message
  from profiles
  where notifications_enabled
    and id <> auth.uid()
    and p_actor_role = any (notify_roles);
end;
$$;

comment on function notify_users_subscribed_to_role is 'Avisa a todo profile que tenga p_actor_role dentro de su notify_roles (y notifications_enabled = true), salvo al propio actor.';

-- ---------------------------------------------------------------------------
-- Triggers — misma lista de acciones que antes (propiedades/empleados/
-- horarios, gastos/planillas/cobros); CREATE OR REPLACE conserva el OID
-- de cada función, así que los triggers ya creados en la migración
-- anterior siguen apuntando correctamente sin necesidad de recrearlos.
-- ---------------------------------------------------------------------------

create or replace function trg_notify_property_created()
returns trigger
language plpgsql
as $$
declare
  v_actor_name text;
  v_actor_role text;
begin
  select coalesce(full_name, username), role into v_actor_name, v_actor_role from profiles where id = auth.uid();
  perform notify_users_subscribed_to_role(v_actor_role, 'property', new.id, format('%s agregó la propiedad "%s".', coalesce(v_actor_name, 'Alguien'), new.name));
  return new;
end;
$$;

create or replace function trg_notify_employee_created()
returns trigger
language plpgsql
as $$
declare
  v_actor_name text;
  v_actor_role text;
begin
  select coalesce(full_name, username), role into v_actor_name, v_actor_role from profiles where id = auth.uid();
  perform notify_users_subscribed_to_role(v_actor_role, 'employee', new.id, format('%s agregó al empleado "%s".', coalesce(v_actor_name, 'Alguien'), new.name));
  return new;
end;
$$;

create or replace function trg_notify_schedule_created()
returns trigger
language plpgsql
as $$
declare
  v_actor_name text;
  v_actor_role text;
  v_employee_name text;
  v_property_name text;
  v_location text;
begin
  select coalesce(full_name, username), role into v_actor_name, v_actor_role from profiles where id = auth.uid();
  select name into v_employee_name from employees where id = new.employee_id;
  select name into v_property_name from properties where id = new.property_id;

  v_location := coalesce(v_property_name, 'una propiedad');
  if new.unit_label is not null and new.unit_label <> '' then
    v_location := v_location || ' (' || new.unit_label || ')';
  end if;

  perform notify_users_subscribed_to_role(
    v_actor_role,
    'schedule',
    new.id,
    format('%s agregó un horario para %s en %s el %s.', coalesce(v_actor_name, 'Alguien'), coalesce(v_employee_name, 'un empleado'), v_location, to_char(new.scheduled_date, 'DD/MM/YYYY'))
  );
  return new;
end;
$$;

create or replace function trg_notify_expense_created()
returns trigger
language plpgsql
as $$
declare
  v_actor_name text;
  v_actor_role text;
  v_detail text;
begin
  select coalesce(full_name, username), role into v_actor_name, v_actor_role from profiles where id = auth.uid();
  v_detail := to_char(new.amount, 'FM$999,999,990.00');
  if new.description is not null and new.description <> '' then
    v_detail := v_detail || ' — ' || new.description;
  end if;

  perform notify_users_subscribed_to_role(v_actor_role, 'expense', new.id, format('%s registró un gasto de %s.', coalesce(v_actor_name, 'Alguien'), v_detail));
  return new;
end;
$$;

create or replace function trg_notify_payroll_entry_created()
returns trigger
language plpgsql
as $$
declare
  v_actor_name text;
  v_actor_role text;
  v_employee_name text;
begin
  select coalesce(full_name, username), role into v_actor_name, v_actor_role from profiles where id = auth.uid();
  select name into v_employee_name from employees where id = new.employee_id;

  perform notify_users_subscribed_to_role(
    v_actor_role,
    'payroll_entry',
    new.id,
    format('%s generó una planilla para %s.', coalesce(v_actor_name, 'Alguien'), coalesce(v_employee_name, 'un empleado'))
  );
  return new;
end;
$$;

create or replace function trg_notify_charge_updated()
returns trigger
language plpgsql
as $$
declare
  v_actor_name text;
  v_actor_role text;
  v_property_name text;
  v_location text;
  v_status_label text;
begin
  select coalesce(full_name, username), role into v_actor_name, v_actor_role from profiles where id = auth.uid();
  select name into v_property_name from properties where id = new.property_id;

  v_location := coalesce(v_property_name, 'una propiedad');
  if new.unit_label is not null and new.unit_label <> '' then
    v_location := v_location || ' (' || new.unit_label || ')';
  end if;

  v_status_label := case new.status when 'paid' then 'pagado' else 'pendiente' end;

  perform notify_users_subscribed_to_role(
    v_actor_role,
    'charge',
    new.id,
    format('%s modificó un cobro de %s en %s (%s).', coalesce(v_actor_name, 'Alguien'), to_char(new.amount, 'FM$999,999,990.00'), v_location, v_status_label)
  );
  return new;
end;
$$;

-- Las funciones de dirección fija ya no las usa ningún trigger — se borran.
drop function if exists notify_non_owner_users(text, uuid, text);
drop function if exists notify_owner_users(text, uuid, text);

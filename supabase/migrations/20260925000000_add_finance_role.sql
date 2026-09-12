-- ---------------------------------------------------------------------------
-- BrightCoat Ops — nuevo rol "finance"
--
-- profiles.role pasa de ('owner', 'admin', 'staff') a
-- ('owner', 'admin', 'staff', 'finance').
--
-- Motivo: 'admin' queda reservado para el administrador de la plataforma
-- (acceso técnico/soporte — hoy, la cuenta del propio desarrollador),
-- separado de quien administra las finanzas del negocio (Blanca, que
-- hace de contadora). Antes ambos compartían 'admin', lo cual mezclaba
-- dos cosas distintas y podría dar permisos de más el día que 'admin'
-- deje de ser solo una etiqueta (ver 20260907000000_add_admin_role.sql).
--
-- Como con los otros roles, esto no cambia el acceso real todavía — las
-- tablas de negocio siguen con RLS abierta (`using (true)`) — es
-- puramente para que role refleje correctamente quién es quién. El
-- sistema de alertas (20260924000000_add_notifications.sql) sigue
-- funcionando igual: sus funciones usan `role = 'owner'` / `role <>
-- 'owner'`, así que 'finance' cae automáticamente del lado "no-owner"
-- sin tocar ese SQL.
-- ---------------------------------------------------------------------------

alter table profiles drop constraint if exists profiles_role_check;

alter table profiles add constraint profiles_role_check
  check (role in ('owner', 'admin', 'staff', 'finance'));

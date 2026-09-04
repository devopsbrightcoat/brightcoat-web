-- ---------------------------------------------------------------------------
-- BrightCoat Ops — agrega el rol "admin"
--
-- profiles.role pasa de ('owner', 'staff') a ('owner', 'admin', 'staff').
--
-- Nota: por ahora las políticas RLS de las tablas del negocio dan acceso
-- completo a CUALQUIER usuario autenticado (ver 20260906000000_auth_and_rls),
-- así que los 3 roles tienen hoy el mismo acceso real — "role" todavía es
-- solo una etiqueta. El día que se quiera limitar algo por rol (ej. que solo
-- owner/admin puedan borrar registros, o que staff no vea reportes
-- financieros), ahí se ajustan las políticas para leer profiles.role.
-- ---------------------------------------------------------------------------

alter table profiles drop constraint if exists profiles_role_check;

alter table profiles add constraint profiles_role_check
  check (role in ('owner', 'admin', 'staff'));

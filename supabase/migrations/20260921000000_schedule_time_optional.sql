-- ---------------------------------------------------------------------------
-- BrightCoat Ops — quitar la hora de Horarios
--
-- David pidió simplificar: los horarios se agendan solo por día, sin hora
-- específica. La app (web y móvil) deja de capturar/mostrar scheduled_time
-- por completo. Se deja la columna nullable en vez de borrarla, para no
-- perder los horarios que ya se capturaron con hora hasta ahora — solo
-- queda sin usar de aquí en adelante.
-- ---------------------------------------------------------------------------

alter table schedules alter column scheduled_time drop not null;

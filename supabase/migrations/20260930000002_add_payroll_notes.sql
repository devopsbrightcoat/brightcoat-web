-- Campo de notas libres para planillas (payroll_entries), a pedido de
-- Javier: se completa opcionalmente en Agregar/Editar planilla.
alter table payroll_entries add column if not exists notes text;
comment on column payroll_entries.notes is 'Notas libres sobre la planilla (opcional).';

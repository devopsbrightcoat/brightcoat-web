-- Guarda de qué horario salió una planilla (cuando se creó usando el
-- selector "Horario relacionado" de AddPayrollEntryModal), para poder
-- excluir ese horario de futuras búsquedas y no duplicar el pago de un
-- mismo trabajo. Se llena solo al crear — no se toca al editar.
alter table payroll_entries add column if not exists schedule_id uuid references schedules(id) on delete set null;
create index if not exists payroll_entries_schedule_id_idx on payroll_entries (schedule_id);
comment on column payroll_entries.schedule_id is 'Horario del que se generó esta planilla (opcional) — evita ofrecerlo de nuevo en el selector de horarios.';

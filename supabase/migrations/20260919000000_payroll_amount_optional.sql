-- El pago (amount) de una planilla puede no saberse todavía al momento de
-- registrarla — se completa después editando la planilla. Se quita el
-- NOT NULL que se puso en 20260917000000_split_expenses_payroll.sql.
alter table payroll_entries alter column amount drop not null;

comment on column payroll_entries.amount is 'Pago al empleado por el servicio completo — puede quedar en null si todavía no se sabe cuánto se le va a pagar (se completa después editando la planilla).';

-- Agrega el invoice number a los cobros. Se captura cuando un cobro se
-- marca como pagado/subido a OPS (ver ChargeInvoiceModal.tsx y
-- updateChargeStatus en src/lib/api.ts).
alter table charges add column if not exists invoice_number text;

comment on column charges.invoice_number is
  'Número de factura ingresado al marcar el cobro como pagado/subido a OPS.';

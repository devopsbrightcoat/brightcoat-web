// ---------------------------------------------------------------------------
// Impuesto de ventas fijo (8.25%, Texas) — usado en dos contextos distintos
// que NO deben confundirse:
//
// - Cobros (Charge.amount): el monto capturado YA INCLUYE el impuesto —
//   hay que extraerlo del total con extractTaxFromTotal. Ver
//   20260930000000_add_charge_tax_tracking.sql y pages/Impuestos.tsx.
// - Planillas (PayrollEntry.amount): el impuesto es un cálculo informativo
//   aparte sobre el monto del pago — no se resta de nada, no se guarda en
//   base de datos, ver taxOnAmount y pages/Planillas.tsx.
// ---------------------------------------------------------------------------

export const SALES_TAX_RATE = 0.0825

// Dado un monto que ya incluye el impuesto (ej. un cobro), devuelve solo la
// porción correspondiente al impuesto.
export const extractTaxFromTotal = (totalWithTax: number): number =>
  totalWithTax - totalWithTax / (1 + SALES_TAX_RATE)

// Impuesto calculado sobre un monto que NO lo incluye (ej. un pago de
// planilla) — puramente informativo.
export const taxOnAmount = (amount: number): number => amount * SALES_TAX_RATE

// ---------------------------------------------------------------------------
// Impuesto de ventas fijo (8.25%, Texas) — mismo cálculo en los dos
// contextos que lo usan, taxOnAmount: el monto capturado (Charge.amount en
// Cobros/Impuestos, PayrollEntry.amount en Planillas) es la BASE sin
// impuesto, y el impuesto se SUMA aparte, nunca se extrae de adentro. Ver
// pages/Impuestos.tsx, components/impuestos/ImpuestosMonthDetailModal.tsx
// y pages/Planillas.tsx. Es un cálculo informativo/de seguimiento — no se
// resta ni se suma a amount en base de datos.
//
// extractTaxFromTotal queda sin uso desde este cambio (se usaba cuando se
// asumía que el impuesto ya venía incluido en el monto) — se deja por si
// hace falta en el futuro, pero ningún flujo actual la llama.
// ---------------------------------------------------------------------------

export const SALES_TAX_RATE = 0.0825

// Dado un monto que ya incluye el impuesto, devuelve solo la porción
// correspondiente al impuesto. Sin uso actualmente — ver nota arriba.
export const extractTaxFromTotal = (totalWithTax: number): number =>
  totalWithTax - totalWithTax / (1 + SALES_TAX_RATE)

// Impuesto calculado sobre un monto que NO lo incluye — se suma aparte del
// monto (Cobro o Pago de planilla), nunca se extrae de adentro.
export const taxOnAmount = (amount: number): number => amount * SALES_TAX_RATE

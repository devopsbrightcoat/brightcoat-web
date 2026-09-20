
export const SALES_TAX_RATE = 0.0825

export const extractTaxFromTotal = (totalWithTax: number): number =>
  totalWithTax - totalWithTax / (1 + SALES_TAX_RATE)

export const taxOnAmount = (amount: number): number => amount * SALES_TAX_RATE

export type ChargeTaxBreakdown = {
  // Monto antes de impuesto (lo que se reporta como base gravable).
  base: number
  // Impuesto de ventas (8.25%).
  tax: number
  // Lo que el cliente pagó en total (base + impuesto).
  total: number
}

// Desglosa el cobro de un horario según si su monto ya trae el impuesto de
// ventas incluido o no (charges.tax_included):
//  - Incluido: el monto ingresado ES el total pagado — se desglosa hacia
//    atrás (extractTaxFromTotal) para sacar cuánto de eso es impuesto.
//  - No incluido (default, comportamiento de siempre): el monto ingresado
//    es la base, y el impuesto se calcula aparte, sumado encima.
export const computeChargeTax = (amount: number, taxIncluded: boolean): ChargeTaxBreakdown => {
  if (taxIncluded) {
    const tax = extractTaxFromTotal(amount)
    return { base: amount - tax, tax, total: amount }
  }
  const tax = taxOnAmount(amount)
  return { base: amount, tax, total: amount + tax }
}

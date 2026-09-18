
export const SALES_TAX_RATE = 0.0825

export const extractTaxFromTotal = (totalWithTax: number): number =>
  totalWithTax - totalWithTax / (1 + SALES_TAX_RATE)

export const taxOnAmount = (amount: number): number => amount * SALES_TAX_RATE

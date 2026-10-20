import type { PayrollEntry } from '../types'

// Una planilla está "pendiente de cobro" cuando todavía no tiene Cobro y NO
// es de un servicio de cobro fijo — esas se cobran una vez al mes en Cobros
// (cobro fijo), así que nunca van a tener un Cobro propio.
export const isPayrollCobroPending = (entry: Pick<PayrollEntry, 'amount' | 'isFixedCharge'>): boolean =>
  entry.amount == null && !entry.isFixedCharge

export const FIXED_CHARGE_LABEL = 'Cobro fijo'

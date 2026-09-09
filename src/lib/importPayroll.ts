// ---------------------------------------------------------------------------
// OBSOLETO: la carga de planillas por Excel se eliminó al rediseñar
// Planillas con desglose de servicio (propiedad/unidad/empleado siempre
// requeridos, servicio como texto libre + payroll_entry_items) — ver
// 20260918000000_payroll_service_breakdown.sql. Este archivo ya no lo usa
// nadie; se deja como stub para no romper el build mientras no se pueda
// borrar directamente. Se puede eliminar junto con ImportPayrollModal.tsx y
// public/plantilla-planillas.xlsx.
// ---------------------------------------------------------------------------

export type ParsedPayrollRow = {
  rowNumber: number
  propertyName: string
  employeeName: string
  amountRaw: string
  dateRaw: string
  description: string
}

export type ValidatedPayrollRow = {
  rowNumber: number
  propertyName?: string
  employeeName?: string
  amount: number
  date: string
  description?: string
  errors: string[]
}

export type ImportPayrollOutcome = {
  rowNumber: number
  employeeName?: string
  success: boolean
  skipped?: boolean
  message: string
}

export const parsePayrollWorkbook = async (_file: File): Promise<ParsedPayrollRow[]> => {
  throw new Error('La carga de planillas por Excel ya no está disponible.')
}

export const validatePayrollRow = (row: ParsedPayrollRow): ValidatedPayrollRow => ({
  rowNumber: row.rowNumber,
  amount: 0,
  date: '',
  errors: ['La carga de planillas por Excel ya no está disponible.'],
})

export const importValidatedPayrollRows = async (
  _rows: ValidatedPayrollRow[],
  _onProgress?: (done: number, total: number) => void,
): Promise<ImportPayrollOutcome[]> => []

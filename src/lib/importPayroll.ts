// ---------------------------------------------------------------------------
// Importador de la plantilla "Planillas" (ver /public/plantilla-planillas.xlsx).
// Una sola hoja plana: cada fila es un pago de mano de obra — propiedad y
// empleado como columnas opcionales, monto, fecha y descripción. Adaptado
// del importador original de Gastos (antes de separar Planillas en su
// propia tabla `payroll_entries`).
// ---------------------------------------------------------------------------

import ExcelJS from 'exceljs'
import { fetchEmployees, fetchPayrollEntries, fetchProperties } from './api'
import { supabase } from './supabase'
import { getErrorMessage } from './errors'

const IGNORED_SHEETS = new Set(['instrucciones'])

const DATE_RE = /^\d{4}-\d{2}-\d{2}$/

const cellText = (value: ExcelJS.CellValue): string => {
  if (value == null) return ''
  if (value instanceof Date) return value.toISOString().slice(0, 10)
  if (typeof value === 'object' && 'text' in value) return String(value.text ?? '').trim()
  if (typeof value === 'object' && 'result' in value) return String(value.result ?? '').trim()
  return String(value).trim()
}

const COLS = {
  propertyName: 1,
  employeeName: 2,
  amount: 3,
  date: 4,
  description: 5,
} as const

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
  // true cuando la fila no se insertó porque ya existía una planilla
  // idéntica (misma propiedad, empleado, monto, fecha, etc.) — evita
  // duplicar datos si se sube el mismo archivo más de una vez.
  skipped?: boolean
  message: string
}

export const parsePayrollWorkbook = async (file: File): Promise<ParsedPayrollRow[]> => {
  const buffer = await file.arrayBuffer()
  const workbook = new ExcelJS.Workbook()
  await workbook.xlsx.load(buffer)

  const sheet = workbook.worksheets.find((s) => !IGNORED_SHEETS.has(s.name.trim().toLowerCase()))
  if (!sheet) {
    throw new Error('El archivo no tiene ninguna pestaña de planillas (aparte de "Instrucciones").')
  }

  const rows: ParsedPayrollRow[] = []

  sheet.eachRow((row, rowNumber) => {
    if (rowNumber === 1) return // fila de encabezados

    const get = (col: number) => cellText(row.getCell(col).value)
    const propertyName = get(COLS.propertyName)
    const employeeName = get(COLS.employeeName)
    const amountRaw = get(COLS.amount)
    const dateRaw = get(COLS.date)
    if (!propertyName && !employeeName && !amountRaw && !dateRaw) return // fila vacía

    rows.push({
      rowNumber,
      propertyName,
      employeeName,
      amountRaw,
      dateRaw,
      description: get(COLS.description),
    })
  })

  return rows
}

export const validatePayrollRow = (row: ParsedPayrollRow): ValidatedPayrollRow => {
  const errors: string[] = []

  const amount = Number(row.amountRaw.replace(/[^0-9.-]/g, ''))
  if (!row.amountRaw || Number.isNaN(amount) || amount < 0) errors.push('El monto no es un número válido.')

  if (!row.dateRaw) errors.push('Falta la fecha.')
  else if (!DATE_RE.test(row.dateRaw)) errors.push('Fecha debe tener formato AAAA-MM-DD.')

  return {
    rowNumber: row.rowNumber,
    propertyName: row.propertyName || undefined,
    employeeName: row.employeeName || undefined,
    amount,
    date: row.dateRaw,
    description: row.description || undefined,
    errors,
  }
}

// Firma única de una planilla (propiedad + empleado + monto + fecha +
// descripción). Se usa para detectar si una fila del Excel ya se había
// importado antes, de modo que subir el mismo archivo dos veces no
// duplique las planillas.
const payrollSignature = (
  propertyId: string | null,
  employeeId: string | null,
  amount: number,
  date: string,
  description: string,
): string => [propertyId ?? '', employeeId ?? '', amount.toFixed(2), date, description.trim().toLowerCase()].join('|')

export const importValidatedPayrollRows = async (
  rows: ValidatedPayrollRow[],
  onProgress?: (done: number, total: number) => void,
): Promise<ImportPayrollOutcome[]> => {
  const [properties, employees, existingEntries] = await Promise.all([
    fetchProperties(),
    fetchEmployees(),
    fetchPayrollEntries(),
  ])

  const propertyCache = new Map(properties.map((p) => [p.name.trim().toLowerCase(), p.id]))
  const employeeCache = new Map(employees.map((e) => [e.name.trim().toLowerCase(), e.id]))

  const seenSignatures = new Set(
    existingEntries.map((e) =>
      payrollSignature(e.propertyId ?? null, e.employeeId ?? null, e.amount, e.date, e.description ?? ''),
    ),
  )

  const findOrCreateProperty = async (name: string): Promise<string> => {
    const key = name.toLowerCase()
    const cached = propertyCache.get(key)
    if (cached) return cached
    const { data, error } = await supabase
      .from('properties')
      .insert({ name, client_type: 'multifamily', status: 'active' })
      .select('id')
      .single()
    if (error) throw error
    propertyCache.set(key, data.id)
    return data.id as string
  }

  const findOrCreateEmployee = async (name: string): Promise<string> => {
    const key = name.toLowerCase()
    const cached = employeeCache.get(key)
    if (cached) return cached
    const { data, error } = await supabase.from('employees').insert({ name, status: 'active' }).select('id').single()
    if (error) throw error
    employeeCache.set(key, data.id)
    return data.id as string
  }

  const outcomes: ImportPayrollOutcome[] = []

  for (let i = 0; i < rows.length; i += 1) {
    const row = rows[i]
    try {
      const propertyId = row.propertyName ? await findOrCreateProperty(row.propertyName) : null
      const employeeId = row.employeeName ? await findOrCreateEmployee(row.employeeName) : null

      const signature = payrollSignature(propertyId, employeeId, row.amount, row.date, row.description ?? '')
      if (seenSignatures.has(signature)) {
        outcomes.push({
          rowNumber: row.rowNumber,
          employeeName: row.employeeName,
          success: true,
          skipped: true,
          message: 'Ya se había importado antes (fila omitida para evitar duplicado).',
        })
        onProgress?.(i + 1, rows.length)
        continue
      }

      const { error } = await supabase.from('payroll_entries').insert({
        property_id: propertyId,
        employee_id: employeeId,
        amount: row.amount,
        date: row.date,
        description: row.description ?? null,
      })
      if (error) throw error

      seenSignatures.add(signature)
      outcomes.push({ rowNumber: row.rowNumber, employeeName: row.employeeName, success: true, message: 'Importado.' })
    } catch (err) {
      const message = getErrorMessage(err, 'Error desconocido.')
      outcomes.push({ rowNumber: row.rowNumber, employeeName: row.employeeName, success: false, message })
    }
    onProgress?.(i + 1, rows.length)
  }

  return outcomes
}

// ---------------------------------------------------------------------------
// Importador de la plantilla "Gastos" (ver /public/plantilla-gastos.xlsx).
// A diferencia de la plantilla de Servicios, esta es una sola hoja plana:
// cada fila es un gasto (pago de planilla, materiales, transporte,
// herramientas u otro), con la propiedad y el empleado como columnas
// opcionales en vez de una pestaña por propiedad.
// ---------------------------------------------------------------------------

import ExcelJS from 'exceljs'
import { fetchEmployees, fetchExpenses, fetchProperties } from './api'
import { supabase } from './supabase'
import type { ExpenseCategory } from '../types'

const IGNORED_SHEETS = new Set(['instrucciones'])

const CATEGORY_MAP: Record<string, ExpenseCategory> = {
  materiales: 'materials',
  'mano de obra': 'labor',
  transporte: 'transport',
  herramientas: 'tools',
  otro: 'other',
}

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
  category: 2,
  amount: 3,
  date: 4,
  employeeName: 5,
  description: 6,
} as const

export type ParsedExpenseRow = {
  rowNumber: number
  propertyName: string
  categoryRaw: string
  amountRaw: string
  dateRaw: string
  employeeName: string
  description: string
}

export type ValidatedExpenseRow = {
  rowNumber: number
  propertyName?: string
  category: ExpenseCategory
  amount: number
  date: string
  employeeName?: string
  description?: string
  errors: string[]
}

export type ImportExpenseOutcome = {
  rowNumber: number
  propertyName?: string
  success: boolean
  // true cuando la fila no se insertó porque ya existía un gasto idéntico
  // (misma propiedad, categoría, monto, fecha, etc.) — evita duplicar datos
  // si Blanca sube el mismo archivo más de una vez.
  skipped?: boolean
  message: string
}

export const parseExpensesWorkbook = async (file: File): Promise<ParsedExpenseRow[]> => {
  const buffer = await file.arrayBuffer()
  const workbook = new ExcelJS.Workbook()
  await workbook.xlsx.load(buffer)

  const sheet = workbook.worksheets.find((s) => !IGNORED_SHEETS.has(s.name.trim().toLowerCase()))
  if (!sheet) {
    throw new Error('El archivo no tiene ninguna pestaña de gastos (aparte de "Instrucciones").')
  }

  const rows: ParsedExpenseRow[] = []

  sheet.eachRow((row, rowNumber) => {
    if (rowNumber === 1) return // fila de encabezados

    const get = (col: number) => cellText(row.getCell(col).value)
    const categoryRaw = get(COLS.category)
    const amountRaw = get(COLS.amount)
    const dateRaw = get(COLS.date)
    const propertyName = get(COLS.propertyName)
    if (!categoryRaw && !amountRaw && !dateRaw && !propertyName) return // fila vacía

    rows.push({
      rowNumber,
      propertyName,
      categoryRaw,
      amountRaw,
      dateRaw,
      employeeName: get(COLS.employeeName),
      description: get(COLS.description),
    })
  })

  return rows
}

export const validateExpenseRow = (row: ParsedExpenseRow): ValidatedExpenseRow => {
  const errors: string[] = []

  const categoryKey = row.categoryRaw.trim().toLowerCase()
  let category: ExpenseCategory = 'other'
  if (!categoryKey) {
    errors.push('Falta la categoría.')
  } else {
    const mapped = CATEGORY_MAP[categoryKey]
    if (!mapped) errors.push(`Categoría "${row.categoryRaw}" no reconocida.`)
    else category = mapped
  }

  const amount = Number(row.amountRaw.replace(/[^0-9.-]/g, ''))
  if (!row.amountRaw || Number.isNaN(amount) || amount < 0) errors.push('El monto no es un número válido.')

  if (!row.dateRaw) errors.push('Falta la fecha.')
  else if (!DATE_RE.test(row.dateRaw)) errors.push('Fecha debe tener formato AAAA-MM-DD.')

  return {
    rowNumber: row.rowNumber,
    propertyName: row.propertyName || undefined,
    category,
    amount,
    date: row.dateRaw,
    employeeName: row.employeeName || undefined,
    description: row.description || undefined,
    errors,
  }
}

// Firma única de un gasto (propiedad + categoría + monto + fecha +
// empleado + descripción). Se usa para detectar si una fila del Excel ya se
// había importado antes, de modo que subir el mismo archivo dos veces no
// duplique los gastos/planillas.
const expenseSignature = (
  propertyId: string | null,
  category: ExpenseCategory,
  amount: number,
  date: string,
  employeeId: string | null,
  description: string,
): string =>
  [propertyId ?? '', category, amount.toFixed(2), date, employeeId ?? '', description.trim().toLowerCase()].join('|')

export const importValidatedExpenseRows = async (
  rows: ValidatedExpenseRow[],
  onProgress?: (done: number, total: number) => void,
): Promise<ImportExpenseOutcome[]> => {
  const [properties, employees, existingExpenses] = await Promise.all([
    fetchProperties(),
    fetchEmployees(),
    fetchExpenses(),
  ])

  const propertyCache = new Map(properties.map((p) => [p.name.trim().toLowerCase(), p.id]))
  const employeeCache = new Map(employees.map((e) => [e.name.trim().toLowerCase(), e.id]))

  const seenSignatures = new Set(
    existingExpenses.map((e) =>
      expenseSignature(e.propertyId ?? null, e.category, e.amount, e.date, e.employeeId ?? null, e.description ?? ''),
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

  const outcomes: ImportExpenseOutcome[] = []

  for (let i = 0; i < rows.length; i += 1) {
    const row = rows[i]
    try {
      const propertyId = row.propertyName ? await findOrCreateProperty(row.propertyName) : null
      const employeeId = row.employeeName ? await findOrCreateEmployee(row.employeeName) : null

      const signature = expenseSignature(propertyId, row.category, row.amount, row.date, employeeId, row.description ?? '')
      if (seenSignatures.has(signature)) {
        outcomes.push({
          rowNumber: row.rowNumber,
          propertyName: row.propertyName,
          success: true,
          skipped: true,
          message: 'Ya se había importado antes (fila omitida para evitar duplicado).',
        })
        onProgress?.(i + 1, rows.length)
        continue
      }

      const { error } = await supabase.from('expenses').insert({
        property_id: propertyId,
        employee_id: employeeId,
        category: row.category,
        amount: row.amount,
        date: row.date,
        description: row.description ?? null,
      })
      if (error) throw error

      seenSignatures.add(signature)
      outcomes.push({ rowNumber: row.rowNumber, propertyName: row.propertyName, success: true, message: 'Importado.' })
    } catch (err) {
      const message = err instanceof Error ? err.message : 'Error desconocido.'
      outcomes.push({ rowNumber: row.rowNumber, propertyName: row.propertyName, success: false, message })
    }
    onProgress?.(i + 1, rows.length)
  }

  return outcomes
}

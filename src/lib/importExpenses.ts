// ---------------------------------------------------------------------------
// Importador de la plantilla "Gastos" (ver /public/plantilla-gastos.xlsx).
// Una sola hoja plana: cada fila es un gasto/factura, totalmente desligado
// de propiedades, empleados y servicios — número de factura, monto, fecha y
// descripción.
// ---------------------------------------------------------------------------

import ExcelJS from 'exceljs'
import { fetchExpenses } from './api'
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
  invoiceNumber: 1,
  amount: 2,
  date: 3,
  description: 4,
} as const

export type ParsedExpenseRow = {
  rowNumber: number
  invoiceNumber: string
  amountRaw: string
  dateRaw: string
  description: string
}

export type ValidatedExpenseRow = {
  rowNumber: number
  invoiceNumber?: string
  amount: number
  date: string
  description?: string
  errors: string[]
}

export type ImportExpenseOutcome = {
  rowNumber: number
  invoiceNumber?: string
  success: boolean
  // true cuando la fila no se insertó porque ya existía un gasto idéntico
  // (misma factura, monto, fecha y descripción) — evita duplicar datos si
  // se sube el mismo archivo más de una vez.
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
    const invoiceNumber = get(COLS.invoiceNumber)
    const amountRaw = get(COLS.amount)
    const dateRaw = get(COLS.date)
    const description = get(COLS.description)
    if (!invoiceNumber && !amountRaw && !dateRaw && !description) return // fila vacía

    rows.push({ rowNumber, invoiceNumber, amountRaw, dateRaw, description })
  })

  return rows
}

export const validateExpenseRow = (row: ParsedExpenseRow): ValidatedExpenseRow => {
  const errors: string[] = []

  const amount = Number(row.amountRaw.replace(/[^0-9.-]/g, ''))
  if (!row.amountRaw || Number.isNaN(amount) || amount < 0) errors.push('El monto no es un número válido.')

  if (!row.dateRaw) errors.push('Falta la fecha.')
  else if (!DATE_RE.test(row.dateRaw)) errors.push('Fecha debe tener formato AAAA-MM-DD.')

  return {
    rowNumber: row.rowNumber,
    invoiceNumber: row.invoiceNumber || undefined,
    amount,
    date: row.dateRaw,
    description: row.description || undefined,
    errors,
  }
}

// Firma única de un gasto (factura + monto + fecha + descripción). Se usa
// para detectar si una fila del Excel ya se había importado antes, de modo
// que subir el mismo archivo dos veces no duplique los gastos.
const expenseSignature = (invoiceNumber: string | null, amount: number, date: string, description: string): string =>
  [invoiceNumber ?? '', amount.toFixed(2), date, description.trim().toLowerCase()].join('|')

export const importValidatedExpenseRows = async (
  rows: ValidatedExpenseRow[],
  onProgress?: (done: number, total: number) => void,
): Promise<ImportExpenseOutcome[]> => {
  const existingExpenses = await fetchExpenses()

  const seenSignatures = new Set(
    existingExpenses.map((e) => expenseSignature(e.invoiceNumber ?? null, e.amount, e.date, e.description ?? '')),
  )

  const outcomes: ImportExpenseOutcome[] = []

  for (let i = 0; i < rows.length; i += 1) {
    const row = rows[i]
    try {
      const invoiceNumber = row.invoiceNumber ?? null

      const signature = expenseSignature(invoiceNumber, row.amount, row.date, row.description ?? '')
      if (seenSignatures.has(signature)) {
        outcomes.push({
          rowNumber: row.rowNumber,
          invoiceNumber: row.invoiceNumber,
          success: true,
          skipped: true,
          message: 'Ya se había importado antes (fila omitida para evitar duplicado).',
        })
        onProgress?.(i + 1, rows.length)
        continue
      }

      const { error } = await supabase.from('expenses').insert({
        invoice_number: invoiceNumber,
        amount: row.amount,
        date: row.date,
        description: row.description ?? null,
      })
      if (error) throw error

      seenSignatures.add(signature)
      outcomes.push({ rowNumber: row.rowNumber, invoiceNumber: row.invoiceNumber, success: true, message: 'Importado.' })
    } catch (err) {
      const message = getErrorMessage(err, 'Error desconocido.')
      outcomes.push({ rowNumber: row.rowNumber, invoiceNumber: row.invoiceNumber, success: false, message })
    }
    onProgress?.(i + 1, rows.length)
  }

  return outcomes
}

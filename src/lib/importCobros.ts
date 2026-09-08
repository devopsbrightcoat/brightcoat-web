// ---------------------------------------------------------------------------
// Importador de la plantilla "Cobros" (ver /public/plantilla-cobros.xlsx).
// Cada PESTAÑA es una propiedad (el nombre de la pestaña = el nombre de la
// propiedad; la hoja "Instrucciones" se ignora). Dentro de cada pestaña hay
// dos tablas lado a lado (no apiladas, como en la plantilla de Servicios):
//
//   Izquierda (A-F) "Cobros Subidos a OPS"        -> status = 'paid'
//   Columna G en blanco (separador visual)
//   Derecha   (H-M) "Pendientes por Subir / Cobrar" -> status = 'pending'
//
// Como comparten número de fila, cada fila del Excel puede producir hasta
// dos filas de datos (una por tabla) — se distinguen con el campo `side`.
// ---------------------------------------------------------------------------

import ExcelJS from 'exceljs'
import { fetchCharges, fetchProperties } from './api'
import { supabase } from './supabase'
import type { PaymentStatus } from '../types'
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

// Columnas de la tabla izquierda "Cobros Subidos a OPS" (A-F).
const LEFT_COLS = {
  unitLabel: 1,
  description: 2,
  amount: 3,
  generatedDate: 4,
  payrollPeriod: 5,
  notes: 6,
} as const

// Columnas de la tabla derecha "Pendientes por Subir / Cobrar" (H-M). La
// columna G queda en blanco a propósito como separador.
const RIGHT_COLS = {
  unitLabel: 8,
  description: 9,
  amount: 10,
  payrollPeriod: 11,
  responsible: 12,
  notes: 13,
} as const

export type ChargeSide = 'izquierda' | 'derecha'

export type ParsedChargeRow = {
  sheetName: string
  rowNumber: number
  side: ChargeSide
  propertyName: string
  status: PaymentStatus
  unitLabel: string
  description: string
  amountRaw: string
  generatedDateRaw: string // solo lado izquierdo (Cobro Generado)
  payrollPeriod: string
  responsible: string // solo lado derecho (Pendientes)
  notes: string
}

export type ValidatedChargeRow = {
  sheetName: string
  rowNumber: number
  side: ChargeSide
  propertyName: string
  status: PaymentStatus
  unitLabel?: string
  description?: string
  amount: number
  generatedDate?: string
  payrollPeriod?: string
  responsible?: string
  notes?: string
  errors: string[]
}

export type ImportChargeOutcome = {
  sheetName: string
  rowNumber: number
  side: ChargeSide
  propertyName: string
  success: boolean
  // true cuando la fila no se insertó porque ya existía un cobro idéntico
  // (misma propiedad, apartamento, monto, estado, etc.) — evita duplicar
  // datos si se sube el mismo archivo más de una vez.
  skipped?: boolean
  message: string
}

export const parseChargesWorkbook = async (file: File): Promise<ParsedChargeRow[]> => {
  const buffer = await file.arrayBuffer()
  const workbook = new ExcelJS.Workbook()
  await workbook.xlsx.load(buffer)

  const propertySheets = workbook.worksheets.filter(
    (sheet) => !IGNORED_SHEETS.has(sheet.name.trim().toLowerCase()),
  )
  if (propertySheets.length === 0) {
    throw new Error('El archivo no tiene ninguna pestaña de propiedad (aparte de "Instrucciones").')
  }

  const rows: ParsedChargeRow[] = []

  for (const sheet of propertySheets) {
    const propertyName = sheet.name.trim()

    sheet.eachRow((row, rowNumber) => {
      if (rowNumber <= 2) return // fila 1 = banners de las dos tablas, fila 2 = encabezados

      const get = (col: number) => cellText(row.getCell(col).value)

      const leftUnitLabel = get(LEFT_COLS.unitLabel)
      const leftDescription = get(LEFT_COLS.description)
      const leftAmountRaw = get(LEFT_COLS.amount)
      if (leftUnitLabel || leftDescription || leftAmountRaw) {
        rows.push({
          sheetName: sheet.name,
          rowNumber,
          side: 'izquierda',
          propertyName,
          status: 'paid',
          unitLabel: leftUnitLabel,
          description: leftDescription,
          amountRaw: leftAmountRaw,
          generatedDateRaw: get(LEFT_COLS.generatedDate),
          payrollPeriod: get(LEFT_COLS.payrollPeriod),
          responsible: '',
          notes: get(LEFT_COLS.notes),
        })
      }

      const rightUnitLabel = get(RIGHT_COLS.unitLabel)
      const rightDescription = get(RIGHT_COLS.description)
      const rightAmountRaw = get(RIGHT_COLS.amount)
      if (rightUnitLabel || rightDescription || rightAmountRaw) {
        rows.push({
          sheetName: sheet.name,
          rowNumber,
          side: 'derecha',
          propertyName,
          status: 'pending',
          unitLabel: rightUnitLabel,
          description: rightDescription,
          amountRaw: rightAmountRaw,
          generatedDateRaw: '',
          payrollPeriod: get(RIGHT_COLS.payrollPeriod),
          responsible: get(RIGHT_COLS.responsible),
          notes: get(RIGHT_COLS.notes),
        })
      }
    })
  }

  return rows
}

export const validateChargeRow = (row: ParsedChargeRow): ValidatedChargeRow => {
  const errors: string[] = []

  if (!row.propertyName) errors.push('La pestaña no tiene nombre de propiedad.')

  const amount = Number(row.amountRaw.replace(/[^0-9.-]/g, ''))
  if (!row.amountRaw || Number.isNaN(amount) || amount < 0) {
    errors.push(
      row.status === 'paid' ? 'El "Cobro Generado" no es un número válido.' : 'El "Total a Cobrar" no es un número válido.',
    )
  }

  if (row.generatedDateRaw && !DATE_RE.test(row.generatedDateRaw)) {
    errors.push('Fecha Cobro Generado debe tener formato AAAA-MM-DD.')
  }

  return {
    sheetName: row.sheetName,
    rowNumber: row.rowNumber,
    side: row.side,
    propertyName: row.propertyName,
    status: row.status,
    unitLabel: row.unitLabel || undefined,
    description: row.description || undefined,
    amount,
    generatedDate: row.generatedDateRaw || undefined,
    payrollPeriod: row.payrollPeriod || undefined,
    responsible: row.responsible || undefined,
    notes: row.notes || undefined,
    errors,
  }
}

// Firma única de un cobro (propiedad + apartamento + descripción + monto +
// estado + fechas + responsable). Se usa para detectar si una fila del
// Excel ya se había importado antes, de modo que subir el mismo archivo
// dos veces no duplique los cobros.
const chargeSignature = (
  propertyId: string,
  unitLabel: string | null,
  description: string | null,
  amount: number,
  status: PaymentStatus,
  generatedDate: string | null,
  payrollPeriod: string | null,
  responsible: string | null,
): string =>
  [
    propertyId,
    unitLabel ?? '',
    (description ?? '').trim().toLowerCase(),
    amount.toFixed(2),
    status,
    generatedDate ?? '',
    payrollPeriod ?? '',
    (responsible ?? '').trim().toLowerCase(),
  ].join('|')

export const importValidatedChargeRows = async (
  rows: ValidatedChargeRow[],
  onProgress?: (done: number, total: number) => void,
): Promise<ImportChargeOutcome[]> => {
  const [properties, existingCharges] = await Promise.all([fetchProperties(), fetchCharges()])

  const propertyCache = new Map(properties.map((p) => [p.name.trim().toLowerCase(), p.id]))

  const seenSignatures = new Set(
    existingCharges.map((c) =>
      chargeSignature(
        c.propertyId,
        c.unitLabel ?? null,
        c.description ?? null,
        c.amount,
        c.status,
        c.generatedDate ?? null,
        c.payrollPeriod ?? null,
        c.responsible ?? null,
      ),
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

  const outcomes: ImportChargeOutcome[] = []

  for (let i = 0; i < rows.length; i += 1) {
    const row = rows[i]
    try {
      const propertyId = await findOrCreateProperty(row.propertyName)

      const generatedDate = row.status === 'paid' ? (row.generatedDate ?? null) : null
      const responsible = row.status === 'pending' ? (row.responsible ?? null) : null

      const signature = chargeSignature(
        propertyId,
        row.unitLabel ?? null,
        row.description ?? null,
        row.amount,
        row.status,
        generatedDate,
        row.payrollPeriod ?? null,
        responsible,
      )
      if (seenSignatures.has(signature)) {
        outcomes.push({
          sheetName: row.sheetName,
          rowNumber: row.rowNumber,
          side: row.side,
          propertyName: row.propertyName,
          success: true,
          skipped: true,
          message: 'Ya se había importado antes (fila omitida para evitar duplicado).',
        })
        onProgress?.(i + 1, rows.length)
        continue
      }

      const { error } = await supabase.from('charges').insert({
        property_id: propertyId,
        unit_label: row.unitLabel ?? null,
        description: row.description ?? null,
        amount: row.amount,
        status: row.status,
        generated_date: generatedDate,
        payroll_period: row.payrollPeriod ?? null,
        responsible,
        notes: row.notes ?? null,
      })
      if (error) throw error

      seenSignatures.add(signature)
      outcomes.push({
        sheetName: row.sheetName,
        rowNumber: row.rowNumber,
        side: row.side,
        propertyName: row.propertyName,
        success: true,
        message: 'Importado.',
      })
    } catch (err) {
      const message = getErrorMessage(err, 'Error desconocido.')
      outcomes.push({
        sheetName: row.sheetName,
        rowNumber: row.rowNumber,
        side: row.side,
        propertyName: row.propertyName,
        success: false,
        message,
      })
    }
    onProgress?.(i + 1, rows.length)
  }

  return outcomes
}

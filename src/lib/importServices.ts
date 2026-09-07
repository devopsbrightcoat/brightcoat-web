// ---------------------------------------------------------------------------
// Importador de la plantilla "Servicios" (ver /public/plantilla-servicios.xlsx).
// Cada PESTAÑA es una propiedad (el nombre de la pestaña = el nombre de la
// propiedad; la hoja "Instrucciones" se ignora). Dentro de cada pestaña hay
// dos tablas apiladas — "SUBIDO A OPS" y "PENDIENTE" — que definen el
// payment_status de cada fila sin necesidad de una columna de estado de
// cobro: el importador detecta esos títulos de sección al recorrer la hoja.
// ---------------------------------------------------------------------------

import ExcelJS from 'exceljs'
import { fetchEmployees, fetchProperties, fetchServiceTypes, fetchServices } from './api'
import { supabase } from './supabase'
import type { PaymentStatus, ServiceCategory, ServiceStatus } from '../types'

const IGNORED_SHEETS = new Set(['instrucciones'])

const normalize = (s: string) =>
  s
    .trim()
    .toLowerCase()
    .normalize('NFD')
    .replace(/[\u0300-\u036f]/g, '') // quita acentos

const SECTION_MARKERS: { test: (normalized: string) => boolean; paymentStatus: PaymentStatus }[] = [
  { test: (n) => n.startsWith('subido a ops'), paymentStatus: 'paid' },
  { test: (n) => n === 'pendiente', paymentStatus: 'pending' },
]

export type ParsedRow = {
  sheetName: string
  rowNumber: number
  propertyName: string
  paymentStatus: PaymentStatus
  unitLabel: string
  serviceTypeName: string
  serviceCategoryRaw: string
  unitSize: string
  costRaw: string
  statusRaw: string
  scheduledDateRaw: string
  paidDateRaw: string
  employeeName: string
  notes: string
}

export type ValidatedRow = {
  sheetName: string
  rowNumber: number
  propertyName: string
  paymentStatus: PaymentStatus
  unitLabel?: string
  serviceTypeName: string
  serviceCategory: ServiceCategory
  unitSize?: string
  cost: number
  status: ServiceStatus
  scheduledDate?: string
  paidDate?: string
  employeeName?: string
  notes?: string
  errors: string[]
}

export type ImportOutcome = {
  sheetName: string
  rowNumber: number
  propertyName: string
  success: boolean
  // true cuando la fila no se insertó porque ya existía un servicio
  // idéntico (mismo tipo, costo, fecha, etc.) — evita duplicar datos si
  // Blanca sube el mismo archivo más de una vez.
  skipped?: boolean
  message: string
}

const CATEGORY_MAP: Record<string, ServiceCategory> = {
  pintura: 'painting',
  limpieza: 'cleaning',
  'make ready': 'make_ready',
  reparacion: 'repair',
  otro: 'other',
}

const STATUS_MAP: Record<string, ServiceStatus> = {
  pendiente: 'pending',
  'en proceso': 'in_progress',
  completado: 'completed',
}

const DATE_RE = /^\d{4}-\d{2}-\d{2}$/

const cellText = (value: ExcelJS.CellValue): string => {
  if (value == null) return ''
  if (value instanceof Date) return value.toISOString().slice(0, 10)
  if (typeof value === 'object' && 'text' in value) return String(value.text ?? '').trim()
  if (typeof value === 'object' && 'result' in value) return String(value.result ?? '').trim()
  return String(value).trim()
}

// Columnas dentro de cada tabla (ya no hay columna "Propiedad" ni "Estado de
// cobro" — la propiedad es el nombre de la pestaña, y el cobro se define por
// la sección "SUBIDO A OPS" / "PENDIENTE" en la que está la fila).
const COLS = {
  unitLabel: 1,
  serviceTypeName: 2,
  serviceCategory: 3,
  unitSize: 4,
  cost: 5,
  status: 6,
  scheduledDate: 7,
  paidDate: 8,
  employeeName: 9,
  notes: 10,
} as const

export const parseServicesWorkbook = async (file: File): Promise<ParsedRow[]> => {
  const buffer = await file.arrayBuffer()
  const workbook = new ExcelJS.Workbook()
  await workbook.xlsx.load(buffer)

  const propertySheets = workbook.worksheets.filter(
    (sheet) => !IGNORED_SHEETS.has(sheet.name.trim().toLowerCase()),
  )
  if (propertySheets.length === 0) {
    throw new Error('El archivo no tiene ninguna pestaña de propiedad (aparte de "Instrucciones").')
  }

  const rows: ParsedRow[] = []

  for (const sheet of propertySheets) {
    const propertyName = sheet.name.trim()
    let currentPaymentStatus: PaymentStatus | null = null
    let expectHeaderNext = false

    sheet.eachRow((row, rowNumber) => {
      const firstCell = normalize(cellText(row.getCell(1).value))

      const marker = SECTION_MARKERS.find((m) => m.test(firstCell))
      if (marker) {
        currentPaymentStatus = marker.paymentStatus
        expectHeaderNext = true
        return // fila de título de sección, no es dato
      }

      if (expectHeaderNext) {
        expectHeaderNext = false
        return // fila de encabezados de esa tabla
      }

      if (currentPaymentStatus === null) return // todavía no encontramos ninguna sección

      const get = (col: number) => cellText(row.getCell(col).value)
      const serviceTypeName = get(COLS.serviceTypeName)
      const costRaw = get(COLS.cost)
      const unitLabel = get(COLS.unitLabel)
      if (!serviceTypeName && !costRaw && !unitLabel) return // fila vacía dentro de la tabla

      rows.push({
        sheetName: sheet.name,
        rowNumber,
        propertyName,
        paymentStatus: currentPaymentStatus,
        unitLabel,
        serviceTypeName,
        serviceCategoryRaw: get(COLS.serviceCategory),
        unitSize: get(COLS.unitSize),
        costRaw,
        statusRaw: get(COLS.status),
        scheduledDateRaw: get(COLS.scheduledDate),
        paidDateRaw: get(COLS.paidDate),
        employeeName: get(COLS.employeeName),
        notes: get(COLS.notes),
      })
    })
  }

  return rows
}

export const validateRow = (row: ParsedRow): ValidatedRow => {
  const errors: string[] = []

  if (!row.propertyName) errors.push('La pestaña no tiene nombre de propiedad.')
  if (!row.serviceTypeName) errors.push('Falta el tipo de servicio.')

  const cost = Number(row.costRaw.replace(/[^0-9.-]/g, ''))
  if (!row.costRaw || Number.isNaN(cost) || cost < 0) errors.push('El costo no es un número válido.')

  const categoryKey = row.serviceCategoryRaw.trim().toLowerCase()
  let serviceCategory: ServiceCategory = 'other'
  if (categoryKey) {
    const mapped = CATEGORY_MAP[categoryKey]
    if (!mapped) errors.push(`Categoría "${row.serviceCategoryRaw}" no reconocida.`)
    else serviceCategory = mapped
  }

  const statusKey = row.statusRaw.trim().toLowerCase()
  let status: ServiceStatus = 'pending'
  if (statusKey) {
    const mapped = STATUS_MAP[statusKey]
    if (!mapped) errors.push(`Estado del trabajo "${row.statusRaw}" no reconocido.`)
    else status = mapped
  }

  if (row.scheduledDateRaw && !DATE_RE.test(row.scheduledDateRaw)) {
    errors.push('Fecha programada debe tener formato AAAA-MM-DD.')
  }
  if (row.paidDateRaw && !DATE_RE.test(row.paidDateRaw)) {
    errors.push('Fecha de cobro debe tener formato AAAA-MM-DD.')
  }

  return {
    sheetName: row.sheetName,
    rowNumber: row.rowNumber,
    propertyName: row.propertyName,
    paymentStatus: row.paymentStatus,
    unitLabel: row.unitLabel || undefined,
    serviceTypeName: row.serviceTypeName.trim(),
    serviceCategory,
    unitSize: row.unitSize || undefined,
    cost,
    status,
    scheduledDate: row.scheduledDateRaw || undefined,
    paidDate: row.paidDateRaw || undefined,
    employeeName: row.employeeName || undefined,
    notes: row.notes || undefined,
    errors,
  }
}

// Firma única de un servicio (propiedad + tipo + unidad + costo + fecha +
// estado de cobro). Se usa para detectar si una fila del Excel ya se había
// importado antes, de modo que subir el mismo archivo dos veces no duplique
// los trabajos — algo que puede pasar fácilmente con el flujo de "cortar y
// pegar" entre las tablas SUBIDO A OPS / PENDIENTE.
const serviceSignature = (
  propertyId: string,
  serviceTypeId: string,
  unitLabel: string | null,
  cost: number,
  scheduledDate: string | null,
  paymentStatus: PaymentStatus,
  paidDate: string | null,
): string =>
  [propertyId, serviceTypeId, unitLabel ?? '', cost.toFixed(2), scheduledDate ?? '', paymentStatus, paidDate ?? ''].join(
    '|',
  )

export const importValidatedRows = async (
  rows: ValidatedRow[],
  onProgress?: (done: number, total: number) => void,
): Promise<ImportOutcome[]> => {
  const [properties, serviceTypes, employees, existingServices] = await Promise.all([
    fetchProperties(),
    fetchServiceTypes(),
    fetchEmployees(),
    fetchServices(),
  ])

  const propertyCache = new Map(properties.map((p) => [p.name.trim().toLowerCase(), p.id]))
  const serviceTypeCache = new Map(serviceTypes.map((s) => [s.name.trim().toLowerCase(), s.id]))
  const employeeCache = new Map(employees.map((e) => [e.name.trim().toLowerCase(), e.id]))

  const seenSignatures = new Set(
    existingServices.map((s) =>
      serviceSignature(
        s.propertyId,
        s.serviceTypeId,
        s.unitLabel ?? null,
        s.cost,
        s.scheduledDate || null,
        s.paymentStatus,
        s.paidDate ?? null,
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

  const findOrCreateServiceType = async (name: string, category: ServiceCategory): Promise<string> => {
    const key = name.toLowerCase()
    const cached = serviceTypeCache.get(key)
    if (cached) return cached
    const { data, error } = await supabase.from('service_types').insert({ name, category }).select('id').single()
    if (error) throw error
    serviceTypeCache.set(key, data.id)
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

  const outcomes: ImportOutcome[] = []

  for (let i = 0; i < rows.length; i += 1) {
    const row = rows[i]
    try {
      const propertyId = await findOrCreateProperty(row.propertyName)
      const serviceTypeId = await findOrCreateServiceType(row.serviceTypeName, row.serviceCategory)
      const employeeId = row.employeeName ? await findOrCreateEmployee(row.employeeName) : null

      const paidDateForSignature = row.paymentStatus === 'paid' ? (row.paidDate ?? null) : null
      const signature = serviceSignature(
        propertyId,
        serviceTypeId,
        row.unitLabel ?? null,
        row.cost,
        row.scheduledDate ?? null,
        row.paymentStatus,
        paidDateForSignature,
      )
      if (seenSignatures.has(signature)) {
        outcomes.push({
          sheetName: row.sheetName,
          rowNumber: row.rowNumber,
          propertyName: row.propertyName,
          success: true,
          skipped: true,
          message: 'Ya se había importado antes (fila omitida para evitar duplicado).',
        })
        onProgress?.(i + 1, rows.length)
        continue
      }

      // No hay columna de "fecha de completado" en la plantilla — si el
      // trabajo ya quedó como Completado, se asume la fecha programada.
      const completedDate = row.status === 'completed' ? (row.scheduledDate ?? null) : null

      const { error } = await supabase.from('services').insert({
        property_id: propertyId,
        service_type_id: serviceTypeId,
        employee_id: employeeId,
        unit_label: row.unitLabel ?? null,
        unit_size: row.unitSize ?? null,
        description: row.notes ?? null,
        status: row.status,
        scheduled_date: row.scheduledDate ?? null,
        completed_date: completedDate,
        cost: row.cost,
        payment_status: row.paymentStatus,
        paid_date: row.paymentStatus === 'paid' ? (row.paidDate ?? null) : null,
      })
      if (error) throw error

      seenSignatures.add(signature)
      outcomes.push({
        sheetName: row.sheetName,
        rowNumber: row.rowNumber,
        propertyName: row.propertyName,
        success: true,
        message: 'Importado.',
      })
    } catch (err) {
      const message = err instanceof Error ? err.message : 'Error desconocido.'
      outcomes.push({ sheetName: row.sheetName, rowNumber: row.rowNumber, propertyName: row.propertyName, success: false, message })
    }
    onProgress?.(i + 1, rows.length)
  }

  return outcomes
}

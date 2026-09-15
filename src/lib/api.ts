// ---------------------------------------------------------------------------
// Queries reales a Supabase. Cada fetch* mapea las filas (snake_case) a los
// tipos de la app (src/types.ts, camelCase) — misma forma que src/mocks/data.ts
// para que las páginas no tengan que cambiar al pasar de mock a real.
// ---------------------------------------------------------------------------

import type { ProfileRole } from '../auth/AuthProvider'
import type { AppNotification, Charge, CompanySettings, Employee, Expense, ExpenseTemplate, PayrollEntry, Property, Schedule, ServiceType, Vendor } from '../types'
import { supabase } from './supabase'
import type {
  ChargeRow,
  CompanySettingsRow,
  EmployeeRow,
  ExpenseRow,
  ExpenseTemplateRow,
  NotificationRow,
  PayrollEntryRow,
  PropertyRow,
  ScheduleRow,
  ServiceTypeRow,
  VendorRow,
} from './dbTypes'

const mapProperty = (row: PropertyRow): Property => ({
  id: row.id,
  name: row.name,
  address: row.address ?? '',
  clientType: row.client_type,
  managerContact: row.manager_contact ?? undefined,
  status: row.status,
})

export const fetchProperties = async (): Promise<Property[]> => {
  const { data, error } = await supabase.from('properties').select('*').order('name')
  if (error) throw error
  return ((data ?? []) as PropertyRow[]).map(mapProperty)
}

const mapServiceType = (row: ServiceTypeRow): ServiceType => ({
  id: row.id,
  name: row.name,
  category: row.category,
})

export const fetchServiceTypes = async (): Promise<ServiceType[]> => {
  const { data, error } = await supabase.from('service_types').select('*').order('name')
  if (error) throw error
  return ((data ?? []) as ServiceTypeRow[]).map(mapServiceType)
}

export const createServiceType = async (data: { name: string; category: ServiceType['category'] }): Promise<void> => {
  const { error } = await supabase.from('service_types').insert({ name: data.name, category: data.category })
  if (error) throw error
}

export const updateServiceType = async (
  id: string,
  patch: { name: string; category: ServiceType['category'] },
): Promise<void> => {
  const { error } = await supabase
    .from('service_types')
    .update({ name: patch.name, category: patch.category })
    .eq('id', id)
  if (error) throw error
}

// `charges.service_type_id` es SET NULL (un cobro puede quedar sin tipo de
// servicio si se borra), pero `schedules.service_type_id` es RESTRICT — si
// el tipo de servicio tiene horarios asociados, Postgres rechaza el delete
// con 23503, que traducimos a un mensaje claro.
export const deleteServiceType = async (id: string): Promise<void> => {
  const { error } = await supabase.from('service_types').delete().eq('id', id)
  if (error) {
    if (error.code === '23503') {
      throw new Error('Este tipo de servicio tiene horarios asociados — no se puede eliminar.')
    }
    throw error
  }
}

const mapEmployee = (row: EmployeeRow): Employee => ({
  id: row.id,
  name: row.name,
  role: row.role ?? '—',
  contactNumber: row.contact_number ?? undefined,
  address: row.address ?? undefined,
  status: row.status,
  w2Status: row.w2_status,
  hourlyRate: row.hourly_rate != null ? Number(row.hourly_rate) : undefined,
})

export const fetchEmployees = async (): Promise<Employee[]> => {
  const { data, error } = await supabase.from('employees').select('*').order('name')
  if (error) throw error
  return ((data ?? []) as EmployeeRow[]).map(mapEmployee)
}

const mapExpense = (row: ExpenseRow): Expense => ({
  id: row.id,
  invoiceNumber: row.invoice_number ?? undefined,
  amount: Number(row.amount),
  date: row.date,
  description: row.description ?? undefined,
  vendorId: row.vendor_id ?? undefined,
})

export const fetchExpenses = async (): Promise<Expense[]> => {
  const { data, error } = await supabase.from('expenses').select('*').order('date', { ascending: false })
  if (error) throw error
  return ((data ?? []) as ExpenseRow[]).map(mapExpense)
}

export const createExpense = async (data: {
  invoiceNumber: string
  amount: number
  date: string
  description: string
  vendorId?: string
}): Promise<void> => {
  const { error } = await supabase.from('expenses').insert({
    invoice_number: data.invoiceNumber.trim() || null,
    amount: data.amount,
    date: data.date,
    description: data.description.trim() || null,
    vendor_id: data.vendorId || null,
  })
  if (error) throw error
}

export const updateExpense = async (
  id: string,
  patch: { invoiceNumber: string; amount: number; date: string; description: string; vendorId?: string },
): Promise<void> => {
  const { error } = await supabase
    .from('expenses')
    .update({
      invoice_number: patch.invoiceNumber.trim() || null,
      amount: patch.amount,
      date: patch.date,
      description: patch.description.trim() || null,
      vendor_id: patch.vendorId || null,
    })
    .eq('id', id)
  if (error) throw error
}

// ---------------------------------------------------------------------------
// "Gastos fijos" — catálogo de plantillas para Agregar gasto (ver comentario
// en types.ts). Tabla propia expense_templates, sin relación hacia expenses.
// ---------------------------------------------------------------------------

const mapExpenseTemplate = (row: ExpenseTemplateRow): ExpenseTemplate => ({
  id: row.id,
  name: row.name,
  amount: row.amount == null ? undefined : Number(row.amount),
  description: row.description ?? undefined,
})

export const fetchExpenseTemplates = async (): Promise<ExpenseTemplate[]> => {
  const { data, error } = await supabase.from('expense_templates').select('*').order('name')
  if (error) throw error
  return ((data ?? []) as ExpenseTemplateRow[]).map(mapExpenseTemplate)
}

export const createExpenseTemplate = async (data: {
  name: string
  amount: number | null
  description: string
}): Promise<void> => {
  const { error } = await supabase.from('expense_templates').insert({
    name: data.name.trim(),
    amount: data.amount,
    description: data.description.trim() || null,
  })
  if (error) throw error
}

export const updateExpenseTemplate = async (
  id: string,
  patch: { name: string; amount: number | null; description: string },
): Promise<void> => {
  const { error } = await supabase
    .from('expense_templates')
    .update({
      name: patch.name.trim(),
      amount: patch.amount,
      description: patch.description.trim() || null,
    })
    .eq('id', id)
  if (error) throw error
}

export const deleteExpenseTemplate = async (id: string): Promise<void> => {
  const { error } = await supabase.from('expense_templates').delete().eq('id', id)
  if (error) throw error
}

// ---------------------------------------------------------------------------
// Proveedores — catálogo de proveedores (ver comentario en types.ts). A
// diferencia de expense_templates, sí tiene una relación real: expenses.vendor_id
// (on delete set null — borrar un proveedor no borra el gasto, solo lo desliga).
// ---------------------------------------------------------------------------

const mapVendor = (row: VendorRow): Vendor => ({
  id: row.id,
  name: row.name,
  notes: row.notes ?? undefined,
})

export const fetchVendors = async (): Promise<Vendor[]> => {
  const { data, error } = await supabase.from('vendors').select('*').order('name')
  if (error) throw error
  return ((data ?? []) as VendorRow[]).map(mapVendor)
}

export const createVendor = async (data: { name: string; notes: string }): Promise<void> => {
  const { error } = await supabase
    .from('vendors')
    .insert({ name: data.name.trim(), notes: data.notes.trim() || null })
  if (error) throw error
}

export const updateVendor = async (id: string, patch: { name: string; notes: string }): Promise<void> => {
  const { error } = await supabase
    .from('vendors')
    .update({ name: patch.name.trim(), notes: patch.notes.trim() || null })
    .eq('id', id)
  if (error) throw error
}

export const deleteVendor = async (id: string): Promise<void> => {
  const { error } = await supabase.from('vendors').delete().eq('id', id)
  if (error) throw error
}

// ---------------------------------------------------------------------------
// Planillas — pago de mano de obra por trabajo completo (propiedad + unidad
// + empleado + servicio, todos obligatorios). Tabla propia (payroll_entries)
// desde 20260917000000_split_expenses_payroll.sql, separada de expenses (que
// ahora es un módulo independiente de facturas/gastos). El desglose del
// servicio vive en payroll_entry_items — ver
// 20260918000000_payroll_service_breakdown.sql. "Cobro" (amount, autocompletado
// desde `charges` al elegir un horario), "Pago" (suma del desglose) y
// "Ganancia" (Cobro - Pago) se calculan en la UI, no se guardan — salvo
// `taxable`, que sí se guarda (no todos los servicios llevan impuesto).
// ---------------------------------------------------------------------------

const mapPayrollEntry = (row: PayrollEntryRow): PayrollEntry => ({
  id: row.id,
  propertyId: row.property_id,
  unitLabel: row.unit_label,
  employeeId: row.employee_id,
  serviceName: row.service_name,
  amount: row.amount == null ? null : Number(row.amount),
  date: row.date,
  notes: row.notes ?? undefined,
  scheduleId: row.schedule_id ?? undefined,
  taxable: row.taxable,
  items: (row.payroll_entry_items ?? []).map((item) => ({
    id: item.id,
    description: item.description,
    amount: Number(item.amount),
  })),
})

export const fetchPayrollEntries = async (): Promise<PayrollEntry[]> => {
  const { data, error } = await supabase
    .from('payroll_entries')
    .select('*, payroll_entry_items(*)')
    .order('date', { ascending: false })
    .order('position', { foreignTable: 'payroll_entry_items', ascending: true })
  if (error) throw error
  return ((data ?? []) as PayrollEntryRow[]).map(mapPayrollEntry)
}

type PayrollEntryInput = {
  propertyId: string
  unitLabel: string
  employeeId: string
  serviceName: string
  amount: number | null
  date: string
  notes?: string
  scheduleId?: string
  taxable: boolean
  items: { description: string; amount: number }[]
}

const insertPayrollEntryItems = async (payrollEntryId: string, items: PayrollEntryInput['items']): Promise<void> => {
  if (items.length === 0) return
  const { error } = await supabase.from('payroll_entry_items').insert(
    items.map((item, index) => ({
      payroll_entry_id: payrollEntryId,
      description: item.description,
      amount: item.amount,
      position: index,
    })),
  )
  if (error) throw error
}

export const createPayrollEntry = async (data: PayrollEntryInput): Promise<void> => {
  const { data: entry, error } = await supabase
    .from('payroll_entries')
    .insert({
      property_id: data.propertyId,
      unit_label: data.unitLabel,
      employee_id: data.employeeId,
      service_name: data.serviceName,
      amount: data.amount,
      date: data.date,
      notes: data.notes || null,
      schedule_id: data.scheduleId || null,
      taxable: data.taxable,
    })
    .select('id')
    .single()
  if (error) throw error

  await insertPayrollEntryItems(entry.id as string, data.items)
}

// El desglose se reemplaza completo en cada edición — más simple que
// diffear filas individuales, y en la práctica siempre se edita como un
// conjunto (se agregan/quitan líneas junto con el resto del formulario).
export const updatePayrollEntry = async (id: string, data: PayrollEntryInput): Promise<void> => {
  const { error } = await supabase
    .from('payroll_entries')
    .update({
      property_id: data.propertyId,
      unit_label: data.unitLabel,
      employee_id: data.employeeId,
      service_name: data.serviceName,
      amount: data.amount,
      date: data.date,
      notes: data.notes || null,
      taxable: data.taxable,
    })
    .eq('id', id)
  if (error) throw error

  const { error: deleteError } = await supabase.from('payroll_entry_items').delete().eq('payroll_entry_id', id)
  if (deleteError) throw deleteError

  await insertPayrollEntryItems(id, data.items)
}

// Pedido de Javier: poder borrar una planilla por si se cometió un error.
// El desglose (payroll_entry_items) se borra solo por "on delete cascade".
// Si la planilla estaba ligada a un horario (schedule_id), ese horario
// vuelve a aparecer disponible en el selector "Horario relacionado" de
// inmediato — fetchSchedulesForEmployee excluye por lo que hay en
// payroll_entries en el momento de la consulta, así que no hace falta
// tocar `schedules` para nada.
export const deletePayrollEntry = async (id: string): Promise<void> => {
  const { error } = await supabase.from('payroll_entries').delete().eq('id', id)
  if (error) throw error
}

const mapCharge = (row: ChargeRow): Charge => ({
  id: row.id,
  propertyId: row.property_id,
  unitLabel: row.unit_label ?? undefined,
  serviceTypeId: row.service_type_id ?? undefined,
  description: row.description ?? undefined,
  amount: Number(row.amount),
  status: row.status,
  generatedDate: row.generated_date ?? undefined,
  payrollPeriod: row.payroll_period ?? undefined,
  responsible: row.responsible ?? undefined,
  notes: row.notes ?? undefined,
  extras: row.extras ?? [],
  invoiceNumber: row.invoice_number ?? undefined,
  taxPaid: row.tax_paid,
  taxPaidDate: row.tax_paid_date ?? undefined,
})

export const fetchCharges = async (): Promise<Charge[]> => {
  const { data, error } = await supabase.from('charges').select('*').order('created_at', { ascending: false })
  if (error) throw error
  return ((data ?? []) as ChargeRow[]).map(mapCharge)
}

// Usado por el selector "Horario relacionado" en Planillas para autocompletar
// el nuevo campo "Cobro" con el total real cobrado por ese trabajo. `charges`
// no tiene una columna schedule_id — se identifica con el mismo criterio que
// usa el índice único charges_unique_identity (20260912000000_unify_charges.sql)
// para no duplicar cobros: propiedad + unidad + tipo de servicio + fecha. El
// filtro de unit_label se hace en JS (no en la consulta) porque en `charges`
// puede venir como null o como '' según el origen del cobro, y acá se quiere
// tratar ambos como "sin unidad". Si no hay un cobro capturado todavía para
// ese horario, devuelve null y el campo se completa a mano.
export const fetchChargeForSchedule = async (
  propertyId: string,
  unitLabel: string | undefined,
  serviceTypeId: string,
  date: string,
): Promise<Charge | null> => {
  const { data, error } = await supabase
    .from('charges')
    .select('*')
    .eq('property_id', propertyId)
    .eq('service_type_id', serviceTypeId)
    .eq('generated_date', date)
  if (error) throw error
  const wanted = unitLabel ?? ''
  const match = ((data ?? []) as ChargeRow[]).find((row) => (row.unit_label ?? '') === wanted)
  return match ? mapCharge(match) : null
}

// Marca un cobro como pagado/subido a OPS junto con su invoice number — ver
// ChargeInvoiceModal.tsx. El invoice number se captura en el mismo paso que
// el cambio de estatus para no dejar un cobro "pagado" sin invoice number
// asociado; también permite corregir el invoice number de un cobro que ya
// está pagado (el estatus se reenvía sin cambios en ese caso).
export const updateChargeStatus = async (
  id: string,
  data: { status: Charge['status']; invoiceNumber?: string },
): Promise<void> => {
  const { error } = await supabase
    .from('charges')
    .update({ status: data.status, invoice_number: data.invoiceNumber?.trim() || null })
    .eq('id', id)
  if (error) throw error
}

// Marca (o desmarca) el impuesto de ventas de uno o varios cobros como
// remitido al estado — ver pages/Impuestos.tsx. `ids` puede ser un solo
// cobro (toggle individual) o todos los de un mes (botón en bloque).
export const updateChargesTaxPaid = async (ids: string[], taxPaid: boolean): Promise<void> => {
  const { error } = await supabase
    .from('charges')
    .update({ tax_paid: taxPaid, tax_paid_date: taxPaid ? new Date().toISOString().slice(0, 10) : null })
    .in('id', ids)
  if (error) throw error
}

// Edita los campos generales de un cobro — todo excepto estatus/invoice
// number, que siguen su propio flujo en ChargeInvoiceModal (ver
// updateChargeStatus). Si el cobro coincide con un horario 'delivered' bajo
// el mismo criterio que usa charges_unique_identity (propiedad + unidad +
// tipo de servicio + fecha, ver fetchChargeForSchedule/createScheduleCharge)
// y la edición cambia alguno de esos 4 campos, el horario se actualiza en
// cascada con los valores nuevos para que sigan enlazados. Esta es a
// propósito la única vía que sí puede tocar un horario 'delivered' — el
// objetivo es sincronizarlo con el cobro editado, no volverlo editable en
// general (ver el guard `.neq('status', 'delivered')` en updateSchedule,
// pensado para el caso contrario: evitar que editar el horario deje al
// cobro ya generado desincronizado). Si tras la edición ya no se puede
// identificar un horario coincidente (se vació servicio o fecha) no se
// toca nada más — el cobro igual se guarda.
export const updateCharge = async (
  id: string,
  patch: {
    propertyId: string
    unitLabel?: string
    serviceTypeId?: string
    generatedDate?: string
    description?: string
    amount: number
    responsible?: string
    payrollPeriod?: string
    notes?: string
    extras: { description: string; amount: number }[]
  },
): Promise<void> => {
  const { data: existing, error: fetchError } = await supabase
    .from('charges')
    .select('property_id, unit_label, service_type_id, generated_date')
    .eq('id', id)
    .single()
  if (fetchError) throw fetchError

  const newUnitLabel = patch.unitLabel?.trim() || null
  const newServiceTypeId = patch.serviceTypeId || null
  const newDate = patch.generatedDate || null

  const { error } = await supabase
    .from('charges')
    .update({
      property_id: patch.propertyId,
      unit_label: newUnitLabel,
      service_type_id: newServiceTypeId,
      generated_date: newDate,
      description: patch.description?.trim() || null,
      amount: patch.amount,
      responsible: patch.responsible?.trim() || null,
      payroll_period: patch.payrollPeriod?.trim() || null,
      notes: patch.notes?.trim() || null,
      extras: patch.extras,
    })
    .eq('id', id)
  if (error) {
    if (error.code === '23505') {
      throw new Error('Ya existe otro cobro para esa misma propiedad, unidad, servicio y fecha.')
    }
    throw error
  }

  const identityChanged =
    existing.property_id !== patch.propertyId ||
    (existing.unit_label ?? null) !== newUnitLabel ||
    existing.service_type_id !== newServiceTypeId ||
    existing.generated_date !== newDate

  if (!identityChanged || !existing.service_type_id || !existing.generated_date || !newServiceTypeId || !newDate) {
    return
  }

  const { data: schedules, error: schedError } = await supabase
    .from('schedules')
    .select('id, unit_label')
    .eq('property_id', existing.property_id)
    .eq('service_type_id', existing.service_type_id)
    .eq('scheduled_date', existing.generated_date)
    .eq('status', 'delivered')
  if (schedError) throw schedError

  const wantedOld = existing.unit_label ?? ''
  const match = (schedules ?? []).find((s) => (s.unit_label ?? '') === wantedOld)
  if (!match) return

  const { error: schedUpdateError } = await supabase
    .from('schedules')
    .update({
      property_id: patch.propertyId,
      unit_label: newUnitLabel,
      service_type_id: newServiceTypeId,
      scheduled_date: newDate,
    })
    .eq('id', match.id)
  if (schedUpdateError) throw schedUpdateError
}


// ---------------------------------------------------------------------------
// Updates — usados por los formularios de edición (Propiedades, Empleados).
// Cada uno mapea el patch en camelCase de la app a las columnas snake_case
// reales de Supabase.
// ---------------------------------------------------------------------------

export const updateProperty = async (
  id: string,
  patch: {
    name: string
    address: string
    clientType: Property['clientType']
    managerContact: string
    status: Property['status']
  },
): Promise<void> => {
  const { error } = await supabase
    .from('properties')
    .update({
      name: patch.name,
      address: patch.address || null,
      client_type: patch.clientType,
      manager_contact: patch.managerContact || null,
      status: patch.status,
    })
    .eq('id', id)
  if (error) throw error
}

export const updateEmployee = async (
  id: string,
  patch: {
    name: string
    role: string
    contactNumber: string
    address: string
    status: Employee['status']
    w2Status: Employee['w2Status']
    hourlyRate: number | null
  },
): Promise<void> => {
  const { error } = await supabase
    .from('employees')
    .update({
      name: patch.name,
      role: patch.role || null,
      contact_number: patch.contactNumber || null,
      address: patch.address || null,
      status: patch.status,
      w2_status: patch.w2Status,
      hourly_rate: patch.hourlyRate,
    })
    .eq('id', id)
  if (error) throw error
}

export const createEmployee = async (data: {
  name: string
  role: string
  contactNumber: string
  address: string
  status: Employee['status']
  w2Status: Employee['w2Status']
  hourlyRate: number | null
}): Promise<void> => {
  const { error } = await supabase.from('employees').insert({
    name: data.name,
    role: data.role || null,
    contact_number: data.contactNumber || null,
    address: data.address || null,
    status: data.status,
    w2_status: data.w2Status,
    hourly_rate: data.hourlyRate,
  })
  if (error) throw error
}

// Un empleado con horarios o planillas asociadas está protegido por
// RESTRICT en esas dos tablas — Postgres rechaza el delete con 23503, que
// traducimos a un mensaje claro en vez del error crudo de Postgres.
export const deleteEmployee = async (id: string): Promise<void> => {
  const { error } = await supabase.from('employees').delete().eq('id', id)
  if (error) {
    if (error.code === '23503') {
      throw new Error('Este empleado tiene horarios o planillas asociadas — no se puede eliminar.')
    }
    throw error
  }
}

export const createProperty = async (data: {
  name: string
  address: string
  clientType: Property['clientType']
  managerContact: string
  status: Property['status']
}): Promise<void> => {
  const { error } = await supabase.from('properties').insert({
    name: data.name,
    address: data.address || null,
    client_type: data.clientType,
    manager_contact: data.managerContact || null,
    status: data.status,
  })
  if (error) throw error
}

// Una propiedad con horarios, cobros o planillas asociadas está protegida
// por RESTRICT en esas tres tablas — Postgres rechaza el delete con 23503,
// que traducimos a un mensaje claro en vez del error crudo de Postgres.
export const deleteProperty = async (id: string): Promise<void> => {
  const { error } = await supabase.from('properties').delete().eq('id', id)
  if (error) {
    if (error.code === '23503') {
      throw new Error('Esta propiedad tiene horarios, cobros o planillas asociadas — no se puede eliminar.')
    }
    throw error
  }
}

// ---------------------------------------------------------------------------
// Horarios — scheduler semanal de servicios (ver src/pages/Horarios.tsx).
// El cobro de un horario finalizado se guarda directamente en `charges`
// (ver createScheduleCharge más abajo y 20260912000000_unify_charges.sql).
// Las tablas `schedule_charges`/`schedule_charge_extras` de
// 20260910000000_add_schedules.sql quedaron deprecadas y ya no existen
// (ver 20260914000000_drop_deprecated_tables.sql).
// ---------------------------------------------------------------------------

const mapSchedule = (row: ScheduleRow): Schedule => ({
  id: row.id,
  propertyId: row.property_id,
  unitLabel: row.unit_label ?? undefined,
  serviceTypeId: row.service_type_id,
  employeeId: row.employee_id,
  scheduledDate: row.scheduled_date,
  status: row.status,
  rescheduledToId: row.rescheduled_to_id ?? undefined,
})

export const fetchSchedules = async (): Promise<Schedule[]> => {
  const { data, error } = await supabase
    .from('schedules')
    .select('*')
    .order('scheduled_date', { ascending: true })
    .order('created_at', { ascending: true })
  if (error) throw error
  return ((data ?? []) as ScheduleRow[]).map(mapSchedule)
}

// Usado por el selector de "Horario relacionado" en AddPayrollEntryModal —
// a propósito NO es fetchSchedules() + filtro en el cliente: se acota por
// empleado y rango de fechas directo en la consulta para no traer cada vez
// más historial de horarios a medida que la tabla crece.
export const fetchSchedulesForEmployee = async (
  employeeId: string,
  dateFrom: string,
  dateTo: string,
): Promise<Schedule[]> => {
  const { data, error } = await supabase
    .from('schedules')
    .select('*')
    .eq('employee_id', employeeId)
    .gte('scheduled_date', dateFrom)
    .lte('scheduled_date', dateTo)
    .order('scheduled_date', { ascending: false })
  if (error) throw error
  const scheduleRows = ((data ?? []) as ScheduleRow[]).map(mapSchedule)
  if (scheduleRows.length === 0) return scheduleRows

  // No repetir horarios que ya se convirtieron en una planilla (ver
  // payroll_entries.schedule_id) — evita pagar dos veces el mismo trabajo.
  const { data: used, error: usedError } = await supabase
    .from('payroll_entries')
    .select('schedule_id')
    .in('schedule_id', scheduleRows.map((s) => s.id))
  if (usedError) throw usedError
  const usedIds = new Set((used ?? []).map((row) => row.schedule_id as string))
  return scheduleRows.filter((s) => !usedIds.has(s.id))
}

export const createSchedules = async (
  rows: {
    propertyId: string
    employeeId: string
    scheduledDate: string
    unitLabel: string
    serviceTypeId: string
  }[],
): Promise<void> => {
  const { error } = await supabase.from('schedules').insert(
    rows.map((r) => ({
      property_id: r.propertyId,
      employee_id: r.employeeId,
      scheduled_date: r.scheduledDate,
      unit_label: r.unitLabel || null,
      service_type_id: r.serviceTypeId,
    })),
  )
  if (error) throw error
}

// Un horario ya entregado (delivered) siempre tiene un cobro asociado en
// `charges` (ver createScheduleCharge) — permitir editarlo después dejaría
// el cobro ya generado desincronizado de la propiedad/unidad/servicio/fecha
// real del horario. El filtro `.neq('status', 'delivered')` bloquea el
// update a nivel de base de datos (no solo en la UI): si el horario ya
// está entregado, ninguna fila hace match y `.single()` lanza PGRST116,
// que traducimos a un mensaje claro.
export const updateSchedule = async (
  id: string,
  patch: {
    propertyId: string
    employeeId: string
    scheduledDate: string
    unitLabel: string
    serviceTypeId: string
  },
): Promise<void> => {
  const { error } = await supabase
    .from('schedules')
    .update({
      property_id: patch.propertyId,
      employee_id: patch.employeeId,
      scheduled_date: patch.scheduledDate,
      unit_label: patch.unitLabel || null,
      service_type_id: patch.serviceTypeId,
    })
    .eq('id', id)
    .neq('status', 'delivered')
    .neq('status', 'rescheduled')
    .select('id')
    .single()
  if (error) {
    if (error.code === 'PGRST116') {
      throw new Error('Este horario ya fue entregado/cobrado o reagendado — no se puede editar.')
    }
    throw error
  }
}

export const updateScheduleStatus = async (id: string, status: Schedule['status']): Promise<void> => {
  const { error } = await supabase.from('schedules').update({ status }).eq('id', id)
  if (error) throw error
}

// Reagendar: el horario viejo se queda como registro histórico con status
// 'rescheduled' (bloqueado — no se puede editar, eliminar ni volver a
// cambiar de estatus, ver updateSchedule/deleteSchedule) y apunta al
// horario nuevo vía rescheduled_to_id. El horario nuevo es una copia con
// la fecha nueva y el resto de los datos (propiedad/unidad/servicio/
// empleado) igual, arrancando en 'pending' — ver
// 20260922000000_schedule_reschedule.sql.
export const rescheduleSchedule = async (id: string, newDate: string): Promise<void> => {
  const { data: schedule, error: fetchError } = await supabase
    .from('schedules')
    .select('property_id, employee_id, unit_label, service_type_id')
    .eq('id', id)
    .neq('status', 'delivered')
    .neq('status', 'rescheduled')
    .single()
  if (fetchError) {
    if (fetchError.code === 'PGRST116') {
      throw new Error('Este horario ya fue entregado/cobrado o ya fue reagendado — no se puede reagendar de nuevo.')
    }
    throw fetchError
  }

  const { data: newSchedule, error: insertError } = await supabase
    .from('schedules')
    .insert({
      property_id: schedule.property_id,
      employee_id: schedule.employee_id,
      unit_label: schedule.unit_label,
      service_type_id: schedule.service_type_id,
      scheduled_date: newDate,
    })
    .select('id')
    .single()
  if (insertError) throw insertError

  const { error: updateError } = await supabase
    .from('schedules')
    .update({ status: 'rescheduled', rescheduled_to_id: newSchedule.id })
    .eq('id', id)
  if (updateError) throw updateError
}

// Igual que updateSchedule: un horario ya entregado tiene un cobro
// asociado en `charges` — borrarlo dejaría ese cobro huérfano de su
// horario de origen. Un horario reagendado se conserva como registro
// histórico (ver rescheduleSchedule). El filtro `.neq('status', ...)`
// bloquea el delete a nivel de base de datos: si ya está entregado o
// reagendado, ninguna fila hace match y `.single()` lanza PGRST116, que
// traducimos a un mensaje claro.
export const deleteSchedule = async (id: string): Promise<void> => {
  const { error } = await supabase
    .from('schedules')
    .delete()
    .eq('id', id)
    .neq('status', 'delivered')
    .neq('status', 'rescheduled')
    .select('id')
    .single()
  if (error) {
    if (error.code === 'PGRST116') {
      throw new Error('Este horario ya fue entregado/cobrado o reagendado — no se puede eliminar.')
    }
    throw error
  }
}

// Crea (o reutiliza) el cobro de un horario finalizado directamente en
// `charges` — ver 20260912000000_unify_charges.sql. Un cobro queda
// identificado de forma única por propiedad + unidad + tipo de servicio +
// fecha (constraint `charges_unique_identity`), así que no es posible tener
// dos cobros para el mismo servicio/unidad/propiedad/fecha: si ya existe
// uno, Supabase rechaza el insert con un error de duplicado (23505) que
// se traduce a un mensaje claro para el usuario.
//
// En el mismo flujo se marca el horario como 'delivered'. Si el usuario
// cancela el formulario de cobro antes de confirmar, esta función nunca se
// llama y el estatus del horario no cambia — así no queda un "delivered"
// sin cobro.
export const createScheduleCharge = async (
  scheduleId: string,
  data: { totalCost: number; notes: string; extras: { description: string; amount: number }[] },
): Promise<void> => {
  const { data: schedule, error: scheduleError } = await supabase
    .from('schedules')
    .select('property_id, unit_label, service_type_id, scheduled_date')
    .eq('id', scheduleId)
    .single()
  if (scheduleError) throw scheduleError

  // El "costo de servicio total" ya es el monto final a cobrar — los
  // extras son solo un desglose de qué compone ese total (pedido de
  // David: no deben sumarse aparte, es solo un desglose del precio).
  const amount = data.totalCost

  const { error } = await supabase.from('charges').insert({
    property_id: schedule.property_id,
    unit_label: schedule.unit_label,
    service_type_id: schedule.service_type_id,
    amount,
    status: 'pending',
    generated_date: schedule.scheduled_date,
    notes: data.notes.trim() || null,
    extras: data.extras,
  })
  if (error) {
    if (error.code === '23505') {
      throw new Error('Ya existe un cobro para este mismo servicio, unidad, propiedad y fecha.')
    }
    throw error
  }

  const { error: statusError } = await supabase.from('schedules').update({ status: 'delivered' }).eq('id', scheduleId)
  if (statusError) throw statusError
}

// ---------------------------------------------------------------------------
// Configuración general — company_settings es una tabla singleton (ver
// 20260920000000_add_company_settings.sql): siempre hay exactamente una
// fila, sembrada por la migración, así que fetchCompanySettings nunca
// debería devolver null en la práctica — el tipo se deja nullable solo por
// si la fila fuera borrada a mano.
// ---------------------------------------------------------------------------

const mapCompanySettings = (row: CompanySettingsRow): CompanySettings => ({
  id: row.id,
  companyName: row.company_name ?? '',
  address: row.address ?? undefined,
  phone: row.phone ?? undefined,
  email: row.email ?? undefined,
  defaultHourlyRate: row.default_hourly_rate != null ? Number(row.default_hourly_rate) : undefined,
})

export const fetchCompanySettings = async (): Promise<CompanySettings | null> => {
  const { data, error } = await supabase.from('company_settings').select('*').limit(1).maybeSingle()
  if (error) throw error
  return data ? mapCompanySettings(data as CompanySettingsRow) : null
}

export const updateCompanySettings = async (
  id: string,
  patch: {
    companyName: string
    address: string
    phone: string
    email: string
    defaultHourlyRate: number | null
  },
): Promise<void> => {
  const { error } = await supabase
    .from('company_settings')
    .update({
      company_name: patch.companyName,
      address: patch.address || null,
      phone: patch.phone || null,
      email: patch.email || null,
      default_hourly_rate: patch.defaultHourlyRate,
    })
    .eq('id', id)
  if (error) throw error
}

// ---------------------------------------------------------------------------
// Mi perfil — cada usuario edita su propio nombre y correo de contacto
// (policy `profiles_update_own`) y puede cambiar su propia contraseña.
// Username y role NO se exponen para editar acá: el username es el login y
// el role se asigna a mano por un admin (ver auth_and_rls.sql).
// ---------------------------------------------------------------------------

export const updateOwnProfile = async (id: string, patch: { fullName: string; email: string }): Promise<void> => {
  const { error } = await supabase
    .from('profiles')
    .update({ full_name: patch.fullName || null, email: patch.email || null })
    .eq('id', id)
  if (error) throw error
}

export const updateOwnPassword = async (password: string): Promise<void> => {
  const { error } = await supabase.auth.updateUser({ password })
  if (error) throw error
}

export const updateNotificationsEnabled = async (id: string, enabled: boolean): Promise<void> => {
  const { error } = await supabase.from('profiles').update({ notifications_enabled: enabled }).eq('id', id)
  if (error) throw error
}

export const updateNotifyRoles = async (id: string, roles: ProfileRole[]): Promise<void> => {
  const { error } = await supabase.from('profiles').update({ notify_roles: roles }).eq('id', id)
  if (error) throw error
}

// ---------------------------------------------------------------------------
// Alertas entre usuarios — ver 20260924000000_add_notifications.sql. Las
// filas las crean únicamente los triggers de la base (owner <-> no-owner);
// acá solo leemos las propias (RLS: notifications_select_own) y marcamos
// como leídas (RLS: notifications_update_own).
// ---------------------------------------------------------------------------

const mapNotification = (row: NotificationRow): AppNotification => ({
  id: row.id,
  actorId: row.actor_id ?? undefined,
  entityType: row.entity_type as AppNotification['entityType'],
  entityId: row.entity_id ?? undefined,
  message: row.message,
  readAt: row.read_at ?? undefined,
  createdAt: row.created_at,
})

export const fetchNotifications = async (): Promise<AppNotification[]> => {
  const { data, error } = await supabase
    .from('notifications')
    .select('*')
    .order('created_at', { ascending: false })
    .limit(30)
  if (error) throw error
  return ((data ?? []) as NotificationRow[]).map(mapNotification)
}

// Leer una alerta la borra de una vez — no se quiere que se acumulen
// (requiere la policy notifications_delete_own, ver
// 20260929000000_add_notifications_delete_policy.sql).
export const markNotificationRead = async (id: string): Promise<void> => {
  const { error } = await supabase.from('notifications').delete().eq('id', id)
  if (error) throw error
}

export const markAllNotificationsRead = async (): Promise<void> => {
  const { error } = await supabase.from('notifications').delete().not('id', 'is', null)
  if (error) throw error
}

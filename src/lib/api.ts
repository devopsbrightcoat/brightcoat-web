// ---------------------------------------------------------------------------
// Queries reales a Supabase. Cada fetch* mapea las filas (snake_case) a los
// tipos de la app (src/types.ts, camelCase) — misma forma que src/mocks/data.ts
// para que las páginas no tengan que cambiar al pasar de mock a real.
// ---------------------------------------------------------------------------

import type { Charge, Employee, Expense, PayrollEntry, Property, Schedule, ServiceType } from '../types'
import { supabase } from './supabase'
import type {
  ChargeRow,
  EmployeeRow,
  ExpenseRow,
  PayrollEntryRow,
  PropertyRow,
  ScheduleRow,
  ServiceTypeRow,
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
}): Promise<void> => {
  const { error } = await supabase.from('expenses').insert({
    invoice_number: data.invoiceNumber.trim() || null,
    amount: data.amount,
    date: data.date,
    description: data.description.trim() || null,
  })
  if (error) throw error
}

export const updateExpense = async (
  id: string,
  patch: { invoiceNumber: string; amount: number; date: string; description: string },
): Promise<void> => {
  const { error } = await supabase
    .from('expenses')
    .update({
      invoice_number: patch.invoiceNumber.trim() || null,
      amount: patch.amount,
      date: patch.date,
      description: patch.description.trim() || null,
    })
    .eq('id', id)
  if (error) throw error
}

// ---------------------------------------------------------------------------
// Planillas — pago de mano de obra por propiedad/empleado. Tabla propia
// (payroll_entries) desde 20260917000000_split_expenses_payroll.sql, separada
// de expenses (que ahora es un módulo independiente de facturas/gastos).
// ---------------------------------------------------------------------------

const mapPayrollEntry = (row: PayrollEntryRow): PayrollEntry => ({
  id: row.id,
  propertyId: row.property_id ?? undefined,
  employeeId: row.employee_id ?? undefined,
  amount: Number(row.amount),
  date: row.date,
  description: row.description ?? undefined,
})

export const fetchPayrollEntries = async (): Promise<PayrollEntry[]> => {
  const { data, error } = await supabase.from('payroll_entries').select('*').order('date', { ascending: false })
  if (error) throw error
  return ((data ?? []) as PayrollEntryRow[]).map(mapPayrollEntry)
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
})

export const fetchCharges = async (): Promise<Charge[]> => {
  const { data, error } = await supabase.from('charges').select('*').order('created_at', { ascending: false })
  if (error) throw error
  return ((data ?? []) as ChargeRow[]).map(mapCharge)
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
  scheduledTime: row.scheduled_time,
  status: row.status,
})

export const fetchSchedules = async (): Promise<Schedule[]> => {
  const { data, error } = await supabase
    .from('schedules')
    .select('*')
    .order('scheduled_date', { ascending: true })
    .order('scheduled_time', { ascending: true })
  if (error) throw error
  return ((data ?? []) as ScheduleRow[]).map(mapSchedule)
}

export const createSchedules = async (
  rows: {
    propertyId: string
    employeeId: string
    scheduledDate: string
    unitLabel: string
    serviceTypeId: string
    scheduledTime: string
  }[],
): Promise<void> => {
  const { error } = await supabase.from('schedules').insert(
    rows.map((r) => ({
      property_id: r.propertyId,
      employee_id: r.employeeId,
      scheduled_date: r.scheduledDate,
      unit_label: r.unitLabel || null,
      service_type_id: r.serviceTypeId,
      scheduled_time: r.scheduledTime,
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
    scheduledTime: string
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
      scheduled_time: patch.scheduledTime,
    })
    .eq('id', id)
    .neq('status', 'delivered')
    .select('id')
    .single()
  if (error) {
    if (error.code === 'PGRST116') {
      throw new Error('Este horario ya fue entregado y cobrado — no se puede editar.')
    }
    throw error
  }
}

export const updateScheduleStatus = async (id: string, status: Schedule['status']): Promise<void> => {
  const { error } = await supabase.from('schedules').update({ status }).eq('id', id)
  if (error) throw error
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

  const amount = data.totalCost + data.extras.reduce((sum, e) => sum + e.amount, 0)

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

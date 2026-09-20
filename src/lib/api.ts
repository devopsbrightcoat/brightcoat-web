
import type { ProfileRole } from '../auth/AuthProvider'
import type { AppNotification, Charge, ChargeTemplate, CompanySettings, Employee, Expense, ExpenseTemplate, PayrollEntry, Property, Schedule, ServiceType, Vendor } from '../types'
import { supabase } from './supabase'
import type {
  ChargeRow,
  ChargeTemplateRow,
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

// dateFrom/dateTo son opcionales: cuando la pantalla tiene un filtro de fecha
// activo se filtra del lado del servidor en vez de traer todo el historial y
// filtrar en el cliente. Sin filtro, se mantiene el comportamiento anterior.
export const fetchExpenses = async (dateFrom?: string, dateTo?: string): Promise<Expense[]> => {
  let query = supabase.from('expenses').select('*')
  if (dateFrom) query = query.gte('date', dateFrom)
  if (dateTo) query = query.lte('date', dateTo)
  const { data, error } = await query.order('date', { ascending: false })
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

// dateFrom/dateTo opcionales — mismo patrón que fetchExpenses.
export const fetchPayrollEntries = async (dateFrom?: string, dateTo?: string): Promise<PayrollEntry[]> => {
  let query = supabase.from('payroll_entries').select('*, payroll_entry_items(*)')
  if (dateFrom) query = query.gte('date', dateFrom)
  if (dateTo) query = query.lte('date', dateTo)
  const { data, error } = await query
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
  taxIncluded: row.tax_included,
  isFixed: row.is_fixed,
  scheduleId: row.schedule_id ?? undefined,
})

// dateFrom/dateTo opcionales — filtran por generated_date, mismo patrón que
// fetchExpenses/fetchPayrollEntries.
export const fetchCharges = async (dateFrom?: string, dateTo?: string): Promise<Charge[]> => {
  let query = supabase.from('charges').select('*')
  if (dateFrom) query = query.gte('generated_date', dateFrom)
  if (dateTo) query = query.lte('generated_date', dateTo)
  const { data, error } = await query.order('created_at', { ascending: false })
  if (error) throw error
  return ((data ?? []) as ChargeRow[]).map(mapCharge)
}

export const createFixedCharge = async (data: {
  propertyId: string
  amount: number
  generatedDate: string
  description?: string
  serviceTypeId?: string
}): Promise<void> => {
  const { error } = await supabase.from('charges').insert({
    property_id: data.propertyId,
    amount: data.amount,
    generated_date: data.generatedDate,
    description: data.description || null,
    service_type_id: data.serviceTypeId || null,
    status: 'pending',
    is_fixed: true,
  })
  if (error) throw error
}

const mapChargeTemplate = (row: ChargeTemplateRow): ChargeTemplate => ({
  id: row.id,
  propertyId: row.property_id,
  name: row.name,
  amount: Number(row.amount),
  serviceTypeId: row.service_type_id ?? undefined,
})

export const fetchChargeTemplates = async (): Promise<ChargeTemplate[]> => {
  const { data, error } = await supabase.from('charge_templates').select('*').order('name')
  if (error) throw error
  return ((data ?? []) as ChargeTemplateRow[]).map(mapChargeTemplate)
}

export const createChargeTemplate = async (data: {
  propertyId: string
  name: string
  amount: number
  serviceTypeId?: string
}): Promise<void> => {
  const { error } = await supabase.from('charge_templates').insert({
    property_id: data.propertyId,
    name: data.name.trim(),
    amount: data.amount,
    service_type_id: data.serviceTypeId || null,
  })
  if (error) throw error
}

export const updateChargeTemplate = async (
  id: string,
  patch: { propertyId: string; name: string; amount: number; serviceTypeId?: string },
): Promise<void> => {
  const { error } = await supabase
    .from('charge_templates')
    .update({
      property_id: patch.propertyId,
      name: patch.name.trim(),
      amount: patch.amount,
      service_type_id: patch.serviceTypeId || null,
    })
    .eq('id', id)
  if (error) throw error
}

export const deleteChargeTemplate = async (id: string): Promise<void> => {
  const { error } = await supabase.from('charge_templates').delete().eq('id', id)
  if (error) throw error
}

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

export const updateChargesTaxPaid = async (ids: string[], taxPaid: boolean): Promise<void> => {
  const { error } = await supabase
    .from('charges')
    .update({ tax_paid: taxPaid, tax_paid_date: taxPaid ? new Date().toISOString().slice(0, 10) : null })
    .in('id', ids)
  if (error) throw error
}

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
    taxIncluded?: boolean
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
      ...(patch.taxIncluded !== undefined ? { tax_included: patch.taxIncluded } : {}),
    })
    .eq('id', id)
  if (error) {
    if (error.code === '23505') {
      throw new Error('Ya existe otro cobro para esa misma propiedad, unidad, servicio y fecha.')
    }
    throw error
  }

  if (!existing.service_type_id || !existing.generated_date) return

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

  const identityChanged =
    existing.property_id !== patch.propertyId ||
    (existing.unit_label ?? null) !== newUnitLabel ||
    existing.service_type_id !== newServiceTypeId ||
    existing.generated_date !== newDate

  const canRelinkIdentity = identityChanged && !!newServiceTypeId && !!newDate

  if (canRelinkIdentity) {
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

  const canRelinkPlanillaIdentity = canRelinkIdentity && !!newUnitLabel
  const payrollUpdate: {
    amount: number
    property_id?: string
    unit_label?: string
    date?: string
  } = { amount: patch.amount }
  if (canRelinkPlanillaIdentity) {
    payrollUpdate.property_id = patch.propertyId
    payrollUpdate.unit_label = newUnitLabel
    payrollUpdate.date = newDate
  }

  const { error: payrollError } = await supabase
    .from('payroll_entries')
    .update(payrollUpdate)
    .eq('schedule_id', match.id)
  if (payrollError) throw payrollError
}

export const deleteCharge = async (id: string): Promise<void> => {
  const { data: existing, error: fetchError } = await supabase
    .from('charges')
    .select('property_id, unit_label, service_type_id, generated_date')
    .eq('id', id)
    .single()
  if (fetchError) throw fetchError

  const { error } = await supabase.from('charges').delete().eq('id', id)
  if (error) throw error

  if (!existing.service_type_id || !existing.generated_date) return

  const { data: schedules, error: schedError } = await supabase
    .from('schedules')
    .select('id, unit_label')
    .eq('property_id', existing.property_id)
    .eq('service_type_id', existing.service_type_id)
    .eq('scheduled_date', existing.generated_date)
    .eq('status', 'delivered')
  if (schedError) throw schedError

  const wanted = existing.unit_label ?? ''
  const match = (schedules ?? []).find((s) => (s.unit_label ?? '') === wanted)
  if (!match) return

  const { error: statusError } = await supabase.from('schedules').update({ status: 'pending' }).eq('id', match.id)
  if (statusError) throw statusError
}

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

export const deleteProperty = async (id: string): Promise<void> => {
  const { error } = await supabase.from('properties').delete().eq('id', id)
  if (error) {
    if (error.code === '23503') {
      throw new Error('Esta propiedad tiene horarios, cobros o planillas asociadas — no se puede eliminar.')
    }
    throw error
  }
}

const mapSchedule = (row: ScheduleRow): Schedule => ({
  id: row.id,
  propertyId: row.property_id,
  unitLabel: row.unit_label ?? undefined,
  serviceTypeId: row.service_type_id,
  employeeId: row.employee_id,
  scheduledDate: row.scheduled_date,
  status: row.status,
  rescheduledToId: row.rescheduled_to_id ?? undefined,
  isFixedCharge: row.is_fixed_charge,
})

// dateFrom opcional — mismo patrón que fetchCharges/fetchExpenses. Se usa
// sobre todo para acotar el Dashboard a una ventana móvil reciente.
export const fetchSchedules = async (dateFrom?: string, dateTo?: string): Promise<Schedule[]> => {
  let query = supabase.from('schedules').select('*')
  if (dateFrom) query = query.gte('scheduled_date', dateFrom)
  if (dateTo) query = query.lte('scheduled_date', dateTo)
  const { data, error } = await query
    .order('scheduled_date', { ascending: true })
    .order('created_at', { ascending: true })
  if (error) throw error
  return ((data ?? []) as ScheduleRow[]).map(mapSchedule)
}

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
    isFixedCharge?: boolean
  }[],
): Promise<void> => {
  const { error } = await supabase.from('schedules').insert(
    rows.map((r) => ({
      property_id: r.propertyId,
      employee_id: r.employeeId,
      scheduled_date: r.scheduledDate,
      unit_label: r.unitLabel || null,
      service_type_id: r.serviceTypeId,
      is_fixed_charge: r.isFixedCharge ?? false,
    })),
  )
  if (error) throw error
}

export const updateSchedule = async (
  id: string,
  patch: {
    propertyId: string
    employeeId: string
    scheduledDate: string
    unitLabel: string
    serviceTypeId: string
    isFixedCharge?: boolean
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
      is_fixed_charge: patch.isFixedCharge ?? false,
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

export const rescheduleSchedule = async (id: string, newDate: string): Promise<void> => {
  const { data: schedule, error: fetchError } = await supabase
    .from('schedules')
    .select('property_id, employee_id, unit_label, service_type_id, is_fixed_charge')
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
      is_fixed_charge: schedule.is_fixed_charge,
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

// Un horario tiene a lo más un cobro (charges.schedule_id es único cuando
// está presente, ver 20261005000000_add_charges_schedule_id.sql) — la
// pantalla de Horarios usa esto para precargar el formulario de cobro al
// hacer clic en "Entregado" sobre un horario que ya fue cobrado antes.
export const fetchChargeByScheduleId = async (scheduleId: string): Promise<Charge | null> => {
  const { data, error } = await supabase.from('charges').select('*').eq('schedule_id', scheduleId).maybeSingle()
  if (error) throw error
  return data ? mapCharge(data as ChargeRow) : null
}

export const createScheduleCharge = async (
  scheduleId: string,
  data: { totalCost: number; notes: string; extras: { description: string; amount: number }[]; taxIncluded: boolean },
): Promise<void> => {
  const { data: schedule, error: scheduleError } = await supabase
    .from('schedules')
    .select('property_id, unit_label, service_type_id, scheduled_date')
    .eq('id', scheduleId)
    .single()
  if (scheduleError) throw scheduleError

  const amount = data.totalCost

  const { data: existing, error: existingError } = await supabase
    .from('charges')
    .select('id')
    .eq('schedule_id', scheduleId)
    .maybeSingle()
  if (existingError) throw existingError

  if (existing) {
    // El horario ya tenía un cobro (se le dio "Entregado" antes) — se edita
    // en vez de intentar crear uno nuevo, que chocaría contra el índice
    // único de charges_schedule_id_idx.
    const { error } = await supabase
      .from('charges')
      .update({ amount, notes: data.notes.trim() || null, extras: data.extras, tax_included: data.taxIncluded })
      .eq('id', existing.id)
    if (error) throw error
  } else {
    const { error } = await supabase.from('charges').insert({
      property_id: schedule.property_id,
      unit_label: schedule.unit_label,
      service_type_id: schedule.service_type_id,
      schedule_id: scheduleId,
      amount,
      status: 'pending',
      generated_date: schedule.scheduled_date,
      notes: data.notes.trim() || null,
      extras: data.extras,
      tax_included: data.taxIncluded,
    })
    if (error) {
      if (error.code === '23505') {
        throw new Error('Ya existe un cobro para este horario.')
      }
      throw error
    }
  }

  // Si ya existe una entrada de planilla ligada a este horario (se armó
  // copiando el monto del cobro al momento de crearla, ver
  // AddPayrollEntryModal/fetchChargeForSchedule), la sincronizamos con el
  // monto corregido — igual que updateCharge ya hace desde Cobros. Sin
  // esto, corregir el monto desde el horario dejaría la planilla con el
  // monto viejo. Si no hay ninguna planilla ligada, este update no afecta
  // ninguna fila y no genera error.
  const { error: payrollError } = await supabase
    .from('payroll_entries')
    .update({ amount })
    .eq('schedule_id', scheduleId)
  if (payrollError) throw payrollError

  const { error: statusError } = await supabase.from('schedules').update({ status: 'delivered' }).eq('id', scheduleId)
  if (statusError) throw statusError
}

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

export const markNotificationRead = async (id: string): Promise<void> => {
  const { error } = await supabase.from('notifications').delete().eq('id', id)
  if (error) throw error
}

export const markAllNotificationsRead = async (): Promise<void> => {
  const { error } = await supabase.from('notifications').delete().not('id', 'is', null)
  if (error) throw error
}

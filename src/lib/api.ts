// ---------------------------------------------------------------------------
// Queries reales a Supabase. Cada fetch* mapea las filas (snake_case) a los
// tipos de la app (src/types.ts, camelCase) — misma forma que src/mocks/data.ts
// para que las páginas no tengan que cambiar al pasar de mock a real.
// ---------------------------------------------------------------------------

import type { Employee, Expense, Property, Service, ServiceType } from '../types'
import { supabase } from './supabase'
import type { EmployeeRow, ExpenseRow, PropertyRow, ServiceRow, ServiceTypeRow } from './dbTypes'

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

const mapEmployee = (row: EmployeeRow): Employee => ({
  id: row.id,
  name: row.name,
  role: row.role ?? '—',
  status: row.status,
  hourlyRate: row.hourly_rate != null ? Number(row.hourly_rate) : undefined,
})

export const fetchEmployees = async (): Promise<Employee[]> => {
  const { data, error } = await supabase.from('employees').select('*').order('name')
  if (error) throw error
  return ((data ?? []) as EmployeeRow[]).map(mapEmployee)
}

const mapService = (row: ServiceRow): Service => ({
  id: row.id,
  propertyId: row.property_id,
  serviceTypeId: row.service_type_id,
  employeeId: row.employee_id ?? undefined,
  unitLabel: row.unit_label ?? undefined,
  unitSize: row.unit_size ?? undefined,
  status: row.status,
  scheduledDate: row.scheduled_date ?? '',
  completedDate: row.completed_date ?? undefined,
  cost: Number(row.cost),
  paymentStatus: row.payment_status,
  paidDate: row.paid_date ?? undefined,
  notes: row.description ?? undefined,
})

export const fetchServices = async (): Promise<Service[]> => {
  const { data, error } = await supabase.from('services').select('*').order('scheduled_date', { ascending: false })
  if (error) throw error
  return ((data ?? []) as ServiceRow[]).map(mapService)
}

const mapExpense = (row: ExpenseRow): Expense => ({
  id: row.id,
  propertyId: row.property_id ?? undefined,
  serviceId: row.service_id ?? undefined,
  employeeId: row.employee_id ?? undefined,
  category: row.category,
  amount: Number(row.amount),
  date: row.date,
  description: row.description ?? '',
})

export const fetchExpenses = async (): Promise<Expense[]> => {
  const { data, error } = await supabase.from('expenses').select('*').order('date', { ascending: false })
  if (error) throw error
  return ((data ?? []) as ExpenseRow[]).map(mapExpense)
}


// ---------------------------------------------------------------------------
// Updates — usados por los formularios de edición (Trabajos, Propiedades,
// Empleados). Cada uno mapea el patch en camelCase de la app a las columnas
// snake_case reales de Supabase.
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
    status: Employee['status']
    hourlyRate: number | null
  },
): Promise<void> => {
  const { error } = await supabase
    .from('employees')
    .update({
      name: patch.name,
      role: patch.role || null,
      status: patch.status,
      hourly_rate: patch.hourlyRate,
    })
    .eq('id', id)
  if (error) throw error
}

export const updateService = async (
  id: string,
  patch: {
    propertyId: string
    serviceTypeId: string
    employeeId: string | null
    unitLabel: string
    unitSize: string
    status: Service['status']
    scheduledDate: string
    completedDate: string
    cost: number
    paymentStatus: Service['paymentStatus']
    paidDate: string
    notes: string
  },
): Promise<void> => {
  const { error } = await supabase
    .from('services')
    .update({
      property_id: patch.propertyId,
      service_type_id: patch.serviceTypeId,
      employee_id: patch.employeeId,
      unit_label: patch.unitLabel || null,
      unit_size: patch.unitSize || null,
      status: patch.status,
      scheduled_date: patch.scheduledDate || null,
      completed_date: patch.completedDate || null,
      cost: patch.cost,
      payment_status: patch.paymentStatus,
      paid_date: patch.paidDate || null,
      description: patch.notes || null,
    })
    .eq('id', id)
  if (error) throw error
}

// ---------------------------------------------------------------------------
// Tipos compartidos de la app. Reflejan el esquema real de Supabase (ver
// ops-web/supabase/migrations) en camelCase para el frontend. Tanto los
// datos mockeados (src/mocks/data.ts) como las queries reales (src/lib/api.ts)
// producen objetos con esta forma, para que las páginas no cambien al pasar
// de una fuente a otra.
// ---------------------------------------------------------------------------

export type ClientType = 'residential' | 'multifamily' | 'property_manager'
export type PropertyStatus = 'active' | 'inactive'
export type PaymentStatus = 'pending' | 'paid'
export type ExpenseCategory = 'materials' | 'labor' | 'transport' | 'tools' | 'other'
export type ServiceCategory = 'painting' | 'cleaning' | 'make_ready' | 'repair' | 'other'

export type Property = {
  id: string
  name: string
  address: string
  clientType: ClientType
  managerContact?: string
  status: PropertyStatus
}

export type ServiceType = {
  id: string
  name: string
  category: ServiceCategory
}

export type Expense = {
  id: string
  propertyId?: string
  serviceId?: string
  employeeId?: string
  category: ExpenseCategory
  amount: number
  date: string
  description: string
}

export type W2Status = 'approved' | 'pending'

export type Employee = {
  id: string
  name: string
  role: string
  contactNumber?: string
  address?: string
  status: 'active' | 'inactive'
  w2Status: W2Status
  hourlyRate?: number
}

export type Charge = {
  id: string
  propertyId: string
  unitLabel?: string
  description?: string
  amount: number
  status: PaymentStatus
  generatedDate?: string
  payrollPeriod?: string
  responsible?: string
  notes?: string
}

export type ScheduleStatus = 'pending' | 'in_progress' | 'delivered' | 'cancelled'

export type Schedule = {
  id: string
  propertyId: string
  unitLabel?: string
  serviceTypeId: string
  employeeId: string
  scheduledDate: string
  scheduledTime: string
  status: ScheduleStatus
}

export type ScheduleChargeExtra = {
  id: string
  description: string
  amount: number
}

export type ScheduleCharge = {
  id: string
  scheduleId: string
  totalCost: number
  notes?: string
  extras: ScheduleChargeExtra[]
}

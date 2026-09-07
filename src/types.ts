// ---------------------------------------------------------------------------
// Tipos compartidos de la app. Reflejan el esquema real de Supabase (ver
// ops-web/supabase/migrations) en camelCase para el frontend. Tanto los
// datos mockeados (src/mocks/data.ts) como las queries reales (src/lib/api.ts)
// producen objetos con esta forma, para que las páginas no cambien al pasar
// de una fuente a otra.
// ---------------------------------------------------------------------------

export type ClientType = 'residential' | 'multifamily' | 'property_manager'
export type PropertyStatus = 'active' | 'inactive'
export type ServiceStatus = 'pending' | 'in_progress' | 'completed'
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

export type Service = {
  id: string
  propertyId: string
  serviceTypeId: string
  employeeId?: string
  unitLabel?: string
  unitSize?: string
  status: ServiceStatus
  scheduledDate: string
  completedDate?: string
  cost: number
  paymentStatus: PaymentStatus
  paidDate?: string
  notes?: string
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

export type Employee = {
  id: string
  name: string
  role: string
  status: 'active' | 'inactive'
  hourlyRate?: number
}

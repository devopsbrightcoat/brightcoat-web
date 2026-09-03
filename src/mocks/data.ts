// ---------------------------------------------------------------------------
// Datos mockeados — SOLO para construir la interfaz visualmente.
// No viene de Supabase todavía. La forma de estos objetos sigue el esquema
// definido en el blueprint (properties, service_types, services, expenses,
// income, employees) para que conectar la base de datos real después sea
// un cambio de "fuente de datos", no de estructura.
// ---------------------------------------------------------------------------

export type ClientType = 'residential' | 'multifamily' | 'property_manager'
export type PropertyStatus = 'active' | 'inactive'
export type ServiceStatus = 'pending' | 'in_progress' | 'completed'
export type IncomeStatus = 'paid' | 'pending'
export type ExpenseCategory = 'materials' | 'labor' | 'transport' | 'tools' | 'other'

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
  category: 'painting' | 'cleaning' | 'repair'
}

export type Service = {
  id: string
  propertyId: string
  serviceTypeId: string
  employeeId?: string
  status: ServiceStatus
  scheduledDate: string
  completedDate?: string
  cost: number
  notes?: string
}

export type Expense = {
  id: string
  propertyId?: string
  category: ExpenseCategory
  amount: number
  date: string
  description: string
}

export type Income = {
  id: string
  propertyId: string
  amount: number
  date: string
  status: IncomeStatus
  clientReference: string
}

export type Employee = {
  id: string
  name: string
  role: string
  status: 'active' | 'inactive'
  hourlyRate?: number
}

export const properties: Property[] = [
  { id: 'p1', name: 'Riverside Apartments', address: '1200 Riverside Dr, Austin, TX', clientType: 'multifamily', managerContact: 'Laura Given', status: 'active' },
  { id: 'p2', name: 'Oak Hill Residence', address: '4510 Oak Hill Blvd, Austin, TX', clientType: 'residential', status: 'active' },
  { id: 'p3', name: 'Congress Ave Lofts', address: '3903 S Congress Ave, Austin, TX', clientType: 'multifamily', managerContact: 'Renona Wells', status: 'active' },
  { id: 'p4', name: 'Sunset Valley Homes', address: '7800 Sunset Valley Rd, Austin, TX', clientType: 'property_manager', managerContact: 'Cristian Byrd', status: 'active' },
  { id: 'p5', name: 'Pecan Grove Community', address: '2200 Pecan Grove Ln, Austin, TX', clientType: 'multifamily', managerContact: 'B. Martin', status: 'active' },
  { id: 'p6', name: 'Zilker Family Residence', address: '1600 Zilker Park Rd, Austin, TX', clientType: 'residential', status: 'inactive' },
]

export const serviceTypes: ServiceType[] = [
  { id: 'st1', name: 'Interior Painting', category: 'painting' },
  { id: 'st2', name: 'Cleaning Services', category: 'cleaning' },
  { id: 'st3', name: 'Drywall Repair & Installation', category: 'repair' },
  { id: 'st4', name: 'General Repairs', category: 'repair' },
]

export const employees: Employee[] = [
  { id: 'e1', name: 'David L.', role: 'Owner / Project Manager', status: 'active' },
  { id: 'e2', name: 'Marco R.', role: 'Painter', status: 'active', hourlyRate: 22 },
  { id: 'e3', name: 'Sandra P.', role: 'Cleaning Lead', status: 'active', hourlyRate: 18 },
  { id: 'e4', name: 'Tony G.', role: 'Drywall / Repairs', status: 'active', hourlyRate: 24 },
]

export const services: Service[] = [
  { id: 's1', propertyId: 'p1', serviceTypeId: 'st1', employeeId: 'e2', status: 'completed', scheduledDate: '2026-08-04', completedDate: '2026-08-06', cost: 1450 },
  { id: 's2', propertyId: 'p3', serviceTypeId: 'st2', employeeId: 'e3', status: 'completed', scheduledDate: '2026-08-10', completedDate: '2026-08-10', cost: 320 },
  { id: 's3', propertyId: 'p2', serviceTypeId: 'st4', employeeId: 'e4', status: 'in_progress', scheduledDate: '2026-08-28', cost: 680 },
  { id: 's4', propertyId: 'p5', serviceTypeId: 'st1', employeeId: 'e2', status: 'pending', scheduledDate: '2026-09-05', cost: 2100 },
  { id: 's5', propertyId: 'p4', serviceTypeId: 'st3', employeeId: 'e4', status: 'pending', scheduledDate: '2026-09-08', cost: 940 },
  { id: 's6', propertyId: 'p1', serviceTypeId: 'st2', employeeId: 'e3', status: 'completed', scheduledDate: '2026-08-18', completedDate: '2026-08-18', cost: 280 },
  { id: 's7', propertyId: 'p3', serviceTypeId: 'st1', employeeId: 'e2', status: 'in_progress', scheduledDate: '2026-08-30', cost: 1780 },
]

export const expenses: Expense[] = [
  { id: 'x1', propertyId: 'p1', category: 'materials', amount: 410, date: '2026-08-03', description: 'Pintura y sellador' },
  { id: 'x2', propertyId: 'p1', category: 'labor', amount: 620, date: '2026-08-06', description: 'Mano de obra — pintura interior' },
  { id: 'x3', category: 'tools', amount: 185, date: '2026-08-09', description: 'Compresor de aire' },
  { id: 'x4', propertyId: 'p3', category: 'materials', amount: 95, date: '2026-08-10', description: 'Insumos de limpieza' },
  { id: 'x5', propertyId: 'p2', category: 'transport', amount: 60, date: '2026-08-27', description: 'Combustible — visita a propiedad' },
  { id: 'x6', propertyId: 'p5', category: 'materials', amount: 890, date: '2026-08-22', description: 'Pintura para 6 unidades' },
]

export const income: Income[] = [
  { id: 'i1', propertyId: 'p1', amount: 1450, date: '2026-08-06', status: 'paid', clientReference: 'Riverside Apartments — Invoice 1042' },
  { id: 'i2', propertyId: 'p3', amount: 320, date: '2026-08-10', status: 'paid', clientReference: 'Congress Ave Lofts — Invoice 1043' },
  { id: 'i3', propertyId: 'p5', amount: 2100, date: '2026-09-05', status: 'pending', clientReference: 'Pecan Grove — Invoice 1044' },
  { id: 'i4', propertyId: 'p4', amount: 940, date: '2026-09-08', status: 'pending', clientReference: 'Sunset Valley — Invoice 1045' },
  { id: 'i5', propertyId: 'p1', amount: 280, date: '2026-08-18', status: 'paid', clientReference: 'Riverside Apartments — Invoice 1046' },
]

// Serie mensual para el gráfico de ingresos vs. gastos del dashboard/reportes
export const monthlyFinancials = [
  { month: 'Mar', income: 4200, expenses: 2100 },
  { month: 'Abr', income: 5100, expenses: 2800 },
  { month: 'May', income: 3900, expenses: 2400 },
  { month: 'Jun', income: 6200, expenses: 3100 },
  { month: 'Jul', income: 5800, expenses: 2900 },
  { month: 'Ago', income: 7150, expenses: 2260 },
]

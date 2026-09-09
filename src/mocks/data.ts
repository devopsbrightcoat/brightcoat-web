// ---------------------------------------------------------------------------
// Datos mockeados — SOLO para construir la interfaz visualmente / como
// respaldo si Supabase no responde. Los tipos viven en src/types.ts y son
// compartidos con las queries reales (src/lib/api.ts), para que las páginas
// no cambien al pasar de una fuente a otra.
// ---------------------------------------------------------------------------

import type { Employee, Expense, PayrollEntry, Property, ServiceType } from '../types'

export type { ClientType, PaymentStatus, PropertyStatus } from '../types'

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
  { id: 'e1', name: 'David L.', role: 'Owner / Project Manager', status: 'active', w2Status: 'approved' },
  { id: 'e2', name: 'Marco R.', role: 'Painter', status: 'active', w2Status: 'approved', hourlyRate: 22 },
  { id: 'e3', name: 'Sandra P.', role: 'Cleaning Lead', status: 'active', w2Status: 'approved', hourlyRate: 18 },
  { id: 'e4', name: 'Tony G.', role: 'Drywall / Repairs', status: 'active', w2Status: 'pending', hourlyRate: 24 },
]

export const expenses: Expense[] = [
  { id: 'x1', invoiceNumber: 'F-1001', amount: 410, date: '2026-08-03', description: 'Pintura y sellador' },
  { id: 'x3', invoiceNumber: 'F-1002', amount: 185, date: '2026-08-09', description: 'Compresor de aire' },
  { id: 'x4', amount: 95, date: '2026-08-10', description: 'Insumos de limpieza' },
  { id: 'x5', amount: 60, date: '2026-08-27', description: 'Combustible — visita a propiedad' },
  { id: 'x6', invoiceNumber: 'F-1003', amount: 890, date: '2026-08-22', description: 'Pintura para 6 unidades' },
]

export const payrollEntries: PayrollEntry[] = [
  {
    id: 'pe1',
    propertyId: 'p1',
    unitLabel: '204',
    employeeId: 'e2',
    serviceName: 'Pintura interior — unidad completa',
    amount: 620,
    date: '2026-08-06',
    items: [
      { id: 'pei1', description: '2 recámaras + pasillo', amount: 420 },
      { id: 'pei2', description: 'Baño', amount: 260 },
    ],
  },
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

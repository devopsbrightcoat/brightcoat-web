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

// Gastos es un módulo totalmente independiente — no está ligado a
// propiedades, empleados ni servicios. Solo factura, monto, fecha y
// descripción. Los pagos de mano de obra viven aparte, en payroll_entries
// (ver PayrollEntry más abajo).
export type Expense = {
  id: string
  invoiceNumber?: string
  amount: number
  date: string
  description?: string
}

// "Gastos fijos" — catálogo de tipos de gasto recurrentes (renta, seguro,
// internet, etc.) que se puede elegir como plantilla al agregar un gasto
// real (ver AddExpenseModal). Precarga monto y descripción en el
// formulario nada más — no crea gastos ni queda ligada a ellos de ninguna
// forma, ni siquiera al elegirla.
export type ExpenseTemplate = {
  id: string
  name: string
  amount?: number
  description?: string
}

// Planillas — pago de mano de obra por trabajo completo (propiedad +
// unidad + empleado + servicio, todos obligatorios). Tabla propia
// (payroll_entries), separada de expenses desde
// 20260917000000_split_expenses_payroll.sql. El desglose del servicio
// (payroll_entry_items) se usa para calcular Ventas/Ganancia en la UI —
// ver 20260918000000_payroll_service_breakdown.sql. `amount` (Pago) puede
// quedar en null cuando todavía no se sabe cuánto se le va a pagar al
// empleado — se completa después editando la planilla — ver
// 20260919000000_payroll_amount_optional.sql.
export type PayrollEntryItem = {
  id: string
  description: string
  amount: number
}

export type PayrollEntry = {
  id: string
  propertyId: string
  unitLabel: string
  employeeId: string
  serviceName: string
  amount: number | null
  date: string
  items: PayrollEntryItem[]
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

// `serviceTypeId` + `generatedDate` (fecha del servicio/cobro) identifican
// de forma única un cobro junto con propertyId + unitLabel — ver constraint
// `charges_unique_identity` en 20260912000000_unify_charges.sql. Los cobros
// importados de Excel normalmente no traen serviceTypeId (la plantilla no
// lo captura); los generados desde Horarios siempre lo traen.
export type ChargeExtra = {
  description: string
  amount: number
}

export type Charge = {
  id: string
  propertyId: string
  unitLabel?: string
  serviceTypeId?: string
  description?: string
  amount: number
  status: PaymentStatus
  generatedDate?: string
  payrollPeriod?: string
  responsible?: string
  notes?: string
  extras: ChargeExtra[]
  invoiceNumber?: string
}

// Configuración general — tabla singleton (una sola fila) con los datos del
// negocio y valores por defecto de la app (ver
// 20260920000000_add_company_settings.sql). `id` siempre viene de la fila
// existente — la app nunca crea una nueva, solo actualiza.
export type CompanySettings = {
  id: string
  companyName: string
  address?: string
  phone?: string
  email?: string
  defaultHourlyRate?: number
}

export type ScheduleStatus = 'pending' | 'in_progress' | 'delivered' | 'cancelled' | 'rescheduled'

export type Schedule = {
  id: string
  propertyId: string
  unitLabel?: string
  serviceTypeId: string
  employeeId: string
  scheduledDate: string
  status: ScheduleStatus
  rescheduledToId?: string
}

// Alertas entre usuarios (owner <-> no-owner) — ver
// 20260924000000_add_notifications.sql. El nombre AppNotification (y no
// Notification a secas) evita chocar con el tipo Notification del DOM.
export type NotificationEntityType = 'property' | 'employee' | 'schedule' | 'expense' | 'payroll_entry' | 'charge'

export type AppNotification = {
  id: string
  actorId?: string
  entityType: NotificationEntityType
  entityId?: string
  message: string
  readAt?: string
  createdAt: string
}


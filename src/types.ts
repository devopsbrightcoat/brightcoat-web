
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

export type Expense = {
  id: string
  invoiceNumber?: string
  amount: number
  date: string
  description?: string
  vendorId?: string
}

export type ExpenseTemplate = {
  id: string
  name: string
  amount?: number
  description?: string
}

export type ChargeTemplate = {
  id: string
  propertyId: string
  name: string
  amount: number
}

export type Vendor = {
  id: string
  name: string
  notes?: string
}

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
  notes?: string
  scheduleId?: string
  taxable: boolean
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
  taxPaid: boolean
  taxPaidDate?: string
  isFixed: boolean
}

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

// ---------------------------------------------------------------------------
// Forma cruda de las filas tal como las devuelve Supabase (snake_case),
// según supabase/migrations. Solo se usan dentro de src/lib/api.ts para
// mapear a los tipos de la app (src/types.ts, camelCase).
// ---------------------------------------------------------------------------

export type PropertyRow = {
  id: string
  name: string
  address: string | null
  client_type: 'residential' | 'multifamily' | 'property_manager'
  manager_contact: string | null
  status: 'active' | 'inactive'
}

export type ServiceTypeRow = {
  id: string
  name: string
  category: 'painting' | 'cleaning' | 'make_ready' | 'repair' | 'other'
}

export type EmployeeRow = {
  id: string
  name: string
  role: string | null
  contact_number: string | null
  address: string | null
  hourly_rate: number | string | null
  status: 'active' | 'inactive'
  w2_status: 'approved' | 'pending'
}

export type ExpenseRow = {
  id: string
  invoice_number: string | null
  amount: number | string
  date: string
  description: string | null
}

export type ExpenseTemplateRow = {
  id: string
  name: string
  amount: number | string | null
  description: string | null
}

export type PayrollEntryItemRow = {
  id: string
  payroll_entry_id: string
  description: string
  amount: number | string
  position: number
}

export type PayrollEntryRow = {
  id: string
  property_id: string
  unit_label: string
  employee_id: string
  service_name: string
  amount: number | string | null
  date: string
  payroll_entry_items?: PayrollEntryItemRow[]
}

export type ChargeRow = {
  id: string
  property_id: string
  unit_label: string | null
  service_type_id: string | null
  description: string | null
  amount: number | string
  status: 'pending' | 'paid'
  generated_date: string | null
  payroll_period: string | null
  responsible: string | null
  notes: string | null
  extras: { description: string; amount: number }[] | null
  invoice_number: string | null
}

export type ScheduleRow = {
  id: string
  property_id: string
  unit_label: string | null
  service_type_id: string
  employee_id: string
  scheduled_date: string
  status: 'pending' | 'in_progress' | 'delivered' | 'cancelled' | 'rescheduled'
  rescheduled_to_id: string | null
}

export type CompanySettingsRow = {
  id: string
  company_name: string | null
  address: string | null
  phone: string | null
  email: string | null
  default_hourly_rate: number | string | null
}


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
  property_id: string | null
  employee_id: string | null
  category: 'materials' | 'labor' | 'transport' | 'tools' | 'other'
  amount: number | string
  date: string
  description: string | null
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
  scheduled_time: string
  status: 'pending' | 'in_progress' | 'delivered' | 'cancelled'
}


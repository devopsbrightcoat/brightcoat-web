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
  hourly_rate: number | string | null
  status: 'active' | 'inactive'
}

export type ServiceRow = {
  id: string
  property_id: string
  service_type_id: string
  employee_id: string | null
  unit_label: string | null
  unit_size: string | null
  description: string | null
  status: 'pending' | 'in_progress' | 'completed'
  scheduled_date: string | null
  completed_date: string | null
  cost: number | string
  payment_status: 'pending' | 'paid'
  paid_date: string | null
}

export type ExpenseRow = {
  id: string
  property_id: string | null
  service_id: string | null
  employee_id: string | null
  category: 'materials' | 'labor' | 'transport' | 'tools' | 'other'
  amount: number | string
  date: string
  description: string | null
}

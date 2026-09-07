import { useState } from 'react'
import { Pencil } from 'lucide-react'
import { EditEmployeeModal } from '../components/EditEmployeeModal'
import { PageHeader } from '../components/PageHeader'
import { Pagination } from '../components/Pagination'
import { StatusPill } from '../components/StatusPill'
import { fetchEmployees, fetchServices } from '../lib/api'
import { usePagination } from '../lib/usePagination'
import { useSupabaseQuery } from '../lib/useSupabaseQuery'
import type { Employee } from '../types'

export const Empleados = () => {
  const [refreshKey, setRefreshKey] = useState(0)
  const { data: employees, loading: loadingEmployees, error: errorEmployees } = useSupabaseQuery(fetchEmployees, [refreshKey])
  const { data: services } = useSupabaseQuery(fetchServices, [])
  const { page, setPage, totalPages, pageItems } = usePagination(employees ?? [], 12)
  const [editingEmployee, setEditingEmployee] = useState<Employee | null>(null)

  const jobCount = (employeeId: string) => (services ?? []).filter((s) => s.employeeId === employeeId).length

  return (
    <div className="h-screen overflow-hidden flex flex-col">
      <PageHeader
        title="Empleados"
        subtitle={employees ? `${employees.length} empleados registrados` : 'Cargando…'}
      />

      {loadingEmployees ? (
        <p className="mx-8 mt-6 text-sm text-ink-500">Cargando empleados…</p>
      ) : errorEmployees ? (
        <p className="mx-8 mt-6 text-sm text-red-400">No se pudieron cargar los empleados: {errorEmployees}</p>
      ) : !employees || employees.length === 0 ? (
        <p className="mx-8 mt-6 text-sm text-ink-500">Todavía no hay empleados registrados.</p>
      ) : (
        <>
          <div className="mx-8 mt-6 flex-1 min-h-0 overflow-auto">
            <div className="grid grid-cols-1 gap-4 sm:grid-cols-2 lg:grid-cols-3">
              {pageItems.map((employee) => (
                <div key={employee.id} className="rounded-xl border border-white/10 bg-surface-alt p-5">
                  <div className="flex items-start justify-between">
                    <div>
                      <p className="font-semibold text-white">{employee.name}</p>
                      <p className="text-sm text-ink-400">{employee.role}</p>
                    </div>
                    <StatusPill status={employee.status} />
                  </div>
                  <div className="mt-4 flex items-center justify-between border-t border-white/5 pt-3 text-xs text-ink-500">
                    <span>{jobCount(employee.id)} trabajos asignados</span>
                    {employee.hourlyRate && <span className="tabular-nums">${employee.hourlyRate}/hr</span>}
                  </div>
                  <button
                    type="button"
                    onClick={() => setEditingEmployee(employee)}
                    className="mt-3 flex w-full items-center justify-center gap-1.5 rounded-lg border border-white/10 px-2.5 py-1.5 text-xs font-medium text-ink-300 hover:bg-white/5"
                  >
                    <Pencil className="h-3.5 w-3.5" />
                    Editar
                  </button>
                </div>
              ))}
            </div>
          </div>
          <div className="mx-8 my-4 overflow-hidden rounded-xl border border-white/10 bg-surface-alt">
            <Pagination page={page} totalPages={totalPages} onChange={setPage} />
          </div>
        </>
      )}

      <EditEmployeeModal
        employee={editingEmployee}
        onClose={() => setEditingEmployee(null)}
        onSaved={() => setRefreshKey((k) => k + 1)}
      />
    </div>
  )
}

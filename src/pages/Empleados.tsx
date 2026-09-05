import { PageHeader } from '../components/PageHeader'
import { Pagination } from '../components/Pagination'
import { StatusPill } from '../components/StatusPill'
import { fetchEmployees, fetchServices } from '../lib/api'
import { usePagination } from '../lib/usePagination'
import { useSupabaseQuery } from '../lib/useSupabaseQuery'

export const Empleados = () => {
  const { data: employees, loading: loadingEmployees, error: errorEmployees } = useSupabaseQuery(fetchEmployees, [])
  const { data: services } = useSupabaseQuery(fetchServices, [])
  const { page, setPage, totalPages, pageItems } = usePagination(employees ?? [], 12)

  const jobCount = (employeeId: string) => (services ?? []).filter((s) => s.employeeId === employeeId).length

  return (
    <div className="pb-10">
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
          <div className="mx-8 mt-6 max-h-[calc(100vh-260px)] overflow-auto">
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
                </div>
              ))}
            </div>
          </div>
          <div className="mx-8 mt-4 overflow-hidden rounded-xl border border-white/10 bg-surface-alt">
            <Pagination page={page} totalPages={totalPages} onChange={setPage} />
          </div>
        </>
      )}
    </div>
  )
}

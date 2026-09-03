import { MockBanner } from '../components/MockBanner'
import { PageHeader } from '../components/PageHeader'
import { StatusPill } from '../components/StatusPill'
import { employees, services } from '../mocks/data'

export const Empleados = () => {
  const jobCount = (employeeId: string) => services.filter((s) => s.employeeId === employeeId).length

  return (
    <div className="pb-10">
      <PageHeader title="Empleados" subtitle={`${employees.length} empleados registrados`} />
      <MockBanner />

      <div className="grid grid-cols-1 gap-4 px-8 pt-6 sm:grid-cols-2 lg:grid-cols-3">
        {employees.map((employee) => (
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
  )
}

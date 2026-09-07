import { useMemo, useState } from 'react'
import { Pencil, Plus, Search } from 'lucide-react'
import { AddEmployeeModal } from '../components/AddEmployeeModal'
import { EditEmployeeModal } from '../components/EditEmployeeModal'
import { PageHeader } from '../components/PageHeader'
import { Pagination } from '../components/Pagination'
import { StatusPill } from '../components/StatusPill'
import { fetchEmployees } from '../lib/api'
import { usePagination } from '../lib/usePagination'
import { useSupabaseQuery } from '../lib/useSupabaseQuery'
import type { Employee } from '../types'

export const Empleados = () => {
  const [refreshKey, setRefreshKey] = useState(0)
  const { data: employees, loading: loadingEmployees, error: errorEmployees } = useSupabaseQuery(fetchEmployees, [refreshKey])
  const [searchText, setSearchText] = useState('')
  const [addOpen, setAddOpen] = useState(false)
  const [editingEmployee, setEditingEmployee] = useState<Employee | null>(null)

  const filteredEmployees = useMemo(() => {
    const q = searchText.trim().toLowerCase()
    if (!q) return employees ?? []
    return (employees ?? []).filter((e) => e.name.toLowerCase().includes(q))
  }, [employees, searchText])

  const { page, setPage, totalPages, pageItems } = usePagination(filteredEmployees, 12)

  return (
    <div className="h-screen overflow-hidden flex flex-col">
      <PageHeader
        title="Empleados"
        subtitle={employees ? `${employees.length} empleados registrados` : 'Cargando…'}
        action={
          <button
            type="button"
            onClick={() => setAddOpen(true)}
            className="flex items-center gap-2 rounded-lg bg-gold-500 px-3.5 py-2 text-sm font-semibold text-brand-900 transition hover:bg-gold-400"
          >
            <Plus className="h-4 w-4" />
            Agregar empleado
          </button>
        }
      />

      <div className="mx-8 mt-6">
        <div className="relative max-w-sm">
          <Search className="pointer-events-none absolute left-3 top-1/2 h-4 w-4 -translate-y-1/2 text-ink-500" />
          <input
            type="text"
            value={searchText}
            onChange={(e) => setSearchText(e.target.value)}
            placeholder="Buscar por nombre…"
            className="w-full rounded-lg border border-white/10 bg-surface-alt py-2 pl-9 pr-3 text-sm text-ink-200 placeholder:text-ink-500"
          />
        </div>
      </div>

      {loadingEmployees ? (
        <p className="mx-8 mt-6 text-sm text-ink-500">Cargando empleados…</p>
      ) : errorEmployees ? (
        <p className="mx-8 mt-6 text-sm text-red-400">No se pudieron cargar los empleados: {errorEmployees}</p>
      ) : !employees || employees.length === 0 ? (
        <p className="mx-8 mt-6 text-sm text-ink-500">Todavía no hay empleados registrados.</p>
      ) : filteredEmployees.length === 0 ? (
        <p className="mx-8 mt-6 text-sm text-ink-500">Ningún empleado coincide con "{searchText}".</p>
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
                  <div className="mt-3 space-y-1 text-xs text-ink-400">
                    <p>{employee.contactNumber || 'Sin número de contacto'}</p>
                    <p>{employee.address || 'Sin dirección'}</p>
                  </div>
                  <div className="mt-3 flex items-center justify-between border-t border-white/5 pt-3 text-xs text-ink-500">
                    {employee.hourlyRate ? <span className="tabular-nums">${employee.hourlyRate}/hr</span> : <span />}
                    <span className="flex items-center gap-1.5">
                      W2
                      <StatusPill status={employee.w2Status} />
                    </span>
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

      <AddEmployeeModal open={addOpen} onClose={() => setAddOpen(false)} onSaved={() => setRefreshKey((k) => k + 1)} />

      <EditEmployeeModal
        employee={editingEmployee}
        onClose={() => setEditingEmployee(null)}
        onSaved={() => setRefreshKey((k) => k + 1)}
      />
    </div>
  )
}

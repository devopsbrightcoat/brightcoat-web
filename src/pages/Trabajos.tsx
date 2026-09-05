import { PageHeader } from '../components/PageHeader'
import { Pagination } from '../components/Pagination'
import { StatusPill } from '../components/StatusPill'
import { fetchEmployees, fetchProperties, fetchServiceTypes, fetchServices } from '../lib/api'
import { usePagination } from '../lib/usePagination'
import { useSupabaseQuery } from '../lib/useSupabaseQuery'

const currency = (value: number) =>
  value.toLocaleString('en-US', { style: 'currency', currency: 'USD', maximumFractionDigits: 0 })

export const Trabajos = () => {
  const { data: services, loading, error } = useSupabaseQuery(fetchServices, [])
  const { data: properties } = useSupabaseQuery(fetchProperties, [])
  const { data: serviceTypes } = useSupabaseQuery(fetchServiceTypes, [])
  const { data: employees } = useSupabaseQuery(fetchEmployees, [])
  const { page, setPage, totalPages, pageItems } = usePagination(services ?? [])

  const propertyName = (id: string) => properties?.find((p) => p.id === id)?.name ?? '—'
  const serviceTypeName = (id: string) => serviceTypes?.find((s) => s.id === id)?.name ?? '—'
  const employeeName = (id?: string) => employees?.find((e) => e.id === id)?.name ?? 'Sin asignar'

  return (
    <div className="pb-10">
      <PageHeader
        title="Trabajos / Servicios"
        subtitle={services ? `${services.length} órdenes de trabajo` : 'Cargando…'}
      />

      <div className="mx-8 mt-6 flex max-h-[calc(100vh-260px)] flex-col overflow-hidden rounded-xl border border-white/10 bg-surface-alt">
        {loading ? (
          <p className="px-5 py-6 text-sm text-ink-500">Cargando trabajos…</p>
        ) : error ? (
          <p className="px-5 py-6 text-sm text-red-400">No se pudieron cargar los trabajos: {error}</p>
        ) : !services || services.length === 0 ? (
          <p className="px-5 py-6 text-sm text-ink-500">Todavía no hay trabajos registrados.</p>
        ) : (
          <>
            <div className="overflow-auto">
              <table className="w-full text-left text-sm">
                <thead className="sticky top-0 z-10 bg-surface-alt">
                  <tr className="border-b border-white/10 bg-white/5 text-xs uppercase tracking-wide text-ink-500">
                    <th className="px-5 py-3 font-medium">Propiedad</th>
                    <th className="px-5 py-3 font-medium">Unidad</th>
                    <th className="px-5 py-3 font-medium">Tipo de servicio</th>
                    <th className="px-5 py-3 font-medium">Empleado</th>
                    <th className="px-5 py-3 font-medium">Fecha</th>
                    <th className="px-5 py-3 font-medium">Costo</th>
                    <th className="px-5 py-3 font-medium">Estado</th>
                    <th className="px-5 py-3 font-medium">Notas</th>
                  </tr>
                </thead>
                <tbody>
                  {pageItems.map((service) => (
                    <tr key={service.id} className="border-b border-white/5 last:border-0 hover:bg-white/5">
                      <td className="px-5 py-3.5 font-medium text-white">{propertyName(service.propertyId)}</td>
                      <td className="px-5 py-3.5 text-ink-400">
                        {service.unitLabel ?? '—'}
                        {service.unitSize && <span className="text-ink-500"> · {service.unitSize}</span>}
                      </td>
                      <td className="px-5 py-3.5 text-ink-400">{serviceTypeName(service.serviceTypeId)}</td>
                      <td className="px-5 py-3.5 text-ink-400">{employeeName(service.employeeId)}</td>
                      <td className="px-5 py-3.5 text-ink-400">{service.scheduledDate || '—'}</td>
                      <td className="px-5 py-3.5 tabular-nums text-ink-400">{currency(service.cost)}</td>
                      <td className="px-5 py-3.5">
                        <StatusPill status={service.status} />
                      </td>
                      <td className="max-w-[220px] truncate px-5 py-3.5 text-ink-500" title={service.notes ?? ''}>
                        {service.notes || '—'}
                      </td>
                    </tr>
                  ))}
                </tbody>
              </table>
            </div>
            <Pagination page={page} totalPages={totalPages} onChange={setPage} />
          </>
        )}
      </div>
    </div>
  )
}

import { MockBanner } from '../components/MockBanner'
import { PageHeader } from '../components/PageHeader'
import { StatusPill } from '../components/StatusPill'
import { employees, properties, serviceTypes, services } from '../mocks/data'

const currency = (value: number) =>
  value.toLocaleString('en-US', { style: 'currency', currency: 'USD', maximumFractionDigits: 0 })

export const Trabajos = () => {
  const propertyName = (id: string) => properties.find((p) => p.id === id)?.name ?? '—'
  const serviceTypeName = (id: string) => serviceTypes.find((s) => s.id === id)?.name ?? '—'
  const employeeName = (id?: string) => employees.find((e) => e.id === id)?.name ?? 'Sin asignar'

  return (
    <div className="pb-10">
      <PageHeader title="Trabajos / Servicios" subtitle={`${services.length} órdenes de trabajo`} />
      <MockBanner />

      <div className="mx-8 mt-6 overflow-x-auto rounded-xl border border-white/10 bg-surface-alt">
        <table className="w-full text-left text-sm">
          <thead>
            <tr className="border-b border-white/10 bg-white/5 text-xs uppercase tracking-wide text-ink-500">
              <th className="px-5 py-3 font-medium">Propiedad</th>
              <th className="px-5 py-3 font-medium">Tipo de servicio</th>
              <th className="px-5 py-3 font-medium">Empleado</th>
              <th className="px-5 py-3 font-medium">Fecha</th>
              <th className="px-5 py-3 font-medium">Costo</th>
              <th className="px-5 py-3 font-medium">Estado</th>
            </tr>
          </thead>
          <tbody>
            {services.map((service) => (
              <tr key={service.id} className="border-b border-white/5 last:border-0 hover:bg-white/5">
                <td className="px-5 py-3.5 font-medium text-white">{propertyName(service.propertyId)}</td>
                <td className="px-5 py-3.5 text-ink-400">{serviceTypeName(service.serviceTypeId)}</td>
                <td className="px-5 py-3.5 text-ink-400">{employeeName(service.employeeId)}</td>
                <td className="px-5 py-3.5 text-ink-400">{service.scheduledDate}</td>
                <td className="px-5 py-3.5 tabular-nums text-ink-400">{currency(service.cost)}</td>
                <td className="px-5 py-3.5">
                  <StatusPill status={service.status} />
                </td>
              </tr>
            ))}
          </tbody>
        </table>
      </div>
    </div>
  )
}

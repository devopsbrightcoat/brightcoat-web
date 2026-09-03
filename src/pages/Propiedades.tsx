import { MockBanner } from '../components/MockBanner'
import { PageHeader } from '../components/PageHeader'
import { StatusPill } from '../components/StatusPill'
import { properties } from '../mocks/data'

const clientTypeLabels: Record<string, string> = {
  residential: 'Residencial',
  multifamily: 'Multifamiliar',
  property_manager: 'Property manager',
}

export const Propiedades = () => {
  return (
    <div className="pb-10">
      <PageHeader title="Propiedades" subtitle={`${properties.length} propiedades registradas`} />
      <MockBanner />

      <div className="mx-8 mt-6 overflow-x-auto rounded-xl border border-white/10 bg-surface-alt">
        <table className="w-full text-left text-sm">
          <thead>
            <tr className="border-b border-white/10 bg-white/5 text-xs uppercase tracking-wide text-ink-500">
              <th className="px-5 py-3 font-medium">Propiedad</th>
              <th className="px-5 py-3 font-medium">Dirección</th>
              <th className="px-5 py-3 font-medium">Tipo</th>
              <th className="px-5 py-3 font-medium">Contacto</th>
              <th className="px-5 py-3 font-medium">Estado</th>
            </tr>
          </thead>
          <tbody>
            {properties.map((property) => (
              <tr key={property.id} className="border-b border-white/5 last:border-0 hover:bg-white/5">
                <td className="px-5 py-3.5 font-medium text-white">{property.name}</td>
                <td className="px-5 py-3.5 text-ink-400">{property.address}</td>
                <td className="px-5 py-3.5 text-ink-400">{clientTypeLabels[property.clientType]}</td>
                <td className="px-5 py-3.5 text-ink-400">{property.managerContact ?? '—'}</td>
                <td className="px-5 py-3.5">
                  <StatusPill status={property.status} />
                </td>
              </tr>
            ))}
          </tbody>
        </table>
      </div>
    </div>
  )
}

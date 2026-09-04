import { PageHeader } from '../components/PageHeader'
import { StatusPill } from '../components/StatusPill'
import { fetchProperties } from '../lib/api'
import { useSupabaseQuery } from '../lib/useSupabaseQuery'

const clientTypeLabels: Record<string, string> = {
  residential: 'Residencial',
  multifamily: 'Multifamiliar',
  property_manager: 'Property manager',
}

export const Propiedades = () => {
  const { data: properties, loading, error } = useSupabaseQuery(fetchProperties, [])

  return (
    <div className="pb-10">
      <PageHeader
        title="Propiedades"
        subtitle={properties ? `${properties.length} propiedades registradas` : 'Cargando…'}
      />

      <div className="mx-8 mt-6 overflow-x-auto rounded-xl border border-white/10 bg-surface-alt">
        {loading ? (
          <p className="px-5 py-6 text-sm text-ink-500">Cargando propiedades…</p>
        ) : error ? (
          <p className="px-5 py-6 text-sm text-red-400">No se pudieron cargar las propiedades: {error}</p>
        ) : !properties || properties.length === 0 ? (
          <p className="px-5 py-6 text-sm text-ink-500">Todavía no hay propiedades registradas.</p>
        ) : (
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
                  <td className="px-5 py-3.5 text-ink-400">{property.address || '—'}</td>
                  <td className="px-5 py-3.5 text-ink-400">{clientTypeLabels[property.clientType]}</td>
                  <td className="px-5 py-3.5 text-ink-400">{property.managerContact ?? '—'}</td>
                  <td className="px-5 py-3.5">
                    <StatusPill status={property.status} />
                  </td>
                </tr>
              ))}
            </tbody>
          </table>
        )}
      </div>
    </div>
  )
}

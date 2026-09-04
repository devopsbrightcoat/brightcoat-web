import { PageHeader } from '../components/PageHeader'
import { fetchServiceTypes } from '../lib/api'
import { useSupabaseQuery } from '../lib/useSupabaseQuery'

const categoryLabels: Record<string, string> = {
  painting: 'Pintura',
  cleaning: 'Limpieza',
  make_ready: 'Make Ready',
  repair: 'Reparación',
  other: 'Otro',
}

export const Configuracion = () => {
  const { data: serviceTypes, loading, error } = useSupabaseQuery(fetchServiceTypes, [])

  return (
    <div className="pb-10">
      <PageHeader title="Configuración" subtitle="Catálogo de tipos de servicio" />

      <div className="mx-8 mt-6 max-w-xl overflow-hidden rounded-xl border border-white/10 bg-surface-alt">
        {loading ? (
          <p className="px-5 py-6 text-sm text-ink-500">Cargando…</p>
        ) : error ? (
          <p className="px-5 py-6 text-sm text-red-400">No se pudo cargar el catálogo: {error}</p>
        ) : !serviceTypes || serviceTypes.length === 0 ? (
          <p className="px-5 py-6 text-sm text-ink-500">Todavía no hay tipos de servicio.</p>
        ) : (
          <table className="w-full text-left text-sm">
            <thead>
              <tr className="border-b border-white/5 text-xs uppercase tracking-wide text-ink-500">
                <th className="px-5 py-2.5 font-medium">Tipo de servicio</th>
                <th className="px-5 py-2.5 font-medium">Categoría</th>
              </tr>
            </thead>
            <tbody>
              {serviceTypes.map((type) => (
                <tr key={type.id} className="border-b border-white/5 last:border-0">
                  <td className="px-5 py-3 text-ink-200">{type.name}</td>
                  <td className="px-5 py-3 text-ink-400">{categoryLabels[type.category] ?? type.category}</td>
                </tr>
              ))}
            </tbody>
          </table>
        )}
      </div>
    </div>
  )
}

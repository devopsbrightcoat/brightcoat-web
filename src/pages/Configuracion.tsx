import { MockBanner } from '../components/MockBanner'
import { PageHeader } from '../components/PageHeader'
import { serviceTypes } from '../mocks/data'

const categoryLabels: Record<string, string> = {
  painting: 'Pintura',
  cleaning: 'Limpieza',
  repair: 'Reparación',
}

export const Configuracion = () => {
  return (
    <div className="pb-10">
      <PageHeader title="Configuración" subtitle="Catálogo de tipos de servicio" />
      <MockBanner />

      <div className="mx-8 mt-6 max-w-xl overflow-hidden rounded-xl border border-white/10 bg-surface-alt">
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
                <td className="px-5 py-3 text-ink-400">{categoryLabels[type.category]}</td>
              </tr>
            ))}
          </tbody>
        </table>
      </div>
    </div>
  )
}

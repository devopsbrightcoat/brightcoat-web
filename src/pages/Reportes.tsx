import { LineChart } from 'lucide-react'
import { PageHeader } from '../components/common/PageHeader'

// Reportería queda pendiente a propósito. Esta página mostraba antes un
// reporte parcial (solo Gastos) mientras se definía el resto — se
// reemplaza por un estado "en construcción" explícito hasta retomar el
// módulo completo, en vez de dejar una versión a medias que parezca
// terminada.
export const Reportes = () => {
  return (
    <div className="pb-10">
      <PageHeader title="Reportes" subtitle="Analítica del negocio" />

      <div className="mx-8 mt-6 flex flex-col items-center justify-center gap-3 rounded-xl border border-white/10 bg-surface-alt px-6 py-16 text-center">
        <span className="flex h-12 w-12 items-center justify-center rounded-full bg-white/10">
          <LineChart className="h-5 w-5 text-ink-400" />
        </span>
        <p className="text-sm font-medium text-ink-200">Reportería en construcción.</p>
        <p className="max-w-md text-xs text-ink-500">Estamos trabajando en esta sección. Disponible próximamente.</p>
      </div>
    </div>
  )
}

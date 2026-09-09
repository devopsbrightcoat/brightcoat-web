import { Settings } from 'lucide-react'
import { PageHeader } from '../components/common/PageHeader'

// Todavía no hay configuraciones generales definidas — esta pestaña queda
// lista para cuando aparezcan (nombre de la empresa, datos de contacto,
// preferencias del sistema, etc.).
export const ConfiguracionGeneral = () => {
  return (
    <div className="pb-10">
      <PageHeader title="General" subtitle="Configuración general de BrightCoat Ops" />

      <div className="mx-8 mt-6 flex flex-col items-center justify-center gap-3 rounded-xl border border-white/10 bg-surface-alt px-6 py-16 text-center">
        <span className="flex h-12 w-12 items-center justify-center rounded-full bg-white/10">
          <Settings className="h-5 w-5 text-ink-400" />
        </span>
        <p className="text-sm font-medium text-ink-200">Todavía no hay configuraciones generales.</p>
        <p className="max-w-md text-xs text-ink-500">
          Aquí van a vivir ajustes generales de la plataforma (datos de la empresa, preferencias, etc.) a medida que
          se necesiten.
        </p>
      </div>
    </div>
  )
}

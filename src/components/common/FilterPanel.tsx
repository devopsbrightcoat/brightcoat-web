import { useEffect } from 'react'
import { X } from 'lucide-react'

// ---------------------------------------------------------------------------
// Panel de filtros reutilizable — se desliza desde el lado derecho de la
// pantalla (en vez del modal centrado de Modal.tsx), para poder mostrar los
// filtros de cualquier pantalla sin taparla por completo. Cada pantalla
// (Cobros, Gastos, Horarios, Planillas) sigue teniendo su propio
// ChargeFiltersModal/ExpenseFiltersModal/etc. con sus campos específicos —
// ese componente le pasa los suyos como children y este solo pone el
// "chrome" común: encabezado, fondo, cierre con Escape/clic afuera, y el pie
// con "Limpiar filtros" / "Aplicar" que las cuatro pantallas repetían igual.
//
// Se queda montado siempre (no `if (!open) return null`) para poder animar
// tanto la entrada como la salida con transform/opacity — a diferencia de
// Modal.tsx, que aparece/desaparece de golpe.
// ---------------------------------------------------------------------------

type FilterPanelProps = {
  open: boolean
  onClose: () => void
  title?: string
  hasFilters: boolean
  onClear: () => void
  children: React.ReactNode
}

export const FilterPanel = ({
  open,
  onClose,
  title = 'Filtros',
  hasFilters,
  onClear,
  children,
}: FilterPanelProps) => {
  useEffect(() => {
    if (!open) return
    const handleKey = (e: KeyboardEvent) => {
      if (e.key === 'Escape') onClose()
    }
    window.addEventListener('keydown', handleKey)
    return () => window.removeEventListener('keydown', handleKey)
  }, [open, onClose])

  return (
    <div className={`fixed inset-0 z-50 ${open ? '' : 'pointer-events-none'}`} aria-hidden={!open}>
      <div
        className={`absolute inset-0 bg-black/60 transition-opacity duration-300 ${open ? 'opacity-100' : 'opacity-0'}`}
        onClick={onClose}
      />
      <div
        className={`absolute right-0 top-0 flex h-full w-full max-w-sm flex-col border-l border-white/10 bg-surface-alt shadow-xl transition-transform duration-300 ease-out ${
          open ? 'translate-x-0' : 'translate-x-full'
        }`}
      >
        <div className="flex items-center justify-between border-b border-white/10 px-5 py-4">
          <h2 className="text-lg font-semibold text-white">{title}</h2>
          <button
            type="button"
            onClick={onClose}
            className="rounded-lg p-1 text-ink-400 hover:bg-white/10 hover:text-white"
          >
            <X className="h-5 w-5" />
          </button>
        </div>

        <div className="flex-1 overflow-y-auto px-5 py-5">{children}</div>

        <div className="flex items-center justify-between border-t border-white/10 px-5 py-4">
          <button
            type="button"
            disabled={!hasFilters}
            onClick={onClear}
            className="text-sm font-medium text-ink-400 hover:text-ink-200 disabled:opacity-40 disabled:hover:text-ink-400"
          >
            Limpiar filtros
          </button>
          <button
            type="button"
            onClick={onClose}
            className="rounded-lg bg-gold-500 px-4 py-2 text-sm font-semibold text-brand-900 transition hover:bg-gold-400"
          >
            Aplicar
          </button>
        </div>
      </div>
    </div>
  )
}

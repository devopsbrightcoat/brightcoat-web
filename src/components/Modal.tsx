import { useEffect } from 'react'
import { X } from 'lucide-react'

// ---------------------------------------------------------------------------
// Modal genérico reutilizable — fondo oscuro + panel centrado, estilo
// consistente con el resto de la app (bg-surface-alt, border-white/10,
// rounded-2xl). Se cierra con el botón X, clic en el fondo, o Escape.
// ---------------------------------------------------------------------------

type ModalProps = {
  open: boolean
  onClose: () => void
  title: string
  children: React.ReactNode
}

export const Modal = ({ open, onClose, title, children }: ModalProps) => {
  useEffect(() => {
    if (!open) return
    const handleKey = (e: KeyboardEvent) => {
      if (e.key === 'Escape') onClose()
    }
    window.addEventListener('keydown', handleKey)
    return () => window.removeEventListener('keydown', handleKey)
  }, [open, onClose])

  if (!open) return null

  return (
    <div className="fixed inset-0 z-50 flex items-center justify-center px-4 py-8">
      <div className="absolute inset-0 bg-black/60" onClick={onClose} />
      <div className="relative max-h-full w-full max-w-lg overflow-y-auto rounded-2xl border border-white/10 bg-surface-alt p-6 shadow-xl">
        <div className="mb-5 flex items-center justify-between">
          <h2 className="text-lg font-semibold text-white">{title}</h2>
          <button
            type="button"
            onClick={onClose}
            className="rounded-lg p-1 text-ink-400 hover:bg-white/10 hover:text-white"
          >
            <X className="h-5 w-5" />
          </button>
        </div>
        {children}
      </div>
    </div>
  )
}

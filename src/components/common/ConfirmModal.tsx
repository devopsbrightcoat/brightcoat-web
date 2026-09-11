import { useState } from 'react'
import { Modal } from './Modal'
import { getErrorMessage } from '../../lib/errors'

// ---------------------------------------------------------------------------
// Modal de confirmación genérico para acciones destructivas (eliminar).
// Deshabilita los botones mientras la eliminación está en curso y muestra
// el error real de la base de datos si falla (ej. restricción de llave
// foránea — "esta propiedad tiene horarios asociados", etc.), traducido a
// un mensaje claro por cada `delete*` de src/lib/api.ts.
// ---------------------------------------------------------------------------

type ConfirmModalProps = {
  open: boolean
  onClose: () => void
  title: string
  message: string
  confirmLabel?: string
  onConfirm: () => Promise<void>
}

export const ConfirmModal = ({
  open,
  onClose,
  title,
  message,
  confirmLabel = 'Eliminar',
  onConfirm,
}: ConfirmModalProps) => {
  const [deleting, setDeleting] = useState(false)
  const [error, setError] = useState<string | null>(null)

  const handleClose = () => {
    if (deleting) return
    setError(null)
    onClose()
  }

  const handleConfirm = async () => {
    setDeleting(true)
    setError(null)
    try {
      await onConfirm()
      setDeleting(false)
      onClose()
    } catch (err) {
      setDeleting(false)
      setError(getErrorMessage(err, 'No se pudo eliminar. Intenta de nuevo.'))
    }
  }

  return (
    <Modal open={open} onClose={handleClose} title={title} widthClassName="max-w-sm">
      <div className="space-y-4">
        <p className="text-sm text-ink-300">{message}</p>
        {error && <p className="rounded-lg bg-red-500/10 px-3 py-2 text-sm text-red-400">{error}</p>}
        <div className="flex justify-end gap-3 pt-2">
          <button
            type="button"
            onClick={handleClose}
            disabled={deleting}
            className="rounded-lg border border-white/10 px-4 py-2 text-sm font-medium text-ink-300 hover:bg-white/5 disabled:opacity-60"
          >
            Cancelar
          </button>
          <button
            type="button"
            disabled={deleting}
            onClick={handleConfirm}
            className="rounded-lg bg-red-500 px-4 py-2 text-sm font-semibold text-white transition hover:bg-red-400 disabled:opacity-60"
          >
            {deleting ? 'Eliminando…' : confirmLabel}
          </button>
        </div>
      </div>
    </Modal>
  )
}

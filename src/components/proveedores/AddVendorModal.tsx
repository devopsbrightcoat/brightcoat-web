import { useEffect, useState } from 'react'
import { Modal } from '../common/Modal'
import { createVendor } from '../../lib/api'
import { getErrorMessage } from '../../lib/errors'

const inputClass =
  'w-full rounded-lg border border-white/10 bg-surface px-3 py-2.5 text-sm text-white outline-none focus:border-gold-500'
const labelClass = 'mb-1.5 block text-sm font-medium text-ink-200'

type AddVendorModalProps = {
  open: boolean
  onClose: () => void
  onSaved: () => void
}

export const AddVendorModal = ({ open, onClose, onSaved }: AddVendorModalProps) => {
  const [name, setName] = useState('')
  const [notes, setNotes] = useState('')
  const [saving, setSaving] = useState(false)
  const [error, setError] = useState<string | null>(null)

  useEffect(() => {
    if (!open) return
    setName('')
    setNotes('')
    setError(null)
  }, [open])

  const handleSave = async () => {
    if (!name.trim()) {
      setError('El nombre es obligatorio.')
      return
    }
    setSaving(true)
    setError(null)
    try {
      await createVendor({ name: name.trim(), notes })
      onSaved()
      onClose()
    } catch (err) {
      setError(getErrorMessage(err, 'No se pudo crear el proveedor.'))
    } finally {
      setSaving(false)
    }
  }

  return (
    <Modal open={open} onClose={onClose} title="Agregar proveedor">
      <div className="space-y-4">
        <div>
          <label htmlFor="new-vendor-name" className={labelClass}>
            Nombre
          </label>
          <input
            id="new-vendor-name"
            type="text"
            value={name}
            onChange={(e) => setName(e.target.value)}
            placeholder="ej. Home Depot"
            className={inputClass}
          />
        </div>

        <div>
          <label htmlFor="new-vendor-notes" className={labelClass}>
            Notas
          </label>
          <textarea
            id="new-vendor-notes"
            value={notes}
            onChange={(e) => setNotes(e.target.value)}
            rows={3}
            placeholder="Opcional"
            className={inputClass}
          />
        </div>

        {error && <p className="rounded-lg bg-red-500/10 px-3 py-2 text-sm text-red-400">{error}</p>}

        <div className="flex justify-end gap-3 pt-2">
          <button
            type="button"
            onClick={onClose}
            className="rounded-lg border border-white/10 px-4 py-2 text-sm font-medium text-ink-300 hover:bg-white/5"
          >
            Cancelar
          </button>
          <button
            type="button"
            disabled={saving}
            onClick={handleSave}
            className="rounded-lg bg-gold-500 px-4 py-2 text-sm font-semibold text-brand-900 transition hover:bg-gold-400 disabled:opacity-60"
          >
            {saving ? 'Guardando…' : 'Agregar proveedor'}
          </button>
        </div>
      </div>
    </Modal>
  )
}

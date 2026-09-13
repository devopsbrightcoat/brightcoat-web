import { useEffect, useState } from 'react'
import { Modal } from '../common/Modal'
import { updateVendor } from '../../lib/api'
import { getErrorMessage } from '../../lib/errors'
import type { Vendor } from '../../types'

const inputClass =
  'w-full rounded-lg border border-white/10 bg-surface px-3 py-2.5 text-sm text-white outline-none focus:border-gold-500'
const labelClass = 'mb-1.5 block text-sm font-medium text-ink-200'

type EditVendorModalProps = {
  vendor: Vendor | null
  onClose: () => void
  onSaved: () => void
}

export const EditVendorModal = ({ vendor, onClose, onSaved }: EditVendorModalProps) => {
  const [name, setName] = useState('')
  const [notes, setNotes] = useState('')
  const [saving, setSaving] = useState(false)
  const [error, setError] = useState<string | null>(null)

  useEffect(() => {
    if (!vendor) return
    setName(vendor.name)
    setNotes(vendor.notes ?? '')
    setError(null)
  }, [vendor])

  const handleSave = async () => {
    if (!vendor) return
    if (!name.trim()) {
      setError('El nombre es obligatorio.')
      return
    }
    setSaving(true)
    setError(null)
    try {
      await updateVendor(vendor.id, { name: name.trim(), notes })
      onSaved()
      onClose()
    } catch (err) {
      setError(getErrorMessage(err, 'No se pudo guardar el proveedor.'))
    } finally {
      setSaving(false)
    }
  }

  return (
    <Modal open={vendor !== null} onClose={onClose} title="Editar proveedor">
      <div className="space-y-4">
        <div>
          <label htmlFor="vendor-name" className={labelClass}>
            Nombre
          </label>
          <input
            id="vendor-name"
            type="text"
            value={name}
            onChange={(e) => setName(e.target.value)}
            className={inputClass}
          />
        </div>

        <div>
          <label htmlFor="vendor-notes" className={labelClass}>
            Notas
          </label>
          <textarea
            id="vendor-notes"
            value={notes}
            onChange={(e) => setNotes(e.target.value)}
            rows={3}
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
            {saving ? 'Guardando…' : 'Guardar cambios'}
          </button>
        </div>
      </div>
    </Modal>
  )
}

import { useEffect, useState } from 'react'
import { Modal } from '../common/Modal'
import { createServiceType } from '../../lib/api'
import { getErrorMessage } from '../../lib/errors'
import type { ServiceCategory } from '../../types'

const CATEGORY_OPTIONS: { value: ServiceCategory; label: string }[] = [
  { value: 'painting', label: 'Pintura' },
  { value: 'cleaning', label: 'Limpieza' },
  { value: 'make_ready', label: 'Make Ready' },
  { value: 'repair', label: 'Reparación' },
  { value: 'other', label: 'Otro' },
]

const inputClass =
  'w-full rounded-lg border border-white/10 bg-surface px-3 py-2.5 text-sm text-white outline-none focus:border-gold-500'
const labelClass = 'mb-1.5 block text-sm font-medium text-ink-200'

type AddServiceTypeModalProps = {
  open: boolean
  onClose: () => void
  onSaved: () => void
}

export const AddServiceTypeModal = ({ open, onClose, onSaved }: AddServiceTypeModalProps) => {
  const [name, setName] = useState('')
  const [category, setCategory] = useState<ServiceCategory>('painting')
  const [saving, setSaving] = useState(false)
  const [error, setError] = useState<string | null>(null)

  useEffect(() => {
    if (!open) return
    setName('')
    setCategory('painting')
    setError(null)
  }, [open])

  const handleSave = async () => {
    if (!name.trim()) {
      setError('El nombre del servicio es obligatorio.')
      return
    }
    setSaving(true)
    setError(null)
    try {
      await createServiceType({ name: name.trim(), category })
      onSaved()
      onClose()
    } catch (err) {
      setError(getErrorMessage(err, 'No se pudo crear el servicio.'))
    } finally {
      setSaving(false)
    }
  }

  return (
    <Modal open={open} onClose={onClose} title="Agregar servicio">
      <div className="space-y-4">
        <div>
          <label htmlFor="new-svc-name" className={labelClass}>
            Nombre del servicio
          </label>
          <input
            id="new-svc-name"
            type="text"
            value={name}
            onChange={(e) => setName(e.target.value)}
            className={inputClass}
          />
        </div>

        <div>
          <label htmlFor="new-svc-category" className={labelClass}>
            Categoría
          </label>
          <select
            id="new-svc-category"
            value={category}
            onChange={(e) => setCategory(e.target.value as ServiceCategory)}
            className={inputClass}
          >
            {CATEGORY_OPTIONS.map((opt) => (
              <option key={opt.value} value={opt.value}>
                {opt.label}
              </option>
            ))}
          </select>
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
            {saving ? 'Guardando…' : 'Agregar servicio'}
          </button>
        </div>
      </div>
    </Modal>
  )
}

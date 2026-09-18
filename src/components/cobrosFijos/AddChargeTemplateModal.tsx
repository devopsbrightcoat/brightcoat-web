import { useEffect, useState } from 'react'
import { Modal } from '../common/Modal'
import { createChargeTemplate } from '../../lib/api'
import { getErrorMessage } from '../../lib/errors'
import type { Property } from '../../types'

const inputClass =
  'w-full rounded-lg border border-white/10 bg-surface px-3 py-2.5 text-sm text-white outline-none focus:border-gold-500'
const labelClass = 'mb-1.5 block text-sm font-medium text-ink-200'

type AddChargeTemplateModalProps = {
  open: boolean
  properties: Property[]
  onClose: () => void
  onSaved: () => void
}

export const AddChargeTemplateModal = ({ open, properties, onClose, onSaved }: AddChargeTemplateModalProps) => {
  const [propertyId, setPropertyId] = useState('')
  const [name, setName] = useState('')
  const [amount, setAmount] = useState('')
  const [saving, setSaving] = useState(false)
  const [error, setError] = useState<string | null>(null)

  useEffect(() => {
    if (!open) return
    setPropertyId('')
    setName('')
    setAmount('')
    setError(null)
  }, [open])

  const handleSave = async () => {
    if (!propertyId) {
      setError('Selecciona una propiedad.')
      return
    }
    if (!name.trim()) {
      setError('El nombre es obligatorio.')
      return
    }
    const amountValue = Number(amount)
    if (!amount.trim() || Number.isNaN(amountValue) || amountValue < 0) {
      setError('El monto no es un número válido.')
      return
    }
    setSaving(true)
    setError(null)
    try {
      await createChargeTemplate({ propertyId, name: name.trim(), amount: amountValue })
      onSaved()
      onClose()
    } catch (err) {
      setError(getErrorMessage(err, 'No se pudo crear el cobro fijo.'))
    } finally {
      setSaving(false)
    }
  }

  return (
    <Modal open={open} onClose={onClose} title="Agregar cobro fijo">
      <div className="space-y-4">
        <div>
          <label htmlFor="new-chgtpl-property" className={labelClass}>
            Propiedad
          </label>
          <select
            id="new-chgtpl-property"
            value={propertyId}
            onChange={(e) => setPropertyId(e.target.value)}
            className={inputClass}
          >
            <option value="">Selecciona…</option>
            {properties.map((p) => (
              <option key={p.id} value={p.id}>
                {p.name}
              </option>
            ))}
          </select>
        </div>

        <div>
          <label htmlFor="new-chgtpl-name" className={labelClass}>
            Servicio
          </label>
          <input
            id="new-chgtpl-name"
            type="text"
            value={name}
            onChange={(e) => setName(e.target.value)}
            placeholder="ej. Cuota de administración"
            className={inputClass}
          />
        </div>

        <div>
          <label htmlFor="new-chgtpl-amount" className={labelClass}>
            Monto
          </label>
          <input
            id="new-chgtpl-amount"
            type="number"
            min="0"
            step="0.01"
            value={amount}
            onChange={(e) => setAmount(e.target.value)}
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
            {saving ? 'Guardando…' : 'Agregar cobro fijo'}
          </button>
        </div>
      </div>
    </Modal>
  )
}

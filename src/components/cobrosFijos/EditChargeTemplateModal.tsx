import { useEffect, useState } from 'react'
import { Modal } from '../common/Modal'
import { updateChargeTemplate } from '../../lib/api'
import { getErrorMessage } from '../../lib/errors'
import type { ChargeTemplate, Property, ServiceType } from '../../types'

const inputClass =
  'w-full rounded-lg border border-white/10 bg-surface px-3 py-2.5 text-sm text-white outline-none focus:border-gold-500'
const labelClass = 'mb-1.5 block text-sm font-medium text-ink-200'

type EditChargeTemplateModalProps = {
  template: ChargeTemplate | null
  properties: Property[]
  serviceTypes: ServiceType[]
  onClose: () => void
  onSaved: () => void
}

export const EditChargeTemplateModal = ({ template, properties, serviceTypes, onClose, onSaved }: EditChargeTemplateModalProps) => {
  const [propertyId, setPropertyId] = useState('')
  const [serviceTypeId, setServiceTypeId] = useState('')
  const [name, setName] = useState('')
  const [amount, setAmount] = useState('')
  const [saving, setSaving] = useState(false)
  const [error, setError] = useState<string | null>(null)

  useEffect(() => {
    if (!template) return
    setPropertyId(template.propertyId)
    setServiceTypeId(template.serviceTypeId ?? '')
    setName(template.name)
    setAmount(String(template.amount))
    setError(null)
  }, [template])

  const handleSave = async () => {
    if (!template) return
    if (!propertyId) {
      setError('Selecciona una propiedad.')
      return
    }
    if (!serviceTypeId) {
      setError('Selecciona un tipo de servicio.')
      return
    }
    if (!name.trim()) {
      setError('La descripción es obligatoria.')
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
      await updateChargeTemplate(template.id, { propertyId, name: name.trim(), amount: amountValue, serviceTypeId })
      onSaved()
      onClose()
    } catch (err) {
      setError(getErrorMessage(err, 'No se pudo guardar el cobro fijo.'))
    } finally {
      setSaving(false)
    }
  }

  return (
    <Modal open={template !== null} onClose={onClose} title="Editar cobro fijo">
      <div className="space-y-4">
        <div>
          <label htmlFor="edit-chgtpl-property" className={labelClass}>
            Propiedad
          </label>
          <select
            id="edit-chgtpl-property"
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
          <label htmlFor="edit-chgtpl-service" className={labelClass}>
            Tipo de servicio
          </label>
          <select
            id="edit-chgtpl-service"
            value={serviceTypeId}
            onChange={(e) => setServiceTypeId(e.target.value)}
            className={inputClass}
          >
            <option value="">Selecciona…</option>
            {serviceTypes.map((t) => (
              <option key={t.id} value={t.id}>
                {t.name}
              </option>
            ))}
          </select>
        </div>

        <div>
          <label htmlFor="edit-chgtpl-name" className={labelClass}>
            Descripción
          </label>
          <input
            id="edit-chgtpl-name"
            type="text"
            value={name}
            onChange={(e) => setName(e.target.value)}
            className={inputClass}
          />
        </div>

        <div>
          <label htmlFor="edit-chgtpl-amount" className={labelClass}>
            Monto
          </label>
          <input
            id="edit-chgtpl-amount"
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
            {saving ? 'Guardando…' : 'Guardar cambios'}
          </button>
        </div>
      </div>
    </Modal>
  )
}

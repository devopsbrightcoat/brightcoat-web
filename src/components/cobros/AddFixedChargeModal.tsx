import { useEffect, useState } from 'react'
import { Modal } from '../common/Modal'
import { createFixedCharge, fetchChargeTemplates } from '../../lib/api'
import { getErrorMessage } from '../../lib/errors'
import { useSupabaseQuery } from '../../lib/useSupabaseQuery'
import type { Property } from '../../types'

const inputClass =
  'w-full rounded-lg border border-white/10 bg-surface px-3 py-2.5 text-sm text-white outline-none focus:border-gold-500'
const labelClass = 'mb-1.5 block text-sm font-medium text-ink-200'

type AddFixedChargeModalProps = {
  open: boolean
  properties: Property[]
  onClose: () => void
  onSaved: () => void
}

export const AddFixedChargeModal = ({ open, properties, onClose, onSaved }: AddFixedChargeModalProps) => {
  const [templateId, setTemplateId] = useState('')
  const [amount, setAmount] = useState('')
  const [date, setDate] = useState('')
  const [saving, setSaving] = useState(false)
  const [error, setError] = useState<string | null>(null)

  const { data: templates } = useSupabaseQuery(fetchChargeTemplates, [open])

  useEffect(() => {
    if (!open) return
    setTemplateId('')
    setAmount('')
    setDate('')
    setError(null)
  }, [open])

  const selectedTemplate = (templates ?? []).find((t) => t.id === templateId)
  const selectedPropertyName = selectedTemplate
    ? properties.find((p) => p.id === selectedTemplate.propertyId)?.name ?? '—'
    : null

  const handleTemplateChange = (id: string) => {
    setTemplateId(id)
    const template = (templates ?? []).find((t) => t.id === id)
    if (template) setAmount(String(template.amount))
  }

  const handleSave = async () => {
    const template = (templates ?? []).find((t) => t.id === templateId)
    if (!template) {
      setError('Selecciona un cobro fijo.')
      return
    }
    const amountValue = Number(amount)
    if (!amount || Number.isNaN(amountValue) || amountValue < 0) {
      setError('El monto no es válido.')
      return
    }
    if (!date) {
      setError('La fecha de cobro es obligatoria.')
      return
    }

    setSaving(true)
    setError(null)
    try {
      await createFixedCharge({
        propertyId: template.propertyId,
        amount: amountValue,
        generatedDate: date,
        description: template.name,
      })
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
          <label htmlFor="new-fixed-charge-template" className={labelClass}>
            Cobro fijo
          </label>
          <select
            id="new-fixed-charge-template"
            value={templateId}
            onChange={(e) => handleTemplateChange(e.target.value)}
            className={inputClass}
          >
            <option value="">Selecciona…</option>
            {(templates ?? []).map((t) => (
              <option key={t.id} value={t.id}>
                {t.name}
              </option>
            ))}
          </select>
          {templates && templates.length === 0 && (
            <p className="mt-1.5 text-xs text-ink-500">
              Todavía no hay cobros fijos en el catálogo — agrega uno en Configuración › Cobros fijos primero.
            </p>
          )}
          {selectedPropertyName && (
            <p className="mt-1.5 text-xs text-ink-500">Propiedad: {selectedPropertyName}</p>
          )}
        </div>

        <div>
          <label htmlFor="new-fixed-charge-amount" className={labelClass}>
            Monto
          </label>
          <input
            id="new-fixed-charge-amount"
            type="number"
            min="0"
            step="0.01"
            value={amount}
            onChange={(e) => setAmount(e.target.value)}
            className={inputClass}
          />
        </div>

        <div>
          <label htmlFor="new-fixed-charge-date" className={labelClass}>
            Fecha de cobro
          </label>
          <input
            id="new-fixed-charge-date"
            type="date"
            value={date}
            onChange={(e) => setDate(e.target.value)}
            className={inputClass}
          />
        </div>

        <p className="text-xs text-ink-500">
          Un cobro fijo no lleva apartamento ni tipo de servicio — queda ligado solo a la propiedad. Cobros lo
          muestra con "N/A" en la columna Apartamento.
        </p>

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

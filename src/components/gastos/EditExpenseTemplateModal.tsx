import { useEffect, useState } from 'react'
import { Modal } from '../common/Modal'
import { updateExpenseTemplate } from '../../lib/api'
import { getErrorMessage } from '../../lib/errors'
import type { ExpenseTemplate } from '../../types'

const inputClass =
  'w-full rounded-lg border border-white/10 bg-surface px-3 py-2.5 text-sm text-white outline-none focus:border-gold-500'
const labelClass = 'mb-1.5 block text-sm font-medium text-ink-200'

type EditExpenseTemplateModalProps = {
  template: ExpenseTemplate | null
  onClose: () => void
  onSaved: () => void
}

export const EditExpenseTemplateModal = ({ template, onClose, onSaved }: EditExpenseTemplateModalProps) => {
  const [name, setName] = useState('')
  const [amount, setAmount] = useState('')
  const [description, setDescription] = useState('')
  const [saving, setSaving] = useState(false)
  const [error, setError] = useState<string | null>(null)

  useEffect(() => {
    if (!template) return
    setName(template.name)
    setAmount(template.amount != null ? String(template.amount) : '')
    setDescription(template.description ?? '')
    setError(null)
  }, [template])

  const handleSave = async () => {
    if (!template) return
    if (!name.trim()) {
      setError('El nombre es obligatorio.')
      return
    }
    let amountValue: number | null = null
    if (amount.trim()) {
      const parsed = Number(amount)
      if (Number.isNaN(parsed) || parsed < 0) {
        setError('El monto no es un número válido.')
        return
      }
      amountValue = parsed
    }
    setSaving(true)
    setError(null)
    try {
      await updateExpenseTemplate(template.id, { name: name.trim(), amount: amountValue, description })
      onSaved()
      onClose()
    } catch (err) {
      setError(getErrorMessage(err, 'No se pudo guardar el gasto fijo.'))
    } finally {
      setSaving(false)
    }
  }

  return (
    <Modal open={template !== null} onClose={onClose} title="Editar gasto fijo">
      <div className="space-y-4">
        <div>
          <label htmlFor="edit-exptpl-name" className={labelClass}>
            Nombre
          </label>
          <input
            id="edit-exptpl-name"
            type="text"
            value={name}
            onChange={(e) => setName(e.target.value)}
            className={inputClass}
          />
        </div>

        <div>
          <label htmlFor="edit-exptpl-amount" className={labelClass}>
            Monto
          </label>
          <input
            id="edit-exptpl-amount"
            type="number"
            min="0"
            step="0.01"
            value={amount}
            onChange={(e) => setAmount(e.target.value)}
            placeholder="Opcional, si el monto no varía"
            className={inputClass}
          />
        </div>

        <div>
          <label htmlFor="edit-exptpl-description" className={labelClass}>
            Descripción
          </label>
          <textarea
            id="edit-exptpl-description"
            value={description}
            onChange={(e) => setDescription(e.target.value)}
            rows={3}
            placeholder="Opcional — se precarga en la descripción del gasto"
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

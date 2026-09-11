import { useEffect, useState } from 'react'
import { Modal } from '../common/Modal'
import { createExpenseTemplate } from '../../lib/api'
import { getErrorMessage } from '../../lib/errors'

const inputClass =
  'w-full rounded-lg border border-white/10 bg-surface px-3 py-2.5 text-sm text-white outline-none focus:border-gold-500'
const labelClass = 'mb-1.5 block text-sm font-medium text-ink-200'

type AddExpenseTemplateModalProps = {
  open: boolean
  onClose: () => void
  onSaved: () => void
}

// "Gastos fijos" — catálogo de tipos de gasto recurrentes (renta, seguro,
// internet, etc.) que se puede elegir como plantilla al agregar un gasto
// real (ver AddExpenseModal). No crea gastos ni los liga entre sí — solo
// precarga monto y descripción en el formulario.
export const AddExpenseTemplateModal = ({ open, onClose, onSaved }: AddExpenseTemplateModalProps) => {
  const [name, setName] = useState('')
  const [amount, setAmount] = useState('')
  const [description, setDescription] = useState('')
  const [saving, setSaving] = useState(false)
  const [error, setError] = useState<string | null>(null)

  useEffect(() => {
    if (!open) return
    setName('')
    setAmount('')
    setDescription('')
    setError(null)
  }, [open])

  const handleSave = async () => {
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
      await createExpenseTemplate({ name: name.trim(), amount: amountValue, description })
      onSaved()
      onClose()
    } catch (err) {
      setError(getErrorMessage(err, 'No se pudo crear el gasto fijo.'))
    } finally {
      setSaving(false)
    }
  }

  return (
    <Modal open={open} onClose={onClose} title="Agregar gasto fijo">
      <div className="space-y-4">
        <div>
          <label htmlFor="new-exptpl-name" className={labelClass}>
            Nombre
          </label>
          <input
            id="new-exptpl-name"
            type="text"
            value={name}
            onChange={(e) => setName(e.target.value)}
            placeholder="ej. Renta de bodega"
            className={inputClass}
          />
        </div>

        <div>
          <label htmlFor="new-exptpl-amount" className={labelClass}>
            Monto
          </label>
          <input
            id="new-exptpl-amount"
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
          <label htmlFor="new-exptpl-description" className={labelClass}>
            Descripción
          </label>
          <textarea
            id="new-exptpl-description"
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
            {saving ? 'Guardando…' : 'Agregar gasto fijo'}
          </button>
        </div>
      </div>
    </Modal>
  )
}

import { useEffect, useState } from 'react'
import { Modal } from './Modal'
import { updateExpense } from '../lib/api'
import type { Expense } from '../types'
import { getErrorMessage } from '../lib/errors'

const inputClass =
  'w-full rounded-lg border border-white/10 bg-surface px-3 py-2.5 text-sm text-white outline-none focus:border-gold-500'
const labelClass = 'mb-1.5 block text-sm font-medium text-ink-200'

type EditExpenseModalProps = {
  expense: Expense | null
  onClose: () => void
  onSaved: () => void
}

export const EditExpenseModal = ({ expense, onClose, onSaved }: EditExpenseModalProps) => {
  const [invoiceNumber, setInvoiceNumber] = useState('')
  const [amount, setAmount] = useState('')
  const [date, setDate] = useState('')
  const [description, setDescription] = useState('')
  const [saving, setSaving] = useState(false)
  const [error, setError] = useState<string | null>(null)

  useEffect(() => {
    if (!expense) return
    setInvoiceNumber(expense.invoiceNumber ?? '')
    setAmount(String(expense.amount))
    setDate(expense.date)
    setDescription(expense.description ?? '')
    setError(null)
  }, [expense])

  const handleSave = async () => {
    if (!expense) return
    const amountNum = Number(amount)
    if (!amount || Number.isNaN(amountNum) || amountNum < 0) {
      setError('El monto no es válido.')
      return
    }
    if (!date) {
      setError('La fecha es obligatoria.')
      return
    }
    setSaving(true)
    setError(null)
    try {
      await updateExpense(expense.id, { invoiceNumber, amount: amountNum, date, description })
      onSaved()
      onClose()
    } catch (err) {
      setError(getErrorMessage(err, 'No se pudo guardar el gasto.'))
    } finally {
      setSaving(false)
    }
  }

  return (
    <Modal open={expense !== null} onClose={onClose} title="Editar gasto">
      <div className="space-y-4">
        <div>
          <label htmlFor="exp-invoice" className={labelClass}>
            Número de factura
          </label>
          <input
            id="exp-invoice"
            type="text"
            value={invoiceNumber}
            onChange={(e) => setInvoiceNumber(e.target.value)}
            className={inputClass}
          />
        </div>

        <div>
          <label htmlFor="exp-amount" className={labelClass}>
            Monto
          </label>
          <input
            id="exp-amount"
            type="number"
            min="0"
            step="0.01"
            value={amount}
            onChange={(e) => setAmount(e.target.value)}
            className={inputClass}
          />
        </div>

        <div>
          <label htmlFor="exp-date" className={labelClass}>
            Fecha
          </label>
          <input id="exp-date" type="date" value={date} onChange={(e) => setDate(e.target.value)} className={inputClass} />
        </div>

        <div>
          <label htmlFor="exp-description" className={labelClass}>
            Descripción
          </label>
          <textarea
            id="exp-description"
            value={description}
            onChange={(e) => setDescription(e.target.value)}
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

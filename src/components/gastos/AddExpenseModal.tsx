import { useEffect, useState } from 'react'
import { Modal } from '../common/Modal'
import { createExpense, fetchExpenseTemplates } from '../../lib/api'
import { getErrorMessage } from '../../lib/errors'
import { useSupabaseQuery } from '../../lib/useSupabaseQuery'

const inputClass =
  'w-full rounded-lg border border-white/10 bg-surface px-3 py-2.5 text-sm text-white outline-none focus:border-gold-500'
const labelClass = 'mb-1.5 block text-sm font-medium text-ink-200'

type AddExpenseModalProps = {
  open: boolean
  onClose: () => void
  onSaved: () => void
}

export const AddExpenseModal = ({ open, onClose, onSaved }: AddExpenseModalProps) => {
  const [invoiceNumber, setInvoiceNumber] = useState('')
  const [amount, setAmount] = useState('')
  const [date, setDate] = useState('')
  const [description, setDescription] = useState('')
  const [templateId, setTemplateId] = useState('')
  const [saving, setSaving] = useState(false)
  const [error, setError] = useState<string | null>(null)

  const { data: templates } = useSupabaseQuery(fetchExpenseTemplates, [open])

  useEffect(() => {
    if (!open) return
    setInvoiceNumber('')
    setAmount('')
    setDate('')
    setDescription('')
    setTemplateId('')
    setError(null)
  }, [open])

  // Elegir un gasto fijo solo precarga monto y descripción — no queda
  // ningún vínculo guardado entre el gasto y la plantilla usada.
  const handleTemplateChange = (id: string) => {
    setTemplateId(id)
    const template = (templates ?? []).find((t) => t.id === id)
    if (!template) return
    if (template.amount != null) setAmount(String(template.amount))
    if (template.description) setDescription(template.description)
  }

  const handleSave = async () => {
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
      await createExpense({ invoiceNumber, amount: amountNum, date, description })
      onSaved()
      onClose()
    } catch (err) {
      setError(getErrorMessage(err, 'No se pudo crear el gasto.'))
    } finally {
      setSaving(false)
    }
  }

  return (
    <Modal open={open} onClose={onClose} title="Agregar gasto">
      <div className="space-y-4">
        {templates && templates.length > 0 && (
          <div>
            <label htmlFor="new-exp-template" className={labelClass}>
              Gasto fijo (opcional)
            </label>
            <select
              id="new-exp-template"
              value={templateId}
              onChange={(e) => handleTemplateChange(e.target.value)}
              className={inputClass}
            >
              <option value="">Seleccionar plantilla…</option>
              {templates.map((t) => (
                <option key={t.id} value={t.id}>
                  {t.name}
                </option>
              ))}
            </select>
          </div>
        )}

        <div>
          <label htmlFor="new-exp-invoice" className={labelClass}>
            Número de factura
          </label>
          <input
            id="new-exp-invoice"
            type="text"
            value={invoiceNumber}
            onChange={(e) => setInvoiceNumber(e.target.value)}
            className={inputClass}
          />
        </div>

        <div>
          <label htmlFor="new-exp-amount" className={labelClass}>
            Monto
          </label>
          <input
            id="new-exp-amount"
            type="number"
            min="0"
            step="0.01"
            value={amount}
            onChange={(e) => setAmount(e.target.value)}
            className={inputClass}
          />
        </div>

        <div>
          <label htmlFor="new-exp-date" className={labelClass}>
            Fecha
          </label>
          <input
            id="new-exp-date"
            type="date"
            value={date}
            onChange={(e) => setDate(e.target.value)}
            className={inputClass}
          />
        </div>

        <div>
          <label htmlFor="new-exp-description" className={labelClass}>
            Descripción
          </label>
          <textarea
            id="new-exp-description"
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
            {saving ? 'Guardando…' : 'Agregar gasto'}
          </button>
        </div>
      </div>
    </Modal>
  )
}

import { useEffect, useState } from 'react'
import { Modal } from '../common/Modal'
import { updateChargeStatus } from '../../lib/api'
import { getErrorMessage } from '../../lib/errors'
import type { Charge } from '../../types'

const inputClass =
  'w-full rounded-lg border border-white/10 bg-surface px-3 py-2.5 text-sm text-white outline-none focus:border-gold-500'
const labelClass = 'mb-1.5 block text-sm font-medium text-ink-200'

// Se abre al hacer clic en el estatus de un cobro (ver Cobros.tsx). Si el
// cobro está pendiente, pide el invoice number y lo marca como pagado
// ("subido a OPS") en un solo paso. Si ya está pagado, permite corregir el
// invoice number sin cambiar el estatus.
type ChargeInvoiceModalProps = {
  charge: Charge | null
  onClose: () => void
  onSaved: () => void
}

export const ChargeInvoiceModal = ({ charge, onClose, onSaved }: ChargeInvoiceModalProps) => {
  const [invoiceNumber, setInvoiceNumber] = useState('')
  const [saving, setSaving] = useState(false)
  const [error, setError] = useState<string | null>(null)

  useEffect(() => {
    setInvoiceNumber(charge?.invoiceNumber ?? '')
    setError(null)
  }, [charge])

  const isPaid = charge?.status === 'paid'

  const handleSave = async () => {
    if (!charge) return
    if (!invoiceNumber.trim()) {
      setError('El invoice number es obligatorio.')
      return
    }
    setSaving(true)
    setError(null)
    try {
      await updateChargeStatus(charge.id, { status: 'paid', invoiceNumber: invoiceNumber.trim() })
      onSaved()
      onClose()
    } catch (err) {
      setError(getErrorMessage(err, 'No se pudo guardar el invoice number.'))
    } finally {
      setSaving(false)
    }
  }

  return (
    <Modal open={charge !== null} onClose={onClose} title={isPaid ? 'Invoice number' : 'Subir cobro a OPS'}>
      <div className="space-y-4">
        {!isPaid && (
          <p className="text-sm text-ink-400">
            Ingresa el invoice number para marcar este cobro como pagado/subido a OPS.
          </p>
        )}

        <div>
          <label htmlFor="chg-invoice-number" className={labelClass}>
            Invoice number
          </label>
          <input
            id="chg-invoice-number"
            type="text"
            value={invoiceNumber}
            onChange={(e) => setInvoiceNumber(e.target.value)}
            className={inputClass}
            autoFocus
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
            {saving ? 'Guardando…' : isPaid ? 'Guardar' : 'Subir a OPS'}
          </button>
        </div>
      </div>
    </Modal>
  )
}

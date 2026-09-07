import { useEffect, useState } from 'react'
import { Plus, X } from 'lucide-react'
import { Modal } from './Modal'
import { createScheduleCharge, updateScheduleStatus } from '../lib/api'
import type { Schedule, ScheduleStatus } from '../types'

const inputClass =
  'w-full rounded-lg border border-white/10 bg-surface px-3 py-2.5 text-sm text-white outline-none focus:border-gold-500'
const labelClass = 'mb-1.5 block text-sm font-medium text-ink-200'

const STATUS_OPTIONS: { value: ScheduleStatus; label: string; className: string }[] = [
  { value: 'pending', label: 'Pendiente', className: 'bg-amber-500/10 text-amber-400 ring-amber-500/20' },
  { value: 'in_progress', label: 'En proceso', className: 'bg-sky-500/10 text-sky-400 ring-sky-500/20' },
  { value: 'delivered', label: 'Entregado / Finalizado', className: 'bg-emerald-500/10 text-emerald-400 ring-emerald-500/20' },
  { value: 'cancelled', label: 'Cancelado', className: 'bg-red-500/10 text-red-400 ring-red-500/20' },
]

type ExtraLine = { key: number; description: string; amount: string }

const emptyExtra = (key: number): ExtraLine => ({ key, description: '', amount: '' })

type ScheduleActionModalProps = {
  schedule: Schedule | null
  onClose: () => void
  onSaved: () => void
}

export const ScheduleActionModal = ({ schedule, onClose, onSaved }: ScheduleActionModalProps) => {
  const [step, setStep] = useState<'status' | 'charge'>('status')
  const [totalCost, setTotalCost] = useState('')
  const [notes, setNotes] = useState('')
  const [extras, setExtras] = useState<ExtraLine[]>([])
  const [saving, setSaving] = useState(false)
  const [error, setError] = useState<string | null>(null)

  useEffect(() => {
    setStep('status')
    setTotalCost('')
    setNotes('')
    setExtras([])
    setError(null)
  }, [schedule])

  const handlePickStatus = async (status: ScheduleStatus) => {
    if (!schedule) return
    if (status === 'delivered') {
      setStep('charge')
      return
    }
    setSaving(true)
    setError(null)
    try {
      await updateScheduleStatus(schedule.id, status)
      onSaved()
      onClose()
    } catch (err) {
      setError(err instanceof Error ? err.message : 'No se pudo cambiar el estatus.')
    } finally {
      setSaving(false)
    }
  }

  const addExtra = () => setExtras((prev) => [...prev, emptyExtra((prev.at(-1)?.key ?? 0) + 1)])
  const updateExtra = (key: number, patch: Partial<ExtraLine>) =>
    setExtras((prev) => prev.map((e) => (e.key === key ? { ...e, ...patch } : e)))
  const removeExtra = (key: number) => setExtras((prev) => prev.filter((e) => e.key !== key))

  const handleSaveCharge = async () => {
    if (!schedule) return

    const totalCostValue = Number(totalCost.replace(/[^0-9.-]/g, ''))
    if (!totalCost || Number.isNaN(totalCostValue) || totalCostValue < 0) {
      setError('El costo de servicio total no es un número válido.')
      return
    }

    const filledExtras = extras.filter((e) => e.description.trim() || e.amount.trim())
    const parsedExtras: { description: string; amount: number }[] = []
    for (const extra of filledExtras) {
      const amountValue = Number(extra.amount.replace(/[^0-9.-]/g, ''))
      if (!extra.description.trim()) {
        setError('Cada extra necesita una descripción.')
        return
      }
      if (!extra.amount || Number.isNaN(amountValue) || amountValue < 0) {
        setError(`El costo del extra "${extra.description}" no es un número válido.`)
        return
      }
      parsedExtras.push({ description: extra.description.trim(), amount: amountValue })
    }

    setSaving(true)
    setError(null)
    try {
      await createScheduleCharge(schedule.id, { totalCost: totalCostValue, notes, extras: parsedExtras })
      onSaved()
      onClose()
    } catch (err) {
      setError(err instanceof Error ? err.message : 'No se pudo guardar el cobro.')
    } finally {
      setSaving(false)
    }
  }

  if (step === 'charge') {
    return (
      <Modal open={schedule !== null} onClose={onClose} title="Cobro del servicio">
        <div className="space-y-4">
          <div>
            <label htmlFor="chg-total" className={labelClass}>
              Costo de servicio total
            </label>
            <input
              id="chg-total"
              type="text"
              inputMode="decimal"
              value={totalCost}
              onChange={(e) => setTotalCost(e.target.value)}
              className={inputClass}
            />
          </div>

          <div>
            <label htmlFor="chg-notes" className={labelClass}>
              Notas
            </label>
            <textarea
              id="chg-notes"
              value={notes}
              onChange={(e) => setNotes(e.target.value)}
              rows={3}
              className={inputClass}
            />
          </div>

          <div>
            <div className="mb-2 flex items-center justify-between">
              <span className={labelClass}>Extras</span>
              <button
                type="button"
                onClick={addExtra}
                className="flex items-center gap-1 rounded-lg border border-white/10 px-2.5 py-1.5 text-xs font-medium text-ink-300 hover:bg-white/5"
              >
                <Plus className="h-3.5 w-3.5" />
                Agregar extra
              </button>
            </div>

            {extras.length === 0 ? (
              <p className="text-xs text-ink-500">Sin extras — usa "Agregar extra" si hay algo adicional que cobrar.</p>
            ) : (
              <div className="space-y-2.5">
                {extras.map((extra) => (
                  <div key={extra.key} className="flex items-center gap-2.5">
                    <input
                      type="text"
                      placeholder="Descripción"
                      value={extra.description}
                      onChange={(e) => updateExtra(extra.key, { description: e.target.value })}
                      className={`${inputClass} flex-1`}
                    />
                    <input
                      type="text"
                      inputMode="decimal"
                      placeholder="Costo"
                      value={extra.amount}
                      onChange={(e) => updateExtra(extra.key, { amount: e.target.value })}
                      className={`${inputClass} w-28`}
                    />
                    <button
                      type="button"
                      onClick={() => removeExtra(extra.key)}
                      className="rounded p-1.5 text-ink-500 hover:bg-white/10 hover:text-white"
                    >
                      <X className="h-4 w-4" />
                    </button>
                  </div>
                ))}
              </div>
            )}
          </div>

          {error && <p className="rounded-lg bg-red-500/10 px-3 py-2 text-sm text-red-400">{error}</p>}

          <div className="flex justify-end gap-3 pt-2">
            <button
              type="button"
              onClick={() => setStep('status')}
              className="rounded-lg border border-white/10 px-4 py-2 text-sm font-medium text-ink-300 hover:bg-white/5"
            >
              Atrás
            </button>
            <button
              type="button"
              disabled={saving}
              onClick={handleSaveCharge}
              className="rounded-lg bg-gold-500 px-4 py-2 text-sm font-semibold text-brand-900 transition hover:bg-gold-400 disabled:opacity-60"
            >
              {saving ? 'Guardando…' : 'Confirmar entrega y cobro'}
            </button>
          </div>
        </div>
      </Modal>
    )
  }

  return (
    <Modal open={schedule !== null} onClose={onClose} title="Cambiar estatus">
      <div className="space-y-2.5">
        {STATUS_OPTIONS.map((opt) => (
          <button
            key={opt.value}
            type="button"
            disabled={saving}
            onClick={() => handlePickStatus(opt.value)}
            className={`flex w-full items-center justify-between rounded-lg px-4 py-3 text-sm font-medium ring-1 ring-inset transition hover:brightness-110 disabled:opacity-60 ${opt.className}`}
          >
            {opt.label}
            {schedule?.status === opt.value && <span className="text-xs opacity-80">Actual</span>}
          </button>
        ))}

        {error && <p className="rounded-lg bg-red-500/10 px-3 py-2 text-sm text-red-400">{error}</p>}
      </div>
    </Modal>
  )
}

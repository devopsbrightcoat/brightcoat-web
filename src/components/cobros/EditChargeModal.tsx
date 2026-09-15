import { useEffect, useState } from 'react'
import { Plus, X } from 'lucide-react'
import { Modal } from '../common/Modal'
import { updateCharge } from '../../lib/api'
import { getErrorMessage } from '../../lib/errors'
import type { Charge, Property, ServiceType } from '../../types'

const inputClass =
  'w-full rounded-lg border border-white/10 bg-surface px-3 py-2.5 text-sm text-white outline-none focus:border-gold-500'
const labelClass = 'mb-1.5 block text-sm font-medium text-ink-200'

type ExtraLine = { key: number; description: string; amount: string }

const emptyExtra = (key: number): ExtraLine => ({ key, description: '', amount: '' })

// Edita los campos generales de un cobro — todo excepto estatus/invoice
// number, que se siguen editando aparte haciendo clic en el estatus (ver
// ChargeInvoiceModal). Si el cobro coincide con un horario ya entregado
// (mismo criterio que charges_unique_identity: propiedad + unidad +
// servicio + fecha) y se cambia alguno de esos 4 campos, updateCharge
// actualiza también ese horario para que sigan enlazados — ver el
// comentario en lib/api.ts. No hace falta ninguna lógica de cascada acá en
// el modal, solo mandar los campos nuevos.
type EditChargeModalProps = {
  charge: Charge | null
  properties: Property[]
  serviceTypes: ServiceType[]
  onClose: () => void
  onSaved: () => void
}

export const EditChargeModal = ({ charge, properties, serviceTypes, onClose, onSaved }: EditChargeModalProps) => {
  const [propertyId, setPropertyId] = useState('')
  const [unitLabel, setUnitLabel] = useState('')
  const [serviceTypeId, setServiceTypeId] = useState('')
  const [date, setDate] = useState('')
  const [amount, setAmount] = useState('')
  const [responsible, setResponsible] = useState('')
  const [payrollPeriod, setPayrollPeriod] = useState('')
  const [description, setDescription] = useState('')
  const [notes, setNotes] = useState('')
  const [extras, setExtras] = useState<ExtraLine[]>([])
  const [saving, setSaving] = useState(false)
  const [error, setError] = useState<string | null>(null)

  useEffect(() => {
    if (!charge) return
    setPropertyId(charge.propertyId)
    setUnitLabel(charge.unitLabel ?? '')
    setServiceTypeId(charge.serviceTypeId ?? '')
    setDate(charge.generatedDate ?? '')
    setAmount(String(charge.amount))
    setResponsible(charge.responsible ?? '')
    setPayrollPeriod(charge.payrollPeriod ?? '')
    setDescription(charge.description ?? '')
    setNotes(charge.notes ?? '')
    setExtras(
      charge.extras.map((e, i) => ({ key: i + 1, description: e.description, amount: String(e.amount) })),
    )
    setError(null)
  }, [charge])

  const addExtra = () => setExtras((prev) => [...prev, emptyExtra((prev.at(-1)?.key ?? 0) + 1)])
  const updateExtra = (key: number, patch: Partial<ExtraLine>) =>
    setExtras((prev) => prev.map((e) => (e.key === key ? { ...e, ...patch } : e)))
  const removeExtra = (key: number) => setExtras((prev) => prev.filter((e) => e.key !== key))

  const handleSave = async () => {
    if (!charge) return
    if (!propertyId) {
      setError('Selecciona una propiedad.')
      return
    }

    const amountValue = Number(amount.replace(/[^0-9.-]/g, ''))
    if (!amount || Number.isNaN(amountValue) || amountValue < 0) {
      setError('El monto no es un número válido.')
      return
    }

    const filledExtras = extras.filter((e) => e.description.trim() || e.amount.trim())
    const parsedExtras: { description: string; amount: number }[] = []
    for (const extra of filledExtras) {
      const extraAmount = Number(extra.amount.replace(/[^0-9.-]/g, ''))
      if (!extra.description.trim()) {
        setError('Cada extra necesita una descripción.')
        return
      }
      if (!extra.amount || Number.isNaN(extraAmount) || extraAmount < 0) {
        setError(`El costo del extra "${extra.description}" no es un número válido.`)
        return
      }
      parsedExtras.push({ description: extra.description.trim(), amount: extraAmount })
    }

    setSaving(true)
    setError(null)
    try {
      await updateCharge(charge.id, {
        propertyId,
        unitLabel: unitLabel.trim() || undefined,
        serviceTypeId: serviceTypeId || undefined,
        generatedDate: date || undefined,
        description: description.trim() || undefined,
        amount: amountValue,
        responsible: responsible.trim() || undefined,
        payrollPeriod: payrollPeriod.trim() || undefined,
        notes: notes.trim() || undefined,
        extras: parsedExtras,
      })
      onSaved()
      onClose()
    } catch (err) {
      setError(getErrorMessage(err, 'No se pudo guardar el cobro.'))
    } finally {
      setSaving(false)
    }
  }

  return (
    <Modal open={charge !== null} onClose={onClose} title="Editar cobro" widthClassName="max-w-xl">
      <div className="space-y-4">
        <div className="grid grid-cols-2 gap-3">
          <div>
            <label htmlFor="edit-chg-property" className={labelClass}>
              Propiedad
            </label>
            <select
              id="edit-chg-property"
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
            <label htmlFor="edit-chg-unit" className={labelClass}>
              Apartamento
            </label>
            <input
              id="edit-chg-unit"
              type="text"
              placeholder="Unidad (ej. L303)"
              value={unitLabel}
              onChange={(e) => setUnitLabel(e.target.value)}
              className={inputClass}
            />
          </div>
        </div>

        <div className="grid grid-cols-2 gap-3">
          <div>
            <label htmlFor="edit-chg-service" className={labelClass}>
              Servicio
            </label>
            <select
              id="edit-chg-service"
              value={serviceTypeId}
              onChange={(e) => setServiceTypeId(e.target.value)}
              className={inputClass}
            >
              <option value="">Sin servicio</option>
              {serviceTypes.map((t) => (
                <option key={t.id} value={t.id}>
                  {t.name}
                </option>
              ))}
            </select>
          </div>
          <div>
            <label htmlFor="edit-chg-date" className={labelClass}>
              Fecha
            </label>
            <input
              id="edit-chg-date"
              type="date"
              value={date}
              onChange={(e) => setDate(e.target.value)}
              className={inputClass}
            />
          </div>
        </div>

        <p className="text-xs text-ink-500">
          Si este cobro corresponde a un horario ya entregado, cambiar propiedad, apartamento, servicio o fecha
          también actualiza ese horario para que quede igual.
        </p>

        <div className="grid grid-cols-2 gap-3">
          <div>
            <label htmlFor="edit-chg-amount" className={labelClass}>
              Monto
            </label>
            <input
              id="edit-chg-amount"
              type="text"
              inputMode="decimal"
              value={amount}
              onChange={(e) => setAmount(e.target.value)}
              className={inputClass}
            />
          </div>
          <div>
            <label htmlFor="edit-chg-responsible" className={labelClass}>
              Responsable
            </label>
            <input
              id="edit-chg-responsible"
              type="text"
              value={responsible}
              onChange={(e) => setResponsible(e.target.value)}
              className={inputClass}
            />
          </div>
        </div>

        <div>
          <label htmlFor="edit-chg-period" className={labelClass}>
            Periodo de planilla
          </label>
          <input
            id="edit-chg-period"
            type="text"
            value={payrollPeriod}
            onChange={(e) => setPayrollPeriod(e.target.value)}
            className={inputClass}
          />
        </div>

        <div>
          <label htmlFor="edit-chg-description" className={labelClass}>
            Descripción
          </label>
          <input
            id="edit-chg-description"
            type="text"
            value={description}
            onChange={(e) => setDescription(e.target.value)}
            className={inputClass}
          />
        </div>

        <div>
          <label htmlFor="edit-chg-notes" className={labelClass}>
            Notas
          </label>
          <textarea
            id="edit-chg-notes"
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
            <p className="text-xs text-ink-500">Sin extras.</p>
          ) : (
            <div className="space-y-2.5">
              {extras.map((extra) => (
                <div key={extra.key} className="grid grid-cols-[1fr_6rem_auto] items-center gap-2.5">
                  <input
                    type="text"
                    placeholder="Descripción"
                    value={extra.description}
                    onChange={(e) => updateExtra(extra.key, { description: e.target.value })}
                    className={`${inputClass} min-w-0`}
                  />
                  <input
                    type="text"
                    inputMode="decimal"
                    placeholder="Costo"
                    value={extra.amount}
                    onChange={(e) => updateExtra(extra.key, { amount: e.target.value })}
                    className={`${inputClass} min-w-0`}
                  />
                  <button
                    type="button"
                    onClick={() => removeExtra(extra.key)}
                    className="col-start-3 rounded p-1.5 text-ink-500 hover:bg-white/10 hover:text-white"
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

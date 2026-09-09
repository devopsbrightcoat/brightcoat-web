import { useEffect, useState } from 'react'
import { Plus, X } from 'lucide-react'
import { Modal } from './Modal'
import { createPayrollEntry } from '../lib/api'
import type { Employee, Property } from '../types'
import { getErrorMessage } from '../lib/errors'

const inputClass =
  'w-full rounded-lg border border-white/10 bg-surface px-3 py-2.5 text-sm text-white outline-none focus:border-gold-500'
const labelClass = 'mb-1.5 block text-sm font-medium text-ink-200'

type ItemLine = { key: number; description: string; amount: string }

const emptyItem = (key: number): ItemLine => ({ key, description: '', amount: '' })

const currency = (value: number) =>
  value.toLocaleString('en-US', { style: 'currency', currency: 'USD', maximumFractionDigits: 0 })

// Blanca recibe de un empleado "hoy trabajé en tal unidad, tal propiedad,
// tal servicio" — con el pago completo del servicio y un desglose de los
// sub-servicios que lo componen (cada uno con su propia descripción y
// costo). El desglose se usa para calcular Ventas/Ganancia en Planillas.tsx
// (ver lib/api.ts createPayrollEntry).
type AddPayrollEntryModalProps = {
  open: boolean
  properties: Property[]
  employees: Employee[]
  onClose: () => void
  onSaved: () => void
}

export const AddPayrollEntryModal = ({ open, properties, employees, onClose, onSaved }: AddPayrollEntryModalProps) => {
  const [propertyId, setPropertyId] = useState('')
  const [unitLabel, setUnitLabel] = useState('')
  const [employeeId, setEmployeeId] = useState('')
  const [serviceName, setServiceName] = useState('')
  const [amount, setAmount] = useState('')
  const [date, setDate] = useState('')
  const [items, setItems] = useState<ItemLine[]>([emptyItem(0)])
  const [saving, setSaving] = useState(false)
  const [error, setError] = useState<string | null>(null)

  useEffect(() => {
    if (!open) return
    setPropertyId('')
    setUnitLabel('')
    setEmployeeId('')
    setServiceName('')
    setAmount('')
    setDate('')
    setItems([emptyItem(0)])
    setError(null)
  }, [open])

  const updateItem = (key: number, patch: Partial<ItemLine>) =>
    setItems((prev) => prev.map((item) => (item.key === key ? { ...item, ...patch } : item)))
  const addItem = () => setItems((prev) => [...prev, emptyItem((prev.at(-1)?.key ?? 0) + 1)])
  const removeItem = (key: number) => setItems((prev) => (prev.length > 1 ? prev.filter((item) => item.key !== key) : prev))

  const filledItems = items.filter((item) => item.description.trim() || item.amount.trim())
  const salesTotal = filledItems.reduce((sum, item) => sum + (Number(item.amount) || 0), 0)

  const handleSave = async () => {
    if (!propertyId) {
      setError('Selecciona una propiedad.')
      return
    }
    if (!unitLabel.trim()) {
      setError('La unidad es obligatoria.')
      return
    }
    if (!employeeId) {
      setError('Selecciona un empleado.')
      return
    }
    if (!serviceName.trim()) {
      setError('El nombre del servicio es obligatorio.')
      return
    }
    const amountValue = Number(amount)
    if (!amount || Number.isNaN(amountValue) || amountValue < 0) {
      setError('El pago no es un número válido.')
      return
    }
    if (!date) {
      setError('La fecha es obligatoria.')
      return
    }

    const parsedItems: { description: string; amount: number }[] = []
    for (const item of filledItems) {
      const itemAmount = Number(item.amount)
      if (!item.description.trim()) {
        setError('Cada línea del desglose necesita una descripción.')
        return
      }
      if (!item.amount || Number.isNaN(itemAmount) || itemAmount < 0) {
        setError(`El costo de "${item.description}" no es un número válido.`)
        return
      }
      parsedItems.push({ description: item.description.trim(), amount: itemAmount })
    }

    setSaving(true)
    setError(null)
    try {
      await createPayrollEntry({
        propertyId,
        unitLabel: unitLabel.trim(),
        employeeId,
        serviceName: serviceName.trim(),
        amount: amountValue,
        date,
        items: parsedItems,
      })
      onSaved()
      onClose()
    } catch (err) {
      setError(getErrorMessage(err, 'No se pudo guardar la planilla.'))
    } finally {
      setSaving(false)
    }
  }

  return (
    <Modal open={open} onClose={onClose} title="Agregar planilla" widthClassName="max-w-2xl">
      <div className="space-y-4">
        <div className="grid grid-cols-2 gap-3">
          <div>
            <label htmlFor="pe-property" className={labelClass}>
              Propiedad
            </label>
            <select
              id="pe-property"
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
            <label htmlFor="pe-unit" className={labelClass}>
              Unidad
            </label>
            <input
              id="pe-unit"
              type="text"
              placeholder="ej. L303"
              value={unitLabel}
              onChange={(e) => setUnitLabel(e.target.value)}
              className={inputClass}
            />
          </div>
        </div>

        <div className="grid grid-cols-2 gap-3">
          <div>
            <label htmlFor="pe-employee" className={labelClass}>
              Empleado
            </label>
            <select
              id="pe-employee"
              value={employeeId}
              onChange={(e) => setEmployeeId(e.target.value)}
              className={inputClass}
            >
              <option value="">Selecciona…</option>
              {employees.map((e) => (
                <option key={e.id} value={e.id}>
                  {e.name}
                </option>
              ))}
            </select>
          </div>
          <div>
            <label htmlFor="pe-date" className={labelClass}>
              Fecha
            </label>
            <input id="pe-date" type="date" value={date} onChange={(e) => setDate(e.target.value)} className={inputClass} />
          </div>
        </div>

        <div>
          <label htmlFor="pe-service" className={labelClass}>
            Servicio
          </label>
          <input
            id="pe-service"
            type="text"
            placeholder="ej. Vacante reparación tape and float"
            value={serviceName}
            onChange={(e) => setServiceName(e.target.value)}
            className={inputClass}
          />
        </div>

        <div>
          <label htmlFor="pe-amount" className={labelClass}>
            Pago al empleado
          </label>
          <input
            id="pe-amount"
            type="number"
            min="0"
            step="0.01"
            value={amount}
            onChange={(e) => setAmount(e.target.value)}
            className={inputClass}
          />
        </div>

        <div>
          <div className="mb-2 flex items-center justify-between">
            <span className={labelClass}>Desglose del servicio</span>
            <button
              type="button"
              onClick={addItem}
              className="flex items-center gap-1 rounded-lg border border-white/10 px-2.5 py-1.5 text-xs font-medium text-ink-300 hover:bg-white/5"
            >
              <Plus className="h-3.5 w-3.5" />
              Agregar línea
            </button>
          </div>

          <div className="space-y-2.5">
            {items.map((item) => (
              <div key={item.key} className="grid grid-cols-[1fr_7rem_auto] items-center gap-2.5">
                <input
                  type="text"
                  placeholder="Descripción (ej. 5X1 en cocina)"
                  value={item.description}
                  onChange={(e) => updateItem(item.key, { description: e.target.value })}
                  className={`${inputClass} min-w-0`}
                />
                <input
                  type="number"
                  min="0"
                  step="0.01"
                  placeholder="Costo"
                  value={item.amount}
                  onChange={(e) => updateItem(item.key, { amount: e.target.value })}
                  className={`${inputClass} min-w-0`}
                />
                <button
                  type="button"
                  onClick={() => removeItem(item.key)}
                  disabled={items.length === 1}
                  className="col-start-3 rounded p-1.5 text-ink-500 hover:bg-white/10 hover:text-white disabled:opacity-30 disabled:hover:bg-transparent"
                >
                  <X className="h-4 w-4" />
                </button>
              </div>
            ))}
          </div>

          <p className="mt-2 text-xs text-ink-500">
            Venta del desglose: <span className="tabular-nums text-ink-300">{currency(salesTotal)}</span>
          </p>
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
            {saving ? 'Guardando…' : 'Guardar planilla'}
          </button>
        </div>
      </div>
    </Modal>
  )
}

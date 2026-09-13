import { useEffect, useState } from 'react'
import { ChevronDown, ChevronUp, Plus, X } from 'lucide-react'
import { Modal } from '../common/Modal'
import { createPayrollEntry, fetchSchedulesForEmployee, fetchServiceTypes } from '../../lib/api'
import { useSupabaseQuery } from '../../lib/useSupabaseQuery'
import { formatFullDate } from '../../lib/scheduleDates'
import type { Employee, Property, Schedule } from '../../types'
import { getErrorMessage } from '../../lib/errors'

const inputClass =
  'w-full rounded-lg border border-white/10 bg-surface px-3 py-2.5 text-sm text-white outline-none focus:border-gold-500'
const labelClass = 'mb-1.5 block text-sm font-medium text-ink-200'
const sectionLabelClass = 'text-xs font-medium uppercase tracking-wide text-ink-500'

type ItemLine = { key: number; description: string; amount: string }

const emptyItem = (key: number): ItemLine => ({ key, description: '', amount: '' })

const currency = (value: number) =>
  value.toLocaleString('en-US', { style: 'currency', currency: 'USD', maximumFractionDigits: 0 })

const SCHEDULE_STATUS_LABELS: Record<Schedule['status'], string> = {
  pending: 'Pendiente',
  in_progress: 'En proceso',
  delivered: 'Entregado',
  cancelled: 'Cancelado',
  rescheduled: 'Reagendado',
}

// Blanca recibe de un empleado "hoy trabajé en tal unidad, tal propiedad,
// tal servicio" — con el pago completo del servicio y un desglose de los
// sub-servicios que lo componen (cada uno con su propia descripción y
// costo). El desglose se usa para calcular Ventas/Ganancia en Planillas.tsx
// (ver lib/api.ts createPayrollEntry).
//
// Formulario dividido en tres secciones, a pedido de Javier: 1) Empleado
// (con el buscador de horarios relacionados, colapsable, justo debajo) 2)
// Propiedad — propiedad/unidad/fecha/servicio y 3) Pago — pago/notas/desglose.
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
  const [notes, setNotes] = useState('')
  const [items, setItems] = useState<ItemLine[]>([emptyItem(0)])
  const [saving, setSaving] = useState(false)
  const [error, setError] = useState<string | null>(null)
  const [scheduleOpen, setScheduleOpen] = useState(true)
  const [scheduleFrom, setScheduleFrom] = useState('')
  const [scheduleTo, setScheduleTo] = useState('')
  const [selectedScheduleId, setSelectedScheduleId] = useState('')

  // Sin rango de fechas no se pide nada al servidor — el select de
  // horarios se queda vacío hasta que Desde y Hasta estén completos.
  const { data: schedules, loading: schedulesLoading } = useSupabaseQuery(
    () =>
      employeeId && scheduleFrom && scheduleTo
        ? fetchSchedulesForEmployee(employeeId, scheduleFrom, scheduleTo)
        : Promise.resolve([]),
    [employeeId, scheduleFrom, scheduleTo],
  )
  const { data: serviceTypes } = useSupabaseQuery(fetchServiceTypes, [open])

  useEffect(() => {
    if (!open) return
    setPropertyId('')
    setUnitLabel('')
    setEmployeeId('')
    setServiceName('')
    setAmount('')
    setDate('')
    setNotes('')
    setItems([emptyItem(0)])
    setError(null)
    setScheduleOpen(true)
    setScheduleFrom('')
    setScheduleTo('')
    setSelectedScheduleId('')
  }, [open])

  const updateItem = (key: number, patch: Partial<ItemLine>) =>
    setItems((prev) => prev.map((item) => (item.key === key ? { ...item, ...patch } : item)))
  const addItem = () => setItems((prev) => [...prev, emptyItem((prev.at(-1)?.key ?? 0) + 1)])
  const removeItem = (key: number) => setItems((prev) => (prev.length > 1 ? prev.filter((item) => item.key !== key) : prev))

  // Atajo de Javier: elegir un horario ya trabajado por este empleado
  // precarga Propiedad/Unidad/Fecha/Servicio — el resto de la planilla
  // (Pago, Notas, Desglose) se sigue llenando a mano. fetchSchedulesForEmployee
  // ya viene filtrado por empleado + rango desde el servidor, así que acá no
  // hace falta volver a filtrar.
  const employeeSchedules = schedules ?? []

  const handleEmployeeChange = (id: string) => {
    setEmployeeId(id)
    setSelectedScheduleId('')
    setScheduleOpen(true)
  }

  const handleScheduleSelect = (id: string) => {
    setSelectedScheduleId(id)
    const schedule = employeeSchedules.find((s) => s.id === id)
    if (!schedule) return
    setPropertyId(schedule.propertyId)
    setUnitLabel(schedule.unitLabel ?? '')
    setDate(schedule.scheduledDate)
    const serviceType = (serviceTypes ?? []).find((st) => st.id === schedule.serviceTypeId)
    if (serviceType) setServiceName(serviceType.name)
  }

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
    let amountValue: number | null = null
    if (amount.trim()) {
      amountValue = Number(amount)
      if (Number.isNaN(amountValue) || amountValue < 0) {
        setError('El pago no es un número válido.')
        return
      }
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
        notes: notes.trim(),
        scheduleId: selectedScheduleId || undefined,
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
      <div className="space-y-5">
        <div>
          <label htmlFor="pe-employee" className={labelClass}>
            Empleado
          </label>
          <select
            id="pe-employee"
            value={employeeId}
            onChange={(e) => handleEmployeeChange(e.target.value)}
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

        {employeeId && (
          <div className="space-y-3 rounded-lg border border-white/10 bg-surface p-3">
            <button
              type="button"
              onClick={() => setScheduleOpen((prev) => !prev)}
              className="flex w-full items-center justify-between text-left"
            >
              <span className="text-sm font-medium text-ink-200">Horario relacionado (opcional)</span>
              {scheduleOpen ? (
                <ChevronUp className="h-4 w-4 shrink-0 text-ink-500" />
              ) : (
                <ChevronDown className="h-4 w-4 shrink-0 text-ink-500" />
              )}
            </button>

            {scheduleOpen && (
              <div className="space-y-3">
                <div className="grid grid-cols-2 gap-3">
                  <div>
                    <label htmlFor="pe-sched-from" className="mb-1 block text-xs text-ink-500">
                      Desde
                    </label>
                    <input
                      id="pe-sched-from"
                      type="date"
                      value={scheduleFrom}
                      onChange={(e) => setScheduleFrom(e.target.value)}
                      className={inputClass}
                    />
                  </div>
                  <div>
                    <label htmlFor="pe-sched-to" className="mb-1 block text-xs text-ink-500">
                      Hasta
                    </label>
                    <input
                      id="pe-sched-to"
                      type="date"
                      value={scheduleTo}
                      onChange={(e) => setScheduleTo(e.target.value)}
                      className={inputClass}
                    />
                  </div>
                </div>
                {!scheduleFrom || !scheduleTo ? (
                  <p className="text-xs text-ink-500">
                    Elige un rango de fechas (Desde y Hasta) para buscar los horarios de este empleado.
                  </p>
                ) : schedulesLoading ? (
                  <p className="text-xs text-ink-500">Buscando horarios…</p>
                ) : (
                  <>
                    <select
                      id="pe-schedule"
                      value={selectedScheduleId}
                      onChange={(e) => handleScheduleSelect(e.target.value)}
                      className={inputClass}
                    >
                      <option value="">
                        {employeeSchedules.length === 0 ? 'Sin horarios disponibles en ese rango' : 'Seleccionar horario…'}
                      </option>
                      {employeeSchedules.map((s) => {
                        const scheduleProperty = properties.find((p) => p.id === s.propertyId)?.name ?? '—'
                        const scheduleService = (serviceTypes ?? []).find((st) => st.id === s.serviceTypeId)?.name ?? '—'
                        return (
                          <option key={s.id} value={s.id}>
                            {formatFullDate(s.scheduledDate)} · {scheduleProperty}
                            {s.unitLabel ? ` · ${s.unitLabel}` : ''} · {scheduleService} ({SCHEDULE_STATUS_LABELS[s.status]})
                          </option>
                        )
                      })}
                    </select>
                    <p className="text-xs text-ink-500">
                      Al elegir un horario se llenan Propiedad, Unidad, Fecha y Servicio — puedes editarlos después.
                    </p>
                  </>
                )}
              </div>
            )}
          </div>
        )}

        <div className="space-y-3 border-t border-white/10 pt-4">
          <p className={sectionLabelClass}>Propiedad</p>

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
              <label htmlFor="pe-date" className={labelClass}>
                Fecha
              </label>
              <input
                id="pe-date"
                type="date"
                value={date}
                onChange={(e) => setDate(e.target.value)}
                className={inputClass}
              />
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
          </div>
        </div>

        <div className="space-y-3 border-t border-white/10 pt-4">
          <p className={sectionLabelClass}>Pago</p>

          <div>
            <label htmlFor="pe-amount" className={labelClass}>
              Pago al empleado <span className="font-normal normal-case text-ink-500">(opcional — se puede completar después)</span>
            </label>
            <input
              id="pe-amount"
              type="number"
              min="0"
              step="0.01"
              placeholder="Se define después si aún no se sabe"
              value={amount}
              onChange={(e) => setAmount(e.target.value)}
              className={inputClass}
            />
          </div>

          <div>
            <label htmlFor="pe-notes" className={labelClass}>
              Notas <span className="font-normal normal-case text-ink-500">(opcional)</span>
            </label>
            <textarea
              id="pe-notes"
              value={notes}
              onChange={(e) => setNotes(e.target.value)}
              rows={3}
              placeholder="Opcional"
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

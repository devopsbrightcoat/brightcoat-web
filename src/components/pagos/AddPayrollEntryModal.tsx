import { useEffect, useState } from 'react'
import { ChevronDown, ChevronUp, Plus, X } from 'lucide-react'
import { Modal } from '../common/Modal'
import { createPayrollEntry, fetchChargeForSchedule, fetchSchedulesForEmployee, fetchServiceTypes } from '../../lib/api'
import { useSupabaseQuery } from '../../lib/useSupabaseQuery'
import { formatFullDate } from '../../lib/scheduleDates'
import { SALES_TAX_RATE } from '../../lib/tax'
import type { Employee, Property, Schedule } from '../../types'
import { getErrorMessage } from '../../lib/errors'

const inputClass =
  'w-full rounded-lg border border-white/10 bg-surface px-3 py-2.5 text-sm text-white outline-none focus:border-gold-500'
const labelClass = 'mb-1.5 block text-sm font-medium text-ink-200'
const sectionLabelClass = 'text-xs font-medium uppercase tracking-wide text-ink-500'

type ItemLine = { key: number; description: string; amount: string }

const emptyItem = (key: number): ItemLine => ({ key, description: '', amount: '' })

const currency = (value: number) =>
  value.toLocaleString('en-US', { style: 'currency', currency: 'USD', maximumFractionDigits: 2 })

const SCHEDULE_STATUS_LABELS: Record<Schedule['status'], string> = {
  pending: 'Pendiente',
  in_progress: 'En proceso',
  delivered: 'Entregado',
  cancelled: 'Cancelado',
  rescheduled: 'Reagendado',
}

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
  const [taxable, setTaxable] = useState(false)
  const [date, setDate] = useState('')
  const [notes, setNotes] = useState('')
  const [items, setItems] = useState<ItemLine[]>([emptyItem(0)])
  const [savingMode, setSavingMode] = useState<'add' | 'finalize' | null>(null)
  const [addedCount, setAddedCount] = useState(0)
  const [error, setError] = useState<string | null>(null)
  const [scheduleOpen, setScheduleOpen] = useState(true)
  const [scheduleFrom, setScheduleFrom] = useState('')
  const [scheduleTo, setScheduleTo] = useState('')
  const [selectedScheduleId, setSelectedScheduleId] = useState('')
  const [chargeNotFound, setChargeNotFound] = useState(false)
  const [scheduleRefreshKey, setScheduleRefreshKey] = useState(0)

  const { data: schedules, loading: schedulesLoading } = useSupabaseQuery(
    () =>
      employeeId && scheduleFrom && scheduleTo
        ? fetchSchedulesForEmployee(employeeId, scheduleFrom, scheduleTo)
        : Promise.resolve([]),
    [employeeId, scheduleFrom, scheduleTo, scheduleRefreshKey],
  )
  const { data: serviceTypes } = useSupabaseQuery(fetchServiceTypes, [open])

  useEffect(() => {
    if (!open) return
    setPropertyId('')
    setUnitLabel('')
    setEmployeeId('')
    setServiceName('')
    setAmount('')
    setTaxable(false)
    setDate('')
    setNotes('')
    setItems([emptyItem(0)])
    setError(null)
    setScheduleOpen(true)
    setScheduleFrom('')
    setScheduleTo('')
    setSelectedScheduleId('')
    setChargeNotFound(false)
    setSavingMode(null)
    setAddedCount(0)
    setScheduleRefreshKey(0)
  }, [open])

  const updateItem = (key: number, patch: Partial<ItemLine>) =>
    setItems((prev) => prev.map((item) => (item.key === key ? { ...item, ...patch } : item)))
  const addItem = () => setItems((prev) => [...prev, emptyItem((prev.at(-1)?.key ?? 0) + 1)])
  const removeItem = (key: number) => setItems((prev) => (prev.length > 1 ? prev.filter((item) => item.key !== key) : prev))

  const employeeSchedules = schedules ?? []

  const handleEmployeeChange = (id: string) => {
    setEmployeeId(id)
    setSelectedScheduleId('')
    setScheduleOpen(true)
    setChargeNotFound(false)
  }

  const handleScheduleSelect = async (id: string) => {
    setSelectedScheduleId(id)
    setChargeNotFound(false)
    const schedule = employeeSchedules.find((s) => s.id === id)
    if (!schedule) return
    setPropertyId(schedule.propertyId)
    setUnitLabel(schedule.unitLabel ?? '')
    setDate(schedule.scheduledDate)
    const serviceType = (serviceTypes ?? []).find((st) => st.id === schedule.serviceTypeId)
    if (serviceType) setServiceName(serviceType.name)

    try {
      const charge = await fetchChargeForSchedule(
        schedule.propertyId,
        schedule.unitLabel,
        schedule.serviceTypeId,
        schedule.scheduledDate,
      )
      if (charge) {
        setAmount(String(charge.amount))
      } else {
        setChargeNotFound(true)
      }
    } catch {
      setChargeNotFound(true)
    }
  }

  const filledItems = items.filter((item) => item.description.trim() || item.amount.trim())
  const salesTotal = filledItems.reduce((sum, item) => sum + (Number(item.amount) || 0), 0)

  const buildPayload = ():
    | { error: string }
    | {
        payload: {
          propertyId: string
          unitLabel: string
          employeeId: string
          serviceName: string
          amount: number | null
          date: string
          notes: string
          scheduleId?: string
          taxable: boolean
          items: { description: string; amount: number }[]
        }
      } => {
    if (!propertyId) return { error: 'Selecciona una propiedad.' }
    if (!unitLabel.trim()) return { error: 'La unidad es obligatoria.' }
    if (!employeeId) return { error: 'Selecciona un empleado.' }
    if (!serviceName.trim()) return { error: 'El nombre del servicio es obligatorio.' }
    let amountValue: number | null = null
    if (amount.trim()) {
      amountValue = Number(amount)
      if (Number.isNaN(amountValue) || amountValue < 0) return { error: 'El cobro no es un número válido.' }
    }
    if (!date) return { error: 'La fecha es obligatoria.' }

    const parsedItems: { description: string; amount: number }[] = []
    for (const item of filledItems) {
      const itemAmount = Number(item.amount)
      if (!item.description.trim()) return { error: 'Cada línea del desglose necesita una descripción.' }
      if (!item.amount || Number.isNaN(itemAmount) || itemAmount < 0) {
        return { error: `El costo de "${item.description}" no es un número válido.` }
      }
      parsedItems.push({ description: item.description.trim(), amount: itemAmount })
    }

    return {
      payload: {
        propertyId,
        unitLabel: unitLabel.trim(),
        employeeId,
        serviceName: serviceName.trim(),
        amount: amountValue,
        date,
        notes: notes.trim(),
        scheduleId: selectedScheduleId || undefined,
        taxable,
        items: parsedItems,
      },
    }
  }

  const resetForNextEntry = () => {
    setSelectedScheduleId('')
    setChargeNotFound(false)
    setPropertyId('')
    setUnitLabel('')
    setDate('')
    setServiceName('')
    setAmount('')
    setTaxable(false)
    setNotes('')
    setItems([emptyItem(0)])
  }

  const handleAddAndContinue = async () => {
    const result = buildPayload()
    if ('error' in result) {
      setError(result.error)
      return
    }
    setSavingMode('add')
    setError(null)
    try {
      await createPayrollEntry(result.payload)
      onSaved()
      resetForNextEntry()
      setAddedCount((c) => c + 1)
      setScheduleRefreshKey((k) => k + 1)
    } catch (err) {
      setError(getErrorMessage(err, 'No se pudo guardar la planilla.'))
    } finally {
      setSavingMode(null)
    }
  }

  const handleFinalize = async () => {
    const result = buildPayload()
    if ('error' in result) {
      setError(result.error)
      return
    }
    setSavingMode('finalize')
    setError(null)
    try {
      await createPayrollEntry(result.payload)
      onSaved()
      onClose()
    } catch (err) {
      setError(getErrorMessage(err, 'No se pudo guardar la planilla.'))
    } finally {
      setSavingMode(null)
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
                      Al elegir un horario se llenan Propiedad, Unidad, Fecha, Servicio y Cobro — puedes editarlos
                      después.
                    </p>
                    {chargeNotFound && selectedScheduleId && (
                      <p className="text-xs text-amber-400">
                        No se encontró un cobro registrado en Cobros para este horario — ingresa el Cobro a mano.
                      </p>
                    )}
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
          <p className={sectionLabelClass}>Cobro</p>

          <div>
            <label htmlFor="pe-amount" className={labelClass}>
              Cobro total del trabajo <span className="font-normal normal-case text-ink-500">(opcional — se puede completar después)</span>
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
            <label htmlFor="pe-taxable" className="mt-2 flex cursor-pointer items-center gap-2 text-sm text-ink-300">
              <input
                id="pe-taxable"
                type="checkbox"
                checked={taxable}
                onChange={(e) => setTaxable(e.target.checked)}
                className="h-4 w-4 rounded border-white/20 bg-surface-alt accent-gold-500"
              />
              Este servicio lleva impuesto de ventas ({(SALES_TAX_RATE * 100).toFixed(2)}%)
            </label>
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
                    list="pe-item-service-types"
                    placeholder="Descripción (ej. 5X1 en cocina) — o elige un servicio"
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
              Pago del desglose: <span className="tabular-nums text-ink-300">{currency(salesTotal)}</span>
            </p>

            <datalist id="pe-item-service-types">
              {(serviceTypes ?? []).map((t) => (
                <option key={t.id} value={t.name} />
              ))}
            </datalist>
          </div>
        </div>

        {error && <p className="rounded-lg bg-red-500/10 px-3 py-2 text-sm text-red-400">{error}</p>}

        <div className="flex items-center justify-between gap-3 pt-2">
          <p className="text-xs text-ink-500">
            {addedCount > 0
              ? `${addedCount} planilla${addedCount === 1 ? '' : 's'} agregada${addedCount === 1 ? '' : 's'} en esta sesión — elige el siguiente horario para continuar.`
              : 'Empleado y el rango de fechas del horario se mantienen entre planillas — usa "Agregar planilla" para ir capturando varios horarios seguidos.'}
          </p>
          <div className="flex shrink-0 justify-end gap-3">
            <button
              type="button"
              onClick={onClose}
              className="rounded-lg border border-white/10 px-4 py-2 text-sm font-medium text-ink-300 hover:bg-white/5"
            >
              Cancelar
            </button>
            <button
              type="button"
              disabled={savingMode !== null}
              onClick={handleAddAndContinue}
              className="rounded-lg border border-gold-500/40 px-4 py-2 text-sm font-semibold text-gold-400 transition hover:bg-gold-500/10 disabled:opacity-60"
            >
              {savingMode === 'add' ? 'Agregando…' : 'Agregar planilla'}
            </button>
            <button
              type="button"
              disabled={savingMode !== null}
              onClick={handleFinalize}
              className="rounded-lg bg-gold-500 px-4 py-2 text-sm font-semibold text-brand-900 transition hover:bg-gold-400 disabled:opacity-60"
            >
              {savingMode === 'finalize' ? 'Guardando…' : 'Finalizar planilla'}
            </button>
          </div>
        </div>
      </div>
    </Modal>
  )
}

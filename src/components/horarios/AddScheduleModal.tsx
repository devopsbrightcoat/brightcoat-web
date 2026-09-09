import { useEffect, useState } from 'react'
import { Plus, X } from 'lucide-react'
import { Modal } from '../common/Modal'
import { createSchedules } from '../../lib/api'
import type { Employee, Property, ServiceType } from '../../types'
import { getErrorMessage } from '../../lib/errors'

const inputClass =
  'w-full rounded-lg border border-white/10 bg-surface px-3 py-2.5 text-sm text-white outline-none focus:border-gold-500'
const labelClass = 'mb-1.5 block text-sm font-medium text-ink-200'

type Line = {
  key: number
  unitLabel: string
  serviceTypeId: string
  scheduledTime: string
}

const emptyLine = (key: number): Line => ({ key, unitLabel: '', serviceTypeId: '', scheduledTime: '' })

type AddScheduleModalProps = {
  open: boolean
  defaultDate: string
  properties: Property[]
  serviceTypes: ServiceType[]
  employees: Employee[]
  onClose: () => void
  onSaved: () => void
}

export const AddScheduleModal = ({
  open,
  defaultDate,
  properties,
  serviceTypes,
  employees,
  onClose,
  onSaved,
}: AddScheduleModalProps) => {
  const [propertyId, setPropertyId] = useState('')
  const [employeeId, setEmployeeId] = useState('')
  const [date, setDate] = useState(defaultDate)
  const [lines, setLines] = useState<Line[]>([emptyLine(0)])
  const [saving, setSaving] = useState(false)
  const [error, setError] = useState<string | null>(null)

  useEffect(() => {
    if (!open) return
    setPropertyId('')
    setEmployeeId('')
    setDate(defaultDate)
    setLines([emptyLine(0)])
    setError(null)
  }, [open, defaultDate])

  const updateLine = (key: number, patch: Partial<Line>) => {
    setLines((prev) => prev.map((line) => (line.key === key ? { ...line, ...patch } : line)))
  }

  const addLine = () => {
    setLines((prev) => [...prev, emptyLine((prev.at(-1)?.key ?? 0) + 1)])
  }

  const removeLine = (key: number) => {
    setLines((prev) => (prev.length > 1 ? prev.filter((line) => line.key !== key) : prev))
  }

  const handleSave = async () => {
    if (!propertyId) {
      setError('Selecciona una propiedad.')
      return
    }
    if (!employeeId) {
      setError('Selecciona un empleado.')
      return
    }
    if (!date) {
      setError('Selecciona una fecha.')
      return
    }
    for (const line of lines) {
      if (!line.serviceTypeId) {
        setError('Cada unidad necesita un tipo de servicio.')
        return
      }
      if (!line.scheduledTime) {
        setError('Cada unidad necesita una hora.')
        return
      }
    }

    setSaving(true)
    setError(null)
    try {
      await createSchedules(
        lines.map((line) => ({
          propertyId,
          employeeId,
          scheduledDate: date,
          unitLabel: line.unitLabel,
          serviceTypeId: line.serviceTypeId,
          scheduledTime: line.scheduledTime,
        })),
      )
      onSaved()
      onClose()
    } catch (err) {
      setError(getErrorMessage(err, 'No se pudo guardar el horario.'))
    } finally {
      setSaving(false)
    }
  }

  return (
    <Modal open={open} onClose={onClose} title="Agregar horario">
      <div className="space-y-4">
        <div className="grid grid-cols-2 gap-3">
          <div>
            <label htmlFor="sch-property" className={labelClass}>
              Propiedad
            </label>
            <select
              id="sch-property"
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
            <label htmlFor="sch-employee" className={labelClass}>
              Empleado
            </label>
            <select
              id="sch-employee"
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
        </div>

        <div>
          <label htmlFor="sch-date" className={labelClass}>
            Fecha
          </label>
          <input
            id="sch-date"
            type="date"
            value={date}
            onChange={(e) => setDate(e.target.value)}
            className={inputClass}
          />
        </div>

        <div>
          <div className="mb-2 flex items-center justify-between">
            <span className={labelClass}>Unidades y servicios</span>
            <button
              type="button"
              onClick={addLine}
              className="flex items-center gap-1 rounded-lg border border-white/10 px-2.5 py-1.5 text-xs font-medium text-ink-300 hover:bg-white/5"
            >
              <Plus className="h-3.5 w-3.5" />
              Agregar unidad
            </button>
          </div>

          <div className="space-y-3">
            {lines.map((line, i) => (
              <div key={line.key} className="rounded-lg border border-white/10 bg-surface p-3">
                <div className="mb-2 flex items-center justify-between">
                  <span className="text-xs font-medium text-ink-500">Unidad {i + 1}</span>
                  {lines.length > 1 && (
                    <button
                      type="button"
                      onClick={() => removeLine(line.key)}
                      className="rounded p-1 text-ink-500 hover:bg-white/10 hover:text-white"
                    >
                      <X className="h-3.5 w-3.5" />
                    </button>
                  )}
                </div>
                <div className="grid grid-cols-3 gap-2.5">
                  <input
                    type="text"
                    placeholder="Unidad (ej. L303)"
                    value={line.unitLabel}
                    onChange={(e) => updateLine(line.key, { unitLabel: e.target.value })}
                    className={inputClass}
                  />
                  <select
                    value={line.serviceTypeId}
                    onChange={(e) => updateLine(line.key, { serviceTypeId: e.target.value })}
                    className={inputClass}
                  >
                    <option value="">Servicio…</option>
                    {serviceTypes.map((t) => (
                      <option key={t.id} value={t.id}>
                        {t.name}
                      </option>
                    ))}
                  </select>
                  <input
                    type="time"
                    value={line.scheduledTime}
                    onChange={(e) => updateLine(line.key, { scheduledTime: e.target.value })}
                    className={inputClass}
                  />
                </div>
              </div>
            ))}
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
            {saving ? 'Guardando…' : 'Guardar horario'}
          </button>
        </div>
      </div>
    </Modal>
  )
}

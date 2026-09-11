import { useEffect, useState } from 'react'
import { Modal } from '../common/Modal'
import { updateSchedule } from '../../lib/api'
import type { Employee, Property, Schedule, ServiceType } from '../../types'
import { getErrorMessage } from '../../lib/errors'

const inputClass =
  'w-full rounded-lg border border-white/10 bg-surface px-3 py-2.5 text-sm text-white outline-none focus:border-gold-500'
const labelClass = 'mb-1.5 block text-sm font-medium text-ink-200'

type EditScheduleModalProps = {
  schedule: Schedule | null
  properties: Property[]
  serviceTypes: ServiceType[]
  employees: Employee[]
  onClose: () => void
  onSaved: () => void
}

export const EditScheduleModal = ({
  schedule,
  properties,
  serviceTypes,
  employees,
  onClose,
  onSaved,
}: EditScheduleModalProps) => {
  const [propertyId, setPropertyId] = useState('')
  const [employeeId, setEmployeeId] = useState('')
  const [date, setDate] = useState('')
  const [unitLabel, setUnitLabel] = useState('')
  const [serviceTypeId, setServiceTypeId] = useState('')
  const [saving, setSaving] = useState(false)
  const [error, setError] = useState<string | null>(null)

  useEffect(() => {
    if (!schedule) return
    setPropertyId(schedule.propertyId)
    setEmployeeId(schedule.employeeId)
    setDate(schedule.scheduledDate)
    setUnitLabel(schedule.unitLabel ?? '')
    setServiceTypeId(schedule.serviceTypeId)
    setError(null)
  }, [schedule])

  const handleSave = async () => {
    if (!schedule) return
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
    if (!serviceTypeId) {
      setError('Selecciona un tipo de servicio.')
      return
    }

    setSaving(true)
    setError(null)
    try {
      await updateSchedule(schedule.id, {
        propertyId,
        employeeId,
        scheduledDate: date,
        unitLabel,
        serviceTypeId,
      })
      onSaved()
      onClose()
    } catch (err) {
      setError(getErrorMessage(err, 'No se pudo guardar el horario.'))
    } finally {
      setSaving(false)
    }
  }

  return (
    <Modal open={schedule !== null} onClose={onClose} title="Editar horario">
      <div className="space-y-4">
        <div className="grid grid-cols-2 gap-3">
          <div>
            <label htmlFor="edit-sch-property" className={labelClass}>
              Propiedad
            </label>
            <select
              id="edit-sch-property"
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
            <label htmlFor="edit-sch-employee" className={labelClass}>
              Empleado
            </label>
            <select
              id="edit-sch-employee"
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
          <label htmlFor="edit-sch-date" className={labelClass}>
            Fecha
          </label>
          <input
            id="edit-sch-date"
            type="date"
            value={date}
            onChange={(e) => setDate(e.target.value)}
            className={inputClass}
          />
        </div>

        <div>
          <label className={labelClass}>Unidad y servicio</label>
          <div className="grid grid-cols-2 gap-2.5">
            <input
              type="text"
              placeholder="Unidad (ej. L303)"
              value={unitLabel}
              onChange={(e) => setUnitLabel(e.target.value)}
              className={inputClass}
            />
            <select value={serviceTypeId} onChange={(e) => setServiceTypeId(e.target.value)} className={inputClass}>
              <option value="">Servicio…</option>
              {serviceTypes.map((t) => (
                <option key={t.id} value={t.id}>
                  {t.name}
                </option>
              ))}
            </select>
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
            {saving ? 'Guardando…' : 'Guardar cambios'}
          </button>
        </div>
      </div>
    </Modal>
  )
}

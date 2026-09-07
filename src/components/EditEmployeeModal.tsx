import { useEffect, useState } from 'react'
import { Modal } from './Modal'
import { updateEmployee } from '../lib/api'
import type { Employee } from '../types'

type EmployeeStatus = Employee['status']

const STATUS_OPTIONS: { value: EmployeeStatus; label: string }[] = [
  { value: 'active', label: 'Activo' },
  { value: 'inactive', label: 'Inactivo' },
]

const inputClass =
  'w-full rounded-lg border border-white/10 bg-surface px-3 py-2.5 text-sm text-white outline-none focus:border-gold-500'
const labelClass = 'mb-1.5 block text-sm font-medium text-ink-200'

type EditEmployeeModalProps = {
  employee: Employee | null
  onClose: () => void
  onSaved: () => void
}

export const EditEmployeeModal = ({ employee, onClose, onSaved }: EditEmployeeModalProps) => {
  const [name, setName] = useState('')
  const [role, setRole] = useState('')
  const [status, setStatus] = useState<EmployeeStatus>('active')
  const [hourlyRate, setHourlyRate] = useState('')
  const [saving, setSaving] = useState(false)
  const [error, setError] = useState<string | null>(null)

  useEffect(() => {
    if (!employee) return
    setName(employee.name)
    setRole(employee.role ?? '')
    setStatus(employee.status)
    setHourlyRate(employee.hourlyRate != null ? String(employee.hourlyRate) : '')
    setError(null)
  }, [employee])

  const handleSave = async () => {
    if (!employee) return
    if (!name.trim()) {
      setError('El nombre del empleado es obligatorio.')
      return
    }
    let hourlyRateValue: number | null = null
    if (hourlyRate.trim()) {
      const parsed = Number(hourlyRate.replace(/[^0-9.-]/g, ''))
      if (Number.isNaN(parsed) || parsed < 0) {
        setError('La tarifa por hora no es un número válido.')
        return
      }
      hourlyRateValue = parsed
    }

    setSaving(true)
    setError(null)
    try {
      await updateEmployee(employee.id, { name: name.trim(), role, status, hourlyRate: hourlyRateValue })
      onSaved()
      onClose()
    } catch (err) {
      setError(err instanceof Error ? err.message : 'No se pudo guardar el empleado.')
    } finally {
      setSaving(false)
    }
  }

  return (
    <Modal open={employee !== null} onClose={onClose} title="Editar empleado">
      <div className="space-y-4">
        <div>
          <label htmlFor="emp-name" className={labelClass}>
            Nombre
          </label>
          <input id="emp-name" type="text" value={name} onChange={(e) => setName(e.target.value)} className={inputClass} />
        </div>

        <div>
          <label htmlFor="emp-role" className={labelClass}>
            Rol / puesto
          </label>
          <input id="emp-role" type="text" value={role} onChange={(e) => setRole(e.target.value)} className={inputClass} />
        </div>

        <div>
          <label htmlFor="emp-rate" className={labelClass}>
            Tarifa por hora (opcional)
          </label>
          <input
            id="emp-rate"
            type="text"
            inputMode="decimal"
            value={hourlyRate}
            onChange={(e) => setHourlyRate(e.target.value)}
            placeholder="ej. 25"
            className={inputClass}
          />
        </div>

        <div>
          <label htmlFor="emp-status" className={labelClass}>
            Estado
          </label>
          <select
            id="emp-status"
            value={status}
            onChange={(e) => setStatus(e.target.value as EmployeeStatus)}
            className={inputClass}
          >
            {STATUS_OPTIONS.map((opt) => (
              <option key={opt.value} value={opt.value}>
                {opt.label}
              </option>
            ))}
          </select>
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

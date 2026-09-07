import { useEffect, useState } from 'react'
import { Modal } from './Modal'
import { updateService } from '../lib/api'
import type { Employee, PaymentStatus, Property, Service, ServiceStatus, ServiceType } from '../types'

const STATUS_OPTIONS: { value: ServiceStatus; label: string }[] = [
  { value: 'pending', label: 'Pendiente' },
  { value: 'in_progress', label: 'En proceso' },
  { value: 'completed', label: 'Completado' },
]

const PAYMENT_STATUS_OPTIONS: { value: PaymentStatus; label: string }[] = [
  { value: 'pending', label: 'Pendiente' },
  { value: 'paid', label: 'Pagado' },
]

const inputClass =
  'w-full rounded-lg border border-white/10 bg-surface px-3 py-2.5 text-sm text-white outline-none focus:border-gold-500'
const labelClass = 'mb-1.5 block text-sm font-medium text-ink-200'

type EditServiceModalProps = {
  service: Service | null
  properties: Property[]
  serviceTypes: ServiceType[]
  employees: Employee[]
  onClose: () => void
  onSaved: () => void
}

export const EditServiceModal = ({
  service,
  properties,
  serviceTypes,
  employees,
  onClose,
  onSaved,
}: EditServiceModalProps) => {
  const [propertyId, setPropertyId] = useState('')
  const [serviceTypeId, setServiceTypeId] = useState('')
  const [employeeId, setEmployeeId] = useState('')
  const [unitLabel, setUnitLabel] = useState('')
  const [unitSize, setUnitSize] = useState('')
  const [status, setStatus] = useState<ServiceStatus>('pending')
  const [scheduledDate, setScheduledDate] = useState('')
  const [completedDate, setCompletedDate] = useState('')
  const [cost, setCost] = useState('')
  const [paymentStatus, setPaymentStatus] = useState<PaymentStatus>('pending')
  const [paidDate, setPaidDate] = useState('')
  const [notes, setNotes] = useState('')
  const [saving, setSaving] = useState(false)
  const [error, setError] = useState<string | null>(null)

  useEffect(() => {
    if (!service) return
    setPropertyId(service.propertyId)
    setServiceTypeId(service.serviceTypeId)
    setEmployeeId(service.employeeId ?? '')
    setUnitLabel(service.unitLabel ?? '')
    setUnitSize(service.unitSize ?? '')
    setStatus(service.status)
    setScheduledDate(service.scheduledDate ?? '')
    setCompletedDate(service.completedDate ?? '')
    setCost(String(service.cost))
    setPaymentStatus(service.paymentStatus)
    setPaidDate(service.paidDate ?? '')
    setNotes(service.notes ?? '')
    setError(null)
  }, [service])

  const handleSave = async () => {
    if (!service) return
    if (!propertyId) {
      setError('Selecciona una propiedad.')
      return
    }
    if (!serviceTypeId) {
      setError('Selecciona un tipo de servicio.')
      return
    }
    const costValue = Number(cost.replace(/[^0-9.-]/g, ''))
    if (!cost || Number.isNaN(costValue) || costValue < 0) {
      setError('El costo no es un número válido.')
      return
    }

    setSaving(true)
    setError(null)
    try {
      await updateService(service.id, {
        propertyId,
        serviceTypeId,
        employeeId: employeeId || null,
        unitLabel,
        unitSize,
        status,
        scheduledDate,
        completedDate,
        cost: costValue,
        paymentStatus,
        paidDate,
        notes,
      })
      onSaved()
      onClose()
    } catch (err) {
      setError(err instanceof Error ? err.message : 'No se pudo guardar el trabajo.')
    } finally {
      setSaving(false)
    }
  }

  return (
    <Modal open={service !== null} onClose={onClose} title="Editar trabajo">
      <div className="space-y-4">
        <div className="grid grid-cols-2 gap-3">
          <div>
            <label htmlFor="svc-property" className={labelClass}>
              Propiedad
            </label>
            <select
              id="svc-property"
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
            <label htmlFor="svc-type" className={labelClass}>
              Tipo de servicio
            </label>
            <select
              id="svc-type"
              value={serviceTypeId}
              onChange={(e) => setServiceTypeId(e.target.value)}
              className={inputClass}
            >
              <option value="">Selecciona…</option>
              {serviceTypes.map((t) => (
                <option key={t.id} value={t.id}>
                  {t.name}
                </option>
              ))}
            </select>
          </div>
        </div>

        <div className="grid grid-cols-2 gap-3">
          <div>
            <label htmlFor="svc-unit-label" className={labelClass}>
              Unidad
            </label>
            <input
              id="svc-unit-label"
              type="text"
              value={unitLabel}
              onChange={(e) => setUnitLabel(e.target.value)}
              className={inputClass}
            />
          </div>
          <div>
            <label htmlFor="svc-unit-size" className={labelClass}>
              Tamaño de unidad
            </label>
            <input
              id="svc-unit-size"
              type="text"
              value={unitSize}
              onChange={(e) => setUnitSize(e.target.value)}
              className={inputClass}
            />
          </div>
        </div>

        <div>
          <label htmlFor="svc-employee" className={labelClass}>
            Empleado
          </label>
          <select
            id="svc-employee"
            value={employeeId}
            onChange={(e) => setEmployeeId(e.target.value)}
            className={inputClass}
          >
            <option value="">Sin asignar</option>
            {employees.map((e) => (
              <option key={e.id} value={e.id}>
                {e.name}
              </option>
            ))}
          </select>
        </div>

        <div className="grid grid-cols-2 gap-3">
          <div>
            <label htmlFor="svc-status" className={labelClass}>
              Estado del trabajo
            </label>
            <select
              id="svc-status"
              value={status}
              onChange={(e) => setStatus(e.target.value as ServiceStatus)}
              className={inputClass}
            >
              {STATUS_OPTIONS.map((opt) => (
                <option key={opt.value} value={opt.value}>
                  {opt.label}
                </option>
              ))}
            </select>
          </div>
          <div>
            <label htmlFor="svc-cost" className={labelClass}>
              Costo
            </label>
            <input
              id="svc-cost"
              type="text"
              inputMode="decimal"
              value={cost}
              onChange={(e) => setCost(e.target.value)}
              className={inputClass}
            />
          </div>
        </div>

        <div className="grid grid-cols-2 gap-3">
          <div>
            <label htmlFor="svc-scheduled" className={labelClass}>
              Fecha programada
            </label>
            <input
              id="svc-scheduled"
              type="date"
              value={scheduledDate}
              onChange={(e) => setScheduledDate(e.target.value)}
              className={inputClass}
            />
          </div>
          <div>
            <label htmlFor="svc-completed" className={labelClass}>
              Fecha de completado
            </label>
            <input
              id="svc-completed"
              type="date"
              value={completedDate}
              onChange={(e) => setCompletedDate(e.target.value)}
              className={inputClass}
            />
          </div>
        </div>

        <div className="grid grid-cols-2 gap-3">
          <div>
            <label htmlFor="svc-payment-status" className={labelClass}>
              Estado de cobro
            </label>
            <select
              id="svc-payment-status"
              value={paymentStatus}
              onChange={(e) => setPaymentStatus(e.target.value as PaymentStatus)}
              className={inputClass}
            >
              {PAYMENT_STATUS_OPTIONS.map((opt) => (
                <option key={opt.value} value={opt.value}>
                  {opt.label}
                </option>
              ))}
            </select>
          </div>
          <div>
            <label htmlFor="svc-paid-date" className={labelClass}>
              Fecha de cobro
            </label>
            <input
              id="svc-paid-date"
              type="date"
              value={paidDate}
              onChange={(e) => setPaidDate(e.target.value)}
              className={inputClass}
            />
          </div>
        </div>

        <div>
          <label htmlFor="svc-notes" className={labelClass}>
            Notas
          </label>
          <textarea
            id="svc-notes"
            value={notes}
            onChange={(e) => setNotes(e.target.value)}
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
            {saving ? 'Guardando…' : 'Guardar cambios'}
          </button>
        </div>
      </div>
    </Modal>
  )
}

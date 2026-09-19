import { useEffect, useState } from 'react'
import { Modal } from '../common/Modal'
import { StatusPill } from '../common/StatusPill'
import { fetchChargeByScheduleId } from '../../lib/api'
import type { Charge, Schedule } from '../../types'

const currency = (value: number) =>
  value.toLocaleString('en-US', { style: 'currency', currency: 'USD', maximumFractionDigits: 2 })

const Field = ({ label, value }: { label: string; value: React.ReactNode }) => (
  <div>
    <p className="text-xs font-medium uppercase tracking-wide text-ink-500">{label}</p>
    <p className="mt-1 text-sm text-white">{value}</p>
  </div>
)

type ScheduleDetailModalProps = {
  schedule: Schedule | null
  propertyMap: Map<string, string>
  serviceTypeMap: Map<string, string>
  employeeMap: Map<string, string>
  allSchedules: Schedule[]
  onClose: () => void
}

export const ScheduleDetailModal = ({
  schedule,
  propertyMap,
  serviceTypeMap,
  employeeMap,
  allSchedules,
  onClose,
}: ScheduleDetailModalProps) => {
  const rescheduledTo = schedule?.rescheduledToId
    ? allSchedules.find((s) => s.id === schedule.rescheduledToId)
    : undefined
  const rescheduledFrom = schedule ? allSchedules.find((s) => s.rescheduledToId === schedule.id) : undefined

  const [charge, setCharge] = useState<Charge | null>(null)

  useEffect(() => {
    if (!schedule || schedule.status !== 'delivered' || schedule.isFixedCharge) {
      setCharge(null)
      return
    }
    let cancelled = false
    fetchChargeByScheduleId(schedule.id)
      .then((c) => {
        if (!cancelled) setCharge(c)
      })
      .catch(() => {
        if (!cancelled) setCharge(null)
      })
    return () => {
      cancelled = true
    }
  }, [schedule])

  return (
    <Modal open={schedule !== null} onClose={onClose} title="Detalle del horario">
      {schedule && (
        <div className="grid grid-cols-2 gap-4">
          <Field label="Propiedad" value={propertyMap.get(schedule.propertyId) ?? '—'} />
          <Field label="Unidad" value={schedule.unitLabel || '—'} />
          <Field
            label="Servicio"
            value={
              <span className="flex items-center gap-1.5">
                {serviceTypeMap.get(schedule.serviceTypeId) ?? '—'}
                {schedule.isFixedCharge && (
                  <span className="rounded-full bg-gold-500/10 px-1.5 py-0.5 text-[10px] font-medium uppercase tracking-wide text-gold-400 ring-1 ring-inset ring-gold-500/20">
                    Cobro fijo
                  </span>
                )}
              </span>
            }
          />
          <Field label="Empleado" value={employeeMap.get(schedule.employeeId) ?? '—'} />
          <Field label="Fecha" value={schedule.scheduledDate} />
          <Field label="Estatus" value={<StatusPill status={schedule.status} />} />
          {charge && <Field label="Total cobrado" value={currency(charge.amount)} />}
          {rescheduledTo && <Field label="Reagendado para" value={rescheduledTo.scheduledDate} />}
          {rescheduledFrom && <Field label="Reagendado desde" value={rescheduledFrom.scheduledDate} />}
        </div>
      )}
    </Modal>
  )
}

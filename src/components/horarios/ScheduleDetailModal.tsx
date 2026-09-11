import { Modal } from '../common/Modal'
import { StatusPill } from '../common/StatusPill'
import type { Schedule } from '../../types'

const Field = ({ label, value }: { label: string; value: React.ReactNode }) => (
  <div>
    <p className="text-xs font-medium uppercase tracking-wide text-ink-500">{label}</p>
    <p className="mt-1 text-sm text-white">{value}</p>
  </div>
)

// Vista de solo lectura con el detalle de un horario — se abre al hacer
// clic en cualquier parte de una fila en Horarios.tsx. Los botones de
// Estatus y Editar dentro de la fila detienen la propagación para no abrir
// este modal a la vez que el suyo.
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
  // Si este horario fue reagendado, rescheduledTo es el horario nuevo (con
  // la fecha nueva); si este horario ES el resultado de reagendar otro,
  // rescheduledFrom es ese horario viejo — ver rescheduleSchedule() en
  // src/lib/api.ts.
  const rescheduledTo = schedule?.rescheduledToId
    ? allSchedules.find((s) => s.id === schedule.rescheduledToId)
    : undefined
  const rescheduledFrom = schedule ? allSchedules.find((s) => s.rescheduledToId === schedule.id) : undefined

  return (
    <Modal open={schedule !== null} onClose={onClose} title="Detalle del horario">
      {schedule && (
        <div className="grid grid-cols-2 gap-4">
          <Field label="Propiedad" value={propertyMap.get(schedule.propertyId) ?? '—'} />
          <Field label="Unidad" value={schedule.unitLabel || '—'} />
          <Field label="Servicio" value={serviceTypeMap.get(schedule.serviceTypeId) ?? '—'} />
          <Field label="Empleado" value={employeeMap.get(schedule.employeeId) ?? '—'} />
          <Field label="Fecha" value={schedule.scheduledDate} />
          <Field label="Estatus" value={<StatusPill status={schedule.status} />} />
          {rescheduledTo && <Field label="Reagendado para" value={rescheduledTo.scheduledDate} />}
          {rescheduledFrom && <Field label="Reagendado desde" value={rescheduledFrom.scheduledDate} />}
        </div>
      )}
    </Modal>
  )
}

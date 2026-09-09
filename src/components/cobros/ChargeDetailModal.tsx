import { Modal } from '../common/Modal'
import { StatusPill } from '../common/StatusPill'
import type { Charge, Property, ServiceType } from '../../types'

const currency = (value: number) =>
  value.toLocaleString('en-US', { style: 'currency', currency: 'USD', maximumFractionDigits: 0 })

const Field = ({ label, value }: { label: string; value: React.ReactNode }) => (
  <div>
    <p className="text-xs font-medium uppercase tracking-wide text-ink-500">{label}</p>
    <p className="mt-1 text-sm text-white">{value}</p>
  </div>
)

// Vista de solo lectura con toda la información de un cobro — se abre al
// hacer clic en cualquier parte de una fila de la tabla de Cobros (ver
// onRowClick en DataTablePanel.tsx). El clic en el estatus abre en cambio
// ChargeInvoiceModal — su botón detiene la propagación para no chocar con
// este modal.
type ChargeDetailModalProps = {
  charge: Charge | null
  properties: Property[]
  serviceTypes: ServiceType[]
  onClose: () => void
}

export const ChargeDetailModal = ({ charge, properties, serviceTypes, onClose }: ChargeDetailModalProps) => {
  const propertyName = properties.find((p) => p.id === charge?.propertyId)?.name
  const serviceTypeName = charge?.serviceTypeId
    ? serviceTypes.find((t) => t.id === charge.serviceTypeId)?.name
    : undefined

  return (
    <Modal open={charge !== null} onClose={onClose} title="Detalle del cobro">
      {charge && (
        <div className="space-y-5">
          <div className="grid grid-cols-2 gap-4">
            <Field label="Propiedad" value={propertyName ?? '—'} />
            <Field label="Apartamento" value={charge.unitLabel || '—'} />
            <Field label="Servicio" value={serviceTypeName ?? '—'} />
            <Field label="Fecha" value={charge.generatedDate || '—'} />
            <Field label="Estatus" value={<StatusPill status={charge.status} />} />
            <Field label="Invoice #" value={charge.invoiceNumber || '—'} />
            <Field label="Monto" value={<span className="tabular-nums">{currency(charge.amount)}</span>} />
            <Field label="Responsable" value={charge.responsible || '—'} />
            <Field label="Periodo de planilla" value={charge.payrollPeriod || '—'} />
          </div>

          <Field label="Descripción" value={charge.description || '—'} />
          <Field label="Notas" value={charge.notes || '—'} />

          <div>
            <p className="mb-2 text-xs font-medium uppercase tracking-wide text-ink-500">Extras</p>
            {charge.extras.length === 0 ? (
              <p className="text-sm text-ink-400">Sin extras.</p>
            ) : (
              <div className="space-y-1.5">
                {charge.extras.map((extra, i) => (
                  <div key={i} className="flex items-center justify-between rounded-lg bg-white/5 px-3 py-2 text-sm">
                    <span className="text-ink-200">{extra.description}</span>
                    <span className="tabular-nums text-white">{currency(extra.amount)}</span>
                  </div>
                ))}
              </div>
            )}
          </div>
        </div>
      )}
    </Modal>
  )
}

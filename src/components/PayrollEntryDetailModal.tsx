import { Modal } from './Modal'
import { formatFullDate } from '../lib/scheduleDates'
import type { Employee, PayrollEntry, Property } from '../types'

const currency = (value: number) =>
  value.toLocaleString('en-US', { style: 'currency', currency: 'USD', maximumFractionDigits: 0 })

const Field = ({ label, value }: { label: string; value: React.ReactNode }) => (
  <div>
    <p className="text-xs font-medium uppercase tracking-wide text-ink-500">{label}</p>
    <p className="mt-1 text-sm text-white">{value}</p>
  </div>
)

// Vista de solo lectura de una planilla, con el desglose del servicio y los
// cálculos de Ventas (suma del desglose) y Ganancia (Ventas - Pago) — se
// abre al hacer clic en cualquier parte de una fila de la tabla de
// Planillas (ver onRowClick en DataTablePanel.tsx). El botón "Editar"
// detiene la propagación para no chocar con este modal (ver Planillas.tsx).
type PayrollEntryDetailModalProps = {
  entry: PayrollEntry | null
  properties: Property[]
  employees: Employee[]
  onClose: () => void
}

export const PayrollEntryDetailModal = ({ entry, properties, employees, onClose }: PayrollEntryDetailModalProps) => {
  const propertyName = properties.find((p) => p.id === entry?.propertyId)?.name
  const employeeName = employees.find((e) => e.id === entry?.employeeId)?.name
  const sales = entry ? entry.items.reduce((sum, item) => sum + item.amount, 0) : 0
  const profit = entry ? sales - entry.amount : 0

  return (
    <Modal open={entry !== null} onClose={onClose} title="Detalle de la planilla" widthClassName="max-w-2xl">
      {entry && (
        <div className="space-y-5">
          <div className="grid grid-cols-2 gap-4">
            <Field label="Fecha" value={formatFullDate(entry.date)} />
            <Field label="Servicio" value={entry.serviceName} />
            <Field label="Propiedad" value={propertyName ?? '—'} />
            <Field label="Unidad" value={entry.unitLabel || '—'} />
            <Field label="Empleado" value={employeeName ?? '—'} />
          </div>

          <div className="grid grid-cols-3 gap-4 rounded-xl border border-white/10 bg-surface p-4">
            <Field label="Pago" value={<span className="tabular-nums">{currency(entry.amount)}</span>} />
            <Field label="Venta" value={<span className="tabular-nums text-emerald-400">{currency(sales)}</span>} />
            <Field
              label="Ganancia"
              value={
                <span className={`tabular-nums ${profit < 0 ? 'text-red-400' : 'text-gold-400'}`}>
                  {currency(profit)}
                </span>
              }
            />
          </div>

          <div>
            <p className="mb-2 text-xs font-medium uppercase tracking-wide text-ink-500">Desglose del servicio</p>
            {entry.items.length === 0 ? (
              <p className="text-sm text-ink-400">Sin desglose.</p>
            ) : (
              <div className="space-y-1.5">
                {entry.items.map((item) => (
                  <div key={item.id} className="flex items-center justify-between rounded-lg bg-white/5 px-3 py-2 text-sm">
                    <span className="text-ink-200">{item.description}</span>
                    <span className="tabular-nums text-white">{currency(item.amount)}</span>
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

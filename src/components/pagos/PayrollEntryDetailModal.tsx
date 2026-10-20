import { useState } from 'react'
import { CheckCircle2, RotateCcw, Trash2 } from 'lucide-react'
import { Modal } from '../common/Modal'
import { setPayrollEntryFixedCharge } from '../../lib/api'
import { getErrorMessage } from '../../lib/errors'
import { FIXED_CHARGE_LABEL } from '../../lib/payrollStatus'
import { formatFullDate } from '../../lib/scheduleDates'
import { taxOnAmount, SALES_TAX_RATE } from '../../lib/tax'
import type { Employee, PayrollEntry, Property } from '../../types'

const currency = (value: number) =>
  value.toLocaleString('en-US', { style: 'currency', currency: 'USD', maximumFractionDigits: 2 })

const Field = ({ label, value }: { label: string; value: React.ReactNode }) => (
  <div>
    <p className="text-xs font-medium uppercase tracking-wide text-ink-500">{label}</p>
    <p className="mt-1 text-sm text-white">{value}</p>
  </div>
)

type PayrollEntryDetailModalProps = {
  entry: PayrollEntry | null
  properties: Property[]
  employees: Employee[]
  onClose: () => void
  onDelete: () => void
  // Se llama después de marcar/desmarcar la planilla como cobro fijo, con
  // la planilla ya actualizada.
  onChanged: (entry: PayrollEntry) => void
}

export const PayrollEntryDetailModal = ({
  entry,
  properties,
  employees,
  onClose,
  onDelete,
  onChanged,
}: PayrollEntryDetailModalProps) => {
  const [togglingFixed, setTogglingFixed] = useState(false)
  const [toggleError, setToggleError] = useState<string | null>(null)

  const handleToggleFixed = async () => {
    if (!entry) return
    const next = !entry.isFixedCharge
    setTogglingFixed(true)
    setToggleError(null)
    try {
      await setPayrollEntryFixedCharge(entry.id, next)
      onChanged({ ...entry, isFixedCharge: next, amount: next ? null : entry.amount })
    } catch (err) {
      setToggleError(getErrorMessage(err, 'No se pudo actualizar la planilla.'))
    } finally {
      setTogglingFixed(false)
    }
  }

  const propertyName = properties.find((p) => p.id === entry?.propertyId)?.name
  const employeeName = employees.find((e) => e.id === entry?.employeeId)?.name
  const sales = entry ? entry.items.reduce((sum, item) => sum + item.amount, 0) : 0
  const profit = entry && entry.amount != null ? entry.amount - sales : null
  const tax = entry && entry.taxable && entry.amount != null ? taxOnAmount(entry.amount) : null

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
            <Field
              label="Ventas"
              value={
                entry.isFixedCharge ? (
                  <span className="text-sky-300">{FIXED_CHARGE_LABEL}</span>
                ) : entry.amount == null ? (
                  <span className="text-ink-500">Pendiente</span>
                ) : (
                  <span className="tabular-nums text-blue-400">{currency(entry.amount)}</span>
                )
              }
            />
            <Field label="Pago" value={<span className="tabular-nums text-emerald-400">{currency(sales)}</span>} />
            <Field
              label="Ganancia"
              value={
                entry.isFixedCharge ? (
                  <span className="text-ink-500">—</span>
                ) : profit == null ? (
                  <span className="text-ink-500">Pendiente</span>
                ) : (
                  <span className={`tabular-nums ${profit < 0 ? 'text-red-400' : 'text-gold-400'}`}>
                    {currency(profit)}
                  </span>
                )
              }
            />
            {entry.taxable && !entry.isFixedCharge && (
              <Field
                label={`Impuesto (${(SALES_TAX_RATE * 100).toFixed(2)}%)`}
                value={
                  tax == null ? (
                    <span className="text-ink-500">Pendiente</span>
                  ) : (
                    <span className="tabular-nums text-gold-400">{currency(tax)}</span>
                  )
                }
              />
            )}
          </div>

          {entry.notes && (
            <Field label="Notas" value={<span className="whitespace-pre-wrap">{entry.notes}</span>} />
          )}

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

          {toggleError && <p className="text-sm text-red-400">{toggleError}</p>}

          <div className="flex flex-wrap items-center justify-between gap-2 border-t border-white/10 pt-4">
            <button
              type="button"
              onClick={onDelete}
              className="flex items-center gap-1.5 rounded-lg border border-red-500/30 px-3 py-2 text-sm font-medium text-red-400 hover:bg-red-500/10"
            >
              <Trash2 className="h-4 w-4" />
              Eliminar planilla
            </button>
            {/* Solo para planillas sin Cobro: las de cobro fijo (ej. limpieza
                de oficina) nunca van a tener un cobro propio. */}
            {(entry.isFixedCharge || entry.amount == null) && (
              <button
                type="button"
                onClick={handleToggleFixed}
                disabled={togglingFixed}
                className={
                  entry.isFixedCharge
                    ? 'flex items-center gap-1.5 rounded-lg border border-white/10 px-3 py-2 text-sm font-medium text-ink-300 hover:bg-white/5 disabled:opacity-60'
                    : 'flex items-center gap-1.5 rounded-lg bg-gold-500 px-3 py-2 text-sm font-semibold text-brand-900 hover:bg-gold-400 disabled:opacity-60'
                }
              >
                {entry.isFixedCharge ? <RotateCcw className="h-4 w-4" /> : <CheckCircle2 className="h-4 w-4" />}
                {togglingFixed
                  ? 'Guardando…'
                  : entry.isFixedCharge
                    ? 'Quitar cobro fijo'
                    : 'Marcar como cobro fijo (finalizada)'}
              </button>
            )}
          </div>
        </div>
      )}
    </Modal>
  )
}

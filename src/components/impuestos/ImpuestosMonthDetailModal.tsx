import { useState } from 'react'
import { Modal } from '../common/Modal'
import { StatusPill } from '../common/StatusPill'
import { computeChargeTax } from '../../lib/tax'
import { updateChargesTaxPaid } from '../../lib/api'
import { getErrorMessage } from '../../lib/errors'
import type { Charge, Property } from '../../types'

const currency = (value: number) =>
  value.toLocaleString('en-US', { style: 'currency', currency: 'USD', maximumFractionDigits: 2 })

export type MonthGroup = {
  key: string
  label: string
  charges: Charge[]
  totalBase: number
  totalTax: number
  paidTax: number
  pendingTax: number
  taxStatus: 'paid' | 'pending' | 'partial'
}

type ImpuestosMonthDetailModalProps = {
  month: MonthGroup | null
  properties: Property[]
  onClose: () => void
  onChanged: () => void
}

export const ImpuestosMonthDetailModal = ({ month, properties, onClose, onChanged }: ImpuestosMonthDetailModalProps) => {
  const [savingId, setSavingId] = useState<string | null>(null)
  const [error, setError] = useState<string | null>(null)

  const handleToggle = async (charge: Charge) => {
    setSavingId(charge.id)
    setError(null)
    try {
      await updateChargesTaxPaid([charge.id], !charge.taxPaid)
      onChanged()
    } catch (err) {
      setError(getErrorMessage(err, 'No se pudo actualizar el impuesto de este cobro.'))
    } finally {
      setSavingId(null)
    }
  }

  return (
    <Modal
      open={month !== null}
      onClose={onClose}
      title={month ? `Impuestos — ${month.label}` : 'Impuestos'}
      widthClassName="max-w-3xl"
    >
      {month && (
        <div className="space-y-4">
          {error && <p className="text-sm text-red-400">{error}</p>}

          <div className="max-h-[60vh] overflow-y-auto rounded-lg border border-white/10">
            <table className="w-full text-left text-sm">
              <thead className="sticky top-0 bg-surface-alt text-xs uppercase tracking-wide text-ink-500">
                <tr className="border-b border-white/5">
                  <th className="px-4 py-2.5 font-medium">Propiedad</th>
                  <th className="px-4 py-2.5 font-medium">Fecha</th>
                  <th className="px-4 py-2.5 font-medium">Cobro</th>
                  <th className="px-4 py-2.5 font-medium">Estado</th>
                  <th className="px-4 py-2.5 font-medium" />
                </tr>
              </thead>
              <tbody>
                {month.charges.map((charge) => {
                  const propertyName = properties.find((p) => p.id === charge.propertyId)?.name ?? '—'
                  const { base, tax, total } = computeChargeTax(charge.amount, charge.taxIncluded)
                  return (
                    <tr key={charge.id} className="border-b border-white/5 last:border-0">
                      <td className="px-4 py-2.5 text-ink-200">
                        {propertyName}
                        {charge.unitLabel ? ` — ${charge.unitLabel}` : ''}
                      </td>
                      <td className="px-4 py-2.5 text-ink-300">{charge.generatedDate || '—'}</td>
                      <td className="px-4 py-2.5">
                        <div className="flex flex-wrap items-center gap-2">
                          <span className="tabular-nums text-ink-200">
                            {charge.taxIncluded
                              ? `${currency(total)} − ${currency(tax)} (8.25%) = ${currency(base)} base`
                              : `${currency(base)} + ${currency(tax)} (8.25%) = ${currency(total)} total`}
                          </span>
                          <span
                            className={`shrink-0 rounded-full px-2 py-0.5 text-[10px] font-medium ${
                              charge.taxIncluded ? 'bg-amber-400/10 text-amber-300' : 'bg-white/5 text-ink-400'
                            }`}
                          >
                            {charge.taxIncluded ? 'Impuesto incluido' : 'Impuesto aparte'}
                          </span>
                        </div>
                      </td>
                      <td className="px-4 py-2.5">
                        <StatusPill status={charge.taxPaid ? 'paid' : 'pending'} />
                      </td>
                      <td className="px-4 py-2.5">
                        <button
                          type="button"
                          disabled={savingId === charge.id}
                          onClick={() => handleToggle(charge)}
                          className="rounded-lg border border-white/10 px-2.5 py-1.5 text-xs font-medium text-ink-300 hover:bg-white/5 disabled:opacity-60"
                        >
                          {savingId === charge.id ? 'Guardando…' : charge.taxPaid ? 'Marcar pendiente' : 'Marcar pagado'}
                        </button>
                      </td>
                    </tr>
                  )
                })}
              </tbody>
            </table>
          </div>

          <div className="flex items-center justify-between rounded-lg bg-white/5 px-4 py-3 text-sm">
            <span className="text-ink-300">Total impuesto del mes</span>
            <span className="tabular-nums font-semibold text-white">{currency(month.totalTax)}</span>
          </div>
        </div>
      )}
    </Modal>
  )
}

import { FilterPanel } from '../common/FilterPanel'
import type { Vendor } from '../../types'

const inputClass =
  'w-full rounded-lg border border-white/10 bg-surface px-3 py-2.5 text-sm text-white outline-none focus:border-gold-500'
const labelClass = 'mb-1.5 block text-sm font-medium text-ink-200'

// Filtros de la tabla de Gastos — rango de fecha y rango de monto. Los
// campos aplican de inmediato (mismo criterio que ScheduleFiltersModal),
// este panel (ver FilterPanel.tsx) solo los agrupa detrás de un botón para
// no ocupar espacio permanente en la página. El searchbar
// (factura/descripción) vive aparte, directamente en Gastos.tsx.
type ExpenseFiltersModalProps = {
  open: boolean
  onClose: () => void
  dateFrom: string
  dateTo: string
  amountMin: string
  amountMax: string
  onDateFromChange: (value: string) => void
  onDateToChange: (value: string) => void
  onAmountMinChange: (value: string) => void
  onAmountMaxChange: (value: string) => void
  vendorId: string
  vendors: Vendor[]
  onVendorIdChange: (value: string) => void
}

export const ExpenseFiltersModal = ({
  open,
  onClose,
  dateFrom,
  dateTo,
  amountMin,
  amountMax,
  onDateFromChange,
  onDateToChange,
  onAmountMinChange,
  onAmountMaxChange,
  vendorId,
  vendors,
  onVendorIdChange,
}: ExpenseFiltersModalProps) => {
  const hasFilters = Boolean(dateFrom || dateTo || amountMin || amountMax || vendorId)

  return (
    <FilterPanel
      open={open}
      onClose={onClose}
      hasFilters={hasFilters}
      onClear={() => {
        onDateFromChange('')
        onDateToChange('')
        onAmountMinChange('')
        onAmountMaxChange('')
        onVendorIdChange('')
      }}
    >
      <div className="space-y-4">
        <div className="grid grid-cols-2 gap-3">
          <div>
            <label htmlFor="exp-filter-date-from" className={labelClass}>
              Fecha desde
            </label>
            <input
              id="exp-filter-date-from"
              type="date"
              value={dateFrom}
              onChange={(e) => onDateFromChange(e.target.value)}
              className={inputClass}
            />
          </div>
          <div>
            <label htmlFor="exp-filter-date-to" className={labelClass}>
              Fecha hasta
            </label>
            <input
              id="exp-filter-date-to"
              type="date"
              value={dateTo}
              onChange={(e) => onDateToChange(e.target.value)}
              className={inputClass}
            />
          </div>
        </div>

        <div className="grid grid-cols-2 gap-3">
          <div>
            <label htmlFor="exp-filter-amount-min" className={labelClass}>
              Monto mínimo
            </label>
            <input
              id="exp-filter-amount-min"
              type="number"
              min="0"
              step="0.01"
              value={amountMin}
              onChange={(e) => onAmountMinChange(e.target.value)}
              className={inputClass}
            />
          </div>
          <div>
            <label htmlFor="exp-filter-amount-max" className={labelClass}>
              Monto máximo
            </label>
            <input
              id="exp-filter-amount-max"
              type="number"
              min="0"
              step="0.01"
              value={amountMax}
              onChange={(e) => onAmountMaxChange(e.target.value)}
              className={inputClass}
            />
          </div>
        </div>

        <div>
          <label htmlFor="exp-filter-vendor" className={labelClass}>
            Proveedor
          </label>
          <select
            id="exp-filter-vendor"
            value={vendorId}
            onChange={(e) => onVendorIdChange(e.target.value)}
            className={inputClass}
          >
            <option value="">Todos</option>
            {vendors.map((v) => (
              <option key={v.id} value={v.id}>
                {v.name}
              </option>
            ))}
          </select>
        </div>
      </div>
    </FilterPanel>
  )
}

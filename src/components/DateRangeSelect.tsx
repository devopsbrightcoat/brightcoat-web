import { DATE_RANGE_OPTIONS, type DateRangeKey } from '../lib/dateRange'

// ---------------------------------------------------------------------------
// Select reutilizable para el filtro de rango de fechas. Mismo estilo que
// los demás selects de filtro (Finanzas, Reportes).
// ---------------------------------------------------------------------------

type DateRangeSelectProps = {
  value: DateRangeKey
  onChange: (value: DateRangeKey) => void
  className?: string
}

export const DateRangeSelect = ({ value, onChange, className }: DateRangeSelectProps) => (
  <select
    value={value}
    onChange={(e) => onChange(e.target.value as DateRangeKey)}
    className={
      className ??
      'rounded-lg border border-white/10 bg-surface-alt px-3 py-2 text-sm text-ink-300 hover:bg-white/5'
    }
  >
    {DATE_RANGE_OPTIONS.map((opt) => (
      <option key={opt.value} value={opt.value}>
        {opt.label}
      </option>
    ))}
  </select>
)

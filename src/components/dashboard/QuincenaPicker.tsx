import { formatMonthLabel } from '../../lib/scheduleDates'
import { formatQuincenaRangeLabel, listRecentMonths, type QuincenaKey } from '../../lib/quincena'

const selectClass =
  'rounded-lg border border-white/10 bg-surface px-3 py-2 text-sm text-white outline-none focus:border-gold-500'

type QuincenaPickerProps = {
  value: QuincenaKey
  onChange: (key: QuincenaKey) => void
  monthsBack?: number
}

export const QuincenaPicker = ({ value, onChange, monthsBack = 24 }: QuincenaPickerProps) => {
  const months = listRecentMonths(monthsBack)
  const monthKey = `${value.year}-${value.month}`

  const handleMonthChange = (key: string) => {
    const [year, month] = key.split('-').map(Number)
    onChange({ year, month, half: value.half })
  }

  return (
    <div className="flex flex-wrap items-center gap-3">
      <select value={monthKey} onChange={(e) => handleMonthChange(e.target.value)} className={selectClass}>
        {months.map((m) => (
          <option key={`${m.year}-${m.month}`} value={`${m.year}-${m.month}`}>
            {formatMonthLabel(m.year, m.month - 1)}
          </option>
        ))}
      </select>

      <div className="flex overflow-hidden rounded-lg border border-white/10">
        <button
          type="button"
          onClick={() => onChange({ ...value, half: 1 })}
          className={`px-3 py-2 text-sm font-medium transition ${
            value.half === 1 ? 'bg-gold-500 text-brand-900' : 'bg-surface text-ink-300 hover:bg-white/5'
          }`}
        >
          1ra quincena
        </button>
        <button
          type="button"
          onClick={() => onChange({ ...value, half: 2 })}
          className={`px-3 py-2 text-sm font-medium transition ${
            value.half === 2 ? 'bg-gold-500 text-brand-900' : 'bg-surface text-ink-300 hover:bg-white/5'
          }`}
        >
          2da quincena
        </button>
      </div>

      <span className="text-xs text-ink-500">{formatQuincenaRangeLabel(value)}</span>
    </div>
  )
}

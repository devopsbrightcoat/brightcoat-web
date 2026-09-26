import { computeDateRange, type DashboardDateRangeSelection } from '../../lib/dashboardMetrics'
import { getQuincenaForDate } from '../../lib/quincena'
import { QuincenaPicker } from './QuincenaPicker'

type DashboardDateRangeSelectProps = {
  value: DashboardDateRangeSelection
  onChange: (selection: DashboardDateRangeSelection) => void
}

const modeButtonClass = (active: boolean) =>
  `px-3 py-2 text-sm font-medium transition ${
    active ? 'bg-gold-500 text-brand-900' : 'bg-surface-alt text-ink-300 hover:bg-white/5'
  }`

const dateInputClass =
  'rounded-lg border border-white/10 bg-surface-alt px-3 py-2 text-sm text-ink-200 outline-none focus:border-gold-500'

export const DashboardDateRangeSelect = ({ value, onChange }: DashboardDateRangeSelectProps) => {
  return (
    <div className="flex flex-wrap items-center gap-3">
      <div className="flex overflow-hidden rounded-lg border border-white/10">
        <button
          type="button"
          onClick={() => value.kind !== 'quincena' && onChange({ kind: 'quincena', quincena: getQuincenaForDate() })}
          className={modeButtonClass(value.kind === 'quincena')}
        >
          Quincena
        </button>
        <button
          type="button"
          onClick={() => {
            if (value.kind === 'custom') return
            const current = computeDateRange(value)
            onChange({ kind: 'custom', start: current.start, end: current.end })
          }}
          className={modeButtonClass(value.kind === 'custom')}
        >
          Fecha
        </button>
      </div>

      {value.kind === 'quincena' ? (
        <QuincenaPicker value={value.quincena} onChange={(quincena) => onChange({ kind: 'quincena', quincena })} />
      ) : (
        <div className="flex items-center gap-2">
          <input
            type="date"
            value={value.start}
            max={value.end}
            onChange={(e) => onChange({ kind: 'custom', start: e.target.value, end: value.end })}
            className={dateInputClass}
          />
          <span className="text-sm text-ink-500">–</span>
          <input
            type="date"
            value={value.end}
            min={value.start}
            onChange={(e) => onChange({ kind: 'custom', start: value.start, end: e.target.value })}
            className={dateInputClass}
          />
        </div>
      )}
    </div>
  )
}

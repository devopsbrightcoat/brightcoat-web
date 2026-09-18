import { DASHBOARD_DATE_RANGE_OPTIONS, type DashboardDateRangeKey, type DashboardDateRangeSelection } from '../../lib/dashboardMetrics'
import { getQuincenaForDate } from '../../lib/quincena'
import { QuincenaPicker } from './QuincenaPicker'

type DashboardDateRangeSelectProps = {
  value: DashboardDateRangeSelection
  onChange: (selection: DashboardDateRangeSelection) => void
}

const selectClass =
  'rounded-lg border border-white/10 bg-surface-alt px-3 py-2 text-sm text-ink-200 outline-none focus:border-gold-500'

const modeButtonClass = (active: boolean) =>
  `px-3 py-2 text-sm font-medium transition ${
    active ? 'bg-gold-500 text-brand-900' : 'bg-surface-alt text-ink-300 hover:bg-white/5'
  }`

// Filtro global de fecha del Dashboard — dos modos: los presets de siempre
// (Últimos 15 días / Mes actual / Últimos 6 meses / Últimos 12 meses), o
// una quincena específica al estilo de David (mes + 1ra/2da, ver
// lib/quincena.ts — a pedido suyo, no son las quincenas de calendario
// 1-15/16-fin de mes). Aplica a los KPIs, rankings y bloque de alertas;
// Revenue Trend y Revenue vs Expenses vs Labor siempre muestran los
// últimos 12 meses (ver dashboardMetrics.ts) y no se ven afectados por
// ninguno de los dos modos.
export const DashboardDateRangeSelect = ({ value, onChange }: DashboardDateRangeSelectProps) => {
  return (
    <div className="flex flex-wrap items-center gap-3">
      <div className="flex overflow-hidden rounded-lg border border-white/10">
        <button
          type="button"
          onClick={() => value.kind !== 'preset' && onChange({ kind: 'preset', key: 'this_month' })}
          className={modeButtonClass(value.kind === 'preset')}
        >
          Preset
        </button>
        <button
          type="button"
          onClick={() => value.kind !== 'quincena' && onChange({ kind: 'quincena', quincena: getQuincenaForDate() })}
          className={modeButtonClass(value.kind === 'quincena')}
        >
          Quincena
        </button>
      </div>

      {value.kind === 'preset' ? (
        <select
          value={value.key}
          onChange={(e) => onChange({ kind: 'preset', key: e.target.value as DashboardDateRangeKey })}
          className={selectClass}
        >
          {DASHBOARD_DATE_RANGE_OPTIONS.map((opt) => (
            <option key={opt.value} value={opt.value}>
              {opt.label}
            </option>
          ))}
        </select>
      ) : (
        <QuincenaPicker value={value.quincena} onChange={(quincena) => onChange({ kind: 'quincena', quincena })} />
      )}
    </div>
  )
}

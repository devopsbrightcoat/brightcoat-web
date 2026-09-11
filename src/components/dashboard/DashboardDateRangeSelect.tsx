import { DASHBOARD_DATE_RANGE_OPTIONS, type DashboardDateRangeKey } from '../../lib/dashboardMetrics'

type DashboardDateRangeSelectProps = {
  value: DashboardDateRangeKey
  onChange: (key: DashboardDateRangeKey) => void
}

const selectClass =
  'rounded-lg border border-white/10 bg-surface-alt px-3 py-2 text-sm text-ink-200 outline-none focus:border-gold-500'

// Filtro global de fecha del Dashboard — Últimos 15 días / Mes actual /
// Últimos 6 meses. Aplica a los KPIs, rankings y bloque de alertas;
// Revenue Trend y Revenue vs Expenses vs Labor siempre muestran los
// últimos 12 meses (ver dashboardMetrics.ts).
export const DashboardDateRangeSelect = ({ value, onChange }: DashboardDateRangeSelectProps) => {
  return (
    <select value={value} onChange={(e) => onChange(e.target.value as DashboardDateRangeKey)} className={selectClass}>
      {DASHBOARD_DATE_RANGE_OPTIONS.map((opt) => (
        <option key={opt.value} value={opt.value}>
          {opt.label}
        </option>
      ))}
    </select>
  )
}

import { useMemo, useState } from 'react'
import { DollarSign, Percent, TrendingDown, TrendingUp } from 'lucide-react'
import { Link } from 'react-router-dom'
import { Bar, BarChart, CartesianGrid, Line, LineChart, ResponsiveContainer, Tooltip, XAxis, YAxis } from 'recharts'
import { PageHeader } from '../../components/common/PageHeader'
import { StatCard } from '../../components/common/StatCard'
import { DashboardPanel } from '../../components/dashboard/DashboardPanel'
import { DashboardDateRangeSelect } from '../../components/dashboard/DashboardDateRangeSelect'
import { fetchExpenses } from '../../lib/api'
import {
  computeDateRange,
  computeExpensesByPeriod,
  computeMonthlyFinancials,
  filterExpensesByRange,
  previousPeriod,
  REVENUE_PERIOD_GRANULARITY_OPTIONS,
  type DashboardDateRangeKey,
  type RevenuePeriodGranularity,
} from '../../lib/dashboardMetrics'
import { useSupabaseQuery } from '../../lib/useSupabaseQuery'

const COLOR_ORANGE = '#d95926'

const currency = (value: number) =>
  value.toLocaleString('en-US', { style: 'currency', currency: 'USD', maximumFractionDigits: 0 })

const percent = (value: number) => `${value.toFixed(1)}%`

const chartTooltipStyle = {
  fontSize: 12,
  borderRadius: 8,
  background: '#1e1f25',
  border: '1px solid #ffffff1a',
  color: '#fff',
}

const axisTick = { fontSize: 12, fill: '#94a3b8' }

// Reportes › Gastos — tercera categoría de la hoja de ruta. "Detalle de
// gastos" (factura, fecha, descripción, monto) ya está cubierto por la
// pantalla Gastos existente, que además ya tiene su propio filtro de fecha
// — no se duplica acá. Esta pantalla agrega lo que faltaba: evolución del
// gasto por período con granularidad elegible, y la comparación mes actual
// vs. meses anteriores que el catálogo pide explícitamente.
export const ReportesGastos = () => {
  const [rangeKey, setRangeKey] = useState<DashboardDateRangeKey>('this_month')
  const [granularity, setGranularity] = useState<RevenuePeriodGranularity>('day')

  const { data: expenses, loading, error } = useSupabaseQuery(fetchExpenses, [])

  const range = useMemo(() => computeDateRange(rangeKey), [rangeKey])

  const periodExpenses = useMemo(() => filterExpensesByRange(expenses ?? [], range), [expenses, range])
  const total = useMemo(() => periodExpenses.reduce((sum, e) => sum + e.amount, 0), [periodExpenses])

  const previousTotal = useMemo(
    () => filterExpensesByRange(expenses ?? [], previousPeriod(range)).reduce((sum, e) => sum + e.amount, 0),
    [expenses, range],
  )
  const changePct = previousTotal > 0 ? ((total - previousTotal) / previousTotal) * 100 : null

  const monthlyTrend = useMemo(() => computeMonthlyFinancials([], expenses ?? [], []), [expenses])
  const monthlyAverage = useMemo(
    () => (monthlyTrend.length === 0 ? 0 : monthlyTrend.reduce((sum, m) => sum + m.expenses, 0) / monthlyTrend.length),
    [monthlyTrend],
  )

  const expensesByPeriod = useMemo(
    () => computeExpensesByPeriod(expenses ?? [], range, granularity),
    [expenses, range, granularity],
  )

  return (
    <div className="pb-10">
      <PageHeader
        title="Reportes · Gastos"
        subtitle="Evolución del gasto del negocio y comparación mensual"
        action={<DashboardDateRangeSelect value={rangeKey} onChange={setRangeKey} />}
      />

      {error ? (
        <p className="mx-8 mt-6 text-sm text-red-400">No se pudieron cargar los gastos: {error}</p>
      ) : loading ? (
        <p className="mx-8 mt-6 text-sm text-ink-500">Cargando…</p>
      ) : (
        <>
          <div className="grid grid-cols-2 gap-4 px-8 pt-6 sm:grid-cols-3">
            <StatCard label="Total del período" value={currency(total)} icon={DollarSign} />
            <StatCard
              label="Cambio vs. período anterior"
              value={changePct == null ? '—' : percent(changePct)}
              icon={changePct != null && changePct > 0 ? TrendingUp : TrendingDown}
              tone={changePct == null ? 'default' : changePct > 0 ? 'warn' : 'good'}
              hint={`Período anterior: ${currency(previousTotal)}`}
            />
            <StatCard label="Promedio mensual (12 meses)" value={currency(monthlyAverage)} icon={Percent} />
          </div>

          <div className="px-8 pt-6">
            <DashboardPanel
              title="Gastos por período"
              subtitle="Rango de fecha seleccionado arriba"
              action={
                <select
                  value={granularity}
                  onChange={(e) => setGranularity(e.target.value as RevenuePeriodGranularity)}
                  className="rounded-lg border border-white/10 bg-surface-alt px-3 py-2 text-sm text-ink-200 outline-none focus:border-gold-500"
                >
                  {REVENUE_PERIOD_GRANULARITY_OPTIONS.map((opt) => (
                    <option key={opt.value} value={opt.value}>
                      {opt.label}
                    </option>
                  ))}
                </select>
              }
            >
              {expensesByPeriod.length === 0 ? (
                <p className="py-6 text-center text-sm text-ink-500">No hay gastos en este período.</p>
              ) : (
                <div className="h-64">
                  <ResponsiveContainer width="100%" height="100%">
                    <LineChart data={expensesByPeriod} margin={{ left: -20, right: 10 }}>
                      <CartesianGrid strokeDasharray="3 3" stroke="#ffffff1a" />
                      <XAxis dataKey="label" tick={axisTick} axisLine={false} tickLine={false} />
                      <YAxis tick={axisTick} axisLine={false} tickLine={false} />
                      <Tooltip formatter={(value) => currency(Number(value))} contentStyle={chartTooltipStyle} />
                      <Line type="monotone" dataKey="total" name="Gastos" stroke={COLOR_ORANGE} strokeWidth={2} dot={false} />
                    </LineChart>
                  </ResponsiveContainer>
                </div>
              )}
            </DashboardPanel>
          </div>

          <div className="px-8 pt-6">
            <DashboardPanel
              title="Tendencia y comparación mensual"
              subtitle="Últimos 12 meses, independiente del rango de arriba"
            >
              <div className="h-72">
                <ResponsiveContainer width="100%" height="100%">
                  <BarChart data={monthlyTrend} margin={{ left: -20, right: 10 }}>
                    <CartesianGrid strokeDasharray="3 3" stroke="#ffffff1a" />
                    <XAxis dataKey="month" tick={axisTick} axisLine={false} tickLine={false} />
                    <YAxis tick={axisTick} axisLine={false} tickLine={false} />
                    <Tooltip formatter={(value) => currency(Number(value))} contentStyle={chartTooltipStyle} />
                    <Bar dataKey="expenses" name="Gastos" fill={COLOR_ORANGE} radius={[4, 4, 0, 0]} />
                  </BarChart>
                </ResponsiveContainer>
              </div>
            </DashboardPanel>
          </div>

          <p className="mx-8 mt-6 text-sm text-ink-400">
            El listado completo de gastos (factura, fecha, descripción y monto, con su propio filtro de fecha) ya
            está en{' '}
            <Link to="/finanzas/gastos" className="text-gold-400 hover:underline">
              Finanzas · Gastos
            </Link>
            .
          </p>
        </>
      )}
    </div>
  )
}

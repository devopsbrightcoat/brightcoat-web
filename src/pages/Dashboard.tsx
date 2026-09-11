import { useMemo, useState } from 'react'
import {
  AlertTriangle,
  Banknote,
  CalendarClock,
  CalendarDays,
  CheckCircle2,
  Clock,
  DollarSign,
  Percent,
  TrendingDown,
  TrendingUp,
  Wallet,
} from 'lucide-react'
import {
  Bar,
  BarChart,
  CartesianGrid,
  Legend,
  Line,
  LineChart,
  ResponsiveContainer,
  Tooltip,
  XAxis,
  YAxis,
} from 'recharts'
import { PageHeader } from '../components/common/PageHeader'
import { StatCard } from '../components/common/StatCard'
import { StatusPill } from '../components/common/StatusPill'
import { DashboardPanel } from '../components/dashboard/DashboardPanel'
import { DashboardDateRangeSelect } from '../components/dashboard/DashboardDateRangeSelect'
import { RankingBars } from '../components/dashboard/RankingBars'
import {
  fetchCharges,
  fetchEmployees,
  fetchExpenses,
  fetchPayrollEntries,
  fetchProperties,
  fetchSchedules,
  fetchServiceTypes,
} from '../lib/api'
import {
  computeAlerts,
  computeDateRange,
  computeEmployeeProductivity,
  computeKpis,
  computeMonthlyFinancials,
  computeOutstandingAging,
  computeOverdueSchedules,
  computeRevenueByProperty,
  computeRevenueByService,
  computeTodaySchedules,
  type DashboardDateRangeKey,
} from '../lib/dashboardMetrics'
import { useSupabaseQuery } from '../lib/useSupabaseQuery'

// Paleta categórica validada (dataviz skill, pasos "dark") — azul, naranja,
// aqua para las 3 series de Revenue vs Expenses vs Labor; dorado de marca
// para la línea única de Revenue Trend.
const COLOR_GOLD = '#e3a730'
const COLOR_BLUE = '#3987e5'
const COLOR_ORANGE = '#d95926'
const COLOR_AQUA = '#199e70'

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

export const Dashboard = () => {
  const [rangeKey, setRangeKey] = useState<DashboardDateRangeKey>('this_month')

  const { data: charges, loading: loadingCharges, error: errorCharges } = useSupabaseQuery(fetchCharges, [])
  const { data: expenses, loading: loadingExpenses, error: errorExpenses } = useSupabaseQuery(fetchExpenses, [])
  const { data: payrollEntries, loading: loadingPayroll, error: errorPayroll } = useSupabaseQuery(fetchPayrollEntries, [])
  const { data: schedules, loading: loadingSchedules, error: errorSchedules } = useSupabaseQuery(fetchSchedules, [])
  const { data: properties, loading: loadingProperties, error: errorProperties } = useSupabaseQuery(fetchProperties, [])
  const { data: employees, loading: loadingEmployees, error: errorEmployees } = useSupabaseQuery(fetchEmployees, [])
  const { data: serviceTypes, loading: loadingServiceTypes, error: errorServiceTypes } = useSupabaseQuery(fetchServiceTypes, [])

  const loading =
    loadingCharges || loadingExpenses || loadingPayroll || loadingSchedules || loadingProperties || loadingEmployees || loadingServiceTypes
  const error = errorCharges ?? errorExpenses ?? errorPayroll ?? errorSchedules ?? errorProperties ?? errorEmployees ?? errorServiceTypes

  const range = useMemo(() => computeDateRange(rangeKey), [rangeKey])

  const kpis = useMemo(
    () => computeKpis(charges ?? [], payrollEntries ?? [], expenses ?? [], schedules ?? [], range),
    [charges, payrollEntries, expenses, schedules, range],
  )

  const monthlyFinancials = useMemo(
    () => computeMonthlyFinancials(charges ?? [], expenses ?? [], payrollEntries ?? []),
    [charges, expenses, payrollEntries],
  )

  const revenueByService = useMemo(
    () => computeRevenueByService(charges ?? [], serviceTypes ?? [], range),
    [charges, serviceTypes, range],
  )

  const revenueByProperty = useMemo(
    () => computeRevenueByProperty(charges ?? [], properties ?? [], range),
    [charges, properties, range],
  )

  const employeeProductivity = useMemo(
    () => computeEmployeeProductivity(schedules ?? [], employees ?? [], range),
    [schedules, employees, range],
  )

  const todaySchedules = useMemo(() => computeTodaySchedules(schedules ?? []), [schedules])
  const overdueSchedules = useMemo(() => computeOverdueSchedules(schedules ?? []), [schedules])
  const outstandingAging = useMemo(() => computeOutstandingAging(charges ?? []), [charges])

  const alerts = useMemo(
    () => computeAlerts(charges ?? [], payrollEntries ?? [], expenses ?? [], properties ?? [], range, currency),
    [charges, payrollEntries, expenses, properties, range],
  )

  const propertyName = (id: string) => properties?.find((p) => p.id === id)?.name ?? '—'
  const serviceTypeName = (id: string) => serviceTypes?.find((s) => s.id === id)?.name ?? '—'
  const employeeName = (id: string) => employees?.find((e) => e.id === id)?.name ?? '—'

  const revenueDeltaPct =
    kpis.revenuePrevious > 0 ? ((kpis.revenue - kpis.revenuePrevious) / kpis.revenuePrevious) * 100 : null
  const revenueHint =
    revenueDeltaPct == null
      ? 'Sin datos del período anterior'
      : `${revenueDeltaPct >= 0 ? '+' : ''}${revenueDeltaPct.toFixed(0)}% vs período anterior`

  return (
    <div className="pb-10">
      <PageHeader
        title="Dashboard"
        subtitle="Resumen general del negocio"
        action={<DashboardDateRangeSelect value={rangeKey} onChange={setRangeKey} />}
      />

      {error ? (
        <p className="mx-8 mt-6 text-sm text-red-400">No se pudieron cargar los datos: {error}</p>
      ) : loading ? (
        <p className="mx-8 mt-6 text-sm text-ink-500">Cargando…</p>
      ) : (
        <>
          {/* Fila 1 — KPIs */}
          <div className="grid grid-cols-2 gap-4 px-8 pt-6 sm:grid-cols-3 xl:grid-cols-7">
            <StatCard label="Ingresos" value={currency(kpis.revenue)} icon={DollarSign} hint={revenueHint} />
            <StatCard label="Cobrado" value={currency(kpis.collected)} icon={Wallet} tone="good" />
            <StatCard label="Pendiente" value={currency(kpis.outstanding)} icon={Clock} tone="warn" />
            <StatCard label="Costo de mano de obra" value={currency(kpis.laborCost)} icon={Banknote} />
            <StatCard label="Gastos" value={currency(kpis.expenses)} icon={TrendingDown} />
            <StatCard
              label="Ganancia estimada"
              value={currency(kpis.estimatedProfit)}
              icon={TrendingUp}
              tone={kpis.estimatedProfit >= 0 ? 'good' : 'warn'}
            />
            <StatCard
              label="Margen de ganancia"
              value={kpis.profitMargin == null ? '—' : percent(kpis.profitMargin)}
              icon={Percent}
              tone={kpis.profitMargin == null ? 'default' : kpis.profitMargin < 15 ? 'warn' : 'good'}
            />
          </div>

          {/* Fila A — Tendencia de ingresos */}
          <div className="px-8 pt-6">
            <DashboardPanel title="Tendencia de ingresos" subtitle="Últimos 12 meses">
              <div className="h-72">
                <ResponsiveContainer width="100%" height="100%">
                  <LineChart data={monthlyFinancials} margin={{ left: -20, right: 10 }}>
                    <CartesianGrid strokeDasharray="3 3" stroke="#ffffff1a" />
                    <XAxis dataKey="month" tick={axisTick} axisLine={false} tickLine={false} />
                    <YAxis tick={axisTick} axisLine={false} tickLine={false} />
                    <Tooltip formatter={(value) => currency(Number(value))} contentStyle={chartTooltipStyle} />
                    <Line type="monotone" dataKey="revenue" name="Ingresos" stroke={COLOR_GOLD} strokeWidth={2} dot={false} />
                  </LineChart>
                </ResponsiveContainer>
              </div>
            </DashboardPanel>
          </div>

          {/* Fila B — Ingresos vs. gastos vs. mano de obra | Ingresos por servicio */}
          <div className="grid grid-cols-1 gap-4 px-8 pt-4 lg:grid-cols-2">
            <DashboardPanel title="Ingresos vs. gastos vs. mano de obra" subtitle="Últimos 12 meses">
              <div className="h-72">
                <ResponsiveContainer width="100%" height="100%">
                  <BarChart data={monthlyFinancials} margin={{ left: -20, right: 10 }}>
                    <CartesianGrid strokeDasharray="3 3" stroke="#ffffff1a" />
                    <XAxis dataKey="month" tick={axisTick} axisLine={false} tickLine={false} />
                    <YAxis tick={axisTick} axisLine={false} tickLine={false} />
                    <Tooltip formatter={(value) => currency(Number(value))} contentStyle={chartTooltipStyle} />
                    <Legend wrapperStyle={{ fontSize: 12, color: '#94a3b8' }} />
                    <Bar dataKey="revenue" name="Ingresos" fill={COLOR_BLUE} radius={[4, 4, 0, 0]} />
                    <Bar dataKey="expenses" name="Gastos" fill={COLOR_ORANGE} radius={[4, 4, 0, 0]} />
                    <Bar dataKey="labor" name="Mano de obra" fill={COLOR_AQUA} radius={[4, 4, 0, 0]} />
                  </BarChart>
                </ResponsiveContainer>
              </div>
            </DashboardPanel>

            <DashboardPanel title="Ingresos por servicio" subtitle="Período seleccionado">
              <RankingBars
                items={revenueByService.map((s) => ({ id: s.serviceTypeId ?? s.label, label: s.label, value: s.revenue }))}
                formatValue={currency}
                color={COLOR_GOLD}
                emptyText="No hay cobros en este período."
              />
            </DashboardPanel>
          </div>

          {/* Fila C — Ingresos por propiedad | Productividad de empleados */}
          <div className="grid grid-cols-1 gap-4 px-8 pt-4 lg:grid-cols-2">
            <DashboardPanel title="Ingresos por propiedad" subtitle="Top propiedades — período seleccionado">
              <RankingBars
                items={revenueByProperty.map((p) => ({ id: p.propertyId, label: p.name, value: p.revenue }))}
                formatValue={currency}
                color={COLOR_BLUE}
                emptyText="No hay cobros en este período."
              />
            </DashboardPanel>

            <DashboardPanel title="Productividad de empleados" subtitle="Trabajos completados — período seleccionado">
              <RankingBars
                items={employeeProductivity.map((e) => ({ id: e.employeeId, label: e.name, value: e.completedJobs }))}
                formatValue={(v) => String(v)}
                color={COLOR_AQUA}
                emptyText="No hay trabajos completados en este período."
              />
            </DashboardPanel>
          </div>

          {/* Fila D — Operativo */}
          <div className="grid grid-cols-1 gap-4 px-8 pt-4 lg:grid-cols-3">
            <DashboardPanel title="Trabajos de hoy" subtitle="Programación del día" action={<CalendarDays className="h-4 w-4 text-ink-500" />}>
              {todaySchedules.length === 0 ? (
                <p className="py-4 text-center text-sm text-ink-500">No hay trabajos programados para hoy.</p>
              ) : (
                <div className="space-y-3">
                  {todaySchedules.map((s) => (
                    <div key={s.id} className="flex items-start justify-between gap-3 border-b border-white/5 pb-3 last:border-0 last:pb-0">
                      <div className="min-w-0">
                        <p className="truncate text-sm text-ink-200">{propertyName(s.propertyId)}</p>
                        <p className="truncate text-xs text-ink-500">
                          {serviceTypeName(s.serviceTypeId)} · {employeeName(s.employeeId)}
                        </p>
                      </div>
                      <StatusPill status={s.status} />
                    </div>
                  ))}
                </div>
              )}
            </DashboardPanel>

            <DashboardPanel title="Trabajos atrasados" subtitle="Fecha programada ya pasada" action={<CalendarClock className="h-4 w-4 text-amber-400" />}>
              {overdueSchedules.length === 0 ? (
                <p className="py-4 text-center text-sm text-ink-500">No hay trabajos atrasados.</p>
              ) : (
                <div className="space-y-3">
                  {overdueSchedules.slice(0, 6).map((s) => (
                    <div key={s.id} className="flex items-start justify-between gap-3 border-b border-white/5 pb-3 last:border-0 last:pb-0">
                      <div className="min-w-0">
                        <p className="truncate text-sm text-ink-200">{propertyName(s.propertyId)}</p>
                        <p className="truncate text-xs text-ink-500">
                          {serviceTypeName(s.serviceTypeId)} · {employeeName(s.employeeId)} · {s.scheduledDate}
                        </p>
                      </div>
                      <StatusPill status={s.status} />
                    </div>
                  ))}
                  {overdueSchedules.length > 6 && (
                    <p className="text-xs text-ink-500">y {overdueSchedules.length - 6} más…</p>
                  )}
                </div>
              )}
            </DashboardPanel>

            <DashboardPanel title="Antigüedad de cobros pendientes" subtitle="Días desde que se generó el cobro">
              <div className="space-y-3">
                {outstandingAging.map((bucket) => (
                  <div key={bucket.label} className="flex items-center justify-between text-sm">
                    <span className="text-ink-300">{bucket.label}</span>
                    <span className="tabular-nums text-white">
                      {currency(bucket.amount)} <span className="text-ink-500">({bucket.count})</span>
                    </span>
                  </div>
                ))}
              </div>
            </DashboardPanel>
          </div>

          {/* Fila E — Alertas */}
          <div className="px-8 pt-4">
            <DashboardPanel title="Alertas" subtitle="Cosas que vale la pena revisar">
              {alerts.length === 0 ? (
                <div className="flex items-center gap-2 text-sm text-emerald-400">
                  <CheckCircle2 className="h-4 w-4" />
                  Todo en orden — no hay alertas activas.
                </div>
              ) : (
                <div className="grid grid-cols-1 gap-3 md:grid-cols-2">
                  {alerts.map((alert) => (
                    <div key={alert.key} className="flex items-start gap-3 rounded-lg bg-amber-500/10 p-3">
                      <AlertTriangle className="mt-0.5 h-4 w-4 shrink-0 text-amber-400" />
                      <div>
                        <p className="text-sm font-medium text-amber-300">{alert.title}</p>
                        <p className="mt-0.5 text-xs text-ink-300">{alert.detail}</p>
                      </div>
                    </div>
                  ))}
                </div>
              )}
            </DashboardPanel>
          </div>
        </>
      )}
    </div>
  )
}

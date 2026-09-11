import { useMemo, useState } from 'react'
import { Banknote, Clock, DollarSign, Percent, TrendingDown, TrendingUp, Wallet } from 'lucide-react'
import { Bar, BarChart, CartesianGrid, Legend, Line, LineChart, ResponsiveContainer, Tooltip, XAxis, YAxis } from 'recharts'
import {
  createColumnHelper,
  getCoreRowModel,
  getPaginationRowModel,
  getSortedRowModel,
  useReactTable,
  type SortingState,
} from '@tanstack/react-table'
import { PageHeader } from '../../components/common/PageHeader'
import { StatCard } from '../../components/common/StatCard'
import { DataTablePanel } from '../../components/common/DataTablePanel'
import { DashboardPanel } from '../../components/dashboard/DashboardPanel'
import { DashboardDateRangeSelect } from '../../components/dashboard/DashboardDateRangeSelect'
import { RankingBars } from '../../components/dashboard/RankingBars'
import { fetchCharges, fetchExpenses, fetchPayrollEntries, fetchProperties, fetchSchedules, fetchServiceTypes } from '../../lib/api'
import {
  computeDateRange,
  computeKpis,
  computeMonthlyFinancials,
  computePropertyProfitability,
  computeRevenueByPeriod,
  computeRevenueByService,
  REVENUE_PERIOD_GRANULARITY_OPTIONS,
  type DashboardDateRangeKey,
  type PropertyProfitability,
  type RevenuePeriodGranularity,
} from '../../lib/dashboardMetrics'
import { useSupabaseQuery } from '../../lib/useSupabaseQuery'

// Paleta idéntica a Dashboard.tsx — misma lectura visual en toda la app.
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

const PAGE_SIZE = 15

const columnHelper = createColumnHelper<PropertyProfitability>()

// Reportes › Financiero — primera categoría del módulo de Reportería (ver
// hoja de ruta acordada con David: Fase 1, categoría Financiero). Reutiliza
// las agregaciones ya construidas para el Dashboard (dashboardMetrics.ts)
// en vez de duplicar lógica — el Dashboard es la vista rápida de "todo el
// negocio ahora mismo" con rankings top-8, esta pantalla es la versión
// completa y filtrable por período para revisar a fondo. "Ingresos por
// propiedad" y "Ganancia estimada por propiedad" del catálogo de reportes
// se combinan en una sola tabla ordenable (computePropertyProfitability)
// en vez de dos paneles separados — son la misma agrupación con columnas
// distintas, no dos reportes distintos.
export const ReportesFinanciero = () => {
  const [rangeKey, setRangeKey] = useState<DashboardDateRangeKey>('this_month')
  const [periodGranularity, setPeriodGranularity] = useState<RevenuePeriodGranularity>('day')
  const [sorting, setSorting] = useState<SortingState>([{ id: 'revenue', desc: true }])
  const [pageIndex, setPageIndex] = useState(0)

  const { data: charges, loading: loadingCharges, error: errorCharges } = useSupabaseQuery(fetchCharges, [])
  const { data: expenses, loading: loadingExpenses, error: errorExpenses } = useSupabaseQuery(fetchExpenses, [])
  const { data: payrollEntries, loading: loadingPayroll, error: errorPayroll } = useSupabaseQuery(fetchPayrollEntries, [])
  const { data: schedules, loading: loadingSchedules, error: errorSchedules } = useSupabaseQuery(fetchSchedules, [])
  const { data: properties, loading: loadingProperties, error: errorProperties } = useSupabaseQuery(fetchProperties, [])
  const { data: serviceTypes, loading: loadingServiceTypes, error: errorServiceTypes } = useSupabaseQuery(fetchServiceTypes, [])

  const loading =
    loadingCharges || loadingExpenses || loadingPayroll || loadingSchedules || loadingProperties || loadingServiceTypes
  const error = errorCharges ?? errorExpenses ?? errorPayroll ?? errorSchedules ?? errorProperties ?? errorServiceTypes

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

  const revenueByPeriod = useMemo(
    () => computeRevenueByPeriod(charges ?? [], range, periodGranularity),
    [charges, range, periodGranularity],
  )

  const profitability = useMemo(
    () => computePropertyProfitability(charges ?? [], payrollEntries ?? [], properties ?? [], range),
    [charges, payrollEntries, properties, range],
  )
  const totalRevenue = useMemo(() => profitability.reduce((sum, p) => sum + p.revenue, 0), [profitability])

  const columns = useMemo(
    () => [
      columnHelper.accessor('name', { id: 'name', header: 'Propiedad' }),
      columnHelper.accessor('revenue', {
        id: 'revenue',
        header: 'Ingresos',
        cell: (info) => <span className="tabular-nums">{currency(info.getValue())}</span>,
      }),
      columnHelper.accessor((row) => (totalRevenue > 0 ? (row.revenue / totalRevenue) * 100 : 0), {
        id: 'share',
        header: '% del total',
        cell: (info) => <span className="tabular-nums text-ink-400">{percent(info.getValue())}</span>,
      }),
      columnHelper.accessor('laborCost', {
        id: 'laborCost',
        header: 'Costo laboral',
        cell: (info) => <span className="tabular-nums">{currency(info.getValue())}</span>,
      }),
      columnHelper.accessor('estimatedProfit', {
        id: 'estimatedProfit',
        header: 'Ganancia estimada',
        cell: (info) => (
          <span className={`tabular-nums font-semibold ${info.getValue() >= 0 ? 'text-emerald-400' : 'text-red-400'}`}>
            {currency(info.getValue())}
          </span>
        ),
      }),
      columnHelper.accessor('margin', {
        id: 'margin',
        header: 'Margen',
        cell: (info) => {
          const value = info.getValue()
          return <span className="tabular-nums">{value == null ? '—' : percent(value)}</span>
        },
      }),
    ],
    [totalRevenue],
  )

  const pageCount = Math.max(1, Math.ceil(profitability.length / PAGE_SIZE))
  const currentPageIndex = Math.min(pageIndex, pageCount - 1)

  const table = useReactTable({
    data: profitability,
    columns,
    state: { sorting, pagination: { pageIndex: currentPageIndex, pageSize: PAGE_SIZE } },
    onSortingChange: setSorting,
    onPaginationChange: (updater) => {
      const current = { pageIndex: currentPageIndex, pageSize: PAGE_SIZE }
      const next = typeof updater === 'function' ? updater(current) : updater
      setPageIndex(next.pageIndex)
    },
    getCoreRowModel: getCoreRowModel(),
    getSortedRowModel: getSortedRowModel(),
    getPaginationRowModel: getPaginationRowModel(),
  })

  const tableState = loading ? 'loading' : error ? 'error' : profitability.length === 0 ? 'empty' : 'ready'
  const tableMessage = loading
    ? 'Cargando…'
    : error
      ? `No se pudieron cargar los datos: ${error}`
      : 'No hay cobros ni planillas en este período.'

  return (
    <div className="pb-10">
      <PageHeader
        title="Reportes · Financiero"
        subtitle="Resumen financiero, ingresos y rentabilidad por propiedad"
        action={<DashboardDateRangeSelect value={rangeKey} onChange={setRangeKey} />}
      />

      {error ? (
        <p className="mx-8 mt-6 text-sm text-red-400">No se pudieron cargar los datos: {error}</p>
      ) : loading ? (
        <p className="mx-8 mt-6 text-sm text-ink-500">Cargando…</p>
      ) : (
        <>
          <div className="grid grid-cols-2 gap-4 px-8 pt-6 sm:grid-cols-3 xl:grid-cols-7">
            <StatCard label="Ingresos" value={currency(kpis.revenue)} icon={DollarSign} />
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

          <div className="px-8 pt-6">
            <DashboardPanel
              title="Ingresos por período"
              subtitle="Rango de fecha seleccionado arriba"
              action={
                <select
                  value={periodGranularity}
                  onChange={(e) => setPeriodGranularity(e.target.value as RevenuePeriodGranularity)}
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
              {revenueByPeriod.length === 0 ? (
                <p className="py-6 text-center text-sm text-ink-500">No hay cobros en este período.</p>
              ) : (
                <div className="h-64">
                  <ResponsiveContainer width="100%" height="100%">
                    <LineChart data={revenueByPeriod} margin={{ left: -20, right: 10 }}>
                      <CartesianGrid strokeDasharray="3 3" stroke="#ffffff1a" />
                      <XAxis dataKey="label" tick={axisTick} axisLine={false} tickLine={false} />
                      <YAxis tick={axisTick} axisLine={false} tickLine={false} />
                      <Tooltip formatter={(value) => currency(Number(value))} contentStyle={chartTooltipStyle} />
                      <Line type="monotone" dataKey="revenue" name="Ingresos" stroke={COLOR_GOLD} strokeWidth={2} dot={false} />
                    </LineChart>
                  </ResponsiveContainer>
                </div>
              )}
            </DashboardPanel>
          </div>

          <div className="grid grid-cols-1 gap-4 px-8 pt-6 lg:grid-cols-2">
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

            <DashboardPanel title="Ingresos por tipo de servicio" subtitle="Período seleccionado">
              <RankingBars
                items={revenueByService.map((s) => ({ id: s.serviceTypeId ?? s.label, label: s.label, value: s.revenue }))}
                formatValue={currency}
                color={COLOR_GOLD}
                emptyText="No hay cobros en este período."
              />
            </DashboardPanel>
          </div>

          <p className="mx-8 mt-6 text-xs text-ink-500">
            Ganancia estimada = ingresos de la propiedad − su costo de planilla. No reparte los gastos generales del
            negocio, que no están asociados a una propiedad específica en el modelo actual.
          </p>

          <DataTablePanel
            title="Rentabilidad por propiedad"
            table={table}
            page={currentPageIndex + 1}
            totalPages={pageCount}
            onPageChange={(p) => setPageIndex(p - 1)}
            state={tableState}
            message={tableMessage}
          />
        </>
      )}
    </div>
  )
}

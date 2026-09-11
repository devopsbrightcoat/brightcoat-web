import { useMemo, useRef, useState } from 'react'
import {
  AlertTriangle,
  CheckCircle2,
  Clock,
  RotateCcw,
  TrendingDown,
  TrendingUp,
  Wallet,
  XCircle,
} from 'lucide-react'
import { Bar, BarChart, CartesianGrid, Line, LineChart, ResponsiveContainer, Tooltip, XAxis, YAxis } from 'recharts'
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
import { RankingBars } from '../../components/dashboard/RankingBars'
import { StatusPill } from '../../components/common/StatusPill'
import { fetchCharges, fetchEmployees, fetchProperties, fetchSchedules, fetchServiceTypes } from '../../lib/api'
import {
  computeEmployeeActivity,
  computeOverdueSchedules,
  computePropertyActivity,
  computeScheduleActivity,
  computeScheduleStatusBreakdown,
  computeServiceTypeActivity,
  SCHEDULE_ACTIVITY_GRANULARITY_OPTIONS,
  type EmployeeActivity,
  type PropertyActivity,
  type ScheduleActivityGranularity,
  type ServiceTypeActivity,
} from '../../lib/dashboardMetrics'
import { useSupabaseQuery } from '../../lib/useSupabaseQuery'
import type { Charge, Schedule } from '../../types'

const COLOR_GOLD = '#e3a730'

const currency = (value: number) =>
  value.toLocaleString('en-US', { style: 'currency', currency: 'USD', maximumFractionDigits: 0 })

const chartTooltipStyle = {
  fontSize: 12,
  borderRadius: 8,
  background: '#1e1f25',
  border: '1px solid #ffffff1a',
  color: '#fff',
}

const axisTick = { fontSize: 12, fill: '#94a3b8' }

const PAGE_SIZE = 15

type PropertyFilterKey = 'all' | 'active' | 'inactive'

const PROPERTY_FILTER_OPTIONS: { value: PropertyFilterKey; label: string }[] = [
  { value: 'all', label: 'Todas' },
  { value: 'active', label: 'Activas' },
  { value: 'inactive', label: 'Inactivas' },
]

const propertyActivityColumnHelper = createColumnHelper<PropertyActivity>()
const employeeActivityColumnHelper = createColumnHelper<EmployeeActivity>()
const serviceActivityColumnHelper = createColumnHelper<ServiceTypeActivity>()
const chargeColumnHelper = createColumnHelper<Charge>()
const scheduleColumnHelper = createColumnHelper<Schedule>()

// Reportes › Operaciones — categoría "Operaciones y Propiedades" del
// catálogo de reportería, que el cliente marcó "móvil primero" (ya
// construida en ops-mobile). Esta es la versión web de las mismas 5
// métricas, reutilizando computeScheduleStatusBreakdown/computeScheduleActivity/
// computePropertyActivity/computeEmployeeActivity/computeServiceTypeActivity
// de dashboardMetrics.ts (puerto de la misma lógica que ya usa móvil, no
// una reimplementación distinta). "Historial financiero de propiedad" no es
// una ruta aparte acá — es la última sección de esta misma página, con un
// selector de propiedad que también se puede fijar haciendo clic en una
// fila de "Actividad por propiedad".
export const ReportesOperaciones = () => {
  const [granularity, setGranularity] = useState<ScheduleActivityGranularity>('week')
  const [propertyFilter, setPropertyFilter] = useState<PropertyFilterKey>('all')
  const [selectedPropertyId, setSelectedPropertyId] = useState('all')

  const [propertySorting, setPropertySorting] = useState<SortingState>([{ id: 'count', desc: true }])
  const [propertyPageIndex, setPropertyPageIndex] = useState(0)
  const [employeeSorting, setEmployeeSorting] = useState<SortingState>([{ id: 'count', desc: true }])
  const [employeePageIndex, setEmployeePageIndex] = useState(0)
  const [serviceSorting, setServiceSorting] = useState<SortingState>([{ id: 'count', desc: true }])
  const [servicePageIndex, setServicePageIndex] = useState(0)
  const [chargeSorting, setChargeSorting] = useState<SortingState>([{ id: 'date', desc: true }])
  const [chargePageIndex, setChargePageIndex] = useState(0)
  const [scheduleSorting, setScheduleSorting] = useState<SortingState>([{ id: 'date', desc: true }])
  const [schedulePageIndex, setSchedulePageIndex] = useState(0)

  const detailRef = useRef<HTMLDivElement>(null)

  const { data: schedules, loading: loadingSchedules, error: errorSchedules } = useSupabaseQuery(fetchSchedules, [])
  const { data: properties, loading: loadingProperties, error: errorProperties } = useSupabaseQuery(fetchProperties, [])
  const { data: employees, loading: loadingEmployees, error: errorEmployees } = useSupabaseQuery(fetchEmployees, [])
  const { data: serviceTypes, loading: loadingServiceTypes, error: errorServiceTypes } = useSupabaseQuery(
    fetchServiceTypes,
    [],
  )
  const { data: charges, loading: loadingCharges, error: errorCharges } = useSupabaseQuery(fetchCharges, [])

  const loading = loadingSchedules || loadingProperties || loadingEmployees || loadingServiceTypes || loadingCharges
  const error = errorSchedules ?? errorProperties ?? errorEmployees ?? errorServiceTypes ?? errorCharges

  // --- Trabajos por estatus -------------------------------------------------
  const breakdown = useMemo(() => computeScheduleStatusBreakdown(schedules ?? []), [schedules])
  const overdueCount = useMemo(() => computeOverdueSchedules(schedules ?? []).length, [schedules])
  const activity = useMemo(() => computeScheduleActivity(schedules ?? [], granularity), [schedules, granularity])

  const countOf = (status: string) => breakdown.find((b) => b.status === status)?.count ?? 0
  const pendingCount = countOf('pending') + countOf('in_progress')
  const completedCount = countOf('delivered')
  const cancelledCount = countOf('cancelled')
  const rescheduledCount = countOf('rescheduled')

  // --- Actividad por propiedad ----------------------------------------------
  const propertyActivity = useMemo(() => {
    const all = computePropertyActivity(schedules ?? [], properties ?? [])
    return propertyFilter === 'all' ? all : all.filter((r) => r.status === propertyFilter)
  }, [schedules, properties, propertyFilter])

  const propertyColumns = useMemo(
    () => [
      propertyActivityColumnHelper.accessor('name', { id: 'name', header: 'Propiedad' }),
      propertyActivityColumnHelper.accessor('status', {
        id: 'status',
        header: 'Estatus',
        cell: (info) => <StatusPill status={info.getValue()} />,
      }),
      propertyActivityColumnHelper.accessor('count', { id: 'count', header: 'Trabajos' }),
    ],
    [],
  )
  const propertyPageCount = Math.max(1, Math.ceil(propertyActivity.length / PAGE_SIZE))
  const propertyCurrentPageIndex = Math.min(propertyPageIndex, propertyPageCount - 1)
  const propertyTable = useReactTable({
    data: propertyActivity,
    columns: propertyColumns,
    state: { sorting: propertySorting, pagination: { pageIndex: propertyCurrentPageIndex, pageSize: PAGE_SIZE } },
    onSortingChange: setPropertySorting,
    onPaginationChange: (updater) => {
      const current = { pageIndex: propertyCurrentPageIndex, pageSize: PAGE_SIZE }
      const next = typeof updater === 'function' ? updater(current) : updater
      setPropertyPageIndex(next.pageIndex)
    },
    getCoreRowModel: getCoreRowModel(),
    getSortedRowModel: getSortedRowModel(),
    getPaginationRowModel: getPaginationRowModel(),
  })

  // --- Actividad por empleado ------------------------------------------------
  const employeeActivity = useMemo(() => computeEmployeeActivity(schedules ?? [], employees ?? []), [schedules, employees])

  const employeeColumns = useMemo(
    () => [
      employeeActivityColumnHelper.accessor('name', { id: 'name', header: 'Empleado' }),
      employeeActivityColumnHelper.accessor('status', {
        id: 'status',
        header: 'Estatus',
        cell: (info) => <StatusPill status={info.getValue()} />,
      }),
      employeeActivityColumnHelper.accessor('count', { id: 'count', header: 'Trabajos totales' }),
      employeeActivityColumnHelper.accessor('completed', { id: 'completed', header: 'Completados' }),
      employeeActivityColumnHelper.accessor('pending', { id: 'pending', header: 'Pendientes/en proceso' }),
    ],
    [],
  )
  const employeePageCount = Math.max(1, Math.ceil(employeeActivity.length / PAGE_SIZE))
  const employeeCurrentPageIndex = Math.min(employeePageIndex, employeePageCount - 1)
  const employeeTable = useReactTable({
    data: employeeActivity,
    columns: employeeColumns,
    state: { sorting: employeeSorting, pagination: { pageIndex: employeeCurrentPageIndex, pageSize: PAGE_SIZE } },
    onSortingChange: setEmployeeSorting,
    onPaginationChange: (updater) => {
      const current = { pageIndex: employeeCurrentPageIndex, pageSize: PAGE_SIZE }
      const next = typeof updater === 'function' ? updater(current) : updater
      setEmployeePageIndex(next.pageIndex)
    },
    getCoreRowModel: getCoreRowModel(),
    getSortedRowModel: getSortedRowModel(),
    getPaginationRowModel: getPaginationRowModel(),
  })

  // --- Servicios realizados ---------------------------------------------------
  const serviceActivity = useMemo(
    () => computeServiceTypeActivity(schedules ?? [], serviceTypes ?? [], properties ?? []),
    [schedules, serviceTypes, properties],
  )

  const serviceColumns = useMemo(
    () => [
      serviceActivityColumnHelper.accessor('name', { id: 'name', header: 'Servicio' }),
      serviceActivityColumnHelper.accessor('count', { id: 'count', header: 'Trabajos' }),
      serviceActivityColumnHelper.accessor(
        (row) => (row.byProperty.length === 0 ? '—' : row.byProperty.map((bp) => `${bp.name} (${bp.count})`).join(', ')),
        { id: 'byProperty', header: 'Top propiedades' },
      ),
    ],
    [],
  )
  const servicePageCount = Math.max(1, Math.ceil(serviceActivity.length / PAGE_SIZE))
  const serviceCurrentPageIndex = Math.min(servicePageIndex, servicePageCount - 1)
  const serviceTable = useReactTable({
    data: serviceActivity,
    columns: serviceColumns,
    state: { sorting: serviceSorting, pagination: { pageIndex: serviceCurrentPageIndex, pageSize: PAGE_SIZE } },
    onSortingChange: setServiceSorting,
    onPaginationChange: (updater) => {
      const current = { pageIndex: serviceCurrentPageIndex, pageSize: PAGE_SIZE }
      const next = typeof updater === 'function' ? updater(current) : updater
      setServicePageIndex(next.pageIndex)
    },
    getCoreRowModel: getCoreRowModel(),
    getSortedRowModel: getSortedRowModel(),
    getPaginationRowModel: getPaginationRowModel(),
  })

  // --- Historial financiero de propiedad --------------------------------------
  const propertyName = (id: string) => properties?.find((p) => p.id === id)?.name ?? '—'
  const serviceTypeName = (id: string) => serviceTypes?.find((s) => s.id === id)?.name ?? '—'
  const employeeName = (id: string) => employees?.find((e) => e.id === id)?.name ?? 'Sin asignar'

  const filteredCharges = useMemo(
    () =>
      (charges ?? [])
        .filter((c) => selectedPropertyId === 'all' || c.propertyId === selectedPropertyId)
        .sort((a, b) => (b.generatedDate ?? '').localeCompare(a.generatedDate ?? '')),
    [charges, selectedPropertyId],
  )
  const filteredSchedules = useMemo(
    () =>
      (schedules ?? [])
        .filter((s) => selectedPropertyId === 'all' || s.propertyId === selectedPropertyId)
        .sort((a, b) => b.scheduledDate.localeCompare(a.scheduledDate)),
    [schedules, selectedPropertyId],
  )
  const totalRevenue = filteredCharges.reduce((sum, c) => sum + c.amount, 0)
  const collected = filteredCharges.filter((c) => c.status === 'paid').reduce((sum, c) => sum + c.amount, 0)
  const outstanding = filteredCharges.filter((c) => c.status === 'pending').reduce((sum, c) => sum + c.amount, 0)

  const chargeColumns = useMemo(
    () => [
      chargeColumnHelper.accessor((row) => propertyName(row.propertyId), { id: 'property', header: 'Propiedad' }),
      chargeColumnHelper.accessor((row) => row.description || '—', { id: 'description', header: 'Descripción' }),
      chargeColumnHelper.accessor((row) => row.generatedDate || '—', { id: 'date', header: 'Fecha' }),
      chargeColumnHelper.accessor('amount', {
        id: 'amount',
        header: 'Monto',
        cell: (info) => <span className="tabular-nums">{currency(info.getValue())}</span>,
      }),
      chargeColumnHelper.accessor('status', {
        id: 'status',
        header: 'Estatus',
        cell: (info) => <StatusPill status={info.getValue()} />,
      }),
    ],
    [properties],
  )
  const chargePageCount = Math.max(1, Math.ceil(filteredCharges.length / PAGE_SIZE))
  const chargeCurrentPageIndex = Math.min(chargePageIndex, chargePageCount - 1)
  const chargeTable = useReactTable({
    data: filteredCharges,
    columns: chargeColumns,
    state: { sorting: chargeSorting, pagination: { pageIndex: chargeCurrentPageIndex, pageSize: PAGE_SIZE } },
    onSortingChange: setChargeSorting,
    onPaginationChange: (updater) => {
      const current = { pageIndex: chargeCurrentPageIndex, pageSize: PAGE_SIZE }
      const next = typeof updater === 'function' ? updater(current) : updater
      setChargePageIndex(next.pageIndex)
    },
    getCoreRowModel: getCoreRowModel(),
    getSortedRowModel: getSortedRowModel(),
    getPaginationRowModel: getPaginationRowModel(),
  })

  const scheduleColumns = useMemo(
    () => [
      scheduleColumnHelper.accessor((row) => propertyName(row.propertyId), { id: 'property', header: 'Propiedad' }),
      scheduleColumnHelper.accessor((row) => serviceTypeName(row.serviceTypeId), { id: 'service', header: 'Servicio' }),
      scheduleColumnHelper.accessor((row) => employeeName(row.employeeId), { id: 'employee', header: 'Empleado' }),
      scheduleColumnHelper.accessor('scheduledDate', { id: 'date', header: 'Fecha' }),
      scheduleColumnHelper.accessor('status', {
        id: 'status',
        header: 'Estatus',
        cell: (info) => <StatusPill status={info.getValue()} />,
      }),
    ],
    [properties, serviceTypes, employees],
  )
  const schedulePageCount = Math.max(1, Math.ceil(filteredSchedules.length / PAGE_SIZE))
  const scheduleCurrentPageIndex = Math.min(schedulePageIndex, schedulePageCount - 1)
  const scheduleTable = useReactTable({
    data: filteredSchedules,
    columns: scheduleColumns,
    state: { sorting: scheduleSorting, pagination: { pageIndex: scheduleCurrentPageIndex, pageSize: PAGE_SIZE } },
    onSortingChange: setScheduleSorting,
    onPaginationChange: (updater) => {
      const current = { pageIndex: scheduleCurrentPageIndex, pageSize: PAGE_SIZE }
      const next = typeof updater === 'function' ? updater(current) : updater
      setSchedulePageIndex(next.pageIndex)
    },
    getCoreRowModel: getCoreRowModel(),
    getSortedRowModel: getSortedRowModel(),
    getPaginationRowModel: getPaginationRowModel(),
  })

  const handleSelectProperty = (row: PropertyActivity) => {
    setSelectedPropertyId(row.propertyId)
    detailRef.current?.scrollIntoView({ behavior: 'smooth', block: 'start' })
  }

  const activityChartData = activity.length > 0 ? activity : []

  const tableState = (rows: unknown[]): 'loading' | 'error' | 'empty' | 'ready' =>
    loading ? 'loading' : error ? 'error' : rows.length === 0 ? 'empty' : 'ready'
  const tableMessage = (emptyText: string): string =>
    loading ? 'Cargando…' : error ? `No se pudieron cargar los datos: ${error}` : emptyText

  return (
    <div className="pb-10">
      <PageHeader title="Reportes · Operaciones" subtitle="Trabajos, actividad por propiedad y por empleado, servicios realizados" />

      {error ? (
        <p className="mx-8 mt-6 text-sm text-red-400">No se pudieron cargar los datos: {error}</p>
      ) : loading ? (
        <p className="mx-8 mt-6 text-sm text-ink-500">Cargando…</p>
      ) : (
        <>
          {/* Trabajos por estatus */}
          <div className="grid grid-cols-2 gap-4 px-8 pt-6 sm:grid-cols-5">
            <StatCard label="Completados" value={String(completedCount)} icon={CheckCircle2} tone="good" />
            <StatCard label="Pendientes" value={String(pendingCount)} icon={Clock} tone="warn" />
            <StatCard label="Cancelados" value={String(cancelledCount)} icon={XCircle} />
            <StatCard
              label="Atrasados"
              value={String(overdueCount)}
              icon={AlertTriangle}
              tone={overdueCount > 0 ? 'warn' : 'default'}
            />
            <StatCard label="Reagendados" value={String(rescheduledCount)} icon={RotateCcw} />
          </div>

          <div className="px-8 pt-6">
            <DashboardPanel
              title="Evolución de trabajos"
              subtitle="Cantidad de trabajos agendados por período"
              action={
                <select
                  value={granularity}
                  onChange={(e) => setGranularity(e.target.value as ScheduleActivityGranularity)}
                  className="rounded-lg border border-white/10 bg-surface-alt px-3 py-2 text-sm text-ink-200 outline-none focus:border-gold-500"
                >
                  {SCHEDULE_ACTIVITY_GRANULARITY_OPTIONS.map((opt) => (
                    <option key={opt.value} value={opt.value}>
                      {opt.label}
                    </option>
                  ))}
                </select>
              }
            >
              {activityChartData.length === 0 ? (
                <p className="py-6 text-center text-sm text-ink-500">No hay trabajos en este período.</p>
              ) : (
                <div className="h-64">
                  <ResponsiveContainer width="100%" height="100%">
                    <LineChart data={activityChartData} margin={{ left: -20, right: 10 }}>
                      <CartesianGrid strokeDasharray="3 3" stroke="#ffffff1a" />
                      <XAxis dataKey="label" tick={axisTick} axisLine={false} tickLine={false} />
                      <YAxis tick={axisTick} axisLine={false} tickLine={false} allowDecimals={false} />
                      <Tooltip formatter={(value) => `${value} trabajos`} contentStyle={chartTooltipStyle} />
                      <Line type="monotone" dataKey="count" name="Trabajos" stroke={COLOR_GOLD} strokeWidth={2} dot={false} />
                    </LineChart>
                  </ResponsiveContainer>
                </div>
              )}
            </DashboardPanel>
          </div>

          {/* Actividad por propiedad */}
          <div className="mx-8 mt-10 flex flex-wrap items-center justify-between gap-3">
            <p className="text-sm text-ink-400">
              Actividad por propiedad — clic en una fila para ver su historial financiero abajo
            </p>
            <select
              value={propertyFilter}
              onChange={(e) => setPropertyFilter(e.target.value as PropertyFilterKey)}
              className="rounded-lg border border-white/10 bg-surface-alt px-3 py-2 text-sm text-ink-200 outline-none focus:border-gold-500"
            >
              {PROPERTY_FILTER_OPTIONS.map((opt) => (
                <option key={opt.value} value={opt.value}>
                  {opt.label}
                </option>
              ))}
            </select>
          </div>
          <DataTablePanel
            title="Actividad por propiedad"
            table={propertyTable}
            page={propertyCurrentPageIndex + 1}
            totalPages={propertyPageCount}
            onPageChange={(p) => setPropertyPageIndex(p - 1)}
            state={tableState(propertyActivity)}
            message={tableMessage('No hay propiedades con estos filtros.')}
            onRowClick={handleSelectProperty}
          />

          {/* Actividad por empleado */}
          <div className="mx-8 mt-10">
            <DashboardPanel title="Distribución de carga de trabajo" subtitle="Trabajos asignados por empleado">
              <RankingBars
                items={employeeActivity.map((e) => ({ id: e.employeeId, label: e.name, value: e.count }))}
                formatValue={(v) => `${v} trabajo${v === 1 ? '' : 's'}`}
                color={COLOR_GOLD}
                emptyText="No hay empleados con trabajos asignados."
              />
            </DashboardPanel>
          </div>
          <p className="mx-8 mt-6 text-sm text-ink-400">Actividad por empleado</p>
          <DataTablePanel
            title="Actividad por empleado"
            table={employeeTable}
            page={employeeCurrentPageIndex + 1}
            totalPages={employeePageCount}
            onPageChange={(p) => setEmployeePageIndex(p - 1)}
            state={tableState(employeeActivity)}
            message={tableMessage('No hay empleados con trabajos asignados.')}
          />

          {/* Servicios realizados */}
          <div className="px-8 pt-10">
            <DashboardPanel title="Trabajos por tipo de servicio" subtitle="Cantidad de trabajos, todo el historial">
              {serviceActivity.length === 0 ? (
                <p className="py-6 text-center text-sm text-ink-500">No hay trabajos registrados.</p>
              ) : (
                <div className="h-64">
                  <ResponsiveContainer width="100%" height="100%">
                    <BarChart data={serviceActivity} margin={{ left: -20, right: 10 }}>
                      <CartesianGrid strokeDasharray="3 3" stroke="#ffffff1a" />
                      <XAxis dataKey="name" tick={axisTick} axisLine={false} tickLine={false} />
                      <YAxis tick={axisTick} axisLine={false} tickLine={false} allowDecimals={false} />
                      <Tooltip formatter={(value) => `${value} trabajos`} contentStyle={chartTooltipStyle} />
                      <Bar dataKey="count" name="Trabajos" fill={COLOR_GOLD} radius={[4, 4, 0, 0]} />
                    </BarChart>
                  </ResponsiveContainer>
                </div>
              )}
            </DashboardPanel>
          </div>
          <p className="mx-8 mt-6 text-sm text-ink-400">Servicios realizados — desglose por propiedad (top 5 por tipo)</p>
          <DataTablePanel
            title="Servicios realizados"
            table={serviceTable}
            page={serviceCurrentPageIndex + 1}
            totalPages={servicePageCount}
            onPageChange={(p) => setServicePageIndex(p - 1)}
            state={tableState(serviceActivity)}
            message={tableMessage('No hay trabajos registrados.')}
          />

          {/* Historial financiero de propiedad */}
          <div ref={detailRef} className="mx-8 mt-10 flex flex-wrap items-center justify-between gap-3">
            <p className="text-sm text-ink-400">Historial financiero de propiedad — ingresos, cobros y trabajos</p>
            <select
              value={selectedPropertyId}
              onChange={(e) => setSelectedPropertyId(e.target.value)}
              className="rounded-lg border border-white/10 bg-surface-alt px-3 py-2 text-sm text-ink-200 outline-none focus:border-gold-500"
            >
              <option value="all">Todas las propiedades</option>
              {(properties ?? []).map((p) => (
                <option key={p.id} value={p.id}>
                  {p.name}
                </option>
              ))}
            </select>
          </div>

          <div className="grid grid-cols-2 gap-4 px-8 pt-6 sm:grid-cols-3">
            <StatCard label="Ingresos" value={currency(totalRevenue)} icon={TrendingUp} tone="good" />
            <StatCard label="Cobrado" value={currency(collected)} icon={Wallet} tone="good" />
            <StatCard label="Pendiente" value={currency(outstanding)} icon={TrendingDown} tone="warn" />
          </div>

          <p className="mx-8 mt-6 text-sm text-ink-400">Cobros</p>
          <DataTablePanel
            title="Cobros"
            table={chargeTable}
            page={chargeCurrentPageIndex + 1}
            totalPages={chargePageCount}
            onPageChange={(p) => setChargePageIndex(p - 1)}
            state={tableState(filteredCharges)}
            message={tableMessage('Sin cobros registrados.')}
          />

          <p className="mx-8 mt-6 text-sm text-ink-400">Trabajos</p>
          <DataTablePanel
            title="Trabajos"
            table={scheduleTable}
            page={scheduleCurrentPageIndex + 1}
            totalPages={schedulePageCount}
            onPageChange={(p) => setSchedulePageIndex(p - 1)}
            state={tableState(filteredSchedules)}
            message={tableMessage('Sin trabajos registrados.')}
          />
        </>
      )}
    </div>
  )
}

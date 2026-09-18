import { useMemo, useState } from 'react'
import { Banknote, CheckCircle2, Clock, DollarSign, Download, TrendingUp, Users } from 'lucide-react'
import { Link } from 'react-router-dom'
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
import { ReportDateRangeBar } from '../../components/dashboard/ReportDateRangeBar'
import { useReferenceData } from '../../contexts/ReferenceDataContext'
import { fetchPayrollEntries } from '../../lib/api'
import { getErrorMessage } from '../../lib/errors'
import { exportPayrollToExcel } from '../../lib/exportPayroll'
import {
  computePayrollByEmployee,
  computePayrollByProperty,
  computePendingPayroll,
  filterPayrollByRange,
  type DateRange,
  type PayrollGroupSummary,
  type PendingPayrollRow,
} from '../../lib/dashboardMetrics'
import { formatFullDate } from '../../lib/scheduleDates'
import { taxOnAmount, SALES_TAX_RATE } from '../../lib/tax'
import { useSupabaseQuery } from '../../lib/useSupabaseQuery'
import type { PayrollEntry } from '../../types'

const currency = (value: number) =>
  value.toLocaleString('en-US', { style: 'currency', currency: 'USD', maximumFractionDigits: 2 })

const PAGE_SIZE = 10

const inputClass =
  'rounded-lg border border-white/10 bg-surface-alt px-3 py-2 text-sm text-white outline-none focus:border-gold-500'
const labelClass = 'mb-1 block text-xs font-medium text-ink-500'

const groupColumnHelper = createColumnHelper<PayrollGroupSummary>()
const pendingColumnHelper = createColumnHelper<PendingPayrollRow>()

type DetailRow = PayrollEntry & { sales: number; profit: number | null; tax: number | null }
const detailColumnHelper = createColumnHelper<DetailRow>()

const buildGroupColumns = (nameHeader: string) => [
  groupColumnHelper.accessor('name', { id: 'name', header: nameHeader }),
  groupColumnHelper.accessor('totalPaid', {
    id: 'totalPaid',
    header: 'Total pagado',
    cell: (info) => <span className="tabular-nums font-semibold text-white">{currency(info.getValue())}</span>,
  }),
  groupColumnHelper.accessor('paidCount', { id: 'paidCount', header: 'Planillas pagadas' }),
  groupColumnHelper.accessor('pendingCount', {
    id: 'pendingCount',
    header: 'Pendientes',
    cell: (info) => {
      const value = info.getValue()
      return <span className={value > 0 ? 'text-amber-400' : 'text-ink-500'}>{value}</span>
    },
  }),
]

const PROPERTY_COLUMNS = buildGroupColumns('Propiedad')
const EMPLOYEE_COLUMNS = buildGroupColumns('Empleado')

const PENDING_COLUMNS = [
  pendingColumnHelper.accessor('date', { id: 'date', header: 'Fecha' }),
  pendingColumnHelper.accessor('propertyName', { id: 'property', header: 'Propiedad' }),
  pendingColumnHelper.accessor((row) => row.unitLabel || '—', { id: 'unit', header: 'Unidad' }),
  pendingColumnHelper.accessor('employeeName', { id: 'employee', header: 'Empleado' }),
  pendingColumnHelper.accessor('serviceName', { id: 'service', header: 'Servicio' }),
  pendingColumnHelper.accessor('sales', {
    id: 'sales',
    header: 'Pago',
    cell: (info) => <span className="tabular-nums text-emerald-400">{currency(info.getValue())}</span>,
  }),
]

export const ReportesPlanilla = () => {
  const [employeeId, setEmployeeId] = useState('all')
  const [appliedRange, setAppliedRange] = useState<DateRange | null>(null)
  const [propertySorting, setPropertySorting] = useState<SortingState>([{ id: 'totalPaid', desc: true }])
  const [propertyPageIndex, setPropertyPageIndex] = useState(0)
  const [employeeSorting, setEmployeeSorting] = useState<SortingState>([{ id: 'totalPaid', desc: true }])
  const [employeePageIndex, setEmployeePageIndex] = useState(0)
  const [pendingSorting, setPendingSorting] = useState<SortingState>([{ id: 'date', desc: true }])
  const [pendingPageIndex, setPendingPageIndex] = useState(0)
  const [detailSorting, setDetailSorting] = useState<SortingState>([{ id: 'date', desc: true }])
  const [detailPageIndex, setDetailPageIndex] = useState(0)
  const [exporting, setExporting] = useState(false)
  const [exportError, setExportError] = useState<string | null>(null)

  const { data: entries, loading: loadingEntries, error: errorEntries } = useSupabaseQuery(fetchPayrollEntries, [])
  const { properties, loadingProperties, errorProperties, employees, loadingEmployees, errorEmployees } = useReferenceData()

  const loading = loadingEntries || loadingProperties || loadingEmployees
  const error = errorEntries ?? errorProperties ?? errorEmployees

  const range = appliedRange ?? { start: '', end: '' }

  const employeeFilteredEntries = useMemo(
    () => (employeeId === 'all' ? entries ?? [] : (entries ?? []).filter((e) => e.employeeId === employeeId)),
    [entries, employeeId],
  )

  const periodEntries = useMemo(() => filterPayrollByRange(employeeFilteredEntries, range), [employeeFilteredEntries, range])
  const totalPaid = useMemo(
    () => periodEntries.filter((e) => e.amount != null).reduce((sum, e) => sum + (e.amount as number), 0),
    [periodEntries],
  )
  const paidCount = useMemo(() => periodEntries.filter((e) => e.amount != null).length, [periodEntries])
  const pendingCountPeriod = useMemo(() => periodEntries.filter((e) => e.amount == null).length, [periodEntries])

  const byProperty = useMemo(
    () => computePayrollByProperty(employeeFilteredEntries, properties ?? [], range),
    [employeeFilteredEntries, properties, range],
  )
  const byEmployee = useMemo(
    () => computePayrollByEmployee(employeeFilteredEntries, employees ?? [], range),
    [employeeFilteredEntries, employees, range],
  )
  const pendingAll = useMemo(
    () => computePendingPayroll(employeeFilteredEntries, properties ?? [], employees ?? []),
    [employeeFilteredEntries, properties, employees],
  )

  const detailRows = useMemo<DetailRow[]>(
    () =>
      periodEntries
        .map((e) => {
          const sales = e.items.reduce((sum, item) => sum + item.amount, 0)
          return {
            ...e,
            sales,
            profit: e.amount == null ? null : e.amount - sales,
            tax: e.amount == null ? null : taxOnAmount(e.amount),
          }
        })
        .sort((a, b) => b.date.localeCompare(a.date)),
    [periodEntries],
  )

  // Desglose financiero: cuánto se cobró a las propiedades, cuánto se le pagó a los
  // empleados por ese mismo trabajo ya cobrado, y la ganancia que queda entre ambos.
  const pagadoEmpleados = useMemo(
    () => detailRows.filter((r) => r.amount != null).reduce((sum, r) => sum + r.sales, 0),
    [detailRows],
  )
  const gananciaTotal = useMemo(() => detailRows.reduce((sum, r) => sum + (r.profit ?? 0), 0), [detailRows])
  const pagoPendienteCobro = useMemo(
    () => detailRows.filter((r) => r.amount == null).reduce((sum, r) => sum + r.sales, 0),
    [detailRows],
  )

  const propertyName = (id: string) => properties?.find((p) => p.id === id)?.name ?? '—'
  const employeeNameOf = (id: string) => employees?.find((e) => e.id === id)?.name ?? '—'

  const DETAIL_COLUMNS = useMemo(
    () => [
      detailColumnHelper.accessor((row) => formatFullDate(row.date), { id: 'date', header: 'Fecha' }),
      detailColumnHelper.accessor((row) => propertyName(row.propertyId), { id: 'property', header: 'Propiedad' }),
      detailColumnHelper.accessor((row) => row.unitLabel || '—', { id: 'unit', header: 'Unidad' }),
      detailColumnHelper.accessor((row) => employeeNameOf(row.employeeId), { id: 'employee', header: 'Empleado' }),
      detailColumnHelper.accessor('serviceName', { id: 'service', header: 'Servicio' }),
      detailColumnHelper.accessor('amount', {
        id: 'amount',
        header: 'Cobro',
        cell: (info) => {
          const value = info.getValue()
          return value == null ? (
            <span className="text-ink-500">Pendiente</span>
          ) : (
            <span className="tabular-nums">{currency(value)}</span>
          )
        },
      }),
      detailColumnHelper.accessor('tax', {
        id: 'tax',
        header: `Impuesto (${(SALES_TAX_RATE * 100).toFixed(2)}%)`,
        cell: (info) => {
          if (!info.row.original.taxable) return <span className="text-ink-500">—</span>
          const value = info.getValue()
          return value == null ? (
            <span className="text-ink-500">Pendiente</span>
          ) : (
            <span className="tabular-nums text-gold-400">{currency(value)}</span>
          )
        },
      }),
      detailColumnHelper.accessor('sales', {
        id: 'sales',
        header: 'Pago',
        cell: (info) => <span className="tabular-nums text-emerald-400">{currency(info.getValue())}</span>,
      }),
      detailColumnHelper.accessor('profit', {
        id: 'profit',
        header: 'Ganancia',
        cell: (info) => {
          const value = info.getValue()
          if (value == null) return <span className="text-ink-500">Pendiente</span>
          return <span className={`tabular-nums ${value < 0 ? 'text-red-400' : 'text-gold-400'}`}>{currency(value)}</span>
        },
      }),
    ],
    [properties, employees],
  )

  const propertyPageCount = Math.max(1, Math.ceil(byProperty.length / PAGE_SIZE))
  const propertyCurrentPageIndex = Math.min(propertyPageIndex, propertyPageCount - 1)
  const propertyTable = useReactTable({
    data: byProperty,
    columns: PROPERTY_COLUMNS,
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

  const employeePageCount = Math.max(1, Math.ceil(byEmployee.length / PAGE_SIZE))
  const employeeCurrentPageIndex = Math.min(employeePageIndex, employeePageCount - 1)
  const employeeTable = useReactTable({
    data: byEmployee,
    columns: EMPLOYEE_COLUMNS,
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

  const pendingPageCount = Math.max(1, Math.ceil(pendingAll.length / PAGE_SIZE))
  const pendingCurrentPageIndex = Math.min(pendingPageIndex, pendingPageCount - 1)
  const pendingTable = useReactTable({
    data: pendingAll,
    columns: PENDING_COLUMNS,
    state: { sorting: pendingSorting, pagination: { pageIndex: pendingCurrentPageIndex, pageSize: PAGE_SIZE } },
    onSortingChange: setPendingSorting,
    onPaginationChange: (updater) => {
      const current = { pageIndex: pendingCurrentPageIndex, pageSize: PAGE_SIZE }
      const next = typeof updater === 'function' ? updater(current) : updater
      setPendingPageIndex(next.pageIndex)
    },
    getCoreRowModel: getCoreRowModel(),
    getSortedRowModel: getSortedRowModel(),
    getPaginationRowModel: getPaginationRowModel(),
  })

  const detailPageCount = Math.max(1, Math.ceil(detailRows.length / PAGE_SIZE))
  const detailCurrentPageIndex = Math.min(detailPageIndex, detailPageCount - 1)
  const detailTable = useReactTable({
    data: detailRows,
    columns: DETAIL_COLUMNS,
    state: { sorting: detailSorting, pagination: { pageIndex: detailCurrentPageIndex, pageSize: PAGE_SIZE } },
    onSortingChange: setDetailSorting,
    onPaginationChange: (updater) => {
      const current = { pageIndex: detailCurrentPageIndex, pageSize: PAGE_SIZE }
      const next = typeof updater === 'function' ? updater(current) : updater
      setDetailPageIndex(next.pageIndex)
    },
    getCoreRowModel: getCoreRowModel(),
    getSortedRowModel: getSortedRowModel(),
    getPaginationRowModel: getPaginationRowModel(),
  })

  const handleExport = async () => {
    setExporting(true)
    setExportError(null)
    try {
      await exportPayrollToExcel(detailRows, properties ?? [], employees ?? [])
    } catch (err) {
      setExportError(getErrorMessage(err, 'No se pudo generar el Excel.'))
    } finally {
      setExporting(false)
    }
  }

  const propertyState = loading ? 'loading' : error ? 'error' : byProperty.length === 0 ? 'empty' : 'ready'
  const employeeState = loading ? 'loading' : error ? 'error' : byEmployee.length === 0 ? 'empty' : 'ready'
  const pendingState = loading ? 'loading' : error ? 'error' : pendingAll.length === 0 ? 'empty' : 'ready'
  const detailState = loading ? 'loading' : error ? 'error' : detailRows.length === 0 ? 'empty' : 'ready'
  const baseMessage = loading ? 'Cargando…' : error ? `No se pudieron cargar las planillas: ${error}` : null

  return (
    <div className="pb-10">
      <PageHeader
        title="Reportes · Planilla"
        subtitle="Planilla por período, por propiedad, por empleado y pendiente de pago"
      />

      <div className="mx-8 mt-6 flex flex-wrap items-end gap-3">
        <div>
          <label htmlFor="planilla-report-employee" className={labelClass}>
            Empleado
          </label>
          <select
            id="planilla-report-employee"
            value={employeeId}
            onChange={(e) => setEmployeeId(e.target.value)}
            className={inputClass}
          >
            <option value="all">Todos los empleados</option>
            {(employees ?? []).map((emp) => (
              <option key={emp.id} value={emp.id}>
                {emp.name}
              </option>
            ))}
          </select>
        </div>
      </div>

      <ReportDateRangeBar onGenerate={setAppliedRange} generated={appliedRange !== null} />

      {!appliedRange ? (
        <p className="mx-8 mt-10 text-center text-sm text-ink-500">
          Elige un rango de fechas y dale "Generar reporte" para ver la información.
        </p>
      ) : error ? (
        <p className="mx-8 mt-6 text-sm text-red-400">No se pudieron cargar las planillas: {error}</p>
      ) : loading ? (
        <p className="mx-8 mt-6 text-sm text-ink-500">Cargando…</p>
      ) : (
        <>
          <div className="grid grid-cols-1 gap-4 px-8 pt-6 sm:grid-cols-3">
            <StatCard
              label="Cobrado a propiedades"
              value={currency(totalPaid)}
              icon={TrendingUp}
              tone="good"
              hint={`${paidCount} planilla${paidCount === 1 ? '' : 's'} ya cobrada${paidCount === 1 ? '' : 's'}`}
            />
            <StatCard
              label="Pagado a empleados"
              value={currency(pagadoEmpleados)}
              icon={Banknote}
              hint={
                pagoPendienteCobro > 0
                  ? `+ ${currency(pagoPendienteCobro)} pendiente de cobro (total: ${currency(pagadoEmpleados + pagoPendienteCobro)})`
                  : 'Por el trabajo ya cobrado en el período'
              }
              hintTone={pagoPendienteCobro > 0 ? 'warn' : 'default'}
            />
            <StatCard
              label="Ganancia"
              value={currency(gananciaTotal)}
              icon={DollarSign}
              tone={gananciaTotal >= 0 ? 'good' : 'warn'}
              hint="Cobrado a propiedades − pagado a empleados"
            />
          </div>

          <div className="grid grid-cols-1 gap-4 px-8 pt-4 sm:grid-cols-3">
            <StatCard label="Planillas pagadas" value={String(paidCount)} icon={CheckCircle2} size="compact" />
            <StatCard label="Pendientes en el período" value={String(pendingCountPeriod)} icon={Clock} tone="warn" size="compact" />
            <StatCard label="Pendientes (todo el tiempo)" value={String(pendingAll.length)} icon={Users} tone="warn" size="compact" />
          </div>

          <p className="mx-8 mt-6 text-sm text-ink-400">Planilla por propiedad — período seleccionado arriba</p>
          <DataTablePanel
            title="Planilla por propiedad"
            table={propertyTable}
            page={propertyCurrentPageIndex + 1}
            totalPages={propertyPageCount}
            onPageChange={(p) => setPropertyPageIndex(p - 1)}
            state={propertyState}
            message={baseMessage ?? 'No hay planillas en este período.'}
          />

          <p className="mx-8 mt-6 text-sm text-ink-400">Planilla por empleado — período seleccionado arriba</p>
          <DataTablePanel
            title="Planilla por empleado"
            table={employeeTable}
            page={employeeCurrentPageIndex + 1}
            totalPages={employeePageCount}
            onPageChange={(p) => setEmployeePageIndex(p - 1)}
            state={employeeState}
            message={baseMessage ?? 'No hay planillas en este período.'}
          />

          <p className="mx-8 mt-6 text-sm text-ink-400">
            Planilla pendiente — trabajo ya hecho cuyo cobro todavía no se ha definido (toda la cartera, no solo
            el período seleccionado arriba)
          </p>
          <DataTablePanel
            title="Planilla pendiente"
            table={pendingTable}
            page={pendingCurrentPageIndex + 1}
            totalPages={pendingPageCount}
            onPageChange={(p) => setPendingPageIndex(p - 1)}
            state={pendingState}
            message={baseMessage ?? 'No hay planillas pendientes de pago.'}
          />

          <div className="mx-8 mt-6 flex flex-wrap items-center justify-between gap-3">
            <p className="text-sm text-ink-400">
              Detalle completo — cada planilla individual del período, con desglose de cobro, impuesto, pago y ganancia
            </p>
            <button
              type="button"
              disabled={exporting || detailRows.length === 0}
              onClick={handleExport}
              className="flex items-center gap-2 rounded-lg border border-white/10 px-3.5 py-2 text-sm font-medium text-ink-300 hover:bg-white/5 disabled:opacity-60"
            >
              <Download className="h-4 w-4" />
              {exporting ? 'Generando…' : 'Exportar a Excel'}
            </button>
          </div>
          {exportError && <p className="mx-8 mt-2 text-sm text-red-400">{exportError}</p>}
          <DataTablePanel
            title="Detalle completo"
            table={detailTable}
            page={detailCurrentPageIndex + 1}
            totalPages={detailPageCount}
            onPageChange={(p) => setDetailPageIndex(p - 1)}
            state={detailState}
            message={baseMessage ?? 'No hay planillas en este período.'}
          />

          <p className="mx-8 mt-6 text-sm text-ink-400">
            Para editar, eliminar o dar seguimiento planilla por planilla, ve a{' '}
            <Link to="/planillas" className="text-gold-400 hover:underline">
              Finanzas · Planillas
            </Link>
            .
          </p>
        </>
      )}
    </div>
  )
}

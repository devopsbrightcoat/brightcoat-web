import { useMemo, useState } from 'react'
import { Banknote, CheckCircle2, Clock, Users } from 'lucide-react'
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
import { DashboardDateRangeSelect } from '../../components/dashboard/DashboardDateRangeSelect'
import { fetchEmployees, fetchPayrollEntries, fetchProperties } from '../../lib/api'
import {
  computeDateRange,
  computePayrollByEmployee,
  computePayrollByProperty,
  computePendingPayroll,
  filterPayrollByRange,
  type DashboardDateRangeKey,
  type PayrollGroupSummary,
  type PendingPayrollRow,
} from '../../lib/dashboardMetrics'
import { useSupabaseQuery } from '../../lib/useSupabaseQuery'

const currency = (value: number) =>
  value.toLocaleString('en-US', { style: 'currency', currency: 'USD', maximumFractionDigits: 0 })

const PAGE_SIZE = 10

const groupColumnHelper = createColumnHelper<PayrollGroupSummary>()
const pendingColumnHelper = createColumnHelper<PendingPayrollRow>()

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
    header: 'Ventas',
    cell: (info) => <span className="tabular-nums text-emerald-400">{currency(info.getValue())}</span>,
  }),
]

// Reportes › Planilla — cuarta categoría de la hoja de ruta. Planillas.tsx
// ya deja ver/filtrar planilla por propiedad, por empleado y por fecha una
// por una (con Ventas/Ganancia por fila) — no se duplica acá. Lo nuevo son
// los dos reportes agregados que esa pantalla no puede armar sola: el total
// pagado agrupado por cada dimensión, y una vista dedicada de "trabajo
// hecho, pago sin definir" (hoy solo se ve fila por fila como "Pendiente").
export const ReportesPlanilla = () => {
  const [rangeKey, setRangeKey] = useState<DashboardDateRangeKey>('this_month')
  const [propertySorting, setPropertySorting] = useState<SortingState>([{ id: 'totalPaid', desc: true }])
  const [propertyPageIndex, setPropertyPageIndex] = useState(0)
  const [employeeSorting, setEmployeeSorting] = useState<SortingState>([{ id: 'totalPaid', desc: true }])
  const [employeePageIndex, setEmployeePageIndex] = useState(0)
  const [pendingSorting, setPendingSorting] = useState<SortingState>([{ id: 'date', desc: true }])
  const [pendingPageIndex, setPendingPageIndex] = useState(0)

  const { data: entries, loading: loadingEntries, error: errorEntries } = useSupabaseQuery(fetchPayrollEntries, [])
  const { data: properties, loading: loadingProperties, error: errorProperties } = useSupabaseQuery(fetchProperties, [])
  const { data: employees, loading: loadingEmployees, error: errorEmployees } = useSupabaseQuery(fetchEmployees, [])

  const loading = loadingEntries || loadingProperties || loadingEmployees
  const error = errorEntries ?? errorProperties ?? errorEmployees

  const range = useMemo(() => computeDateRange(rangeKey), [rangeKey])

  const periodEntries = useMemo(() => filterPayrollByRange(entries ?? [], range), [entries, range])
  const totalPaid = useMemo(
    () => periodEntries.filter((e) => e.amount != null).reduce((sum, e) => sum + (e.amount as number), 0),
    [periodEntries],
  )
  const paidCount = useMemo(() => periodEntries.filter((e) => e.amount != null).length, [periodEntries])
  const pendingCountPeriod = useMemo(() => periodEntries.filter((e) => e.amount == null).length, [periodEntries])

  const byProperty = useMemo(
    () => computePayrollByProperty(entries ?? [], properties ?? [], range),
    [entries, properties, range],
  )
  const byEmployee = useMemo(
    () => computePayrollByEmployee(entries ?? [], employees ?? [], range),
    [entries, employees, range],
  )
  const pendingAll = useMemo(
    () => computePendingPayroll(entries ?? [], properties ?? [], employees ?? []),
    [entries, properties, employees],
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

  const propertyState = loading ? 'loading' : error ? 'error' : byProperty.length === 0 ? 'empty' : 'ready'
  const employeeState = loading ? 'loading' : error ? 'error' : byEmployee.length === 0 ? 'empty' : 'ready'
  const pendingState = loading ? 'loading' : error ? 'error' : pendingAll.length === 0 ? 'empty' : 'ready'
  const baseMessage = loading ? 'Cargando…' : error ? `No se pudieron cargar las planillas: ${error}` : null

  return (
    <div className="pb-10">
      <PageHeader
        title="Reportes · Planilla"
        subtitle="Planilla por período, por propiedad, por empleado y pendiente de pago"
        action={<DashboardDateRangeSelect value={rangeKey} onChange={setRangeKey} />}
      />

      {error ? (
        <p className="mx-8 mt-6 text-sm text-red-400">No se pudieron cargar las planillas: {error}</p>
      ) : loading ? (
        <p className="mx-8 mt-6 text-sm text-ink-500">Cargando…</p>
      ) : (
        <>
          <div className="grid grid-cols-2 gap-4 px-8 pt-6 sm:grid-cols-4">
            <StatCard label="Total pagado" value={currency(totalPaid)} icon={Banknote} tone="good" />
            <StatCard label="Planillas pagadas" value={String(paidCount)} icon={CheckCircle2} />
            <StatCard label="Pendientes en el período" value={String(pendingCountPeriod)} icon={Clock} tone="warn" />
            <StatCard label="Pendientes (todo el tiempo)" value={String(pendingAll.length)} icon={Users} tone="warn" />
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
            Planilla pendiente — trabajo ya hecho cuyo pago todavía no se definió (toda la cartera, no solo el
            período seleccionado arriba)
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

          <p className="mx-8 mt-6 text-sm text-ink-400">
            El listado completo por planilla individual (con desglose de ventas y ganancia, y filtro por propiedad,
            empleado o fecha) ya está en{' '}
            <Link to="/finanzas/planillas" className="text-gold-400 hover:underline">
              Finanzas · Planillas
            </Link>
            .
          </p>
        </>
      )}
    </div>
  )
}

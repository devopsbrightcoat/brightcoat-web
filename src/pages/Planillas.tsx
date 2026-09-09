import { useMemo, useState } from 'react'
import { Download, Filter, Pencil, Plus, Search, TrendingUp } from 'lucide-react'
import {
  createColumnHelper,
  getCoreRowModel,
  getPaginationRowModel,
  getSortedRowModel,
  useReactTable,
  type SortingState,
} from '@tanstack/react-table'
import { PageHeader } from '../components/common/PageHeader'
import { StatCard } from '../components/common/StatCard'
import { DataTablePanel } from '../components/common/DataTablePanel'
import { AddPayrollEntryModal } from '../components/pagos/AddPayrollEntryModal'
import { EditPayrollEntryModal } from '../components/pagos/EditPayrollEntryModal'
import { PayrollEntryDetailModal } from '../components/pagos/PayrollEntryDetailModal'
import { PayrollFiltersModal } from '../components/pagos/PayrollFiltersModal'
import { fetchEmployees, fetchPayrollEntries, fetchProperties } from '../lib/api'
import { useSupabaseQuery } from '../lib/useSupabaseQuery'
import { formatFullDate } from '../lib/scheduleDates'
import { exportPayrollToExcel } from '../lib/exportPayroll'
import { getErrorMessage } from '../lib/errors'
import type { PayrollEntry } from '../types'

const currency = (value: number) =>
  value.toLocaleString('en-US', { style: 'currency', currency: 'USD', maximumFractionDigits: 0 })

const PAGE_SIZE = 15

type PayrollRow = PayrollEntry & { sales: number; profit: number }

const columnHelper = createColumnHelper<PayrollRow>()

// Planillas — pago de mano de obra por trabajo completo (propiedad + unidad
// + empleado + servicio, todos obligatorios). Cada planilla trae un
// desglose del servicio (payroll_entry_items): descripción + costo de cada
// sub-servicio. Ventas (suma del desglose) y Ganancia (Ventas - Pago) se
// calculan aquí, no se guardan — ver 20260918000000_payroll_service_breakdown.sql.
// La carga por Excel se ocultó (Excel import ya no aplica a Planillas — el
// desglose solo se captura a mano desde la app), y el filtro/búsqueda sigue
// el mismo patrón de searchbar + modal de Filtros que Cobros/Gastos.
export const Planillas = () => {
  const [refreshKey, setRefreshKey] = useState(0)
  const [searchText, setSearchText] = useState('')
  const [propertyId, setPropertyId] = useState('all')
  const [employeeId, setEmployeeId] = useState('all')
  const [dateFrom, setDateFrom] = useState('')
  const [dateTo, setDateTo] = useState('')
  const [filtersOpen, setFiltersOpen] = useState(false)
  const [addOpen, setAddOpen] = useState(false)
  const [editingEntry, setEditingEntry] = useState<PayrollEntry | null>(null)
  const [detailEntry, setDetailEntry] = useState<PayrollEntry | null>(null)
  const [sorting, setSorting] = useState<SortingState>([])
  const [pageIndex, setPageIndex] = useState(0)
  const [exporting, setExporting] = useState(false)
  const [exportError, setExportError] = useState<string | null>(null)

  const { data: entries, loading: loadingEntries, error } = useSupabaseQuery(fetchPayrollEntries, [refreshKey])
  const { data: properties, loading: loadingProperties } = useSupabaseQuery(fetchProperties, [refreshKey])
  const { data: employees, loading: loadingEmployees } = useSupabaseQuery(fetchEmployees, [refreshKey])

  const filtered = useMemo(() => {
    const q = searchText.trim().toLowerCase()
    const rows: PayrollRow[] = (entries ?? [])
      .filter((e) => propertyId === 'all' || e.propertyId === propertyId)
      .filter((e) => employeeId === 'all' || e.employeeId === employeeId)
      .filter((e) => !dateFrom || e.date >= dateFrom)
      .filter((e) => !dateTo || e.date <= dateTo)
      .filter((e) => {
        if (!q) return true
        const propertyName = properties?.find((p) => p.id === e.propertyId)?.name ?? ''
        const employeeName = employees?.find((emp) => emp.id === e.employeeId)?.name ?? ''
        const itemsText = e.items.map((item) => item.description).join(' ')
        const haystack = [propertyName, e.unitLabel, employeeName, e.serviceName, itemsText]
          .filter(Boolean)
          .join(' ')
          .toLowerCase()
        return haystack.includes(q)
      })
      .map((e) => {
        const sales = e.items.reduce((sum, item) => sum + item.amount, 0)
        return { ...e, sales, profit: sales - e.amount }
      })
    return rows
  }, [entries, properties, employees, propertyId, employeeId, dateFrom, dateTo, searchText])

  const activeFilterCount =
    (propertyId !== 'all' ? 1 : 0) + (employeeId !== 'all' ? 1 : 0) + (dateFrom ? 1 : 0) + (dateTo ? 1 : 0)

  const totalSales = filtered.reduce((sum, e) => sum + e.sales, 0)
  const totalProfit = filtered.reduce((sum, e) => sum + e.profit, 0)

  const handleExport = async () => {
    setExporting(true)
    setExportError(null)
    try {
      await exportPayrollToExcel(filtered, properties ?? [], employees ?? [])
    } catch (err) {
      setExportError(getErrorMessage(err, 'No se pudo generar el Excel.'))
    } finally {
      setExporting(false)
    }
  }

  const columns = useMemo(
    () => [
      columnHelper.accessor((row) => formatFullDate(row.date), { id: 'date', header: 'Fecha' }),
      columnHelper.accessor((row) => properties?.find((p) => p.id === row.propertyId)?.name ?? '—', {
        id: 'property',
        header: 'Propiedad',
      }),
      columnHelper.accessor('unitLabel', { id: 'unit', header: 'Unidad' }),
      columnHelper.accessor((row) => employees?.find((e) => e.id === row.employeeId)?.name ?? '—', {
        id: 'employee',
        header: 'Empleado',
      }),
      columnHelper.accessor('serviceName', { id: 'service', header: 'Servicio' }),
      columnHelper.accessor('amount', {
        id: 'amount',
        header: 'Pago',
        cell: (info) => <span className="tabular-nums">{currency(info.getValue())}</span>,
      }),
      columnHelper.accessor('sales', {
        id: 'sales',
        header: 'Ventas',
        cell: (info) => <span className="tabular-nums text-emerald-400">{currency(info.getValue())}</span>,
      }),
      columnHelper.accessor('profit', {
        id: 'profit',
        header: 'Ganancia',
        cell: (info) => {
          const value = info.getValue()
          return <span className={`tabular-nums ${value < 0 ? 'text-red-400' : 'text-gold-400'}`}>{currency(value)}</span>
        },
      }),
      columnHelper.display({
        id: 'actions',
        header: '',
        cell: (info) => (
          <button
            type="button"
            onClick={(e) => {
              e.stopPropagation()
              setEditingEntry(info.row.original)
            }}
            className="flex items-center gap-1.5 rounded-lg border border-white/10 px-2.5 py-1.5 text-xs font-medium text-ink-300 hover:bg-white/5"
          >
            <Pencil className="h-3.5 w-3.5" />
            Editar
          </button>
        ),
      }),
    ],
    [properties, employees],
  )

  const pageCount = Math.max(1, Math.ceil(filtered.length / PAGE_SIZE))
  const currentPageIndex = Math.min(pageIndex, pageCount - 1)

  const table = useReactTable({
    data: filtered,
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

  // Las columnas dependen de properties/employees, no solo de entries — hay
  // que esperar las tres consultas para no pintar la tabla con nombres
  // vacíos que aparecen un instante después.
  const loading = loadingEntries || loadingProperties || loadingEmployees
  const tableState = loading ? 'loading' : error ? 'error' : filtered.length === 0 ? 'empty' : 'ready'
  const tableMessage = loading
    ? 'Cargando planillas…'
    : error
      ? `No se pudieron cargar las planillas: ${error}`
      : 'Ninguna planilla con estos filtros.'

  return (
    <div className="h-screen overflow-hidden flex flex-col">
      <PageHeader
        title="Planillas"
        subtitle="Pago de mano de obra por servicio, con desglose y ganancia"
        action={
          <button
            type="button"
            onClick={() => setAddOpen(true)}
            className="flex items-center gap-2 rounded-lg bg-gold-500 px-3.5 py-2 text-sm font-semibold text-brand-900 transition hover:bg-gold-400"
          >
            <Plus className="h-4 w-4" />
            Agregar planilla
          </button>
        }
      />

      <div className="mx-8 mt-6 flex flex-wrap items-center justify-between gap-3">
        <div className="relative max-w-sm flex-1 min-w-[220px]">
          <Search className="pointer-events-none absolute left-3 top-1/2 h-4 w-4 -translate-y-1/2 text-ink-500" />
          <input
            type="text"
            value={searchText}
            onChange={(e) => setSearchText(e.target.value)}
            placeholder="Buscar por propiedad, unidad, empleado o servicio…"
            className="w-full rounded-lg border border-white/10 bg-surface-alt py-2 pl-9 pr-3 text-sm text-ink-200 placeholder:text-ink-500"
          />
        </div>

        <div className="flex items-center gap-3">
          <button
            type="button"
            onClick={() => setFiltersOpen(true)}
            className="flex items-center gap-2 rounded-lg border border-white/10 bg-surface-alt px-3.5 py-2 text-sm font-medium text-ink-300 hover:bg-white/5"
          >
            <Filter className="h-4 w-4" />
            Filtros
            {activeFilterCount > 0 && (
              <span className="flex h-5 w-5 items-center justify-center rounded-full bg-gold-500 text-xs font-semibold text-brand-900">
                {activeFilterCount}
              </span>
            )}
          </button>

          <button
            type="button"
            disabled={exporting || filtered.length === 0}
            onClick={handleExport}
            className="flex items-center gap-2 rounded-lg border border-white/10 px-3.5 py-2 text-sm font-medium text-ink-300 hover:bg-white/5 disabled:opacity-60"
          >
            <Download className="h-4 w-4" />
            {exporting ? 'Generando…' : 'Exportar a Excel'}
          </button>
        </div>
      </div>

      {exportError && <p className="mx-8 mt-3 text-sm text-red-400">{exportError}</p>}

      <div className="mx-8 mt-4 grid grid-cols-1 gap-4 sm:grid-cols-3 lg:max-w-2xl">
        <StatCard label="Ventas" value={currency(totalSales)} icon={TrendingUp} tone="good" />
        <StatCard label="Ganancia" value={currency(totalProfit)} icon={TrendingUp} />
        <StatCard label="Registros" value={String(filtered.length)} icon={TrendingUp} />
      </div>

      <DataTablePanel
        title="Planillas"
        table={table}
        page={currentPageIndex + 1}
        totalPages={pageCount}
        onPageChange={(p) => setPageIndex(p - 1)}
        state={tableState}
        message={tableMessage}
        onRowClick={(row) => setDetailEntry(row)}
      />

      <AddPayrollEntryModal
        open={addOpen}
        properties={properties ?? []}
        employees={employees ?? []}
        onClose={() => setAddOpen(false)}
        onSaved={() => setRefreshKey((k) => k + 1)}
      />

      <EditPayrollEntryModal
        entry={editingEntry}
        properties={properties ?? []}
        employees={employees ?? []}
        onClose={() => setEditingEntry(null)}
        onSaved={() => setRefreshKey((k) => k + 1)}
      />

      <PayrollEntryDetailModal
        entry={detailEntry}
        properties={properties ?? []}
        employees={employees ?? []}
        onClose={() => setDetailEntry(null)}
      />

      <PayrollFiltersModal
        open={filtersOpen}
        onClose={() => setFiltersOpen(false)}
        properties={properties ?? []}
        employees={employees ?? []}
        propertyId={propertyId}
        employeeId={employeeId}
        dateFrom={dateFrom}
        dateTo={dateTo}
        onPropertyChange={setPropertyId}
        onEmployeeChange={setEmployeeId}
        onDateFromChange={setDateFrom}
        onDateToChange={setDateTo}
      />
    </div>
  )
}

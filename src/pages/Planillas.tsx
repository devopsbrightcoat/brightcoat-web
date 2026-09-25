import { useEffect, useMemo, useState } from 'react'
import { CalendarDays, ChevronLeft, Download, DollarSign, Pencil, Plus, Search, Trash2, TrendingUp } from 'lucide-react'
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
import { StatusPill } from '../components/common/StatusPill'
import { DataTablePanel } from '../components/common/DataTablePanel'
import { ConfirmModal } from '../components/common/ConfirmModal'
import { FilterPanel } from '../components/common/FilterPanel'
import { QuincenaDateFilter } from '../components/dashboard/QuincenaDateFilter'
import { AddPayrollEntryModal } from '../components/pagos/AddPayrollEntryModal'
import { ExportPayrollModal, type PayrollExportFormat } from '../components/pagos/ExportPayrollModal'
import { EditPayrollEntryModal } from '../components/pagos/EditPayrollEntryModal'
import { PayrollEntryDetailModal } from '../components/pagos/PayrollEntryDetailModal'
import { useReferenceData } from '../contexts/ReferenceDataContext'
import { deletePayrollEntry, fetchPayrollEntries } from '../lib/api'
import { useSupabaseQuery } from '../lib/useSupabaseQuery'
import { formatFullDate, MONTH_NAMES } from '../lib/scheduleDates'
import { exportPayrollToExcel, exportPayrollToPdf, type PayrollExportAudience } from '../lib/exportPayroll'
import { getErrorMessage } from '../lib/errors'
import { taxOnAmount, SALES_TAX_RATE } from '../lib/tax'
import type { PayrollEntry } from '../types'

const currency = (value: number) =>
  value.toLocaleString('en-US', { style: 'currency', currency: 'USD', maximumFractionDigits: 2 })

const PAGE_SIZE = 15

const shortDateLabel = (iso: string) => {
  const date = new Date(`${iso}T00:00:00`)
  return `${date.getDate()} ${MONTH_NAMES[date.getMonth()].slice(0, 3)}`
}

type PayrollRow = PayrollEntry & { sales: number; profit: number | null; tax: number | null }

type EmployeeStats = { count: number; sales: number; profit: number; pendingCount: number }

const columnHelper = createColumnHelper<PayrollRow>()

export const Planillas = () => {
  const [refreshKey, setRefreshKey] = useState(0)
  const [selectedEmployeeId, setSelectedEmployeeId] = useState<string | null>(null)
  const [employeeSearchText, setEmployeeSearchText] = useState('')
  const [searchText, setSearchText] = useState('')
  const [dateFrom, setDateFrom] = useState('')
  const [dateTo, setDateTo] = useState('')
  const [dateFilterOpen, setDateFilterOpen] = useState(false)
  const [addOpen, setAddOpen] = useState(false)
  const [editingEntry, setEditingEntry] = useState<PayrollEntry | null>(null)
  const [detailEntry, setDetailEntry] = useState<PayrollEntry | null>(null)
  const [deletingEntry, setDeletingEntry] = useState<PayrollEntry | null>(null)
  const [sorting, setSorting] = useState<SortingState>([])
  const [pageIndex, setPageIndex] = useState(0)
  const [exportOpen, setExportOpen] = useState(false)
  const [exporting, setExporting] = useState(false)
  const [exportError, setExportError] = useState<string | null>(null)

  const { data: entries, loading: loadingEntries, error } = useSupabaseQuery(
    () => fetchPayrollEntries(dateFrom || undefined, dateTo || undefined),
    [refreshKey, dateFrom, dateTo],
  )
  const { properties, loadingProperties, employees, loadingEmployees } = useReferenceData()

  useEffect(() => setPageIndex(0), [selectedEmployeeId])

  const selectedEmployee = employees?.find((e) => e.id === selectedEmployeeId) ?? null

  const hasDateFilter = Boolean(dateFrom) || Boolean(dateTo)
  const dateRangeLabel =
    dateFrom && dateTo
      ? `${shortDateLabel(dateFrom)} – ${shortDateLabel(dateTo)}`
      : dateFrom
        ? `Desde ${shortDateLabel(dateFrom)}`
        : dateTo
          ? `Hasta ${shortDateLabel(dateTo)}`
          : 'Todas las fechas'

  const employeeStats = useMemo(() => {
    const map = new Map<string, EmployeeStats>()
    for (const e of entries ?? []) {
      const sales = e.items.reduce((sum, item) => sum + item.amount, 0)
      const current = map.get(e.employeeId) ?? { count: 0, sales: 0, profit: 0, pendingCount: 0 }
      current.count += 1
      // "Pago" cuenta todas las planillas del período, cobradas o no — es lo
      // que se le debe/pagó al empleado por el trabajo ya hecho, sin importar
      // si el cliente ya pagó ese cobro (igual que el costo de mano de obra
      // del Dashboard). "Ganancia" sí requiere que el cobro ya esté definido.
      current.sales += sales
      if (e.amount == null) current.pendingCount += 1
      else current.profit += e.amount - sales
      map.set(e.employeeId, current)
    }
    return map
  }, [entries])

  const employeeCards = useMemo(() => {
    const q = employeeSearchText.trim().toLowerCase()
    return (employees ?? [])
      .filter((e) => !q || e.name.toLowerCase().includes(q))
      .map((employee) => ({ employee, stats: employeeStats.get(employee.id) }))
  }, [employees, employeeSearchText, employeeStats])

  const filtered = useMemo(() => {
    if (!selectedEmployeeId) return []
    const q = searchText.trim().toLowerCase()
    const rows: PayrollRow[] = (entries ?? [])
      .filter((e) => e.employeeId === selectedEmployeeId)
      .filter((e) => {
        if (!q) return true
        const propertyName = properties?.find((p) => p.id === e.propertyId)?.name ?? ''
        const itemsText = e.items.map((item) => item.description).join(' ')
        const haystack = [propertyName, e.unitLabel, e.serviceName, itemsText].filter(Boolean).join(' ').toLowerCase()
        return haystack.includes(q)
      })
      .map((e) => {
        const sales = e.items.reduce((sum, item) => sum + item.amount, 0)
        return {
          ...e,
          sales,
          profit: e.amount == null ? null : e.amount - sales,
          tax: e.amount == null ? null : taxOnAmount(e.amount),
        }
      })
    return rows
  }, [entries, properties, selectedEmployeeId, searchText])

  // "Cobro" y "Ganancia" solo cuentan planillas ya cobradas (amount != null).
  // "Pago" cuenta todas las planillas del período, cobradas o no — es lo que
  // se le debe/pagó al empleado por el trabajo ya hecho, sin importar si el
  // cliente ya pagó ese cobro (igual que el costo de mano de obra del
  // Dashboard).
  const totalCobro = filtered.filter((e) => e.amount != null).reduce((sum, e) => sum + (e.amount as number), 0)
  const totalSales = filtered.reduce((sum, e) => sum + e.sales, 0)
  const totalProfit = filtered.reduce((sum, e) => sum + (e.profit ?? 0), 0)

  const handleExport = async (audience: PayrollExportAudience, format: PayrollExportFormat) => {
    setExporting(true)
    setExportError(null)
    try {
      const options = { employeeName: selectedEmployee?.name, audience }
      if (format === 'excel') {
        await exportPayrollToExcel(filtered, properties ?? [], employees ?? [], options)
      } else {
        exportPayrollToPdf(filtered, properties ?? [], employees ?? [], options)
      }
      setExportOpen(false)
    } catch (err) {
      setExportError(getErrorMessage(err, 'No se pudo generar el archivo.'))
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
        header: 'Cobro',
        cell: (info) => {
          const value = info.getValue()
          return value == null ? (
            <span className="text-ink-500">Pendiente</span>
          ) : (
            <span className="tabular-nums text-blue-400">{currency(value)}</span>
          )
        },
      }),
      columnHelper.accessor('tax', {
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
      columnHelper.accessor('sales', {
        id: 'sales',
        header: 'Pago',
        cell: (info) => <span className="tabular-nums text-emerald-400">{currency(info.getValue())}</span>,
      }),
      columnHelper.accessor('profit', {
        id: 'profit',
        header: 'Ganancia',
        cell: (info) => {
          const value = info.getValue()
          if (value == null) return <span className="text-ink-500">Pendiente</span>
          return <span className={`tabular-nums ${value < 0 ? 'text-red-400' : 'text-gold-400'}`}>{currency(value)}</span>
        },
      }),
      columnHelper.display({
        id: 'actions',
        header: '',
        cell: (info) => (
          <div className="flex items-center gap-2">
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
            <button
              type="button"
              onClick={(e) => {
                e.stopPropagation()
                setDeletingEntry(info.row.original)
              }}
              className="flex items-center gap-1.5 rounded-lg border border-white/10 px-2.5 py-1.5 text-xs font-medium text-red-400 hover:bg-red-500/10"
            >
              <Trash2 className="h-3.5 w-3.5" />
              Eliminar
            </button>
          </div>
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
        subtitle={
          selectedEmployee
            ? `${selectedEmployee.name} — ${selectedEmployee.role}`
            : 'Cobro y pago a empleados por servicio, con desglose y ganancia'
        }
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

      <FilterPanel
        open={dateFilterOpen}
        onClose={() => setDateFilterOpen(false)}
        title="Quincena"
        hasFilters={hasDateFilter}
        onClear={() => {
          setDateFrom('')
          setDateTo('')
        }}
      >
        <QuincenaDateFilter
          dateFrom={dateFrom}
          dateTo={dateTo}
          onDateFromChange={setDateFrom}
          onDateToChange={setDateTo}
          fromId="planillas-date-from"
          toId="planillas-date-to"
        />
      </FilterPanel>

      {selectedEmployeeId === null ? (
        <>
          <div className="mx-8 mt-6 flex flex-wrap items-center justify-between gap-3">
            <div className="relative max-w-sm flex-1 min-w-[220px]">
              <Search className="pointer-events-none absolute left-3 top-1/2 h-4 w-4 -translate-y-1/2 text-ink-500" />
              <input
                type="text"
                value={employeeSearchText}
                onChange={(e) => setEmployeeSearchText(e.target.value)}
                placeholder="Buscar empleado por nombre…"
                className="w-full rounded-lg border border-white/10 bg-surface-alt py-2 pl-9 pr-3 text-sm text-ink-200 placeholder:text-ink-500"
              />
            </div>

            <button
              type="button"
              onClick={() => setDateFilterOpen(true)}
              className="flex items-center gap-2 rounded-lg border border-white/10 bg-surface-alt px-3.5 py-2 text-sm font-medium text-ink-300 hover:bg-white/5"
            >
              <CalendarDays className="h-4 w-4" />
              {dateRangeLabel}
            </button>
          </div>

          {loadingEmployees ? (
            <p className="mx-8 mt-6 text-sm text-ink-500">Cargando empleados…</p>
          ) : !employees || employees.length === 0 ? (
            <p className="mx-8 mt-6 text-sm text-ink-500">Todavía no hay empleados registrados.</p>
          ) : employeeCards.length === 0 ? (
            <p className="mx-8 mt-6 text-sm text-ink-500">Ningún empleado coincide con "{employeeSearchText}".</p>
          ) : (
            <div className="mx-8 mt-6 flex-1 min-h-0 overflow-auto pb-6">
              <div className="grid grid-cols-1 gap-4 sm:grid-cols-2 lg:grid-cols-3">
                {employeeCards.map(({ employee, stats }) => (
                  <button
                    key={employee.id}
                    type="button"
                    onClick={() => setSelectedEmployeeId(employee.id)}
                    className="rounded-xl border border-white/10 bg-surface-alt p-5 text-left transition hover:border-gold-500/40 hover:bg-white/5"
                  >
                    <div className="flex items-start justify-between">
                      <div>
                        <p className="font-semibold text-white">{employee.name}</p>
                        <p className="text-sm text-ink-400">{employee.role}</p>
                      </div>
                      <StatusPill status={employee.status} />
                    </div>
                    <div className="mt-4 grid grid-cols-2 gap-3 border-t border-white/5 pt-3">
                      <div>
                        <p className="text-xs text-ink-500">Planillas</p>
                        <p className="mt-0.5 text-sm font-semibold tabular-nums text-white">{stats?.count ?? 0}</p>
                      </div>
                      <div>
                        <p className="text-xs text-ink-500">Pago</p>
                        <p className="mt-0.5 text-sm font-semibold tabular-nums text-emerald-400">{currency(stats?.sales ?? 0)}</p>
                      </div>
                    </div>
                    {stats && stats.pendingCount > 0 && (
                      <p className="mt-2 text-xs text-amber-400">
                        {stats.pendingCount} {stats.pendingCount === 1 ? 'planilla pendiente' : 'planillas pendientes'} de cobro
                      </p>
                    )}
                  </button>
                ))}
              </div>
            </div>
          )}
        </>
      ) : (
        <>
          <div className="mx-8 mt-6">
            <button
              type="button"
              onClick={() => setSelectedEmployeeId(null)}
              className="flex items-center gap-1.5 text-sm font-medium text-ink-300 hover:text-white"
            >
              <ChevronLeft className="h-4 w-4" />
              Empleados
            </button>
          </div>

          <div className="mx-8 mt-4 flex flex-wrap items-center justify-between gap-3">
            <div className="relative max-w-sm flex-1 min-w-[220px]">
              <Search className="pointer-events-none absolute left-3 top-1/2 h-4 w-4 -translate-y-1/2 text-ink-500" />
              <input
                type="text"
                value={searchText}
                onChange={(e) => setSearchText(e.target.value)}
                placeholder="Buscar por propiedad, unidad o servicio…"
                className="w-full rounded-lg border border-white/10 bg-surface-alt py-2 pl-9 pr-3 text-sm text-ink-200 placeholder:text-ink-500"
              />
            </div>

            <div className="flex items-center gap-3">
              <button
                type="button"
                onClick={() => setDateFilterOpen(true)}
                className="flex items-center gap-2 rounded-lg border border-white/10 bg-surface-alt px-3.5 py-2 text-sm font-medium text-ink-300 hover:bg-white/5"
              >
                <CalendarDays className="h-4 w-4" />
                {dateRangeLabel}
              </button>

              <button
                type="button"
                disabled={filtered.length === 0}
                onClick={() => setExportOpen(true)}
                className="flex items-center gap-2 rounded-lg border border-white/10 px-3.5 py-2 text-sm font-medium text-ink-300 hover:bg-white/5 disabled:opacity-60"
              >
                <Download className="h-4 w-4" />
                Exportar
              </button>
            </div>
          </div>

          {exportError && <p className="mx-8 mt-3 text-sm text-red-400">{exportError}</p>}

          <div className="mx-8 mt-4 grid grid-cols-3 gap-3 sm:max-w-xl">
            <StatCard label="Cobro" value={currency(totalCobro)} icon={DollarSign} tone="info" size="compact" />
            <StatCard label="Pago" value={currency(totalSales)} icon={TrendingUp} tone="good" size="compact" />
            <StatCard label="Ganancia" value={currency(totalProfit)} icon={TrendingUp} size="compact" />
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
        </>
      )}

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
        onDelete={() => {
          setDeletingEntry(detailEntry)
          setDetailEntry(null)
        }}
      />

      <ExportPayrollModal
        open={exportOpen}
        onClose={() => setExportOpen(false)}
        onExport={handleExport}
        exporting={exporting}
      />

      <ConfirmModal
        open={deletingEntry !== null}
        onClose={() => setDeletingEntry(null)}
        title="Eliminar planilla"
        message={
          deletingEntry
            ? `¿Eliminar la planilla de "${deletingEntry.serviceName}" del ${formatFullDate(deletingEntry.date)}? Esta acción no se puede deshacer. Si estaba ligada a un horario, ese horario vuelve a estar disponible para seleccionarse.`
            : ''
        }
        onConfirm={async () => {
          if (!deletingEntry) return
          await deletePayrollEntry(deletingEntry.id)
          setRefreshKey((k) => k + 1)
        }}
      />
    </div>
  )
}

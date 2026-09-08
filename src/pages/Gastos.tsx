import { useMemo, useState } from 'react'
import { Upload } from 'lucide-react'
import {
  createColumnHelper,
  getCoreRowModel,
  getPaginationRowModel,
  getSortedRowModel,
  useReactTable,
  type SortingState,
} from '@tanstack/react-table'
import { PageHeader } from '../components/PageHeader'
import { DataTablePanel } from '../components/DataTablePanel'
import { DateRangeSelect } from '../components/DateRangeSelect'
import { ImportExpensesModal } from '../components/ImportExpensesModal'
import { fetchExpenses, fetchProperties } from '../lib/api'
import { useSupabaseQuery } from '../lib/useSupabaseQuery'
import { isWithinDateRange, type DateRangeKey } from '../lib/dateRange'
import type { Expense } from '../types'

const currency = (value: number) =>
  value.toLocaleString('en-US', { style: 'currency', currency: 'USD', maximumFractionDigits: 0 })

const PAGE_SIZE = 15

// Los gastos de mano de obra ('labor') se muestran en Planillas, no aquí.
const categoryLabels: Record<string, string> = {
  materials: 'Materiales',
  transport: 'Transporte',
  tools: 'Herramientas',
  other: 'Otro',
}

const columnHelper = createColumnHelper<Expense>()

export const Gastos = () => {
  const [refreshKey, setRefreshKey] = useState(0)
  const [importOpen, setImportOpen] = useState(false)
  const [propertyId, setPropertyId] = useState('all')
  const [dateRange, setDateRange] = useState<DateRangeKey>('all')
  const [sorting, setSorting] = useState<SortingState>([])
  const [pageIndex, setPageIndex] = useState(0)

  const { data: expenses, loading, error } = useSupabaseQuery(fetchExpenses, [refreshKey])
  const { data: properties } = useSupabaseQuery(fetchProperties, [refreshKey])

  const filtered = useMemo(
    () =>
      (expenses ?? []).filter(
        (e) =>
          e.category !== 'labor' &&
          (propertyId === 'all' || e.propertyId === propertyId) &&
          isWithinDateRange(e.date, dateRange),
      ),
    [expenses, propertyId, dateRange],
  )

  const columns = useMemo(
    () => [
      columnHelper.accessor(
        (row) => (row.propertyId ? properties?.find((p) => p.id === row.propertyId)?.name : 'Gasto general') ?? '—',
        { id: 'property', header: 'Propiedad' },
      ),
      columnHelper.accessor((row) => categoryLabels[row.category] ?? row.category, {
        id: 'category',
        header: 'Categoría',
      }),
      columnHelper.accessor('date', { id: 'date', header: 'Fecha' }),
      columnHelper.accessor('amount', {
        id: 'amount',
        header: 'Monto',
        cell: (info) => <span className="tabular-nums">{currency(info.getValue())}</span>,
      }),
    ],
    [properties],
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

  const tableState = loading ? 'loading' : error ? 'error' : filtered.length === 0 ? 'empty' : 'ready'
  const tableMessage = loading
    ? 'Cargando gastos…'
    : error
      ? `No se pudieron cargar los gastos: ${error}`
      : 'Ningún gasto con estos filtros.'

  return (
    <div className="h-screen overflow-hidden flex flex-col">
      <PageHeader
        title="Gastos"
        subtitle="Gastos por propiedad"
        action={
          <button
            type="button"
            onClick={() => setImportOpen(true)}
            className="flex items-center gap-2 rounded-lg bg-gold-500 px-3.5 py-2 text-sm font-semibold text-brand-900 transition hover:bg-gold-400"
          >
            <Upload className="h-4 w-4" />
            Cargar Excel
          </button>
        }
      />

      <div className="mx-8 mt-6 flex flex-wrap items-center gap-3">
        <select
          value={propertyId}
          onChange={(e) => setPropertyId(e.target.value)}
          className="rounded-lg border border-white/10 bg-surface-alt px-3 py-2 text-sm text-ink-200"
        >
          <option value="all">Todas las propiedades</option>
          {(properties ?? []).map((p) => (
            <option key={p.id} value={p.id}>
              {p.name}
            </option>
          ))}
        </select>
        <DateRangeSelect value={dateRange} onChange={setDateRange} />
      </div>

      <DataTablePanel
        title="Gastos"
        table={table}
        page={currentPageIndex + 1}
        totalPages={pageCount}
        onPageChange={(p) => setPageIndex(p - 1)}
        state={tableState}
        message={tableMessage}
      />

      <ImportExpensesModal
        open={importOpen}
        onClose={() => setImportOpen(false)}
        onImported={() => setRefreshKey((k) => k + 1)}
      />
    </div>
  )
}

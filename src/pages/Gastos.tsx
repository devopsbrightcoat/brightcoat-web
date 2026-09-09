import { useMemo, useState } from 'react'
import { DollarSign, Filter, Pencil, Plus, Receipt, Search, Upload } from 'lucide-react'
import {
  createColumnHelper,
  getCoreRowModel,
  getPaginationRowModel,
  getSortedRowModel,
  useReactTable,
  type SortingState,
} from '@tanstack/react-table'
import { PageHeader } from '../components/PageHeader'
import { StatCard } from '../components/StatCard'
import { DataTablePanel } from '../components/DataTablePanel'
import { AddExpenseModal } from '../components/AddExpenseModal'
import { EditExpenseModal } from '../components/EditExpenseModal'
import { ExpenseDetailModal } from '../components/ExpenseDetailModal'
import { ExpenseFiltersModal } from '../components/ExpenseFiltersModal'
import { ImportExpensesModal } from '../components/ImportExpensesModal'
import { fetchExpenses } from '../lib/api'
import { useSupabaseQuery } from '../lib/useSupabaseQuery'
import type { Expense } from '../types'

const currency = (value: number) =>
  value.toLocaleString('en-US', { style: 'currency', currency: 'USD', maximumFractionDigits: 0 })

const PAGE_SIZE = 15

const columnHelper = createColumnHelper<Expense>()

// Gastos es un módulo totalmente independiente — CRUD sin delete (view,
// edit, create), sin propiedad/empleado/categoría. Sigue el mismo patrón de
// searchbar + filtros de Propiedades/Empleados, y el de fila-clic-abre-
// detalle de Cobros/Horarios.
export const Gastos = () => {
  const [refreshKey, setRefreshKey] = useState(0)
  const { data: expenses, loading, error } = useSupabaseQuery(fetchExpenses, [refreshKey])

  const [searchText, setSearchText] = useState('')
  const [addOpen, setAddOpen] = useState(false)
  const [importOpen, setImportOpen] = useState(false)
  const [editingExpense, setEditingExpense] = useState<Expense | null>(null)
  const [detailExpense, setDetailExpense] = useState<Expense | null>(null)

  const [filtersOpen, setFiltersOpen] = useState(false)
  const [dateFrom, setDateFrom] = useState('')
  const [dateTo, setDateTo] = useState('')
  const [amountMin, setAmountMin] = useState('')
  const [amountMax, setAmountMax] = useState('')

  const [sorting, setSorting] = useState<SortingState>([])
  const [pageIndex, setPageIndex] = useState(0)

  const filtered = useMemo(() => {
    const q = searchText.trim().toLowerCase()
    const min = amountMin ? Number(amountMin) : null
    const max = amountMax ? Number(amountMax) : null
    return (expenses ?? []).filter((e) => {
      if (q) {
        const matchesInvoice = (e.invoiceNumber ?? '').toLowerCase().includes(q)
        const matchesDescription = (e.description ?? '').toLowerCase().includes(q)
        if (!matchesInvoice && !matchesDescription) return false
      }
      if (dateFrom && e.date < dateFrom) return false
      if (dateTo && e.date > dateTo) return false
      if (min != null && !Number.isNaN(min) && e.amount < min) return false
      if (max != null && !Number.isNaN(max) && e.amount > max) return false
      return true
    })
  }, [expenses, searchText, dateFrom, dateTo, amountMin, amountMax])

  const activeFilterCount = [dateFrom, dateTo, amountMin, amountMax].filter(Boolean).length
  const totalAmount = filtered.reduce((sum, e) => sum + e.amount, 0)

  const columns = useMemo(
    () => [
      columnHelper.accessor((row) => row.invoiceNumber || '—', {
        id: 'invoiceNumber',
        header: 'Factura',
      }),
      columnHelper.accessor('amount', {
        id: 'amount',
        header: 'Monto',
        cell: (info) => <span className="tabular-nums">{currency(info.getValue())}</span>,
      }),
      columnHelper.accessor('date', { id: 'date', header: 'Fecha' }),
      columnHelper.accessor((row) => row.description || '—', {
        id: 'description',
        header: 'Descripción',
      }),
      columnHelper.display({
        id: 'actions',
        header: '',
        cell: (info) => (
          <button
            type="button"
            onClick={(e) => {
              e.stopPropagation()
              setEditingExpense(info.row.original)
            }}
            className="flex items-center gap-1.5 rounded-lg border border-white/10 px-2.5 py-1.5 text-xs font-medium text-ink-300 hover:bg-white/5"
          >
            <Pencil className="h-3.5 w-3.5" />
            Editar
          </button>
        ),
      }),
    ],
    [],
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
        subtitle="Facturas y gastos generales"
        action={
          <div className="flex items-center gap-2">
            <button
              type="button"
              onClick={() => setImportOpen(true)}
              className="flex items-center gap-2 rounded-lg border border-white/10 bg-surface-alt px-3.5 py-2 text-sm font-medium text-ink-300 hover:bg-white/5"
            >
              <Upload className="h-4 w-4" />
              Cargar Excel
            </button>
            <button
              type="button"
              onClick={() => setAddOpen(true)}
              className="flex items-center gap-2 rounded-lg bg-gold-500 px-3.5 py-2 text-sm font-semibold text-brand-900 transition hover:bg-gold-400"
            >
              <Plus className="h-4 w-4" />
              Agregar gasto
            </button>
          </div>
        }
      />

      <div className="mx-8 mt-6 flex flex-wrap items-center justify-between gap-3">
        <div className="relative max-w-sm flex-1 min-w-[220px]">
          <Search className="pointer-events-none absolute left-3 top-1/2 h-4 w-4 -translate-y-1/2 text-ink-500" />
          <input
            type="text"
            value={searchText}
            onChange={(e) => setSearchText(e.target.value)}
            placeholder="Buscar por factura o descripción…"
            className="w-full rounded-lg border border-white/10 bg-surface-alt py-2 pl-9 pr-3 text-sm text-ink-200 placeholder:text-ink-500"
          />
        </div>

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
      </div>

      <div className="mx-8 mt-4 grid grid-cols-1 gap-4 sm:grid-cols-2 lg:max-w-md">
        <StatCard label="Total" value={currency(totalAmount)} icon={DollarSign} />
        <StatCard label="Registros" value={String(filtered.length)} icon={Receipt} />
      </div>

      <DataTablePanel
        title="Gastos"
        table={table}
        page={currentPageIndex + 1}
        totalPages={pageCount}
        onPageChange={(p) => setPageIndex(p - 1)}
        state={tableState}
        message={tableMessage}
        onRowClick={setDetailExpense}
      />

      <AddExpenseModal open={addOpen} onClose={() => setAddOpen(false)} onSaved={() => setRefreshKey((k) => k + 1)} />

      <EditExpenseModal
        expense={editingExpense}
        onClose={() => setEditingExpense(null)}
        onSaved={() => setRefreshKey((k) => k + 1)}
      />

      <ExpenseDetailModal expense={detailExpense} onClose={() => setDetailExpense(null)} />

      <ExpenseFiltersModal
        open={filtersOpen}
        onClose={() => setFiltersOpen(false)}
        dateFrom={dateFrom}
        dateTo={dateTo}
        amountMin={amountMin}
        amountMax={amountMax}
        onDateFromChange={setDateFrom}
        onDateToChange={setDateTo}
        onAmountMinChange={setAmountMin}
        onAmountMaxChange={setAmountMax}
      />

      <ImportExpensesModal
        open={importOpen}
        onClose={() => setImportOpen(false)}
        onImported={() => setRefreshKey((k) => k + 1)}
      />
    </div>
  )
}

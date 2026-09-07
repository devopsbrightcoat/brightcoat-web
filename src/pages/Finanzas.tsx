import { useMemo, useState } from 'react'
import { ArrowDown, ArrowUp, ArrowUpDown } from 'lucide-react'
import {
  createColumnHelper,
  flexRender,
  getCoreRowModel,
  getPaginationRowModel,
  getSortedRowModel,
  useReactTable,
  type SortingState,
} from '@tanstack/react-table'
import { PageHeader } from '../components/PageHeader'
import { Pagination } from '../components/Pagination'
import { DateRangeSelect } from '../components/DateRangeSelect'
import { fetchExpenses, fetchProperties } from '../lib/api'
import { useSupabaseQuery } from '../lib/useSupabaseQuery'
import { isWithinDateRange, type DateRangeKey } from '../lib/dateRange'
import type { Expense } from '../types'

const currency = (value: number) =>
  value.toLocaleString('en-US', { style: 'currency', currency: 'USD', maximumFractionDigits: 0 })

const PAGE_SIZE = 15

const categoryLabels: Record<string, string> = {
  materials: 'Materiales',
  labor: 'Mano de obra',
  transport: 'Transporte',
  tools: 'Herramientas',
  other: 'Otro',
}

const expensesColumnHelper = createColumnHelper<Expense>()

const SortIcon = ({ direction }: { direction: false | 'asc' | 'desc' }) =>
  direction === 'asc' ? (
    <ArrowUp className="h-3 w-3" />
  ) : direction === 'desc' ? (
    <ArrowDown className="h-3 w-3" />
  ) : (
    <ArrowUpDown className="h-3 w-3 opacity-40" />
  )

export const Finanzas = () => {
  const { data: expenses, loading: loadingExpenses, error: errorExpenses } = useSupabaseQuery(fetchExpenses, [])
  const { data: properties } = useSupabaseQuery(fetchProperties, [])

  const [expensesSorting, setExpensesSorting] = useState<SortingState>([])
  const [expensesPageIndex, setExpensesPageIndex] = useState(0)
  const [dateRange, setDateRange] = useState<DateRangeKey>('all')

  const filteredExpenses = useMemo(
    () => (expenses ?? []).filter((e) => isWithinDateRange(e.date, dateRange)),
    [expenses, dateRange],
  )

  const expensesColumns = useMemo(
    () => [
      expensesColumnHelper.accessor(
        (row) => (row.propertyId ? properties?.find((p) => p.id === row.propertyId)?.name : 'Gasto general') ?? '—',
        {
          id: 'property',
          header: 'Propiedad',
        },
      ),
      expensesColumnHelper.accessor((row) => categoryLabels[row.category] ?? row.category, {
        id: 'category',
        header: 'Categoría',
      }),
      expensesColumnHelper.accessor('date', {
        id: 'date',
        header: 'Fecha',
      }),
      expensesColumnHelper.accessor('amount', {
        id: 'amount',
        header: 'Monto',
        cell: (info) => <span className="tabular-nums">{currency(info.getValue())}</span>,
      }),
    ],
    [properties],
  )

  const expensesPageCount = Math.max(1, Math.ceil(filteredExpenses.length / PAGE_SIZE))
  const expensesCurrentPageIndex = Math.min(expensesPageIndex, expensesPageCount - 1)

  const expensesTable = useReactTable({
    data: filteredExpenses,
    columns: expensesColumns,
    state: { sorting: expensesSorting, pagination: { pageIndex: expensesCurrentPageIndex, pageSize: PAGE_SIZE } },
    onSortingChange: setExpensesSorting,
    onPaginationChange: (updater) => {
      const current = { pageIndex: expensesCurrentPageIndex, pageSize: PAGE_SIZE }
      const next = typeof updater === 'function' ? updater(current) : updater
      setExpensesPageIndex(next.pageIndex)
    },
    getCoreRowModel: getCoreRowModel(),
    getSortedRowModel: getSortedRowModel(),
    getPaginationRowModel: getPaginationRowModel(),
  })

  return (
    <div className="h-screen overflow-hidden flex flex-col">
      <PageHeader title="Finanzas" subtitle="Gastos por propiedad" />

      <div className="mx-8 mt-6 flex flex-wrap items-center gap-3">
        <DateRangeSelect value={dateRange} onChange={setDateRange} />
      </div>

      <div className="mx-8 mt-6 mb-6 flex flex-1 min-h-0 flex-col overflow-hidden rounded-xl border border-white/10 bg-surface-alt">
        <div className="border-b border-white/10 px-5 py-3.5">
          <p className="text-sm font-semibold text-white">Gastos</p>
        </div>
        {loadingExpenses ? (
          <p className="px-5 py-6 text-sm text-ink-500">Cargando gastos…</p>
        ) : errorExpenses ? (
          <p className="px-5 py-6 text-sm text-red-400">No se pudieron cargar los gastos: {errorExpenses}</p>
        ) : !expenses || expenses.length === 0 ? (
          <p className="px-5 py-6 text-sm text-ink-500">Todavía no hay gastos registrados.</p>
        ) : filteredExpenses.length === 0 ? (
          <p className="px-5 py-6 text-sm text-ink-500">Ningún gasto en este rango de fechas.</p>
        ) : (
          <>
            <div className="min-h-0 flex-1 overflow-auto">
              <table className="w-full text-left text-sm">
                <thead className="sticky top-0 z-10 bg-surface-alt">
                  {expensesTable.getHeaderGroups().map((headerGroup) => (
                    <tr
                      key={headerGroup.id}
                      className="border-b border-white/5 text-xs uppercase tracking-wide text-ink-500"
                    >
                      {headerGroup.headers.map((header) => (
                        <th key={header.id} className="px-5 py-2.5 font-medium">
                          <button
                            type="button"
                            onClick={header.column.getToggleSortingHandler()}
                            className="flex items-center gap-1.5 hover:text-ink-300"
                          >
                            {flexRender(header.column.columnDef.header, header.getContext())}
                            <SortIcon direction={header.column.getIsSorted()} />
                          </button>
                        </th>
                      ))}
                    </tr>
                  ))}
                </thead>
                <tbody>
                  {expensesTable.getRowModel().rows.map((row) => (
                    <tr key={row.id} className="border-b border-white/5 last:border-0 hover:bg-white/5">
                      {row.getVisibleCells().map((cell) => (
                        <td key={cell.id} className="px-5 py-3 text-ink-200">
                          {flexRender(cell.column.columnDef.cell, cell.getContext())}
                        </td>
                      ))}
                    </tr>
                  ))}
                </tbody>
              </table>
            </div>
            <Pagination
              page={expensesCurrentPageIndex + 1}
              totalPages={expensesPageCount}
              onChange={(p) => setExpensesPageIndex(p - 1)}
            />
          </>
        )}
      </div>
    </div>
  )
}

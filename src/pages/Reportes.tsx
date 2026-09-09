import { useMemo, useState } from 'react'
import { ArrowDown, ArrowUp, ArrowUpDown, Download, Receipt, TrendingDown } from 'lucide-react'
import { CartesianGrid, Line, LineChart, ResponsiveContainer, Tooltip, XAxis, YAxis } from 'recharts'
import {
  createColumnHelper,
  flexRender,
  getCoreRowModel,
  getPaginationRowModel,
  getSortedRowModel,
  useReactTable,
  type SortingState,
} from '@tanstack/react-table'
import { PageHeader } from '../components/common/PageHeader'
import { Pagination } from '../components/common/Pagination'
import { StatCard } from '../components/common/StatCard'
import { DateRangeSelect } from '../components/common/DateRangeSelect'
import { fetchExpenses } from '../lib/api'
import { useSupabaseQuery } from '../lib/useSupabaseQuery'
import { computeMonthlyExpenses } from '../lib/reports'
import { isWithinDateRange, type DateRangeKey } from '../lib/dateRange'
import type { Expense } from '../types'

const currency = (value: number) =>
  value.toLocaleString('en-US', { style: 'currency', currency: 'USD', maximumFractionDigits: 0 })

const PAGE_SIZE = 15

const columnHelper = createColumnHelper<Expense>()

const SortIcon = ({ direction }: { direction: false | 'asc' | 'desc' }) =>
  direction === 'asc' ? (
    <ArrowUp className="h-3 w-3" />
  ) : direction === 'desc' ? (
    <ArrowDown className="h-3 w-3" />
  ) : (
    <ArrowUpDown className="h-3 w-3 opacity-40" />
  )

// Gastos ahora es un módulo independiente (sin propiedad ni categoría), así
// que Reportes ya no desglosa por esos campos — muestra el total y la
// tendencia mensual de Gastos, más la tabla filtrable por rango de fecha.
// Nota: estos totales reflejan solo Gastos — el gasto de mano de obra vive
// aparte en Planillas (payroll_entries) desde que se separó de Gastos.
export const Reportes = () => {
  const [dateRange, setDateRange] = useState<DateRangeKey>('all')

  const { data: expenses, loading, error: errorExpenses } = useSupabaseQuery(fetchExpenses, [])

  const [sorting, setSorting] = useState<SortingState>([])
  const [pageIndex, setPageIndex] = useState(0)

  const filteredExpenses = useMemo(
    () => (expenses ?? []).filter((e) => isWithinDateRange(e.date, dateRange)),
    [expenses, dateRange],
  )

  const totalExpenses = filteredExpenses.reduce((sum, e) => sum + e.amount, 0)

  const monthlyExpenses = useMemo(() => computeMonthlyExpenses(expenses ?? []), [expenses])

  const columns = useMemo(
    () => [
      columnHelper.accessor((row) => row.invoiceNumber || '—', {
        id: 'invoiceNumber',
        header: 'Factura',
      }),
      columnHelper.accessor('date', {
        id: 'date',
        header: 'Fecha',
      }),
      columnHelper.accessor((row) => row.description || '—', {
        id: 'description',
        header: 'Descripción',
      }),
      columnHelper.accessor('amount', {
        id: 'amount',
        header: 'Monto',
        cell: (info) => <span className="tabular-nums">{currency(info.getValue())}</span>,
      }),
    ],
    [],
  )

  const pageCount = Math.max(1, Math.ceil(filteredExpenses.length / PAGE_SIZE))
  const currentPageIndex = Math.min(pageIndex, pageCount - 1)

  const table = useReactTable({
    data: filteredExpenses,
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

  return (
    <div className="pb-10">
      <PageHeader
        title="Reportes"
        subtitle="Gastos generales"
        action={
          <button
            type="button"
            className="flex items-center gap-2 rounded-lg border border-white/10 bg-surface-alt px-3.5 py-2 text-sm font-medium text-ink-300 hover:bg-white/5"
          >
            <Download className="h-4 w-4" />
            Exportar PDF
          </button>
        }
      />

      <div className="mx-8 mt-6 flex flex-wrap gap-3">
        <DateRangeSelect
          value={dateRange}
          onChange={setDateRange}
          className="rounded-lg border border-white/10 bg-surface-alt px-3 py-2 text-sm text-ink-200"
        />
      </div>

      <div className="grid grid-cols-1 gap-4 px-8 pt-6 sm:grid-cols-2 lg:max-w-md">
        <StatCard label="Gastos" value={currency(totalExpenses)} icon={TrendingDown} />
        <StatCard label="Registros" value={String(filteredExpenses.length)} icon={Receipt} />
      </div>

      <div className="grid grid-cols-1 gap-6 px-8 pt-6 lg:grid-cols-3">
        <div className="rounded-xl border border-white/10 bg-surface-alt p-5 lg:col-span-1">
          <p className="text-sm font-semibold text-white">Gastos por mes</p>
          <p className="text-xs text-ink-500">Últimos 6 meses</p>
          <div className="mt-4 h-64">
            <ResponsiveContainer width="100%" height="100%">
              <LineChart data={monthlyExpenses} margin={{ left: -20, right: 10 }}>
                <CartesianGrid strokeDasharray="3 3" stroke="#ffffff1a" />
                <XAxis dataKey="month" tick={{ fontSize: 12, fill: '#94a3b8' }} axisLine={false} tickLine={false} />
                <YAxis tick={{ fontSize: 12, fill: '#94a3b8' }} axisLine={false} tickLine={false} />
                <Tooltip
                  formatter={(value) => currency(Number(value))}
                  contentStyle={{ fontSize: 12, borderRadius: 8, background: '#1e1f25', border: '1px solid #ffffff1a', color: '#fff' }}
                />
                <Line type="monotone" dataKey="expenses" name="Gastos" stroke="#f87171" strokeWidth={2} dot={false} />
              </LineChart>
            </ResponsiveContainer>
          </div>
        </div>

        <div className="flex h-80 xs:max-xl:h-90 xl:max-3xl:h-95 3xl:h-100 flex-col overflow-hidden rounded-xl border border-white/10 bg-surface-alt lg:col-span-2">
          <div className="border-b border-white/10 px-5 py-3.5">
            <p className="text-sm font-semibold text-white">Gastos en el filtro actual</p>
          </div>
          <div className="overflow-auto">
            <table className="w-full text-left text-sm">
              <thead className="sticky top-0 z-10 bg-surface-alt">
                {table.getHeaderGroups().map((headerGroup) => (
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
                {loading ? (
                  <tr>
                    <td colSpan={4} className="px-5 py-6 text-center text-sm text-ink-500">
                      Cargando gastos…
                    </td>
                  </tr>
                ) : errorExpenses ? (
                  <tr>
                    <td colSpan={4} className="px-5 py-6 text-center text-sm text-red-400">
                      No se pudieron cargar los gastos: {errorExpenses}
                    </td>
                  </tr>
                ) : filteredExpenses.length === 0 ? (
                  <tr>
                    <td colSpan={4} className="px-5 py-6 text-center text-sm text-ink-500">
                      No hay gastos con estos filtros.
                    </td>
                  </tr>
                ) : (
                  table.getRowModel().rows.map((row) => (
                    <tr key={row.id} className="border-b border-white/5 last:border-0 hover:bg-white/5">
                      {row.getVisibleCells().map((cell) => (
                        <td key={cell.id} className="px-5 py-3 text-ink-400">
                          {flexRender(cell.column.columnDef.cell, cell.getContext())}
                        </td>
                      ))}
                    </tr>
                  ))
                )}
              </tbody>
            </table>
          </div>
          <Pagination page={currentPageIndex + 1} totalPages={pageCount} onChange={(p) => setPageIndex(p - 1)} />
        </div>
      </div>
    </div>
  )
}

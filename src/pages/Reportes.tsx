import { useMemo, useState } from 'react'
import { ArrowDown, ArrowUp, ArrowUpDown, Download, Receipt, TrendingDown } from 'lucide-react'
import { Bar, BarChart, CartesianGrid, ResponsiveContainer, Tooltip, XAxis, YAxis } from 'recharts'
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
import { StatCard } from '../components/StatCard'
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

const columnHelper = createColumnHelper<Expense>()

const SortIcon = ({ direction }: { direction: false | 'asc' | 'desc' }) =>
  direction === 'asc' ? (
    <ArrowUp className="h-3 w-3" />
  ) : direction === 'desc' ? (
    <ArrowDown className="h-3 w-3" />
  ) : (
    <ArrowUpDown className="h-3 w-3 opacity-40" />
  )

export const Reportes = () => {
  const [propertyId, setPropertyId] = useState('all')
  const [dateRange, setDateRange] = useState<DateRangeKey>('all')

  const { data: expenses, loading: loadingExpenses, error: errorExpenses } = useSupabaseQuery(fetchExpenses, [])
  const { data: properties } = useSupabaseQuery(fetchProperties, [])

  const [sorting, setSorting] = useState<SortingState>([])
  const [pageIndex, setPageIndex] = useState(0)

  const filteredExpenses = useMemo(
    () =>
      (expenses ?? []).filter(
        (e) => (propertyId === 'all' || e.propertyId === propertyId) && isWithinDateRange(e.date, dateRange),
      ),
    [expenses, propertyId, dateRange],
  )

  const totalExpenses = filteredExpenses.reduce((sum, e) => sum + e.amount, 0)

  const expensesByCategory = useMemo(() => {
    const categories = ['materials', 'labor', 'transport', 'tools', 'other'] as const
    return categories
      .map((category) => ({
        category: categoryLabels[category],
        total: filteredExpenses.filter((e) => e.category === category).reduce((sum, e) => sum + e.amount, 0),
      }))
      .filter((row) => row.total > 0)
  }, [filteredExpenses])

  const columns = useMemo(
    () => [
      columnHelper.accessor(
        (row) => (row.propertyId ? properties?.find((p) => p.id === row.propertyId)?.name : 'Gasto general') ?? '—',
        {
          id: 'property',
          header: 'Propiedad',
        },
      ),
      columnHelper.accessor((row) => categoryLabels[row.category] ?? row.category, {
        id: 'category',
        header: 'Categoría',
      }),
      columnHelper.accessor('date', {
        id: 'date',
        header: 'Fecha',
      }),
      columnHelper.accessor('amount', {
        id: 'amount',
        header: 'Monto',
        cell: (info) => <span className="tabular-nums">{currency(info.getValue())}</span>,
      }),
    ],
    [properties],
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
        subtitle="Gastos por propiedad y categoría"
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
          <p className="text-sm font-semibold text-white">Gastos por categoría</p>
          <div className="mt-4 h-64">
            <ResponsiveContainer width="100%" height="100%">
              <BarChart data={expensesByCategory} margin={{ left: -20, right: 10, bottom: 28 }}>
                <CartesianGrid strokeDasharray="3 3" stroke="#ffffff1a" vertical={false} />
                <XAxis
                  dataKey="category"
                  tick={{ fontSize: 10, fill: '#94a3b8' }}
                  axisLine={false}
                  tickLine={false}
                  interval={0}
                  angle={-30}
                  textAnchor="end"
                  height={50}
                />
                <YAxis tick={{ fontSize: 11, fill: '#94a3b8' }} axisLine={false} tickLine={false} />
                <Tooltip
                  formatter={(value) => currency(Number(value))}
                  contentStyle={{ fontSize: 12, borderRadius: 8, background: '#1e1f25', border: '1px solid #ffffff1a', color: '#fff' }}
                />
                <Bar dataKey="total" fill="#cf9122" radius={[4, 4, 0, 0]} />
              </BarChart>
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
                {loadingExpenses ? (
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

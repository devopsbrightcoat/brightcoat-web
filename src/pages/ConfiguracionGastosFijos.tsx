import { useMemo, useState } from 'react'
import { ArrowDown, ArrowUp, ArrowUpDown, Pencil, Plus, Trash2 } from 'lucide-react'
import {
  createColumnHelper,
  flexRender,
  getCoreRowModel,
  getPaginationRowModel,
  getSortedRowModel,
  useReactTable,
  type SortingState,
} from '@tanstack/react-table'
import { ConfirmModal } from '../components/common/ConfirmModal'
import { PageHeader } from '../components/common/PageHeader'
import { Pagination } from '../components/common/Pagination'
import { AddExpenseTemplateModal } from '../components/gastos/AddExpenseTemplateModal'
import { EditExpenseTemplateModal } from '../components/gastos/EditExpenseTemplateModal'
import { deleteExpenseTemplate, fetchExpenseTemplates } from '../lib/api'
import { useSupabaseQuery } from '../lib/useSupabaseQuery'
import type { ExpenseTemplate } from '../types'

const PAGE_SIZE = 15

const currency = (value: number) =>
  value.toLocaleString('en-US', { style: 'currency', currency: 'USD', maximumFractionDigits: 0 })

const columnHelper = createColumnHelper<ExpenseTemplate>()

const SortIcon = ({ direction }: { direction: false | 'asc' | 'desc' }) =>
  direction === 'asc' ? (
    <ArrowUp className="h-3 w-3" />
  ) : direction === 'desc' ? (
    <ArrowDown className="h-3 w-3" />
  ) : (
    <ArrowUpDown className="h-3 w-3 opacity-40" />
  )

// Configuración › Gastos fijos — catálogo de tipos de gasto recurrentes que
// se pueden elegir como plantilla al agregar un gasto real (Finanzas ›
// Gastos). Mismo patrón que Configuración › Servicios (ConfiguracionServicios.tsx):
// tabla ordenable + modales de agregar/editar/eliminar sobre expense_templates,
// sin ningún vínculo hacia la tabla expenses.
export const ConfiguracionGastosFijos = () => {
  const [refreshKey, setRefreshKey] = useState(0)
  const [addOpen, setAddOpen] = useState(false)
  const [editingTemplate, setEditingTemplate] = useState<ExpenseTemplate | null>(null)
  const [deletingTemplate, setDeletingTemplate] = useState<ExpenseTemplate | null>(null)
  const { data: templates, loading, error } = useSupabaseQuery(fetchExpenseTemplates, [refreshKey])

  const [sorting, setSorting] = useState<SortingState>([])
  const [pageIndex, setPageIndex] = useState(0)

  const columns = useMemo(
    () => [
      columnHelper.accessor('name', {
        id: 'name',
        header: 'Nombre',
      }),
      columnHelper.accessor((row) => row.amount ?? null, {
        id: 'amount',
        header: 'Monto',
        cell: (info) => {
          const value = info.getValue()
          return value == null ? <span className="text-ink-500">—</span> : <span className="tabular-nums">{currency(value)}</span>
        },
      }),
      columnHelper.accessor((row) => row.description ?? '', {
        id: 'description',
        header: 'Descripción',
        cell: (info) => <span className="block max-w-xs truncate">{info.getValue() || '—'}</span>,
      }),
      columnHelper.display({
        id: 'actions',
        header: 'Acciones',
        cell: (info) => (
          <div className="flex items-center gap-2">
            <button
              type="button"
              onClick={() => setEditingTemplate(info.row.original)}
              className="flex items-center gap-1.5 rounded-lg border border-white/10 px-2.5 py-1.5 text-xs font-medium text-ink-300 hover:bg-white/5"
            >
              <Pencil className="h-3.5 w-3.5" />
              Editar
            </button>
            <button
              type="button"
              onClick={() => setDeletingTemplate(info.row.original)}
              className="flex items-center gap-1.5 rounded-lg border border-white/10 px-2.5 py-1.5 text-xs font-medium text-red-400 hover:bg-red-500/10"
            >
              <Trash2 className="h-3.5 w-3.5" />
              Eliminar
            </button>
          </div>
        ),
      }),
    ],
    [],
  )

  const pageCount = Math.max(1, Math.ceil((templates ?? []).length / PAGE_SIZE))
  const currentPageIndex = Math.min(pageIndex, pageCount - 1)

  const table = useReactTable({
    data: templates ?? [],
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
    <div className="h-screen overflow-hidden flex flex-col">
      <PageHeader
        title="Gastos fijos"
        subtitle="Catálogo de gastos recurrentes para usar como plantilla al agregar un gasto"
        action={
          <button
            type="button"
            onClick={() => setAddOpen(true)}
            className="flex items-center gap-2 rounded-lg bg-gold-500 px-3.5 py-2 text-sm font-semibold text-brand-900 transition hover:bg-gold-400"
          >
            <Plus className="h-4 w-4" />
            Agregar gasto fijo
          </button>
        }
      />

      <div className="mx-8 mt-6 mb-6 flex flex-1 min-h-0 max-w-3xl flex-col overflow-hidden rounded-xl border border-white/10 bg-surface-alt">
        {loading ? (
          <p className="px-5 py-6 text-sm text-ink-500">Cargando…</p>
        ) : error ? (
          <p className="px-5 py-6 text-sm text-red-400">No se pudo cargar el catálogo: {error}</p>
        ) : !templates || templates.length === 0 ? (
          <p className="px-5 py-6 text-sm text-ink-500">Todavía no hay gastos fijos.</p>
        ) : (
          <>
            <div className="min-h-0 flex-1 overflow-auto">
              <table className="w-full text-left text-sm">
                <thead className="sticky top-0 z-10 bg-surface-alt">
                  {table.getHeaderGroups().map((headerGroup) => (
                    <tr
                      key={headerGroup.id}
                      className="border-b border-white/5 text-xs uppercase tracking-wide text-ink-500"
                    >
                      {headerGroup.headers.map((header) => (
                        <th key={header.id} className="px-5 py-2.5 font-medium">
                          {header.column.getCanSort() ? (
                            <button
                              type="button"
                              onClick={header.column.getToggleSortingHandler()}
                              className="flex items-center gap-1.5 hover:text-ink-300"
                            >
                              {flexRender(header.column.columnDef.header, header.getContext())}
                              <SortIcon direction={header.column.getIsSorted()} />
                            </button>
                          ) : (
                            flexRender(header.column.columnDef.header, header.getContext())
                          )}
                        </th>
                      ))}
                    </tr>
                  ))}
                </thead>
                <tbody>
                  {table.getRowModel().rows.map((row) => (
                    <tr key={row.id} className="border-b border-white/5 last:border-0">
                      {row.getVisibleCells().map((cell, i) => (
                        <td key={cell.id} className={i === 0 ? 'px-5 py-3 text-ink-200' : 'px-5 py-3 text-ink-400'}>
                          {flexRender(cell.column.columnDef.cell, cell.getContext())}
                        </td>
                      ))}
                    </tr>
                  ))}
                </tbody>
              </table>
            </div>
            <Pagination page={currentPageIndex + 1} totalPages={pageCount} onChange={(p) => setPageIndex(p - 1)} />
          </>
        )}
      </div>

      <AddExpenseTemplateModal open={addOpen} onClose={() => setAddOpen(false)} onSaved={() => setRefreshKey((k) => k + 1)} />

      <EditExpenseTemplateModal
        template={editingTemplate}
        onClose={() => setEditingTemplate(null)}
        onSaved={() => setRefreshKey((k) => k + 1)}
      />

      <ConfirmModal
        open={deletingTemplate !== null}
        onClose={() => setDeletingTemplate(null)}
        title="Eliminar gasto fijo"
        message={`¿Eliminar "${deletingTemplate?.name}"? Esta acción no se puede deshacer.`}
        onConfirm={async () => {
          if (!deletingTemplate) return
          await deleteExpenseTemplate(deletingTemplate.id)
          setRefreshKey((k) => k + 1)
        }}
      />
    </div>
  )
}

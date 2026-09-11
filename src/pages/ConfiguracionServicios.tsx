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
import { AddServiceTypeModal } from '../components/servicios/AddServiceTypeModal'
import { EditServiceTypeModal } from '../components/servicios/EditServiceTypeModal'
import { deleteServiceType, fetchServiceTypes } from '../lib/api'
import { useSupabaseQuery } from '../lib/useSupabaseQuery'
import type { ServiceType } from '../types'

const PAGE_SIZE = 15

const categoryLabels: Record<string, string> = {
  painting: 'Pintura',
  cleaning: 'Limpieza',
  make_ready: 'Make Ready',
  repair: 'Reparación',
  other: 'Otro',
}

const columnHelper = createColumnHelper<ServiceType>()

const SortIcon = ({ direction }: { direction: false | 'asc' | 'desc' }) =>
  direction === 'asc' ? (
    <ArrowUp className="h-3 w-3" />
  ) : direction === 'desc' ? (
    <ArrowDown className="h-3 w-3" />
  ) : (
    <ArrowUpDown className="h-3 w-3 opacity-40" />
  )

export const ConfiguracionServicios = () => {
  const [refreshKey, setRefreshKey] = useState(0)
  const [addOpen, setAddOpen] = useState(false)
  const [editingServiceType, setEditingServiceType] = useState<ServiceType | null>(null)
  const [deletingServiceType, setDeletingServiceType] = useState<ServiceType | null>(null)
  const { data: serviceTypes, loading, error } = useSupabaseQuery(fetchServiceTypes, [refreshKey])

  const [sorting, setSorting] = useState<SortingState>([])
  const [pageIndex, setPageIndex] = useState(0)

  const columns = useMemo(
    () => [
      columnHelper.accessor('name', {
        id: 'name',
        header: 'Tipo de servicio',
      }),
      columnHelper.accessor((row) => categoryLabels[row.category] ?? row.category, {
        id: 'category',
        header: 'Categoría',
      }),
      columnHelper.display({
        id: 'actions',
        header: 'Acciones',
        cell: (info) => (
          <div className="flex items-center gap-2">
            <button
              type="button"
              onClick={() => setEditingServiceType(info.row.original)}
              className="flex items-center gap-1.5 rounded-lg border border-white/10 px-2.5 py-1.5 text-xs font-medium text-ink-300 hover:bg-white/5"
            >
              <Pencil className="h-3.5 w-3.5" />
              Editar
            </button>
            <button
              type="button"
              onClick={() => setDeletingServiceType(info.row.original)}
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

  const pageCount = Math.max(1, Math.ceil((serviceTypes ?? []).length / PAGE_SIZE))
  const currentPageIndex = Math.min(pageIndex, pageCount - 1)

  const table = useReactTable({
    data: serviceTypes ?? [],
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
        title="Servicios"
        subtitle="Catálogo de tipos de servicio que ofrece BrightCoat"
        action={
          <button
            type="button"
            onClick={() => setAddOpen(true)}
            className="flex items-center gap-2 rounded-lg bg-gold-500 px-3.5 py-2 text-sm font-semibold text-brand-900 transition hover:bg-gold-400"
          >
            <Plus className="h-4 w-4" />
            Agregar servicio
          </button>
        }
      />

      <div className="mx-8 mt-6 mb-6 flex flex-1 min-h-0 max-w-2xl flex-col overflow-hidden rounded-xl border border-white/10 bg-surface-alt">
        {loading ? (
          <p className="px-5 py-6 text-sm text-ink-500">Cargando…</p>
        ) : error ? (
          <p className="px-5 py-6 text-sm text-red-400">No se pudo cargar el catálogo: {error}</p>
        ) : !serviceTypes || serviceTypes.length === 0 ? (
          <p className="px-5 py-6 text-sm text-ink-500">Todavía no hay tipos de servicio.</p>
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

      <AddServiceTypeModal open={addOpen} onClose={() => setAddOpen(false)} onSaved={() => setRefreshKey((k) => k + 1)} />

      <EditServiceTypeModal
        serviceType={editingServiceType}
        onClose={() => setEditingServiceType(null)}
        onSaved={() => setRefreshKey((k) => k + 1)}
      />

      <ConfirmModal
        open={deletingServiceType !== null}
        onClose={() => setDeletingServiceType(null)}
        title="Eliminar tipo de servicio"
        message={`¿Eliminar "${deletingServiceType?.name}"? Esta acción no se puede deshacer.`}
        onConfirm={async () => {
          if (!deletingServiceType) return
          await deleteServiceType(deletingServiceType.id)
          setRefreshKey((k) => k + 1)
        }}
      />
    </div>
  )
}

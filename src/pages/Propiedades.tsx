import { useMemo, useState } from 'react'
import { ArrowDown, ArrowUp, ArrowUpDown, Pencil } from 'lucide-react'
import {
  createColumnHelper,
  flexRender,
  getCoreRowModel,
  getPaginationRowModel,
  getSortedRowModel,
  useReactTable,
  type SortingState,
} from '@tanstack/react-table'
import { EditPropertyModal } from '../components/EditPropertyModal'
import { PageHeader } from '../components/PageHeader'
import { Pagination } from '../components/Pagination'
import { StatusPill } from '../components/StatusPill'
import { fetchProperties } from '../lib/api'
import { useSupabaseQuery } from '../lib/useSupabaseQuery'
import type { Property } from '../types'

const PAGE_SIZE = 15

const clientTypeLabels: Record<string, string> = {
  residential: 'Residencial',
  multifamily: 'Multifamiliar',
  property_manager: 'Property manager',
}

const columnHelper = createColumnHelper<Property>()

const SortIcon = ({ direction }: { direction: false | 'asc' | 'desc' }) =>
  direction === 'asc' ? (
    <ArrowUp className="h-3 w-3" />
  ) : direction === 'desc' ? (
    <ArrowDown className="h-3 w-3" />
  ) : (
    <ArrowUpDown className="h-3 w-3 opacity-40" />
  )

export const Propiedades = () => {
  const [refreshKey, setRefreshKey] = useState(0)
  const { data: properties, loading, error } = useSupabaseQuery(fetchProperties, [refreshKey])

  const [sorting, setSorting] = useState<SortingState>([])
  const [pageIndex, setPageIndex] = useState(0)
  const [editingProperty, setEditingProperty] = useState<Property | null>(null)

  const columns = useMemo(
    () => [
      columnHelper.accessor('name', {
        id: 'name',
        header: 'Propiedad',
        cell: (info) => <span className="font-medium text-white">{info.getValue()}</span>,
      }),
      columnHelper.accessor((row) => row.address || '—', {
        id: 'address',
        header: 'Dirección',
      }),
      columnHelper.accessor((row) => clientTypeLabels[row.clientType] ?? row.clientType, {
        id: 'clientType',
        header: 'Tipo',
      }),
      columnHelper.accessor((row) => row.managerContact ?? '—', {
        id: 'managerContact',
        header: 'Contacto',
      }),
      columnHelper.accessor('status', {
        id: 'status',
        header: 'Estado',
        cell: (info) => <StatusPill status={info.getValue()} />,
      }),
      columnHelper.display({
        id: 'actions',
        header: '',
        cell: (info) => (
          <button
            type="button"
            onClick={() => setEditingProperty(info.row.original)}
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

  const pageCount = Math.max(1, Math.ceil((properties ?? []).length / PAGE_SIZE))
  const currentPageIndex = Math.min(pageIndex, pageCount - 1)

  const table = useReactTable({
    data: properties ?? [],
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
        title="Propiedades"
        subtitle={properties ? `${properties.length} propiedades registradas` : 'Cargando…'}
      />

      <div className="mx-8 mt-6 mb-6 flex flex-1 min-h-0 flex-col overflow-hidden rounded-xl border border-white/10 bg-surface-alt">
        {loading ? (
          <p className="px-5 py-6 text-sm text-ink-500">Cargando propiedades…</p>
        ) : error ? (
          <p className="px-5 py-6 text-sm text-red-400">No se pudieron cargar las propiedades: {error}</p>
        ) : !properties || properties.length === 0 ? (
          <p className="px-5 py-6 text-sm text-ink-500">Todavía no hay propiedades registradas.</p>
        ) : (
          <>
            <div className="min-h-0 flex-1 overflow-auto">
              <table className="w-full text-left text-sm">
                <thead className="sticky top-0 z-10 bg-surface-alt">
                  {table.getHeaderGroups().map((headerGroup) => (
                    <tr
                      key={headerGroup.id}
                      className="border-b border-white/10 bg-white/5 text-xs uppercase tracking-wide text-ink-500"
                    >
                      {headerGroup.headers.map((header) => (
                        <th key={header.id} className="px-5 py-3 font-medium">
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
                  {table.getRowModel().rows.map((row) => (
                    <tr key={row.id} className="border-b border-white/5 last:border-0 hover:bg-white/5">
                      {row.getVisibleCells().map((cell) => (
                        <td key={cell.id} className="px-5 py-3.5 text-ink-400">
                          {flexRender(cell.column.columnDef.cell, cell.getContext())}
                        </td>
                      ))}
                    </tr>
                  ))}
                </tbody>
              </table>
            </div>
            <Pagination
              page={currentPageIndex + 1}
              totalPages={pageCount}
              onChange={(p) => setPageIndex(p - 1)}
            />
          </>
        )}
      </div>

      <EditPropertyModal
        property={editingProperty}
        onClose={() => setEditingProperty(null)}
        onSaved={() => setRefreshKey((k) => k + 1)}
      />
    </div>
  )
}

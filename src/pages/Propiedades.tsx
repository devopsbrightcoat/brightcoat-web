import { useMemo, useState } from 'react'
import { ArrowDown, ArrowUp, ArrowUpDown, Pencil, Plus, Search } from 'lucide-react'
import {
  createColumnHelper,
  flexRender,
  getCoreRowModel,
  getPaginationRowModel,
  getSortedRowModel,
  useReactTable,
  type SortingState,
} from '@tanstack/react-table'
import { AddPropertyModal } from '../components/propiedades/AddPropertyModal'
import { EditPropertyModal } from '../components/propiedades/EditPropertyModal'
import { PageHeader } from '../components/common/PageHeader'
import { Pagination } from '../components/common/Pagination'
import { StatusPill } from '../components/common/StatusPill'
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

  const [searchText, setSearchText] = useState('')
  const [sorting, setSorting] = useState<SortingState>([])
  const [pageIndex, setPageIndex] = useState(0)
  const [addOpen, setAddOpen] = useState(false)
  const [editingProperty, setEditingProperty] = useState<Property | null>(null)

  const filteredProperties = useMemo(() => {
    const q = searchText.trim().toLowerCase()
    if (!q) return properties ?? []
    return (properties ?? []).filter((p) => p.name.toLowerCase().includes(q))
  }, [properties, searchText])

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

  const pageCount = Math.max(1, Math.ceil(filteredProperties.length / PAGE_SIZE))
  const currentPageIndex = Math.min(pageIndex, pageCount - 1)

  const table = useReactTable({
    data: filteredProperties,
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
        action={
          <button
            type="button"
            onClick={() => setAddOpen(true)}
            className="flex items-center gap-2 rounded-lg bg-gold-500 px-3.5 py-2 text-sm font-semibold text-brand-900 transition hover:bg-gold-400"
          >
            <Plus className="h-4 w-4" />
            Agregar propiedad
          </button>
        }
      />

      <div className="mx-8 mt-6">
        <div className="relative max-w-sm">
          <Search className="pointer-events-none absolute left-3 top-1/2 h-4 w-4 -translate-y-1/2 text-ink-500" />
          <input
            type="text"
            value={searchText}
            onChange={(e) => setSearchText(e.target.value)}
            placeholder="Buscar por nombre…"
            className="w-full rounded-lg border border-white/10 bg-surface-alt py-2 pl-9 pr-3 text-sm text-ink-200 placeholder:text-ink-500"
          />
        </div>
      </div>

      <div className="mx-8 mt-4 mb-6 flex flex-1 min-h-0 flex-col overflow-hidden rounded-xl border border-white/10 bg-surface-alt">
        {loading ? (
          <p className="px-5 py-6 text-sm text-ink-500">Cargando propiedades…</p>
        ) : error ? (
          <p className="px-5 py-6 text-sm text-red-400">No se pudieron cargar las propiedades: {error}</p>
        ) : !properties || properties.length === 0 ? (
          <p className="px-5 py-6 text-sm text-ink-500">Todavía no hay propiedades registradas.</p>
        ) : filteredProperties.length === 0 ? (
          <p className="px-5 py-6 text-sm text-ink-500">Ninguna propiedad coincide con "{searchText}".</p>
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

      <AddPropertyModal open={addOpen} onClose={() => setAddOpen(false)} onSaved={() => setRefreshKey((k) => k + 1)} />

      <EditPropertyModal
        property={editingProperty}
        onClose={() => setEditingProperty(null)}
        onSaved={() => setRefreshKey((k) => k + 1)}
      />
    </div>
  )
}

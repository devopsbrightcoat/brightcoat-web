import { useMemo, useState } from 'react'
import { ArrowDown, ArrowUp, ArrowUpDown, Pencil, Search, X } from 'lucide-react'
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
import { EditServiceModal } from '../components/EditServiceModal'
import { DateRangeSelect } from '../components/DateRangeSelect'
import { Pagination } from '../components/Pagination'
import { StatusPill } from '../components/StatusPill'
import { fetchEmployees, fetchProperties, fetchServiceTypes, fetchServices } from '../lib/api'
import { useSupabaseQuery } from '../lib/useSupabaseQuery'
import { isWithinDateRange, type DateRangeKey } from '../lib/dateRange'
import type { Service, ServiceStatus } from '../types'

const currency = (value: number) =>
  value.toLocaleString('en-US', { style: 'currency', currency: 'USD', maximumFractionDigits: 0 })

const PAGE_SIZE = 10

const STATUS_OPTIONS: { value: ServiceStatus; label: string }[] = [
  { value: 'pending', label: 'Pendiente' },
  { value: 'in_progress', label: 'En proceso' },
  { value: 'completed', label: 'Completado' },
]
const STATUS_LABELS: Record<ServiceStatus, string> = {
  pending: 'Pendiente',
  in_progress: 'En proceso',
  completed: 'Completado',
}

type Filters = {
  propertyIds: string[]
  units: string[]
  serviceTypeIds: string[]
  statuses: ServiceStatus[]
}

const EMPTY_FILTERS: Filters = { propertyIds: [], units: [], serviceTypeIds: [], statuses: [] }

const selectClass =
  'rounded-lg border border-white/10 bg-surface-alt px-3 py-2 text-sm text-ink-300 hover:bg-white/5'

const columnHelper = createColumnHelper<Service>()

export const Trabajos = () => {
  const [refreshKey, setRefreshKey] = useState(0)
  const { data: services, loading, error } = useSupabaseQuery(fetchServices, [refreshKey])
  const { data: properties } = useSupabaseQuery(fetchProperties, [])
  const { data: serviceTypes } = useSupabaseQuery(fetchServiceTypes, [])
  const { data: employees } = useSupabaseQuery(fetchEmployees, [])

  const [searchText, setSearchText] = useState('')
  const [filters, setFilters] = useState<Filters>(EMPTY_FILTERS)
  const [sorting, setSorting] = useState<SortingState>([])
  const [pageIndex, setPageIndex] = useState(0)
  const [editingService, setEditingService] = useState<Service | null>(null)
  const [dateRange, setDateRange] = useState<DateRangeKey>('all')

  const propertyName = (id: string) => properties?.find((p) => p.id === id)?.name ?? '—'
  const serviceTypeName = (id: string) => serviceTypes?.find((s) => s.id === id)?.name ?? '—'

  const addFilter = <K extends keyof Filters>(facet: K, value: string) => {
    if (!value) return
    setFilters((prev) => {
      const current = prev[facet] as string[]
      if (current.includes(value)) return prev
      return { ...prev, [facet]: [...current, value] }
    })
  }

  const removeFilter = <K extends keyof Filters>(facet: K, value: string) => {
    setFilters((prev) => ({ ...prev, [facet]: (prev[facet] as string[]).filter((v) => v !== value) }))
  }

  const clearAll = () => {
    setFilters(EMPTY_FILTERS)
    setSearchText('')
    setDateRange('all')
  }

  const availableUnits = useMemo(() => {
    const source =
      filters.propertyIds.length > 0
        ? (services ?? []).filter((s) => filters.propertyIds.includes(s.propertyId))
        : services ?? []
    const set = new Set<string>()
    for (const s of source) {
      if (s.unitLabel) set.add(s.unitLabel)
    }
    return Array.from(set).sort((a, b) => a.localeCompare(b, 'es', { numeric: true }))
  }, [services, filters.propertyIds])

  const filteredServices = useMemo(() => {
    const q = searchText.trim().toLowerCase()
    return (services ?? []).filter((s) => {
      if (filters.propertyIds.length > 0 && !filters.propertyIds.includes(s.propertyId)) return false
      if (filters.units.length > 0 && (!s.unitLabel || !filters.units.includes(s.unitLabel))) return false
      if (filters.serviceTypeIds.length > 0 && !filters.serviceTypeIds.includes(s.serviceTypeId)) return false
      if (filters.statuses.length > 0 && !filters.statuses.includes(s.status)) return false
      if (!isWithinDateRange(s.scheduledDate, dateRange)) return false
      if (!q) return true
      const propName = properties?.find((p) => p.id === s.propertyId)?.name ?? ''
      const typeName = serviceTypes?.find((t) => t.id === s.serviceTypeId)?.name ?? ''
      const haystack = [propName, s.unitLabel, typeName, s.notes].filter(Boolean).join(' ').toLowerCase()
      return haystack.includes(q)
    })
  }, [services, filters, searchText, properties, serviceTypes, dateRange])

  const columns = useMemo(
    () => [
      columnHelper.accessor((row) => properties?.find((p) => p.id === row.propertyId)?.name ?? '—', {
        id: 'property',
        header: 'Propiedad',
        cell: (info) => <span className="font-medium text-white">{info.getValue()}</span>,
      }),
      columnHelper.accessor((row) => row.unitLabel ?? '', {
        id: 'unit',
        header: 'Unidad',
        cell: (info) => (
          <>
            {info.row.original.unitLabel ?? '—'}
            {info.row.original.unitSize && <span className="text-ink-500"> · {info.row.original.unitSize}</span>}
          </>
        ),
      }),
      columnHelper.accessor((row) => serviceTypes?.find((t) => t.id === row.serviceTypeId)?.name ?? '—', {
        id: 'serviceType',
        header: 'Tipo de servicio',
      }),
      columnHelper.accessor((row) => employees?.find((e) => e.id === row.employeeId)?.name ?? 'Sin asignar', {
        id: 'employee',
        header: 'Empleado',
      }),
      columnHelper.accessor('scheduledDate', {
        id: 'date',
        header: 'Fecha',
        cell: (info) => info.getValue() || '—',
      }),
      columnHelper.accessor('cost', {
        id: 'cost',
        header: 'Costo',
        cell: (info) => <span className="tabular-nums">{currency(info.getValue())}</span>,
      }),
      columnHelper.accessor('status', {
        id: 'status',
        header: 'Estado',
        cell: (info) => <StatusPill status={info.getValue()} />,
      }),
      columnHelper.accessor((row) => row.notes ?? '', {
        id: 'notes',
        header: 'Notas',
        enableSorting: false,
        cell: (info) => (
          <span className="block max-w-[220px] truncate" title={info.getValue()}>
            {info.getValue() || '—'}
          </span>
        ),
      }),
      columnHelper.display({
        id: 'actions',
        header: '',
        cell: (info) => (
          <button
            type="button"
            onClick={() => setEditingService(info.row.original)}
            className="inline-flex items-center gap-1.5 rounded-lg border border-white/10 px-2.5 py-1.5 text-xs font-medium text-ink-300 hover:bg-white/5"
          >
            <Pencil className="h-3.5 w-3.5" />
            Editar
          </button>
        ),
      }),
    ],
    [properties, serviceTypes, employees],
  )

  // Igual que usePagination: si al filtrar/ordenar la página seleccionada
  // queda fuera de rango, se recorta durante el render (sin useEffect).
  const pageCount = Math.max(1, Math.ceil(filteredServices.length / PAGE_SIZE))
  const currentPageIndex = Math.min(pageIndex, pageCount - 1)

  const table = useReactTable({
    data: filteredServices,
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

  const chips = [
    ...filters.propertyIds.map((id) => ({
      facet: 'propertyIds' as const,
      value: id,
      label: `Propiedad: ${propertyName(id)}`,
    })),
    ...filters.units.map((u) => ({ facet: 'units' as const, value: u, label: `Unidad: ${u}` })),
    ...filters.serviceTypeIds.map((id) => ({
      facet: 'serviceTypeIds' as const,
      value: id,
      label: `Servicio: ${serviceTypeName(id)}`,
    })),
    ...filters.statuses.map((st) => ({
      facet: 'statuses' as const,
      value: st,
      label: `Estado: ${STATUS_LABELS[st]}`,
    })),
  ]
  const hasActiveFilters = chips.length > 0 || searchText.trim() !== '' || dateRange !== 'all'

  return (
    <div className="h-screen overflow-hidden flex flex-col">
      <PageHeader
        title="Trabajos / Servicios"
        subtitle={
          services
            ? hasActiveFilters
              ? `${filteredServices.length} de ${services.length} órdenes de trabajo`
              : `${services.length} órdenes de trabajo`
            : 'Cargando…'
        }
      />

      <div className="mx-8 mt-6 flex flex-wrap items-center gap-3">
        <div className="relative min-w-[240px] flex-1">
          <Search className="pointer-events-none absolute left-3 top-1/2 h-4 w-4 -translate-y-1/2 text-ink-500" />
          <input
            type="text"
            value={searchText}
            onChange={(e) => setSearchText(e.target.value)}
            placeholder="Buscar por propiedad, unidad, servicio o notas…"
            className="w-full rounded-lg border border-white/10 bg-surface-alt py-2 pl-9 pr-3 text-sm text-ink-200 placeholder:text-ink-500"
          />
        </div>

        <select value="" onChange={(e) => addFilter('propertyIds', e.target.value)} className={selectClass}>
          <option value="">+ Propiedad</option>
          {(properties ?? []).map((p) => (
            <option key={p.id} value={p.id}>
              {p.name}
            </option>
          ))}
        </select>

        <select value="" onChange={(e) => addFilter('units', e.target.value)} className={selectClass}>
          <option value="">+ Unidad</option>
          {availableUnits.map((u) => (
            <option key={u} value={u}>
              {u}
            </option>
          ))}
        </select>

        <select value="" onChange={(e) => addFilter('serviceTypeIds', e.target.value)} className={selectClass}>
          <option value="">+ Tipo de servicio</option>
          {(serviceTypes ?? []).map((t) => (
            <option key={t.id} value={t.id}>
              {t.name}
            </option>
          ))}
        </select>

        <select value="" onChange={(e) => addFilter('statuses', e.target.value)} className={selectClass}>
          <option value="">+ Estado</option>
          {STATUS_OPTIONS.map((s) => (
            <option key={s.value} value={s.value}>
              {s.label}
            </option>
          ))}
        </select>

        <DateRangeSelect value={dateRange} onChange={setDateRange} className={selectClass} />
      </div>

      {chips.length > 0 && (
        <div className="mx-8 mt-3 flex flex-wrap items-center gap-2">
          {chips.map((chip) => (
            <span
              key={`${chip.facet}-${chip.value}`}
              className="inline-flex items-center gap-1.5 rounded-full bg-gold-500/10 px-3 py-1 text-xs font-medium text-gold-500 ring-1 ring-inset ring-gold-500/20"
            >
              {chip.label}
              <button
                type="button"
                onClick={() => removeFilter(chip.facet, chip.value)}
                className="text-gold-500/70 hover:text-gold-500"
              >
                <X className="h-3 w-3" />
              </button>
            </span>
          ))}
          <button type="button" onClick={clearAll} className="text-xs text-ink-500 underline hover:text-ink-300">
            Limpiar filtros
          </button>
        </div>
      )}

      <div className="mx-8 mt-6 mb-6 flex flex-1 min-h-0 flex-col overflow-hidden rounded-xl border border-white/10 bg-surface-alt">
        {loading ? (
          <p className="px-5 py-6 text-sm text-ink-500">Cargando trabajos…</p>
        ) : error ? (
          <p className="px-5 py-6 text-sm text-red-400">No se pudieron cargar los trabajos: {error}</p>
        ) : !services || services.length === 0 ? (
          <p className="px-5 py-6 text-sm text-ink-500">Todavía no hay trabajos registrados.</p>
        ) : filteredServices.length === 0 ? (
          <div className="px-5 py-6 text-sm text-ink-500">
            Ningún trabajo coincide con los filtros actuales.{' '}
            <button type="button" onClick={clearAll} className="text-gold-500 underline hover:text-gold-400">
              Limpiar filtros
            </button>
          </div>
        ) : (
          <div className="h-full flex flex-col overflow-hidden">
            <div className="min-h-0 flex-1 overflow-auto">
              <table className="w-full text-left text-sm h-full">
                <thead className="sticky top-0 z-10 bg-surface-alt">
                  {table.getHeaderGroups().map((headerGroup) => (
                    <tr
                      key={headerGroup.id}
                      className="border-b border-white/10 bg-white/5 text-xs uppercase tracking-wide text-ink-500"
                    >
                      {headerGroup.headers.map((header) => {
                        const canSort = header.column.getCanSort()
                        const sortDir = header.column.getIsSorted()
                        return (
                          <th key={header.id} className="px-5 py-3 font-medium">
                            {canSort ? (
                              <button
                                type="button"
                                onClick={header.column.getToggleSortingHandler()}
                                className="flex items-center gap-1.5 hover:text-ink-300"
                              >
                                {flexRender(header.column.columnDef.header, header.getContext())}
                                {sortDir === 'asc' ? (
                                  <ArrowUp className="h-3 w-3" />
                                ) : sortDir === 'desc' ? (
                                  <ArrowDown className="h-3 w-3" />
                                ) : (
                                  <ArrowUpDown className="h-3 w-3 opacity-40" />
                                )}
                              </button>
                            ) : (
                              flexRender(header.column.columnDef.header, header.getContext())
                            )}
                          </th>
                        )
                      })}
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
          </div>
        )}
      </div>

      <EditServiceModal
        service={editingService}
        properties={properties ?? []}
        serviceTypes={serviceTypes ?? []}
        employees={employees ?? []}
        onClose={() => setEditingService(null)}
        onSaved={() => setRefreshKey((k) => k + 1)}
      />
    </div>
  )
}

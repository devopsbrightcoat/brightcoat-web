import { useMemo, useState } from 'react'
import { Clock, DollarSign, Download, Filter, Pencil, Plus, Search, Trash2, Upload } from 'lucide-react'
import {
  createColumnHelper,
  getCoreRowModel,
  getPaginationRowModel,
  getSortedRowModel,
  useReactTable,
  type SortingState,
} from '@tanstack/react-table'
import { PageHeader } from '../components/common/PageHeader'
import { StatCard } from '../components/common/StatCard'
import { DataTablePanel } from '../components/common/DataTablePanel'
import { AddFixedChargeModal } from '../components/cobros/AddFixedChargeModal'
import { ImportChargesModal } from '../components/cobros/ImportChargesModal'
import { ChargeInvoiceModal } from '../components/cobros/ChargeInvoiceModal'
import { ChargeDetailModal } from '../components/cobros/ChargeDetailModal'
import { EditChargeModal } from '../components/cobros/EditChargeModal'
import { ChargeFiltersModal } from '../components/cobros/ChargeFiltersModal'
import { ConfirmModal } from '../components/common/ConfirmModal'
import { StatusPill } from '../components/common/StatusPill'
import { deleteCharge, fetchCharges, fetchProperties, fetchServiceTypes } from '../lib/api'
import { useSupabaseQuery } from '../lib/useSupabaseQuery'
import { exportChargesToExcel } from '../lib/exportCharges'
import { getErrorMessage } from '../lib/errors'
import type { Charge } from '../types'

const currency = (value: number) =>
  value.toLocaleString('en-US', { style: 'currency', currency: 'USD', maximumFractionDigits: 2 })

const PAGE_SIZE = 15

const columnHelper = createColumnHelper<Charge>()

export const Cobros = () => {
  const [refreshKey, setRefreshKey] = useState(0)
  const [importOpen, setImportOpen] = useState(false)
  const [addFixedOpen, setAddFixedOpen] = useState(false)
  const [invoiceCharge, setInvoiceCharge] = useState<Charge | null>(null)
  const [detailCharge, setDetailCharge] = useState<Charge | null>(null)
  const [editingCharge, setEditingCharge] = useState<Charge | null>(null)
  const [deletingCharge, setDeletingCharge] = useState<Charge | null>(null)
  const [propertyId, setPropertyId] = useState('all')
  const [status, setStatus] = useState<'all' | 'paid' | 'pending'>('all')
  const [serviceTypeId, setServiceTypeId] = useState('all')
  const [dateFrom, setDateFrom] = useState('')
  const [dateTo, setDateTo] = useState('')
  const [searchText, setSearchText] = useState('')
  const [filtersOpen, setFiltersOpen] = useState(false)
  const [sorting, setSorting] = useState<SortingState>([])
  const [pageIndex, setPageIndex] = useState(0)
  const [exporting, setExporting] = useState(false)
  const [exportError, setExportError] = useState<string | null>(null)

  const { data: charges, loading: loadingCharges, error } = useSupabaseQuery(fetchCharges, [refreshKey])
  const { data: properties, loading: loadingProperties } = useSupabaseQuery(fetchProperties, [refreshKey])
  const { data: serviceTypes, loading: loadingServiceTypes } = useSupabaseQuery(fetchServiceTypes, [refreshKey])

  const filtered = useMemo(() => {
    const q = searchText.trim().toLowerCase()
    return (charges ?? []).filter((c) => {
      if (propertyId !== 'all' && c.propertyId !== propertyId) return false
      if (status !== 'all' && c.status !== status) return false
      if (serviceTypeId !== 'all' && c.serviceTypeId !== serviceTypeId) return false
      if (dateFrom && (!c.generatedDate || c.generatedDate < dateFrom)) return false
      if (dateTo && (!c.generatedDate || c.generatedDate > dateTo)) return false
      if (q) {
        const propertyName = properties?.find((p) => p.id === c.propertyId)?.name ?? ''
        const haystack = [propertyName, c.unitLabel, c.description, c.notes, c.responsible, c.invoiceNumber]
          .filter(Boolean)
          .join(' ')
          .toLowerCase()
        if (!haystack.includes(q)) return false
      }
      return true
    })
  }, [charges, properties, propertyId, status, serviceTypeId, dateFrom, dateTo, searchText])

  const activeFilterCount =
    (propertyId !== 'all' ? 1 : 0) +
    (status !== 'all' ? 1 : 0) +
    (serviceTypeId !== 'all' ? 1 : 0) +
    (dateFrom ? 1 : 0) +
    (dateTo ? 1 : 0)

  const totalPaid = (charges ?? []).filter((c) => c.status === 'paid').reduce((sum, c) => sum + c.amount, 0)
  const totalPending = (charges ?? []).filter((c) => c.status === 'pending').reduce((sum, c) => sum + c.amount, 0)

  const handleExport = async () => {
    setExporting(true)
    setExportError(null)
    try {
      await exportChargesToExcel(filtered, properties ?? [], serviceTypes ?? [])
    } catch (err) {
      setExportError(getErrorMessage(err, 'No se pudo generar el Excel.'))
    } finally {
      setExporting(false)
    }
  }

  const columns = useMemo(
    () => [
      columnHelper.accessor((row) => properties?.find((p) => p.id === row.propertyId)?.name ?? '—', {
        id: 'property',
        header: 'Propiedad',
      }),
      columnHelper.accessor((row) => (row.isFixed ? 'N/A' : row.unitLabel || '—'), { id: 'unit', header: 'Apartamento' }),
      columnHelper.accessor(
        (row) => (row.serviceTypeId ? serviceTypes?.find((t) => t.id === row.serviceTypeId)?.name : undefined) ?? '—',
        { id: 'service', header: 'Servicio' },
      ),
      columnHelper.accessor((row) => row.generatedDate || '—', { id: 'date', header: 'Fecha' }),
      columnHelper.accessor(
        (row) => {
          const base = row.description || row.notes || row.responsible || ''
          if (row.extras.length === 0) return base || '—'
          const extrasText = row.extras.map((e) => `${e.description} (${currency(e.amount)})`).join(', ')
          return base ? `${base} — ${extrasText}` : extrasText
        },
        { id: 'description', header: 'Descripción' },
      ),
      columnHelper.accessor('amount', {
        id: 'amount',
        header: 'Monto',
        cell: (info) => <span className="tabular-nums">{currency(info.getValue())}</span>,
      }),
      columnHelper.accessor('status', {
        id: 'status',
        header: 'Estatus',
        cell: (info) => (
          <button
            type="button"
            onClick={(e) => {
              e.stopPropagation()
              setInvoiceCharge(info.row.original)
            }}
          >
            <StatusPill status={info.getValue()} />
          </button>
        ),
      }),
      columnHelper.accessor((row) => row.invoiceNumber || '—', { id: 'invoiceNumber', header: 'Invoice #' }),
      columnHelper.display({
        id: 'actions',
        header: '',
        cell: (info) => (
          <div className="flex items-center gap-2">
            <button
              type="button"
              onClick={(e) => {
                e.stopPropagation()
                setEditingCharge(info.row.original)
              }}
              className="flex items-center gap-1.5 rounded-lg border border-white/10 px-2.5 py-1.5 text-xs font-medium text-ink-300 hover:bg-white/5"
            >
              <Pencil className="h-3.5 w-3.5" />
              Editar
            </button>
            <button
              type="button"
              onClick={(e) => {
                e.stopPropagation()
                setDeletingCharge(info.row.original)
              }}
              className="flex items-center gap-1.5 rounded-lg border border-white/10 px-2.5 py-1.5 text-xs font-medium text-red-400 hover:bg-red-500/10"
            >
              <Trash2 className="h-3.5 w-3.5" />
              Eliminar
            </button>
          </div>
        ),
      }),
    ],
    [properties, serviceTypes],
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

  const loading = loadingCharges || loadingProperties || loadingServiceTypes
  const tableState = loading ? 'loading' : error ? 'error' : filtered.length === 0 ? 'empty' : 'ready'
  const tableMessage = loading
    ? 'Cargando cobros…'
    : error
      ? `No se pudieron cargar los cobros: ${error}`
      : 'No hay cobros con estos filtros.'

  return (
    <div className="h-screen overflow-hidden flex flex-col">
      <PageHeader
        title="Cobros"
        subtitle="Cobros por apartamento — subidos a OPS, pendientes, capturados desde Horarios y cobros fijos"
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
              onClick={() => setAddFixedOpen(true)}
              className="flex items-center gap-2 rounded-lg bg-gold-500 px-3.5 py-2 text-sm font-semibold text-brand-900 transition hover:bg-gold-400"
            >
              <Plus className="h-4 w-4" />
              Agregar cobro fijo
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
            placeholder="Buscar por propiedad, apartamento, descripción o invoice #…"
            className="w-full rounded-lg border border-white/10 bg-surface-alt py-2 pl-9 pr-3 text-sm text-ink-200 placeholder:text-ink-500"
          />
        </div>

        <div className="flex items-center gap-3">
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

          <button
            type="button"
            disabled={exporting || filtered.length === 0}
            onClick={handleExport}
            className="flex items-center gap-2 rounded-lg border border-white/10 px-3.5 py-2 text-sm font-medium text-ink-300 hover:bg-white/5 disabled:opacity-60"
          >
            <Download className="h-4 w-4" />
            {exporting ? 'Generando…' : 'Exportar a Excel'}
          </button>
        </div>
      </div>

      {exportError && <p className="mx-8 mt-3 text-sm text-red-400">{exportError}</p>}

      <div className="grid grid-cols-2 gap-3 px-8 pt-6 sm:max-w-sm">
        <StatCard label="Cobrado" value={currency(totalPaid)} icon={DollarSign} tone="good" size="compact" />
        <StatCard label="Pendiente" value={currency(totalPending)} icon={Clock} tone="warn" size="compact" />
      </div>

      <DataTablePanel
        title="Cobros"
        table={table}
        page={currentPageIndex + 1}
        totalPages={pageCount}
        onPageChange={(p) => setPageIndex(p - 1)}
        state={tableState}
        message={tableMessage}
        onRowClick={setDetailCharge}
      />

      <ImportChargesModal
        open={importOpen}
        onClose={() => setImportOpen(false)}
        onImported={() => setRefreshKey((k) => k + 1)}
      />

      <AddFixedChargeModal
        open={addFixedOpen}
        properties={properties ?? []}
        onClose={() => setAddFixedOpen(false)}
        onSaved={() => setRefreshKey((k) => k + 1)}
      />

      <ChargeInvoiceModal
        charge={invoiceCharge}
        onClose={() => setInvoiceCharge(null)}
        onSaved={() => setRefreshKey((k) => k + 1)}
      />

      <ChargeDetailModal
        charge={detailCharge}
        properties={properties ?? []}
        serviceTypes={serviceTypes ?? []}
        onClose={() => setDetailCharge(null)}
      />

      <EditChargeModal
        charge={editingCharge}
        properties={properties ?? []}
        serviceTypes={serviceTypes ?? []}
        onClose={() => setEditingCharge(null)}
        onSaved={() => setRefreshKey((k) => k + 1)}
      />

      <ConfirmModal
        open={deletingCharge !== null}
        onClose={() => setDeletingCharge(null)}
        title="Eliminar cobro"
        message={
          deletingCharge?.serviceTypeId && deletingCharge?.generatedDate
            ? 'Este cobro puede venir de un horario ya entregado. Si es así, el horario vuelve a quedar pendiente de cobro. ¿Eliminar de todas formas? Esta acción no se puede deshacer.'
            : '¿Eliminar este cobro? Esta acción no se puede deshacer.'
        }
        onConfirm={async () => {
          if (!deletingCharge) return
          await deleteCharge(deletingCharge.id)
          setRefreshKey((k) => k + 1)
        }}
      />

      <ChargeFiltersModal
        open={filtersOpen}
        onClose={() => setFiltersOpen(false)}
        properties={properties ?? []}
        serviceTypes={serviceTypes ?? []}
        propertyId={propertyId}
        status={status}
        serviceTypeId={serviceTypeId}
        dateFrom={dateFrom}
        dateTo={dateTo}
        onPropertyChange={setPropertyId}
        onStatusChange={setStatus}
        onServiceTypeChange={setServiceTypeId}
        onDateFromChange={setDateFrom}
        onDateToChange={setDateTo}
      />
    </div>
  )
}

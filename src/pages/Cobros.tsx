import { useMemo, useState } from 'react'
import { Clock, DollarSign, Download, Receipt, Upload } from 'lucide-react'
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
import { ImportChargesModal } from '../components/ImportChargesModal'
import { ChargeInvoiceModal } from '../components/ChargeInvoiceModal'
import { ChargeDetailModal } from '../components/ChargeDetailModal'
import { StatusPill } from '../components/StatusPill'
import { fetchCharges, fetchProperties, fetchServiceTypes } from '../lib/api'
import { useSupabaseQuery } from '../lib/useSupabaseQuery'
import { exportChargesToExcel } from '../lib/exportCharges'
import { getErrorMessage } from '../lib/errors'
import type { Charge } from '../types'

const currency = (value: number) =>
  value.toLocaleString('en-US', { style: 'currency', currency: 'USD', maximumFractionDigits: 0 })

const PAGE_SIZE = 15

const columnHelper = createColumnHelper<Charge>()

// Un solo cobro puede venir de Excel (sin serviceTypeId) o de Horarios (con
// serviceTypeId + fecha siempre presentes) — ver constraint
// `charges_unique_identity` en 20260912000000_unify_charges.sql, que evita
// duplicar un cobro para la misma propiedad + unidad + servicio + fecha.
export const Cobros = () => {
  const [refreshKey, setRefreshKey] = useState(0)
  const [importOpen, setImportOpen] = useState(false)
  const [invoiceCharge, setInvoiceCharge] = useState<Charge | null>(null)
  const [detailCharge, setDetailCharge] = useState<Charge | null>(null)
  const [propertyId, setPropertyId] = useState('all')
  const [status, setStatus] = useState<'all' | 'paid' | 'pending'>('all')
  const [sorting, setSorting] = useState<SortingState>([])
  const [pageIndex, setPageIndex] = useState(0)
  const [exporting, setExporting] = useState(false)
  const [exportError, setExportError] = useState<string | null>(null)

  const { data: charges, loading: loadingCharges, error } = useSupabaseQuery(fetchCharges, [refreshKey])
  const { data: properties, loading: loadingProperties } = useSupabaseQuery(fetchProperties, [refreshKey])
  const { data: serviceTypes, loading: loadingServiceTypes } = useSupabaseQuery(fetchServiceTypes, [refreshKey])

  const filtered = useMemo(
    () =>
      (charges ?? []).filter(
        (c) => (propertyId === 'all' || c.propertyId === propertyId) && (status === 'all' || c.status === status),
      ),
    [charges, propertyId, status],
  )

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
      columnHelper.accessor((row) => row.unitLabel || '—', { id: 'unit', header: 'Apartamento' }),
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

  // Las columnas dependen de properties/serviceTypes (para mostrar nombres,
  // no solo ids) además de charges — hay que esperar a que las tres
  // consultas terminen, o si no la tabla se pinta con nombres vacíos que
  // "aparecen" un instante después, cuando cada query resuelve por separado.
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
        subtitle="Cobros por apartamento — subidos a OPS, pendientes y capturados desde Horarios"
        action={
          <button
            type="button"
            onClick={() => setImportOpen(true)}
            className="flex items-center gap-2 rounded-lg bg-gold-500 px-3.5 py-2 text-sm font-semibold text-brand-900 transition hover:bg-gold-400"
          >
            <Upload className="h-4 w-4" />
            Cargar Excel
          </button>
        }
      />

      <div className="mx-8 mt-6 flex flex-wrap items-center justify-between gap-3">
        <div className="flex flex-wrap items-center gap-3">
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
          <select
            value={status}
            onChange={(e) => setStatus(e.target.value as typeof status)}
            className="rounded-lg border border-white/10 bg-surface-alt px-3 py-2 text-sm text-ink-200"
          >
            <option value="all">Todos los estatus</option>
            <option value="paid">Subidos a OPS</option>
            <option value="pending">Pendientes</option>
          </select>
        </div>

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

      {exportError && <p className="mx-8 mt-3 text-sm text-red-400">{exportError}</p>}

      <div className="grid grid-cols-1 gap-4 px-8 pt-6 sm:grid-cols-3 lg:max-w-2xl">
        <StatCard label="Cobrado" value={currency(totalPaid)} icon={DollarSign} tone="good" />
        <StatCard label="Pendiente" value={currency(totalPending)} icon={Clock} tone="warn" />
        <StatCard label="Registros" value={String(filtered.length)} icon={Receipt} />
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
    </div>
  )
}

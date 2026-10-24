import { useMemo, useState } from 'react'
import { AlertTriangle, Clock, DollarSign, Receipt } from 'lucide-react'
import {
  createColumnHelper,
  getCoreRowModel,
  getPaginationRowModel,
  getSortedRowModel,
  useReactTable,
  type SortingState,
} from '@tanstack/react-table'
import { PageHeader } from '../../components/common/PageHeader'
import { ReportExportActions } from '../../components/common/ReportExportActions'
import { buildCobrosReport } from '../../lib/reportExports'
import { StatCard } from '../../components/common/StatCard'
import { DataTablePanel } from '../../components/common/DataTablePanel'
import { ReportDateRangeBar } from '../../components/dashboard/ReportDateRangeBar'
import { StatusPill } from '../../components/common/StatusPill'
import { useReferenceData } from '../../contexts/ReferenceDataContext'
import { fetchCharges } from '../../lib/api'
import {
  AGING_BUCKET_LABELS,
  computeAgingByProperty,
  computeAgingDetail,
  computeOutstandingAging,
  filterChargesByRange,
  type AgingDetailRow,
  type DateRange,
  type PropertyAging,
} from '../../lib/dashboardMetrics'
import { useSupabaseQuery } from '../../lib/useSupabaseQuery'
import type { Charge } from '../../types'

const currency = (value: number) =>
  value.toLocaleString('en-US', { style: 'currency', currency: 'USD', maximumFractionDigits: 2 })

const percent = (value: number) => `${value.toFixed(1)}%`

const PAGE_SIZE = 15

const BUCKET_PILL_CLASS: Record<string, string> = {
  '0–30 días': 'bg-white/5 text-ink-400 ring-white/10',
  '31–60 días': 'bg-amber-500/10 text-amber-400 ring-amber-500/20',
  '61–90 días': 'bg-orange-500/10 text-orange-400 ring-orange-500/20',
  '+90 días': 'bg-red-500/10 text-red-400 ring-red-500/20',
}

const SEVERE_BUCKETS = new Set(['61–90 días', '+90 días'])

const chargeColumnHelper = createColumnHelper<Charge>()
const agingColumnHelper = createColumnHelper<AgingDetailRow>()
const propertyAgingColumnHelper = createColumnHelper<PropertyAging>()

const PROPERTY_AGING_COLUMNS = [
  propertyAgingColumnHelper.accessor('name', { id: 'name', header: 'Propiedad' }),
  propertyAgingColumnHelper.accessor('count', { id: 'count', header: 'Cobros' }),
  ...AGING_BUCKET_LABELS.map((label) =>
    propertyAgingColumnHelper.accessor((row) => row.buckets[label] ?? 0, {
      id: label,
      header: label,
      cell: (info) => {
        const value = info.getValue()
        if (value === 0) return <span className="text-ink-500">—</span>
        return (
          <span className={`tabular-nums ${SEVERE_BUCKETS.has(label) ? 'text-red-400' : 'text-ink-200'}`}>
            {currency(value)}
          </span>
        )
      },
    }),
  ),
  propertyAgingColumnHelper.accessor('oldestDays', {
    id: 'oldestDays',
    header: 'Más antiguo',
    cell: (info) => <span className="tabular-nums">{info.getValue()} días</span>,
  }),
  propertyAgingColumnHelper.accessor('total', {
    id: 'total',
    header: 'Total pendiente',
    cell: (info) => <span className="tabular-nums font-semibold text-white">{currency(info.getValue())}</span>,
  }),
]

export const ReportesCobros = () => {
  const [appliedRange, setAppliedRange] = useState<DateRange | null>(null)
  const [bucketFilter, setBucketFilter] = useState<string>('all')
  const [propertyFilter, setPropertyFilter] = useState<string>('all')
  const [propertyAgingSorting, setPropertyAgingSorting] = useState<SortingState>([{ id: 'total', desc: true }])
  const [propertyAgingPageIndex, setPropertyAgingPageIndex] = useState(0)
  const [invoiceSorting, setInvoiceSorting] = useState<SortingState>([{ id: 'date', desc: true }])
  const [invoicePageIndex, setInvoicePageIndex] = useState(0)
  const [agingSorting, setAgingSorting] = useState<SortingState>([{ id: 'days', desc: true }])
  const [agingPageIndex, setAgingPageIndex] = useState(0)

  const { data: charges, loading: loadingCharges, error: errorCharges } = useSupabaseQuery(fetchCharges, [])
  const { properties, loadingProperties, errorProperties } = useReferenceData()

  const loading = loadingCharges || loadingProperties
  const error = errorCharges ?? errorProperties

  const range = appliedRange ?? { start: '', end: '' }

  const periodCharges = useMemo(() => filterChargesByRange(charges ?? [], range), [charges, range])
  const collected = useMemo(
    () => periodCharges.filter((c) => c.status === 'paid').reduce((sum, c) => sum + c.amount, 0),
    [periodCharges],
  )
  const outstanding = useMemo(
    () => periodCharges.filter((c) => c.status === 'pending').reduce((sum, c) => sum + c.amount, 0),
    [periodCharges],
  )
  const totalPeriod = collected + outstanding
  const collectedPct = totalPeriod > 0 ? (collected / totalPeriod) * 100 : null

  const agingBuckets = useMemo(() => computeOutstandingAging(charges ?? []), [charges])
  const agingDetail = useMemo(() => computeAgingDetail(charges ?? [], properties ?? []), [charges, properties])
  const agingByProperty = useMemo(() => computeAgingByProperty(charges ?? [], properties ?? []), [charges, properties])
  const agingDetailFiltered = useMemo(
    () =>
      agingDetail.filter(
        (row) =>
          (bucketFilter === 'all' || row.bucket === bucketFilter) &&
          (propertyFilter === 'all' || row.propertyId === propertyFilter),
      ),
    [agingDetail, bucketFilter, propertyFilter],
  )

  const propertyAgingPageCount = Math.max(1, Math.ceil(agingByProperty.length / PAGE_SIZE))
  const propertyAgingCurrentPageIndex = Math.min(propertyAgingPageIndex, propertyAgingPageCount - 1)

  const propertyAgingTable = useReactTable({
    data: agingByProperty,
    columns: PROPERTY_AGING_COLUMNS,
    state: {
      sorting: propertyAgingSorting,
      pagination: { pageIndex: propertyAgingCurrentPageIndex, pageSize: PAGE_SIZE },
    },
    onSortingChange: setPropertyAgingSorting,
    onPaginationChange: (updater) => {
      const current = { pageIndex: propertyAgingCurrentPageIndex, pageSize: PAGE_SIZE }
      const next = typeof updater === 'function' ? updater(current) : updater
      setPropertyAgingPageIndex(next.pageIndex)
    },
    getCoreRowModel: getCoreRowModel(),
    getSortedRowModel: getSortedRowModel(),
    getPaginationRowModel: getPaginationRowModel(),
  })

  const handlePropertyAgingClick = (row: PropertyAging) => {
    setPropertyFilter(row.propertyId)
    setAgingPageIndex(0)
  }

  const invoiceColumns = useMemo(
    () => [
      chargeColumnHelper.accessor((row) => properties?.find((p) => p.id === row.propertyId)?.name ?? '—', {
        id: 'property',
        header: 'Propiedad',
      }),
      chargeColumnHelper.accessor((row) => row.unitLabel || '—', { id: 'unit', header: 'Apartamento' }),
      chargeColumnHelper.accessor((row) => row.invoiceNumber || '—', { id: 'invoiceNumber', header: 'Invoice #' }),
      chargeColumnHelper.accessor((row) => row.generatedDate || '—', { id: 'date', header: 'Fecha' }),
      chargeColumnHelper.accessor('status', {
        id: 'status',
        header: 'Estatus',
        cell: (info) => (
          <StatusPill
            status={info.getValue()}
            label={info.getValue() === 'paid' ? 'Subido a OPS' : undefined}
          />
        ),
      }),
      chargeColumnHelper.accessor('amount', {
        id: 'amount',
        header: 'Monto',
        cell: (info) => <span className="tabular-nums">{currency(info.getValue())}</span>,
      }),
    ],
    [properties],
  )

  const invoicePageCount = Math.max(1, Math.ceil(periodCharges.length / PAGE_SIZE))
  const invoiceCurrentPageIndex = Math.min(invoicePageIndex, invoicePageCount - 1)

  const invoiceTable = useReactTable({
    data: periodCharges,
    columns: invoiceColumns,
    state: { sorting: invoiceSorting, pagination: { pageIndex: invoiceCurrentPageIndex, pageSize: PAGE_SIZE } },
    onSortingChange: setInvoiceSorting,
    onPaginationChange: (updater) => {
      const current = { pageIndex: invoiceCurrentPageIndex, pageSize: PAGE_SIZE }
      const next = typeof updater === 'function' ? updater(current) : updater
      setInvoicePageIndex(next.pageIndex)
    },
    getCoreRowModel: getCoreRowModel(),
    getSortedRowModel: getSortedRowModel(),
    getPaginationRowModel: getPaginationRowModel(),
  })

  const agingColumns = useMemo(
    () => [
      agingColumnHelper.accessor('propertyName', { id: 'propertyName', header: 'Propiedad' }),
      agingColumnHelper.accessor((row) => row.unitLabel || '—', { id: 'unit', header: 'Apartamento' }),
      agingColumnHelper.accessor((row) => row.invoiceNumber || '—', { id: 'invoiceNumber', header: 'Invoice #' }),
      agingColumnHelper.accessor((row) => row.generatedDate || '—', { id: 'date', header: 'Fecha' }),
      agingColumnHelper.accessor('days', {
        id: 'days',
        header: 'Días',
        cell: (info) => <span className="tabular-nums">{info.getValue()}</span>,
      }),
      agingColumnHelper.accessor('bucket', {
        id: 'bucket',
        header: 'Antigüedad',
        cell: (info) => (
          <span
            className={`inline-flex items-center rounded-full px-2.5 py-1 text-xs font-medium ring-1 ring-inset ${
              BUCKET_PILL_CLASS[info.getValue()] ?? 'bg-white/5 text-ink-400 ring-white/10'
            }`}
          >
            {info.getValue()}
          </span>
        ),
      }),
      agingColumnHelper.accessor('amount', {
        id: 'amount',
        header: 'Monto',
        cell: (info) => <span className="tabular-nums">{currency(info.getValue())}</span>,
      }),
    ],
    [],
  )

  const agingPageCount = Math.max(1, Math.ceil(agingDetailFiltered.length / PAGE_SIZE))
  const agingCurrentPageIndex = Math.min(agingPageIndex, agingPageCount - 1)

  const agingTable = useReactTable({
    data: agingDetailFiltered,
    columns: agingColumns,
    state: { sorting: agingSorting, pagination: { pageIndex: agingCurrentPageIndex, pageSize: PAGE_SIZE } },
    onSortingChange: setAgingSorting,
    onPaginationChange: (updater) => {
      const current = { pageIndex: agingCurrentPageIndex, pageSize: PAGE_SIZE }
      const next = typeof updater === 'function' ? updater(current) : updater
      setAgingPageIndex(next.pageIndex)
    },
    getCoreRowModel: getCoreRowModel(),
    getSortedRowModel: getSortedRowModel(),
    getPaginationRowModel: getPaginationRowModel(),
  })

  const invoiceTableState = loading ? 'loading' : error ? 'error' : periodCharges.length === 0 ? 'empty' : 'ready'
  const invoiceTableMessage = loading
    ? 'Cargando…'
    : error
      ? `No se pudieron cargar los cobros: ${error}`
      : 'No hay cobros en este período.'

  const propertyAgingTableState = loading ? 'loading' : error ? 'error' : agingByProperty.length === 0 ? 'empty' : 'ready'
  const propertyAgingTableMessage = loading
    ? 'Cargando…'
    : error
      ? `No se pudieron cargar los cobros: ${error}`
      : 'No hay cobros pendientes.'

  const agingTableState = loading ? 'loading' : error ? 'error' : agingDetailFiltered.length === 0 ? 'empty' : 'ready'
  const agingTableMessage = loading
    ? 'Cargando…'
    : error
      ? `No se pudieron cargar los cobros: ${error}`
      : 'No hay cobros pendientes con estos filtros.'

  return (
    <div className="pb-10">
      <PageHeader
        title="Reportes · Cobros"
        subtitle="Subido a OPS vs. pendiente, invoices por período y antigüedad de cartera"
        action={
          <ReportExportActions
            disabled={!appliedRange || loading || !!error}
            buildReport={() =>
              buildCobrosReport({
                range,
                periodCharges,
                properties: properties ?? [],
                agingBuckets,
                agingByProperty,
                agingDetail: agingDetailFiltered,
                detailFilterLabel: [
                  propertyFilter === 'all'
                    ? null
                    : agingByProperty.find((row) => row.propertyId === propertyFilter)?.name ?? null,
                  bucketFilter === 'all' ? null : bucketFilter,
                ]
                  .filter(Boolean)
                  .join(' · '),
              })
            }
          />
        }
      />

      <ReportDateRangeBar onGenerate={setAppliedRange} generated={appliedRange !== null} />

      {!appliedRange ? (
        <p className="mx-8 mt-10 text-center text-sm text-ink-500">
          Elige un rango de fechas y dale "Generar reporte" para ver la información.
        </p>
      ) : error ? (
        <p className="mx-8 mt-6 text-sm text-red-400">No se pudieron cargar los cobros: {error}</p>
      ) : loading ? (
        <p className="mx-8 mt-6 text-sm text-ink-500">Cargando…</p>
      ) : (
        <>
          <div className="grid grid-cols-2 gap-4 px-8 pt-6 sm:grid-cols-4">
            <StatCard label="Subido a OPS" value={currency(collected)} icon={DollarSign} tone="good" />
            <StatCard label="Pendiente" value={currency(outstanding)} icon={Clock} tone="warn" />
            <StatCard label="% cobrado" value={collectedPct == null ? '—' : percent(collectedPct)} icon={Receipt} />
            <StatCard label="Cobros en el período" value={String(periodCharges.length)} icon={Receipt} />
          </div>

          <p className="mx-8 mt-6 text-sm text-ink-400">
            Invoices por período — {periodCharges.length} cobro{periodCharges.length === 1 ? '' : 's'} ·{' '}
            {currency(totalPeriod)} en el rango seleccionado arriba
          </p>
          <DataTablePanel
            title="Invoices por período"
            table={invoiceTable}
            page={invoiceCurrentPageIndex + 1}
            totalPages={invoicePageCount}
            onPageChange={(p) => setInvoicePageIndex(p - 1)}
            state={invoiceTableState}
            message={invoiceTableMessage}
          />

          <div className="grid grid-cols-2 gap-4 px-8 pt-10 sm:grid-cols-4">
            {agingBuckets.map((bucket) => (
              <StatCard
                key={bucket.label}
                label={bucket.label}
                value={currency(bucket.amount)}
                hint={`${bucket.count} cobro${bucket.count === 1 ? '' : 's'}`}
                icon={SEVERE_BUCKETS.has(bucket.label) ? AlertTriangle : Clock}
                tone={SEVERE_BUCKETS.has(bucket.label) ? 'warn' : 'default'}
              />
            ))}
          </div>

          <p className="mx-8 mt-3 text-xs text-ink-500">
            Antigüedad calculada desde la fecha en que se generó el cobro (generatedDate) — el modelo no tiene fecha
            de vencimiento real, así que es una aproximación. Es sobre toda la cartera pendiente actual, no sobre el
            rango de fecha seleccionado arriba.
          </p>

          <p className="mx-8 mt-6 text-sm text-ink-400">
            Cartera por propiedad — toda la cartera pendiente agrupada por propiedad. Haz clic en una fila para ver
            su detalle abajo.
          </p>
          <DataTablePanel
            title="Cartera por propiedad"
            table={propertyAgingTable}
            page={propertyAgingCurrentPageIndex + 1}
            totalPages={propertyAgingPageCount}
            onPageChange={(p) => setPropertyAgingPageIndex(p - 1)}
            state={propertyAgingTableState}
            message={propertyAgingTableMessage}
            onRowClick={handlePropertyAgingClick}
          />

          <div className="mx-8 mt-6 flex flex-wrap items-center justify-between gap-3">
            <p className="text-sm text-ink-400">Detalle de cartera pendiente</p>
            <div className="flex flex-wrap items-center gap-3">
              <select
                value={propertyFilter}
                onChange={(e) => {
                  setPropertyFilter(e.target.value)
                  setAgingPageIndex(0)
                }}
                className="rounded-lg border border-white/10 bg-surface-alt px-3 py-2 text-sm text-ink-200 outline-none focus:border-gold-500"
              >
                <option value="all">Todas las propiedades</option>
                {agingByProperty.map((row) => (
                  <option key={row.propertyId} value={row.propertyId}>
                    {row.name}
                  </option>
                ))}
              </select>
              <select
                value={bucketFilter}
                onChange={(e) => setBucketFilter(e.target.value)}
                className="rounded-lg border border-white/10 bg-surface-alt px-3 py-2 text-sm text-ink-200 outline-none focus:border-gold-500"
              >
                <option value="all">Todos los buckets</option>
                {agingBuckets.map((bucket) => (
                  <option key={bucket.label} value={bucket.label}>
                    {bucket.label}
                  </option>
                ))}
              </select>
            </div>
          </div>
          <DataTablePanel
            title="Detalle de cartera pendiente"
            table={agingTable}
            page={agingCurrentPageIndex + 1}
            totalPages={agingPageCount}
            onPageChange={(p) => setAgingPageIndex(p - 1)}
            state={agingTableState}
            message={agingTableMessage}
          />
        </>
      )}
    </div>
  )
}

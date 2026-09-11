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
import { StatCard } from '../../components/common/StatCard'
import { DataTablePanel } from '../../components/common/DataTablePanel'
import { DashboardDateRangeSelect } from '../../components/dashboard/DashboardDateRangeSelect'
import { StatusPill } from '../../components/common/StatusPill'
import { fetchCharges, fetchProperties } from '../../lib/api'
import {
  computeAgingDetail,
  computeDateRange,
  computeOutstandingAging,
  filterChargesByRange,
  type AgingDetailRow,
  type DashboardDateRangeKey,
} from '../../lib/dashboardMetrics'
import { useSupabaseQuery } from '../../lib/useSupabaseQuery'
import type { Charge } from '../../types'

const currency = (value: number) =>
  value.toLocaleString('en-US', { style: 'currency', currency: 'USD', maximumFractionDigits: 0 })

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

// Reportes › Cobros — segunda categoría de la hoja de ruta de reportería.
// "Cobros pendientes", "Cobros por propiedad" e "Historial de pagos" del
// catálogo del cliente ya están cubiertos por la pantalla Cobros existente
// (filtro por estatus, por propiedad, y columna Fecha ordenable) — no se
// duplican acá. Lo genuinamente nuevo son los reportes que Cobros.tsx no
// puede hacer porque no tiene filtro de fecha ("Cobrado vs. pendiente" e
// "Invoices por período", por rango), más el drill-down de antigüedad (el
// Dashboard solo muestra los 4 totales por bucket, no el detalle por cobro).
export const ReportesCobros = () => {
  const [rangeKey, setRangeKey] = useState<DashboardDateRangeKey>('this_month')
  const [bucketFilter, setBucketFilter] = useState<string>('all')
  const [invoiceSorting, setInvoiceSorting] = useState<SortingState>([{ id: 'date', desc: true }])
  const [invoicePageIndex, setInvoicePageIndex] = useState(0)
  const [agingSorting, setAgingSorting] = useState<SortingState>([{ id: 'days', desc: true }])
  const [agingPageIndex, setAgingPageIndex] = useState(0)

  const { data: charges, loading: loadingCharges, error: errorCharges } = useSupabaseQuery(fetchCharges, [])
  const { data: properties, loading: loadingProperties, error: errorProperties } = useSupabaseQuery(fetchProperties, [])

  const loading = loadingCharges || loadingProperties
  const error = errorCharges ?? errorProperties

  const range = useMemo(() => computeDateRange(rangeKey), [rangeKey])

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

  // La antigüedad es sobre TODA la cartera pendiente ahora mismo, no sobre
  // el rango de fecha de arriba — igual que en el Dashboard (ver nota en
  // dashboardMetrics.ts): "cuántos días lleva sin cobrarse" no depende del
  // período que estés revisando.
  const agingBuckets = useMemo(() => computeOutstandingAging(charges ?? []), [charges])
  const agingDetail = useMemo(() => computeAgingDetail(charges ?? [], properties ?? []), [charges, properties])
  const agingDetailFiltered = useMemo(
    () => (bucketFilter === 'all' ? agingDetail : agingDetail.filter((row) => row.bucket === bucketFilter)),
    [agingDetail, bucketFilter],
  )

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
        cell: (info) => <StatusPill status={info.getValue()} />,
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

  const agingTableState = loading ? 'loading' : error ? 'error' : agingDetailFiltered.length === 0 ? 'empty' : 'ready'
  const agingTableMessage = loading
    ? 'Cargando…'
    : error
      ? `No se pudieron cargar los cobros: ${error}`
      : 'No hay cobros pendientes en este bucket.'

  return (
    <div className="pb-10">
      <PageHeader
        title="Reportes · Cobros"
        subtitle="Cobrado vs. pendiente, invoices por período y antigüedad de cartera"
        action={<DashboardDateRangeSelect value={rangeKey} onChange={setRangeKey} />}
      />

      {error ? (
        <p className="mx-8 mt-6 text-sm text-red-400">No se pudieron cargar los cobros: {error}</p>
      ) : loading ? (
        <p className="mx-8 mt-6 text-sm text-ink-500">Cargando…</p>
      ) : (
        <>
          <div className="grid grid-cols-2 gap-4 px-8 pt-6 sm:grid-cols-4">
            <StatCard label="Cobrado" value={currency(collected)} icon={DollarSign} tone="good" />
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

          <div className="mx-8 mt-6 flex flex-wrap items-center justify-between gap-3">
            <p className="text-sm text-ink-400">Detalle de cartera pendiente</p>
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

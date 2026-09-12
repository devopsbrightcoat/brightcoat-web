import { useMemo, useState } from 'react'
import { CheckCircle2, Clock, Receipt } from 'lucide-react'
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
import { StatusPill } from '../components/common/StatusPill'
import { ImpuestosMonthDetailModal, type MonthGroup } from '../components/impuestos/ImpuestosMonthDetailModal'
import { fetchCharges, fetchProperties, updateChargesTaxPaid } from '../lib/api'
import { useSupabaseQuery } from '../lib/useSupabaseQuery'
import { formatMonthLabel, parseISODate } from '../lib/scheduleDates'
import { extractTaxFromTotal, SALES_TAX_RATE } from '../lib/tax'
import { getErrorMessage } from '../lib/errors'

const currency = (value: number) =>
  value.toLocaleString('en-US', { style: 'currency', currency: 'USD', maximumFractionDigits: 2 })

const PAGE_SIZE = 15

const columnHelper = createColumnHelper<MonthGroup>()

// Resumen del impuesto de ventas (8.25% fijo, ya incluido en el monto de
// cada cobro — ver lib/tax.ts) agrupado por mes calendario. Solo cuenta
// cobros con status='paid' ("subidos a OPS"): son los únicos con
// generatedDate real, y representan el cobro ya finalizado — uno
// "pendiente por cobrar" todavía no genera obligación de impuesto. Cada
// mes se puede marcar como pagado/pendiente en bloque, o cobro por cobro
// desde ImpuestosMonthDetailModal — ambos caminos solo tocan
// charges.tax_paid/tax_paid_date, nunca amount.
export const Impuestos = () => {
  const [refreshKey, setRefreshKey] = useState(0)
  const [sorting, setSorting] = useState<SortingState>([])
  const [pageIndex, setPageIndex] = useState(0)
  const [detailMonthKey, setDetailMonthKey] = useState<string | null>(null)
  const [savingMonthKey, setSavingMonthKey] = useState<string | null>(null)
  const [actionError, setActionError] = useState<string | null>(null)

  const { data: charges, loading: loadingCharges, error } = useSupabaseQuery(fetchCharges, [refreshKey])
  const { data: properties, loading: loadingProperties } = useSupabaseQuery(fetchProperties, [refreshKey])

  const months = useMemo<MonthGroup[]>(() => {
    const taxable = (charges ?? []).filter((c) => c.status === 'paid' && c.generatedDate)
    const groups = new Map<string, typeof taxable>()
    for (const charge of taxable) {
      const date = parseISODate(charge.generatedDate!)
      const key = `${date.getFullYear()}-${String(date.getMonth() + 1).padStart(2, '0')}`
      if (!groups.has(key)) groups.set(key, [])
      groups.get(key)!.push(charge)
    }
    return Array.from(groups.entries())
      .map(([key, groupCharges]) => {
        const [year, month] = key.split('-').map(Number)
        let totalTax = 0
        let paidTax = 0
        for (const c of groupCharges) {
          const tax = extractTaxFromTotal(c.amount)
          totalTax += tax
          if (c.taxPaid) paidTax += tax
        }
        const totalAmount = groupCharges.reduce((sum, c) => sum + c.amount, 0)
        const allPaid = groupCharges.every((c) => c.taxPaid)
        const nonePaid = groupCharges.every((c) => !c.taxPaid)
        return {
          key,
          label: formatMonthLabel(year, month - 1),
          charges: groupCharges,
          totalBase: totalAmount - totalTax,
          totalTax,
          paidTax,
          pendingTax: totalTax - paidTax,
          taxStatus: (allPaid ? 'paid' : nonePaid ? 'pending' : 'partial') as MonthGroup['taxStatus'],
        }
      })
      .sort((a, b) => b.key.localeCompare(a.key))
  }, [charges])

  const activeMonth = months.find((m) => m.key === detailMonthKey) ?? null

  const totalTax = months.reduce((sum, m) => sum + m.totalTax, 0)
  const totalPaid = months.reduce((sum, m) => sum + m.paidTax, 0)
  const totalPending = months.reduce((sum, m) => sum + m.pendingTax, 0)

  const handleToggleMonth = async (month: MonthGroup) => {
    const markPaid = month.taxStatus !== 'paid'
    setSavingMonthKey(month.key)
    setActionError(null)
    try {
      await updateChargesTaxPaid(
        month.charges.map((c) => c.id),
        markPaid,
      )
      setRefreshKey((k) => k + 1)
    } catch (err) {
      setActionError(getErrorMessage(err, 'No se pudo actualizar el estado del impuesto.'))
    } finally {
      setSavingMonthKey(null)
    }
  }

  const columns = useMemo(
    () => [
      columnHelper.accessor('label', { id: 'month', header: 'Mes' }),
      columnHelper.accessor((row) => row.charges.length, { id: 'count', header: 'Cobros' }),
      columnHelper.accessor('totalBase', {
        id: 'base',
        header: 'Base',
        cell: (info) => <span className="tabular-nums">{currency(info.getValue())}</span>,
      }),
      columnHelper.accessor('totalTax', {
        id: 'tax',
        header: `Impuesto (${(SALES_TAX_RATE * 100).toFixed(2)}%)`,
        cell: (info) => <span className="tabular-nums text-gold-400">{currency(info.getValue())}</span>,
      }),
      columnHelper.accessor('taxStatus', {
        id: 'status',
        header: 'Estado',
        cell: (info) => {
          const value = info.getValue()
          return value === 'partial' ? (
            <span className="inline-flex items-center rounded-full bg-amber-500/10 px-2.5 py-1 text-xs font-medium text-amber-400 ring-1 ring-inset ring-amber-500/20">
              Parcial
            </span>
          ) : (
            <StatusPill status={value} />
          )
        },
      }),
      columnHelper.display({
        id: 'actions',
        header: '',
        cell: (info) => {
          const month = info.row.original
          const willMarkPaid = month.taxStatus !== 'paid'
          return (
            <button
              type="button"
              disabled={savingMonthKey === month.key}
              onClick={(e) => {
                e.stopPropagation()
                handleToggleMonth(month)
              }}
              className="flex items-center gap-1.5 rounded-lg border border-white/10 px-2.5 py-1.5 text-xs font-medium text-ink-300 hover:bg-white/5 disabled:opacity-60"
            >
              {savingMonthKey === month.key ? 'Guardando…' : willMarkPaid ? 'Marcar pagado' : 'Marcar pendiente'}
            </button>
          )
        },
      }),
    ],
    // eslint-disable-next-line react-hooks/exhaustive-deps
    [savingMonthKey],
  )

  const pageCount = Math.max(1, Math.ceil(months.length / PAGE_SIZE))
  const currentPageIndex = Math.min(pageIndex, pageCount - 1)

  const table = useReactTable({
    data: months,
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

  const loading = loadingCharges || loadingProperties
  const tableState = loading ? 'loading' : error ? 'error' : months.length === 0 ? 'empty' : 'ready'
  const tableMessage = loading
    ? 'Cargando impuestos…'
    : error
      ? `No se pudieron cargar los impuestos: ${error}`
      : 'Todavía no hay cobros subidos a OPS con los que calcular impuestos.'

  return (
    <div className="h-screen overflow-hidden flex flex-col">
      <PageHeader
        title="Impuestos"
        subtitle={`Impuesto de ventas (${(SALES_TAX_RATE * 100).toFixed(2)}% fijo) incluido en los cobros — por mes`}
      />

      {actionError && <p className="mx-8 mt-4 text-sm text-red-400">{actionError}</p>}

      <div className="mx-8 mt-6 grid grid-cols-1 gap-4 sm:grid-cols-3 lg:max-w-2xl">
        <StatCard label="Impuesto total" value={currency(totalTax)} icon={Receipt} />
        <StatCard label="Pagado" value={currency(totalPaid)} icon={CheckCircle2} tone="good" />
        <StatCard label="Pendiente" value={currency(totalPending)} icon={Clock} tone="warn" />
      </div>

      <DataTablePanel
        title="Impuestos por mes"
        table={table}
        page={currentPageIndex + 1}
        totalPages={pageCount}
        onPageChange={(p) => setPageIndex(p - 1)}
        state={tableState}
        message={tableMessage}
        onRowClick={(row) => setDetailMonthKey(row.key)}
      />

      <ImpuestosMonthDetailModal
        month={activeMonth}
        properties={properties ?? []}
        onClose={() => setDetailMonthKey(null)}
        onChanged={() => setRefreshKey((k) => k + 1)}
      />
    </div>
  )
}

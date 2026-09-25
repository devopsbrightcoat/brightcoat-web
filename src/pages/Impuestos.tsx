import { useMemo, useState } from 'react'
import { CalendarDays, CheckCircle2, Clock, Receipt } from 'lucide-react'
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
import { FilterPanel } from '../components/common/FilterPanel'
import { QuincenaDateFilter } from '../components/dashboard/QuincenaDateFilter'
import { ImpuestosMonthDetailModal, type MonthGroup } from '../components/impuestos/ImpuestosMonthDetailModal'
import { useReferenceData } from '../contexts/ReferenceDataContext'
import { fetchCharges, updateChargesTaxPaid } from '../lib/api'
import { useSupabaseQuery } from '../lib/useSupabaseQuery'
import { formatMonthLabel, parseISODate, MONTH_NAMES } from '../lib/scheduleDates'
import { computeChargeTax, SALES_TAX_RATE } from '../lib/tax'
import { getErrorMessage } from '../lib/errors'

const currency = (value: number) =>
  value.toLocaleString('en-US', { style: 'currency', currency: 'USD', maximumFractionDigits: 2 })

const PAGE_SIZE = 15

const shortDateLabel = (iso: string) => {
  const date = new Date(`${iso}T00:00:00`)
  return `${date.getDate()} ${MONTH_NAMES[date.getMonth()].slice(0, 3)}`
}

const columnHelper = createColumnHelper<MonthGroup>()

export const Impuestos = () => {
  const [refreshKey, setRefreshKey] = useState(0)
  const [sorting, setSorting] = useState<SortingState>([])
  const [pageIndex, setPageIndex] = useState(0)
  const [detailMonthKey, setDetailMonthKey] = useState<string | null>(null)
  const [savingMonthKey, setSavingMonthKey] = useState<string | null>(null)
  const [actionError, setActionError] = useState<string | null>(null)
  const [dateFrom, setDateFrom] = useState('')
  const [dateTo, setDateTo] = useState('')
  const [dateFilterOpen, setDateFilterOpen] = useState(false)

  const { data: charges, loading: loadingCharges, error } = useSupabaseQuery(
    () => fetchCharges(dateFrom || undefined, dateTo || undefined),
    [refreshKey, dateFrom, dateTo],
  )
  const { properties, loadingProperties } = useReferenceData()

  const months = useMemo<MonthGroup[]>(() => {
    // Solo cuentan los cobros marcados como "impuesto incluido" — uno sin
    // esa marca no se le calcula ni se le suma impuesto en esta pantalla.
    const taxable = (charges ?? []).filter((c) => c.status === 'paid' && c.generatedDate && c.taxIncluded)
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
        let totalBase = 0
        let totalTax = 0
        let paidTax = 0
        for (const c of groupCharges) {
          const { base, tax } = computeChargeTax(c.amount, c.taxIncluded)
          totalBase += base
          totalTax += tax
          if (c.taxPaid) paidTax += tax
        }
        const allPaid = groupCharges.every((c) => c.taxPaid)
        const nonePaid = groupCharges.every((c) => !c.taxPaid)
        return {
          key,
          label: formatMonthLabel(year, month - 1),
          charges: groupCharges,
          totalBase,
          totalTax,
          paidTax,
          pendingTax: totalTax - paidTax,
          taxStatus: (allPaid ? 'paid' : nonePaid ? 'pending' : 'partial') as MonthGroup['taxStatus'],
        }
      })
      .sort((a, b) => b.key.localeCompare(a.key))
  }, [charges])

  const activeMonth = months.find((m) => m.key === detailMonthKey) ?? null

  const hasDateFilter = Boolean(dateFrom) || Boolean(dateTo)
  const dateRangeLabel =
    dateFrom && dateTo
      ? `${shortDateLabel(dateFrom)} – ${shortDateLabel(dateTo)}`
      : dateFrom
        ? `Desde ${shortDateLabel(dateFrom)}`
        : dateTo
          ? `Hasta ${shortDateLabel(dateTo)}`
          : 'Todas las fechas'

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
        subtitle={`Impuesto de ventas (${(SALES_TAX_RATE * 100).toFixed(2)}% fijo) sobre los cobros marcados como "impuesto incluido" — por mes`}
        action={
          <button
            type="button"
            onClick={() => setDateFilterOpen(true)}
            className="flex items-center gap-2 rounded-lg border border-white/10 bg-surface-alt px-3.5 py-2 text-sm font-medium text-ink-300 hover:bg-white/5"
          >
            <CalendarDays className="h-4 w-4" />
            {dateRangeLabel}
          </button>
        }
      />

      <FilterPanel
        open={dateFilterOpen}
        onClose={() => setDateFilterOpen(false)}
        title="Quincena"
        hasFilters={hasDateFilter}
        onClear={() => {
          setDateFrom('')
          setDateTo('')
        }}
      >
        <QuincenaDateFilter
          dateFrom={dateFrom}
          dateTo={dateTo}
          onDateFromChange={setDateFrom}
          onDateToChange={setDateTo}
          fromId="impuestos-date-from"
          toId="impuestos-date-to"
        />
      </FilterPanel>

      {actionError && <p className="mx-8 mt-4 text-sm text-red-400">{actionError}</p>}

      <div className="mx-8 mt-6 grid grid-cols-3 gap-3 sm:max-w-lg">
        <StatCard label="Impuesto total" value={currency(totalTax)} icon={Receipt} size="compact" />
        <StatCard label="Pagado" value={currency(totalPaid)} icon={CheckCircle2} tone="good" size="compact" />
        <StatCard label="Pendiente" value={currency(totalPending)} icon={Clock} tone="warn" size="compact" />
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

import type { Charge, Expense, Property, Vendor } from '../types'
import {
  AGING_BUCKET_LABELS,
  REVENUE_PERIOD_GRANULARITY_OPTIONS,
  type AgingBucket,
  type AgingDetailRow,
  type DashboardKpis,
  type DateRange,
  type ExpensesByPeriod,
  type MonthlyFinancials,
  type PropertyAging,
  type PropertyProfitability,
  type RevenueByPeriod,
  type RevenuePeriodGranularity,
  type ServiceCategoryRevenue,
  type VendorExpenses,
} from './dashboardMetrics'

export type ReportCellFormat = 'text' | 'currency' | 'percent' | 'number'

export type ReportCell = string | number | null

export type ReportColumn = {
  header: string
  format?: ReportCellFormat
  weight?: number
}

export type ReportSection = {
  title: string
  note?: string
  columns: ReportColumn[]
  rows: ReportCell[][]
  totals?: ReportCell[]
}

export type ReportKpi = {
  label: string
  value: ReportCell
  format?: ReportCellFormat
}

export type ReportExport = {
  title: string
  fileSlug: string
  range: DateRange
  periodLabel: string
  kpis: ReportKpi[]
  sections: ReportSection[]
}

const MONTH_SHORT = ['ene', 'feb', 'mar', 'abr', 'may', 'jun', 'jul', 'ago', 'sep', 'oct', 'nov', 'dic']

const formatShortDate = (iso: string) => {
  const [year, month, day] = iso.split('-')
  return `${Number(day)} ${MONTH_SHORT[Number(month) - 1]} ${year}`
}

export const formatReportPeriod = (range: DateRange) => `${formatShortDate(range.start)} – ${formatShortDate(range.end)}`

export const formatReportCell = (value: ReportCell, format: ReportCellFormat = 'text'): string => {
  if (value == null || value === '') return '—'
  if (typeof value === 'string') return value
  if (format === 'currency') {
    return value.toLocaleString('en-US', { style: 'currency', currency: 'USD', maximumFractionDigits: 2 })
  }
  if (format === 'percent') return `${value.toFixed(1)}%`
  return String(value)
}

export const isNumericFormat = (format?: ReportCellFormat) =>
  format === 'currency' || format === 'percent' || format === 'number'

export const buildReportFilename = (report: ReportExport, extension?: string) => {
  const base = `reporte-${report.fileSlug}-${report.range.start}_${report.range.end}`
  return extension ? `${base}.${extension}` : base
}

const sum = (values: number[]) => values.reduce((total, value) => total + value, 0)

const share = (value: number, total: number) => (total > 0 ? (value / total) * 100 : null)

const monthLabel = (month: MonthlyFinancials) => `${month.month} ${month.key.slice(0, 4)}`

const granularityTitle = (granularity: RevenuePeriodGranularity) =>
  (REVENUE_PERIOD_GRANULARITY_OPTIONS.find((opt) => opt.value === granularity)?.label ?? '').toLowerCase()

const periodRowLabel = (row: { key: string; label: string }, granularity: RevenuePeriodGranularity) =>
  granularity === 'day' ? row.key : row.label

type FinancieroReportInput = {
  range: DateRange
  granularity: RevenuePeriodGranularity
  kpis: DashboardKpis
  revenueByPeriod: RevenueByPeriod[]
  monthlyFinancials: MonthlyFinancials[]
  revenueByCategory: ServiceCategoryRevenue[]
  profitability: PropertyProfitability[]
}

export const buildFinancieroReport = ({
  range,
  granularity,
  kpis,
  revenueByPeriod,
  monthlyFinancials,
  revenueByCategory,
  profitability,
}: FinancieroReportInput): ReportExport => {
  const categoryTotal = sum(revenueByCategory.map((c) => c.revenue))
  const propertyRevenue = sum(profitability.map((p) => p.revenue))
  const propertyProfit = sum(profitability.map((p) => p.estimatedProfit))

  return {
    title: 'Reporte financiero',
    fileSlug: 'financiero',
    range,
    periodLabel: formatReportPeriod(range),
    kpis: [
      { label: 'Ventas', value: kpis.revenue, format: 'currency' },
      { label: 'Subido a OPS', value: kpis.collected, format: 'currency' },
      { label: 'Pendiente', value: kpis.outstanding, format: 'currency' },
      { label: 'Pago a empleados', value: kpis.laborCost, format: 'currency' },
      { label: 'Gastos', value: kpis.expenses, format: 'currency' },
      { label: 'Impuesto incluido', value: kpis.accumulatedTax, format: 'currency' },
      { label: 'Ganancia estimada', value: kpis.estimatedProfit, format: 'currency' },
      { label: 'Margen de ganancia', value: kpis.profitMargin, format: 'percent' },
    ],
    sections: [
      {
        title: `Ventas por período (${granularityTitle(granularity)})`,
        columns: [
          { header: 'Período', weight: 2 },
          { header: 'Ventas', format: 'currency' },
        ],
        rows: revenueByPeriod.map((p) => [periodRowLabel(p, granularity), p.revenue]),
        totals: ['Total', sum(revenueByPeriod.map((p) => p.revenue))],
      },
      {
        title: 'Ventas por categoría de servicio',
        columns: [
          { header: 'Categoría', weight: 2 },
          { header: 'Ventas', format: 'currency' },
          { header: '% del total', format: 'percent' },
        ],
        rows: revenueByCategory.map((c) => [c.label, c.revenue, share(c.revenue, categoryTotal)]),
        totals: ['Total', categoryTotal, categoryTotal > 0 ? 100 : null],
      },
      {
        title: 'Rentabilidad por propiedad',
        note:
          'Ganancia estimada = ventas de la propiedad - costo de planilla - impuesto de ventas incluido. No reparte los gastos generales del negocio.',
        columns: [
          { header: 'Propiedad', weight: 2.5 },
          { header: 'Ventas', format: 'currency' },
          { header: '% del total', format: 'percent' },
          { header: 'Costo laboral', format: 'currency' },
          { header: 'Impuesto incluido', format: 'currency' },
          { header: 'Ganancia estimada', format: 'currency' },
          { header: 'Margen', format: 'percent' },
        ],
        rows: [...profitability]
          .sort((a, b) => b.revenue - a.revenue)
          .map((p) => [
            p.name,
            p.revenue,
            share(p.revenue, propertyRevenue),
            p.laborCost,
            p.salesTax,
            p.estimatedProfit,
            p.margin,
          ]),
        totals: [
          'Total',
          propertyRevenue,
          propertyRevenue > 0 ? 100 : null,
          sum(profitability.map((p) => p.laborCost)),
          sum(profitability.map((p) => p.salesTax)),
          propertyProfit,
          share(propertyProfit, propertyRevenue),
        ],
      },
      {
        title: 'Ventas vs. gastos vs. pago a empleados',
        note: 'Últimos 12 meses, independiente del rango seleccionado.',
        columns: [
          { header: 'Mes', weight: 1.5 },
          { header: 'Ventas', format: 'currency' },
          { header: 'Gastos', format: 'currency' },
          { header: 'Pago a empleados', format: 'currency' },
        ],
        rows: monthlyFinancials.map((m) => [monthLabel(m), m.revenue, m.expenses, m.labor]),
        totals: [
          'Total',
          sum(monthlyFinancials.map((m) => m.revenue)),
          sum(monthlyFinancials.map((m) => m.expenses)),
          sum(monthlyFinancials.map((m) => m.labor)),
        ],
      },
    ],
  }
}

type CobrosReportInput = {
  range: DateRange
  periodCharges: Charge[]
  properties: Property[]
  agingBuckets: AgingBucket[]
  agingByProperty: PropertyAging[]
  agingDetail: AgingDetailRow[]
  detailFilterLabel?: string
}

export const buildCobrosReport = ({
  range,
  periodCharges,
  properties,
  agingBuckets,
  agingByProperty,
  agingDetail,
  detailFilterLabel,
}: CobrosReportInput): ReportExport => {
  const collected = sum(periodCharges.filter((c) => c.status === 'paid').map((c) => c.amount))
  const outstanding = sum(periodCharges.filter((c) => c.status === 'pending').map((c) => c.amount))
  const propertyName = (id: string) => properties.find((p) => p.id === id)?.name ?? '—'
  const sortedCharges = [...periodCharges].sort((a, b) => (b.generatedDate ?? '').localeCompare(a.generatedDate ?? ''))

  return {
    title: 'Reporte de cobros',
    fileSlug: 'cobros',
    range,
    periodLabel: formatReportPeriod(range),
    kpis: [
      { label: 'Subido a OPS', value: collected, format: 'currency' },
      { label: 'Pendiente', value: outstanding, format: 'currency' },
      { label: '% cobrado', value: share(collected, collected + outstanding), format: 'percent' },
      { label: 'Cobros en el período', value: periodCharges.length, format: 'number' },
      ...agingBuckets.map((b): ReportKpi => ({ label: `Cartera ${b.label}`, value: b.amount, format: 'currency' })),
    ],
    sections: [
      {
        title: 'Invoices por período',
        columns: [
          { header: 'Propiedad', weight: 2 },
          { header: 'Apartamento' },
          { header: 'Invoice #' },
          { header: 'Fecha' },
          { header: 'Estatus' },
          { header: 'Monto', format: 'currency' },
        ],
        rows: sortedCharges.map((c) => [
          propertyName(c.propertyId),
          c.unitLabel || null,
          c.invoiceNumber || null,
          c.generatedDate || null,
          c.status === 'paid' ? 'Subido a OPS' : 'Pendiente',
          c.amount,
        ]),
        totals: ['Total', null, null, null, null, collected + outstanding],
      },
      {
        title: 'Cartera por propiedad',
        note: 'Toda la cartera pendiente actual, no solo el rango seleccionado. Antigüedad desde la fecha en que se generó el cobro.',
        columns: [
          { header: 'Propiedad', weight: 2 },
          { header: 'Cobros', format: 'number' },
          ...AGING_BUCKET_LABELS.map((label): ReportColumn => ({ header: label, format: 'currency' })),
          { header: 'Más antiguo (días)', format: 'number' },
          { header: 'Total pendiente', format: 'currency' },
        ],
        rows: agingByProperty.map((p) => [
          p.name,
          p.count,
          ...AGING_BUCKET_LABELS.map((label) => p.buckets[label] ?? 0),
          p.oldestDays,
          p.total,
        ]),
        totals: [
          'Total',
          sum(agingByProperty.map((p) => p.count)),
          ...AGING_BUCKET_LABELS.map((label) => sum(agingByProperty.map((p) => p.buckets[label] ?? 0))),
          null,
          sum(agingByProperty.map((p) => p.total)),
        ],
      },
      {
        title: 'Detalle de cartera pendiente',
        note: detailFilterLabel ? `Filtro aplicado: ${detailFilterLabel}.` : undefined,
        columns: [
          { header: 'Propiedad', weight: 2 },
          { header: 'Apartamento' },
          { header: 'Invoice #' },
          { header: 'Fecha' },
          { header: 'Días', format: 'number' },
          { header: 'Antigüedad' },
          { header: 'Monto', format: 'currency' },
        ],
        rows: agingDetail.map((row) => [
          row.propertyName,
          row.unitLabel || null,
          row.invoiceNumber || null,
          row.generatedDate || null,
          row.days,
          row.bucket,
          row.amount,
        ]),
        totals: ['Total', null, null, null, null, null, sum(agingDetail.map((row) => row.amount))],
      },
    ],
  }
}

type GastosReportInput = {
  range: DateRange
  granularity: RevenuePeriodGranularity
  total: number
  previousTotal: number
  changePct: number | null
  monthlyAverage: number
  expensesByPeriod: ExpensesByPeriod[]
  expensesByVendor: VendorExpenses[]
  monthlyTrend: MonthlyFinancials[]
  periodExpenses: Expense[]
  vendors: Vendor[]
}

export const buildGastosReport = ({
  range,
  granularity,
  total,
  previousTotal,
  changePct,
  monthlyAverage,
  expensesByPeriod,
  expensesByVendor,
  monthlyTrend,
  periodExpenses,
  vendors,
}: GastosReportInput): ReportExport => {
  const vendorName = (id?: string) => (id ? vendors.find((v) => v.id === id)?.name ?? 'Proveedor eliminado' : null)
  const sortedExpenses = [...periodExpenses].sort((a, b) => b.date.localeCompare(a.date))

  return {
    title: 'Reporte de gastos',
    fileSlug: 'gastos',
    range,
    periodLabel: formatReportPeriod(range),
    kpis: [
      { label: 'Total del período', value: total, format: 'currency' },
      { label: 'Período anterior', value: previousTotal, format: 'currency' },
      { label: 'Cambio vs. anterior', value: changePct, format: 'percent' },
      { label: 'Promedio mensual (12 meses)', value: monthlyAverage, format: 'currency' },
    ],
    sections: [
      {
        title: `Gastos por período (${granularityTitle(granularity)})`,
        columns: [
          { header: 'Período', weight: 2 },
          { header: 'Gastos', format: 'currency' },
        ],
        rows: expensesByPeriod.map((p) => [periodRowLabel(p, granularity), p.total]),
        totals: ['Total', total],
      },
      {
        title: 'Gastos por proveedor',
        columns: [
          { header: 'Proveedor', weight: 2 },
          { header: 'Gastos', format: 'number' },
          { header: 'Total', format: 'currency' },
          { header: '% del total', format: 'percent' },
        ],
        rows: expensesByVendor.map((v) => [v.name, v.count, v.total, share(v.total, total)]),
        totals: ['Total', sum(expensesByVendor.map((v) => v.count)), total, total > 0 ? 100 : null],
      },
      {
        title: 'Tendencia mensual',
        note: 'Últimos 12 meses, independiente del rango seleccionado.',
        columns: [
          { header: 'Mes', weight: 1.5 },
          { header: 'Gastos', format: 'currency' },
        ],
        rows: monthlyTrend.map((m) => [monthLabel(m), m.expenses]),
        totals: ['Total', sum(monthlyTrend.map((m) => m.expenses))],
      },
      {
        title: 'Detalle de gastos',
        columns: [
          { header: 'Fecha' },
          { header: 'Factura' },
          { header: 'Proveedor', weight: 1.5 },
          { header: 'Descripción', weight: 3 },
          { header: 'Monto', format: 'currency' },
        ],
        rows: sortedExpenses.map((e) => [
          e.date,
          e.invoiceNumber || null,
          vendorName(e.vendorId),
          e.description || null,
          e.amount,
        ]),
        totals: ['Total', null, null, null, total],
      },
    ],
  }
}

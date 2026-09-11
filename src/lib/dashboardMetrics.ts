import type { Charge, Employee, PayrollEntry, Expense, Property, Schedule, ServiceType } from '../types'
import { addDays, parseISODate, toISODate } from './scheduleDates'

// ---------------------------------------------------------------------------
// Cálculos para el Dashboard (Business Overview) — ver propuesta de diseño
// "BrightCoat Ops — Dashboard, Métricas, KPIs y Gráficas Recomendadas" (PDF
// de David). Todo lo de acá es agregación pura en memoria sobre lo que ya
// traen fetchCharges/fetchExpenses/fetchPayrollEntries/fetchSchedules — sin
// vistas nuevas en Supabase.
//
// Notas de modelado importantes (para no malinterpretar los números):
// - `charges` no tiene fecha de vencimiento (due date), solo `generatedDate`
//   (la fecha en que se generó el cobro). "Outstanding Aging" y "cobros
//   vencidos" usan generatedDate como aproximación de antigüedad.
// - `expenses` es a nivel de negocio, no tiene propertyId. Por eso el
//   margen "por propiedad" (usado en la alerta de margen bajo) es
//   Revenue − Labor Cost por propiedad, sin restar gastos generales — no
//   son atribuibles a una propiedad específica en el modelo actual.
// - `charges` no tiene employeeId, así que "revenue por empleado" no es
//   calculable. Employee Productivity usa trabajos completados (schedules
//   con status "delivered"), que sí están atribuidos a un empleado.
// ---------------------------------------------------------------------------

export type DashboardDateRangeKey = 'fifteen_days' | 'this_month' | 'last_6_months' | 'last_12_months'

export const DASHBOARD_DATE_RANGE_OPTIONS: { value: DashboardDateRangeKey; label: string }[] = [
  { value: 'fifteen_days', label: 'Últimos 15 días' },
  { value: 'this_month', label: 'Mes actual' },
  { value: 'last_6_months', label: 'Últimos 6 meses' },
  { value: 'last_12_months', label: 'Últimos 12 meses' },
]

export type DateRange = { start: string; end: string } // ISO 'YYYY-MM-DD', ambos inclusive

const startOfMonth = (year: number, month: number) => new Date(year, month, 1)
const endOfMonth = (year: number, month: number) => new Date(year, month + 1, 0)

// "Mes actual" es el mes calendario (1 al último día); "15 días" y "6
// meses" son ventanas móviles terminando hoy — mismo criterio que el
// filtro de rango ya usado en Finanzas/Reportes (ver dateRange.ts).
export const computeDateRange = (key: DashboardDateRangeKey): DateRange => {
  const now = new Date()

  switch (key) {
    case 'fifteen_days': {
      const start = new Date(now)
      start.setDate(start.getDate() - 14) // incluye hoy → 15 días en total
      return { start: toISODate(start), end: toISODate(now) }
    }
    case 'this_month':
      return { start: toISODate(startOfMonth(now.getFullYear(), now.getMonth())), end: toISODate(endOfMonth(now.getFullYear(), now.getMonth())) }
    case 'last_6_months': {
      const start = new Date(now)
      start.setDate(start.getDate() - 179) // 180 días, mismo criterio que "six_months" en dateRange.ts
      return { start: toISODate(start), end: toISODate(now) }
    }
    case 'last_12_months': {
      const start = new Date(now)
      start.setDate(start.getDate() - 364) // 365 días, misma ventana móvil que "6 meses" pero al doble
      return { start: toISODate(start), end: toISODate(now) }
    }
  }
}

// Período inmediatamente anterior, de la misma duración — para comparar
// "vs. período anterior" (Revenue vs Previous Period, spike de Expenses).
export const previousPeriod = (range: DateRange): DateRange => {
  const start = new Date(range.start)
  const end = new Date(range.end)
  const days = Math.round((end.getTime() - start.getTime()) / 86_400_000) + 1
  const prevEnd = new Date(start.getTime() - 86_400_000)
  const prevStart = new Date(prevEnd.getTime() - (days - 1) * 86_400_000)
  return { start: toISODate(prevStart), end: toISODate(prevEnd) }
}

const inRange = (date: string | undefined | null, range: DateRange) => !!date && date >= range.start && date <= range.end

export const filterChargesByRange = (charges: Charge[], range: DateRange) => charges.filter((c) => inRange(c.generatedDate, range))
export const filterExpensesByRange = (expenses: Expense[], range: DateRange) => expenses.filter((e) => inRange(e.date, range))
export const filterPayrollByRange = (entries: PayrollEntry[], range: DateRange) => entries.filter((p) => inRange(p.date, range))
export const filterSchedulesByRange = (schedules: Schedule[], range: DateRange) => schedules.filter((s) => inRange(s.scheduledDate, range))

// --- 7 KPIs principales ------------------------------------------------

export type DashboardKpis = {
  revenue: number
  revenuePrevious: number
  collected: number
  outstanding: number
  laborCost: number
  expenses: number
  estimatedProfit: number
  profitMargin: number | null // null cuando revenue del período es 0 (razón indefinida)
  completedJobs: number
}

export const computeKpis = (
  charges: Charge[],
  payrollEntries: PayrollEntry[],
  expenses: Expense[],
  schedules: Schedule[],
  range: DateRange,
): DashboardKpis => {
  const periodCharges = filterChargesByRange(charges, range)
  const revenue = periodCharges.reduce((sum, c) => sum + c.amount, 0)
  const collected = periodCharges.filter((c) => c.status === 'paid').reduce((sum, c) => sum + c.amount, 0)
  const outstanding = periodCharges.filter((c) => c.status === 'pending').reduce((sum, c) => sum + c.amount, 0)
  const laborCost = filterPayrollByRange(payrollEntries, range).reduce((sum, p) => sum + (p.amount ?? 0), 0)
  const periodExpenses = filterExpensesByRange(expenses, range).reduce((sum, e) => sum + e.amount, 0)
  // Fórmula validada por el negocio (ver PDF): Estimated Profit = Revenue − Labor Cost − Expenses.
  const estimatedProfit = revenue - laborCost - periodExpenses
  const profitMargin = revenue > 0 ? (estimatedProfit / revenue) * 100 : null
  const completedJobs = filterSchedulesByRange(schedules, range).filter((s) => s.status === 'delivered').length
  const revenuePrevious = filterChargesByRange(charges, previousPeriod(range)).reduce((sum, c) => sum + c.amount, 0)

  return { revenue, revenuePrevious, collected, outstanding, laborCost, expenses: periodExpenses, estimatedProfit, profitMargin, completedJobs }
}

// --- Revenue Trend + Revenue vs Expenses vs Labor (últimos N meses) ----
// Independiente del Date Range global — el PDF pide explícitamente "los
// últimos 6–12 meses" para estas dos gráficas de tendencia, no el período
// que esté seleccionado en el filtro (que puede ser un solo mes).

export type MonthlyFinancials = { key: string; month: string; revenue: number; expenses: number; labor: number }

const MONTH_LABELS = ['Ene', 'Feb', 'Mar', 'Abr', 'May', 'Jun', 'Jul', 'Ago', 'Sep', 'Oct', 'Nov', 'Dic']
const monthKey = (dateStr: string) => dateStr.slice(0, 7) // 'YYYY-MM'

export const computeMonthlyFinancials = (
  charges: Charge[],
  expenses: Expense[],
  payrollEntries: PayrollEntry[],
  monthsBack = 12,
): MonthlyFinancials[] => {
  const now = new Date()
  const buckets: { key: string; month: string }[] = []
  for (let i = monthsBack - 1; i >= 0; i -= 1) {
    const d = new Date(now.getFullYear(), now.getMonth() - i, 1)
    buckets.push({ key: `${d.getFullYear()}-${String(d.getMonth() + 1).padStart(2, '0')}`, month: MONTH_LABELS[d.getMonth()] })
  }

  return buckets.map(({ key, month }) => ({
    key,
    month,
    revenue: charges.filter((c) => c.generatedDate && monthKey(c.generatedDate) === key).reduce((sum, c) => sum + c.amount, 0),
    expenses: expenses.filter((e) => monthKey(e.date) === key).reduce((sum, e) => sum + e.amount, 0),
    labor: payrollEntries.filter((p) => monthKey(p.date) === key).reduce((sum, p) => sum + (p.amount ?? 0), 0),
  }))
}

// --- Revenue/Expenses by Period (granularidad elegible) -------------------
// A diferencia de computeMonthlyFinancials (fijo a 12 meses, independiente
// del filtro de fecha de la pantalla), esto agrupa por día, semana, mes,
// trimestre o año el rango de fecha SELECCIONADO — para "Ingresos por
// período" (Reportes › Financiero) y "Gastos por período" (Reportes ›
// Gastos). Mismo bucketing para ambos (bucketByPeriod), solo cambia la
// fuente de datos.

export type RevenuePeriodGranularity = 'day' | 'week' | 'month' | 'quarter' | 'year'

export const REVENUE_PERIOD_GRANULARITY_OPTIONS: { value: RevenuePeriodGranularity; label: string }[] = [
  { value: 'day', label: 'Día' },
  { value: 'week', label: 'Semana' },
  { value: 'month', label: 'Mes' },
  { value: 'quarter', label: 'Trimestre' },
  { value: 'year', label: 'Año' },
]

export type RevenueByPeriod = { key: string; label: string; revenue: number }
export type ExpensesByPeriod = { key: string; label: string; total: number }

// Lunes de la semana que contiene `d` — mismo criterio "semana lunes a
// domingo" que scheduleDates.ts usa para Horarios.
const startOfWeek = (d: Date): Date => {
  const day = (d.getDay() + 6) % 7 // lunes=0 ... domingo=6
  return addDays(d, -day)
}

const bucketByPeriod = (
  items: { date: string; amount: number }[],
  granularity: RevenuePeriodGranularity,
): { key: string; label: string; total: number }[] => {
  const totals = new Map<string, { label: string; total: number }>()

  for (const item of items) {
    const d = parseISODate(item.date)
    let key: string
    let label: string

    if (granularity === 'day') {
      key = item.date
      label = item.date
    } else if (granularity === 'week') {
      key = toISODate(startOfWeek(d))
      label = `Sem. ${key}`
    } else if (granularity === 'month') {
      key = monthKey(item.date)
      label = `${MONTH_LABELS[d.getMonth()]} ${d.getFullYear()}`
    } else if (granularity === 'quarter') {
      const q = Math.floor(d.getMonth() / 3) + 1
      key = `${d.getFullYear()}-Q${q}`
      label = `T${q} ${d.getFullYear()}`
    } else {
      key = String(d.getFullYear())
      label = key
    }

    const existing = totals.get(key)
    totals.set(key, { label, total: (existing?.total ?? 0) + item.amount })
  }

  return Array.from(totals.entries())
    .map(([key, v]) => ({ key, label: v.label, total: v.total }))
    .sort((a, b) => a.key.localeCompare(b.key))
}

export const computeRevenueByPeriod = (
  charges: Charge[],
  range: DateRange,
  granularity: RevenuePeriodGranularity,
): RevenueByPeriod[] => {
  const items = filterChargesByRange(charges, range)
    .filter((c) => c.generatedDate)
    .map((c) => ({ date: c.generatedDate as string, amount: c.amount }))
  return bucketByPeriod(items, granularity).map((b) => ({ key: b.key, label: b.label, revenue: b.total }))
}

export const computeExpensesByPeriod = (
  expenses: Expense[],
  range: DateRange,
  granularity: RevenuePeriodGranularity,
): ExpensesByPeriod[] => {
  const items = filterExpensesByRange(expenses, range).map((e) => ({ date: e.date, amount: e.amount }))
  return bucketByPeriod(items, granularity)
}

// --- Revenue by Service --------------------------------------------------

export type ServiceRevenue = { serviceTypeId: string | null; label: string; revenue: number }

export const computeRevenueByService = (charges: Charge[], serviceTypes: ServiceType[], range: DateRange): ServiceRevenue[] => {
  const period = filterChargesByRange(charges, range)
  const totals = new Map<string, number>()
  for (const c of period) {
    const key = c.serviceTypeId ?? '__none__'
    totals.set(key, (totals.get(key) ?? 0) + c.amount)
  }
  return Array.from(totals.entries())
    .map(([id, revenue]) => {
      const serviceType = id === '__none__' ? null : (serviceTypes.find((s) => s.id === id) ?? null)
      return { serviceTypeId: serviceType?.id ?? null, label: serviceType?.name ?? 'Sin servicio', revenue }
    })
    .sort((a, b) => b.revenue - a.revenue)
}

// --- Revenue by Property (top N) -----------------------------------------

export type PropertyRevenue = { propertyId: string; name: string; revenue: number }

export const computeRevenueByProperty = (
  charges: Charge[],
  properties: Property[],
  range: DateRange,
  limit = 8,
): PropertyRevenue[] => {
  const period = filterChargesByRange(charges, range)
  const totals = new Map<string, number>()
  for (const c of period) totals.set(c.propertyId, (totals.get(c.propertyId) ?? 0) + c.amount)
  return Array.from(totals.entries())
    .map(([propertyId, revenue]) => ({ propertyId, name: properties.find((p) => p.id === propertyId)?.name ?? '—', revenue }))
    .sort((a, b) => b.revenue - a.revenue)
    .slice(0, limit)
}

// --- Employee Productivity (top N por trabajos completados) --------------

export type EmployeeProductivity = { employeeId: string; name: string; completedJobs: number }

export const computeEmployeeProductivity = (
  schedules: Schedule[],
  employees: Employee[],
  range: DateRange,
  limit = 8,
): EmployeeProductivity[] => {
  const period = filterSchedulesByRange(schedules, range).filter((s) => s.status === 'delivered')
  const totals = new Map<string, number>()
  for (const s of period) totals.set(s.employeeId, (totals.get(s.employeeId) ?? 0) + 1)
  return Array.from(totals.entries())
    .map(([employeeId, completedJobs]) => ({ employeeId, name: employees.find((e) => e.id === employeeId)?.name ?? '—', completedJobs }))
    .sort((a, b) => b.completedJobs - a.completedJobs)
    .slice(0, limit)
}

// --- Bloque operativo: Today's Schedule / Overdue Jobs / Outstanding Aging

export const computeTodaySchedules = (schedules: Schedule[]): Schedule[] => {
  const today = toISODate(new Date())
  return schedules.filter((s) => s.scheduledDate === today)
}

// "Overdue" no es un status propio de Schedule — es cualquier trabajo cuya
// fecha ya pasó y que no llegó a delivered/cancelled (ver PDF: "trabajos
// cuya fecha esperada ya pasó").
export const computeOverdueSchedules = (schedules: Schedule[]): Schedule[] => {
  const today = toISODate(new Date())
  return schedules
    .filter((s) => s.scheduledDate < today && (s.status === 'pending' || s.status === 'in_progress'))
    .sort((a, b) => a.scheduledDate.localeCompare(b.scheduledDate))
}

export type AgingBucket = { label: string; amount: number; count: number }

const AGING_BUCKET_LABELS = ['0–30 días', '31–60 días', '61–90 días', '+90 días'] as const

const agingBucketLabel = (days: number): string =>
  days <= 30
    ? AGING_BUCKET_LABELS[0]
    : days <= 60
      ? AGING_BUCKET_LABELS[1]
      : days <= 90
        ? AGING_BUCKET_LABELS[2]
        : AGING_BUCKET_LABELS[3]

export type AgingDetailRow = {
  chargeId: string
  propertyId: string
  propertyName: string
  unitLabel?: string
  invoiceNumber?: string
  generatedDate?: string
  days: number
  bucket: string
  amount: number
}

// Detalle por cobro pendiente — para "Reportes › Cobros › Antigüedad", el
// drill-down que el Dashboard no tiene (ahí solo se ven los 4 totales por
// bucket). Antigüedad de cobros pendientes por días desde generatedDate (no
// hay due date en el modelo — ver nota de modelado arriba).
export const computeAgingDetail = (charges: Charge[], properties: Property[] = []): AgingDetailRow[] => {
  const today = new Date()
  const propertyName = (id: string) => properties.find((p) => p.id === id)?.name ?? '—'

  return charges
    .filter((c) => c.status === 'pending')
    .map((c) => {
      const days = c.generatedDate
        ? Math.floor((today.getTime() - new Date(c.generatedDate).getTime()) / 86_400_000)
        : 0
      return {
        chargeId: c.id,
        propertyId: c.propertyId,
        propertyName: propertyName(c.propertyId),
        unitLabel: c.unitLabel,
        invoiceNumber: c.invoiceNumber,
        generatedDate: c.generatedDate,
        days,
        bucket: agingBucketLabel(days),
        amount: c.amount,
      }
    })
    .sort((a, b) => b.days - a.days)
}

export const computeOutstandingAging = (charges: Charge[]): AgingBucket[] => {
  const buckets: AgingBucket[] = AGING_BUCKET_LABELS.map((label) => ({ label, amount: 0, count: 0 }))
  for (const row of computeAgingDetail(charges)) {
    const bucket = buckets.find((b) => b.label === row.bucket)
    if (!bucket) continue
    bucket.amount += row.amount
    bucket.count += 1
  }
  return buckets
}

// --- Planilla agrupada (por propiedad / por empleado) ---------------------
// Para "Planilla por propiedad y por empleado" (Reportes › Planilla) — el
// mismo total de planillas pagadas, agrupado por cada dimensión. Las
// planillas sin monto definido (amount == null, ver PayrollEntry en
// types.ts) cuentan como pendientes, no se suman a totalPaid.

export type PayrollGroupSummary = {
  id: string
  name: string
  totalPaid: number
  paidCount: number
  pendingCount: number
}

const summarizePayrollBy = (
  entries: PayrollEntry[],
  keyOf: (e: PayrollEntry) => string,
  nameOf: (id: string) => string,
): PayrollGroupSummary[] => {
  const groups = new Map<string, PayrollGroupSummary>()
  for (const e of entries) {
    const id = keyOf(e)
    const existing = groups.get(id) ?? { id, name: nameOf(id), totalPaid: 0, paidCount: 0, pendingCount: 0 }
    if (e.amount == null) {
      existing.pendingCount += 1
    } else {
      existing.totalPaid += e.amount
      existing.paidCount += 1
    }
    groups.set(id, existing)
  }
  return Array.from(groups.values()).sort((a, b) => b.totalPaid - a.totalPaid)
}

export const computePayrollByProperty = (
  payrollEntries: PayrollEntry[],
  properties: Property[],
  range: DateRange,
): PayrollGroupSummary[] =>
  summarizePayrollBy(
    filterPayrollByRange(payrollEntries, range),
    (e) => e.propertyId,
    (id) => properties.find((p) => p.id === id)?.name ?? '—',
  )

export const computePayrollByEmployee = (
  payrollEntries: PayrollEntry[],
  employees: Employee[],
  range: DateRange,
): PayrollGroupSummary[] =>
  summarizePayrollBy(
    filterPayrollByRange(payrollEntries, range),
    (e) => e.employeeId,
    (id) => employees.find((emp) => emp.id === id)?.name ?? '—',
  )

export type PendingPayrollRow = {
  id: string
  propertyId: string
  propertyName: string
  unitLabel: string
  employeeId: string
  employeeName: string
  serviceName: string
  date: string
  sales: number
}

// Trabajo ya hecho (tiene fecha, propiedad, empleado y servicio) cuyo pago
// todavía no se definió — ver PayrollEntry.amount en types.ts. Igual que
// Antigüedad de cartera (Reportes › Cobros), es sobre toda la planilla
// pendiente ahora mismo, no solo el período seleccionado en pantalla.
export const computePendingPayroll = (
  payrollEntries: PayrollEntry[],
  properties: Property[],
  employees: Employee[],
): PendingPayrollRow[] =>
  payrollEntries
    .filter((e) => e.amount == null)
    .map((e) => ({
      id: e.id,
      propertyId: e.propertyId,
      propertyName: properties.find((p) => p.id === e.propertyId)?.name ?? '—',
      unitLabel: e.unitLabel,
      employeeId: e.employeeId,
      employeeName: employees.find((emp) => emp.id === e.employeeId)?.name ?? '—',
      serviceName: e.serviceName,
      date: e.date,
      sales: e.items.reduce((sum, item) => sum + item.amount, 0),
    }))
    .sort((a, b) => b.date.localeCompare(a.date))

// --- Alertas ---------------------------------------------------------------

export type DashboardAlert = {
  key: string
  title: string
  detail: string
}

const OVERDUE_CHARGE_DAYS = 30
const LOW_MARGIN_THRESHOLD_PCT = 15
const HIGH_EXPENSE_INCREASE_PCT = 25

// --- Property Profitability (todas las propiedades) ----------------------
// Base de "Ganancia estimada por propiedad" (Reportes › Financiero) y de
// la alerta de margen bajo de abajo (computeLowMarginProperties es ahora
// un filtro sobre esta misma función, en vez de duplicar la agregación).

export type PropertyProfitability = {
  propertyId: string
  name: string
  revenue: number
  laborCost: number
  estimatedProfit: number
  margin: number | null // null cuando la propiedad no generó revenue en el período
}

export const computePropertyProfitability = (
  charges: Charge[],
  payrollEntries: PayrollEntry[],
  properties: Property[],
  range: DateRange,
): PropertyProfitability[] => {
  const periodCharges = filterChargesByRange(charges, range)
  const periodPayroll = filterPayrollByRange(payrollEntries, range)

  const revenueByProperty = new Map<string, number>()
  for (const c of periodCharges) revenueByProperty.set(c.propertyId, (revenueByProperty.get(c.propertyId) ?? 0) + c.amount)

  const laborByProperty = new Map<string, number>()
  for (const p of periodPayroll) laborByProperty.set(p.propertyId, (laborByProperty.get(p.propertyId) ?? 0) + (p.amount ?? 0))

  const propertyIds = new Set([...revenueByProperty.keys(), ...laborByProperty.keys()])
  const result: PropertyProfitability[] = []
  for (const propertyId of propertyIds) {
    const revenue = revenueByProperty.get(propertyId) ?? 0
    const laborCost = laborByProperty.get(propertyId) ?? 0
    const estimatedProfit = revenue - laborCost
    const margin = revenue > 0 ? (estimatedProfit / revenue) * 100 : null
    result.push({
      propertyId,
      name: properties.find((p) => p.id === propertyId)?.name ?? '—',
      revenue,
      laborCost,
      estimatedProfit,
      margin,
    })
  }
  return result.sort((a, b) => b.estimatedProfit - a.estimatedProfit)
}

// Margen por propiedad = (Revenue − Labor Cost) / Revenue del período —
// sin restar gastos generales, que no están atribuidos a una propiedad
// (ver nota de modelado arriba). Solo propiedades con revenue > 0 en el
// período aplican (si no generaron nada, "margen bajo" no dice mucho).
export const computeLowMarginProperties = (
  charges: Charge[],
  payrollEntries: PayrollEntry[],
  properties: Property[],
  range: DateRange,
  thresholdPct = LOW_MARGIN_THRESHOLD_PCT,
): { propertyId: string; name: string; margin: number }[] => {
  return computePropertyProfitability(charges, payrollEntries, properties, range)
    .filter((p) => p.margin != null && p.margin < thresholdPct)
    .map((p) => ({ propertyId: p.propertyId, name: p.name, margin: p.margin as number }))
    .sort((a, b) => a.margin - b.margin)
}

export const computeAlerts = (
  charges: Charge[],
  payrollEntries: PayrollEntry[],
  expenses: Expense[],
  properties: Property[],
  range: DateRange,
  currency: (value: number) => string,
): DashboardAlert[] => {
  const alerts: DashboardAlert[] = []
  const today = new Date()

  const overdueCharges = charges.filter((c) => {
    if (c.status !== 'pending' || !c.generatedDate) return false
    const days = Math.floor((today.getTime() - new Date(c.generatedDate).getTime()) / 86_400_000)
    return days > OVERDUE_CHARGE_DAYS
  })
  if (overdueCharges.length > 0) {
    const total = overdueCharges.reduce((sum, c) => sum + c.amount, 0)
    alerts.push({
      key: 'overdue_charges',
      title: 'Cobros vencidos',
      detail: `${overdueCharges.length} cobro(s) pendientes hace más de ${OVERDUE_CHARGE_DAYS} días — ${currency(total)} en total.`,
    })
  }

  const pendingPayroll = payrollEntries.filter((p) => p.amount == null)
  if (pendingPayroll.length > 0) {
    alerts.push({
      key: 'payroll_pending',
      title: 'Planillas sin monto definido',
      detail: `${pendingPayroll.length} entrada(s) de planilla todavía sin el pago decidido.`,
    })
  }

  const lowMarginProperties = computeLowMarginProperties(charges, payrollEntries, properties, range)
  if (lowMarginProperties.length > 0) {
    const names = lowMarginProperties.slice(0, 3).map((p) => p.name).join(', ')
    const extra = lowMarginProperties.length > 3 ? ` y ${lowMarginProperties.length - 3} más` : ''
    alerts.push({
      key: 'low_margin_properties',
      title: 'Propiedades con margen bajo',
      detail: `Por debajo de ${LOW_MARGIN_THRESHOLD_PCT}% este período: ${names}${extra}.`,
    })
  }

  const currentExpenses = filterExpensesByRange(expenses, range).reduce((sum, e) => sum + e.amount, 0)
  const previousExpenses = filterExpensesByRange(expenses, previousPeriod(range)).reduce((sum, e) => sum + e.amount, 0)
  if (previousExpenses > 0) {
    const increasePct = ((currentExpenses - previousExpenses) / previousExpenses) * 100
    if (increasePct > HIGH_EXPENSE_INCREASE_PCT) {
      alerts.push({
        key: 'high_expenses',
        title: 'Gastos más altos de lo normal',
        detail: `${currency(currentExpenses)} este período, ${Math.round(increasePct)}% más que el período anterior (${currency(previousExpenses)}).`,
      })
    }
  }

  return alerts
}

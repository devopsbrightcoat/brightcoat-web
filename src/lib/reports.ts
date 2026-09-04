import type { Expense, Service } from '../types'

export type MonthlyFinancial = { month: string; income: number; expenses: number }

const MONTH_LABELS = ['Ene', 'Feb', 'Mar', 'Abr', 'May', 'Jun', 'Jul', 'Ago', 'Sep', 'Oct', 'Nov', 'Dic']

const monthKey = (dateStr: string) => dateStr.slice(0, 7) // 'YYYY-MM'

// Agrupa services (ingresos, por scheduledDate) y expenses (por date) en los
// últimos `monthsBack` meses, para el gráfico de Dashboard/Reportes. Antes
// esto venía precalculado en los datos mock (monthlyFinancials).
export const computeMonthlyFinancials = (
  services: Service[],
  expenses: Expense[],
  monthsBack = 6,
): MonthlyFinancial[] => {
  const now = new Date()
  const buckets: { key: string; month: string }[] = []

  for (let i = monthsBack - 1; i >= 0; i -= 1) {
    const d = new Date(now.getFullYear(), now.getMonth() - i, 1)
    buckets.push({
      key: `${d.getFullYear()}-${String(d.getMonth() + 1).padStart(2, '0')}`,
      month: MONTH_LABELS[d.getMonth()],
    })
  }

  return buckets.map(({ key, month }) => ({
    month,
    income: services
      .filter((s) => s.scheduledDate && monthKey(s.scheduledDate) === key)
      .reduce((sum, s) => sum + s.cost, 0),
    expenses: expenses.filter((e) => monthKey(e.date) === key).reduce((sum, e) => sum + e.amount, 0),
  }))
}

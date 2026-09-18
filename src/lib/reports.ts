import type { Expense } from '../types'

export type MonthlyExpenses = { month: string; expenses: number }

const MONTH_LABELS = ['Ene', 'Feb', 'Mar', 'Abr', 'May', 'Jun', 'Jul', 'Ago', 'Sep', 'Oct', 'Nov', 'Dic']

const monthKey = (dateStr: string) => dateStr.slice(0, 7)

export const computeMonthlyExpenses = (expenses: Expense[], monthsBack = 6): MonthlyExpenses[] => {
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
    expenses: expenses.filter((e) => monthKey(e.date) === key).reduce((sum, e) => sum + e.amount, 0),
  }))
}

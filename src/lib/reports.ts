import type { Expense } from '../types'

export type MonthlyExpenses = { month: string; expenses: number }

const MONTH_LABELS = ['Ene', 'Feb', 'Mar', 'Abr', 'May', 'Jun', 'Jul', 'Ago', 'Sep', 'Oct', 'Nov', 'Dic']

const monthKey = (dateStr: string) => dateStr.slice(0, 7) // 'YYYY-MM'

// Agrupa expenses (por date) en los últimos `monthsBack` meses, para el
// gráfico de gastos de Dashboard/Reportes. El ingreso ya no se calcula acá
// desde `services` — el módulo de Trabajos se eliminó; el tracking de
// cobros (de Excel y de Horarios, unificados) vive ahora en Cobros
// (tabla `charges`, ver 20260912000000_unify_charges.sql), que todavía no
// tiene una vista de reportería propia.
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

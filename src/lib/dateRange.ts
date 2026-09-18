
export type DateRangeKey = 'week' | 'fifteen_days' | 'month' | 'three_months' | 'six_months' | 'all'

export const DATE_RANGE_OPTIONS: { value: DateRangeKey; label: string }[] = [
  { value: 'week', label: 'Última semana' },
  { value: 'fifteen_days', label: 'Últimos 15 días' },
  { value: 'month', label: 'Último mes' },
  { value: 'three_months', label: 'Últimos 3 meses' },
  { value: 'six_months', label: 'Últimos 6 meses' },
  { value: 'all', label: 'Todo' },
]

const DAYS_BY_RANGE: Record<Exclude<DateRangeKey, 'all'>, number> = {
  week: 7,
  fifteen_days: 15,
  month: 30,
  three_months: 90,
  six_months: 180,
}

export const getDateRangeCutoff = (range: DateRangeKey): string | null => {
  if (range === 'all') return null
  const cutoff = new Date()
  cutoff.setDate(cutoff.getDate() - DAYS_BY_RANGE[range])
  return cutoff.toISOString().slice(0, 10)
}

export const isWithinDateRange = (date: string | undefined | null, range: DateRangeKey): boolean => {
  if (range === 'all') return true
  if (!date) return false
  const cutoff = getDateRangeCutoff(range)
  if (!cutoff) return true
  return date >= cutoff
}

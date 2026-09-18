
import { MONTH_NAMES, toISODate } from './scheduleDates'
import type { DateRange } from './dashboardMetrics'

export type QuincenaHalf = 1 | 2
export type QuincenaKey = { year: number; month: number; half: QuincenaHalf }

export const getQuincenaRange = ({ year, month, half }: QuincenaKey): DateRange => {
  if (half === 1) {
    const start = new Date(year, month - 1, 0)
    const end = new Date(year, month - 1, 14)
    return { start: toISODate(start), end: toISODate(end) }
  }
  const start = new Date(year, month - 1, 15)
  const lastDayOfMonth = new Date(year, month, 0).getDate()
  const end = new Date(year, month - 1, Math.min(30, lastDayOfMonth))
  return { start: toISODate(start), end: toISODate(end) }
}

export const getQuincenaForDate = (date: Date = new Date()): QuincenaKey => {
  const day = date.getDate()
  if (day === 31) {
    const next = new Date(date.getFullYear(), date.getMonth() + 1, 1)
    return { year: next.getFullYear(), month: next.getMonth() + 1, half: 1 }
  }
  if (day <= 14) {
    return { year: date.getFullYear(), month: date.getMonth() + 1, half: 1 }
  }
  return { year: date.getFullYear(), month: date.getMonth() + 1, half: 2 }
}

const ordinal = (half: QuincenaHalf) => (half === 1 ? '1ra' : '2da')

export const formatQuincenaShortLabel = ({ year, month, half }: QuincenaKey): string => {
  const name = MONTH_NAMES[month - 1]
  return `${ordinal(half)} quincena de ${name} ${year}`
}

export const formatQuincenaRangeLabel = (key: QuincenaKey): string => {
  const { start, end } = getQuincenaRange(key)
  const startDate = new Date(`${start}T00:00:00`)
  const endDate = new Date(`${end}T00:00:00`)
  const shortMonth = (m: number) => MONTH_NAMES[m].slice(0, 3)
  const startLabel = `${startDate.getDate()} ${shortMonth(startDate.getMonth())}`
  const endLabel = `${endDate.getDate()} ${shortMonth(endDate.getMonth())}`
  return `${startLabel} – ${endLabel}`
}

export const listRecentMonths = (monthsBack = 24): { year: number; month: number }[] => {
  const now = new Date()
  const list: { year: number; month: number }[] = []
  for (let i = 0; i < monthsBack; i++) {
    const d = new Date(now.getFullYear(), now.getMonth() - i, 1)
    list.push({ year: d.getFullYear(), month: d.getMonth() + 1 })
  }
  return list
}

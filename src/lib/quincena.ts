// ---------------------------------------------------------------------------
// Quincenas al estilo de David — no son las quincenas "de calendario" que
// se usan más comúnmente (1-15 / 16-fin de mes), sino un corte propio que
// pidió explícitamente: "entre el 31 y el 14 de un mes es una 15na y desde
// el 15 a 30 del mes es otra quincena". O sea:
//   - 1ra quincena de un mes: del último día del mes ANTERIOR (el 31,
//     cuando ese mes lo tiene) al día 14 del mes.
//   - 2da quincena de un mes: del día 15 al día 30 del mes — el día 31
//     (cuando el mes lo tiene) NUNCA es parte de la 2da quincena, siempre
//     cae en la 1ra quincena del mes SIGUIENTE.
// `month`/`year` en QuincenaKey identifican la quincena tal como la
// nombraría David ("1ra quincena de septiembre" incluye el 31 de agosto) —
// no necesariamente el mes calendario de la fecha de inicio del rango.
// ---------------------------------------------------------------------------

import { MONTH_NAMES, toISODate } from './scheduleDates'
import type { DateRange } from './dashboardMetrics'

export type QuincenaHalf = 1 | 2
export type QuincenaKey = { year: number; month: number; half: QuincenaHalf } // month: 1-12

export const getQuincenaRange = ({ year, month, half }: QuincenaKey): DateRange => {
  if (half === 1) {
    const start = new Date(year, month - 1, 0) // día 0 = último día del mes anterior
    const end = new Date(year, month - 1, 14)
    return { start: toISODate(start), end: toISODate(end) }
  }
  const start = new Date(year, month - 1, 15)
  const lastDayOfMonth = new Date(year, month, 0).getDate()
  const end = new Date(year, month - 1, Math.min(30, lastDayOfMonth))
  return { start: toISODate(start), end: toISODate(end) }
}

// Quincena a la que pertenece `date` (hoy, si no se pasa nada) — mismo
// criterio: el día 31 siempre pertenece a la 1ra quincena del mes SIGUIENTE.
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

// "1ra quincena de septiembre 2026" — nombre corto para selects/labels.
export const formatQuincenaShortLabel = ({ year, month, half }: QuincenaKey): string => {
  const name = MONTH_NAMES[month - 1]
  return `${ordinal(half)} quincena de ${name} ${year}`
}

// "31 ago – 14 sep" — solo el rango de fechas, para mostrar como
// confirmación bajo el selector de mes + 1ra/2da.
export const formatQuincenaRangeLabel = (key: QuincenaKey): string => {
  const { start, end } = getQuincenaRange(key)
  const startDate = new Date(`${start}T00:00:00`)
  const endDate = new Date(`${end}T00:00:00`)
  const shortMonth = (m: number) => MONTH_NAMES[m].slice(0, 3)
  const startLabel = `${startDate.getDate()} ${shortMonth(startDate.getMonth())}`
  const endLabel = `${endDate.getDate()} ${shortMonth(endDate.getMonth())}`
  return `${startLabel} – ${endLabel}`
}

// Últimos `monthsBack` meses (incluyendo el actual), más reciente primero —
// para poblar el selector de mes del picker de quincena.
export const listRecentMonths = (monthsBack = 24): { year: number; month: number }[] => {
  const now = new Date()
  const list: { year: number; month: number }[] = []
  for (let i = 0; i < monthsBack; i++) {
    const d = new Date(now.getFullYear(), now.getMonth() - i, 1)
    list.push({ year: d.getFullYear(), month: d.getMonth() + 1 })
  }
  return list
}

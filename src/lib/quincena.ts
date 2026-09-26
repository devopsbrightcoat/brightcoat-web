
import { addDays, MONTH_NAMES, parseISODate, toISODate } from './scheduleDates'
import type { DateRange } from './dashboardMetrics'

// La plataforma se empezó a usar el 31 de agosto de 2026 (lunes) — ese día
// arrancó la primera quincena. Desde ahí cada quincena son exactamente 14
// días (2 semanas completas de lunes a domingo), una detrás de otra para
// siempre: el conteo NO se reinicia cada mes. Como los meses no son
// múltiplos de 14 días, con el tiempo una quincena termina cayendo a
// caballo entre dos meses calendario — por eso ya no se eligen por
// "mes + 1ra/2da quincena": se navegan por número (ver QuincenaPicker),
// mostrando siempre el rango real de fechas.
const QUINCENA_ANCHOR = '2026-08-31'

export type QuincenaKey = { index: number }

// Días de calendario entre dos fechas, usando UTC solo para el cálculo (no
// para las fechas en sí) para que no se corra un día por el cambio de
// horario de verano.
const daysBetween = (from: Date, to: Date): number => {
  const utcFrom = Date.UTC(from.getFullYear(), from.getMonth(), from.getDate())
  const utcTo = Date.UTC(to.getFullYear(), to.getMonth(), to.getDate())
  return Math.round((utcTo - utcFrom) / 86400000)
}

export const getQuincenaRange = ({ index }: QuincenaKey): DateRange => {
  const anchor = parseISODate(QUINCENA_ANCHOR)
  const start = addDays(anchor, index * 14)
  const end = addDays(anchor, index * 14 + 13)
  return { start: toISODate(start), end: toISODate(end) }
}

export const getQuincenaForDate = (date: Date = new Date()): QuincenaKey => {
  const anchor = parseISODate(QUINCENA_ANCHOR)
  const diffDays = daysBetween(anchor, date)
  return { index: Math.floor(diffDays / 14) }
}

export const formatQuincenaShortLabel = ({ index }: QuincenaKey): string => `Quincena ${index + 1}`

export const formatQuincenaRangeLabel = (key: QuincenaKey): string => {
  const { label, year } = formatQuincenaRangeParts(key)
  return `${label} ${year}`
}

// Separa el rango de fechas del año final para poder resaltar el año con su
// propio color (dorado) en el picker, sin tocar el resto del texto.
export const formatQuincenaRangeParts = (key: QuincenaKey): { label: string; year: string } => {
  const { start, end } = getQuincenaRange(key)
  const startDate = new Date(`${start}T00:00:00`)
  const endDate = new Date(`${end}T00:00:00`)
  const shortMonth = (m: number) => MONTH_NAMES[m].slice(0, 3)
  const startLabel = `${startDate.getDate()} ${shortMonth(startDate.getMonth())}`
  const endLabel = `${endDate.getDate()} ${shortMonth(endDate.getMonth())}`
  const year = String(endDate.getFullYear()).slice(-2)
  return { label: `${startLabel} - ${endLabel}`, year }
}

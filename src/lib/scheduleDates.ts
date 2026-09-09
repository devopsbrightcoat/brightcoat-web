// ---------------------------------------------------------------------------
// Helpers de fechas para el scheduler de Horarios: semanas lunes-domingo,
// navegación por mes, formato en español. Sin librería externa — la app no
// trae date-fns/dayjs y esto se resuelve simple con Date nativo.
// ---------------------------------------------------------------------------

export const MONTH_NAMES = [
  'enero',
  'febrero',
  'marzo',
  'abril',
  'mayo',
  'junio',
  'julio',
  'agosto',
  'septiembre',
  'octubre',
  'noviembre',
  'diciembre',
]

export const DAY_LABELS = ['Lun', 'Mar', 'Mié', 'Jue', 'Vie', 'Sáb', 'Dom']

// Date.getDay(): 0=domingo..6=sábado.
const DAY_NAMES_LONG = ['domingo', 'lunes', 'martes', 'miércoles', 'jueves', 'viernes', 'sábado']

export const toISODate = (d: Date): string => {
  const y = d.getFullYear()
  const m = String(d.getMonth() + 1).padStart(2, '0')
  const day = String(d.getDate()).padStart(2, '0')
  return `${y}-${m}-${day}`
}

export const parseISODate = (s: string): Date => {
  const [y, m, d] = s.split('-').map(Number)
  return new Date(y, m - 1, d)
}

export const addDays = (d: Date, n: number): Date => {
  const copy = new Date(d)
  copy.setDate(copy.getDate() + n)
  return copy
}

// Lunes de la semana que contiene `d` (Date.getDay(): 0=domingo..6=sábado).
export const startOfWeekMonday = (d: Date): Date => {
  const day = d.getDay()
  const diff = day === 0 ? -6 : 1 - day
  return addDays(d, diff)
}

export type WeekRange = { start: Date; end: Date }

// Todas las semanas lunes-domingo que tocan el mes dado (month 0-indexed).
export const getWeeksInMonth = (year: number, month: number): WeekRange[] => {
  const firstDay = new Date(year, month, 1)
  const lastDay = new Date(year, month + 1, 0)
  const weeks: WeekRange[] = []
  let cursor = startOfWeekMonday(firstDay)
  while (cursor <= lastDay) {
    weeks.push({ start: cursor, end: addDays(cursor, 6) })
    cursor = addDays(cursor, 7)
  }
  return weeks
}

// La semana que contiene `target`, o la primera de la lista si no está.
export const pickWeekContaining = (weeks: WeekRange[], target: Date): WeekRange => {
  const targetIso = toISODate(target)
  const match = weeks.find((w) => targetIso >= toISODate(w.start) && targetIso <= toISODate(w.end))
  return match ?? weeks[0]
}

// `target` si cae dentro de la semana, si no el lunes de esa semana.
export const pickDateWithinWeek = (week: WeekRange, target: Date): Date => {
  const targetIso = toISODate(target)
  if (targetIso >= toISODate(week.start) && targetIso <= toISODate(week.end)) return target
  return week.start
}

export const formatWeekLabel = (week: WeekRange): string => {
  const sameMonth = week.start.getMonth() === week.end.getMonth()
  if (sameMonth) {
    return `${week.start.getDate()} - ${week.end.getDate()} de ${MONTH_NAMES[week.start.getMonth()]}`
  }
  return `${week.start.getDate()} de ${MONTH_NAMES[week.start.getMonth()]} - ${week.end.getDate()} de ${MONTH_NAMES[week.end.getMonth()]}`
}

export const formatMonthLabel = (year: number, month: number): string => {
  const name = MONTH_NAMES[month]
  return `${name[0].toUpperCase()}${name.slice(1)} ${year}`
}

// Formatea "YYYY-MM-DD" a "Lunes, 15 de agosto de 2026" (usado en
// Planillas, donde se necesita el día de la semana completo). Parsea la
// fecha como local (vía parseISODate) para evitar el corrimiento de un día
// que da `new Date(iso)` en zonas horarias negativas (ej. Honduras/Texas).
export const formatFullDate = (iso: string): string => {
  const date = parseISODate(iso)
  const dayName = DAY_NAMES_LONG[date.getDay()]
  const capitalizedDay = `${dayName[0].toUpperCase()}${dayName.slice(1)}`
  return `${capitalizedDay}, ${date.getDate()} de ${MONTH_NAMES[date.getMonth()]} de ${date.getFullYear()}`
}

// Formatea "HH:MM:SS" (lo que devuelve Postgres para `time`) a "9:00 AM".
export const formatTime = (time: string): string => {
  const [hStr, mStr] = time.split(':')
  const h = Number(hStr)
  const m = Number(mStr)
  const period = h >= 12 ? 'PM' : 'AM'
  const h12 = h % 12 === 0 ? 12 : h % 12
  return `${h12}:${String(m).padStart(2, '0')} ${period}`
}

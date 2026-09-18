import { useState } from 'react'
import { getQuincenaForDate, getQuincenaRange, type QuincenaKey } from '../../lib/quincena'
import { QuincenaPicker } from './QuincenaPicker'

const inputClass =
  'w-full rounded-lg border border-white/10 bg-surface px-3 py-2.5 text-sm text-white outline-none focus:border-gold-500'
const labelClass = 'mb-1.5 block text-sm font-medium text-ink-200'

const modeButtonClass = (active: boolean) =>
  `px-3 py-2 text-xs font-medium transition ${
    active ? 'bg-gold-500 text-brand-900' : 'bg-surface text-ink-300 hover:bg-white/5'
  }`

// Filtro de fecha "Rango manual / Por quincena" para los paneles de
// filtros de Finanzas (Cobros, Gastos, Planillas) — mismo modo quincena
// que ReportDateRangeBar en Reportes y DashboardDateRangeSelect en el
// Dashboard (quincenas al estilo de David, ver lib/quincena.ts), pero sin
// botón "Generar": acá los filtros aplican de inmediato (mismo criterio
// que ya tenían dateFrom/dateTo en estos paneles), así que elegir una
// quincena solo precarga Fecha desde/hasta y el filtro ya queda aplicado.
type QuincenaDateFilterProps = {
  dateFrom: string
  dateTo: string
  onDateFromChange: (value: string) => void
  onDateToChange: (value: string) => void
  fromId: string
  toId: string
}

export const QuincenaDateFilter = ({ dateFrom, dateTo, onDateFromChange, onDateToChange, fromId, toId }: QuincenaDateFilterProps) => {
  const [mode, setMode] = useState<'manual' | 'quincena'>('manual')
  const [quincena, setQuincena] = useState<QuincenaKey>(() => getQuincenaForDate())

  const applyQuincena = (key: QuincenaKey) => {
    setQuincena(key)
    const range = getQuincenaRange(key)
    onDateFromChange(range.start)
    onDateToChange(range.end)
  }

  return (
    <div className="space-y-3">
      <div className="flex w-fit overflow-hidden rounded-lg border border-white/10">
        <button type="button" onClick={() => setMode('manual')} className={modeButtonClass(mode === 'manual')}>
          Rango manual
        </button>
        <button
          type="button"
          onClick={() => {
            setMode('quincena')
            applyQuincena(quincena)
          }}
          className={modeButtonClass(mode === 'quincena')}
        >
          Por quincena
        </button>
      </div>

      {mode === 'manual' ? (
        <div className="grid grid-cols-2 gap-3">
          <div>
            <label htmlFor={fromId} className={labelClass}>
              Fecha desde
            </label>
            <input id={fromId} type="date" value={dateFrom} onChange={(e) => onDateFromChange(e.target.value)} className={inputClass} />
          </div>
          <div>
            <label htmlFor={toId} className={labelClass}>
              Fecha hasta
            </label>
            <input id={toId} type="date" value={dateTo} onChange={(e) => onDateToChange(e.target.value)} className={inputClass} />
          </div>
        </div>
      ) : (
        <QuincenaPicker value={quincena} onChange={applyQuincena} />
      )}
    </div>
  )
}

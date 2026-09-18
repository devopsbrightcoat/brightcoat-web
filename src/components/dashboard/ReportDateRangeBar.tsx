import { useState } from 'react'
import { Search } from 'lucide-react'
import type { DateRange } from '../../lib/dashboardMetrics'
import { getQuincenaForDate, getQuincenaRange, type QuincenaKey } from '../../lib/quincena'
import { QuincenaPicker } from './QuincenaPicker'

const inputClass =
  'rounded-lg border border-white/10 bg-surface px-3 py-2 text-sm text-white outline-none focus:border-gold-500'
const labelClass = 'mb-1 block text-xs font-medium text-ink-500'

const modeButtonClass = (active: boolean) =>
  `px-3 py-2 text-sm font-medium transition ${
    active ? 'bg-gold-500 text-brand-900' : 'bg-surface text-ink-300 hover:bg-white/5'
  }`

// Barra "Desde / Hasta + Generar reporte" que usan todas las páginas de
// Reportes — a pedido de Javier, el reporte ya no se calcula solo con un
// rango preseleccionado al entrar a la página (como sigue haciendo
// DashboardDateRangeSelect en el Dashboard, que no cambia): acá primero se
// pide el rango, "Generar reporte" se habilita recién cuando Desde y
// Hasta están completos y Desde no es posterior a Hasta, y el reporte no
// se recalcula solo con cambiar las fechas — hay que volver a darle
// Generar reporte.
//
// Modo "Por quincena" (a pedido de David — quincenas propias, no las de
// calendario, ver lib/quincena.ts): en vez de escribir Desde/Hasta a mano,
// se elige mes + 1ra/2da quincena y eso precarga Desde/Hasta — el resto
// del flujo (Generar reporte, validación, hint) sigue exactamente igual.
// Cambiar de modo no borra lo ya elegido: pasar a "Rango manual" deja los
// campos con lo que haya quedado de la quincena, por si quieren ajustar un
// día puntual.
type ReportDateRangeBarProps = {
  onGenerate: (range: DateRange) => void
  generated: boolean
}

export const ReportDateRangeBar = ({ onGenerate, generated }: ReportDateRangeBarProps) => {
  const [mode, setMode] = useState<'manual' | 'quincena'>('manual')
  const [from, setFrom] = useState('')
  const [to, setTo] = useState('')
  const [quincena, setQuincena] = useState<QuincenaKey>(() => getQuincenaForDate())

  const invalidOrder = !!from && !!to && from > to
  const canGenerate = !!from && !!to && !invalidOrder

  const handleModeChange = (next: 'manual' | 'quincena') => {
    setMode(next)
    if (next === 'quincena') {
      const range = getQuincenaRange(quincena)
      setFrom(range.start)
      setTo(range.end)
    }
  }

  const handleQuincenaChange = (key: QuincenaKey) => {
    setQuincena(key)
    const range = getQuincenaRange(key)
    setFrom(range.start)
    setTo(range.end)
  }

  return (
    <div className="mx-8 mt-6 flex flex-col gap-3 rounded-xl border border-white/10 bg-surface-alt p-4">
      <div className="flex w-fit overflow-hidden rounded-lg border border-white/10">
        <button type="button" onClick={() => handleModeChange('manual')} className={modeButtonClass(mode === 'manual')}>
          Rango manual
        </button>
        <button type="button" onClick={() => handleModeChange('quincena')} className={modeButtonClass(mode === 'quincena')}>
          Por quincena
        </button>
      </div>

      <div className="flex flex-wrap items-end gap-3">
        {mode === 'manual' ? (
          <>
            <div>
              <label htmlFor="report-range-from" className={labelClass}>
                Desde
              </label>
              <input
                id="report-range-from"
                type="date"
                value={from}
                onChange={(e) => setFrom(e.target.value)}
                className={inputClass}
              />
            </div>
            <div>
              <label htmlFor="report-range-to" className={labelClass}>
                Hasta
              </label>
              <input
                id="report-range-to"
                type="date"
                value={to}
                onChange={(e) => setTo(e.target.value)}
                className={inputClass}
              />
            </div>
          </>
        ) : (
          <QuincenaPicker value={quincena} onChange={handleQuincenaChange} />
        )}

        <button
          type="button"
          disabled={!canGenerate}
          onClick={() => onGenerate({ start: from, end: to })}
          className="flex items-center gap-2 rounded-lg bg-gold-500 px-4 py-2.5 text-sm font-semibold text-brand-900 transition hover:bg-gold-400 disabled:cursor-not-allowed disabled:opacity-40"
        >
          <Search className="h-4 w-4" />
          Generar reporte
        </button>
      </div>

      {invalidOrder ? (
        <p className="text-xs text-red-400">"Desde" no puede ser posterior a "Hasta".</p>
      ) : generated ? (
        <p className="text-xs text-ink-500">Si cambias el rango, vuelve a darle "Generar reporte" para actualizar.</p>
      ) : (
        <p className="text-xs text-ink-500">Elige un rango de fechas para generar el reporte.</p>
      )}
    </div>
  )
}

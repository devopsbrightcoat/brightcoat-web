import { ChevronLeft, ChevronRight } from 'lucide-react'
import { formatQuincenaRangeParts, getQuincenaForDate, type QuincenaKey } from '../../lib/quincena'

type QuincenaPickerProps = {
  value: QuincenaKey
  onChange: (key: QuincenaKey) => void
}

export const QuincenaPicker = ({ value, onChange }: QuincenaPickerProps) => {
  const isCurrent = value.index === getQuincenaForDate().index
  const { label, year } = formatQuincenaRangeParts(value)

  return (
    <div className="flex flex-wrap items-center gap-3">
      <div className="flex items-center overflow-hidden rounded-lg border border-white/10">
        <button
          type="button"
          onClick={() => onChange({ index: value.index - 1 })}
          disabled={value.index <= 0}
          aria-label="Quincena anterior"
          className="p-2 text-ink-300 transition hover:bg-white/5 disabled:cursor-not-allowed disabled:opacity-30"
        >
          <ChevronLeft className="h-4 w-4" />
        </button>
        <span className="whitespace-nowrap px-3 py-2 text-center text-sm font-medium text-white">
          Quincena {label} <span className="text-gold-400">{year}</span>
        </span>
        <button
          type="button"
          onClick={() => onChange({ index: value.index + 1 })}
          aria-label="Quincena siguiente"
          className="p-2 text-ink-300 transition hover:bg-white/5"
        >
          <ChevronRight className="h-4 w-4" />
        </button>
      </div>

      {!isCurrent && (
        <button
          type="button"
          onClick={() => onChange(getQuincenaForDate())}
          className="text-xs font-medium text-gold-400 hover:underline"
        >
          Ir a la quincena actual
        </button>
      )}
    </div>
  )
}

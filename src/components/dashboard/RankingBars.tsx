type RankingBarsItem = {
  id: string
  label: string
  value: number
}

type RankingBarsProps = {
  items: RankingBarsItem[]
  formatValue: (value: number) => string
  color: string
  emptyText: string
  onItemPress?: (item: RankingBarsItem) => void
}

export const RankingBars = ({ items, formatValue, color, emptyText, onItemPress }: RankingBarsProps) => {
  if (items.length === 0) {
    return <p className="py-6 text-center text-sm text-ink-500">{emptyText}</p>
  }

  const max = Math.max(...items.map((i) => i.value), 1)

  return (
    <div className="space-y-3">
      {items.map((item) => {
        const bar = (
          <>
            <div className="mb-1 flex items-center justify-between gap-3 text-xs">
              <span className="truncate text-ink-300">{item.label}</span>
              <span className="shrink-0 font-semibold tabular-nums text-white">{formatValue(item.value)}</span>
            </div>
            <div className="h-2 overflow-hidden rounded-full bg-white/5">
              <div
                className="h-full rounded-full"
                style={{ width: `${Math.max((item.value / max) * 100, 2)}%`, backgroundColor: color }}
              />
            </div>
          </>
        )
        return onItemPress ? (
          <button
            key={item.id}
            type="button"
            onClick={() => onItemPress(item)}
            className="block w-full rounded-lg text-left transition-opacity hover:opacity-80"
          >
            {bar}
          </button>
        ) : (
          <div key={item.id}>{bar}</div>
        )
      })}
    </div>
  )
}

import type { LucideIcon } from 'lucide-react'

type StatCardProps = {
  label: string
  value: string
  icon: LucideIcon
  tone?: 'default' | 'good' | 'warn'
  hint?: string
}

const toneClasses: Record<NonNullable<StatCardProps['tone']>, string> = {
  default: 'bg-white/5 text-ink-300',
  good: 'bg-emerald-500/10 text-emerald-400',
  warn: 'bg-amber-500/10 text-amber-400',
}

export const StatCard = ({ label, value, icon: Icon, tone = 'default', hint }: StatCardProps) => {
  return (
    <div className="rounded-xl border border-white/10 bg-surface-alt p-5">
      <div className="flex items-center justify-between">
        <p className="text-xs font-medium uppercase tracking-wide text-ink-500">{label}</p>
        <span className={`flex h-8 w-8 items-center justify-center rounded-lg ${toneClasses[tone]}`}>
          <Icon className="h-4 w-4" />
        </span>
      </div>
      <p className="mt-3 text-2xl font-bold tabular-nums text-white">{value}</p>
      {hint && <p className="mt-1 text-xs text-ink-500">{hint}</p>}
    </div>
  )
}

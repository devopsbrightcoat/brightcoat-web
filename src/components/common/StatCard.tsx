import type { LucideIcon } from 'lucide-react'

type StatCardProps = {
  label: string
  value: string
  icon: LucideIcon
  tone?: 'default' | 'good' | 'warn'
  hint?: string
  hintTone?: 'default' | 'warn'
  size?: 'default' | 'compact'
}

const toneClasses: Record<NonNullable<StatCardProps['tone']>, string> = {
  default: 'bg-white/5 text-ink-300',
  good: 'bg-emerald-500/10 text-emerald-400',
  warn: 'bg-amber-500/10 text-amber-400',
}

const hintToneClasses: Record<NonNullable<StatCardProps['hintTone']>, string> = {
  default: 'text-ink-500',
  warn: 'font-semibold text-amber-400',
}

export const StatCard = ({ label, value, icon: Icon, tone = 'default', hint, hintTone = 'default', size = 'default' }: StatCardProps) => {
  const compact = size === 'compact'
  return (
    <div className={`rounded-xl border border-white/10 bg-surface-alt ${compact ? 'p-3' : 'p-5'}`}>
      <div className="flex items-center justify-between">
        <p className="text-xs font-medium uppercase tracking-wide text-ink-500">{label}</p>
        <span
          className={`flex items-center justify-center rounded-lg ${compact ? 'h-6 w-6' : 'h-8 w-8'} ${toneClasses[tone]}`}
        >
          <Icon className={compact ? 'h-3.5 w-3.5' : 'h-4 w-4'} />
        </span>
      </div>
      <p className={`font-bold tabular-nums text-white ${compact ? 'mt-1.5 text-lg' : 'mt-3 text-2xl'}`}>{value}</p>
      {hint && <p className={`mt-1 text-xs ${hintToneClasses[hintTone]}`}>{hint}</p>}
    </div>
  )
}

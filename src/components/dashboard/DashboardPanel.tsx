import type { ReactNode } from 'react'

type DashboardPanelProps = {
  title: string
  subtitle?: string
  action?: ReactNode
  children: ReactNode
  className?: string
}

export const DashboardPanel = ({ title, subtitle, action, children, className = '' }: DashboardPanelProps) => {
  return (
    <div className={`rounded-xl border border-white/10 bg-surface-alt p-5 ${className}`}>
      <div className="flex items-start justify-between gap-3">
        <div>
          <p className="text-sm font-semibold text-white">{title}</p>
          {subtitle && <p className="text-xs text-ink-500">{subtitle}</p>}
        </div>
        {action}
      </div>
      <div className="mt-4">{children}</div>
    </div>
  )
}

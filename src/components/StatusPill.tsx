type StatusPillProps = {
  status: string
}

const statusStyles: Record<string, string> = {
  pending: 'bg-amber-500/10 text-amber-400 ring-amber-500/20',
  in_progress: 'bg-sky-500/10 text-sky-400 ring-sky-500/20',
  completed: 'bg-emerald-500/10 text-emerald-400 ring-emerald-500/20',
  paid: 'bg-emerald-500/10 text-emerald-400 ring-emerald-500/20',
  active: 'bg-emerald-500/10 text-emerald-400 ring-emerald-500/20',
  inactive: 'bg-white/5 text-ink-400 ring-white/10',
}

const statusLabels: Record<string, string> = {
  pending: 'Pendiente',
  in_progress: 'En proceso',
  completed: 'Completado',
  paid: 'Pagado',
  active: 'Activo',
  inactive: 'Inactivo',
}

export const StatusPill = ({ status }: StatusPillProps) => {
  return (
    <span
      className={`inline-flex items-center rounded-full px-2.5 py-1 text-xs font-medium ring-1 ring-inset ${
        statusStyles[status] ?? 'bg-white/5 text-ink-400 ring-white/10'
      }`}
    >
      {statusLabels[status] ?? status}
    </span>
  )
}

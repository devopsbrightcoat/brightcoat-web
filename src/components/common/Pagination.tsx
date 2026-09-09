import { ChevronLeft, ChevronRight } from 'lucide-react'

type PaginationProps = {
  page: number
  totalPages: number
  onChange: (page: number) => void
}

export const Pagination = ({ page, totalPages, onChange }: PaginationProps) => {
  if (totalPages <= 1) return null

  return (
    <div className="flex items-center justify-between border-t border-white/5 px-5 py-3 text-sm text-ink-400">
      <button
        type="button"
        disabled={page <= 1}
        onClick={() => onChange(page - 1)}
        className="flex items-center gap-1 rounded-lg border border-white/10 px-3 py-1.5 transition hover:bg-white/5 disabled:cursor-not-allowed disabled:opacity-40"
      >
        <ChevronLeft className="h-3.5 w-3.5" />
        Anterior
      </button>
      <span>
        Página {page} de {totalPages}
      </span>
      <button
        type="button"
        disabled={page >= totalPages}
        onClick={() => onChange(page + 1)}
        className="flex items-center gap-1 rounded-lg border border-white/10 px-3 py-1.5 transition hover:bg-white/5 disabled:cursor-not-allowed disabled:opacity-40"
      >
        Siguiente
        <ChevronRight className="h-3.5 w-3.5" />
      </button>
    </div>
  )
}

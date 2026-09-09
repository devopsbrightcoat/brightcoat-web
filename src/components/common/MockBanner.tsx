import { FlaskConical } from 'lucide-react'

export const MockBanner = () => {
  return (
    <div className="mx-8 mt-6 flex items-center gap-2 rounded-lg border border-gold-500/30 bg-gold-500/10 px-4 py-2.5 text-sm text-gold-300">
      <FlaskConical className="h-4 w-4 shrink-0" />
      Vista con datos de ejemplo — todavía no conectada a Supabase.
    </div>
  )
}

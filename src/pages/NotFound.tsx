import { AlertTriangle } from 'lucide-react'
import { Link } from 'react-router-dom'
import { useAuth } from '../auth/AuthProvider'

export const NotFound = () => {
  const { session } = useAuth()

  const title = session ? 'Página no encontrada' : 'No autorizado'
  const message = session
    ? 'Esa dirección no existe dentro de BrightCoat Ops.'
    : 'Necesitas iniciar sesión para ver esta página.'
  const to = session ? '/' : '/login'
  const cta = session ? 'Volver al Dashboard' : 'Volver al login'

  return (
    <div className="flex min-h-screen flex-col items-center justify-center gap-4 bg-surface px-4 text-center">
      <div className="flex h-14 w-14 items-center justify-center rounded-full bg-gold-500/10">
        <AlertTriangle className="h-7 w-7 text-gold-400" />
      </div>
      <div>
        <p className="text-lg font-semibold text-white">{title}</p>
        <p className="mt-1 text-sm text-ink-400">{message}</p>
      </div>
      <Link
        to={to}
        className="mt-2 rounded-lg bg-gold-500 px-4 py-2.5 text-sm font-semibold text-brand-900 transition hover:bg-gold-400"
      >
        {cta}
      </Link>
    </div>
  )
}

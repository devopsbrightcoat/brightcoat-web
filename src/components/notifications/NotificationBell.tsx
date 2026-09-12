import { useEffect, useRef, useState } from 'react'
import { Bell } from 'lucide-react'
import { fetchNotifications, markAllNotificationsRead, markNotificationRead } from '../../lib/api'
import type { AppNotification } from '../../types'

// Sin websockets/realtime en esta app (ver src/lib/useSupabaseQuery.ts —
// fetch simple, sin cache ni revalidación) — la campanita se mantiene al
// día con un poll simple en vez de una suscripción a Supabase Realtime.
const POLL_MS = 30000

const timeAgo = (iso: string): string => {
  const minutes = Math.floor((Date.now() - new Date(iso).getTime()) / 60000)
  if (minutes < 1) return 'ahora'
  if (minutes < 60) return `hace ${minutes} min`
  const hours = Math.floor(minutes / 60)
  if (hours < 24) return `hace ${hours} h`
  return `hace ${Math.floor(hours / 24)} d`
}

export const NotificationBell = () => {
  const [notifications, setNotifications] = useState<AppNotification[]>([])
  const [open, setOpen] = useState(false)
  const containerRef = useRef<HTMLDivElement>(null)

  const load = () => {
    fetchNotifications()
      .then(setNotifications)
      .catch(() => {
        // La campanita no es crítica para el flujo de trabajo — si falla el
        // fetch simplemente se reintenta en el próximo poll, sin mostrar error.
      })
  }

  useEffect(() => {
    load()
    const interval = setInterval(load, POLL_MS)
    return () => clearInterval(interval)
  }, [])

  useEffect(() => {
    if (!open) return
    const handleClickOutside = (e: MouseEvent) => {
      if (containerRef.current && !containerRef.current.contains(e.target as Node)) setOpen(false)
    }
    document.addEventListener('mousedown', handleClickOutside)
    return () => document.removeEventListener('mousedown', handleClickOutside)
  }, [open])

  // Todas las alertas mostradas acá están, por definición, sin leer — leer
  // una la borra (ver api.ts), así que nunca se acumulan.
  const unreadCount = notifications.length

  const handleItemClick = (n: AppNotification) => {
    setNotifications((prev) => prev.filter((x) => x.id !== n.id))
    markNotificationRead(n.id).catch(load)
  }

  const handleMarkAll = () => {
    if (notifications.length === 0) return
    setNotifications([])
    markAllNotificationsRead().catch(load)
  }

  return (
    <div ref={containerRef} className="relative shrink-0">
      <button
        type="button"
        onClick={() => setOpen((v) => !v)}
        title="Alertas"
        className="relative rounded-md p-1.5 text-brand-200 transition hover:bg-white/10 hover:text-white"
      >
        <Bell className="h-4 w-4" />
        {unreadCount > 0 && (
          <span className="absolute -right-0.5 -top-0.5 flex h-4 min-w-[16px] items-center justify-center rounded-full bg-gold-500 px-1 text-[10px] font-bold leading-none text-brand-900">
            {unreadCount > 9 ? '9+' : unreadCount}
          </span>
        )}
      </button>

      {open && (
        <div className="absolute left-0 top-full z-20 mt-2 w-80 rounded-xl border border-white/10 bg-brand-900 shadow-xl">
          <div className="flex items-center justify-between border-b border-white/10 px-4 py-3">
            <p className="text-sm font-semibold text-white">Alertas</p>
            {unreadCount > 0 && (
              <button
                type="button"
                onClick={handleMarkAll}
                className="text-xs font-medium text-gold-400 transition hover:text-gold-300"
              >
                Borrar todas
              </button>
            )}
          </div>
          <div className="max-h-96 overflow-y-auto">
            {notifications.length === 0 ? (
              <p className="px-4 py-6 text-center text-sm text-brand-300">No tienes alertas.</p>
            ) : (
              notifications.map((n) => (
                <button
                  key={n.id}
                  type="button"
                  onClick={() => handleItemClick(n)}
                  className={[
                    'block w-full border-b border-white/5 px-4 py-3 text-left text-sm transition last:border-b-0 hover:bg-white/5',
                    n.readAt ? 'text-brand-300' : 'text-white',
                  ].join(' ')}
                >
                  <div className="flex items-start gap-2">
                    {!n.readAt && <span className="mt-1.5 h-1.5 w-1.5 shrink-0 rounded-full bg-gold-500" />}
                    <div className={n.readAt ? 'pl-3.5' : ''}>
                      <p>{n.message}</p>
                      <p className="mt-0.5 text-xs text-brand-400">{timeAgo(n.createdAt)}</p>
                    </div>
                  </div>
                </button>
              ))
            )}
          </div>
        </div>
      )}
    </div>
  )
}

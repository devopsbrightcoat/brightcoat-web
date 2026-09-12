import { useState } from 'react'
import { useAuth } from '../auth/AuthProvider'
import type { ProfileRole } from '../auth/AuthProvider'
import { updateNotificationsEnabled, updateNotifyRoles } from '../lib/api'
import { getErrorMessage } from '../lib/errors'

const sectionClass = 'mx-8 mt-6 max-w-2xl rounded-xl border border-white/10 bg-surface-alt p-6'
const sectionTitleClass = 'mb-4 text-sm font-semibold text-white'

const roleLabel: Record<ProfileRole, string> = {
  owner: 'Dueño',
  admin: 'Administrador',
  staff: 'Staff',
  finance: 'Finanzas',
}

const ALL_ROLES: ProfileRole[] = ['owner', 'admin', 'staff', 'finance']

// Alertas de actividad entre roles — separado de Configuración General a
// propósito (ver 20260926000000_add_notify_roles.sql). No existe para el
// rol staff: no se agrega su entrada de menú en AppLayout.tsx y esta
// pantalla también se protege por si alguien entra directo por URL.
export const ConfiguracionAlertas = () => {
  const { profile, refreshProfile } = useAuth()
  const [savingToggle, setSavingToggle] = useState(false)
  const [savingRole, setSavingRole] = useState<ProfileRole | null>(null)
  const [error, setError] = useState<string | null>(null)

  if (profile && profile.role === 'staff') {
    return (
      <div className="pb-10">
        <div className="border-b border-white/10 bg-surface-alt px-8 py-6">
          <h1 className="text-xl font-bold text-white">Alertas</h1>
        </div>
        <p className="mx-8 mt-6 text-sm text-ink-400">Esta sección no está disponible para tu rol.</p>
      </div>
    )
  }

  const handleToggleEnabled = async () => {
    if (!profile) return
    setSavingToggle(true)
    setError(null)
    try {
      await updateNotificationsEnabled(profile.id, !profile.notificationsEnabled)
      await refreshProfile()
    } catch (err) {
      setError(getErrorMessage(err, 'No se pudo actualizar la preferencia de alertas.'))
    } finally {
      setSavingToggle(false)
    }
  }

  const handleToggleRole = async (role: ProfileRole) => {
    if (!profile) return
    const current = profile.notifyRoles
    const next = current.includes(role) ? current.filter((r) => r !== role) : [...current, role]
    setSavingRole(role)
    setError(null)
    try {
      await updateNotifyRoles(profile.id, next)
      await refreshProfile()
    } catch (err) {
      setError(getErrorMessage(err, 'No se pudo actualizar la preferencia de alertas.'))
    } finally {
      setSavingRole(null)
    }
  }

  return (
    <div className="pb-10">
      <div className="border-b border-white/10 bg-surface-alt px-8 py-6">
        <h1 className="text-xl font-bold text-white">Alertas</h1>
        <p className="mt-1 text-sm text-ink-400">Avisos cuando otros roles agregan o modifican información</p>
      </div>

      <div className={sectionClass}>
        <div className="flex items-center justify-between">
          <div>
            <p className={sectionTitleClass}>Activar alertas</p>
            <p className="text-xs text-ink-400">Interruptor general — si está apagado, no recibes ninguna alerta.</p>
          </div>
          <button
            type="button"
            role="switch"
            aria-checked={profile?.notificationsEnabled ?? true}
            disabled={savingToggle || !profile}
            onClick={handleToggleEnabled}
            className={[
              'relative h-6 w-11 shrink-0 rounded-full transition disabled:opacity-60',
              profile?.notificationsEnabled ?? true ? 'bg-gold-500' : 'bg-white/10',
            ].join(' ')}
          >
            <span
              className={[
                'absolute top-0.5 h-5 w-5 rounded-full bg-white transition',
                profile?.notificationsEnabled ?? true ? 'left-5' : 'left-0.5',
              ].join(' ')}
            />
          </button>
        </div>
      </div>

      <div className={sectionClass}>
        <p className={sectionTitleClass}>Recibir alertas de estos roles</p>
        <p className="mb-4 text-xs text-ink-400">
          Elige de qué roles quieres enterarte cuando agreguen o modifiquen información.
        </p>
        <div className="space-y-3">
          {ALL_ROLES.map((role) => {
            const checked = profile?.notifyRoles.includes(role) ?? false
            return (
              <label
                key={role}
                className="flex cursor-pointer items-center justify-between rounded-lg border border-white/10 bg-surface px-4 py-3"
              >
                <span className="text-sm text-white">{roleLabel[role]}</span>
                <input
                  type="checkbox"
                  checked={checked}
                  disabled={savingRole === role || !profile}
                  onChange={() => handleToggleRole(role)}
                  className="h-4 w-4 rounded border-white/20 bg-surface-alt accent-gold-500"
                />
              </label>
            )
          })}
        </div>

        {error && <p className="mt-4 rounded-lg bg-red-500/10 px-3 py-2 text-sm text-red-400">{error}</p>}
      </div>
    </div>
  )
}

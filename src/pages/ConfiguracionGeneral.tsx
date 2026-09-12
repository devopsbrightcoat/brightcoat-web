import { useEffect, useState } from 'react'
import { useAuth } from '../auth/AuthProvider'
import { fetchCompanySettings, updateCompanySettings, updateOwnPassword, updateOwnProfile } from '../lib/api'
import { getErrorMessage } from '../lib/errors'
import { useSupabaseQuery } from '../lib/useSupabaseQuery'

const inputClass =
  'w-full rounded-lg border border-white/10 bg-surface-alt px-3 py-2.5 text-sm text-white outline-none focus:border-gold-500'
const labelClass = 'mb-1.5 block text-sm font-medium text-ink-200'
const sectionClass = 'mx-8 mt-6 max-w-2xl rounded-xl border border-white/10 bg-surface-alt p-6'
const sectionTitleClass = 'mb-4 text-sm font-semibold text-white'
const buttonClass =
  'rounded-lg bg-gold-500 px-4 py-2 text-sm font-semibold text-brand-900 transition hover:bg-gold-400 disabled:opacity-60'

const roleLabel: Record<string, string> = {
  owner: 'Dueño',
  admin: 'Administrador',
  staff: 'Staff',
  finance: 'Finanzas',
}

// Datos de la empresa (company_settings, tabla singleton — ver
// 20260920000000_add_company_settings.sql) + Mi perfil (nombre/correo
// propios y cambio de contraseña). La gestión de cuentas de acceso
// (crear/editar otros usuarios) queda fuera a propósito: requiere el API
// admin de Supabase, no es seguro exponerlo desde la app cliente — se
// sigue haciendo a mano (dashboard/SQL) como hasta ahora.
export const ConfiguracionGeneral = () => {
  const { profile, refreshProfile } = useAuth()
  // Datos de la empresa: solo el owner puede editarlos — el resto de roles
  // los ve, pero de solo lectura (sin inputs ni botón de guardar).
  const isOwner = profile?.role === 'owner'

  // --- Datos de la empresa -----------------------------------------------
  const { data: companySettings, loading: loadingCompany } = useSupabaseQuery(fetchCompanySettings, [])
  const [companyLoaded, setCompanyLoaded] = useState(false)
  const [address, setAddress] = useState('')
  const [phone, setPhone] = useState('')
  const [email, setEmail] = useState('')
  const [defaultHourlyRate, setDefaultHourlyRate] = useState('')
  const [savingCompany, setSavingCompany] = useState(false)
  const [companyError, setCompanyError] = useState<string | null>(null)

  useEffect(() => {
    if (!companySettings || companyLoaded) return
    setAddress(companySettings.address ?? '')
    setPhone(companySettings.phone ?? '')
    setEmail(companySettings.email ?? '')
    setDefaultHourlyRate(companySettings.defaultHourlyRate != null ? String(companySettings.defaultHourlyRate) : '')
    setCompanyLoaded(true)
  }, [companySettings, companyLoaded])

  const handleSaveCompany = async () => {
    if (!companySettings) return
    let rateValue: number | null = null
    if (defaultHourlyRate.trim()) {
      const parsed = Number(defaultHourlyRate)
      if (Number.isNaN(parsed) || parsed < 0) {
        setCompanyError('La tarifa por hora no es un número válido.')
        return
      }
      rateValue = parsed
    }
    setSavingCompany(true)
    setCompanyError(null)
    try {
      await updateCompanySettings(companySettings.id, {
        companyName: companySettings.companyName,
        address,
        phone,
        email,
        defaultHourlyRate: rateValue,
      })
    } catch (err) {
      setCompanyError(getErrorMessage(err, 'No se pudieron guardar los datos de la empresa.'))
    } finally {
      setSavingCompany(false)
    }
  }

  // --- Mi perfil -----------------------------------------------------------
  const [profileLoaded, setProfileLoaded] = useState(false)
  const [fullName, setFullName] = useState('')
  const [contactEmail, setContactEmail] = useState('')
  const [savingProfile, setSavingProfile] = useState(false)
  const [profileError, setProfileError] = useState<string | null>(null)

  useEffect(() => {
    if (!profile || profileLoaded) return
    setFullName(profile.fullName ?? '')
    setContactEmail(profile.email ?? '')
    setProfileLoaded(true)
  }, [profile, profileLoaded])

  const handleSaveProfile = async () => {
    if (!profile) return
    setSavingProfile(true)
    setProfileError(null)
    try {
      await updateOwnProfile(profile.id, { fullName: fullName.trim(), email: contactEmail.trim() })
      await refreshProfile()
    } catch (err) {
      setProfileError(getErrorMessage(err, 'No se pudo guardar el perfil.'))
    } finally {
      setSavingProfile(false)
    }
  }

  // --- Cambiar contraseña ---------------------------------------------------
  const [newPassword, setNewPassword] = useState('')
  const [confirmPassword, setConfirmPassword] = useState('')
  const [savingPassword, setSavingPassword] = useState(false)
  const [passwordError, setPasswordError] = useState<string | null>(null)
  const [passwordSuccess, setPasswordSuccess] = useState(false)

  const handleChangePassword = async () => {
    if (newPassword.length < 8) {
      setPasswordError('La contraseña debe tener al menos 8 caracteres.')
      setPasswordSuccess(false)
      return
    }
    if (newPassword !== confirmPassword) {
      setPasswordError('Las contraseñas no coinciden.')
      setPasswordSuccess(false)
      return
    }
    setSavingPassword(true)
    setPasswordError(null)
    try {
      await updateOwnPassword(newPassword)
      setNewPassword('')
      setConfirmPassword('')
      setPasswordSuccess(true)
    } catch (err) {
      setPasswordError(getErrorMessage(err, 'No se pudo cambiar la contraseña.'))
      setPasswordSuccess(false)
    } finally {
      setSavingPassword(false)
    }
  }

  return (
    <div className="pb-10">
      <div className="border-b border-white/10 bg-surface-alt px-8 py-6">
        <h1 className="text-xl font-bold text-white">General</h1>
        <p className="mt-1 text-sm text-ink-400">Configuración general de BrightCoat Ops</p>
      </div>

      <div className={sectionClass}>
        <p className={sectionTitleClass}>Datos de la empresa</p>
        {loadingCompany && !companyLoaded ? (
          <p className="text-sm text-ink-500">Cargando…</p>
        ) : (
          <div className="space-y-4">
            <div>
              <p className={labelClass}>Nombre de la empresa</p>
              <p className="rounded-lg border border-white/10 bg-surface px-3 py-2.5 text-sm text-ink-400">
                {companySettings?.companyName ?? '—'}
              </p>
            </div>
            {isOwner ? (
              <>
                <div>
                  <label htmlFor="cfg-address" className={labelClass}>
                    Dirección
                  </label>
                  <input
                    id="cfg-address"
                    type="text"
                    value={address}
                    onChange={(e) => setAddress(e.target.value)}
                    className={inputClass}
                  />
                </div>
                <div className="grid grid-cols-2 gap-3">
                  <div>
                    <label htmlFor="cfg-phone" className={labelClass}>
                      Teléfono
                    </label>
                    <input
                      id="cfg-phone"
                      type="text"
                      value={phone}
                      onChange={(e) => setPhone(e.target.value)}
                      className={inputClass}
                    />
                  </div>
                  <div>
                    <label htmlFor="cfg-email" className={labelClass}>
                      Correo
                    </label>
                    <input
                      id="cfg-email"
                      type="email"
                      value={email}
                      onChange={(e) => setEmail(e.target.value)}
                      className={inputClass}
                    />
                  </div>
                </div>
                <div>
                  <label htmlFor="cfg-default-rate" className={labelClass}>
                    Tarifa por hora sugerida (nuevos empleados)
                  </label>
                  <input
                    id="cfg-default-rate"
                    type="text"
                    inputMode="decimal"
                    value={defaultHourlyRate}
                    onChange={(e) => setDefaultHourlyRate(e.target.value)}
                    placeholder="ej. 20"
                    className={inputClass}
                  />
                </div>

                {companyError && (
                  <p className="rounded-lg bg-red-500/10 px-3 py-2 text-sm text-red-400">{companyError}</p>
                )}

                <div className="flex justify-end pt-1">
                  <button type="button" disabled={savingCompany} onClick={handleSaveCompany} className={buttonClass}>
                    {savingCompany ? 'Guardando…' : 'Guardar cambios'}
                  </button>
                </div>
              </>
            ) : (
              <>
                <div>
                  <p className={labelClass}>Dirección</p>
                  <p className="rounded-lg border border-white/10 bg-surface px-3 py-2.5 text-sm text-ink-400">
                    {address || '—'}
                  </p>
                </div>
                <div className="grid grid-cols-2 gap-3">
                  <div>
                    <p className={labelClass}>Teléfono</p>
                    <p className="rounded-lg border border-white/10 bg-surface px-3 py-2.5 text-sm text-ink-400">
                      {phone || '—'}
                    </p>
                  </div>
                  <div>
                    <p className={labelClass}>Correo</p>
                    <p className="rounded-lg border border-white/10 bg-surface px-3 py-2.5 text-sm text-ink-400">
                      {email || '—'}
                    </p>
                  </div>
                </div>
                <div>
                  <p className={labelClass}>Tarifa por hora sugerida (nuevos empleados)</p>
                  <p className="rounded-lg border border-white/10 bg-surface px-3 py-2.5 text-sm text-ink-400">
                    {defaultHourlyRate || '—'}
                  </p>
                </div>
              </>
            )}
          </div>
        )}
      </div>

      <div className={sectionClass}>
        <p className={sectionTitleClass}>Mi perfil</p>
        <div className="space-y-4">
          <div className="grid grid-cols-2 gap-3">
            <div>
              <p className={labelClass}>Usuario</p>
              <p className="rounded-lg border border-white/10 bg-surface px-3 py-2.5 text-sm text-ink-400">
                {profile?.username ?? '—'}
              </p>
            </div>
            <div>
              <p className={labelClass}>Rol</p>
              <p className="rounded-lg border border-white/10 bg-surface px-3 py-2.5 text-sm text-ink-400">
                {profile ? (roleLabel[profile.role] ?? profile.role) : '—'}
              </p>
            </div>
          </div>

          <div>
            <label htmlFor="cfg-full-name" className={labelClass}>
              Nombre completo
            </label>
            <input
              id="cfg-full-name"
              type="text"
              value={fullName}
              onChange={(e) => setFullName(e.target.value)}
              className={inputClass}
            />
          </div>
          <div>
            <label htmlFor="cfg-contact-email" className={labelClass}>
              Correo de contacto
            </label>
            <input
              id="cfg-contact-email"
              type="email"
              value={contactEmail}
              onChange={(e) => setContactEmail(e.target.value)}
              className={inputClass}
            />
          </div>

          {profileError && <p className="rounded-lg bg-red-500/10 px-3 py-2 text-sm text-red-400">{profileError}</p>}

          <div className="flex justify-end pt-1">
            <button type="button" disabled={savingProfile} onClick={handleSaveProfile} className={buttonClass}>
              {savingProfile ? 'Guardando…' : 'Guardar perfil'}
            </button>
          </div>
        </div>
      </div>

      <div className={sectionClass}>
        <p className={sectionTitleClass}>Cambiar contraseña</p>
        <div className="space-y-4">
          <div>
            <label htmlFor="cfg-new-password" className={labelClass}>
              Nueva contraseña
            </label>
            <input
              id="cfg-new-password"
              type="password"
              value={newPassword}
              onChange={(e) => {
                setNewPassword(e.target.value)
                setPasswordSuccess(false)
              }}
              placeholder="Mínimo 8 caracteres"
              className={inputClass}
            />
          </div>
          <div>
            <label htmlFor="cfg-confirm-password" className={labelClass}>
              Confirmar contraseña
            </label>
            <input
              id="cfg-confirm-password"
              type="password"
              value={confirmPassword}
              onChange={(e) => {
                setConfirmPassword(e.target.value)
                setPasswordSuccess(false)
              }}
              placeholder="Repite la contraseña"
              className={inputClass}
            />
          </div>

          {passwordError && <p className="rounded-lg bg-red-500/10 px-3 py-2 text-sm text-red-400">{passwordError}</p>}
          {passwordSuccess && (
            <p className="rounded-lg bg-emerald-500/10 px-3 py-2 text-sm text-emerald-400">Contraseña actualizada.</p>
          )}

          <div className="flex justify-end pt-1">
            <button type="button" disabled={savingPassword} onClick={handleChangePassword} className={buttonClass}>
              {savingPassword ? 'Guardando…' : 'Cambiar contraseña'}
            </button>
          </div>
        </div>
      </div>
    </div>
  )
}

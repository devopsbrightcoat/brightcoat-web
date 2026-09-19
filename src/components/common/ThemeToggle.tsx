import { useState } from 'react'
import { Monitor, Moon, Sun } from 'lucide-react'
import { applyThemePreference, getStoredThemePreference, setThemePreference, type ThemePreference } from '../../lib/theme'

const ORDER: ThemePreference[] = ['system', 'light', 'dark']

const ICONS: Record<ThemePreference, typeof Sun> = {
  system: Monitor,
  light: Sun,
  dark: Moon,
}

const LABELS: Record<ThemePreference, string> = {
  system: 'Tema: como el sistema (clic para cambiar a claro)',
  light: 'Tema: claro (clic para cambiar a oscuro)',
  dark: 'Tema: oscuro (clic para seguir el sistema)',
}

// Vive dentro del sidebar (que siempre se queda navy oscuro, ver
// .theme-pin-dark en index.css), por eso reutiliza los mismos estilos
// hover:bg-white/10 que los demás botones de esa zona.
export const ThemeToggle = () => {
  const [preference, setPreference] = useState<ThemePreference>(() => getStoredThemePreference())

  const cycle = () => {
    const next = ORDER[(ORDER.indexOf(preference) + 1) % ORDER.length]
    setPreference(next)
    setThemePreference(next)
    applyThemePreference(next)
  }

  const Icon = ICONS[preference]

  return (
    <button
      type="button"
      onClick={cycle}
      title={LABELS[preference]}
      className="rounded-md p-1.5 text-brand-300 transition hover:bg-white/10 hover:text-white"
    >
      <Icon className="h-4 w-4" />
    </button>
  )
}

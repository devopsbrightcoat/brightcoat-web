// Preferencia de tema (claro/oscuro/según el sistema). "system" es el valor
// por defecto: no fuerza nada, deja que la regla @media (prefers-color-scheme)
// de index.css decida. "light"/"dark" fuerzan el tema vía el atributo
// data-theme en <html>, sin importar lo que tenga configurado el sistema.
export type ThemePreference = 'system' | 'light' | 'dark'

const STORAGE_KEY = 'brightcoat-ops-theme'

export const getStoredThemePreference = (): ThemePreference => {
  try {
    const stored = localStorage.getItem(STORAGE_KEY)
    if (stored === 'light' || stored === 'dark' || stored === 'system') return stored
  } catch {
    // localStorage no disponible (modo privado, navegador restringido, etc.)
  }
  return 'system'
}

export const applyThemePreference = (preference: ThemePreference): void => {
  const root = document.documentElement
  if (preference === 'system') {
    root.removeAttribute('data-theme')
  } else {
    root.setAttribute('data-theme', preference)
  }
}

export const setThemePreference = (preference: ThemePreference): void => {
  try {
    localStorage.setItem(STORAGE_KEY, preference)
  } catch {
    // best effort — si no se puede guardar, igual aplicamos el cambio ahora
  }
  applyThemePreference(preference)
}

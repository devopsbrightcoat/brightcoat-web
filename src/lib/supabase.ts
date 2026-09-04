import { createClient } from '@supabase/supabase-js'

// URL y anon key salen de Settings -> API en el Dashboard de Supabase.
// La anon key es pública (segura para el frontend) — nunca pongas aquí la
// service_role key.
const supabaseUrl = import.meta.env.VITE_SUPABASE_URL
const supabasePublishableKey = import.meta.env.VITE_SUPABASE_PUBLISHABLE_KEY

if (!supabaseUrl || !supabasePublishableKey) {
  throw new Error(
    'Faltan VITE_SUPABASE_URL / VITE_SUPABASE_PUBLISHABLE_KEY. Copia .env.example a .env.local y pon los valores reales del proyecto (Dashboard -> Settings -> API).',
  )
}

export const supabase = createClient(supabaseUrl, supabasePublishableKey)

// El login de la app es por username, pero Supabase Auth exige un
// identificador tipo correo por debajo. Cada cuenta se crea con un correo
// sintético que el usuario nunca ve: <username>@users.brightcoat.local
export const usernameToSyntheticEmail = (username: string) =>
  `${username.trim().toLowerCase()}@users.brightcoat.local`

import { createClient } from '@supabase/supabase-js'

const supabaseUrl = import.meta.env.VITE_SUPABASE_URL
const supabasePublishableKey = import.meta.env.VITE_SUPABASE_PUBLISHABLE_KEY

if (!supabaseUrl || !supabasePublishableKey) {
  throw new Error(
    'Faltan VITE_SUPABASE_URL / VITE_SUPABASE_PUBLISHABLE_KEY. Copia .env.example a .env.local y pon los valores reales del proyecto (Dashboard -> Settings -> API).',
  )
}

export const supabase = createClient(supabaseUrl, supabasePublishableKey)

export const usernameToSyntheticEmail = (username: string) =>
  `${username.trim().toLowerCase()}@users.brightcoat.local`

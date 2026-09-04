import type { Session } from '@supabase/supabase-js'
import { createContext, useContext, useEffect, useState, type ReactNode } from 'react'
import { supabase, usernameToSyntheticEmail } from '../lib/supabase'

export type ProfileRole = 'owner' | 'admin' | 'staff'

export type Profile = {
  id: string
  username: string
  fullName: string | null
  email: string | null
  role: ProfileRole
}

type AuthContextValue = {
  session: Session | null
  profile: Profile | null
  loading: boolean
  signIn: (username: string, password: string) => Promise<{ error: string | null }>
  signOut: () => Promise<void>
}

const AuthContext = createContext<AuthContextValue | undefined>(undefined)

const loadProfile = async (userId: string): Promise<Profile | null> => {
  const { data, error } = await supabase
    .from('profiles')
    .select('id, username, full_name, email, role')
    .eq('id', userId)
    .single()

  if (error || !data) return null

  return {
    id: data.id,
    username: data.username,
    fullName: data.full_name,
    email: data.email,
    role: data.role,
  }
}

export const AuthProvider = ({ children }: { children: ReactNode }) => {
  const [session, setSession] = useState<Session | null>(null)
  const [profile, setProfile] = useState<Profile | null>(null)
  const [loading, setLoading] = useState(true)

  useEffect(() => {
    let active = true

    supabase.auth.getSession().then(async ({ data }) => {
      if (!active) return
      setSession(data.session)
      setProfile(data.session ? await loadProfile(data.session.user.id) : null)
      setLoading(false)
    })

    const { data: subscription } = supabase.auth.onAuthStateChange(async (_event, nextSession) => {
      if (!active) return
      setSession(nextSession)
      setProfile(nextSession ? await loadProfile(nextSession.user.id) : null)
    })

    return () => {
      active = false
      subscription.subscription.unsubscribe()
    }
  }, [])

  const signIn: AuthContextValue['signIn'] = async (username, password) => {
    const { error } = await supabase.auth.signInWithPassword({
      email: usernameToSyntheticEmail(username),
      password,
    })

    if (error) {
      // Supabase da el mismo mensaje genérico para "no existe" y "password
      // incorrecto" — es lo correcto de cara al usuario (no revelar cuál).
      return { error: 'Usuario o contraseña incorrectos.' }
    }

    return { error: null }
  }

  const signOut = async () => {
    await supabase.auth.signOut()
  }

  return (
    <AuthContext.Provider value={{ session, profile, loading, signIn, signOut }}>
      {children}
    </AuthContext.Provider>
  )
}

export const useAuth = () => {
  const ctx = useContext(AuthContext)
  if (!ctx) throw new Error('useAuth debe usarse dentro de <AuthProvider>')
  return ctx
}

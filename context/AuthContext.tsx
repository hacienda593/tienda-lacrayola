'use client'
import { createContext, useContext, useEffect, useState } from 'react'
import { User, Session } from '@supabase/supabase-js'
import { supabase } from '@/lib/supabase'

interface AuthCtx {
  user:    User | null
  session: Session | null
  loading: boolean
  loginGoogle:  () => Promise<void>
  logout:       () => Promise<void>
}

const Ctx = createContext<AuthCtx>({
  user: null, session: null, loading: true,
  loginGoogle: async () => {}, logout: async () => {},
})

export function AuthProvider({ children }: { children: React.ReactNode }) {
  const [user,    setUser]    = useState<User | null>(null)
  const [session, setSession] = useState<Session | null>(null)
  const [loading, setLoading] = useState(true)

  useEffect(() => {
    supabase.auth.getSession().then(({ data }) => {
      setSession(data.session)
      setUser(data.session?.user ?? null)
      setLoading(false)
    })

    const { data: { subscription } } = supabase.auth.onAuthStateChange((_e, session) => {
      setSession(session)
      setUser(session?.user ?? null)
    })
    return () => subscription.unsubscribe()
  }, [])

  async function loginGoogle() {
    await supabase.auth.signInWithOAuth({
      provider: 'google',
      options: { redirectTo: `${window.location.origin}/auth/callback` },
    })
  }

  async function logout() {
    await supabase.auth.signOut()
    if (typeof window !== 'undefined') {
      localStorage.removeItem('lc_perfil')
      localStorage.removeItem('lc_puntos')
      localStorage.removeItem('lc_favoritos')
      localStorage.removeItem('lc_pedidos_local')
      window.dispatchEvent(new Event('puntos-update'))
      window.dispatchEvent(new Event('favoritos-update'))
      window.location.href = '/'
    }
  }

  return (
    <Ctx.Provider value={{ user, session, loading, loginGoogle, logout }}>
      {children}
    </Ctx.Provider>
  )
}

export function useAuth() { return useContext(Ctx) }

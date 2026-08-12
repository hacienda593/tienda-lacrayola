'use client'
import { createContext, useContext, useEffect, useRef, useState } from 'react'
import { User, Session } from '@supabase/supabase-js'
import { supabase } from '@/lib/supabase'
import { getFavoritos } from '@/lib/favoritos'
import { sincronizarFavoritosLocales } from '@/lib/favoritosCloud'
import { getPuntos } from '@/lib/puntos'
import { sincronizarPuntosLocales } from '@/lib/puntosCloud'

interface AuthCtx {
  user:    User | null
  session: Session | null
  loading: boolean
  loginGoogle:  (next?: string) => Promise<void>
  logout:       () => Promise<void>
}

const Ctx = createContext<AuthCtx>({
  user: null, session: null, loading: true,
  loginGoogle: async (_next?: string) => {}, logout: async () => {},
})

export function AuthProvider({ children }: { children: React.ReactNode }) {
  const [user,    setUser]    = useState<User | null>(null)
  const [session, setSession] = useState<Session | null>(null)
  const [loading, setLoading] = useState(true)
  const sincronizado = useRef(false)

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

  // Fusionar datos de invitado (localStorage) a la nube apenas hay sesión,
  // sin importar en qué pantalla esté el usuario cuando inicia sesión —
  // así no se pierden puntos/favoritos si antes solo pasaba en /cuenta.
  useEffect(() => {
    if (!user || sincronizado.current) return
    sincronizado.current = true

    const favoritosLocales = getFavoritos()
    if (favoritosLocales.length > 0) {
      sincronizarFavoritosLocales(user.id, favoritosLocales)
    }

    const puntosLocales = getPuntos()
    if (puntosLocales.total > 0) {
      sincronizarPuntosLocales(user.id, puntosLocales.total).then(() => {
        localStorage.removeItem('lc_puntos')
        window.dispatchEvent(new Event('puntos-update'))
      })
    }
  }, [user])

  async function loginGoogle(next?: string) {
    // Sin 'next' se comporta exactamente igual que antes (aterriza en
    // /cuenta via el callback). Con 'next', el callback regresa ahi en vez
    // -- por ejemplo, de vuelta al checkout en vez de sacar al cliente del
    // flujo de compra a mitad de camino.
    const callbackUrl = new URL(`${window.location.origin}/auth/callback`)
    if (next) callbackUrl.searchParams.set('next', next)
    await supabase.auth.signInWithOAuth({
      provider: 'google',
      options: { redirectTo: callbackUrl.toString() },
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

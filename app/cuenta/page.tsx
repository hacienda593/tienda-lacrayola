'use client'
import { useEffect, useState } from 'react'
import { useAuth } from '@/context/AuthContext'
import { getPuntosCloud, progresoNivel, BADGE_NIVEL, EstadoPuntosCloud, sincronizarPuntosLocales } from '@/lib/puntosCloud'
import { getFavoritosCloud, sincronizarFavoritosLocales } from '@/lib/favoritosCloud'
import { getFavoritos } from '@/lib/favoritos'
import { getPuntos } from '@/lib/puntos'
import { supabase } from '@/lib/supabase'
import { useRouter } from 'next/navigation'
import {
  LogOut, User, Trophy, Heart,
  Package, Phone, ChevronRight, Loader2, CheckCircle, Shield,
} from 'lucide-react'
import Link from 'next/link'

function fmt(n: number) { return '$' + n.toFixed(2) }

// ── Login / consulta invitado ──────────────────────────────────────
function PanelInvitado() {
  const { loginGoogle } = useAuth()
  const [localPuntos, setLocalPuntos] = useState<any | null>(null)
  const [modalOpen, setModalOpen] = useState(false)

  useEffect(() => {
    setLocalPuntos(getPuntos())
  }, [])

  return (
    <div className="space-y-5">
      {/* Tarjeta de puntos acumulados para invitados */}
      {localPuntos && localPuntos.total > 0 && (
        <div className="bg-white border border-gray-100 rounded-2xl p-5 shadow-sm space-y-3">
          <div className="flex items-center justify-between">
            <div className="flex items-center gap-2">
              <Trophy size={17} className="text-yellow-500" />
              <span className="font-bold text-gray-800 text-sm">Mis puntos acumulados</span>
            </div>
            <span className="text-[10px] font-bold px-2.5 py-0.5 rounded-full bg-amber-100 text-amber-800">
              Temporal (Invitado)
            </span>
          </div>
          <div className="grid grid-cols-2 gap-2 text-center">
            <div className="bg-yellow-50 rounded-xl p-3">
              <div className="text-lg font-extrabold text-yellow-700">{localPuntos.disponibles}</div>
              <div className="text-[10px] text-yellow-600 font-medium">Disponibles</div>
            </div>
            <div className="bg-green-50 rounded-xl p-3">
              <div className="text-lg font-extrabold text-green-700">{fmt(localPuntos.disponibles / 100)}</div>
              <div className="text-[10px] text-green-600 font-medium">En descuentos</div>
            </div>
          </div>
          
          <button
            onClick={() => setModalOpen(true)}
            className="w-full bg-yellow-500 hover:bg-yellow-600 text-white font-semibold py-2.5 rounded-xl text-xs transition flex items-center justify-center gap-1.5 cursor-pointer"
          >
            🎟️ Canjear puntos
          </button>
        </div>
      )}

      {/* Modal de Advertencia de Registro */}
      {modalOpen && (
        <div className="fixed inset-0 bg-black/50 z-50 flex items-center justify-center p-4">
          <div className="bg-white rounded-2xl p-6 max-w-sm w-full space-y-4 shadow-xl animate-fade-in text-left">
            <div className="text-center space-y-2">
              <div className="text-4xl">🔑</div>
              <h3 className="font-bold text-gray-800 text-base">Registro Requerido</h3>
              <p className="text-xs text-gray-500 leading-relaxed">
                Para hacer uso de tus **{localPuntos?.disponibles} puntos** y convertirlos en descuentos, debes registrarte con Google. 
                <br/><br/>
                ¡Tus puntos acumulados se guardarán permanentemente en tu cuenta!
              </p>
            </div>
            <div className="flex flex-col gap-2">
              <button
                onClick={() => {
                  setModalOpen(false)
                  loginGoogle()
                }}
                className="w-full bg-green-600 hover:bg-green-700 text-white font-bold py-2.5 rounded-xl text-xs transition flex items-center justify-center gap-1.5 cursor-pointer"
              >
                🔐 Registrarme con Google
              </button>
              <button
                onClick={() => setModalOpen(false)}
                className="w-full bg-gray-100 hover:bg-gray-200 text-gray-700 font-semibold py-2.5 rounded-xl text-xs transition cursor-pointer"
              >
                Cancelar
              </button>
            </div>
          </div>
        </div>
      )}
      <div className="bg-white border border-gray-100 rounded-2xl p-6 shadow-sm space-y-4">
        <div className="text-center space-y-1">
          <div className="text-4xl mb-2">🖍️</div>
          <h2 className="font-bold text-gray-800 text-lg">Cuenta registrada</h2>
          <p className="text-sm text-gray-400">Accede con Google para acumular puntos, sincronizar favoritos y ver tus pedidos desde cualquier dispositivo.</p>
        </div>

        <button onClick={loginGoogle}
          className="w-full flex items-center justify-center gap-3 border border-gray-200 hover:bg-gray-50 rounded-xl py-3 font-semibold text-gray-700 transition text-sm">
          <svg className="w-5 h-5" viewBox="0 0 24 24">
            <path d="M22.56 12.25c0-.78-.07-1.53-.2-2.25H12v4.26h5.92c-.26 1.37-1.04 2.53-2.21 3.31v2.77h3.57c2.08-1.92 3.28-4.74 3.28-8.09z" fill="#4285F4"/>
            <path d="M12 23c2.97 0 5.46-.98 7.28-2.66l-3.57-2.77c-.98.66-2.23 1.06-3.71 1.06-2.86 0-5.29-1.93-6.16-4.53H2.18v2.84C3.99 20.53 7.7 23 12 23z" fill="#34A853"/>
            <path d="M5.84 14.09c-.22-.66-.35-1.36-.35-2.09s.13-1.43.35-2.09V7.07H2.18C1.43 8.55 1 10.22 1 12s.43 3.45 1.18 4.93l3.66-2.84z" fill="#FBBC05"/>
            <path d="M12 5.38c1.62 0 3.06.56 4.21 1.64l3.15-3.15C17.45 2.09 14.97 1 12 1 7.7 1 3.99 3.47 2.18 7.07l3.66 2.84c.87-2.6 3.3-4.53 6.16-4.53z" fill="#EA4335"/>
          </svg>
          Continuar con Google
        </button>

        <div className="grid grid-cols-3 gap-2 pt-1">
          {[
            { icon: '⭐', label: 'Puntos', sub: 'Acumula y sube de nivel' },
            { icon: '❤️', label: 'Favoritos', sub: 'Sincronizados' },
            { icon: '📦', label: 'Pedidos', sub: 'Desde cualquier dispositivo' },
          ].map(b => (
            <div key={b.label} className="text-center p-2.5 bg-gray-50 rounded-xl">
              <div className="text-xl mb-1">{b.icon}</div>
              <div className="text-xs font-semibold text-gray-700">{b.label}</div>
              <div className="text-[10px] text-gray-400 leading-tight mt-0.5">{b.sub}</div>
            </div>
          ))}
        </div>
      </div>

    </div>
  )
}

// ── Panel usuario registrado ───────────────────────────────────────
function PanelRegistrado() {
  const { user, logout } = useAuth()
  const [puntos,     setPuntos]     = useState<EstadoPuntosCloud | null>(null)
  const [numFavs,    setNumFavs]    = useState(0)
  const [numPedidos, setNumPedidos] = useState(0)
  const [sincronizado, setSincronizado] = useState(false)
  const [sincronizadoPuntos, setSincronizadoPuntos] = useState(false)

  useEffect(() => {
    if (!user) return
    getPuntosCloud(user.id).then(setPuntos)
    getFavoritosCloud(user.id).then(f => setNumFavs(f.length))
    supabase.from('ol_pedidos').select('id', { count: 'exact', head: true })
      .eq('user_id', user.id)
      .then(({ count }) => setNumPedidos(count ?? 0))
    const locales = getFavoritos()
    if (locales.length > 0) {
      sincronizarFavoritosLocales(user.id, locales).then(() => setSincronizado(true))
    }
    const localPpts = getPuntos()
    if (localPpts.total > 0) {
      sincronizarPuntosLocales(user.id, localPpts.total).then(() => {
        localStorage.removeItem('lc_puntos')
        setSincronizadoPuntos(true)
        getPuntosCloud(user.id).then(setPuntos)
      })
    }
  }, [user])

  if (!user) return null
  const rawNombre = user.user_metadata?.full_name || user.user_metadata?.name || ''
  const nombre    = rawNombre
    ? rawNombre.normalize('NFD').replace(/[̀-ͯ]/g, '').replace(/[^\x20-\x7EÀ-ɏ]/g, '').trim() || rawNombre
    : (user.email?.split('@')[0] || 'Usuario')
  const avatar  = user.user_metadata?.avatar_url
  const progreso = puntos ? progresoNivel(puntos.total) : null

  return (
    <div className="space-y-4">
      {/* Perfil */}
      <div className="bg-white border border-gray-100 rounded-2xl p-5 shadow-sm flex items-center gap-4">
        {avatar
          ? <img src={avatar} alt={nombre} className="w-14 h-14 rounded-full border-2 border-green-200" />
          : <div className="w-14 h-14 bg-green-100 rounded-full flex items-center justify-center shrink-0"><User size={24} className="text-green-700" /></div>
        }
        <div className="flex-1 min-w-0">
          <div className="font-bold text-gray-800 truncate">{nombre}</div>
          <div className="text-xs text-gray-400 truncate">{user.email}</div>
          <div className="flex items-center gap-1 mt-1">
            <Shield size={11} className="text-green-500" />
            <span className="text-[11px] text-green-600 font-semibold">Cliente verificado</span>
          </div>
        </div>
      </div>

      {/* Puntos */}
      {puntos && (
        <div className="bg-white border border-gray-100 rounded-2xl p-5 shadow-sm space-y-3">
          <div className="flex items-center justify-between">
            <div className="flex items-center gap-2">
              <Trophy size={17} className="text-yellow-500" />
              <span className="font-bold text-gray-800">Mis puntos</span>
            </div>
            <span className={`text-xs font-bold px-2.5 py-1 rounded-full ${BADGE_NIVEL[puntos.nivel]}`}>
              {puntos.nivel}
            </span>
          </div>
          <div className="grid grid-cols-3 gap-2 text-center">
            <div className="bg-yellow-50 rounded-xl p-3">
              <div className="text-xl font-extrabold text-yellow-700">{puntos.disponibles}</div>
              <div className="text-[10px] text-yellow-600 font-medium">Disponibles</div>
            </div>
            <div className="bg-gray-50 rounded-xl p-3">
              <div className="text-xl font-extrabold text-gray-700">{puntos.total}</div>
              <div className="text-[10px] text-gray-500 font-medium">Acumulados</div>
            </div>
            <div className="bg-green-50 rounded-xl p-3">
              <div className="text-xl font-extrabold text-green-700">{fmt(puntos.disponibles / 100)}</div>
              <div className="text-[10px] text-green-600 font-medium">En descuentos</div>
            </div>
          </div>
          {progreso && progreso.faltan > 0 && (
            <div className="space-y-1.5">
              <div className="flex justify-between text-xs text-gray-400">
                <span>Hacia nivel {progreso.siguiente}</span>
                <span>{progreso.faltan} pts más</span>
              </div>
              <div className="w-full bg-gray-100 rounded-full h-2">
                <div className="bg-yellow-400 h-2 rounded-full transition-all duration-700"
                  style={{ width: `${Math.min(100, progreso.porcentaje)}%` }} />
              </div>
            </div>
          )}
          {progreso?.faltan === 0 && (
            <p className="text-center text-xs text-yellow-600 font-semibold">🏆 ¡Nivel máximo alcanzado!</p>
          )}
        </div>
      )}

      {/* Accesos */}
      <div className="bg-white border border-gray-100 rounded-2xl shadow-sm divide-y divide-gray-50">
        <Link href="/pedidos" className="flex items-center gap-3 px-5 py-4 hover:bg-gray-50 transition">
          <Package size={17} className="text-green-600" />
          <div className="flex-1">
            <div className="text-sm font-medium text-gray-800">Mis pedidos</div>
            <div className="text-xs text-gray-400">{numPedidos} pedido{numPedidos !== 1 ? 's' : ''}</div>
          </div>
          <ChevronRight size={14} className="text-gray-300" />
        </Link>
        <Link href="/favoritos" className="flex items-center gap-3 px-5 py-4 hover:bg-gray-50 transition">
          <Heart size={17} className="text-red-400" />
          <div className="flex-1">
            <div className="text-sm font-medium text-gray-800">Mis favoritos</div>
            <div className="text-xs text-gray-400">{numFavs} producto{numFavs !== 1 ? 's' : ''} guardados</div>
          </div>
          <ChevronRight size={14} className="text-gray-300" />
        </Link>
      </div>

      {sincronizado && (
        <div className="flex items-center gap-2 bg-green-50 border border-green-200 rounded-xl px-4 py-2.5 text-xs text-green-700">
          <CheckCircle size={13} /> Tus favoritos locales se sincronizaron con tu cuenta.
        </div>
      )}

      {sincronizadoPuntos && (
        <div className="flex items-center gap-2 bg-yellow-50 border border-yellow-200 rounded-xl px-4 py-2.5 text-xs text-yellow-800">
          <CheckCircle size={13} className="text-yellow-600" /> Tus puntos acumulados como invitado se guardaron en tu cuenta.
        </div>
      )}

      <button onClick={logout}
        className="w-full flex items-center justify-center gap-2 border border-gray-200 hover:bg-red-50 hover:border-red-200 hover:text-red-600 text-gray-500 font-semibold py-3 rounded-xl transition text-sm">
        <LogOut size={14} /> Cerrar sesión
      </button>
    </div>
  )
}



// ── Página ─────────────────────────────────────────────────────────
export default function CuentaPage() {
  const { user, loading } = useAuth()

  if (loading) {
    return (
      <div className="max-w-lg mx-auto px-4 py-16 flex justify-center">
        <Loader2 size={28} className="animate-spin text-green-500" />
      </div>
    )
  }

  return (
    <div className="max-w-lg mx-auto px-4 py-5">
      <h1 className="text-lg font-bold text-gray-800 mb-5">Mi cuenta</h1>
      {user ? (
        <PanelRegistrado />
      ) : (
        <PanelInvitado />
      )}
    </div>
  )
}

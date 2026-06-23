'use client'
import { useState, useEffect } from 'react'
import { useRouter, useParams, useSearchParams, usePathname } from 'next/navigation'
import {
  X, User, Tag, Settings, HelpCircle,
  ChevronRight, Search, Heart, Package,
  MessageCircle, Star, Trophy, Loader2, ShoppingCart, Printer, Smartphone
} from 'lucide-react'
import { getPuntos, progresoNivel } from '@/lib/puntos'
import { getPuntosCloud, EstadoPuntosCloud } from '@/lib/puntosCloud'
import { getPerfil } from '@/lib/perfil'
import { useAuth } from '@/context/AuthContext'
import { supabase } from '@/lib/supabase'
import { OlTienda } from '@/lib/types'

const STORE_EMOJI: Record<string, string> = {
  supermercado: '🛒',
  farmacia: '💊',
  libreria: '🖍️',
  abarrotes: '🥬',
  tecnologia: '💻',
  ropa: '👕',
  otros: '🏪',
}

const CAT_EMOJI: Record<string, string> = {
  'Escolar':      '📚',
  'Arte':         '🎨',
  'Oficina':      '🖊️',
  'Tecnologia':   '💻',
  'Juguetes':     '🧸',
  'Manualidades': '✂️',
  'Libros':       '📖',
  'Pintura':      '🖌️',
  'Papeleria':    '📄',
  'Alimentos':    '🥦',
  'Bebidas':      '🥤',
  'Limpieza':     '🧹',
  'Higiene':      '🧴',
  'Farmacia':     '💊',
  'Carnes':       '🥩',
  'Lacteos':      '🧀',
  'Snacks':       '🍿',
}

type Tab = 'cuenta' | 'explorar'

interface Props {
  open: boolean
  onClose: () => void
}

export default function MenuDrawer({ open, onClose }: Props) {
  const [tab, setTab]       = useState<Tab>('cuenta')
  const [q, setQ]           = useState('')
  const [puntos, setPuntos] = useState<EstadoPuntosCloud | null>(null)
  const { user, logout }    = useAuth()
  const router = useRouter()
  const params = useParams<{ id?: string }>()
  const searchParams = useSearchParams()
  const pathname = usePathname()

  const [tiendas, setTiendas] = useState<OlTienda[]>([])
  const [tiendaSeleccionada, setTiendaSeleccionada] = useState<OlTienda | null>(null)
  const [cats, setCats] = useState<{ categoria: string; total: number }[]>([])
  const [cargandoCats, setCargandoCats] = useState(false)

  // Nombre a mostrar: Google > perfil local > null
  const rawNombre = user?.user_metadata?.full_name || user?.user_metadata?.name || ''
  const nombre = user
    ? (rawNombre.trim() || user.email?.split('@')[0] || 'Usuario')
    : (getPerfil()?.nombre ?? null)
  const avatar = user?.user_metadata?.avatar_url

  // Cargar puntos
  useEffect(() => {
    if (!open) return
    if (user) {
      getPuntosCloud(user.id).then(setPuntos)
    } else {
      const p = getPuntos()
      setPuntos(p)
      const sync = () => setPuntos(getPuntos())
      window.addEventListener('puntos-update', sync)
      return () => window.removeEventListener('puntos-update', sync)
    }
  }, [open, user])

  // Cargar tiendas aliadas activas al abrir
  useEffect(() => {
    if (!open) return
    
    supabase.from('ol_tiendas')
      .select('*')
      .eq('activa', true)
      .order('orden')
      .then(({ data }) => {
        if (data) {
          const list = data as OlTienda[]
          setTiendas(list)
          
          // Detectar tienda activa desde la URL
          let activeTiendaId = searchParams.get('tienda_id') || ''
          if (!activeTiendaId && pathname.startsWith('/tiendas/') && params.id) {
            activeTiendaId = params.id
          }
          
          if (activeTiendaId) {
            const found = list.find(t => t.id === activeTiendaId)
            if (found) {
              setTiendaSeleccionada(found)
              return
            }
          }
          setTiendaSeleccionada(null)
        }
      })
  }, [open, pathname, params.id, searchParams])

  // Cargar categorías cuando se selecciona una tienda
  useEffect(() => {
    if (!tiendaSeleccionada) {
      setCats([])
      return
    }
    setCargandoCats(true)
    supabase.from('ol_productos')
      .select('categoria')
      .eq('tienda_id', tiendaSeleccionada.id)
      .gt('stock', 0)
      .gt('precio_publico', 0)
      .then(({ data }) => {
        if (!data) {
          setCats([])
          setCargandoCats(false)
          return
        }
        const map = new Map<string, number>()
        data.forEach(p => {
          if (p.categoria) map.set(p.categoria, (map.get(p.categoria) ?? 0) + 1)
        })
        const result = Array.from(map.entries())
          .map(([categoria, total]) => ({ categoria, total }))
          .sort((a, b) => b.total - a.total)
        setCats(result)
        setCargandoCats(false)
      })
  }, [tiendaSeleccionada])

  // Registrar escuchador global para abrir el menú desde la barra móvil
  useEffect(() => {
    const abrirMenu = () => setTab('cuenta')
    window.addEventListener('open-menu-global', abrirMenu)
    return () => window.removeEventListener('open-menu-global', abrirMenu)
  }, [])

  function buscar(e: React.SyntheticEvent<HTMLFormElement>) {
    e.preventDefault()
    if (typeof document !== 'undefined') {
      (document.activeElement as HTMLElement)?.blur()
    }
    if (q.trim()) {
      router.push(`/productos?q=${encodeURIComponent(q.trim())}`)
      onClose()
    }
  }

  function navegar(href: string) {
    router.push(href)
    onClose()
  }

  const progreso = puntos ? progresoNivel(puntos.total) : null

  return (
    <>
      {/* Overlay */}
      <div
        className={`fixed inset-0 bg-black/40 z-[60] transition-opacity duration-300 ${open ? 'opacity-100 pointer-events-auto' : 'opacity-0 pointer-events-none'}`}
        onClick={onClose}
      />

      {/* Drawer */}
      <aside
        className={`fixed top-0 left-0 h-full w-[300px] max-w-[85vw] bg-white z-[70] flex flex-col shadow-2xl transition-transform duration-300 ease-in-out ${open ? 'translate-x-0' : '-translate-x-full'}`}
      >
        {/* Header del drawer */}
        <div className="bg-green-700 text-white px-4 pt-10 pb-4">
          <div className="flex items-center justify-between mb-4">
            <div className="flex items-center gap-3">
              {avatar
                ? <img src={avatar} alt={nombre ?? ''} className="w-12 h-12 rounded-full border-2 border-white/30" />
                : <div className="w-12 h-12 bg-white/20 rounded-full flex items-center justify-center text-2xl">
                    {user ? (nombre?.[0]?.toUpperCase() || '👤') : '🖍️'}
                  </div>
              }
              <div>
                <div className="font-bold text-base leading-tight">
                  {nombre ? nombre.split(' ')[0] : 'La Crayola'}
                </div>
                <div className="text-green-200 text-xs">
                  {user ? user.email : nombre ? 'Bienvenido de nuevo' : 'Librería & Papelería'}
                </div>
              </div>
            </div>
            <button onClick={onClose} className="p-1.5 hover:bg-white/10 rounded-lg transition">
              <X size={20} />
            </button>
          </div>

          {/* Tarjeta de puntos */}
          {puntos !== null && (
            <div className="bg-white/15 rounded-xl px-3 py-2.5 mb-3 space-y-1.5">
              <div className="flex items-center justify-between">
                <div className="flex items-center gap-1.5">
                  <Trophy size={13} className="text-yellow-300" />
                  <span className="text-xs font-bold text-white">Nivel {puntos.nivel}</span>
                </div>
                <span className="text-xs font-bold text-yellow-300">{puntos.disponibles} pts</span>
              </div>
              {progreso && progreso.faltan > 0 && (
                <>
                  <div className="w-full bg-white/20 rounded-full h-1.5">
                    <div
                      className="bg-yellow-300 h-1.5 rounded-full transition-all duration-700"
                      style={{ width: `${Math.min(100, progreso.porcentaje)}%` }}
                    />
                  </div>
                  <div className="text-[10px] text-green-200">
                    {progreso.faltan} pts para nivel {progreso.siguiente}
                  </div>
                </>
              )}
              {progreso?.faltan === 0 && (
                <div className="text-[10px] text-yellow-300 font-semibold">🏆 ¡Nivel máximo alcanzado!</div>
              )}
            </div>
          )}

          {/* Tabs */}
          <div className="flex gap-1 bg-green-800/40 rounded-xl p-1">
            <button
              onClick={() => setTab('cuenta')}
              className={`flex-1 py-1.5 rounded-lg text-sm font-semibold transition ${tab === 'cuenta' ? 'bg-white text-green-700' : 'text-white/80 hover:text-white'}`}
            >
              Mi Cuenta
            </button>
            <button
              onClick={() => setTab('explorar')}
              className={`flex-1 py-1.5 rounded-lg text-sm font-semibold transition ${tab === 'explorar' ? 'bg-white text-green-700' : 'text-white/80 hover:text-white'}`}
            >
              Explorar
            </button>
          </div>
        </div>

        {/* Contenido scrollable */}
        <div className="flex-1 overflow-y-auto">

          {/* ── PESTAÑA CUENTA ── */}
          {tab === 'cuenta' && (
            <div className="py-2">
              {/* Tarjeta de perfil */}
              <div className="mx-4 my-3 p-3 bg-gray-50 rounded-xl border border-gray-100">
                <div className="flex items-center gap-3">
                  {user
                    ? avatar
                      ? <img src={avatar} className="w-10 h-10 rounded-full" alt="" />
                      : <div className="w-10 h-10 bg-green-600 rounded-full flex items-center justify-center text-white font-bold">{nombre?.[0]?.toUpperCase()}</div>
                    : <div className="w-10 h-10 bg-green-100 rounded-full flex items-center justify-center"><User size={18} className="text-green-700" /></div>
                  }
                  <div className="flex-1 min-w-0">
                    <div className="text-sm font-semibold text-gray-800 truncate">{nombre ?? 'Cliente'}</div>
                    <div className="text-xs text-gray-400 truncate">
                      {user
                        ? `${puntos?.total ?? 0} pts · Nivel ${puntos?.nivel ?? 'Bronce'}`
                        : puntos && puntos.total > 0
                          ? `${puntos.total} pts acumulados`
                          : 'Sin compras aún'
                      }
                    </div>
                  </div>
                  {!user && (
                    <button onClick={() => navegar('/cuenta')}
                      className="text-[10px] bg-green-600 text-white font-bold px-2.5 py-1 rounded-lg shrink-0">
                      Entrar
                    </button>
                  )}
                </div>
              </div>

              <ItemMenu icon={<Package size={18} />} label="Mis pedidos"      sub="Historial y recompra"     onClick={() => navegar('/pedidos')} />
              <ItemMenu icon={<Heart size={18} />}   label="Mis favoritos"     sub="Lista de deseos"          onClick={() => navegar('/favoritos')} />
              <ItemMenu icon={<ShoppingCart size={18} />} label="Comprar de nuevo" sub="Tus artículos frecuentes" onClick={() => navegar('/productos?frecuentes=true')} />
              <ItemMenu 
                icon={<Printer size={18} />} 
                label="Servicio de Impresión" 
                sub="Imprimir fotos o documentos" 
                onClick={() => navegar('/impresion')} 
              />
              <ItemMenu 
                icon={<Smartphone size={18} />} 
                label="Recargas y Servicios" 
                sub="Saldo, combos y pago de facturas" 
                onClick={() => navegar('/recargas')} 
              />
              <ItemMenu icon={<Star size={18} />}    label="Mis puntos"        sub={puntos ? `${puntos.disponibles} pts · ${puntos.nivel}` : 'Gana puntos comprando'} onClick={() => navegar('/cuenta')} badge={user ? undefined : 'Próx.'} />
              <ItemMenu icon={<Tag size={18} />}     label="Cupones y códigos" sub="Descuentos disponibles"   onClick={() => navegar('/cupones')} badge="Próx." />
              <Divider />
              <ItemMenu icon={<Settings size={18} />}   label="Configuración"   sub="Preferencias"             onClick={() => navegar('/configuracion')} badge="Próx." />
              <ItemMenu icon={<HelpCircle size={18} />} label="Ayuda y soporte" sub="Preguntas frecuentes"     onClick={() => navegar('/ayuda')} />
              <ItemMenu
                icon={<MessageCircle size={18} className="text-green-600" />}
                label="WhatsApp"
                sub="Escríbenos directamente"
                onClick={() => { window.open('https://wa.me/593984341953', '_blank'); onClose() }}
              />
              {(user || !!getPerfil()?.nombre) && (
                <>
                  <Divider />
                  <button
                    onClick={() => { logout(); onClose() }}
                    className="w-full flex items-center gap-3 px-4 py-3 hover:bg-red-50 transition text-left text-sm font-medium text-red-500">
                    <span className="w-5 flex-shrink-0 text-red-400">
                      <svg viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2" className="w-[18px] h-[18px]">
                        <path d="M9 21H5a2 2 0 0 1-2-2V5a2 2 0 0 1 2-2h4M16 17l5-5-5-5M21 12H9"/>
                      </svg>
                    </span>
                    Cerrar sesión
                  </button>
                </>
              )}
            </div>
          )}

          {/* ── PESTAÑA EXPLORAR ── */}
          {tab === 'explorar' && (
            <div className="py-3 px-4 space-y-4">
              <form onSubmit={buscar}>
                <div className="relative">
                  <Search size={15} className="absolute left-3 top-1/2 -translate-y-1/2 text-gray-400" />
                  <input
                    value={q} onChange={e => setQ(e.target.value)}
                    placeholder="Buscar productos..."
                    className="w-full bg-gray-100 border border-gray-200 rounded-xl pl-9 pr-4 py-2.5 text-sm text-gray-800 placeholder-gray-400 focus:outline-none focus:border-green-500 focus:bg-white transition"
                  />
                </div>
              </form>

              {/* Si no hay tienda seleccionada -> Listar Tiendas */}
              {!tiendaSeleccionada ? (
                <>
                  <div>
                    <p className="text-[10px] font-bold text-gray-400 uppercase tracking-wider mb-2">Acceso rápido</p>
                    <div className="grid grid-cols-2 gap-2">
                      <QuickBtn emoji="🏠" label="Inicio"      onClick={() => navegar('/')} />
                      <QuickBtn emoji="🛍️" label="Todo"        onClick={() => navegar('/productos')} />
                      <QuickBtn emoji="❤️" label="Favoritos"   onClick={() => navegar('/favoritos')} />
                      <QuickBtn emoji="📦" label="Mis pedidos" onClick={() => navegar('/pedidos')} />
                    </div>
                  </div>

                  <div>
                    <p className="text-[10px] font-bold text-gray-400 uppercase tracking-wider mb-2">🏪 Tiendas disponibles</p>
                    <div className="space-y-1.5">
                      {tiendas.map(tienda => {
                        const fallbackEmoji = STORE_EMOJI[tienda.categoria ?? 'otros'] || '🏪'
                        return (
                          <button
                            key={tienda.id}
                            onClick={() => setTiendaSeleccionada(tienda)}
                            className="w-full flex items-center gap-3 px-3 py-2 bg-gray-50 border border-gray-100 hover:border-green-200 hover:bg-green-50/30 rounded-xl transition text-left group"
                          >
                            <span className="text-xl w-7 text-center">
                              {tienda.logo_url 
                                ? <img src={tienda.logo_url} alt={tienda.nombre} className="w-5 h-5 object-contain inline" />
                                : fallbackEmoji
                              }
                            </span>
                            <span className="text-xs font-bold text-gray-700 group-hover:text-green-700 flex-1 truncate">
                              {tienda.nombre}
                            </span>
                            <ChevronRight size={14} className="text-gray-300 group-hover:text-green-500" />
                          </button>
                        )
                      })}
                    </div>
                  </div>
                </>
              ) : (
                // Si hay tienda seleccionada -> Listar sus Categorías dinámicas
                <>
                  <div className="flex items-center justify-between pb-1 border-b border-gray-100">
                    <button
                      onClick={() => setTiendaSeleccionada(null)}
                      className="text-xs text-green-600 font-bold hover:underline flex items-center gap-1"
                    >
                      ← Cambiar tienda
                    </button>
                    <span className="text-[10px] text-gray-400 font-semibold truncate max-w-[140px]">
                      {tiendaSeleccionada.nombre}
                    </span>
                  </div>

                  <div>
                    <p className="text-[10px] font-bold text-gray-400 uppercase tracking-wider mb-2">Categorías</p>
                    {cargandoCats ? (
                      <div className="flex justify-center py-8">
                        <Loader2 size={20} className="animate-spin text-green-500" />
                      </div>
                    ) : cats.length > 0 ? (
                      <div className="space-y-1 max-h-[300px] overflow-y-auto pr-1 scrollbar-hide">
                        {cats.map(({ categoria, total }) => {
                          return (
                            <button
                              key={categoria}
                              onClick={() => navegar(`/tiendas/${tiendaSeleccionada.id}?cat=${encodeURIComponent(categoria)}`)}
                              className="w-full flex items-center gap-3 px-3 py-2 rounded-xl hover:bg-green-50 transition text-left group border border-transparent hover:border-green-100"
                            >
                              <span className="text-xs font-semibold text-gray-700 group-hover:text-green-700 flex-1">{categoria}</span>
                              <span className="text-[9px] text-gray-400 font-bold bg-gray-50 group-hover:bg-green-100 px-1.5 py-0.5 rounded-full">
                                {total}
                              </span>
                              <ChevronRight size={14} className="text-gray-300 group-hover:text-green-500" />
                            </button>
                          )
                        })}
                      </div>
                    ) : (
                      <div className="text-center py-8 text-gray-400 text-xs">
                        Sin categorías en esta tienda
                      </div>
                    )}
                  </div>
                </>
              )}
            </div>
          )}
        </div>

        {/* Footer */}
        <div className="border-t border-gray-100 px-4 py-3">
          <p className="text-[10px] text-gray-400 text-center">La Crayola · V 1.0 · Librería & Papelería</p>
        </div>
      </aside>
    </>
  )
}

function ItemMenu({ icon, label, sub, onClick, badge }: {
  icon: React.ReactNode; label: string; sub?: string; onClick: () => void; badge?: string
}) {
  return (
    <button onClick={onClick} className="w-full flex items-center gap-3 px-4 py-3 hover:bg-gray-50 transition text-left">
      <span className="text-green-600 w-5 flex-shrink-0">{icon}</span>
      <div className="flex-1 min-w-0">
        <div className="text-sm font-medium text-gray-800">{label}</div>
        {sub && <div className="text-xs text-gray-400 truncate">{sub}</div>}
      </div>
      {badge
        ? <span className="text-[10px] bg-orange-100 text-orange-600 font-semibold px-2 py-0.5 rounded-full">{badge}</span>
        : <ChevronRight size={14} className="text-gray-300 flex-shrink-0" />
      }
    </button>
  )
}

function QuickBtn({ emoji, label, onClick }: { emoji: string; label: string; onClick: () => void }) {
  return (
    <button
      onClick={onClick}
      className="flex items-center gap-2 px-3 py-2.5 bg-gray-50 hover:bg-green-50 border border-gray-100 hover:border-green-200 rounded-xl transition text-left w-full group"
    >
      <span className="text-lg">{emoji}</span>
      <span className="text-xs font-medium text-gray-700 group-hover:text-green-700">{label}</span>
    </button>
  )
}

function Divider() {
  return <div className="mx-4 my-1 border-t border-gray-100" />
}

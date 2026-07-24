'use client'
import { useState, useEffect } from 'react'
import { useRouter, useParams, useSearchParams, usePathname } from 'next/navigation'
import {
  X, User, Tag, Settings, HelpCircle,
  ChevronRight, ClipboardList, Package,
  MessageCircle, Star, Trophy, Loader2, ShoppingCart, Printer, Smartphone,
  Store, ShoppingBasket, Pill, BookOpen,
} from 'lucide-react'
import { getPuntos, progresoNivel } from '@/lib/puntos'
import { getPuntosCloud, EstadoPuntosCloud } from '@/lib/puntosCloud'
import { getPerfil } from '@/lib/perfil'
import { useAuth } from '@/context/AuthContext'
import { supabase } from '@/lib/supabase'
import { OlTienda } from '@/lib/types'

const STORE_ICONO: Record<string, React.ElementType> = {
  supermercado: ShoppingBasket, farmacia: Pill, libreria: BookOpen,
  abarrotes: ShoppingBasket, tecnologia: Package, ropa: Package, otros: Store,
}

type Tab = 'explorar' | 'cuenta'

interface Props {
  open: boolean
  onClose: () => void
}

export default function MenuDrawer({ open, onClose }: Props) {
  const [tab, setTab]       = useState<Tab>('explorar')
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
    const abrirMenu = () => setTab('explorar')
    window.addEventListener('open-menu-global', abrirMenu)
    return () => window.removeEventListener('open-menu-global', abrirMenu)
  }, [])

  function navegar(href: string) {
    router.push(href)
    onClose()
  }

  const progreso = puntos ? progresoNivel(puntos.total) : null

  return (
    <>
      {/* Overlay */}
      <div
        className={`fixed inset-0 bg-pine-deep/30 z-[60] transition-opacity duration-300 ${open ? 'opacity-100 pointer-events-auto' : 'opacity-0 pointer-events-none'}`}
        onClick={onClose}
      />

      {/* Drawer */}
      <aside
        className={`fixed top-0 left-0 h-full w-[300px] max-w-[85vw] bg-white z-[70] flex flex-col shadow-2xl transition-transform duration-300 ease-in-out font-ui ${open ? 'translate-x-0' : '-translate-x-full'}`}
      >
        {/* Header del drawer */}
        <div className="bg-pine-deep text-white px-4 pt-10 pb-4">
          <div className="flex items-center justify-between mb-3">
            <div className="flex items-center gap-3">
              {avatar
                ? <img src={avatar} alt={nombre ?? ''} className="w-11 h-11 rounded-full border-2 border-white/20" />
                : <div className="w-11 h-11 bg-white/10 rounded-full flex items-center justify-center">
                    <User size={18} className="text-white/70" />
                  </div>
              }
              <div>
                <div className="font-display font-bold text-base leading-tight">
                  {nombre ? nombre.split(' ')[0] : 'La Crayola'}
                </div>
                <div className="text-white/60 text-xs">
                  {user ? user.email : nombre ? 'Bienvenido de nuevo' : 'Librería & Papelería'}
                </div>
              </div>
            </div>
            <button onClick={onClose} className="p-1.5 hover:bg-white/10 rounded-lg transition">
              <X size={20} />
            </button>
          </div>

          {/* Nivel/puntos — linea discreta, sin recuadro con degradado */}
          {puntos !== null && (
            <div className="mb-3">
              <div className="flex items-center justify-between mb-1.5">
                <span className="flex items-center gap-1.5 text-[12px] font-semibold text-white/90">
                  <Trophy size={12} className="text-white/60" /> Nivel {puntos.nivel}
                </span>
                <span className="font-price text-[11px] text-white/60">{puntos.disponibles} pts</span>
              </div>
              {progreso && progreso.faltan > 0 && (
                <>
                  <div className="w-full bg-white/15 rounded-full h-1">
                    <div
                      className="bg-white h-1 rounded-full transition-all duration-700"
                      style={{ width: `${Math.min(100, progreso.porcentaje)}%` }}
                    />
                  </div>
                  <div className="font-price text-[10px] text-white/50 mt-1">
                    {progreso.faltan} pts para nivel {progreso.siguiente}
                  </div>
                </>
              )}
              {progreso?.faltan === 0 && (
                <div className="text-[10px] text-white/70 font-semibold">Nivel máximo alcanzado</div>
              )}
            </div>
          )}

          {/* Tabs */}
          <div className="flex gap-1 bg-white/10 rounded-lg p-1">
            <button
              onClick={() => setTab('explorar')}
              className={`flex-1 py-1.5 rounded-md text-sm font-semibold transition ${tab === 'explorar' ? 'bg-white text-pine-deep' : 'text-white/70 hover:text-white'}`}
            >
              Explorar
            </button>
            <button
              onClick={() => setTab('cuenta')}
              className={`flex-1 py-1.5 rounded-md text-sm font-semibold transition ${tab === 'cuenta' ? 'bg-white text-pine-deep' : 'text-white/70 hover:text-white'}`}
            >
              Mi Cuenta
            </button>
          </div>
        </div>

        {/* Contenido scrollable */}
        <div className="flex-1 overflow-y-auto">

          {/* PESTANA EXPLORAR (principal) */}
          {tab === 'explorar' && (
            <div className="py-3 px-4 space-y-4">
              {/* Si no hay tienda seleccionada -> Listar Tiendas */}
              {!tiendaSeleccionada ? (
                <div>
                  <p className="font-price text-[10px] font-medium tracking-wide uppercase text-ink-faint mb-2">Tiendas disponibles</p>
                  <div className="space-y-1.5">
                    {tiendas.map(tienda => {
                      const FallbackIcon = STORE_ICONO[tienda.categoria ?? 'otros'] || Store
                      return (
                        <button
                          key={tienda.id}
                          onClick={() => setTiendaSeleccionada(tienda)}
                          className="w-full flex items-center gap-3 px-3 py-2 bg-surface-2 border border-line hover:border-pine/40 hover:bg-pine-tint rounded-lg transition text-left group"
                        >
                          <span className="w-7 h-7 rounded-md bg-pine-tint text-pine-deep flex items-center justify-center shrink-0">
                            {tienda.logo_url
                              ? <img src={tienda.logo_url} alt={tienda.nombre} className="w-4 h-4 object-contain inline" />
                              : <FallbackIcon size={13} strokeWidth={1.8} />
                            }
                          </span>
                          <span className="text-xs font-semibold text-ink group-hover:text-pine-deep flex-1 truncate">
                            {tienda.nombre}
                          </span>
                          <ChevronRight size={14} className="text-ink-faint group-hover:text-pine" />
                        </button>
                      )
                    })}
                  </div>
                </div>
              ) : (
                // Si hay tienda seleccionada -> Listar sus Categorías dinámicas
                <>
                  <div className="flex items-center justify-between pb-1 border-b border-line">
                    <button
                      onClick={() => setTiendaSeleccionada(null)}
                      className="text-xs text-pine font-semibold hover:text-pine-deep flex items-center gap-1"
                    >
                      <ChevronRight size={12} className="rotate-180" /> Cambiar tienda
                    </button>
                    <span className="font-price text-[10px] text-ink-faint truncate max-w-[140px]">
                      {tiendaSeleccionada.nombre}
                    </span>
                  </div>

                  <div>
                    <p className="font-price text-[10px] font-medium tracking-wide uppercase text-ink-faint mb-2">Categorías</p>
                    {cargandoCats ? (
                      <div className="flex justify-center py-8">
                        <Loader2 size={20} className="animate-spin text-pine" />
                      </div>
                    ) : cats.length > 0 ? (
                      <div className="space-y-1 max-h-[300px] overflow-y-auto pr-1 scrollbar-hide">
                        {cats.map(({ categoria, total }) => (
                          <button
                            key={categoria}
                            onClick={() => navegar(`/tiendas/${tiendaSeleccionada.id}?cat=${encodeURIComponent(categoria)}`)}
                            className="w-full flex items-center gap-3 px-3 py-2 rounded-lg hover:bg-pine-tint transition text-left group border border-transparent hover:border-pine/20"
                          >
                            <span className="text-xs font-semibold text-ink group-hover:text-pine-deep flex-1">{categoria}</span>
                            <span className="font-price text-[9px] text-ink-faint bg-surface-2 group-hover:bg-white px-1.5 py-0.5 rounded-full">
                              {total}
                            </span>
                            <ChevronRight size={14} className="text-ink-faint group-hover:text-pine" />
                          </button>
                        ))}
                      </div>
                    ) : (
                      <div className="text-center py-8 text-ink-faint text-xs">
                        Sin categorías en esta tienda
                      </div>
                    )}
                  </div>
                </>
              )}
            </div>
          )}

          {/* PESTANA CUENTA */}
          {tab === 'cuenta' && (
            <div className="py-2">
              {/* Tarjeta de perfil */}
              <div className="mx-4 my-3 p-3 bg-surface-2 rounded-lg border border-line">
                <div className="flex items-center gap-3">
                  {user
                    ? avatar
                      ? <img src={avatar} className="w-10 h-10 rounded-full" alt="" />
                      : <div className="w-10 h-10 bg-pine rounded-full flex items-center justify-center text-white font-bold">{nombre?.[0]?.toUpperCase()}</div>
                    : <div className="w-10 h-10 bg-pine-tint rounded-full flex items-center justify-center"><User size={18} className="text-pine-deep" /></div>
                  }
                  <div className="flex-1 min-w-0">
                    <div className="text-sm font-semibold text-ink truncate">{nombre ?? 'Cliente'}</div>
                    <div className="text-xs text-ink-faint truncate">
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
                      className="text-[10px] bg-pine hover:bg-pine-deep text-white font-semibold px-2.5 py-1 rounded-lg shrink-0 transition">
                      Entrar
                    </button>
                  )}
                </div>
              </div>

              <ItemMenu icon={<Package size={18} />} label="Mis pedidos"      sub="Historial y recompra"     onClick={() => navegar('/pedidos')} />
              <ItemMenu icon={<ClipboardList size={18} />}   label="Lista de compras"     sub="Planificador de súper"          onClick={() => navegar('/favoritos')} />
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
                icon={<MessageCircle size={18} />}
                label="WhatsApp"
                sub="Escríbenos directamente"
                onClick={() => { window.open('https://wa.me/593984341953', '_blank'); onClose() }}
              />
              {(user || !!getPerfil()?.nombre) && (
                <>
                  <Divider />
                  <button
                    onClick={() => { logout(); onClose() }}
                    className="w-full flex items-center gap-3 px-4 py-3 hover:bg-surface-2 transition text-left text-sm font-medium text-sale">
                    <span className="w-5 flex-shrink-0 text-sale/80">
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
        </div>

        {/* Footer */}
        <div className="border-t border-line px-4 py-3">
          <p className="font-price text-[10px] text-ink-faint text-center">La Crayola · V 1.0 · Librería & Papelería</p>
        </div>
      </aside>
    </>
  )
}

function ItemMenu({ icon, label, sub, onClick, badge }: {
  icon: React.ReactNode; label: string; sub?: string; onClick: () => void; badge?: string
}) {
  return (
    <button onClick={onClick} className="w-full flex items-center gap-3 px-4 py-3 hover:bg-surface-2 transition text-left">
      <span className="text-ink-soft w-5 flex-shrink-0">{icon}</span>
      <div className="flex-1 min-w-0">
        <div className="text-sm font-medium text-ink">{label}</div>
        {sub && <div className="text-xs text-ink-faint truncate">{sub}</div>}
      </div>
      {badge
        ? <span className="font-price text-[9px] font-semibold uppercase tracking-wide bg-surface-2 text-wheat px-2 py-0.5 rounded-full">{badge}</span>
        : <ChevronRight size={14} className="text-ink-faint flex-shrink-0" />
      }
    </button>
  )
}

function Divider() {
  return <div className="mx-4 my-1 border-t border-line" />
}

'use client'
import { useEffect, useState, useRef, Suspense } from 'react'
import Link from 'next/link'
import { useRouter, useSearchParams } from 'next/navigation'
import { supabase } from '@/lib/supabase'
import { ChevronRight, ShoppingCart, ChevronLeft, Minus, Plus, ClipboardList, Filter, X } from 'lucide-react'
import { agregarItem, getCarrito, cambiarCantidad } from '@/lib/carrito'
import { toggleFavorito, esFavorito } from '@/lib/favoritos'
import { Producto } from '@/lib/types'
import QuickIcons from '@/components/QuickIcons'
import { MAIN_CATEGORY_TABS } from '@/components/HeaderCategoryTabs'
import { useAuth } from '@/context/AuthContext'
import { getPerfil } from '@/lib/perfil'
import QuickViewDrawer from '@/components/QuickViewDrawer'

function fmt(n: number) { return '$' + n.toFixed(2) }

const USE_QUICK_VIEW = true;

const CAT_CONFIG: Record<string, { emoji: string; color: string; bg: string }> = {
  'Escolar':      { emoji: '📚', color: 'text-blue-700',   bg: 'bg-blue-50 border-blue-100' },
  'Arte':         { emoji: '🎨', color: 'text-purple-700', bg: 'bg-purple-50 border-purple-100' },
  'Oficina':      { emoji: '🖊️', color: 'text-gray-700',   bg: 'bg-gray-50 border-gray-200' },
  'Tecnologia':   { emoji: '💻', color: 'text-indigo-700', bg: 'bg-indigo-50 border-indigo-100' },
  'Juguetes':     { emoji: '🧸', color: 'text-orange-700', bg: 'bg-orange-50 border-orange-100' },
  'Manualidades': { emoji: '✂️', color: 'text-pink-700',   bg: 'bg-pink-50 border-pink-100' },
  'Libros':       { emoji: '📖', color: 'text-amber-700',  bg: 'bg-amber-50 border-amber-100' },
  'Pintura':      { emoji: '🖌️', color: 'text-red-700',    bg: 'bg-red-50 border-red-100' },
  'Abarrotes':    { emoji: '🥬', color: 'text-green-700',  bg: 'bg-green-50 border-green-100' },
  'Bebidas y Licores': { emoji: '🥤', color: 'text-sky-700', bg: 'bg-sky-50 border-sky-100' },
  'Congelados y Refrigerados': { emoji: '❄️', color: 'text-cyan-700', bg: 'bg-cyan-50 border-cyan-100' },
  'Golosinas y Snacks': { emoji: '🍪', color: 'text-amber-700', bg: 'bg-amber-50 border-amber-100' },
  'Panadería':    { emoji: '🍞', color: 'text-yellow-700', bg: 'bg-yellow-50 border-yellow-100' },
  'Cuidado Personal': { emoji: '🧴', color: 'text-teal-700', bg: 'bg-teal-50 border-teal-100' },
  'Hogar y Limpieza': { emoji: '🧹', color: 'text-emerald-700', bg: 'bg-emerald-50 border-emerald-100' },
  'Mascotas':     { emoji: '🐶', color: 'text-orange-700', bg: 'bg-orange-50 border-orange-100' },
  'Huevos Lácteos y Leches': { emoji: '🥛', color: 'text-blue-700', bg: 'bg-blue-50 border-blue-100' },
}

const BANNERS = [
  {
    titulo: '🔥 Ofertas de la semana',
    sub: 'Productos seleccionados a precios especiales. ¡Solo por tiempo limitado!',
    emoji: '💰',
    cta: 'Ver ofertas',
    href: '#sec-ofertas',
    bg: 'from-red-600 via-orange-500 to-amber-500',
    badge: '🔥 Ofertas',
  },
  {
    titulo: 'Todo en un solo pedido 🛍️',
    sub: 'Útiles escolares + abarrotes + farmacia. Un solo envío consolidado.',
    emoji: '📦',
    cta: 'Ver tiendas',
    href: '/tiendas',
    bg: 'from-green-700 via-green-600 to-emerald-500',
    badge: '🚀 Multi-tienda',
  },
  {
    titulo: 'Entrega a domicilio 🏡',
    sub: 'Haz tu pedido online, lo confirmamos por WhatsApp y te lo llevamos.',
    emoji: '🚚',
    cta: 'Pedir ahora',
    href: 'https://wa.me/593984341953?text=Hola%2C%20quiero%20hacer%20un%20pedido',
    bg: 'from-purple-700 via-purple-600 to-indigo-600',
    badge: '📍 Los Bancos',
  },
  {
    titulo: '⭐ Exclusivos La Crayola',
    sub: 'Productos que solo encuentras aquí: útiles, tecnología y más.',
    emoji: '🎒',
    cta: 'Ver exclusivos',
    href: '#sec-exclusivos',
    bg: 'from-amber-600 via-yellow-500 to-orange-500',
    badge: '⭐ Solo aquí',
  },
]

// ── Carrusel de banners ────────────────────────────────────────────
function BannerCarrusel() {
  const [idx, setIdx] = useState(0)
  const timer = useRef<ReturnType<typeof setInterval> | null>(null)
  const touchStartX = useRef(0)

  function resetTimer() {
    if (timer.current) clearInterval(timer.current)
    timer.current = setInterval(() => setIdx(i => (i + 1) % BANNERS.length), 4500)
  }

  useEffect(() => {
    resetTimer()
    return () => { if (timer.current) clearInterval(timer.current) }
  // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [])

  function ir(n: number) { setIdx((idx + n + BANNERS.length) % BANNERS.length); resetTimer() }

  const b = BANNERS[idx]

  return (
    <div
      className={`relative bg-gradient-to-br ${b.bg} text-white overflow-hidden transition-all duration-500 rounded-2xl`}
      onTouchStart={e => { touchStartX.current = e.touches[0].clientX }}
      onTouchEnd={e => {
        const dx = e.changedTouches[0].clientX - touchStartX.current
        if (Math.abs(dx) > 40) { ir(dx < 0 ? 1 : -1) }
      }}
    >
      {/* Móvil */}
      <div className="block md:hidden">
        <Link href={b.href} className="block">
          <div className="flex items-center justify-between px-4 h-[100px] relative">
            <div className="pr-3 z-10 flex flex-col justify-center flex-1 min-w-0">
              <span className="inline-block bg-white/20 text-white text-[8px] font-bold px-2 py-0.5 rounded-full mb-1 w-max">
                {b.badge}
              </span>
              <h2 className="text-[13px] font-extrabold leading-snug">{b.titulo}</h2>
              <span className="text-[9px] text-white/80 font-semibold mt-1 flex items-center gap-0.5">
                {b.cta} <ChevronRight size={9} />
              </span>
            </div>
            <div className="text-5xl leading-none select-none shrink-0 z-10">{b.emoji}</div>
          </div>
        </Link>
      </div>

      {/* Desktop */}
      <div className="hidden md:block">
        <div className="max-w-5xl mx-auto px-4 py-8 flex flex-row items-center gap-6">
          <div className="flex-1">
            <div className="inline-block bg-white/20 text-white text-xs font-bold px-3 py-1 rounded-full mb-3">
              {b.badge}
            </div>
            <h1 className="text-2xl md:text-3xl font-extrabold leading-tight mb-2">{b.titulo}</h1>
            <p className="text-white/80 text-sm mb-4 max-w-md">{b.sub}</p>
            <Link href={b.href}
              className="bg-white text-gray-800 font-bold px-5 py-2.5 rounded-xl hover:bg-gray-50 transition text-xs text-center inline-block">
              {b.cta}
            </Link>
          </div>
          <div className="text-[80px] leading-none select-none">{b.emoji}</div>
        </div>
      </div>

      {/* Controles desktop */}
      <button onClick={() => ir(-1)}
        className="absolute left-2 top-1/2 -translate-y-1/2 w-7 h-7 bg-white/20 hover:bg-white/40 rounded-full hidden md:flex items-center justify-center transition">
        <ChevronLeft size={16} className="text-white" />
      </button>
      <button onClick={() => ir(+1)}
        className="absolute right-2 top-1/2 -translate-y-1/2 w-7 h-7 bg-white/20 hover:bg-white/40 rounded-full hidden md:flex items-center justify-center transition">
        <ChevronRight size={16} className="text-white" />
      </button>

      {/* Dots */}
      <div className="absolute bottom-1.5 left-1/2 -translate-x-1/2 flex gap-1">
        {BANNERS.map((_, i) => (
          <button key={i} onClick={() => { setIdx(i); resetTimer() }}
            className={`rounded-full transition-all ${i === idx ? 'w-4 h-1.5 bg-white' : 'w-1.5 h-1.5 bg-white/40'}`} />
        ))}
      </div>
    </div>
  )
}

// ── Skeleton card ──────────────────────────────────────────────────
function SkeletonCard() {
  return (
    <div className="bg-white rounded-2xl border border-gray-100 p-3 animate-pulse w-full shrink-0 md:w-auto md:shrink">
      <div className="bg-gray-100 h-28 rounded-xl mb-2" />
      <div className="h-2.5 bg-gray-100 rounded w-1/3 mb-1.5" />
      <div className="h-3 bg-gray-100 rounded mb-1" />
      <div className="h-5 bg-gray-100 rounded w-1/4 mt-1.5 mb-2" />
      <div className="h-7 bg-gray-100 rounded-lg" />
    </div>
  )
}

// ── Tarjeta de producto ──────────────────────────────────────────
function ProdCard({ p, onSelect, showOffer }: { p: Producto; onSelect?: (p: Producto) => void; showOffer?: boolean }) {
  const router = useRouter()
  const [fav, setFav] = useState(() => esFavorito(p.codigo))
  const [ok, setOk]   = useState(false)
  const [imageError, setImageError] = useState(false)
  const [cantidad, setCantidad] = useState(() => {
    return getCarrito().find(i => i.codigo === p.codigo)?.cantidad ?? 0
  })

  useEffect(() => {
    const sync = () => {
      setCantidad(getCarrito().find(i => i.codigo === p.codigo)?.cantidad ?? 0)
    }
    window.addEventListener('carrito-update', sync)
    return () => window.removeEventListener('carrito-update', sync)
  }, [p.codigo])

  function addCart(e: React.MouseEvent) {
    e.stopPropagation()
    e.preventDefault()
    if (typeof navigator !== 'undefined' && navigator.vibrate) {
      navigator.vibrate(15)
    }
    agregarItem(p)
    setOk(true)
    setTimeout(() => setOk(false), 1200)
  }

  function toggleFav(e: React.MouseEvent) {
    e.stopPropagation()
    e.preventDefault()
    setFav(toggleFavorito({ codigo: p.codigo, descripcion: p.descripcion, categoria: p.categoria, precio_publico: p.precio_publico }))
  }

  const tieneOferta = showOffer && p.en_oferta && p.precio_oferta && p.precio_oferta < p.precio_publico

  return (
    <div onClick={() => {
      if (USE_QUICK_VIEW && onSelect) {
        onSelect(p)
      } else {
        router.push(`/producto/${encodeURIComponent(p.codigo)}`)
      }
    }}
      className="bg-white rounded-2xl border border-gray-100 overflow-hidden shadow-xs hover:shadow-md hover:-translate-y-0.5 transition-all flex flex-col cursor-pointer group w-full">
      <div className="relative bg-gradient-to-br from-gray-50/80 to-gray-100/50 h-28 sm:h-32 flex items-center justify-center text-3xl overflow-hidden group-hover:from-green-50/60 group-hover:to-green-100/40 transition-colors w-full">
        {p.imagen_url && !imageError ? (
          <img
            src={p.imagen_url}
            alt={p.descripcion}
            onError={() => setImageError(true)}
            className="w-full h-full object-contain p-2"
            loading="lazy"
          />
        ) : (
          CAT_CONFIG[p.categoria]?.emoji || '📦'
        )}
        <button onClick={toggleFav}
          className={`absolute top-1.5 right-1.5 w-6 h-6 rounded-full flex items-center justify-center shadow-xs z-10 transition
            ${fav ? 'bg-green-600 text-white' : 'bg-white/90 text-gray-400 hover:text-green-600'}`}
          title={fav ? "Quitar de la lista" : "Añadir a la lista de compras"}
        >
          <ClipboardList size={11} />
        </button>
        {tieneOferta && (
          <span className="absolute top-1.5 left-1.5 text-[8px] font-black bg-red-500 text-white px-1.5 py-0.5 rounded-md z-10 shadow-xs">
            🔥 OFERTA
          </span>
        )}
        {!tieneOferta && p.stock > 0 && p.stock < 5 && (
          <span className="absolute top-1.5 left-1.5 text-[8px] font-bold bg-orange-500 text-white px-1.5 py-0.5 rounded-md z-10">
            ⚡ Pocas
          </span>
        )}
      </div>
      <div className="p-2.5 flex-1 flex flex-col justify-between">
        <div className="flex-1">
          <div className="text-[11px] font-extrabold text-gray-800 leading-snug line-clamp-2 min-h-[28px] mb-0.5">{p.descripcion}</div>
          {p.marca && (
            <div className="text-[9.5px] text-gray-400 font-bold truncate">{p.marca}</div>
          )}
        </div>
        <div className="mt-2 flex items-center justify-between gap-1">
          <div className="shrink-0">
            {tieneOferta ? (
              <div className="flex flex-col">
                <span className="text-[9.5px] text-gray-400 line-through">{fmt(p.precio_publico)}</span>
                <span className="text-sm font-black text-red-600">{fmt(p.precio_oferta!)}</span>
              </div>
            ) : (
              <div className="text-sm font-black text-gray-900">{fmt(p.precio_publico)}</div>
            )}
          </div>
          <div className="scale-90 origin-right shrink-0">
            {cantidad === 0 ? (
              <button onClick={addCart}
                className={`py-1 px-2 rounded-lg text-[11px] font-bold flex items-center justify-center gap-1 active:scale-[0.96] transition-transform duration-75 cursor-pointer
                  ${ok ? 'bg-green-600 text-white shadow-xs' : 'bg-green-50 text-green-700 border border-green-200 hover:bg-green-600 hover:text-white hover:border-green-600 shadow-2xs'}`}>
                <ShoppingCart size={11} />
                {ok ? '✓' : 'Agregar'}
              </button>
            ) : (
              <div className="flex items-center justify-between bg-green-600 rounded-lg overflow-hidden h-[26px] w-[68px] shadow-2xs">
                <button 
                  onClick={(e) => { e.stopPropagation(); e.preventDefault(); if (typeof navigator !== 'undefined' && navigator.vibrate) navigator.vibrate(10); cambiarCantidad(p.codigo, cantidad - 1); }}
                  className="px-1.5 h-full text-white hover:bg-green-700 transition font-bold active:scale-[0.96] transition-transform duration-75 flex items-center justify-center cursor-pointer"
                >
                  <Minus size={9} />
                </button>
                <span className="text-white text-[11px] font-black select-none">{cantidad}</span>
                <button 
                  onClick={(e) => { e.stopPropagation(); e.preventDefault(); if (typeof navigator !== 'undefined' && navigator.vibrate) navigator.vibrate(10); cambiarCantidad(p.codigo, cantidad + 1); }}
                  className="px-1.5 h-full text-white hover:bg-green-700 transition font-bold active:scale-[0.96] transition-transform duration-75 flex items-center justify-center cursor-pointer"
                >
                  <Plus size={9} />
                </button>
              </div>
            )}
          </div>
        </div>
      </div>
    </div>
  )
}

// ── Botón agregar frecuente ──────────────────────────────────────
function BtnAgregarFrecuente({ prod }: { prod: Producto }) {
  const [cantidad, setCantidad] = useState(() => {
    return getCarrito().find(i => i.codigo === prod.codigo)?.cantidad ?? 0
  })

  useEffect(() => {
    const sync = () => {
      setCantidad(getCarrito().find(i => i.codigo === prod.codigo)?.cantidad ?? 0)
    }
    window.addEventListener('carrito-update', sync)
    return () => window.removeEventListener('carrito-update', sync)
  }, [prod.codigo])

  function add(e: React.MouseEvent) {
    e.stopPropagation()
    e.preventDefault()
    if (typeof navigator !== 'undefined' && navigator.vibrate) {
      navigator.vibrate(15)
    }
    agregarItem(prod)
  }

  if (cantidad === 0) {
    return (
      <button onClick={add}
        className="px-2 py-1 rounded-lg text-[10px] font-bold flex items-center justify-center gap-1 active:scale-[0.96] transition-transform duration-75 shrink-0 cursor-pointer bg-green-50 text-green-700 border border-green-200 hover:bg-green-600 hover:text-white hover:border-transparent">
        <ShoppingCart size={10} />
        Agregar
      </button>
    )
  }

  return (
    <div className="flex items-center bg-green-600 text-white rounded-lg overflow-hidden h-[26px] shrink-0 border border-green-700">
      <button 
        onClick={(e) => { e.stopPropagation(); e.preventDefault(); if (typeof navigator !== 'undefined' && navigator.vibrate) navigator.vibrate(10); cambiarCantidad(prod.codigo, cantidad - 1); }}
        className="px-1.5 h-full flex items-center justify-center hover:bg-green-700 active:scale-[0.96] transition-transform duration-75 cursor-pointer"
      >
        <Minus size={9} />
      </button>
      <span className="px-1 text-[10px] font-extrabold select-none min-w-[12px] text-center">{cantidad}</span>
      <button 
        onClick={(e) => { e.stopPropagation(); e.preventDefault(); if (typeof navigator !== 'undefined' && navigator.vibrate) navigator.vibrate(10); cambiarCantidad(prod.codigo, cantidad + 1); }}
        className="px-1.5 h-full flex items-center justify-center hover:bg-green-700 active:scale-[0.96] transition-transform duration-75 cursor-pointer"
      >
        <Plus size={9} />
      </button>
    </div>
  )
}

// ── Sección Grid de productos (2x2 móvil / 4 cols desktop) ──────────────────────────────
function ProductSection({
  id, titulo, subtitulo, productos, loading, onSelect, showOffer, emoji,
  verTodosHref, bgClass
}: {
  id?: string
  titulo: string
  subtitulo?: string
  productos: Producto[]
  loading: boolean
  onSelect: (p: Producto, list: Producto[]) => void
  showOffer?: boolean
  emoji?: string
  verTodosHref?: string
  bgClass?: string
}) {
  const displayProducts = productos.slice(0, 4)

  return (
    <section id={id} className={`${bgClass || ''}`}>
      <div className="flex items-center justify-between mb-2.5">
        <div>
          <h2 className="text-base font-extrabold text-gray-900 flex items-center gap-1.5">
            {emoji && <span>{emoji}</span>}
            {titulo}
          </h2>
          {subtitulo && <p className="text-[10px] text-gray-400 mt-0.5">{subtitulo}</p>}
        </div>
        {verTodosHref && (
          <Link href={verTodosHref} className="text-xs text-green-700 font-extrabold flex items-center gap-0.5 hover:underline shrink-0 bg-green-50/80 px-2.5 py-1 rounded-lg border border-green-100">
            Ver más <ChevronRight size={13} />
          </Link>
        )}
      </div>
      {loading ? (
        <div className="grid grid-cols-2 md:grid-cols-4 gap-2.5">
          {[...Array(4)].map((_, i) => <SkeletonCard key={i} />)}
        </div>
      ) : (
        <div className="grid grid-cols-2 md:grid-cols-4 gap-2.5">
          {displayProducts.map(p => (
            <ProdCard key={p.codigo} p={p} showOffer={showOffer} onSelect={(prod) => onSelect(prod, productos)} />
          ))}
        </div>
      )}
    </section>
  )
}

// ══════════════════════════════════════════════════════════════════
//  HOME
// ══════════════════════════════════════════════════════════════════
const CAT_TIENDA: Record<string, string> = {
  supermercado: '🛒', farmacia: '💊', libreria: '📚',
  abarrotes: '🥬', tecnologia: '💻', frecuentes: '🔄',
  impresion: '🖨️', recargas: '📱', otros: '🏪',
}

function HomeContent() {
  const { user } = useAuth()
  const router = useRouter()
  const searchParams = useSearchParams()
  
  // Estado local para la categoría activa
  const [activeCat, setActiveCat] = useState(() => searchParams?.get('cat') || '')
  const [activeSub, setActiveSub] = useState(() => searchParams?.get('sub') || '')

  useEffect(() => {
    setActiveCat(searchParams?.get('cat') || '')
    setActiveSub(searchParams?.get('sub') || '')
  }, [searchParams])

  // Escuchar eventos globales de pestañas de categorías
  useEffect(() => {
    const handleCatEvent = (e: Event) => {
      const customEvent = e as CustomEvent
      if (typeof customEvent.detail === 'string') {
        setActiveCat(customEvent.detail)
        setActiveSub('')
      }
    }
    window.addEventListener('category-tab-change', handleCatEvent)
    return () => window.removeEventListener('category-tab-change', handleCatEvent)
  }, [])

  function cambiarCategoria(targetCat: string) {
    setActiveCat(targetCat)
    setActiveSub('')
    const params = new URLSearchParams(searchParams ? searchParams.toString() : '')
    if (targetCat) params.set('cat', targetCat)
    else params.delete('cat')
    params.delete('sub')
    params.delete('marca')

    const targetUrl = params.toString() ? `/?${params.toString()}` : '/'
    window.dispatchEvent(new CustomEvent('category-tab-change', { detail: targetCat }))
    window.history.pushState(null, '', targetUrl)
    router.push(targetUrl)
  }

  const [selectedProduct, setSelectedProduct] = useState<Producto | null>(null)
  const [activeList, setActiveList] = useState<Producto[]>([])
  const [frecuentes, setFrecuentes] = useState<Producto[]>([])

  // Touch gesture swipe para navegar horizontalmente entre las pestañas de categorías
  const touchStartX = useRef<number | null>(null)
  const touchStartY = useRef<number | null>(null)

  function openQuickView(p: Producto, list: Producto[]) {
    setSelectedProduct(p)
    setActiveList(list)
  }

  const nextProduct = () => {
    if (!selectedProduct || activeList.length === 0) return
    const idx = activeList.findIndex(p => p.codigo === selectedProduct.codigo)
    if (idx !== -1 && idx < activeList.length - 1) {
      setSelectedProduct(activeList[idx + 1])
    }
  }

  const prevProduct = () => {
    if (!selectedProduct || activeList.length === 0) return
    const idx = activeList.findIndex(p => p.codigo === selectedProduct.codigo)
    if (idx > 0) {
      setSelectedProduct(activeList[idx - 1])
    }
  }

  const [cats,        setCats]        = useState<{ categoria: string; n: number }[]>([])
  const [ofertas,     setOfertas]     = useState<Producto[]>([])
  const [exclusivos,  setExclusivos]  = useState<Producto[]>([])
  const [destacados,  setDestacados]  = useState<Producto[]>([])
  const [novedades,   setNovedades]   = useState<Producto[]>([])
  const [tiendas,     setTiendas]     = useState<{ id: string; nombre: string; categoria: string | null; logo_url: string | null }[]>([])
  const [cargando,    setCargando]    = useState(true)
  const [cargandoOfertas, setCargandoOfertas] = useState(true)
  const [cargandoExcl, setCargandoExcl] = useState(true)
  const [cargandoProds, setCargandoProds] = useState(true)
  const [crayolaId, setCrayolaId]     = useState('')

  // Estado para la vista de categoría activa
  const [prodsCat, setProdsCat] = useState<Producto[]>([])
  const [subsCat, setSubsCat]   = useState<string[]>([])
  const [cargandoCatActive, setCargandoCatActive] = useState(false)

  // Deslizar horizontalmente con el pulgar para cambiar entre categorías de la barra
  function handleTouchStart(e: React.TouchEvent) {
    touchStartX.current = e.touches[0].clientX
    touchStartY.current = e.touches[0].clientY
  }

  function handleTouchEnd(e: React.TouchEvent) {
    if (touchStartX.current === null || touchStartY.current === null) return
    const dx = e.changedTouches[0].clientX - touchStartX.current
    const dy = e.changedTouches[0].clientY - touchStartY.current

    // Deslizamiento horizontal claro
    if (Math.abs(dx) > 45 && Math.abs(dx) > Math.abs(dy) * 1.2) {
      const currentIdx = MAIN_CATEGORY_TABS.findIndex(t => t.cat === activeCat || (!activeCat && !t.cat))
      if (currentIdx !== -1) {
        let nextIdx = currentIdx
        if (dx < 0 && currentIdx < MAIN_CATEGORY_TABS.length - 1) {
          nextIdx = currentIdx + 1 // Swipe izquierda -> siguiente pestaña
        } else if (dx > 0 && currentIdx > 0) {
          nextIdx = currentIdx - 1 // Swipe derecha -> pestaña anterior
        }

        if (nextIdx !== currentIdx) {
          cambiarCategoria(MAIN_CATEGORY_TABS[nextIdx].cat)
        }
      }
    }
    touchStartX.current = null
    touchStartY.current = null
  }

  useEffect(() => {
    // Obtener ID de La Crayola
    supabase.from('ol_tiendas')
      .select('id')
      .ilike('nombre', '%crayola%')
      .single()
      .then(({ data }) => {
        if (data) {
          setCrayolaId(data.id)

          // Exclusivos La Crayola
          supabase.from('ol_productos')
            .select('codigo,descripcion,categoria,subcategoria,marca,stock,stock_minimo,precio_publico,precio_con_iva,imagen_url,detalles,tienda_id')
            .eq('tienda_id', data.id)
            .gt('stock', 0)
            .gt('precio_publico', 0)
            .order('precio_publico', { ascending: false })
            .limit(10)
            .then(({ data: prods }) => {
              if (prods) setExclusivos(prods as Producto[])
              setCargandoExcl(false)
            })
        } else {
          setCargandoExcl(false)
        }
      })

    // Categorías
    supabase.from('ol_productos').select('categoria').gt('stock', 0)
      .then(({ data }) => {
        if (!data) return
        const map = new Map<string, number>()
        data.forEach((d: { categoria: string }) => {
          if (d.categoria) map.set(d.categoria, (map.get(d.categoria) || 0) + 1)
        })
        setCats(Array.from(map.entries()).sort((a, b) => b[1] - a[1]).slice(0, 12).map(([categoria, n]) => ({ categoria, n })))
        setCargando(false)
      })

    // Ofertas
    supabase.from('ol_productos')
      .select('codigo,descripcion,categoria,subcategoria,marca,stock,stock_minimo,precio_publico,precio_con_iva,imagen_url,detalles,en_oferta,precio_oferta')
      .eq('en_oferta', true)
      .gt('stock', 0)
      .limit(10)
      .then(({ data }) => {
        if (data && data.length > 0) {
          setOfertas(data as Producto[])
        }
        setCargandoOfertas(false)
      })

    // Destacados
    supabase.from('ol_productos')
      .select('codigo,descripcion,categoria,subcategoria,marca,stock,stock_minimo,precio_publico,precio_con_iva,imagen_url,detalles')
      .gt('stock', 0).gt('precio_publico', 5)
      .order('precio_publico', { ascending: false }).limit(8)
      .then(({ data }) => {
        if (data) setDestacados(data as Producto[])
      })

    // Novedades
    supabase.from('ol_productos')
      .select('codigo,descripcion,categoria,subcategoria,marca,stock,stock_minimo,precio_publico,precio_con_iva,imagen_url,detalles')
      .gt('stock', 0).gt('precio_publico', 0)
      .order('codigo', { ascending: false }).limit(8)
      .then(({ data }) => {
        if (data) setNovedades(data as Producto[])
        setCargandoProds(false)
      })

    // Tiendas aliadas
    supabase.from('ol_tiendas')
      .select('id,nombre,categoria,logo_url')
      .eq('activa', true)
      .order('orden')
      .then(({ data }) => {
        if (data) {
          const virtualStores = [
            { id: 'frecuentes-virtual', nombre: 'Frecuentes', categoria: 'frecuentes', logo_url: null },
            { id: 'impresion-virtual', nombre: 'Impresión', categoria: 'impresion', logo_url: null },
            { id: 'recargas-virtual', nombre: 'Recargas', categoria: 'recargas', logo_url: null }
          ]
          setTiendas([...data, ...virtualStores])
        }
      })
  }, [])

  // Cargar productos de la categoría activa cuando activeCat cambia
  useEffect(() => {
    if (!activeCat) {
      setProdsCat([])
      setSubsCat([])
      return
    }

    setCargandoCatActive(true)

    supabase.from('ol_productos')
      .select('codigo,descripcion,categoria,subcategoria,marca,stock,stock_minimo,precio_publico,precio_con_iva,imagen_url,detalles,en_oferta,precio_oferta')
      .ilike('categoria', activeCat)
      .gt('stock', 0)
      .order('precio_publico', { ascending: true })
      .limit(60)
      .then(({ data }) => {
        if (data) {
          const list = data as Producto[]
          setProdsCat(list)

          // Extraer subcategorías únicas
          const subMap = new Map<string, number>()
          list.forEach(p => {
            if (p.subcategoria) subMap.set(p.subcategoria, (subMap.get(p.subcategoria) || 0) + 1)
          })
          setSubsCat(Array.from(subMap.keys()))
        }
        setCargandoCatActive(false)
      })
  }, [activeCat])

  // Cargar productos frecuentes
  useEffect(() => {
    async function cargarFrecuentes() {
      const perfil = getPerfil()
      const telefono = perfil?.telefono || ''
      const userId = user?.id || null

      if (!userId && !telefono) return

      let query = supabase
        .from('ol_productos_frecuentes')
        .select('producto_codigo, veces_comprado')

      if (userId) {
        query = query.eq('user_id', userId)
      } else {
        query = query.eq('telefono', telefono)
      }

      const { data, error } = await query
        .order('veces_comprado', { ascending: false })
        .limit(10)

      if (data && !error && data.length > 0) {
        const codigos = data.map((item: any) => item.producto_codigo)
        const { data: prodsRaw } = await supabase
          .from('ol_productos')
          .select('codigo, descripcion, categoria, subcategoria, marca, stock, stock_minimo, precio_publico, precio_con_iva, tienda_id, imagen_url')
          .in('codigo', codigos)

        if (prodsRaw) {
          const prods = prodsRaw as Producto[]
          const list = codigos
            .map(code => prods.find(p => p.codigo === code))
            .filter((p): p is Producto => !!p && p.stock > 0)
          setFrecuentes(list)
        }
      } else {
        setFrecuentes([])
      }
    }

    cargarFrecuentes()
  }, [user])

  function selectSub(s: string) {
    setActiveSub(s)
    const params = new URLSearchParams(searchParams ? searchParams.toString() : '')
    if (s) params.set('sub', s)
    else params.delete('sub')
    const targetUrl = `/?${params.toString()}`
    window.history.pushState(null, '', targetUrl)
    router.push(targetUrl)
  }

  function limpiarCategoria() {
    cambiarCategoria('')
  }

  const prodsCatFiltrados = activeSub
    ? prodsCat.filter(p => p.subcategoria?.toLowerCase() === activeSub.toLowerCase())
    : prodsCat

  const cfgActiva = CAT_CONFIG[activeCat] || { emoji: '📦', color: 'text-gray-900', bg: 'bg-gray-50' }

  return (
    <div onTouchStart={handleTouchStart} onTouchEnd={handleTouchEnd} className="min-h-screen">
      <div className="max-w-5xl mx-auto px-3 py-4 space-y-6 md:px-4 md:py-6 md:space-y-8">

        {/* ══════════════════════════════════════════════════════════════════
            1. VISTA DE CATEGORÍA ACTIVA (Si el usuario seleccionó una pestaña)
           ══════════════════════════════════════════════════════════════════ */}
        {activeCat ? (
          <div className="space-y-4 animate-in fade-in duration-200">
            {/* Header de Categoría */}
            <div className="flex items-center justify-between bg-gradient-to-r from-green-50 to-emerald-50 border border-green-100 p-4 rounded-2xl">
              <div className="flex items-center gap-3">
                <span className="text-3xl">{cfgActiva.emoji}</span>
                <div>
                  <h1 className="text-lg font-black text-gray-900 leading-tight">{activeCat}</h1>
                  <p className="text-xs text-gray-500 font-medium">
                    {cargandoCatActive ? 'Cargando...' : `${prodsCatFiltrados.length} productos disponibles`}
                  </p>
                </div>
              </div>

              <button
                onClick={limpiarCategoria}
                className="flex items-center gap-1 text-xs font-bold text-gray-500 hover:text-green-700 bg-white border border-gray-200 px-3 py-1.5 rounded-xl shadow-xs transition"
              >
                <X size={13} />
                Inicio
              </button>
            </div>

            {/* Subcategorías (Chips de filtro) */}
            {subsCat.length > 0 && (
              <div className="flex items-center gap-2 overflow-x-auto scrollbar-hide py-1">
                <button
                  onClick={() => selectSub('')}
                  className={`shrink-0 text-xs font-extrabold px-3 py-1.5 rounded-xl transition cursor-pointer border
                    ${!activeSub
                      ? 'bg-green-600 text-white border-green-600 shadow-sm'
                      : 'bg-white text-gray-600 border-gray-200 hover:bg-gray-50'}`}
                >
                  Todos
                </button>
                {subsCat.map(s => {
                  const esSubActiva = activeSub.toLowerCase() === s.toLowerCase()
                  return (
                    <button
                      key={s}
                      onClick={() => selectSub(s)}
                      className={`shrink-0 text-xs font-extrabold px-3 py-1.5 rounded-xl transition cursor-pointer border
                        ${esSubActiva
                          ? 'bg-green-600 text-white border-green-600 shadow-sm'
                          : 'bg-white text-gray-600 border-gray-200 hover:bg-gray-50'}`}
                    >
                      {s}
                    </button>
                  )
                })}
              </div>
            )}

            {/* Grid de productos de la categoría */}
            {cargandoCatActive ? (
              <div className="grid grid-cols-2 sm:grid-cols-3 md:grid-cols-4 gap-3">
                {[...Array(8)].map((_, i) => <SkeletonCard key={i} />)}
              </div>
            ) : prodsCatFiltrados.length === 0 ? (
              <div className="bg-white rounded-2xl border border-gray-100 p-8 text-center space-y-2">
                <div className="text-4xl">🔍</div>
                <h3 className="text-sm font-bold text-gray-700">No hay productos en este pasillo</h3>
                <p className="text-xs text-gray-400">Intenta seleccionar otra subcategoría o regresa a Inicio</p>
                <button
                  onClick={limpiarCategoria}
                  className="inline-block mt-2 bg-green-600 text-white text-xs font-bold px-4 py-2 rounded-xl"
                >
                  Volver a Inicio
                </button>
              </div>
            ) : (
              <div className="grid grid-cols-2 sm:grid-cols-3 md:grid-cols-4 gap-3">
                {prodsCatFiltrados.map(p => (
                  <ProdCard
                    key={p.codigo}
                    p={p}
                    showOffer={true}
                    onSelect={(prod) => openQuickView(prod, prodsCatFiltrados)}
                  />
                ))}
              </div>
            )}
          </div>
        ) : (
          /* ══════════════════════════════════════════════════════════════════
              2. VISTA DE INICIO COMPLETA (Página Principal Marketplace)
             ══════════════════════════════════════════════════════════════════ */
          <>
            {/* ── 1. ÍCONOS RÁPIDOS ── */}
            <QuickIcons />

            {/* ── 2. BANNER CARRUSEL ── */}
            <BannerCarrusel />

            {/* ── 3. OFERTAS ── */}
            {(cargandoOfertas || ofertas.length > 0) && (
              <ProductSection
                id="sec-ofertas"
                emoji="🔥"
                titulo="Ofertas"
                subtitulo="Productos a precios especiales por tiempo limitado"
                productos={ofertas}
                loading={cargandoOfertas}
                onSelect={openQuickView}
                showOffer={true}
                verTodosHref="/productos?ofertas=true"
              />
            )}

            {/* ── 4. EXCLUSIVOS LA CRAYOLA ── */}
            {(cargandoExcl || exclusivos.length > 0) && (
              <ProductSection
                id="sec-exclusivos"
                emoji="⭐"
                titulo="Exclusivos Tienlo"
                subtitulo="Productos que solo encuentras en nuestra tienda"
                productos={exclusivos}
                loading={cargandoExcl}
                onSelect={openQuickView}
                verTodosHref={crayolaId ? `/tiendas/${crayolaId}` : '/tiendas'}
              />
            )}

            {/* ── 5. COMPRAR DE NUEVO ── */}
            {frecuentes.length > 0 && (
              <section id="sec-frecuentes" className="bg-emerald-50/40 border border-emerald-100/60 rounded-2xl p-3.5">
                <div className="flex items-center justify-between mb-2.5">
                  <div>
                    <h2 className="text-base font-extrabold text-gray-900 flex items-center gap-1.5">
                      🔄 Comprar de nuevo
                    </h2>
                    <p className="text-[10px] text-gray-400 mt-0.5">Tus productos habituales listos para reordenar</p>
                  </div>
                  <Link href="/productos?frecuentes=true" className="text-xs text-green-700 font-extrabold flex items-center gap-0.5 hover:underline shrink-0 bg-white px-2.5 py-1 rounded-lg border border-green-100 shadow-2xs">
                    Ver más <ChevronRight size={13} />
                  </Link>
                </div>
                <div className="grid grid-cols-2 md:grid-cols-4 gap-2.5">
                  {frecuentes.slice(0, 4).map(p => (
                    <ProdCard key={p.codigo} p={p} onSelect={(prod) => openQuickView(prod, frecuentes)} />
                  ))}
                </div>
              </section>
            )}

            {/* ── 6. BANNER INTERMEDIO — Tiendas aliadas ── */}
            <section className="bg-gradient-to-r from-emerald-700 via-green-600 to-teal-600 rounded-2xl p-4 md:p-6 text-white flex items-center gap-4 shadow-sm">
              <div className="text-4xl md:text-5xl shrink-0">🏪</div>
              <div className="flex-1 min-w-0">
                <h3 className="text-sm md:text-lg font-extrabold">¿Necesitas algo de Tía o Tuti?</h3>
                <p className="text-emerald-100 text-[11px] md:text-sm mt-0.5">Lo compramos por ti y te lo llevamos junto con tu pedido</p>
              </div>
              <Link href="/tiendas"
                className="bg-white text-emerald-800 font-black px-4 py-2 rounded-xl hover:bg-emerald-50 transition text-xs shrink-0 shadow-2xs">
                Ver →
              </Link>
            </section>

            {/* ── 7. TIENDAS (Compactas — logos horizontales) ── */}
            {tiendas.length > 0 && (
              <section>
                <div className="flex items-center justify-between mb-2.5">
                  <h2 className="text-base font-extrabold text-gray-900">🏪 Tiendas</h2>
                  <Link href="/tiendas" className="text-xs text-green-700 font-extrabold flex items-center gap-0.5 hover:underline bg-green-50/80 px-2.5 py-1 rounded-lg border border-green-100">
                    Todas <ChevronRight size={13} />
                  </Link>
                </div>
                <div 
                  onTouchStart={(e) => e.stopPropagation()}
                  onTouchEnd={(e) => e.stopPropagation()}
                  className="flex gap-3 overflow-x-auto pb-2 scrollbar-hide"
                >
                  {tiendas.map(t => {
                    const getHref = (id: string) => {
                      if (id === 'frecuentes-virtual') return '/productos?frecuentes=true'
                      if (id === 'impresion-virtual') return '/impresion'
                      if (id === 'recargas-virtual') return '/recargas'
                      return `/tiendas/${id}`
                    }
                    return (
                      <Link key={t.id} href={getHref(t.id)}
                        className="bg-white border border-gray-100 rounded-2xl p-3 shadow-2xs hover:shadow-md hover:-translate-y-0.5 transition-all flex flex-col items-center gap-1.5 text-center group shrink-0 w-[80px]">
                        <div className="w-11 h-11 bg-emerald-50/80 border border-emerald-100/50 rounded-xl flex items-center justify-center text-xl group-hover:scale-105 transition-transform">
                          {t.logo_url
                            ? <img src={t.logo_url} alt={t.nombre} className="w-8 h-8 object-contain" />
                            : (CAT_TIENDA[t.categoria ?? 'otros'] ?? '🏪')
                          }
                        </div>
                        <span className="text-[10px] font-bold text-gray-700 leading-tight truncate w-full">{t.nombre}</span>
                      </Link>
                    )
                  })}
                </div>
              </section>
            )}

            {/* ── 8. NOVEDADES ── */}
            <ProductSection
              id="sec-novedades"
              emoji="✨"
              titulo="Novedades"
              subtitulo="Los últimos productos en llegar"
              productos={novedades}
              loading={cargandoProds}
              onSelect={openQuickView}
              verTodosHref="/productos"
            />

            {/* ── 9. CATEGORÍAS (Compactas) ── */}
            <section>
              <div className="flex items-center justify-between mb-3">
                <h2 className="text-base font-extrabold text-gray-900">📂 Categorías</h2>
                <Link href="/productos" className="text-xs text-green-600 font-semibold flex items-center gap-0.5 hover:underline">
                  Ver todo <ChevronRight size={13} />
                </Link>
              </div>
              {cargando ? (
                <div className="grid grid-cols-4 md:grid-cols-6 gap-2">
                  {[...Array(8)].map((_, i) => <div key={i} className="h-20 bg-gray-100 rounded-xl animate-pulse" />)}
                </div>
              ) : (
                <div className="grid grid-cols-4 md:grid-cols-6 gap-2">
                  {cats.map(({ categoria, n }) => {
                    const cfg = CAT_CONFIG[categoria] || { emoji: '📦', color: 'text-gray-700', bg: 'bg-gray-50 border-gray-200' }
                    return (
                      <button
                        key={categoria}
                        onClick={() => cambiarCategoria(categoria)}
                        className={`${cfg.bg} border rounded-xl p-2.5 text-center hover:shadow-md active:scale-95 transition cursor-pointer border-none`}
                      >
                        <div className="text-2xl mb-1">{cfg.emoji}</div>
                        <div className={`text-[9px] font-bold ${cfg.color} leading-tight line-clamp-2`}>{categoria}</div>
                        <div className="text-[8px] text-gray-400 mt-0.5">{n}</div>
                      </button>
                    )
                  })}
                </div>
              )}
            </section>

            {/* ── 10. DESTACADOS ── */}
            <ProductSection
              emoji="⭐"
              titulo="Destacados"
              subtitulo="Los más valorados"
              productos={destacados}
              loading={cargandoProds}
              onSelect={openQuickView}
              verTodosHref="/productos"
            />
          </>
        )}

      </div>

      {/* WhatsApp flotante */}
      <a href="https://wa.me/593984341953?text=Hola%2C%20quiero%20hacer%20un%20pedido"
        target="_blank" rel="noopener noreferrer"
        className="fixed bottom-24 md:bottom-8 right-4 z-40 bg-[#25D366] hover:bg-[#20c05a] text-white rounded-full p-3.5 shadow-lg hover:shadow-xl transition">
        <svg viewBox="0 0 24 24" className="w-6 h-6 fill-white">
          <path d="M17.472 14.382c-.297-.149-1.758-.867-2.03-.967-.273-.099-.471-.148-.67.15-.197.297-.767.966-.94 1.164-.173.199-.347.223-.644.075-.297-.15-1.255-.463-2.39-1.475-.883-.788-1.48-1.761-1.653-2.059-.173-.297-.018-.458.13-.606.134-.133.298-.347.446-.52.149-.174.198-.298.298-.497.099-.198.05-.371-.025-.52-.075-.149-.669-1.612-.916-2.207-.242-.579-.487-.5-.669-.51-.173-.008-.371-.01-.57-.01-.198 0-.52.074-.792.372-.272.297-1.04 1.016-1.04 2.479 0 1.462 1.065 2.875 1.213 3.074.149.198 2.096 3.2 5.077 4.487.709.306 1.262.489 1.694.625.712.227 1.36.195 1.871.118.571-.085 1.758-.719 2.006-1.413.248-.694.248-1.289.173-1.413-.074-.124-.272-.198-.57-.347m-5.421 7.403h-.004a9.87 9.87 0 01-5.031-1.378l-.361-.214-3.741.982.998-3.648-.235-.374a9.86 9.86 0 01-1.51-5.26c.001-5.45 4.436-9.884 9.888-9.884 2.64 0 5.122 1.03 6.988 2.898a9.825 9.825 0 012.893 6.994c-.003 5.45-4.437 9.884-9.885 9.884m8.413-18.297A11.815 11.815 0 0012.05 0C5.495 0 .16 5.335.157 11.892c0 2.096.547 4.142 1.588 5.945L.057 24l6.305-1.654a11.882 11.882 0 005.683 1.448h.005c6.554 0 11.89-5.335 11.893-11.893a11.821 11.821 0 00-3.48-8.413z"/>
        </svg>
      </a>

      {/* QuickView Drawer */}
      {(() => {
        const idx = activeList.findIndex(p => p.codigo === selectedProduct?.codigo)
        const prevProd = idx > 0 ? activeList[idx - 1] : null
        const nextProd = (idx !== -1 && idx < activeList.length - 1) ? activeList[idx + 1] : null
        return (
          <QuickViewDrawer
            producto={selectedProduct}
            prevProducto={prevProd}
            nextProducto={nextProd}
            isOpen={selectedProduct !== null}
            onClose={() => { setSelectedProduct(null); setActiveList([]); }}
            onNext={nextProduct}
            onPrev={prevProduct}
          />
        )
      })()}
    </div>
  )
}

export default function Home() {
  return (
    <Suspense fallback={
      <div className="max-w-5xl mx-auto px-4 py-8 space-y-4">
        <div className="h-12 bg-gray-100 rounded-2xl animate-pulse" />
        <div className="h-32 bg-gray-100 rounded-2xl animate-pulse" />
      </div>
    }>
      <HomeContent />
    </Suspense>
  )
}

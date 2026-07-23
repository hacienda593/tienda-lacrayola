'use client'
import { useEffect, useState, useRef, Suspense } from 'react'
import Link from 'next/link'
import { useRouter, useSearchParams } from 'next/navigation'
import { supabase } from '@/lib/supabase'
import { ChevronRight, ShoppingCart, ChevronLeft, Minus, Plus, ClipboardList, Filter, X, Zap, Package, MapPin, Star } from 'lucide-react'
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
  'Escolar':      { emoji: '🏷️', color: 'text-emerald-700', bg: 'bg-emerald-50/80 border-emerald-200/60' },
  'Arte':         { emoji: '✨', color: 'text-emerald-700', bg: 'bg-emerald-50/80 border-emerald-200/60' },
  'Oficina':      { emoji: '💼', color: 'text-slate-700',   bg: 'bg-slate-100 border-slate-200' },
  'Tecnologia':   { emoji: '⚡', color: 'text-emerald-700', bg: 'bg-emerald-50/80 border-emerald-200/60' },
  'Juguetes':     { emoji: '🎁', color: 'text-amber-700',   bg: 'bg-amber-50/80 border-amber-200/60' },
  'Manualidades': { emoji: '✂️', color: 'text-slate-700',   bg: 'bg-slate-100 border-slate-200' },
  'Libros':       { emoji: '📚', color: 'text-slate-700',   bg: 'bg-slate-100 border-slate-200' },
  'Pintura':      { emoji: '🎨', color: 'text-rose-700',    bg: 'bg-rose-50/80 border-rose-200/60' },
  'Abarrotes':    { emoji: '🛒', color: 'text-emerald-700', bg: 'bg-emerald-50/80 border-emerald-200/60' },
  'Bebidas y Licores': { emoji: '🥤', color: 'text-slate-700', bg: 'bg-slate-100 border-slate-200' },
  'Congelados y Refrigerados': { emoji: '❄️', color: 'text-slate-700', bg: 'bg-slate-100 border-slate-200' },
  'Golosinas y Snacks': { emoji: '🍪', color: 'text-amber-700', bg: 'bg-amber-50/80 border-amber-200/60' },
  'Panadería':    { emoji: '🍞', color: 'text-amber-700', bg: 'bg-amber-50/80 border-amber-200/60' },
  'Cuidado Personal': { emoji: '🧴', color: 'text-slate-700', bg: 'bg-slate-100 border-slate-200' },
  'Hogar y Limpieza': { emoji: '🧹', color: 'text-emerald-700', bg: 'bg-emerald-50/80 border-emerald-200/60' },
  'Mascotas':     { emoji: '🐾', color: 'text-amber-700', bg: 'bg-amber-50/80 border-amber-200/60' },
  'Huevos Lácteos y Leches': { emoji: '🥛', color: 'text-slate-700', bg: 'bg-slate-100 border-slate-200' },
}

const BANNERS = [
  {
    titulo: 'Ofertas de la semana',
    sub: 'Descuentos verificados en útiles y tecnología por tiempo limitado.',
    icon: Zap,
    cta: 'Explorar ofertas',
    href: '#sec-ofertas',
    badge: 'Exclusivo',
  },
  {
    titulo: 'Todo Los Bancos, en una sola entrega',
    sub: 'Combina útiles escolares, abarrotes y farmacia en un solo pedido.',
    icon: Package,
    cta: 'Ver comercios aliados',
    href: '/tiendas',
    badge: 'Multitienda · Tienlo Express',
  },
  {
    titulo: 'Pedidos con atención directa',
    sub: 'Confirmación instantánea de stock y envíos a todo Los Bancos.',
    icon: MapPin,
    cta: 'Iniciar pedido',
    href: '/productos',
    badge: 'Los Bancos',
  },
  {
    titulo: 'Catálogo Tienlo',
    sub: 'Productos directos de tienda a precios preferenciales.',
    icon: Star,
    cta: 'Ver catálogo',
    href: '#sec-exclusivos',
    badge: 'Oficial',
  },
]
// Verde de marca casi plano, sin degradado diagonal — el "signage" del sistema
// aprobado sobre el mockup: fondo pine-deep, tipografía de sección, sin brillos.
const BANNER_BG = 'bg-pine-deep'

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
  const Icon = b.icon

  return (
    <div
      className={`relative ${BANNER_BG} text-white overflow-hidden transition-all duration-500 rounded-2xl border border-white/10 font-ui`}
      onTouchStart={e => { touchStartX.current = e.touches[0].clientX }}
      onTouchEnd={e => {
        const dx = e.changedTouches[0].clientX - touchStartX.current
        if (Math.abs(dx) > 40) { ir(dx < 0 ? 1 : -1) }
      }}
    >
      {/* Móvil */}
      <div className="block md:hidden">
        <Link href={b.href} className="block">
          <div className="flex items-center justify-between px-4.5 h-[112px] relative">
            <div className="pr-3 z-10 flex flex-col justify-center flex-1 min-w-0">
              <span className="font-price text-[9px] font-medium tracking-wide uppercase text-white/60 mb-1.5">
                {b.badge}
              </span>
              <h2 className="font-display text-[17px] font-bold leading-snug tracking-tight text-white text-balance">{b.titulo}</h2>
              <span className="text-[11px] text-white/70 font-medium mt-2 underline underline-offset-2 flex items-center gap-0.5 w-max">
                {b.cta} <ChevronRight size={11} className="stroke-[2.5]" />
              </span>
            </div>
            <Icon size={30} strokeWidth={1.5} className="text-white/70 shrink-0 z-10" />
          </div>
        </Link>
      </div>

      {/* Desktop */}
      <div className="hidden md:block">
        <div className="max-w-5xl mx-auto px-6 py-8 flex flex-row items-center gap-6">
          <div className="flex-1">
            <div className="font-price text-[11px] font-medium tracking-wide uppercase text-white/60 mb-3">
              {b.badge}
            </div>
            <h1 className="font-display text-2xl md:text-3xl font-bold leading-tight mb-2 tracking-tight text-white text-balance">{b.titulo}</h1>
            <p className="text-white/70 text-sm mb-4 max-w-md font-normal">{b.sub}</p>
            <Link href={b.href}
              className="text-white font-semibold text-sm underline underline-offset-4 hover:text-white/80 transition-colors inline-flex items-center gap-1.5">
              {b.cta} <ChevronRight size={14} className="stroke-[2.5]" />
            </Link>
          </div>
          <Icon size={64} strokeWidth={1.25} className="text-white/60 shrink-0" />
        </div>
      </div>

      {/* Controles desktop */}
      <button onClick={() => ir(-1)}
        className="absolute left-3 top-1/2 -translate-y-1/2 w-8 h-8 bg-white/10 hover:bg-white/20 rounded-full hidden md:flex items-center justify-center transition active:scale-90">
        <ChevronLeft size={18} className="text-white stroke-[2.5]" />
      </button>
      <button onClick={() => ir(+1)}
        className="absolute right-3 top-1/2 -translate-y-1/2 w-8 h-8 bg-white/10 hover:bg-white/20 rounded-full hidden md:flex items-center justify-center transition active:scale-90">
        <ChevronRight size={18} className="text-white stroke-[2.5]" />
      </button>

      {/* Dots */}
      <div className="absolute bottom-2 left-1/2 -translate-x-1/2 flex gap-1.5">
        {BANNERS.map((_, i) => (
          <button key={i} onClick={() => { setIdx(i); resetTimer() }}
            className={`rounded-full transition-all duration-300 ${i === idx ? 'w-5 h-1.5 bg-white' : 'w-1.5 h-1.5 bg-white/30 hover:bg-white/50'}`} />
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
  const descuentoPct = tieneOferta ? Math.round((1 - p.precio_oferta! / p.precio_publico) * 100) : 0

  return (
    <div onClick={() => {
      if (USE_QUICK_VIEW && onSelect) {
        onSelect(p)
      } else {
        router.push(`/producto/${encodeURIComponent(p.codigo)}`)
      }
    }}
      className="bg-white rounded-xl border border-line overflow-hidden hover:shadow-md hover:-translate-y-0.5 transition-all duration-200 flex flex-col cursor-pointer group w-full relative font-ui">
      <div className="relative bg-pine-tint h-28 sm:h-32 flex items-center justify-center text-3xl overflow-hidden w-full">
        {p.imagen_url && !imageError ? (
          <img
            src={p.imagen_url}
            alt={p.descripcion}
            onError={() => setImageError(true)}
            className="w-full h-full object-contain p-2 group-hover:scale-105 transition-transform duration-300"
            loading="lazy"
          />
        ) : (
          <span className="opacity-85 group-hover:scale-110 transition-transform duration-300">{CAT_CONFIG[p.categoria]?.emoji || '📦'}</span>
        )}
        <button onClick={toggleFav}
          className={`absolute top-1.5 right-1.5 w-6.5 h-6.5 rounded-full flex items-center justify-center z-10 transition
            ${fav ? 'bg-pine text-white' : 'bg-white/90 text-ink-faint hover:text-pine-deep hover:bg-white'}`}
          title={fav ? "Quitar de la lista" : "Añadir a la lista de compras"}
        >
          <ClipboardList size={11.5} className="stroke-[2.2]" />
        </button>
        {tieneOferta && (
          <span className="absolute top-1.5 left-1.5 font-price text-[10px] font-semibold text-sale z-10 tracking-tight">
            -{descuentoPct}%
          </span>
        )}
        {!tieneOferta && p.stock > 0 && p.stock < 5 && (
          <span className="absolute top-1.5 left-1.5 font-price text-[9.5px] font-semibold text-wheat z-10 tracking-tight">
            Quedan {p.stock}
          </span>
        )}
      </div>
      <div className="p-2.5 flex-1 flex flex-col justify-between bg-white">
        <div className="flex-1">
          {/* Micro-etiqueta de comercio origen */}
          <div className="flex items-center gap-1.5 mt-1 mb-0.5">
            <span className="font-price text-[8.5px] font-medium tracking-wide uppercase text-ink-faint truncate max-w-full">
              {p.tienda?.nombre || 'Tienlo'}
            </span>
            {p.marca && (
              <span className="text-[9.5px] text-ink-faint font-semibold truncate">· {p.marca}</span>
            )}
          </div>
        </div>
        <div className="mt-2 flex items-center justify-between gap-1">
          <div className="shrink-0">
            {tieneOferta ? (
              <div className="flex flex-col">
                <span className="font-price text-[9.5px] text-ink-faint line-through font-medium">{fmt(p.precio_publico)}</span>
                <span className="font-price text-sm font-semibold text-sale tracking-tight">{fmt(p.precio_oferta!)}</span>
              </div>
            ) : (
              <div className="font-price text-sm font-semibold text-ink tracking-tight">{fmt(p.precio_publico)}</div>
            )}
          </div>
          <div className="scale-90 origin-right shrink-0">
            {cantidad === 0 ? (
              <button onClick={addCart}
                className="py-1 px-2.5 rounded-lg text-[11px] font-semibold flex items-center justify-center gap-1 active:scale-[0.94] transition-all duration-150 cursor-pointer bg-pine hover:bg-pine-deep text-white">
                <ShoppingCart size={11} className="stroke-[2.2]" />
                {ok ? '✓' : 'Agregar'}
              </button>
            ) : (
              <div className="flex items-center justify-between bg-pine text-white rounded-lg overflow-hidden h-[26px] w-[68px]">
                <button
                  onClick={(e) => { e.stopPropagation(); e.preventDefault(); if (typeof navigator !== 'undefined' && navigator.vibrate) navigator.vibrate(10); cambiarCantidad(p.codigo, cantidad - 1); }}
                  className="px-1.5 h-full text-white hover:bg-pine-deep transition font-bold active:scale-[0.90] flex items-center justify-center cursor-pointer"
                >
                  <Minus size={9.5} className="stroke-[3]" />
                </button>
                <span className="font-price text-white text-[11px] font-semibold select-none">{cantidad}</span>
                <button
                  onClick={(e) => { e.stopPropagation(); e.preventDefault(); if (typeof navigator !== 'undefined' && navigator.vibrate) navigator.vibrate(10); cambiarCantidad(p.codigo, cantidad + 1); }}
                  className="px-1.5 h-full text-white hover:bg-pine-deep transition font-bold active:scale-[0.90] flex items-center justify-center cursor-pointer"
                >
                  <Plus size={9.5} className="stroke-[3]" />
                </button>
              </div>
            )}
          </div>
        </div>
      </div>
    </div>
  )
}

// ── Tarjeta compacta para Comprar de Nuevo (Grid 3 columnas) ──────
function FrecuenteCardCompacta({ p, onSelect }: { p: Producto; onSelect?: (p: Producto) => void }) {
  const router = useRouter()
  const [ok, setOk] = useState(false)
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

  function incCart(e: React.MouseEvent, delta: number) {
    e.stopPropagation()
    e.preventDefault()
    if (typeof navigator !== 'undefined' && navigator.vibrate) {
      navigator.vibrate(10)
    }
    cambiarCantidad(p.codigo, cantidad + delta)
  }

  const tieneOferta = p.en_oferta && p.precio_oferta && p.precio_oferta < p.precio_publico
  const precio = tieneOferta ? p.precio_oferta! : p.precio_publico

  return (
    <div onClick={() => {
      if (USE_QUICK_VIEW && onSelect) {
        onSelect(p)
      } else {
        router.push(`/producto/${encodeURIComponent(p.codigo)}`)
      }
    }}
      className="bg-white rounded-xl border border-line overflow-hidden hover:shadow-md transition-all duration-200 flex flex-col justify-between cursor-pointer group p-1.5 sm:p-2 font-ui">
      <div>
        <div className="relative bg-pine-tint rounded-lg aspect-square flex items-center justify-center text-2xl overflow-hidden mb-1.5">
          {p.imagen_url && !imageError ? (
            <img
              src={p.imagen_url}
              alt={p.descripcion}
              onError={() => setImageError(true)}
              className="w-full h-full object-contain p-1 group-hover:scale-105 transition-transform"
              loading="lazy"
            />
          ) : (
            <span className="opacity-85">{CAT_CONFIG[p.categoria]?.emoji || '📦'}</span>
          )}
          <span className="absolute top-1 left-1 font-price text-[8px] font-medium tracking-wide uppercase text-pine-deep bg-white/85 px-1.5 py-0.5 rounded-md">
            Habitual
          </span>
        </div>
        <div className="text-[10.5px] font-semibold text-ink leading-tight line-clamp-2 min-h-[26px] group-hover:text-pine-deep transition-colors">
          {p.descripcion}
        </div>
      </div>

      <div className="mt-1.5 pt-1 border-t border-line flex flex-col items-center">
        <div className="font-price text-xs font-semibold text-ink mb-1">
          {fmt(precio)}
        </div>
        {cantidad === 0 ? (
          <button onClick={addCart}
            className="w-full py-1 rounded-lg text-[10.5px] font-semibold flex items-center justify-center gap-1 transition-all duration-150 active:scale-95 cursor-pointer bg-pine hover:bg-pine-deep text-white">
            <ShoppingCart size={10.5} className="stroke-[2.2]" />
            {ok ? '✓ Listo' : 'Añadir'}
          </button>
        ) : (
          <div className="w-full flex items-center justify-between bg-pine text-white rounded-lg overflow-hidden h-[24px]">
            <button onClick={(e) => incCart(e, -1)} className="px-1.5 h-full text-white hover:bg-pine-deep transition font-bold flex items-center justify-center">
              <Minus size={9} className="stroke-[3]" />
            </button>
            <span className="font-price text-[10.5px] font-semibold text-white select-none">{cantidad}</span>
            <button onClick={(e) => incCart(e, 1)} className="px-1.5 h-full text-white hover:bg-pine-deep transition font-bold flex items-center justify-center">
              <Plus size={9} className="stroke-[3]" />
            </button>
          </div>
        )}
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
        className="px-2.5 py-1 rounded-lg text-[10px] font-extrabold flex items-center justify-center gap-1 active:scale-[0.94] transition-all shrink-0 cursor-pointer bg-emerald-600 hover:bg-emerald-700 text-white shadow-2xs">
        <ShoppingCart size={10} className="stroke-[2.2]" />
        Agregar
      </button>
    )
  }

  return (
    <div className="flex items-center bg-emerald-600 text-white rounded-lg overflow-hidden h-[26px] shrink-0 border border-emerald-700 shadow-2xs">
      <button 
        onClick={(e) => { e.stopPropagation(); e.preventDefault(); if (typeof navigator !== 'undefined' && navigator.vibrate) navigator.vibrate(10); cambiarCantidad(prod.codigo, cantidad - 1); }}
        className="px-1.5 h-full flex items-center justify-center hover:bg-emerald-700 active:scale-[0.90] transition cursor-pointer"
      >
        <Minus size={9} className="stroke-[3]" />
      </button>
      <span className="px-1 text-[10px] font-black select-none min-w-[12px] text-center">{cantidad}</span>
      <button 
        onClick={(e) => { e.stopPropagation(); e.preventDefault(); if (typeof navigator !== 'undefined' && navigator.vibrate) navigator.vibrate(10); cambiarCantidad(prod.codigo, cantidad + 1); }}
        className="px-1.5 h-full flex items-center justify-center hover:bg-emerald-700 active:scale-[0.90] transition cursor-pointer"
      >
        <Plus size={9} className="stroke-[3]" />
      </button>
    </div>
  )
}

// ── Sección Grid de productos ──────────────────────────────
function ProductSection({
  id, titulo, subtitulo, productos, loading, onSelect, showOffer, emoji,
  verTodosHref, bgClass, maxItems = 4, gridCols = 'grid-cols-2 md:grid-cols-4'
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
  maxItems?: number
  gridCols?: string
}) {
  const displayProducts = productos.slice(0, maxItems)

  return (
    <section id={id} className={`${bgClass || ''}`}>
      <div className="flex items-end justify-between mb-3 px-0.5">
        <div>
          {subtitulo && <span className="font-price text-[10px] font-medium tracking-wide uppercase text-ink-faint block mb-0.5">{subtitulo}</span>}
          <h2 className="font-display text-[19px] font-bold text-ink tracking-tight">
            {titulo}
          </h2>
        </div>
        {verTodosHref && (
          <Link href={verTodosHref} className="font-ui text-xs text-pine font-semibold flex items-center gap-0.5 hover:text-pine-deep transition shrink-0">
            Ver más <ChevronRight size={13} className="stroke-[2.5]" />
          </Link>
        )}
      </div>
      {loading ? (
        <div className={`grid ${gridCols} gap-2.5`}>
          {[...Array(maxItems)].map((_, i) => <SkeletonCard key={i} />)}
        </div>
      ) : (
        <div className={`grid ${gridCols} gap-2.5`}>
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
            .select('codigo,descripcion,categoria,subcategoria,marca,stock,stock_minimo,precio_publico,precio_con_iva,imagen_url,detalles,tienda_id,tienda:ol_tiendas(id,nombre)')
            .eq('tienda_id', data.id)
            .gt('stock', 0)
            .gt('precio_publico', 0)
            .order('precio_publico', { ascending: false })
            .limit(10)
            .then(({ data: prods }) => {
              if (prods) setExclusivos(prods as unknown as Producto[])
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
      .select('codigo,descripcion,categoria,subcategoria,marca,stock,stock_minimo,precio_publico,precio_con_iva,imagen_url,detalles,en_oferta,precio_oferta,tienda_id,tienda:ol_tiendas(id,nombre)')
      .eq('en_oferta', true)
      .gt('stock', 0)
      .limit(10)
      .then(({ data }) => {
        if (data && data.length > 0) {
          setOfertas(data as unknown as Producto[])
        }
        setCargandoOfertas(false)
      })

    // Destacados
    supabase.from('ol_productos')
      .select('codigo,descripcion,categoria,subcategoria,marca,stock,stock_minimo,precio_publico,precio_con_iva,imagen_url,detalles,tienda_id,tienda:ol_tiendas(id,nombre)')
      .gt('stock', 0).gt('precio_publico', 5)
      .order('precio_publico', { ascending: false }).limit(8)
      .then(({ data }) => {
        if (data) setDestacados(data as unknown as Producto[])
      })

    // Novedades
    supabase.from('ol_productos')
      .select('codigo,descripcion,categoria,subcategoria,marca,stock,stock_minimo,precio_publico,precio_con_iva,imagen_url,detalles,tienda_id,tienda:ol_tiendas(id,nombre)')
      .gt('stock', 0).gt('precio_publico', 0)
      .order('codigo', { ascending: false }).limit(8)
      .then(({ data }) => {
        if (data) setNovedades(data as unknown as Producto[])
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
      .select('codigo,descripcion,categoria,subcategoria,marca,stock,stock_minimo,precio_publico,precio_con_iva,imagen_url,detalles,en_oferta,precio_oferta,tienda_id,tienda:ol_tiendas(id,nombre)')
      .ilike('categoria', activeCat)
      .gt('stock', 0)
      .order('precio_publico', { ascending: true })
      .limit(60)
      .then(({ data }) => {
        if (data) {
          const list = data as unknown as Producto[]
          setProdsCat(list)
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

            {/* Subcategorías (Chips de filtro) */}
            {subsCat.length > 0 && (
              <div className="flex items-center gap-2 overflow-x-auto scrollbar-hide py-1 font-ui">
                <button
                  onClick={() => selectSub('')}
                  className={`shrink-0 text-xs font-semibold px-3 py-1.5 rounded-lg transition cursor-pointer border
                    ${!activeSub
                      ? 'bg-pine text-white border-pine'
                      : 'bg-white text-ink-soft border-line hover:bg-surface-2'}`}
                >
                  Todos
                </button>
                {subsCat.map(s => {
                  const esSubActiva = activeSub.toLowerCase() === s.toLowerCase()
                  return (
                    <button
                      key={s}
                      onClick={() => selectSub(s)}
                      className={`shrink-0 text-xs font-semibold px-3 py-1.5 rounded-lg transition cursor-pointer border
                        ${esSubActiva
                          ? 'bg-pine text-white border-pine'
                          : 'bg-white text-ink-soft border-line hover:bg-surface-2'}`}
                    >
                      {s}
                    </button>
                  )
                })}
              </div>
            )}

            {/* Grid de productos de la categoría (3 Columnas Móvil / 6 Desktop) */}
            {cargandoCatActive ? (
              <div className="grid grid-cols-3 sm:grid-cols-4 md:grid-cols-6 gap-2 sm:gap-2.5">
                {[...Array(9)].map((_, i) => <SkeletonCard key={i} />)}
              </div>
            ) : prodsCatFiltrados.length === 0 ? (
              <div className="bg-white rounded-2xl border border-line p-8 text-center space-y-2 font-ui">
                <h3 className="font-display text-base font-bold text-ink">No hay productos en este pasillo</h3>
                <p className="text-xs text-ink-faint">Intenta seleccionar otra subcategoría o regresa a Inicio</p>
                <button
                  onClick={limpiarCategoria}
                  className="inline-block mt-2 bg-pine hover:bg-pine-deep text-white text-xs font-semibold px-4 py-2 rounded-xl transition"
                >
                  Volver a Inicio
                </button>
              </div>
            ) : (
              <div className="grid grid-cols-3 sm:grid-cols-4 md:grid-cols-6 gap-2 sm:gap-2.5">
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
                emoji="⚡"
                titulo="Ofertas Relámpago"
                subtitulo="Descuentos especiales verificados por tiempo limitado"
                productos={ofertas}
                loading={cargandoOfertas}
                onSelect={openQuickView}
                showOffer={true}
                verTodosHref="/productos?ofertas=true"
              />
            )}

            {/* ── 4. PRODUCTOS NUEVOS ── */}
            {(cargandoProds || novedades.length > 0) && (
              <ProductSection
                id="sec-novedades"
                emoji="✨"
                titulo="Productos Nuevos"
                subtitulo="Últimos ingresos al catálogo con fotos verificadas"
                productos={novedades}
                loading={cargandoProds}
                onSelect={openQuickView}
                verTodosHref="/productos"
              />
            )}

            {/* ── 5. COMPRAR DE NUEVO (Grid de 3 Columnas) ── */}
            {frecuentes.length > 0 && (
              <section id="sec-frecuentes" className="bg-surface-2 border border-line rounded-2xl p-4">
                <div className="flex items-end justify-between mb-3">
                  <div>
                    <span className="font-price text-[10px] font-medium tracking-wide uppercase text-ink-faint block mb-0.5">Listo para reordenar en 1 toque</span>
                    <h2 className="font-display text-[19px] font-bold text-ink tracking-tight">
                      Recompra frecuente
                    </h2>
                  </div>
                  <Link href="/productos?frecuentes=true" className="font-ui text-xs text-pine font-semibold flex items-center gap-0.5 hover:text-pine-deep shrink-0">
                    Ver todos <ChevronRight size={13} />
                  </Link>
                </div>
                <div className="grid grid-cols-3 md:grid-cols-6 gap-2 sm:gap-2.5">
                  {frecuentes.slice(0, 6).map(p => (
                    <FrecuenteCardCompacta key={p.codigo} p={p} onSelect={(prod) => openQuickView(prod, frecuentes)} />
                  ))}
                </div>
              </section>
            )}

            {/* ── 6. BANNER INTERMEDIO — Tiendas aliadas ── */}
            <section className={`${BANNER_BG} rounded-2xl p-5 md:p-6 text-white flex items-center gap-4 border border-white/10 font-ui`}>
              <Package size={26} strokeWidth={1.5} className="text-white/70 shrink-0" />
              <div className="flex-1 min-w-0">
                <span className="font-price text-[10px] font-medium tracking-wide uppercase text-white/60">
                  Multicompras
                </span>
                <h3 className="font-display text-base md:text-lg font-bold text-white tracking-tight mt-0.5">¿Necesitas algo de Tía o Tuti?</h3>
                <p className="text-white/70 text-[11px] md:text-xs mt-0.5 font-normal">Lo compramos por ti y te lo entregamos en un solo paquete consolidado.</p>
              </div>
              <Link href="/tiendas"
                className="text-white font-semibold text-xs underline underline-offset-4 hover:text-white/80 transition-colors shrink-0 whitespace-nowrap">
                Ver comercios →
              </Link>
            </section>

            {/* ── 7. TIENDAS (Compactas — logos horizontales) ── */}
            {tiendas.length > 0 && (
              <section>
                <div className="flex items-end justify-between mb-3">
                  <h2 className="font-display text-[19px] font-bold text-ink tracking-tight">
                    Comercios aliados
                  </h2>
                  <Link href="/tiendas" className="font-ui text-xs text-pine font-semibold flex items-center gap-0.5 hover:text-pine-deep">
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
                        className="bg-white border border-line rounded-xl p-3 hover:shadow-md hover:border-pine/40 transition-all flex flex-col items-center gap-1.5 text-center group shrink-0 w-[80px] font-ui">
                        <div className="w-11 h-11 bg-surface-2 border border-line rounded-lg flex items-center justify-center text-xl group-hover:scale-105 transition-transform">
                          {t.logo_url
                            ? <img src={t.logo_url} alt={t.nombre} className="w-8 h-8 object-contain" />
                            : (CAT_TIENDA[t.categoria ?? 'otros'] ?? '🏪')
                          }
                        </div>
                        <span className="text-[10px] font-semibold text-ink leading-tight truncate w-full tracking-tight">{t.nombre}</span>
                      </Link>
                    )
                  })}
                </div>
              </section>
            )}

            {/* ── 8. EXCLUSIVOS LA CRAYOLA (Pendiente cargar fotos) ── */}
            {(cargandoExcl || exclusivos.length > 0) && (
              <ProductSection
                id="sec-exclusivos"
                emoji="⭐"
                titulo="Exclusivos Tienlo"
                subtitulo="Catálogo oficial directo de tienda"
                productos={exclusivos}
                loading={cargandoExcl}
                onSelect={openQuickView}
                verTodosHref={crayolaId ? `/tiendas/${crayolaId}` : '/tiendas'}
              />
            )}

            {/* ── 9. CATEGORÍAS (Compactas) ──
                 Nota: los íconos de categoría siguen usando el motor de emoji existente
                 (CAT_CONFIG) — reemplazarlo por un sistema de íconos propio es un trabajo
                 aparte (toca decenas de componentes), señalado pero no incluido en esta pasada. */}
            <section>
              <div className="flex items-end justify-between mb-3">
                <h2 className="font-display text-[19px] font-bold text-ink tracking-tight">Categorías</h2>
                <Link href="/productos" className="font-ui text-xs text-pine font-semibold flex items-center gap-0.5 hover:text-pine-deep">
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

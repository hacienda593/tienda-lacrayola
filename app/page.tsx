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
    titulo: 'OFERTAS RELÁMPAGO',
    sub: 'Descuentos exclusivos en útiles y tecnología por tiempo limitado.',
    emoji: '⚡',
    cta: 'Explorar Ofertas',
    href: '#sec-ofertas',
    bg: 'from-slate-900 via-rose-950 to-slate-950',
    badge: '🔥 EXCLUSIVO',
  },
  {
    titulo: 'ENVÍO MULTI-TIENDA CONSOLIDADO',
    sub: 'Junta útiles escolares + abarrotes + farmacia en una sola entrega.',
    emoji: '📦',
    cta: 'Ver Comercios',
    href: '/tiendas',
    bg: 'from-slate-900 via-emerald-950 to-slate-900',
    badge: '🚀 TIENLO EXPRESS',
  },
  {
    titulo: 'PEDIDOS Y ATENCIÓN DIRECTA',
    sub: 'Confirmación instantánea de stock y envíos a todo Los Bancos.',
    emoji: '📍',
    cta: 'Iniciar Pedido',
    href: '/productos',
    bg: 'from-slate-900 via-indigo-950 to-slate-900',
    badge: '📍 LOS BANCOS',
  },
  {
    titulo: 'PRODUCTOS EXCLUSIVOS',
    sub: 'Catálogo oficial directo de La Crayola a precios preferenciales.',
    emoji: '⭐',
    cta: 'Ver Catálogo',
    href: '#sec-exclusivos',
    bg: 'from-slate-950 via-emerald-900 to-slate-900',
    badge: '⭐ OFICIAL',
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
      className={`relative bg-gradient-to-br ${b.bg} text-white overflow-hidden transition-all duration-500 rounded-3xl shadow-md shadow-gray-200/60 border border-white/10`}
      onTouchStart={e => { touchStartX.current = e.touches[0].clientX }}
      onTouchEnd={e => {
        const dx = e.changedTouches[0].clientX - touchStartX.current
        if (Math.abs(dx) > 40) { ir(dx < 0 ? 1 : -1) }
      }}
    >
      {/* Móvil */}
      <div className="block md:hidden">
        <Link href={b.href} className="block">
          <div className="flex items-center justify-between px-4.5 h-[105px] relative">
            <div className="pr-3 z-10 flex flex-col justify-center flex-1 min-w-0">
              <span className="inline-block bg-white/20 backdrop-blur-md border border-white/30 text-white text-[8px] font-black uppercase tracking-wider px-2 py-0.5 rounded-full mb-1 w-max shadow-2xs">
                {b.badge}
              </span>
              <h2 className="text-[13.5px] font-black leading-snug tracking-tight text-white drop-shadow-xs">{b.titulo}</h2>
              <span className="text-[9.5px] text-white/90 font-extrabold mt-1.5 flex items-center gap-0.5 bg-white/15 backdrop-blur-xs px-2 py-0.5 rounded-md w-max border border-white/20">
                {b.cta} <ChevronRight size={10} className="stroke-[3]" />
              </span>
            </div>
            <div className="text-5xl leading-none select-none shrink-0 z-10 drop-shadow-sm transition-transform duration-300 hover:scale-110">{b.emoji}</div>
          </div>
        </Link>
      </div>

      {/* Desktop */}
      <div className="hidden md:block">
        <div className="max-w-5xl mx-auto px-6 py-8 flex flex-row items-center gap-6">
          <div className="flex-1">
            <div className="inline-block bg-white/20 backdrop-blur-md border border-white/30 text-white text-xs font-black uppercase tracking-wider px-3.5 py-1 rounded-full mb-3 shadow-2xs">
              {b.badge}
            </div>
            <h1 className="text-2xl md:text-3xl font-black leading-tight mb-2 tracking-tight text-white drop-shadow-xs">{b.titulo}</h1>
            <p className="text-white/90 text-sm mb-4 max-w-md font-medium">{b.sub}</p>
            <Link href={b.href}
              className="bg-white text-gray-900 font-extrabold px-5 py-2.5 rounded-xl hover:bg-gray-50 hover:shadow-md active:scale-95 transition-all text-xs text-center inline-flex items-center gap-1.5 shadow-sm">
              {b.cta} <ChevronRight size={14} className="stroke-[2.5]" />
            </Link>
          </div>
          <div className="text-[84px] leading-none select-none drop-shadow-md transition-transform duration-300 hover:scale-105">{b.emoji}</div>
        </div>
      </div>

      {/* Controles desktop */}
      <button onClick={() => ir(-1)}
        className="absolute left-3 top-1/2 -translate-y-1/2 w-8 h-8 bg-white/25 hover:bg-white/40 backdrop-blur-md rounded-full hidden md:flex items-center justify-center transition active:scale-90 shadow-sm">
        <ChevronLeft size={18} className="text-white stroke-[2.5]" />
      </button>
      <button onClick={() => ir(+1)}
        className="absolute right-3 top-1/2 -translate-y-1/2 w-8 h-8 bg-white/25 hover:bg-white/40 backdrop-blur-md rounded-full hidden md:flex items-center justify-center transition active:scale-90 shadow-sm">
        <ChevronRight size={18} className="text-white stroke-[2.5]" />
      </button>

      {/* Dots */}
      <div className="absolute bottom-2 left-1/2 -translate-x-1/2 flex gap-1.5">
        {BANNERS.map((_, i) => (
          <button key={i} onClick={() => { setIdx(i); resetTimer() }}
            className={`rounded-full transition-all duration-300 ${i === idx ? 'w-5 h-1.5 bg-white shadow-xs' : 'w-1.5 h-1.5 bg-white/40 hover:bg-white/60'}`} />
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
      className="bg-white rounded-2xl border border-gray-100/90 overflow-hidden shadow-[0_2px_8px_-2px_rgba(0,0,0,0.04)] hover:shadow-[0_8px_20px_-4px_rgba(0,0,0,0.09)] hover:-translate-y-0.5 transition-all duration-200 flex flex-col cursor-pointer group w-full relative">
      <div className="relative bg-gradient-to-b from-gray-50/90 via-gray-50/40 to-white h-28 sm:h-32 flex items-center justify-center text-3xl overflow-hidden group-hover:from-emerald-50/40 transition-colors w-full">
        {p.imagen_url && !imageError ? (
          <img
            src={p.imagen_url}
            alt={p.descripcion}
            onError={() => setImageError(true)}
            className="w-full h-full object-contain p-2 group-hover:scale-105 transition-transform duration-300"
            loading="lazy"
          />
        ) : (
          <span className="group-hover:scale-110 transition-transform duration-300">{CAT_CONFIG[p.categoria]?.emoji || '📦'}</span>
        )}
        <button onClick={toggleFav}
          className={`absolute top-1.5 right-1.5 w-6.5 h-6.5 rounded-full flex items-center justify-center shadow-xs z-10 transition backdrop-blur-xs
            ${fav ? 'bg-emerald-600 text-white shadow-emerald-600/30' : 'bg-white/90 text-gray-400 hover:text-emerald-700 hover:bg-white'}`}
          title={fav ? "Quitar de la lista" : "Añadir a la lista de compras"}
        >
          <ClipboardList size={11.5} className="stroke-[2.2]" />
        </button>
        {tieneOferta && (
          <span className="absolute top-1.5 left-1.5 text-[7.5px] font-black bg-gradient-to-r from-red-600 to-rose-600 text-white px-1.5 py-0.5 rounded-md z-10 shadow-2xs uppercase tracking-wider border border-red-400/20">
            🔥 Oferta
          </span>
        )}
        {!tieneOferta && p.stock > 0 && p.stock < 5 && (
          <span className="absolute top-1.5 left-1.5 text-[7.5px] font-black bg-gradient-to-r from-amber-500 to-orange-500 text-white px-1.5 py-0.5 rounded-md z-10 shadow-2xs">
            ⚡ Pocas
          </span>
        )}
      </div>
      <div className="p-2.5 flex-1 flex flex-col justify-between bg-white">
        <div className="flex-1">
          {/* Micro-etiqueta de comercio origen */}
          <div className="flex items-center gap-1 mt-1 mb-0.5">
            <span className="text-[10px] font-black text-emerald-800 bg-emerald-50 border border-emerald-200/90 px-2 py-0.5 rounded-md shadow-2xs truncate max-w-full inline-flex items-center gap-0.5">
              📍 {p.tienda?.nombre || 'La Crayola'}
            </span>
            {p.marca && (
              <span className="text-[9.5px] text-gray-400 font-extrabold truncate">{p.marca}</span>
            )}
          </div>
        </div>
        <div className="mt-2 flex items-center justify-between gap-1">
          <div className="shrink-0">
            {tieneOferta ? (
              <div className="flex flex-col">
                <span className="text-[9.5px] text-gray-400 line-through font-semibold">{fmt(p.precio_publico)}</span>
                <span className="text-sm font-black text-rose-600 tracking-tight">{fmt(p.precio_oferta!)}</span>
              </div>
            ) : (
              <div className="text-sm font-black text-gray-900 tracking-tight">{fmt(p.precio_publico)}</div>
            )}
          </div>
          <div className="scale-90 origin-right shrink-0">
            {cantidad === 0 ? (
              <button onClick={addCart}
                className={`py-1 px-2.5 rounded-lg text-[11px] font-extrabold flex items-center justify-center gap-1 active:scale-[0.94] transition-all duration-150 cursor-pointer
                  ${ok ? 'bg-emerald-600 text-white shadow-xs' : 'bg-emerald-50/80 text-emerald-800 border border-emerald-200/80 hover:bg-emerald-600 hover:text-white hover:border-emerald-600 shadow-2xs'}`}>
                <ShoppingCart size={11} className="stroke-[2.2]" />
                {ok ? '✓' : 'Agregar'}
              </button>
            ) : (
              <div className="flex items-center justify-between bg-emerald-600 text-white rounded-lg overflow-hidden h-[26px] w-[68px] shadow-xs border border-emerald-700">
                <button 
                  onClick={(e) => { e.stopPropagation(); e.preventDefault(); if (typeof navigator !== 'undefined' && navigator.vibrate) navigator.vibrate(10); cambiarCantidad(p.codigo, cantidad - 1); }}
                  className="px-1.5 h-full text-white hover:bg-emerald-700 transition font-bold active:scale-[0.90] flex items-center justify-center cursor-pointer"
                >
                  <Minus size={9.5} className="stroke-[3]" />
                </button>
                <span className="text-white text-[11px] font-black select-none">{cantidad}</span>
                <button 
                  onClick={(e) => { e.stopPropagation(); e.preventDefault(); if (typeof navigator !== 'undefined' && navigator.vibrate) navigator.vibrate(10); cambiarCantidad(p.codigo, cantidad + 1); }}
                  className="px-1.5 h-full text-white hover:bg-emerald-700 transition font-bold active:scale-[0.90] flex items-center justify-center cursor-pointer"
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
      className="bg-white rounded-xl border border-emerald-100/90 overflow-hidden shadow-2xs hover:shadow-md transition-all duration-200 flex flex-col justify-between cursor-pointer group p-1.5 sm:p-2">
      <div>
        <div className="relative bg-gray-50/90 rounded-lg aspect-square flex items-center justify-center text-2xl overflow-hidden mb-1.5">
          {p.imagen_url && !imageError ? (
            <img
              src={p.imagen_url}
              alt={p.descripcion}
              onError={() => setImageError(true)}
              className="w-full h-full object-contain p-1 group-hover:scale-105 transition-transform"
              loading="lazy"
            />
          ) : (
            <span>{CAT_CONFIG[p.categoria]?.emoji || '📦'}</span>
          )}
          <span className="absolute top-1 left-1 bg-emerald-600 text-white text-[7.5px] font-black px-1.5 py-0.2 rounded-full shadow-2xs">
            🔁 Habitual
          </span>
        </div>
        <div className="text-[10.5px] font-bold text-gray-800 leading-tight line-clamp-2 min-h-[26px] group-hover:text-emerald-700 transition-colors">
          {p.descripcion}
        </div>
      </div>

      <div className="mt-1.5 pt-1 border-t border-gray-100 flex flex-col items-center">
        <div className="text-xs font-black text-gray-900 mb-1">
          {fmt(precio)}
        </div>
        {cantidad === 0 ? (
          <button onClick={addCart}
            className={`w-full py-1 rounded-lg text-[10.5px] font-extrabold flex items-center justify-center gap-1 transition-all duration-150 active:scale-95 cursor-pointer
              ${ok ? 'bg-emerald-600 text-white' : 'bg-emerald-600 hover:bg-emerald-700 text-white shadow-2xs'}`}>
            <ShoppingCart size={10.5} className="stroke-[2.2]" />
            {ok ? '✓ ¡Listo!' : '+ Añadir'}
          </button>
        ) : (
          <div className="w-full flex items-center justify-between bg-emerald-600 text-white rounded-lg overflow-hidden h-[24px] shadow-2xs border border-emerald-700">
            <button onClick={(e) => incCart(e, -1)} className="px-1.5 h-full text-white hover:bg-emerald-700 transition font-bold flex items-center justify-center">
              <Minus size={9} className="stroke-[3]" />
            </button>
            <span className="text-[10.5px] font-black text-white select-none">{cantidad}</span>
            <button onClick={(e) => incCart(e, 1)} className="px-1.5 h-full text-white hover:bg-emerald-700 transition font-bold flex items-center justify-center">
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
        className="px-2.5 py-1 rounded-lg text-[10px] font-extrabold flex items-center justify-center gap-1 active:scale-[0.94] transition-all shrink-0 cursor-pointer bg-emerald-50 text-emerald-800 border border-emerald-200/80 hover:bg-emerald-600 hover:text-white hover:border-transparent shadow-2xs">
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
      <div className="flex items-center justify-between mb-3 px-0.5">
        <div className="flex items-center gap-2">
          <div className="w-1 h-4 bg-emerald-600 rounded-full shrink-0" />
          <div>
            <h2 className="text-base font-black text-gray-900 tracking-tight flex items-center gap-1.5">
              {emoji && <span>{emoji}</span>}
              {titulo}
            </h2>
            {subtitulo && <p className="text-[10px] font-medium text-gray-400 mt-0.5">{subtitulo}</p>}
          </div>
        </div>
        {verTodosHref && (
          <Link href={verTodosHref} className="text-xs text-emerald-700 font-extrabold flex items-center gap-0.5 hover:bg-emerald-100/60 transition shrink-0 bg-emerald-50/90 px-3 py-1 rounded-full border border-emerald-200/60 shadow-2xs">
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

            {/* Grid de productos de la categoría (3 Columnas Móvil / 6 Desktop) */}
            {cargandoCatActive ? (
              <div className="grid grid-cols-3 sm:grid-cols-4 md:grid-cols-6 gap-2 sm:gap-2.5">
                {[...Array(9)].map((_, i) => <SkeletonCard key={i} />)}
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
              <section id="sec-frecuentes" className="bg-slate-900/5 border border-slate-200/80 rounded-2xl p-4">
                <div className="flex items-center justify-between mb-3">
                  <div>
                    <h2 className="text-base font-black text-slate-900 flex items-center gap-2 tracking-tight">
                      <span>🔄</span> Recompra Frecuente
                    </h2>
                    <p className="text-[10.5px] font-bold text-slate-500 mt-0.5">Tus productos habituales listos para reordenar en 1 toque</p>
                  </div>
                  <Link href="/productos?frecuentes=true" className="text-xs text-emerald-700 font-extrabold flex items-center gap-0.5 hover:underline shrink-0 bg-white px-3 py-1 rounded-xl border border-slate-200/80 shadow-2xs">
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
            <section className="bg-gradient-to-r from-slate-900 via-slate-800 to-emerald-950 rounded-2xl p-5 md:p-6 text-white flex items-center gap-4 shadow-sm border border-slate-800">
              <div className="w-12 h-12 rounded-2xl bg-emerald-500/20 border border-emerald-500/30 flex items-center justify-center text-emerald-400 text-2xl shrink-0">
                🏬
              </div>
              <div className="flex-1 min-w-0">
                <span className="text-[9px] font-black uppercase tracking-wider text-emerald-400 bg-emerald-500/10 px-2 py-0.5 rounded-md border border-emerald-500/20">
                  MULTICOMPRAS
                </span>
                <h3 className="text-sm md:text-lg font-black text-white tracking-tight mt-1">¿Necesitas algo de Tía o Tuti?</h3>
                <p className="text-slate-300 text-[11px] md:text-xs mt-0.5 font-medium">Lo compramos por ti y te lo entregamos en un solo paquete consolidado.</p>
              </div>
              <Link href="/tiendas"
                className="bg-emerald-600 hover:bg-emerald-500 text-white font-black px-4 py-2.5 rounded-xl transition text-xs shrink-0 shadow-sm border border-emerald-500/30">
                Ver Comercios →
              </Link>
            </section>

            {/* ── 7. TIENDAS (Compactas — logos horizontales) ── */}
            {tiendas.length > 0 && (
              <section>
                <div className="flex items-center justify-between mb-3">
                  <h2 className="text-base font-black text-slate-900 tracking-tight flex items-center gap-2">
                    <span>🏪</span> Comercios Aliados
                  </h2>
                  <Link href="/tiendas" className="text-xs text-emerald-700 font-extrabold flex items-center gap-0.5 hover:underline bg-emerald-50/80 px-3 py-1 rounded-xl border border-emerald-200/60">
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
                        className="bg-white border border-slate-200/80 rounded-2xl p-3 shadow-2xs hover:shadow-md hover:border-emerald-500/40 transition-all flex flex-col items-center gap-1.5 text-center group shrink-0 w-[80px]">
                        <div className="w-11 h-11 bg-slate-50 border border-slate-200/60 rounded-xl flex items-center justify-center text-xl group-hover:scale-105 transition-transform">
                          {t.logo_url
                            ? <img src={t.logo_url} alt={t.nombre} className="w-8 h-8 object-contain" />
                            : (CAT_TIENDA[t.categoria ?? 'otros'] ?? '🏪')
                          }
                        </div>
                        <span className="text-[10px] font-bold text-slate-800 leading-tight truncate w-full tracking-tight">{t.nombre}</span>
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

'use client'
import React, { useEffect, useState, useMemo, useRef, useCallback, Suspense } from 'react'
import { useParams, useRouter, useSearchParams } from 'next/navigation'
import { supabase } from '@/lib/supabase'
import { agregarItem, getCarrito, cambiarCantidad } from '@/lib/carrito'
import { toggleFavorito, esFavorito } from '@/lib/favoritos'
import { OlTienda, Producto, CAT_EMOJI } from '@/lib/types'
import { customSearch } from '@/lib/search'
import {
  ArrowLeft, Search, ShoppingCart, Plus, Minus,
  ClipboardList, Store, MapPin, Loader2, X, Share2, SlidersHorizontal, Info, ChevronRight,
  ChevronDown, ChevronUp
} from 'lucide-react'
import { useAuth } from '@/context/AuthContext'
import { getPerfil } from '@/lib/perfil'
import QuickViewDrawer from '@/components/QuickViewDrawer'

// --- CONFIGURACIÓN DE VISUALIZACIÓN REVERSIBLE ---
const USE_QUICK_VIEW = true; // Cambiar a 'false' para deshabilitar el Bottom Sheet/Popup y volver al comportamiento original

function fmt(n: number) { return '$' + (n || 0).toFixed(2) }

function TiendaProductCard({ p, tienda, onSelect }: { p: Producto; tienda: OlTienda; onSelect?: (p: Producto) => void }) {
  const router = useRouter()
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

  const agotado = p.stock <= 0

  function agregar(e: React.MouseEvent) {
    e.stopPropagation(); e.preventDefault()
    if (typeof window !== 'undefined') {
      window.dispatchEvent(new CustomEvent('open-sku-selector', {
        detail: {
          prod: p,
          clientX: e.clientX,
          clientY: e.clientY,
          tiendaId: tienda.id,
          tiendaNombre: tienda.nombre
        }
      }))
    }
  }

  return (
    <div
      onClick={() => {
        if (USE_QUICK_VIEW && onSelect) {
          onSelect(p)
        } else {
          router.push(`/producto/${encodeURIComponent(p.codigo)}`)
        }
      }}
      className="bg-white rounded-xl border border-gray-100 overflow-hidden shadow-sm hover:shadow-md transition-all flex flex-col cursor-pointer shrink-0 w-[145px] relative group"
    >
      <div className="relative bg-gray-50 h-40 flex items-center justify-center text-2xl overflow-hidden group-hover:bg-green-50/50 transition-colors w-full">
        <ImagenProducto src={p.imagen_url} categoria={p.categoria} alt={p.descripcion} descripcion={p.descripcion} />
        <BtnFavorito prod={p} />
        {cantidad === 0 && p.stock > 0 && (
          <button
            onClick={agregar}
            className="absolute bottom-2 right-2 w-9 h-9 rounded-full bg-green-600 hover:bg-green-700 text-white flex items-center justify-center shadow-lg hover:scale-105 active:scale-90 transition z-20 cursor-pointer border border-white/60"
            aria-label="Agregar al carrito"
          >
            <Plus size={16} className="stroke-[3]" />
          </button>
        )}
        {agotado && (
          <div className="absolute inset-0 bg-white/70 flex items-center justify-center z-10">
            <span className="text-xs font-bold text-red-500 bg-red-50 px-2 py-0.5 rounded-full border border-red-200">AGOTADO</span>
          </div>
        )}
      </div>
      <div className="p-1.5 flex-1 min-w-0 flex flex-col justify-between">
        <div>
          <div className="text-[10px] md:text-[11px] font-bold text-gray-800 leading-tight md:leading-snug line-clamp-2 min-h-[24px] md:min-h-[32px] mb-0.5">{p.descripcion}</div>
          {p.marca && (
            <div className="text-[8px] md:text-[9px] text-gray-400 font-bold truncate mb-0.5">{p.marca}</div>
          )}
        </div>
        <div className="mt-2 space-y-1.5">
          <div className="text-[11px] md:text-xs font-black text-gray-900">{fmt(p.precio_publico)}</div>
          {cantidad > 0 && (
            <div className="w-full animate-fade-in">
              <BtnAgregar prod={p} tiendaId={tienda.id} tiendaNombre={tienda.nombre} />
            </div>
          )}
        </div>
      </div>
    </div>
  )
}

function TiendaVerticalProductCard({ p, tienda, onSelect }: { p: Producto; tienda: OlTienda; onSelect?: (p: Producto) => void }) {
  const router = useRouter()
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

  const agotado = p.stock <= 0

  function agregar(e: React.MouseEvent) {
    e.stopPropagation(); e.preventDefault()
    if (typeof window !== 'undefined') {
      window.dispatchEvent(new CustomEvent('open-sku-selector', {
        detail: {
          prod: p,
          clientX: e.clientX,
          clientY: e.clientY,
          tiendaId: tienda.id,
          tiendaNombre: tienda.nombre
        }
      }))
    }
  }

  return (
    <div
      onClick={() => {
        if (USE_QUICK_VIEW && onSelect) {
          onSelect(p)
        } else {
          router.push(`/producto/${encodeURIComponent(p.codigo)}`)
        }
      }}
      className="bg-white rounded-2xl border border-gray-100 overflow-hidden shadow-sm hover:shadow-md hover:-translate-y-0.5 transition-all flex flex-col cursor-pointer group"
    >
      <div className="relative bg-gradient-to-br from-gray-50 to-gray-100 h-48 md:h-36 flex items-center justify-center text-4xl overflow-hidden group-hover:from-green-50 group-hover:to-green-100 transition-colors w-full">
        <ImagenProducto src={p.imagen_url} categoria={p.categoria} alt={p.descripcion} descripcion={p.descripcion} />
        <BtnFavorito prod={p} />
        {p.stock > 0 && p.stock < 5 && (
          <span className="absolute top-2 left-2 text-[9px] font-bold bg-orange-500 text-white px-2 py-0.5 rounded-full z-10 animate-pulse">
            ⚡ Últimas
          </span>
        )}
        {cantidad === 0 && p.stock > 0 && (
          <button
            onClick={agregar}
            className="absolute bottom-2 right-2 w-9 h-9 rounded-full bg-green-600 hover:bg-green-700 text-white flex items-center justify-center shadow-lg hover:scale-105 active:scale-90 transition z-20 cursor-pointer border border-white/60"
            aria-label="Agregar al carrito"
          >
            <Plus size={16} className="stroke-[3]" />
          </button>
        )}
        {agotado && (
          <div className="absolute inset-0 bg-white/70 flex items-center justify-center z-10">
            <span className="text-xs font-bold text-red-500 bg-red-50 px-2 py-0.5 rounded-full border border-red-200">AGOTADO</span>
          </div>
        )}
      </div>
      <div className="p-1.5 flex-1 flex flex-col justify-between">
        <div className="flex-1">
          <div className="text-[11px] md:text-xs font-bold text-gray-800 leading-tight md:leading-snug line-clamp-2 min-h-[26px] md:min-h-[32px] mb-0.5">{p.descripcion}</div>
          {p.marca && (
            <div className="text-[9px] md:text-[10px] text-gray-400 font-bold truncate mb-0.5">{p.marca}</div>
          )}
        </div>
        <div className="mt-2 space-y-1.5">
          <div className="text-sm font-black text-gray-900">{fmt(p.precio_publico)}</div>
          {cantidad > 0 && (
            <div className="w-full animate-fade-in">
              <BtnAgregar prod={p} tiendaId={tienda.id} tiendaNombre={tienda.nombre} />
            </div>
          )}
        </div>
      </div>
    </div>
  )
}



function BtnAgregar({ prod, tiendaId, tiendaNombre }: { prod: Producto; tiendaId: string; tiendaNombre: string }) {
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

  function agregar(e: React.MouseEvent) {
    e.stopPropagation(); e.preventDefault()
    if (typeof window !== 'undefined') {
      window.dispatchEvent(new CustomEvent('open-sku-selector', {
        detail: {
          prod: prod,
          clientX: e.clientX,
          clientY: e.clientY,
          tiendaId: tiendaId,
          tiendaNombre: tiendaNombre
        }
      }))
    }
  }

  function cambiar(e: React.MouseEvent, delta: number) {
    e.stopPropagation(); e.preventDefault()
    if (typeof navigator !== 'undefined' && navigator.vibrate) {
      navigator.vibrate(10)
    }
    const nueva = cantidad + delta
    cambiarCantidad(prod.codigo, nueva)
  }

  if (cantidad === 0) return (
    <button onClick={agregar}
      className="w-full py-2 rounded-lg text-xs font-bold flex items-center justify-center gap-1.5 bg-green-50 text-green-700 border border-green-200 hover:bg-green-600 hover:text-white hover:border-transparent active:scale-[0.96] transition-transform duration-75">
      <ShoppingCart size={12} /> Agregar
    </button>
  )

  return (
    <div className="flex items-center justify-between bg-green-600 rounded-lg overflow-hidden">
      <button onClick={e => cambiar(e, -1)} className="px-3 py-2 text-white hover:bg-green-700 transition font-bold active:scale-[0.96] transition-transform duration-75"><Minus size={12} /></button>
      <span className="text-white text-xs font-bold">{cantidad}</span>
      <button onClick={e => cambiar(e, +1)} className="px-3 py-2 text-white hover:bg-green-700 transition font-bold active:scale-[0.96] transition-transform duration-75"><Plus size={12} /></button>
    </div>
  )
}

function BtnFavorito({ prod }: { prod: Producto }) {
  const [fav, setFav] = useState(() => esFavorito(prod.codigo))
  useEffect(() => {
    const sync = () => setFav(esFavorito(prod.codigo))
    window.addEventListener('favoritos-update', sync)
    return () => window.removeEventListener('favoritos-update', sync)
  }, [prod.codigo])
  function toggle(e: React.MouseEvent) {
    e.stopPropagation(); e.preventDefault()
    setFav(toggleFavorito({ codigo: prod.codigo, descripcion: prod.descripcion, categoria: prod.categoria, precio_publico: prod.precio_publico }))
  }
  return (
    <button onClick={toggle}
      className={`absolute top-2 right-2 w-7 h-7 rounded-full flex items-center justify-center shadow-sm z-10 transition
        ${fav ? 'bg-green-600 text-white' : 'bg-white/90 text-gray-400 hover:text-green-600'}`}
      title={fav ? "Quitar de la lista" : "Añadir a la lista de compras"}
    >
      <ClipboardList size={13} />
    </button>
  )
}

const CAT_COLORS: Record<string, { from: string; to: string; text: string; bg: string }> = {
  'Escolar':      { from: 'from-blue-50/70',      to: 'to-blue-100/50',      text: 'text-blue-600',      bg: 'bg-blue-50' },
  'Arte':         { from: 'from-purple-50/70',    to: 'to-purple-100/50',    text: 'text-purple-600',    bg: 'bg-purple-50' },
  'Oficina':      { from: 'from-gray-50/70',      to: 'to-gray-150',         text: 'text-gray-600',      bg: 'bg-gray-100' },
  'Tecnologia':   { from: 'from-indigo-50/70',    to: 'to-indigo-100/50',    text: 'text-indigo-600',    bg: 'bg-indigo-50' },
  'Juguetes':     { from: 'from-orange-50/70',    to: 'to-orange-100/50',    text: 'text-orange-600',    bg: 'bg-orange-50' },
  'Manualidades': { from: 'from-pink-50/70',      to: 'to-pink-100/50',      text: 'text-pink-600',      bg: 'bg-pink-50' },
  'Libros':       { from: 'from-amber-50/70',     to: 'to-amber-100/50',     text: 'text-amber-600',     bg: 'bg-amber-50' },
  'Pintura':      { from: 'from-red-50/70',       to: 'to-red-100/50',       text: 'text-red-600',       bg: 'bg-red-50' },
  'Papeleria':    { from: 'from-teal-50/70',      to: 'to-teal-100/50',      text: 'text-teal-600',      bg: 'bg-teal-50' },
  'Alimentos':    { from: 'from-emerald-50/70',   to: 'to-emerald-100/50',   text: 'text-emerald-600',   bg: 'bg-emerald-50' },
  'Bebidas':      { from: 'from-cyan-50/70',      to: 'to-cyan-100/50',      text: 'text-cyan-600',      bg: 'bg-cyan-50' },
  'Limpieza':     { from: 'from-sky-50/70',       to: 'to-sky-100/50',       text: 'text-sky-600',       bg: 'bg-sky-50' },
  'Higiene':      { from: 'from-rose-50/70',      to: 'to-rose-100/50',      text: 'text-rose-600',      bg: 'bg-rose-50' },
  'Farmacia':     { from: 'from-rose-100/30',     to: 'to-red-100/30',       text: 'text-red-600',       bg: 'bg-red-50' },
  'Abarrotes':    { from: 'from-emerald-50/70',   to: 'to-green-100/50',     text: 'text-green-600',     bg: 'bg-green-50' },
  'Bebidas y Licores': { from: 'from-cyan-50/70', to: 'to-blue-100/50',      text: 'text-cyan-600',      bg: 'bg-cyan-50' },
  'Congelados y Refrigerados': { from: 'from-blue-50/70', to: 'to-cyan-100/30', text: 'text-blue-500',   bg: 'bg-blue-50' },
  'Golosinas y Snacks': { from: 'from-amber-50/70', to: 'to-yellow-100/50',  text: 'text-amber-600',     bg: 'bg-amber-50' },
  'Panadería':    { from: 'from-yellow-50/70',    to: 'to-amber-100/40',     text: 'text-yellow-700',    bg: 'bg-yellow-50' },
  'Cuidado Personal': { from: 'from-rose-50/70',  to: 'to-pink-100/40',      text: 'text-rose-600',      bg: 'bg-rose-50' },
  'Hogar y Limpieza': { from: 'from-sky-50/70',   to: 'to-indigo-100/30',    text: 'text-sky-600',       bg: 'bg-sky-50' },
  'Mascotas':     { from: 'from-amber-50/70',     to: 'to-orange-100/30',    text: 'text-amber-700',     bg: 'bg-amber-50' },
  'Huevos Lácteos y Leches': { from: 'from-yellow-50/40', to: 'to-blue-50/30', text: 'text-yellow-600', bg: 'bg-yellow-50' },
}

const DEFAULT_COLOR = { from: 'from-green-50/70', to: 'to-green-100/50', text: 'text-green-600', bg: 'bg-green-50' }

function ImagenProducto({ src, categoria, alt, descripcion }: { src?: string | null; categoria: string; alt: string; descripcion?: string }) {
  const [error, setError] = useState(false)
  const emoji = CAT_EMOJI[categoria] || '📦'
  const colors = CAT_COLORS[categoria] || DEFAULT_COLOR

  const presVal = useMemo(() => {
    if (!descripcion) return ''
    const regex = /\b(\d+(?:\.\d+)?\s*(?:ml|l|g|kg|oz|u|unidades))\b/gi;
    const matches = descripcion.match(regex);
    if (matches && matches.length > 0) {
      return matches[matches.length - 1];
    }
    return '';
  }, [descripcion])

  let content;
  if (!src || error) {
    content = (
      <div className={`w-full h-full bg-gradient-to-br ${colors.from} ${colors.to} flex flex-col items-center justify-center relative select-none overflow-hidden transition-transform duration-300`}>
        {/* Decoraciones suaves de fondo flotantes */}
        <div className="absolute w-24 h-24 rounded-full bg-white/40 blur-md -top-7 -left-7" />
        <div className="absolute w-16 h-16 rounded-full bg-white/20 blur-sm -bottom-5 -right-5" />
        
        {/* Contenedor de Emoji estilo tarjeta glassmorphic */}
        <div className="w-14 h-14 rounded-2xl bg-white/80 backdrop-blur-sm shadow-sm flex items-center justify-center text-3xl transform group-hover:rotate-6 transition-transform duration-300 relative z-10 border border-white/60">
          {emoji}
        </div>
      </div>
    )
  } else {
    content = (
      <img
        src={src}
        alt={alt}
        onError={() => setError(true)}
        className="w-full h-full object-contain p-2 hover:scale-[1.03] transition-transform duration-200"
        loading="lazy"
      />
    )
  }

  return (
    <div className="w-full h-full relative flex items-center justify-center">
      {content}
      {presVal && (
        <div className="absolute bottom-1.5 left-1.5 bg-black/75 backdrop-blur-[2px] text-white text-[9px] font-black px-1.5 py-0.5 rounded-md tracking-wider uppercase z-20 shadow-sm border border-white/10 select-none">
          {presVal}
        </div>
      )}
    </div>
  )
}

function obtenerEmojiSubcategoria(nombreSub: string, categoria: string): string {
  const sub = (nombreSub || '').toLowerCase();
  if (sub.includes('cuaderno') || sub.includes('carpeta')) return '📓';
  if (sub.includes('lapiz') || sub.includes('esfero') || sub.includes('pluma') || sub.includes('boligrafo') || sub.includes('marcador') || sub.includes('color')) return '✏️';
  if (sub.includes('mochila') || sub.includes('bolso')) return '🎒';
  if (sub.includes('regla') || sub.includes('escuadra')) return '📐';
  if (sub.includes('goma') || sub.includes('silicona') || sub.includes('pega') || sub.includes('grapadora')) return '🧪';
  if (sub.includes('pintura') || sub.includes('oleo') || sub.includes('tempera') || sub.includes('acrilico') || sub.includes('pincel') || sub.includes('acuarela')) return '🎨';
  if (sub.includes('fomix') || sub.includes('cartulina') || sub.includes('papel')) return '📄';
  if (sub.includes('cinta')) return '🎀';
  if (sub.includes('escarcha')) return '✨';
  if (sub.includes('limpiapipas')) return '🧶';
  if (sub.includes('libro') || sub.includes('novela') || sub.includes('cuento') || sub.includes('lectura')) return '📖';
  if (sub.includes('peluche') || sub.includes('juguete')) return '🧸';
  if (sub.includes('regalo') || sub.includes('fiesta')) return '🎁';
  if (sub.includes('aceite')) return '🛢️';
  if (sub.includes('arroz')) return '🍚';
  if (sub.includes('atun') || sub.includes('pescado')) return '🐟';
  if (sub.includes('fideo') || sub.includes('pasta')) return '🍝';
  if (sub.includes('grano') || sub.includes('semilla') || sub.includes('lenteja') || sub.includes('frejol')) return '🫘';
  if (sub.includes('harina')) return '🌾';
  if (sub.includes('cafe')) return '☕';
  if (sub.includes('azucar') || sub.includes('dulce') || sub.includes('caramelo') || sub.includes('chocolate')) return '🍬';
  if (sub.includes('snack') || sub.includes('papas') || sub.includes('mani') || sub.includes('galleta')) return '🍿';
  if (sub.includes('agua') || sub.includes('gaseosa') || sub.includes('cola') || sub.includes('jugo') || sub.includes('bebida')) return '🥤';
  if (sub.includes('detergente') || sub.includes('suavizante') || sub.includes('cloro') || sub.includes('jabon') || sub.includes('desinfectante')) return '🧹';
  if (sub.includes('shampoo') || sub.includes('crema') || sub.includes('desodorante') || sub.includes('dental')) return '🧴';
  if (sub.includes('leche') || sub.includes('yogurt') || sub.includes('queso') || sub.includes('mantequilla')) return '🥛';
  if (sub.includes('huevo')) return '🥚';
  if (sub.includes('pollo') || sub.includes('carne') || sub.includes('embutido') || sub.includes('jamon') || sub.includes('salchicha')) return '🥩';
  if (sub.includes('pan ') || sub.includes('panaderia') || sub.includes('torta') || sub.includes('cake')) return '🍞';
  if (sub.includes('audifono') || sub.includes('parlante') || sub.includes('cargador') || sub.includes('cable') || sub.includes('teclado')) return '💻';
  if (sub.includes('medicina') || sub.includes('pastilla') || sub.includes('salud')) return '💊';
  return '📦';
}

const SUBCAT_IMAGES: Record<string, string> = {
  'Aceites': '/images/subcats/aceites.png',
  'Granos': '/images/subcats/granos.png',
  'Fideos': '/images/subcats/fideos.png',
  'Leche': '/images/subcats/leche.png',
  'Queso': '/images/subcats/queso.png',
  'Huevos': '/images/subcats/huevos.png',
  'Pollo': '/images/subcats/pollo.png',
  'Embutidos': '/images/subcats/embutidos.png',
  'Panadería': '/images/subcats/panaderia.png',
  'Galletas': '/images/subcats/galletas.png',
  'Snacks': '/images/subcats/snacks.png',
  'Detergentes': '/images/subcats/detergentes.png',
  'Papel': '/images/subcats/papel.png',
  'Bebé': '/images/subcats/bebe.png',
  'Cuadernos': '/images/subcats/cuadernos.png',
  'Mochilas': '/images/subcats/mochilas.png',
  'Lápices': '/images/subcats/lapices.png'
}

function TiendaContent() {
  const { id }  = useParams<{ id: string }>()
  const router  = useRouter()
  const searchParams = useSearchParams()
  const [tienda,   setTienda]   = useState<OlTienda | null>(null)
  const [base,     setBase]     = useState<Producto[]>([])
  const [cargando, setCargando] = useState(true)
  const [q,        setQ]        = useState('')
  const [cat,      setCat]      = useState('')
  const [sub,      setSub]      = useState('')
  const [marca,    setMarca]    = useState('')
  const [visibles, setVisibles] = useState(40)
  const [infoOpen, setInfoOpen] = useState(false)
  const [localCatOpen, setLocalCatOpen] = useState(false)
  const sentinelRef = useRef<HTMLDivElement>(null)
  const tabsMobileRef = useRef<HTMLDivElement>(null)
  const touchStartXMobile = useRef(0)
  const touchStartYMobile = useRef(0)
  const [buscandoEnTienda, setBuscandoEnTienda] = useState(false)

  const [mounted, setMounted] = useState(false)
  useEffect(() => {
    setMounted(true)
  }, [])
  const esBusquedaOMovilPasillo = mounted && searchParams?.get('view') === 'pasillos'

  // SKU Bottom Sheet States
  interface Variacion {
    nombre: string;
    precio: number;
    emoji: string;
  }

  const [skuProduct, setSkuProduct] = useState<Producto | null>(null)
  const [skuTiendaId, setSkuTiendaId] = useState('')
  const [skuTiendaNombre, setSkuTiendaNombre] = useState('')
  const [skuCoords, setSkuCoords] = useState<{ x: number; y: number } | null>(null)
  const [skuQty, setSkuQty] = useState(1)
  const [skuOption, setSkuOption] = useState<Variacion | null>(null)

  // Helper for dynamic variations based on category
  function obtenerVariaciones(p: Producto): Variacion[] {
    const c = (p.categoria || '').toLowerCase()
    const desc = (p.descripcion || '').toLowerCase()
    const bp = p.precio_publico

    if (c.includes('lacte') || c.includes('leche')) {
      return [
        { nombre: 'Entera 🥛', precio: bp, emoji: '🥛' },
        { nombre: 'Deslactosada 🥛', precio: bp + 0.10, emoji: '🥛✨' },
        { nombre: 'Semidescremada 🥛', precio: bp + 0.05, emoji: '🍼' }
      ]
    }
    if (c.includes('bebida') || c.includes('gaseosa') || desc.includes('cola')) {
      return [
        { nombre: 'Sabor Original 🥤', precio: bp, emoji: '🥤' },
        { nombre: 'Zero Azúcar 🥤', precio: bp + 0.15, emoji: '🥤🖤' },
        { nombre: 'Light 🥤', precio: bp + 0.10, emoji: '🥤' }
      ]
    }
    if (c.includes('aceite')) {
      return [
        { nombre: 'Girasol 🌻', precio: bp, emoji: '🌻' },
        { nombre: 'Oliva 🫒', precio: bp + 1.55, emoji: '🫒' },
        { nombre: 'Soya 🌾', precio: Math.max(0.1, bp - 0.30), emoji: '🌾' }
      ]
    }
    if (c.includes('arroz') || c.includes('grano')) {
      return [
        { nombre: 'Normal 🌾', precio: bp, emoji: '🌾' },
        { nombre: 'Integral 🌾', precio: bp + 0.20, emoji: '🌾' },
        { nombre: 'Extra Seleccionado 🌾', precio: bp + 0.40, emoji: '🌾' }
      ]
    }
    if (c.includes('ferre') || c.includes('herra')) {
      return [
        { nombre: 'Estándar 🔧', precio: bp, emoji: '🔧' },
        { nombre: 'Profesional ⚙️', precio: bp + 1.20, emoji: '⚙️' }
      ]
    }
    return [
      { nombre: 'Estándar 📦', precio: bp, emoji: '📦' },
      { nombre: 'Premium ✨', precio: bp + 0.50, emoji: '✨' }
    ]
  }

  // Flying cart animation
  const triggerFlyAnimation = (startX: number, startY: number, emojiOrText: string) => {
    const cartButton = document.getElementById('mobile-cart-btn') || document.getElementById('global-cart-btn')
    if (!cartButton) return
    const cartRect = cartButton.getBoundingClientRect()
    const endX = cartRect.left + cartRect.width / 2
    const endY = cartRect.top + cartRect.height / 2

    const element = document.createElement('div')
    element.className = 'fixed z-[9999] pointer-events-none w-8 h-8 rounded-full bg-green-600 text-white flex items-center justify-center font-bold shadow-lg text-lg transition-all duration-700 ease-out'
    element.innerText = emojiOrText
    element.style.left = `${startX - 16}px`
    element.style.top = `${startY - 16}px`
    document.body.appendChild(element)

    // Force reflow
    element.getBoundingClientRect()

    element.style.transform = `translate(${endX - startX}px, ${endY - startY}px) scale(0.2)`
    element.style.opacity = '0.3'

    element.addEventListener('transitionend', () => {
      element.remove()
      cartButton.classList.add('scale-110')
      setTimeout(() => cartButton.classList.remove('scale-110'), 200)
    })
  }

  // Escuchar evento para abrir selector de variación / cantidad
  useEffect(() => {
    const handleOpenSku = (e: Event) => {
      const customEvent = e as CustomEvent
      const { prod, clientX, clientY, tiendaId, tiendaNombre } = customEvent.detail
      setSkuProduct(prod)
      setSkuCoords({ x: clientX, y: clientY })
      setSkuTiendaId(tiendaId)
      setSkuTiendaNombre(tiendaNombre)
      setSkuQty(1)
      
      const vars = obtenerVariaciones(prod)
      setSkuOption(vars[0])
    }
    window.addEventListener('open-sku-selector', handleOpenSku)
    return () => window.removeEventListener('open-sku-selector', handleOpenSku)
  }, [])

  // Auto-cerrar el menú desplegable local de categorías al cambiar de pasillo
  useEffect(() => {
    setLocalCatOpen(false)
  }, [cat])


  function updateFiltersUrl(newFilters: { cat?: string; sub?: string; marca?: string; q?: string }, replace = false) {
    const params = new URLSearchParams(searchParams ? searchParams.toString() : '')
    
    if (newFilters.cat !== undefined) {
      if (newFilters.cat) params.set('cat', newFilters.cat)
      else params.delete('cat')
    }
    if (newFilters.sub !== undefined) {
      if (newFilters.sub) params.set('sub', newFilters.sub)
      else params.delete('sub')
    }
    if (newFilters.marca !== undefined) {
      if (newFilters.marca) params.set('marca', newFilters.marca)
      else params.delete('marca')
    }
    if (newFilters.q !== undefined) {
      if (newFilters.q) params.set('q', newFilters.q)
      else params.delete('q')
    }

    const qs = params.toString()
    const path = typeof window !== 'undefined' ? window.location.pathname : `/tiendas/${id}`
    const targetUrl = qs ? `${path}?${qs}` : path
    if (replace) {
      router.replace(targetUrl)
    } else {
      router.push(targetUrl)
    }
  }

  
  const { user } = useAuth()
  const [frecuentes, setFrecuentes] = useState<Producto[]>([])
  const [selectedProduct, setSelectedProduct] = useState<Producto | null>(null)
  const [activeList, setActiveList] = useState<Producto[]>([])

  // Reset scroll to top when category or subcategory changes
  useEffect(() => {
    if (typeof window !== 'undefined') {
      window.scrollTo({ top: 0, behavior: 'auto' })
    }
  }, [cat, sub, marca])

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

  function buildSharedUrl() {
    const params = new URLSearchParams()
    if (cat) params.set('cat', cat)
    if (sub) params.set('sub', sub)
    if (marca) params.set('marca', marca)
    if (q) params.set('q', q)
    const qs = params.toString()
    const origin = typeof window !== 'undefined' ? window.location.origin : ''
    const path = typeof window !== 'undefined' ? window.location.pathname : `/tiendas/${id}`
    return qs ? `${origin}${path}?${qs}` : `${origin}${path}`
  }

  function compartirTienda() {
    const url = buildSharedUrl()
    navigator.clipboard.writeText(url)
    const texto = `Te comparto la tienda ${tienda?.nombre || ''} en línea: ${url}`
    window.open(`https://api.whatsapp.com/send?text=${encodeURIComponent(texto)}`, '_blank')
  }

  function compartirFiltros() {
    const url = buildSharedUrl()
    
    // Copiar al portapapeles
    navigator.clipboard.writeText(url)
    
    // Abrir WhatsApp
    const texto = `Hola, te comparto los productos de esta sección: ${url}`
    window.open(`https://api.whatsapp.com/send?text=${encodeURIComponent(texto)}`, '_blank')
  }



  const searchParamsStr = searchParams ? searchParams.toString() : ''
  // Sincronizar estado local con query params de la URL
  useEffect(() => {
    setCat(searchParams?.get('cat') || '')
    setSub(searchParams?.get('sub') || '')
    setMarca(searchParams?.get('marca') || '')
    setQ(searchParams?.get('q') || '')
    setVisibles(40)
  }, [searchParamsStr])

  // Redireccionar parámetro viejo de view=pasillos a la nueva página dedicada
  useEffect(() => {
    if (searchParams?.get('view') === 'pasillos') {
      router.replace(`/tiendas/${id}/buscar`)
    }
  }, [searchParams, id, router])

  useEffect(() => {
    async function cargar() {
      const { data: t } = await supabase.from('ol_tiendas').select('*').eq('id', id).single()
      if (!t) {
        setCargando(false)
        return
      }
      setTienda(t as OlTienda)

      const esCrayola = t.nombre.toLowerCase().includes('crayola')

      let todos: Producto[] = []
      let desde = 0
      const LOTE = 1000
      let hayMas = true

      while (hayMas) {
        let pQuery = supabase.from('ol_productos')
          .select('codigo,descripcion,categoria,subcategoria,marca,stock,stock_minimo,precio_publico,precio_con_iva,tienda_id,imagen_url,detalles')
          .gt('precio_publico', 0)
          .order('descripcion')
          .range(desde, desde + LOTE - 1)

        if (esCrayola) {
          pQuery = pQuery.or(`tienda_id.eq.${id},tienda_id.is.null`)
        } else {
          pQuery = pQuery.eq('tienda_id', id)
        }

        const { data: ps } = await pQuery
        const lote = (ps ?? []) as Producto[]
        todos = [...todos, ...lote]
        hayMas = lote.length === LOTE
        desde += LOTE
      }

      setBase(todos)
      setCargando(false)
    }
    cargar()
  }, [id])

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
        .limit(15)

      if (data && !error) {
        // Buscar los códigos correspondientes en la lista `base` de esta tienda
        const list = data
          .map((item: any) => base.find(p => p.codigo === item.producto_codigo))
          .filter((p): p is Producto => !!p && p.stock > 0)
        setFrecuentes(list)
      } else if (error) {
        console.error('Error al cargar productos frecuentes:', error)
      }
    }

    if (!cargando && tienda && base.length > 0) {
      cargarFrecuentes()
    } else {
      setFrecuentes([])
    }
  }, [id, user, cargando, tienda, base])

  const cats = useMemo(() => {
    const map = new Map<string, number>()
    base.filter(p => p.stock > 0).forEach(p => { if (p.categoria) map.set(p.categoria, (map.get(p.categoria) ?? 0) + 1) })
    return Array.from(map.entries()).sort((a, b) => b[1] - a[1])
  }, [base])

  const activeCat = useMemo(() => {
    return cat || (esBusquedaOMovilPasillo && cats.length > 0 ? cats[0][0] : '')
  }, [cat, esBusquedaOMovilPasillo, cats])

  const filtrados = useMemo(() => {
    let pool = q.length >= 2
      ? customSearch(base, q)
      : base.filter(p => p.stock > 0)
    const filterCat = cat || (esBusquedaOMovilPasillo ? activeCat : '')
    if (filterCat) pool = pool.filter(p => p.categoria === filterCat)
    if (sub && sub !== 'TODO_PASILLO') pool = pool.filter(p => p.subcategoria === sub)
    if (marca) pool = pool.filter(p => p.marca === marca)
    return pool
  }, [base, q, cat, sub, marca, activeCat, esBusquedaOMovilPasillo])

  // Subcategorias dinamicas de la categoria seleccionada
  const subcats = useMemo(() => {
    if (!activeCat) return []
    const map = new Map<string, number>()
    base.filter(p => p.stock > 0 && p.categoria === activeCat).forEach(p => {
      if (p.subcategoria) map.set(p.subcategoria, (map.get(p.subcategoria) ?? 0) + 1)
    })
    // Ordenar alfabéticamente (A-Z) para consistencia y predicibilidad en móvil
    return Array.from(map.entries()).sort((a, b) => a[0].localeCompare(b[0], 'es', { sensitivity: 'base' }))
  }, [base, activeCat])

  // Tabs ordenados: ['', ...subcats] para swipe
  const allSubsMobile = useMemo(() => ['', ...subcats.map(([s]) => s)], [subcats])
  const activeSubIndexMobile = allSubsMobile.indexOf(sub || '')

  // Auto-scroll del tab activo al centro
  const scrollMobileTabToView = useCallback((idx: number) => {
    if (!tabsMobileRef.current) return
    const tabs = tabsMobileRef.current.querySelectorAll('[data-tab-mobile]')
    const el = tabs[idx] as HTMLElement | undefined
    if (el) el.scrollIntoView({ behavior: 'smooth', block: 'nearest', inline: 'center' })
  }, [])

  function cambiarSubMobile(nuevaSub: string, idx: number) {
    updateFiltersUrl({ sub: nuevaSub })
    setTimeout(() => scrollMobileTabToView(idx), 60)
  }

  function onTouchStartMobile(e: React.TouchEvent) {
    touchStartXMobile.current = e.touches[0].clientX
    touchStartYMobile.current = e.touches[0].clientY
  }

  function onTouchEndMobile(e: React.TouchEvent) {
    if (!cat) return
    const dx = e.changedTouches[0].clientX - touchStartXMobile.current
    const dy = e.changedTouches[0].clientY - touchStartYMobile.current
    if (Math.abs(dx) < 45 || Math.abs(dy) > Math.abs(dx) * 0.8) return
    const currentIdx = activeSubIndexMobile < 0 ? 0 : activeSubIndexMobile
    if (dx < 0 && currentIdx < allSubsMobile.length - 1) {
      cambiarSubMobile(allSubsMobile[currentIdx + 1], currentIdx + 1)
    } else if (dx > 0 && currentIdx > 0) {
      cambiarSubMobile(allSubsMobile[currentIdx - 1], currentIdx - 1)
    }
  }

  // Marcas dinamicas contextuales al pasillo y la subcategoria activa (estilo sub-subcategorias)
  const marcas = useMemo(() => {
    const map = new Map<string, number>()
    let pool = base.filter(p => p.stock > 0)
    if (activeCat) pool = pool.filter(p => p.categoria === activeCat)
    if (sub && sub !== 'TODO_PASILLO') pool = pool.filter(p => p.subcategoria === sub)
    pool.forEach(p => {
      if (p.marca) map.set(p.marca, (map.get(p.marca) ?? 0) + 1)
    })
    return Array.from(map.entries()).sort((a, b) => b[1] - a[1])
  }, [base, activeCat, sub])

  // Efecto para scroll infinito automático (sentinel)
  useEffect(() => {
    if (!sentinelRef.current) return

    const observer = new IntersectionObserver(
      (entries) => {
        const first = entries[0]
        if (first.isIntersecting) {
          setVisibles((prev) => prev + 40)
        }
      },
      { threshold: 0.1, rootMargin: '150px' }
    )

    const currentSentinel = sentinelRef.current
    observer.observe(currentSentinel)

    return () => {
      if (currentSentinel) {
        observer.unobserve(currentSentinel)
      }
    }
  }, [filtrados.length])

  function limpiarFiltros() {
    updateFiltersUrl({ cat: '', sub: '', marca: '', q: '' })
  }

  if (cargando) return (
    <div className="max-w-5xl mx-auto px-4 py-16 flex justify-center">
      <Loader2 size={28} className="animate-spin text-green-500" />
    </div>
  )

  if (!tienda) return (
    <div className="max-w-lg mx-auto px-4 py-16 text-center">
      <Store size={48} className="text-gray-200 mx-auto mb-3" />
      <p className="text-gray-500">Tienda no encontrada</p>
      <button onClick={() => router.back()} className="mt-4 text-green-600 text-sm underline">← Volver</button>
    </div>
  )


  return (
    <div className="max-w-5xl mx-auto px-4 py-3.5 space-y-5 md:px-4 md:py-5 md:space-y-5 md:h-auto flex flex-col md:overflow-visible bg-white md:bg-transparent">

      {/* Header tienda (Solo visible en desktop) */}
      <div className="hidden md:flex sticky top-0 z-40 bg-white/95 backdrop-blur-md border-b border-gray-100 py-3.5 -mx-4 px-4 items-center justify-between gap-3 shadow-sm md:shadow-none md:border-none md:relative md:top-auto md:z-auto md:bg-transparent md:py-0 md:mx-0 md:px-0">
        <div className="flex items-center gap-3 min-w-0 flex-1">
          <button onClick={() => router.back()} className="p-2 hover:bg-gray-100 rounded-xl transition shrink-0">
            <ArrowLeft size={18} className="text-gray-600" />
          </button>
          <div className="w-12 h-12 bg-green-50 rounded-xl flex items-center justify-center text-2xl shrink-0">
            {tienda.logo_url
              ? <img src={tienda.logo_url} alt={tienda.nombre} className="w-9 h-9 object-contain" />
              : '🏪'
            }
          </div>
          <div className="min-w-0">
            <h1 className="font-extrabold text-gray-800 text-lg truncate">{tienda.nombre}</h1>
            {tienda.descripcion && <p className="text-xs text-gray-400 truncate">{tienda.descripcion}</p>}
            {tienda.direccion && (
              <div className="flex items-center gap-1 text-[10px] text-gray-400 mt-0.5">
                <MapPin size={9} /> {tienda.direccion}
              </div>
            )}
          </div>
        </div>

        {/* Botones de acción rápidos a la derecha */}
        <div className="flex items-center gap-1 shrink-0">
          {/* Botón de Filtros (solo móvil, en desktop ya se muestra el sidebar) */}
          <button
            onClick={() => window.dispatchEvent(new Event('open-categorias-global'))}
            className="md:hidden w-8 h-8 rounded-xl bg-gray-50 border border-gray-100 flex items-center justify-center text-gray-500 hover:text-green-600 hover:bg-green-50 transition cursor-pointer animate-fade-in"
            title="Ver pasillos y categorías"
          >
            <SlidersHorizontal size={14} />
          </button>

          {/* Botón de Compartir Tienda */}
          <button
            onClick={compartirTienda}
            className="w-8 h-8 rounded-xl bg-gray-50 border border-gray-100 flex items-center justify-center text-gray-500 hover:text-green-600 hover:bg-green-50 transition cursor-pointer"
            title="Compartir enlace de la tienda"
          >
            <Share2 size={14} />
          </button>

          {/* Botón de Información de la Tienda */}
          <button
            onClick={() => setInfoOpen(!infoOpen)}
            className={`w-8 h-8 rounded-xl border flex items-center justify-center transition cursor-pointer ${
              infoOpen
                ? 'bg-green-500 border-transparent text-white'
                : 'bg-gray-50 border-gray-100 text-gray-500 hover:text-green-600 hover:bg-green-50'
            }`}
            title="Información de la tienda"
          >
            <Info size={14} />
          </button>
        </div>
      </div>

      {/* Información detallada de la tienda */}
      {infoOpen && (
        <div className="bg-green-50/70 border border-green-100 rounded-2xl p-4 text-xs text-green-800 space-y-2 animate-fade-in">
          <div className="font-extrabold text-green-950 flex items-center gap-1">
            🏪 {tienda.nombre}
          </div>
          <p className="leading-relaxed">{tienda.descripcion || 'Esta tienda aliada ofrece excelentes productos seleccionados para ti.'}</p>
          {tienda.direccion && (
            <p className="flex items-start gap-1">
              <span className="font-bold shrink-0">📍 Dirección:</span>
              <span>{tienda.direccion}</span>
            </p>
          )}
          {tienda.categoria && (
            <p className="flex items-center gap-1">
              <span className="font-bold shrink-0">🏷️ Categoría:</span>
              <span className="capitalize">{tienda.categoria}</span>
            </p>
          )}
        </div>
      )}

      {/* ── HEADER MÓVIL DINÁMICO estilo Tipti (solo cuando hay categoría activa) ── */}
      {cat && (
        <div className="md:hidden shrink-0 bg-white border-b border-gray-100 sticky top-0 z-30">
          {buscandoEnTienda ? (
            /* Modo búsqueda dentro de la categoría */
            <div className="flex items-center gap-2 px-3 py-2.5">
              <button
                onClick={() => { setBuscandoEnTienda(false); updateFiltersUrl({ q: '' }) }}
                className="p-1.5 shrink-0 border-none bg-transparent cursor-pointer active:scale-90 transition"
              >
                <ArrowLeft size={20} className="text-gray-700" />
              </button>
              <div className="flex-1 relative">
                <input
                  value={q}
                  onChange={e => updateFiltersUrl({ q: e.target.value })}
                  placeholder={`Buscar en ${cat}...`}
                  autoFocus
                  className="w-full bg-gray-100 rounded-xl pl-3 pr-8 py-2 text-xs text-gray-800 placeholder-gray-400 focus:outline-none focus:ring-2 focus:ring-green-400 transition border-none"
                />
                {q && (
                  <button onClick={() => updateFiltersUrl({ q: '' })} className="absolute right-3 top-1/2 -translate-y-1/2 border-none bg-transparent cursor-pointer text-gray-400">
                    <X size={13} />
                  </button>
                )}
              </div>
            </div>
          ) : (
            /* Modo navegación: ← [Emoji + NombreCat] 🔍 🛒 */
            <div className="flex items-center gap-1 px-2 py-2.5">
              <button
                onClick={() => updateFiltersUrl({ cat: '', sub: '', marca: '', q: '' })}
                className="p-1.5 shrink-0 border-none bg-transparent cursor-pointer active:scale-90 transition"
              >
                <ArrowLeft size={20} className="text-gray-700" />
              </button>
              <h1 className="flex-1 text-sm font-extrabold text-gray-800 text-center truncate px-1">
                {CAT_EMOJI[cat] || '📦'} {cat}
              </h1>
              <button
                onClick={() => setBuscandoEnTienda(true)}
                className="p-2 shrink-0 border-none bg-transparent cursor-pointer active:scale-90 transition text-gray-600 hover:text-green-600"
              >
                <Search size={19} />
              </button>
              <button
                onClick={() => window.dispatchEvent(new Event('open-cart-global'))}
                className="p-2 shrink-0 border-none bg-transparent cursor-pointer active:scale-90 transition text-gray-600 hover:text-green-600"
              >
                <ShoppingCart size={19} />
              </button>
            </div>
          )}

          {/* Segunda fila: tabs de subcategorías con indicador estilo Tipti */}
          {!buscandoEnTienda && subcats.length > 0 && (
            <div
              ref={tabsMobileRef}
              className="overflow-x-auto scrollbar-hide flex border-t border-gray-100"
            >
              <button
                data-tab-mobile
                onClick={() => cambiarSubMobile('', 0)}
                className={`shrink-0 px-4 py-2.5 text-[11px] font-extrabold relative whitespace-nowrap border-none bg-transparent cursor-pointer transition-colors
                  ${!sub ? 'text-green-600' : 'text-gray-500 hover:text-gray-700'}`}
              >
                Todos los productos
                {!sub && <span className="absolute bottom-0 left-0 right-0 h-[2.5px] bg-green-600 rounded-t-full" />}
              </button>
              {subcats.map(([s], idx) => (
                <button
                  key={s}
                  data-tab-mobile
                  onClick={() => cambiarSubMobile(s, idx + 1)}
                  className={`shrink-0 px-4 py-2.5 text-[11px] font-extrabold relative whitespace-nowrap border-none bg-transparent cursor-pointer transition-colors
                    ${sub === s ? 'text-green-600' : 'text-gray-500 hover:text-gray-700'}`}
                >
                  {s}
                  {sub === s && <span className="absolute bottom-0 left-0 right-0 h-[2.5px] bg-green-600 rounded-t-full" />}
                </button>
              ))}
            </div>
          )}
        </div>
      )}


      <div className="flex-1 flex flex-row md:gap-6 md:items-start overflow-hidden">
        {/* ── SIDEBAR pasillos (móvil y desktop) ── */}
        <aside className="hidden md:flex md:w-52 shrink-0 h-full md:h-auto bg-gray-50 md:bg-white border-r md:border border-gray-100 md:rounded-2xl p-4 md:shadow-sm overflow-y-auto flex flex-col select-none">
          {/* DESKTOP: El aside tradicional */}
          <div className="space-y-5">
            {!cat ? (
              // Nivel 1: Lista de Categorías
              <div className="space-y-1">
                <p className="text-[10px] font-bold text-gray-400 uppercase tracking-wider mb-2">Selecciona un Pasillo</p>
                {cats.map(([c, count]) => (
                  <button
                    key={c}
                    onClick={() => updateFiltersUrl({ cat: c, sub: '', marca: '' })}
                    className="w-full text-left px-3 py-2.5 rounded-xl text-xs font-bold text-gray-700 hover:bg-green-50 hover:text-green-700 transition flex items-center justify-between border border-transparent hover:border-green-100"
                  >
                    <span className="flex items-center gap-2">
                      <span className="text-sm">{CAT_EMOJI[c] || '📦'}</span>
                      <span className="truncate max-w-[100px]">{c}</span>
                    </span>
                    <span className="text-[9px] bg-gray-100 text-gray-500 px-2 py-0.5 rounded-full font-bold">{count}</span>
                  </button>
                ))}
              </div>
            ) : (
              // Nivel 2: Subcategorías y Marcas de la categoría seleccionada
              <div className="space-y-5">
                {/* Botón Volver */}
                <button
                  onClick={() => updateFiltersUrl({ cat: '', sub: '', marca: '' })}
                  className="w-full py-2 bg-gray-50 hover:bg-gray-100 text-gray-600 border border-gray-200 rounded-xl text-[11px] font-bold transition flex items-center justify-center gap-1.5"
                >
                  ← Todos los pasillos
                </button>

                {/* Pasillo Activo */}
                <div>
                  <span className="text-[10px] font-bold text-gray-400 uppercase tracking-wider block mb-1">Pasillo seleccionado</span>
                  <div className="text-xs font-black text-green-700 bg-green-50 border border-green-100 rounded-xl px-3 py-2 flex items-center gap-2">
                    <span>{CAT_EMOJI[cat] || '📦'}</span>
                    <span className="truncate">{cat}</span>
                  </div>
                </div>

                {/* Lista de Subcategorías (si hay) */}
                {subcats.length > 0 && (
                  <div>
                    <p className="text-[10px] font-bold text-gray-400 uppercase tracking-wider mb-2">Subcategorías</p>
                    <div className="space-y-1 max-h-60 overflow-y-auto pr-1">
                      {subcats.map(([s, count]) => {
                        const esActiva = sub === s
                        return (
                          <button
                            key={s}
                            onClick={() => updateFiltersUrl({ sub: esActiva ? '' : s })}
                            className={`w-full text-left px-3 py-1.5 rounded-xl text-xs font-bold transition flex items-center justify-between border
                              ${esActiva 
                                ? 'bg-teal-50 border-teal-200 text-teal-700' 
                                : 'bg-white border-gray-100 text-gray-600 hover:bg-gray-50'}`}
                          >
                            <span className="truncate max-w-[100px]">🛍️ {s}</span>
                            <span className="text-[9px] font-bold text-gray-400">({count})</span>
                          </button>
                        )
                      })}
                    </div>
                  </div>
                )}

                {/* Lista de Marcas (si hay) */}
                {marcas.length > 0 && (
                  <div>
                    <p className="text-[10px] font-bold text-gray-400 uppercase tracking-wider mb-2">Marcas</p>
                    <div className="space-y-1 max-h-60 overflow-y-auto pr-1">
                      {marcas.map(([m, count]) => {
                        const esActiva = marca === m
                        return (
                          <button
                            key={m}
                            onClick={() => updateFiltersUrl({ marca: esActiva ? '' : m })}
                            className={`w-full text-left px-3 py-1.5 rounded-xl text-xs font-bold transition flex items-center justify-between border
                              ${esActiva 
                                ? 'bg-purple-50 border-purple-200 text-purple-700' 
                                : 'bg-white border-gray-100 text-gray-600 hover:bg-gray-50'}`}
                          >
                            <span className="truncate max-w-[100px]">🏷️ {m}</span>
                            <span className="text-[9px] font-bold text-gray-400">({count})</span>
                          </button>
                        )
                      })}
                    </div>
                  </div>
                )}
              </div>
            )}
          </div>
        </aside>

        {/* ── COLUMNA DERECHA / CONTENIDO PRINCIPAL ── */}
        <div className="flex-1 min-w-0 bg-white md:bg-transparent">
          
          {/* Subcategorías horizontal chips - SOLO MÓVIL - ocultar cuando hay tabs Tipti activos */}
          {cat && subcats.length > 0 && false && (
            <div className="md:hidden p-3 pb-1 border-b border-gray-50 shrink-0 bg-white z-10">
              <div className="flex gap-2 overflow-x-auto pb-1.5 scrollbar-hide">
                <button
                  onClick={() => updateFiltersUrl({ sub: '' })}
                  className={`px-3 py-1.5 rounded-full text-[10px] font-bold shrink-0 transition active:scale-95 cursor-pointer
                    ${!sub 
                      ? 'bg-green-600 text-white shadow-sm shadow-green-600/10' 
                      : 'bg-gray-100 text-gray-600 hover:bg-gray-200'}`}
                >
                  Todo 🛍️
                </button>
                {[...subcats].sort((a,b) => a[0].localeCompare(b[0])).map(([s, count]) => {
                  const esActiva = sub === s
                  const emoji = obtenerEmojiSubcategoria(s, cat)
                  return (
                    <button
                      key={s}
                      onClick={() => updateFiltersUrl({ sub: s })}
                      className={`px-3 py-1.5 rounded-full text-[10px] font-bold shrink-0 transition active:scale-95 cursor-pointer flex items-center gap-1
                        ${esActiva 
                          ? 'bg-green-600 text-white shadow-sm shadow-green-600/10' 
                          : 'bg-gray-100 text-gray-600 hover:bg-gray-200'}`}
                    >
                      <span>{emoji}</span>
                      <span>{s}</span>
                    </button>
                  )
                })}
              </div>
            </div>
          )}


          {/* Listado de Productos (Scrollable vertical independiente en móvil) */}
          <div
            className={esBusquedaOMovilPasillo 
              ? 'flex-1 md:h-auto overflow-y-auto md:overflow-visible p-3 md:p-0 space-y-4 bg-gray-50/30' 
              : 'space-y-6 md:p-0'
            }
            onTouchStart={onTouchStartMobile}
            onTouchEnd={onTouchEndMobile}
          >


          {/* Filtros activos */}
          {(q || sub || marca) && (
            <div className="flex items-center gap-2 flex-wrap text-xs">
              {sub && (
                <span className="flex items-center gap-1 bg-teal-50 text-teal-700 font-semibold px-2.5 py-1 rounded-full border border-teal-200">
                  🛍️ {sub}
                  <button onClick={() => updateFiltersUrl({ sub: '' })} className="hover:text-teal-950 font-bold"><X size={12} /></button>
                </span>
              )}
              {marca && (
                <span className="flex items-center gap-1 bg-purple-50 text-purple-700 font-semibold px-2.5 py-1 rounded-full border border-purple-200">
                  🏷️ {marca}
                  <button onClick={() => updateFiltersUrl({ marca: '' })} className="hover:text-purple-950 font-bold"><X size={12} /></button>
                </span>
              )}
              <button onClick={limpiarFiltros} className="text-[10px] text-gray-400 hover:text-gray-600 underline">
                Limpiar todos
              </button>
            </div>
          )}

          {/* Productos Frecuentes (Comprar de nuevo) */}
          {tienda && frecuentes.length > 0 && !cat && !q && !sub && !marca && (
            <div className="w-full max-w-full overflow-hidden space-y-3 bg-green-50/40 border border-green-100/60 rounded-2xl p-4 animate-fade-in">
              <div className="flex items-center justify-between">
                <h3 className="font-extrabold text-gray-900 text-sm flex items-center gap-1.5">
                  🔄 Comprar de nuevo
                </h3>
                <span className="text-[10px] text-green-700 bg-green-100/60 px-2.5 py-0.5 rounded-full font-bold">
                  Tus habituales
                </span>
              </div>
              <div className="flex gap-1.5 overflow-x-auto pb-2 scrollbar-hide">
                {frecuentes.map(p => (
                  <TiendaProductCard
                    key={p.codigo}
                    p={p}
                    tienda={tienda}
                    onSelect={(prod) => openQuickView(prod, frecuentes)}
                  />
                ))}
              </div>
            </div>
          )}

          {/* ── Subcategorías Rejilla de 5 Columnas (Antes de mostrar productos - Estilo Pinduoduo) ── */}
          {cat && !sub && subcats.length > 0 && (
            <div className="w-full bg-white border border-gray-100/50 rounded-2xl p-4.5 shadow-xs mb-4.5 animate-in fade-in slide-in-from-top-4 duration-200">
              <div className="text-[10px] font-black text-gray-400 uppercase tracking-wider mb-3">Subcategorías del Pasillo</div>
              <div className="grid grid-cols-5 gap-y-4 gap-x-1.5 justify-items-center">
                {[...subcats].sort((a,b) => a[0].localeCompare(b[0])).map(([s, count]) => {
                  const emoji = obtenerEmojiSubcategoria(s, cat)
                  const imgSrc = SUBCAT_IMAGES[s]
                  return (
                    <button
                      key={s}
                      onClick={() => updateFiltersUrl({ sub: s })}
                      className="flex flex-col items-center group relative transition active:scale-95 duration-100 cursor-pointer"
                    >
                      <div className="w-11 h-11 rounded-full bg-gray-50 border border-gray-100 flex items-center justify-center text-xl shadow-xs hover:bg-white group-hover:border-green-200 overflow-hidden transition relative">
                        {imgSrc ? (
                          <img 
                            src={imgSrc} 
                            alt={s} 
                            className="w-full h-full object-cover" 
                            onError={(e) => {
                              e.currentTarget.style.display = 'none';
                              const parent = e.currentTarget.parentElement;
                              if (parent) {
                                parent.innerText = emoji;
                              }
                            }} 
                          />
                        ) : (
                          emoji
                        )}
                      </div>
                      <span className="text-[9px] font-extrabold text-gray-600 text-center mt-1.5 leading-tight line-clamp-2 max-w-[64px] group-hover:text-green-700">
                        {s}
                      </span>
                    </button>
                  )
                })}
              </div>
            </div>
          )}

          {/* ── Sub-subcategorías / Marcas en Horizontal (Una vez elegida la subcategoría - Estilo Pinduoduo) ── */}
          {cat && sub && (
            <div className="w-full flex flex-col gap-2 mb-4 animate-in fade-in duration-200">
              <button
                onClick={() => updateFiltersUrl({ sub: '', marca: '' })}
                className="self-start text-[10px] font-extrabold text-green-600 flex items-center gap-1 hover:underline cursor-pointer bg-transparent border-none p-0"
              >
                ← Volver a pasillo {cat} (Ver subcategorías)
              </button>

              {/* Barra Horizontal de Marcas */}
              {marcas.length > 0 && (
                <div className="w-full overflow-x-auto pb-1 -mx-4 px-4 scrollbar-hide border-b border-gray-100">
                  <div className="flex gap-4.5 whitespace-nowrap text-xs font-bold items-center py-1">
                    <button
                      onClick={() => updateFiltersUrl({ marca: '' })}
                      className={`pb-2.5 transition-all relative shrink-0 cursor-pointer
                        ${!marca 
                          ? 'text-green-700 font-extrabold border-b-2 border-green-700' 
                          : 'text-gray-500 hover:text-gray-700'}`}
                    >
                      🏷️ Todo {sub}
                    </button>
                    {marcas.map(([m, count]) => {
                      const esActiva = marca === m
                      return (
                        <button
                          key={m}
                          onClick={() => updateFiltersUrl({ marca: esActiva ? '' : m })}
                          className={`pb-2.5 transition-all relative shrink-0 cursor-pointer
                            ${esActiva 
                              ? 'text-green-700 font-extrabold border-b-2 border-green-700' 
                              : 'text-gray-500 hover:text-gray-700'}`}
                        >
                          {m}
                        </button>
                      )
                    })}
                  </div>
                </div>
              )}
            </div>
          )}

          {/* Contador */}
          <p className="text-xs text-gray-400">{filtrados.length} productos disponibles</p>

          {/* Grid productos / Rows de Subcategorías / Rows de Categorías */}
          {filtrados.length === 0 ? (
            <div className="text-center py-16 space-y-2">
              <div className="text-5xl">🔍</div>
              <p className="text-gray-500 font-medium">Sin productos con ese filtro</p>
              <button onClick={() => { setQ(''); limpiarFiltros() }} className="text-sm text-green-600 underline border-none bg-transparent cursor-pointer">Limpiar</button>
            </div>
          ) : cat && !sub ? (
            /* Vista agrupada por subcategoría en horizontal (tipo Tipti) */
            <div className="space-y-6">
              {subcats.map(([s]) => {
                const prodsEnSub = base.filter(p => p.stock > 0 && p.categoria === cat && p.subcategoria === s)
                if (prodsEnSub.length === 0) return null
                return (
                  <div key={s} className="space-y-2.5 animate-fade-in">
                    <div className="flex items-center justify-between">
                      <button
                        onClick={() => updateFiltersUrl({ sub: s })}
                        className="font-extrabold text-orange-600 text-sm hover:underline cursor-pointer text-left capitalize"
                      >
                        {s}
                      </button>
                      <button
                        onClick={() => updateFiltersUrl({ sub: s })}
                        className="text-xs text-green-700 font-bold flex items-center gap-0.5 hover:underline"
                      >
                        Ver más <ChevronRight size={12} />
                      </button>
                    </div>
                    <div className="flex gap-1.5 overflow-x-auto pb-2 scrollbar-hide -mx-4 px-4">
                      {prodsEnSub.map(p => (
                        <TiendaProductCard
                          key={p.codigo}
                          p={p}
                          tienda={tienda}
                          onSelect={(prod) => openQuickView(prod, prodsEnSub)}
                        />
                      ))}
                    </div>
                  </div>
                )
              })}

              {/* Si hay productos sin subcategoría asignada */}
              {(() => {
                const prodsSinSub = base.filter(p => p.stock > 0 && p.categoria === cat && !p.subcategoria)
                if (prodsSinSub.length === 0) return null
                return (
                  <div className="space-y-2.5 animate-fade-in">
                    <h3 className="font-extrabold text-gray-900 text-sm">Otros productos</h3>
                    <div className="flex gap-1.5 overflow-x-auto pb-2 scrollbar-hide -mx-4 px-4">
                      {prodsSinSub.map(p => (
                        <TiendaProductCard
                          key={p.codigo}
                          p={p}
                          tienda={tienda}
                          onSelect={(prod) => openQuickView(prod, prodsSinSub)}
                        />
                      ))}
                    </div>
                  </div>
                )
              })()}
            </div>
          ) : !cat && !sub && !marca && !q && !esBusquedaOMovilPasillo ? (
            /* Vista agrupada por categoría principal en horizontal (tipo Tipti/Aki Home de Tienda) */
            <div className="space-y-6">
              {cats.map(([c]) => {
                const prodsEnCat = base.filter(p => p.stock > 0 && p.categoria === c)
                if (prodsEnCat.length === 0) return null
                return (
                  <div key={c} className="space-y-2.5 animate-fade-in">
                    <div className="flex items-center justify-between">
                      <button
                        onClick={() => updateFiltersUrl({ cat: c, sub: '', marca: '' })}
                        className="font-extrabold text-orange-600 text-sm flex items-center gap-1.5 hover:underline cursor-pointer text-left"
                      >
                        <span>{CAT_EMOJI[c] || '📦'}</span>
                        <span>{c}</span>
                      </button>
                      <button
                        onClick={() => updateFiltersUrl({ cat: c, sub: '', marca: '' })}
                        className="text-xs text-green-700 font-bold flex items-center gap-0.5 hover:underline"
                      >
                        Ver pasillo <ChevronRight size={12} />
                      </button>
                    </div>
                    <div className="flex gap-1.5 overflow-x-auto pb-2 scrollbar-hide -mx-4 px-4">
                      {prodsEnCat.slice(0, 15).map(p => (
                        <TiendaProductCard
                          key={p.codigo}
                          p={p}
                          tienda={tienda}
                          onSelect={(prod) => openQuickView(prod, prodsEnCat.slice(0, 15))}
                        />
                      ))}
                    </div>
                  </div>
                )
              })}
            </div>
          ) : (
            /* Grid vertical tradicional */
            <>
              <div className="grid grid-cols-2 md:grid-cols-2 lg:grid-cols-3 gap-1.5 md:gap-4">
                {filtrados.slice(0, visibles).map(p => (
                  <TiendaVerticalProductCard
                    key={p.codigo}
                    p={p}
                    tienda={tienda}
                    onSelect={(prod) => openQuickView(prod, filtrados)}
                  />
                ))}
              </div>
              {visibles < filtrados.length && (
                <div ref={sentinelRef} className="w-full py-6 flex items-center justify-center gap-2 text-gray-400 text-xs select-none">
                  <Loader2 size={16} className="animate-spin text-green-500" />
                  Cargando más productos...
                </div>
              )}
            </>
          )}
          </div>
        </div>
      </div>


      <style>{`
        @keyframes fadeIn {
          from { opacity: 0; }
          to { opacity: 1; }
        }
        @keyframes slideInLeft {
          from { transform: translateX(-100%); }
          to { transform: translateX(0); }
        }
        @keyframes slideInUp {
          from { transform: translateY(100%); }
          to { transform: translateY(0); }
        }
        .animate-fade-in {
          animation: fadeIn 0.2s ease-out forwards;
        }
        .animate-slide-in-left {
          animation: slideInLeft 0.25s cubic-bezier(0.16, 1, 0.3, 1) forwards;
        }
        .animate-slide-in-up {
          animation: slideInUp 0.25s cubic-bezier(0.16, 1, 0.3, 1) forwards;
        }
      `}</style>

      {/* Drawer flotante reversible */}
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

      {/* Drawer / Bottom Sheet de Variaciones (Estilo Taobao) */}
      {skuProduct && (
        <>
          {/* Backdrop */}
          <div 
            onClick={() => setSkuProduct(null)}
            className="fixed inset-0 bg-black/60 z-[190] animate-fade-in"
          />

          {/* Bottom Sheet */}
          <div className="fixed inset-x-0 bottom-0 md:bottom-auto md:top-1/2 md:left-1/2 md:-translate-x-1/2 md:-translate-y-1/2 md:max-w-md w-full bg-white rounded-t-[30px] md:rounded-3xl shadow-2xl z-[200] p-6 animate-slide-in-up md:animate-fade-in flex flex-col font-sans select-none border-t md:border border-gray-100">
            
            {/* Tirador para móvil */}
            <div 
              onClick={() => setSkuProduct(null)}
              className="md:hidden w-12 h-1.5 bg-gray-200 rounded-full mx-auto mb-4 cursor-pointer"
            />
            
            {/* Ficha básica del producto */}
            <div className="flex gap-4">
              <div className="w-16 h-16 bg-gray-50 rounded-xl flex items-center justify-center shadow-inner overflow-hidden shrink-0 text-3xl transition-all duration-200">
                {skuOption ? (
                  <span className="animate-fade-in">{skuOption.emoji}</span>
                ) : (
                  <ImagenProducto src={skuProduct.imagen_url} categoria={skuProduct.categoria} alt={skuProduct.descripcion} descripcion={skuProduct.descripcion} />
                )}
              </div>
              <div className="flex-1 min-w-0 flex flex-col justify-between">
                <h3 className="font-extrabold text-gray-800 text-[13px] leading-snug line-clamp-2">{skuProduct.descripcion}</h3>
                <div>
                  <span className="text-[10px] text-gray-400 block">{skuProduct.marca || 'Marca seleccionada'}</span>
                  <span className="font-black text-green-700 text-base transition-all duration-150">
                    {fmt(skuOption ? skuOption.precio : skuProduct.precio_publico)}
                  </span>
                </div>
              </div>
              <button 
                onClick={() => setSkuProduct(null)}
                className="text-gray-400 hover:text-gray-600 shrink-0 self-start p-1"
              >
                <X size={16} />
              </button>
            </div>

            {/* Variedades */}
            <div className="mt-5">
              <span className="text-[10px] font-black text-gray-400 uppercase tracking-wider block mb-2">Selecciona variedad:</span>
              <div className="flex flex-wrap gap-2">
                {obtenerVariaciones(skuProduct).map(opt => {
                  const esActiva = skuOption && skuOption.nombre === opt.nombre
                  return (
                    <button
                      key={opt.nombre}
                      onClick={() => setSkuOption(opt)}
                      className={`px-3 py-1.5 rounded-xl text-[10px] font-bold transition-all border cursor-pointer
                        ${esActiva 
                          ? 'bg-green-50 border-green-600 text-green-700 font-extrabold shadow-inner' 
                          : 'bg-gray-50 border-gray-200 text-gray-600 hover:bg-gray-100'}`}
                    >
                      {opt.nombre}
                    </button>
                  )
                })}
              </div>
            </div>

            {/* Cantidades */}
            <div className="mt-5 flex items-center justify-between border-t border-gray-100 pt-4">
              <span className="text-xs font-bold text-gray-500">Cantidad a agregar:</span>
              <div className="flex items-center gap-2 bg-gray-50 border border-gray-200 rounded-xl p-0.5 shrink-0">
                <button 
                  onClick={() => setSkuQty(q => Math.max(1, q - 1))}
                  className="w-7 h-7 rounded-lg bg-white border border-gray-200 flex items-center justify-center text-gray-700 font-extrabold active:scale-90 transition text-xs"
                >
                  -
                </button>
                <span className="text-xs font-black text-gray-800 min-w-[20px] text-center">{skuQty}</span>
                <button 
                  onClick={() => setSkuQty(q => q + 1)}
                  className="w-7 h-7 rounded-lg bg-green-600 flex items-center justify-center text-white font-extrabold active:scale-90 transition text-xs"
                >
                  +
                </button>
              </div>
            </div>

            {/* Botón de Confirmación */}
            <button
              onClick={() => {
                // Agregar al carrito con precio y descripción de la variante
                const precioFinal = skuOption ? skuOption.precio : skuProduct.precio_publico
                const descFinal = `${skuProduct.descripcion} [${skuOption ? skuOption.nombre : ''}]`

                agregarItem({
                  ...skuProduct,
                  precio_publico: precioFinal,
                  tienda_id: skuTiendaId,
                  tienda_nombre: skuTiendaNombre,
                  descripcion: descFinal
                }, skuQty)

                // Lanzar animación de vuelo
                if (skuCoords) {
                  const emoji = skuOption ? skuOption.emoji : (CAT_EMOJI[skuProduct.categoria || ''] || '📦')
                  triggerFlyAnimation(skuCoords.x, skuCoords.y, emoji)
                }

                // Cerrar
                setSkuProduct(null)
              }}
              className="mt-6 w-full py-3 bg-green-600 hover:bg-green-700 text-white font-extrabold text-xs rounded-2xl active:scale-[0.98] transition cursor-pointer border-none flex items-center justify-center gap-2 shadow-md"
            >
              Confirmar y Agregar
            </button>
          </div>
        </>
      )}
    </div>
  )
}

class LocalErrorBoundary extends React.Component<{ children: React.ReactNode }, { hasError: boolean; error: Error | null }> {
  constructor(props: any) {
    super(props)
    this.state = { hasError: false, error: null }
  }
  static getDerivedStateFromError(error: Error) {
    return { hasError: true, error }
  }
  componentDidCatch(error: Error, errorInfo: any) {
    console.error("ErrorBoundary caught an error", error, errorInfo)
  }
  render() {
    if (this.state.hasError) {
      return (
        <div className="p-6 bg-red-50 border border-red-200 rounded-2xl text-red-800 text-xs space-y-2 m-4">
          <h2 className="font-bold text-sm flex items-center gap-1.5">⚠️ Error de Renderizado:</h2>
          <p className="font-mono font-bold">{this.state.error?.message}</p>
          <pre className="font-mono text-[9px] overflow-auto max-h-60 bg-white p-2.5 border border-red-100 rounded-xl leading-relaxed">{this.state.error?.stack}</pre>
        </div>
      )
    }
    return this.props.children
  }
}

export default function TiendaPage() {
  return (
    <Suspense fallback={
      <div className="max-w-5xl mx-auto px-4 py-16 flex justify-center">
        <Loader2 size={28} className="animate-spin text-green-500" />
      </div>
    }>
      <LocalErrorBoundary>
        <TiendaContent />
      </LocalErrorBoundary>
    </Suspense>
  )
}

'use client'
import { useEffect, useState, useRef } from 'react'
import Link from 'next/link'
import { useRouter } from 'next/navigation'
import { supabase } from '@/lib/supabase'
import { ChevronRight, ShoppingCart, Truck, Shield, Clock, Heart, ChevronLeft } from 'lucide-react'
import { agregarItem } from '@/lib/carrito'
import { toggleFavorito, esFavorito } from '@/lib/favoritos'
import { Producto } from '@/lib/types'
import LocalGrid from '@/components/LocalGrid'

function fmt(n: number) { return '$' + n.toFixed(2) }

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
    titulo: 'Todo para el regreso a clases',
    sub: 'Útiles, mochilas, cuadernos y más. Envíos a domicilio en Los Bancos.',
    emoji: '🎒',
    cta: 'Ver útiles escolares',
    href: '/productos?cat=Escolar',
    bg: 'from-green-700 via-green-600 to-emerald-500',
    badge: '🎒 Temporada escolar 2026',
  },
  {
    titulo: 'Arte y manualidades',
    sub: 'Pinturas, pinceles, papeles y materiales para todos los niveles.',
    emoji: '🎨',
    cta: 'Explorar arte',
    href: '/productos?cat=Arte',
    bg: 'from-purple-700 via-purple-600 to-fuchsia-500',
    badge: '🎨 Nueva colección',
  },
  {
    titulo: 'Tecnología para la oficina',
    sub: 'Accesorios, gadgets y todo lo que necesitas para trabajar mejor.',
    emoji: '💻',
    cta: 'Ver tecnología',
    href: '/productos?cat=Tecnologia',
    bg: 'from-indigo-700 via-indigo-600 to-blue-500',
    badge: '💻 Tech & Oficina',
  },
]

// ── Carrusel de banners ────────────────────────────────────────────
function BannerCarrusel() {
  const [idx, setIdx] = useState(0)
  const timer = useRef<ReturnType<typeof setInterval> | null>(null)

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
    <div className={`relative bg-gradient-to-br ${b.bg} text-white overflow-hidden transition-all duration-500`}>
      <div className="max-w-5xl mx-auto px-4 py-10 md:py-14 flex flex-col md:flex-row items-center gap-6">
        <div className="flex-1 text-center md:text-left">
          <div className="inline-block bg-white/20 text-white text-xs font-bold px-3 py-1 rounded-full mb-4">
            {b.badge}
          </div>
          <h1 className="text-2xl md:text-4xl font-extrabold leading-tight mb-3">{b.titulo}</h1>
          <p className="text-white/80 text-sm md:text-base mb-6 max-w-md">{b.sub}</p>
          <div className="flex flex-col sm:flex-row gap-3 justify-center md:justify-start">
            <Link href={b.href}
              className="bg-white text-gray-800 font-bold px-6 py-3 rounded-xl hover:bg-gray-50 transition text-sm text-center">
              {b.cta}
            </Link>
            <Link href="/productos"
              className="bg-white/20 text-white font-semibold px-6 py-3 rounded-xl hover:bg-white/30 transition text-sm text-center border border-white/20">
              Todo el catálogo →
            </Link>
          </div>
        </div>
        <div className="text-[100px] md:text-[140px] leading-none select-none">{b.emoji}</div>
      </div>

      {/* Controles */}
      <button onClick={() => ir(-1)}
        className="absolute left-3 top-1/2 -translate-y-1/2 w-8 h-8 bg-white/20 hover:bg-white/40 rounded-full flex items-center justify-center transition">
        <ChevronLeft size={18} className="text-white" />
      </button>
      <button onClick={() => ir(+1)}
        className="absolute right-3 top-1/2 -translate-y-1/2 w-8 h-8 bg-white/20 hover:bg-white/40 rounded-full flex items-center justify-center transition">
        <ChevronRight size={18} className="text-white" />
      </button>

      {/* Dots */}
      <div className="absolute bottom-3 left-1/2 -translate-x-1/2 flex gap-1.5">
        {BANNERS.map((_, i) => (
          <button key={i} onClick={() => { setIdx(i); resetTimer() }}
            className={`rounded-full transition-all ${i === idx ? 'w-5 h-2 bg-white' : 'w-2 h-2 bg-white/40'}`} />
        ))}
      </div>
    </div>
  )
}

// ── Skeleton card ──────────────────────────────────────────────────
function SkeletonCard() {
  return (
    <div className="bg-white rounded-2xl border border-gray-100 p-4 animate-pulse">
      <div className="bg-gray-100 h-32 rounded-xl mb-3" />
      <div className="h-2.5 bg-gray-100 rounded w-1/3 mb-2" />
      <div className="h-3.5 bg-gray-100 rounded mb-1" />
      <div className="h-5 bg-gray-100 rounded w-1/4 mt-2 mb-3" />
      <div className="h-8 bg-gray-100 rounded-lg" />
    </div>
  )
}

// ── Tarjeta de producto con favorito ──────────────────────────────
function ProdCard({ p }: { p: Producto }) {
  const router = useRouter()
  const [fav, setFav] = useState(() => esFavorito(p.codigo))
  const [ok, setOk]   = useState(false)
  const [imageError, setImageError] = useState(false)

  function addCart(e: React.MouseEvent) {
    e.stopPropagation()
    e.preventDefault()
    agregarItem(p)
    setOk(true)
    setTimeout(() => setOk(false), 1200)
  }

  function toggleFav(e: React.MouseEvent) {
    e.stopPropagation()
    e.preventDefault()
    setFav(toggleFavorito({ codigo: p.codigo, descripcion: p.descripcion, categoria: p.categoria, precio_publico: p.precio_publico }))
  }

  return (
    <div onClick={() => router.push(`/producto/${encodeURIComponent(p.codigo)}`)}
      className="bg-white rounded-2xl border border-gray-100 p-4 shadow-sm hover:shadow-md hover:-translate-y-0.5 transition-all flex flex-col cursor-pointer group">
      <div className="relative bg-gradient-to-br from-gray-50 to-gray-100 rounded-xl h-32 flex items-center justify-center mb-3 text-4xl overflow-hidden group-hover:from-green-50 group-hover:to-green-100 transition-colors">
        {p.imagen_url && !imageError ? (
          <img
            src={p.imagen_url}
            alt={p.descripcion}
            onError={() => setImageError(true)}
            className="w-full h-full object-contain p-1.5"
            loading="lazy"
          />
        ) : (
          CAT_CONFIG[p.categoria]?.emoji || '📦'
        )}
        <button onClick={toggleFav}
          className={`absolute top-2 right-2 w-7 h-7 rounded-full flex items-center justify-center shadow-sm transition
            ${fav ? 'bg-red-500 text-white' : 'bg-white/90 text-gray-300 hover:text-red-400'}`}>
          <Heart size={13} className={fav ? 'fill-white' : ''} />
        </button>
        {p.stock > 0 && p.stock < 5 && (
          <span className="absolute top-2 left-2 text-[9px] font-bold bg-orange-500 text-white px-2 py-0.5 rounded-full">
            ⚡ Últimas
          </span>
        )}
      </div>
      <div className="flex-1">
        <div className="text-[10px] font-semibold text-green-600 uppercase tracking-wide mb-0.5">{p.categoria}</div>
        <div className="text-sm font-semibold text-gray-800 leading-snug line-clamp-2">{p.descripcion}</div>
        {p.marca && <div className="text-[10px] text-gray-400 mt-0.5">{p.marca}</div>}
      </div>
      <div className="flex items-center justify-between mt-2">
        <div className="text-lg font-extrabold text-gray-900">{fmt(p.precio_publico)}</div>
      </div>
      <button onClick={addCart}
        className={`mt-2 w-full py-2 rounded-lg text-xs font-bold flex items-center justify-center gap-1.5 transition
          ${ok ? 'bg-green-600 text-white' : 'bg-green-50 text-green-700 border border-green-200 hover:bg-green-600 hover:text-white hover:border-green-600'}`}>
        <ShoppingCart size={13} />
        {ok ? '¡Agregado!' : 'Agregar al carrito'}
      </button>
    </div>
  )
}

// ── Home ───────────────────────────────────────────────────────────
const CAT_TIENDA: Record<string, string> = {
  supermercado: '🛒', farmacia: '💊', libreria: '📚',
  abarrotes: '🥬', tecnologia: '💻', otros: '🏪',
}

export default function Home() {
  const [cats,        setCats]        = useState<{ categoria: string; n: number }[]>([])
  const [destacados,  setDestacados]  = useState<Producto[]>([])
  const [novedades,   setNovedades]   = useState<Producto[]>([])
  const [tiendas,     setTiendas]     = useState<{ id: string; nombre: string; categoria: string | null; logo_url: string | null }[]>([])
  const [cargandoCats, setCargandoCats] = useState(true)
  const [cargandoProds, setCargandoProds] = useState(true)

  useEffect(() => {
    // Categorías
    supabase.from('ol_productos').select('categoria').gt('stock', 0)
      .then(({ data }) => {
        if (!data) return
        const map = new Map<string, number>()
        data.forEach((d: { categoria: string }) => {
          if (d.categoria) map.set(d.categoria, (map.get(d.categoria) || 0) + 1)
        })
        setCats(Array.from(map.entries()).sort((a, b) => b[1] - a[1]).slice(0, 9).map(([categoria, n]) => ({ categoria, n })))
        setCargandoCats(false)
      })

    // Destacados (mayor precio con stock)
    supabase.from('ol_productos')
      .select('codigo,descripcion,categoria,subcategoria,marca,stock,stock_minimo,precio_publico,precio_con_iva,imagen_url')
      .gt('stock', 0).gt('precio_publico', 5)
      .order('precio_publico', { ascending: false }).limit(8)
      .then(({ data }) => {
        if (data) setDestacados(data as Producto[])
      })

    // Novedades
    supabase.from('ol_productos')
      .select('codigo,descripcion,categoria,subcategoria,marca,stock,stock_minimo,precio_publico,precio_con_iva,imagen_url')
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
      .then(({ data }) => { if (data) setTiendas(data) })
  }, [])

  return (
    <div>
      {/* ── CARRUSEL ── */}
      <BannerCarrusel />

      {/* ── TRUST BADGES ── */}
      <div className="bg-white border-b border-gray-100">
        <div className="max-w-5xl mx-auto px-4 py-4 grid grid-cols-3 gap-4">
          {[
            { icon: Truck,  text: 'Envíos a domicilio', sub: 'En Los Bancos' },
            { icon: Shield, text: 'Calidad garantizada', sub: 'Productos verificados' },
            { icon: Clock,  text: 'Atención rápida',    sub: 'Lun–Sáb 8–18h' },
          ].map(({ icon: Icon, text, sub }) => (
            <div key={text} className="flex items-center gap-2.5 justify-center md:justify-start">
              <div className="bg-green-100 p-2 rounded-lg shrink-0">
                <Icon size={16} className="text-green-700" />
              </div>
              <div className="hidden sm:block">
                <div className="text-xs font-semibold text-gray-800">{text}</div>
                <div className="text-[10px] text-gray-400">{sub}</div>
              </div>
            </div>
          ))}
        </div>
      </div>

      <div className="max-w-5xl mx-auto px-4 py-8 space-y-12">

        {/* ── SELECCIÓN DE VERTICALES ── */}
        <LocalGrid />

        {/* ── TIENDAS ALIADAS ── */}
        {tiendas.length > 0 && (
          <section>
            <div className="flex items-center justify-between mb-4">
              <div>
                <h2 className="text-lg font-bold text-gray-900">🏪 Tiendas disponibles</h2>
                <p className="text-xs text-gray-400">Compramos por ti y te entregamos en casa</p>
              </div>
              <Link href="/tiendas" className="text-sm text-green-600 font-medium flex items-center gap-1 hover:underline">
                Ver todas <ChevronRight size={14} />
              </Link>
            </div>
            <div className="grid grid-cols-2 md:grid-cols-3 lg:grid-cols-5 gap-3">
              {tiendas.map(t => (
                <Link key={t.id} href={`/tiendas/${t.id}`}
                  className="bg-white border border-gray-100 rounded-2xl p-4 shadow-sm hover:shadow-md hover:-translate-y-0.5 transition-all flex flex-col items-center gap-2 text-center group">
                  <div className="w-12 h-12 bg-green-50 rounded-xl flex items-center justify-center text-2xl group-hover:scale-105 transition-transform">
                    {t.logo_url
                      ? <img src={t.logo_url} alt={t.nombre} className="w-9 h-9 object-contain" />
                      : (CAT_TIENDA[t.categoria ?? 'otros'] ?? '🏪')
                    }
                  </div>
                  <span className="text-xs font-bold text-gray-700 leading-tight">{t.nombre}</span>
                </Link>
              ))}
              {/* Ver todas */}
              <Link href="/tiendas"
                className="bg-gray-50 border border-dashed border-gray-200 rounded-2xl p-4 flex flex-col items-center gap-2 text-center hover:bg-green-50 hover:border-green-200 transition group">
                <div className="w-12 h-12 bg-white rounded-xl flex items-center justify-center text-2xl group-hover:scale-105 transition-transform">➕</div>
                <span className="text-xs font-bold text-gray-400 group-hover:text-green-600">Ver todas</span>
              </Link>
            </div>
          </section>
        )}

        {/* ── CATEGORÍAS ── */}
        <section>
          <div className="flex items-center justify-between mb-4">
            <h2 className="text-lg font-bold text-gray-900">Categorías</h2>
            <Link href="/productos" className="text-sm text-green-600 font-medium flex items-center gap-1 hover:underline">
              Ver todo <ChevronRight size={14} />
            </Link>
          </div>
          {cargandoCats ? (
            <div className="grid grid-cols-3 md:grid-cols-5 gap-3">
              {[...Array(9)].map((_, i) => <div key={i} className="h-24 bg-gray-100 rounded-2xl animate-pulse" />)}
            </div>
          ) : (
            <div className="grid grid-cols-3 md:grid-cols-5 gap-3">
              {cats.map(({ categoria, n }) => {
                const cfg = CAT_CONFIG[categoria] || { emoji: '📦', color: 'text-gray-700', bg: 'bg-gray-50 border-gray-200' }
                return (
                  <Link key={categoria} href={`/productos?cat=${encodeURIComponent(categoria)}`}
                    className={`${cfg.bg} border rounded-2xl p-4 text-center hover:shadow-md active:scale-95 transition`}>
                    <div className="text-3xl mb-2">{cfg.emoji}</div>
                    <div className={`text-xs font-bold ${cfg.color} leading-tight`}>{categoria}</div>
                    <div className="text-[10px] text-gray-400 mt-0.5">{n} productos</div>
                  </Link>
                )
              })}
            </div>
          )}
        </section>

        {/* ── PRODUCTOS DESTACADOS ── */}
        <section>
          <div className="flex items-center justify-between mb-4">
            <div>
              <h2 className="text-lg font-bold text-gray-900">⭐ Destacados</h2>
              <p className="text-xs text-gray-400">Los más valorados de nuestra tienda</p>
            </div>
            <Link href="/productos" className="text-sm text-green-600 font-medium flex items-center gap-1 hover:underline">
              Ver todos <ChevronRight size={14} />
            </Link>
          </div>
          {cargandoProds ? (
            <div className="grid grid-cols-2 md:grid-cols-4 gap-4">
              {[...Array(4)].map((_, i) => <SkeletonCard key={i} />)}
            </div>
          ) : (
            <div className="grid grid-cols-2 md:grid-cols-4 gap-4">
              {destacados.map(p => <ProdCard key={p.codigo} p={p} />)}
            </div>
          )}
        </section>

        {/* ── BANNER INTERMEDIO ── */}
        <section className="bg-gradient-to-r from-blue-600 to-indigo-600 rounded-2xl p-6 md:p-8 text-white flex flex-col md:flex-row items-center gap-6">
          <div className="text-6xl">🎒</div>
          <div className="flex-1 text-center md:text-left">
            <h3 className="text-xl font-extrabold mb-1">Lista escolar completa</h3>
            <p className="text-blue-100 text-sm">Cuadernos, lápices, colores, mochilas y más. Todo en un solo lugar.</p>
          </div>
          <Link href="/productos?cat=Escolar"
            className="bg-white text-blue-700 font-bold px-6 py-3 rounded-xl hover:bg-blue-50 transition text-sm shrink-0">
            Ver útiles →
          </Link>
        </section>

        {/* ── NOVEDADES ── */}
        <section>
          <div className="flex items-center justify-between mb-4">
            <div>
              <h2 className="text-lg font-bold text-gray-900">✨ Novedades</h2>
              <p className="text-xs text-gray-400">Los últimos productos en llegar</p>
            </div>
            <Link href="/productos" className="text-sm text-green-600 font-medium flex items-center gap-1 hover:underline">
              Ver todos <ChevronRight size={14} />
            </Link>
          </div>
          {cargandoProds ? (
            <div className="grid grid-cols-2 md:grid-cols-4 gap-4">
              {[...Array(4)].map((_, i) => <SkeletonCard key={i} />)}
            </div>
          ) : (
            <div className="grid grid-cols-2 md:grid-cols-4 gap-4">
              {novedades.map(p => <ProdCard key={p.codigo} p={p} />)}
            </div>
          )}
        </section>

        {/* ── BANNER ARTE ── */}
        <section className="bg-gradient-to-r from-pink-500 to-purple-600 rounded-2xl p-6 md:p-8 text-white flex flex-col md:flex-row items-center gap-6">
          <div className="text-6xl">🎨</div>
          <div className="flex-1 text-center md:text-left">
            <h3 className="text-xl font-extrabold mb-1">Expresa tu creatividad</h3>
            <p className="text-pink-100 text-sm">Pinturas, pinceles, marcadores y materiales para artistas de todos los niveles.</p>
          </div>
          <Link href="/productos?cat=Arte"
            className="bg-white text-purple-700 font-bold px-6 py-3 rounded-xl hover:bg-purple-50 transition text-sm shrink-0">
            Ver arte →
          </Link>
        </section>

      </div>

      {/* WhatsApp flotante */}
      <a href="https://wa.me/593984341953?text=Hola%2C%20quiero%20hacer%20un%20pedido"
        target="_blank" rel="noopener noreferrer"
        className="fixed bottom-24 md:bottom-8 right-4 z-40 bg-[#25D366] hover:bg-[#20c05a] text-white rounded-full p-3.5 shadow-lg hover:shadow-xl transition">
        <svg viewBox="0 0 24 24" className="w-6 h-6 fill-white">
          <path d="M17.472 14.382c-.297-.149-1.758-.867-2.03-.967-.273-.099-.471-.148-.67.15-.197.297-.767.966-.94 1.164-.173.199-.347.223-.644.075-.297-.15-1.255-.463-2.39-1.475-.883-.788-1.48-1.761-1.653-2.059-.173-.297-.018-.458.13-.606.134-.133.298-.347.446-.52.149-.174.198-.298.298-.497.099-.198.05-.371-.025-.52-.075-.149-.669-1.612-.916-2.207-.242-.579-.487-.5-.669-.51-.173-.008-.371-.01-.57-.01-.198 0-.52.074-.792.372-.272.297-1.04 1.016-1.04 2.479 0 1.462 1.065 2.875 1.213 3.074.149.198 2.096 3.2 5.077 4.487.709.306 1.262.489 1.694.625.712.227 1.36.195 1.871.118.571-.085 1.758-.719 2.006-1.413.248-.694.248-1.289.173-1.413-.074-.124-.272-.198-.57-.347m-5.421 7.403h-.004a9.87 9.87 0 01-5.031-1.378l-.361-.214-3.741.982.998-3.648-.235-.374a9.86 9.86 0 01-1.51-5.26c.001-5.45 4.436-9.884 9.888-9.884 2.64 0 5.122 1.03 6.988 2.898a9.825 9.825 0 012.893 6.994c-.003 5.45-4.437 9.884-9.885 9.884m8.413-18.297A11.815 11.815 0 0012.05 0C5.495 0 .16 5.335.157 11.892c0 2.096.547 4.142 1.588 5.945L.057 24l6.305-1.654a11.882 11.882 0 005.683 1.448h.005c6.554 0 11.89-5.335 11.893-11.893a11.821 11.821 0 00-3.48-8.413z"/>
        </svg>
      </a>
    </div>
  )
}

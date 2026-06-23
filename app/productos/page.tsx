'use client'
import { useEffect, useState, useMemo, useRef, Suspense } from 'react'
import { useRouter, useSearchParams } from 'next/navigation'
import Fuse from 'fuse.js'
import { supabase } from '@/lib/supabase'
import { agregarItem, getCarrito, cambiarCantidad } from '@/lib/carrito'
import { toggleFavorito, esFavorito } from '@/lib/favoritos'
import { Producto } from '@/lib/types'
import { Search, X, ShoppingCart, Plus, Minus, Heart, ArrowUpDown, Share2 } from 'lucide-react'
import { useAuth } from '@/context/AuthContext'
import { getPerfil } from '@/lib/perfil'
import QuickViewDrawer from '@/components/QuickViewDrawer'

function fmt(n: number) { return '$' + (n || 0).toFixed(2) }

// --- CONFIGURACIÓN DE VISUALIZACIÓN REVERSIBLE ---
const USE_QUICK_VIEW = true; // Cambiar a 'false' para deshabilitar el Bottom Sheet/Popup y volver al comportamiento original

const CAT_EMOJI: Record<string, string> = {
  'Escolar':'📚','Arte':'🎨','Oficina':'🖊️','Tecnologia':'💻','Juguetes':'🧸',
  'Manualidades':'✂️','Libros':'📖','Pintura':'🖌️','Papeleria':'📄',
  'Abarrotes':'🥬','Bebidas y Licores':'🥤','Congelados y Refrigerados':'❄️',
  'Golosinas y Snacks':'🍪','Panadería':'🍞','Cuidado Personal':'🧴',
  'Hogar y Limpieza':'🧹','Mascotas':'🐶','Huevos Lácteos y Leches':'🥛',
  'Alimentos':'🥦','Bebidas':'🥤','Limpieza':'🧹','Higiene':'🧴'
}

type Orden = 'relevancia' | 'precio_asc' | 'precio_desc' | 'nombre_asc'

// ── Skeleton card ──────────────────────────────────────────────────
function SkeletonCard() {
  return (
    <div className="bg-white rounded-2xl border border-gray-100 p-3.5 animate-pulse">
      <div className="bg-gray-100 h-28 rounded-xl mb-3" />
      <div className="h-2.5 bg-gray-100 rounded w-1/3 mb-2" />
      <div className="h-3.5 bg-gray-100 rounded mb-1" />
      <div className="h-3 bg-gray-100 rounded w-2/3 mb-3" />
      <div className="h-5 bg-gray-100 rounded w-1/4 mb-2" />
      <div className="h-8 bg-gray-100 rounded-lg" />
    </div>
  )
}

// ── Badge de producto ──────────────────────────────────────────────
function Badge({ tipo }: { tipo: 'nuevo' | 'oferta' | 'popular' | 'ultimas' }) {
  const cfg = {
    nuevo:   { label: '✨ Nuevo',   cls: 'bg-blue-500 text-white' },
    oferta:  { label: '🏷️ Oferta',  cls: 'bg-red-500 text-white' },
    popular: { label: '🔥 Popular', cls: 'bg-orange-500 text-white' },
    ultimas: { label: '⚡ Últimas', cls: 'bg-yellow-500 text-white' },
  }[tipo]
  return (
    <span className={`absolute top-2 left-2 text-[9px] font-bold px-2 py-0.5 rounded-full z-10 ${cfg.cls}`}>
      {cfg.label}
    </span>
  )
}

// ── Botón agregar con contador ─────────────────────────────────────
function BtnAgregar({ prod }: { prod: Producto }) {
  const [cantidad, setCantidad] = useState(() => {
    const items = getCarrito()
    return items.find((i: { codigo: string }) => i.codigo === prod.codigo)?.cantidad ?? 0
  })

  useEffect(() => {
    const sync = () => {
      const items = getCarrito()
      setCantidad(items.find((i: { codigo: string }) => i.codigo === prod.codigo)?.cantidad ?? 0)
    }
    window.addEventListener('carrito-update', sync)
    return () => window.removeEventListener('carrito-update', sync)
  }, [prod.codigo])

  function agregar(e: React.MouseEvent) {
    e.stopPropagation()
    e.preventDefault()
    if (typeof navigator !== 'undefined' && navigator.vibrate) {
      navigator.vibrate(15)
    }
    agregarItem(prod)
  }

  function cambiar(e: React.MouseEvent, delta: number) {
    e.stopPropagation()
    e.preventDefault()
    if (typeof navigator !== 'undefined' && navigator.vibrate) {
      navigator.vibrate(10)
    }
    const nueva = cantidad + delta
    cambiarCantidad(prod.codigo, nueva)
  }

  if (cantidad === 0) {
    return (
      <button onClick={agregar}
        className="w-full py-2 rounded-lg text-xs font-bold flex items-center justify-center gap-1.5 active:scale-[0.96] transition-transform duration-75 bg-green-50 text-green-700 border border-green-200 hover:bg-green-600 hover:text-white hover:border-transparent">
        <ShoppingCart size={12} /> Agregar
      </button>
    )
  }

  return (
    <div className="flex items-center justify-between bg-green-600 rounded-lg overflow-hidden">
      <button onClick={e => cambiar(e, -1)} className="px-3 py-2 text-white hover:bg-green-700 transition font-bold active:scale-[0.96] transition-transform duration-75">
        <Minus size={12} />
      </button>
      <span className="text-white text-xs font-bold">{cantidad}</span>
      <button onClick={e => cambiar(e, +1)} className="px-3 py-2 text-white hover:bg-green-700 transition font-bold active:scale-[0.96] transition-transform duration-75">
        <Plus size={12} />
      </button>
    </div>
  )
}

// ── Botón favorito ─────────────────────────────────────────────────
function BtnFavorito({ prod }: { prod: Producto }) {
  const [fav, setFav] = useState(() => esFavorito(prod.codigo))

  useEffect(() => {
    const sync = () => setFav(esFavorito(prod.codigo))
    window.addEventListener('favoritos-update', sync)
    return () => window.removeEventListener('favoritos-update', sync)
  }, [prod.codigo])

  function toggle(e: React.MouseEvent) {
    e.stopPropagation()
    e.preventDefault()
    const result = toggleFavorito({ codigo: prod.codigo, descripcion: prod.descripcion, categoria: prod.categoria, precio_publico: prod.precio_publico })
    setFav(result)
  }

  return (
    <button onClick={toggle}
      className={`absolute top-2 right-2 w-7 h-7 rounded-full flex items-center justify-center shadow-sm transition z-10
        ${fav ? 'bg-red-500 text-white' : 'bg-white/90 text-gray-300 hover:text-red-400'}`}>
      <Heart size={13} className={fav ? 'fill-white' : ''} />
    </button>
  )
}

// ── Card de producto ───────────────────────────────────────────────
function ProductCard({ p, badge, onSelect }: { p: Producto; badge?: 'nuevo' | 'oferta' | 'popular' | 'ultimas'; onSelect?: (p: Producto) => void }) {
  const router = useRouter()
  const [imageError, setImageError] = useState(false)
  const agotado = p.stock <= 0
  const badgeTipo = agotado ? undefined : (p.stock < 5 ? 'ultimas' : badge)

  return (
    <div
      onClick={() => {
        if (USE_QUICK_VIEW && onSelect) {
          onSelect(p)
        } else {
          router.push(`/producto/${encodeURIComponent(p.codigo)}`)
        }
      }}
      className="bg-white rounded-2xl border border-gray-100 overflow-hidden shadow-sm hover:shadow-md hover:-translate-y-0.5 transition-all flex flex-col group cursor-pointer"
    >
      <div className="relative bg-gradient-to-br from-gray-50 to-gray-100 h-28 flex items-center justify-center text-4xl overflow-hidden group-hover:from-green-50 group-hover:to-green-100 transition-colors w-full">
        {p.imagen_url && !imageError ? (
          <img
            src={p.imagen_url}
            alt={p.descripcion}
            onError={() => setImageError(true)}
            className="w-full h-full object-contain p-1 animate-fade-in"
            loading="lazy"
          />
        ) : (
          CAT_EMOJI[p.categoria] || '📦'
        )}
        {badgeTipo && <Badge tipo={badgeTipo} />}
        <BtnFavorito prod={p} />
        {agotado && (
          <div className="absolute inset-0 bg-white/70 flex items-center justify-center z-10">
            <span className="text-xs font-bold text-red-500 bg-red-50 px-2 py-0.5 rounded-full border border-red-200">AGOTADO</span>
          </div>
        )}
      </div>

      <div className="p-3 flex-1 flex flex-col justify-between">
        <div className="flex-1">
          <div className="text-[10px] font-semibold text-green-600 uppercase tracking-wide mb-0.5">{p.categoria}</div>
          <div className="text-xs font-semibold text-gray-800 leading-snug line-clamp-2 mb-1">{p.descripcion}</div>
          {p.marca && <div className="text-[10px] text-gray-400">{p.marca}</div>}
        </div>

        <div className="mt-2.5">
          <div className="text-lg font-extrabold text-gray-900 mb-1.5">{fmt(p.precio_publico)}</div>
          {p.stock > 0 && <BtnAgregar prod={p} />}
        </div>
      </div>
    </div>
  )
}

// ── Estado vacío ───────────────────────────────────────────────────
function EstadoVacio({ query, onLimpiar }: { query: string; onLimpiar: () => void }) {
  return (
    <div className="text-center py-20 space-y-3">
      <div className="text-6xl">🔍</div>
      <p className="text-gray-700 font-semibold text-lg">Sin resultados</p>
      <p className="text-gray-400 text-sm max-w-xs mx-auto">
        No encontramos productos para <strong>"{query}"</strong>.<br/>Intenta con otro término o limpia los filtros.
      </p>
      <button onClick={onLimpiar}
        className="mt-2 bg-green-600 hover:bg-green-700 text-white text-sm font-semibold px-5 py-2.5 rounded-xl transition">
        Limpiar filtros
      </button>
    </div>
  )
}

// ── Contenido principal ────────────────────────────────────────────
function ProductosContent() {
  const router       = useRouter()
  const params       = useSearchParams()
  const catInicial   = params.get('cat') || ''
  const subInicial   = params.get('sub') || ''
  const queryInicial = params.get('q')   || ''

  const [base, setBase]             = useState<Producto[]>([])
  const [loadingState, setLoading]  = useState(true)
  const [query, setQuery]           = useState(queryInicial)
  const [cat, setCat]               = useState(catInicial)
  const [sub, setSub]               = useState(subInicial)
  const [tiendaId, setTiendaId]     = useState(params.get('tienda_id') || '')
  const [marca, setMarca]           = useState('')
  const [stockFiltro, setStockFiltro] = useState<'todos'|'disponible'>('disponible')
  const [orden, setOrden]           = useState<Orden>('relevancia')
  const [selectedProduct, setSelectedProduct] = useState<Producto | null>(null)
  const [activeList, setActiveList] = useState<Producto[]>([])

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
  const [visibles, setVisibles]     = useState(40)
  const [showOrden, setShowOrden]   = useState(false)
  const [crayolaId, setCrayolaId]   = useState('')
  const [soloFrecuentes, setSoloFrecuentes] = useState(false)
  const [frecuentesCodigos, setFrecuentesCodigos] = useState<string[]>([])
  const { user } = useAuth()
  const fuseRef = useRef<Fuse<Producto> | null>(null)

  function compartirFiltros() {
    const params = new URLSearchParams()
    if (cat) params.set('cat', cat)
    if (sub) params.set('sub', sub)
    if (marca) params.set('marca', marca)
    if (query) params.set('q', query)
    if (tiendaId) params.set('tienda_id', tiendaId)
    const url = `${window.location.origin}${window.location.pathname}?${params.toString()}`
    
    // Copiar al portapapeles
    navigator.clipboard.writeText(url)
    
    // Abrir WhatsApp
    const texto = `Hola, te comparto los productos de esta sección: ${url}`
    window.open(`https://api.whatsapp.com/send?text=${encodeURIComponent(texto)}`, '_blank')
  }

  // Obtener ID de La Crayola
  useEffect(() => {
    supabase.from('ol_tiendas')
      .select('id')
      .ilike('nombre', '%crayola%')
      .single()
      .then(({ data }) => { if (data) setCrayolaId(data.id) })
  }, [])

  useEffect(() => {
    setCat(params.get('cat') || '')
    setSub(params.get('sub') || '')
    setTiendaId(params.get('tienda_id') || '')
    setSoloFrecuentes(params.get('frecuentes') === 'true')
    const q = params.get('q') || ''
    if (q) setQuery(q)
    setMarca(''); setVisibles(40)
  }, [params])

  // Cargar códigos frecuentes
  useEffect(() => {
    async function cargarFrecuentes() {
      const perfil = getPerfil()
      const telefono = perfil?.telefono || ''
      const userId = user?.id || null

      if (!userId && !telefono) return

      let queryDb = supabase
        .from('ol_productos_frecuentes')
        .select('producto_codigo')

      if (userId) {
        queryDb = queryDb.eq('user_id', userId)
      } else {
        queryDb = queryDb.eq('telefono', telefono)
      }

      const { data } = await queryDb.order('veces_comprado', { ascending: false }).limit(30)
      if (data) {
        setFrecuentesCodigos(data.map((item: any) => item.producto_codigo))
      }
    }

    if (soloFrecuentes) {
      cargarFrecuentes()
    } else {
      setFrecuentesCodigos([])
    }
  }, [soloFrecuentes, user])

  useEffect(() => {
    async function cargar() {
      const LOTE = 1000
      let todos: Producto[] = []
      let desde = 0
      let hayMas = true
      while (hayMas) {
        const { data } = await supabase.from('ol_productos')
          .select('codigo,descripcion,categoria,subcategoria,marca,stock,stock_minimo,precio_publico,precio_con_iva,tienda_id,imagen_url,detalles')
          .gt('precio_publico', 0)
          .order('descripcion')
          .range(desde, desde + LOTE - 1)
        const lote = (data || []) as Producto[]
        todos = [...todos, ...lote]
        hayMas = lote.length === LOTE
        desde += LOTE
      }
      setBase(todos)
      fuseRef.current = new Fuse(todos, {
        keys: [
          { name: 'descripcion', weight: 0.6 },
          { name: 'codigo',      weight: 0.2 },
          { name: 'marca',       weight: 0.1 },
          { name: 'categoria',   weight: 0.1 },
        ],
        threshold: 0.35, ignoreLocation: true, minMatchCharLength: 2,
      })
      setLoading(false)
    }
    cargar()
  }, [])

  const filtrados = useMemo(() => {
    const q = query.trim()
    let pool: Producto[]
    if (q.length >= 2 && fuseRef.current) {
      pool = fuseRef.current.search(q).map(r => r.item)
    } else {
      pool = [...base]
    }
    pool = pool.filter(p => {
      if (soloFrecuentes && !frecuentesCodigos.includes(p.codigo)) return false
      if (tiendaId) {
        const esCrayola = tiendaId === crayolaId
        if (esCrayola) {
          if (p.tienda_id !== tiendaId && p.tienda_id !== null) return false
        } else {
          if (p.tienda_id !== tiendaId) return false
        }
      }
      if (cat && p.categoria?.toLowerCase() !== cat.toLowerCase()) return false
      if (sub && p.subcategoria?.toLowerCase() !== sub.toLowerCase()) return false
      if (marca && p.marca !== marca) return false
      if (stockFiltro === 'disponible' && p.stock <= 0) return false
      return true
    })
    if (orden === 'precio_asc')  pool.sort((a, b) => a.precio_publico - b.precio_publico)
    if (orden === 'precio_desc') pool.sort((a, b) => b.precio_publico - a.precio_publico)
    if (orden === 'nombre_asc')  pool.sort((a, b) => a.descripcion.localeCompare(b.descripcion))
    return pool
  }, [base, query, cat, sub, tiendaId, crayolaId, marca, stockFiltro, orden, soloFrecuentes, frecuentesCodigos])

  const catsCtx = useMemo(() => {
    const q = query.trim()
    let pool = q.length >= 2 && fuseRef.current ? fuseRef.current.search(q).map(r => r.item) : base
    if (soloFrecuentes) {
      pool = pool.filter(p => frecuentesCodigos.includes(p.codigo))
    }
    if (tiendaId) {
      const esCrayola = tiendaId === crayolaId
      pool = pool.filter(p => esCrayola ? (p.tienda_id === tiendaId || p.tienda_id === null) : p.tienda_id === tiendaId)
    }
    if (marca) pool = pool.filter(p => p.marca === marca)
    if (stockFiltro === 'disponible') pool = pool.filter(p => p.stock > 0)
    const map = new Map<string, number>()
    pool.forEach(p => { if (p.categoria) map.set(p.categoria, (map.get(p.categoria) || 0) + 1) })
    return Array.from(map.entries()).sort((a, b) => b[1] - a[1])
  }, [base, query, tiendaId, crayolaId, marca, stockFiltro, soloFrecuentes, frecuentesCodigos])

  const marcasCtx = useMemo(() => {
    const q = query.trim()
    let pool = q.length >= 2 && fuseRef.current ? fuseRef.current.search(q).map(r => r.item) : base
    if (soloFrecuentes) {
      pool = pool.filter(p => frecuentesCodigos.includes(p.codigo))
    }
    if (tiendaId) {
      const esCrayola = tiendaId === crayolaId
      pool = pool.filter(p => esCrayola ? (p.tienda_id === tiendaId || p.tienda_id === null) : p.tienda_id === tiendaId)
    }
    if (cat) pool = pool.filter(p => p.categoria === cat)
    if (stockFiltro === 'disponible') pool = pool.filter(p => p.stock > 0)
    const map = new Map<string, number>()
    pool.forEach(p => { if (p.marca) map.set(p.marca, (map.get(p.marca) || 0) + 1) })
    return Array.from(map.entries()).sort((a, b) => b[1] - a[1])
  }, [base, query, cat, tiendaId, crayolaId, stockFiltro, soloFrecuentes, frecuentesCodigos])

  function limpiar() {
    setQuery('')
    setCat('')
    setSub('')
    setMarca('')
    setSoloFrecuentes(false)
    setOrden('relevancia')
    setVisibles(40)
    router.push('/productos')
  }
  const hayFiltros = !!(query || cat || sub || marca || soloFrecuentes || stockFiltro !== 'disponible' || orden !== 'relevancia')

  // Asignar badges: primeros 4 = popular, últimos en stock = ultimas (ya en ProductCard)
  function badgePara(_: Producto, idx: number): 'popular' | undefined {
    return idx < 4 ? 'popular' : undefined
  }

  const ORDENES: { key: Orden; label: string }[] = [
    { key: 'relevancia',  label: 'Relevancia' },
    { key: 'precio_asc',  label: 'Menor precio' },
    { key: 'precio_desc', label: 'Mayor precio' },
    { key: 'nombre_asc',  label: 'A → Z' },
  ]

  return (
    <div className="max-w-5xl mx-auto px-4 py-5">
      <div className="flex flex-col md:flex-row gap-5">

        {/* ── SIDEBAR filtros (desktop) ── */}
        <aside className="hidden md:block w-52 shrink-0 space-y-5">
          <div>
            <div className="text-xs font-bold text-gray-500 uppercase tracking-wider mb-2">Stock</div>
            {(['disponible','todos'] as const).map(v => (
              <button key={v} onClick={() => setStockFiltro(v)}
                className={`w-full text-left px-3 py-2 rounded-lg text-sm mb-1 transition font-medium
                  ${stockFiltro === v ? 'bg-green-600 text-white' : 'text-gray-600 hover:bg-gray-100'}`}>
                {v === 'disponible' ? '✅ Con stock' : '📦 Todos'}
              </button>
            ))}
          </div>

          {/* Ordenamiento sidebar */}
          <div>
            <div className="text-xs font-bold text-gray-500 uppercase tracking-wider mb-2">Ordenar por</div>
            {ORDENES.map(o => (
              <button key={o.key} onClick={() => setOrden(o.key)}
                className={`w-full text-left px-3 py-2 rounded-lg text-sm mb-1 transition font-medium
                  ${orden === o.key ? 'bg-indigo-600 text-white' : 'text-gray-600 hover:bg-gray-100'}`}>
                {o.label}
              </button>
            ))}
          </div>

          {catsCtx.length > 0 && (
            <div>
              <div className="text-xs font-bold text-gray-500 uppercase tracking-wider mb-2">Categoría</div>
              <div className="space-y-0.5 max-h-64 overflow-y-auto">
                {catsCtx.map(([c, n]) => {
                  const activa = cat.toLowerCase() === c.toLowerCase()
                  return (
                    <button key={c} onClick={() => { setCat(activa ? '' : c); setMarca(''); setVisibles(40) }}
                      className={`w-full text-left px-3 py-1.5 rounded-lg text-sm transition flex justify-between items-center
                        ${activa ? 'bg-green-50 text-green-700 font-semibold border border-green-200' : 'text-gray-600 hover:bg-gray-100'}`}>
                      <span className="flex items-center gap-1.5">{CAT_EMOJI[c] && <span>{CAT_EMOJI[c]}</span>}{c}</span>
                      <span className="text-xs text-gray-400">{n}</span>
                    </button>
                  )
                })}
              </div>
            </div>
          )}

          {marcasCtx.length > 1 && (query.trim() || cat) && (
            <div>
              <div className="text-xs font-bold text-gray-500 uppercase tracking-wider mb-2">Marca</div>
              <div className="space-y-0.5 max-h-48 overflow-y-auto">
                {marcasCtx.map(([m, n]) => (
                  <button key={m} onClick={() => { setMarca(marca === m ? '' : m); setVisibles(40) }}
                    className={`w-full text-left px-3 py-1.5 rounded-lg text-sm transition flex justify-between items-center
                      ${marca === m ? 'bg-purple-50 text-purple-700 font-semibold border border-purple-200' : 'text-gray-600 hover:bg-gray-100'}`}>
                    <span>{m}</span>
                    <span className="text-xs text-gray-400">{n}</span>
                  </button>
                ))}
              </div>
            </div>
          )}
        </aside>

        {/* ── CONTENIDO PRINCIPAL ── */}
        <div className="flex-1 min-w-0 space-y-4">

          {/* Buscador */}
          <div className="relative">
            <Search size={16} className="absolute left-3.5 top-1/2 -translate-y-1/2 text-gray-400" />
            <input value={query}
              onChange={e => { setQuery(e.target.value); setCat(''); setMarca(''); setVisibles(40) }}
              placeholder="Buscar por nombre, código, marca..."
              className="w-full bg-white border border-gray-200 rounded-xl pl-10 pr-10 py-3 text-sm text-gray-800 placeholder-gray-400 focus:outline-none focus:border-green-500 focus:ring-2 focus:ring-green-100 shadow-sm" />
            {hayFiltros && (
              <button onClick={limpiar} className="absolute right-3.5 top-1/2 -translate-y-1/2 text-gray-400 hover:text-gray-600">
                <X size={15} />
              </button>
            )}
          </div>

          {/* Filtros móvil */}
          <div className="md:hidden space-y-2 w-full max-w-full overflow-hidden">
            <div className="flex gap-2 overflow-x-auto pb-1 scrollbar-hide">
              {(['disponible','todos'] as const).map(v => (
                <button key={v} onClick={() => setStockFiltro(v)}
                  className={`shrink-0 px-3 py-1.5 rounded-full text-xs font-semibold border transition
                    ${stockFiltro === v ? 'bg-green-600 text-white border-green-600' : 'bg-white text-gray-600 border-gray-200'}`}>
                  {v === 'disponible' ? '✅ Con stock' : '📦 Todos'}
                </button>
              ))}
              {catsCtx.slice(0, 8).map(([c]) => (
                <button key={c} onClick={() => { setCat(cat === c ? '' : c); setMarca(''); setVisibles(40) }}
                  className={`shrink-0 px-3 py-1.5 rounded-full text-xs font-semibold border transition
                    ${cat === c ? 'bg-green-600 text-white border-green-600' : 'bg-white text-gray-600 border-gray-200'}`}>
                  {CAT_EMOJI[c] || ''} {c}
                </button>
              ))}
            </div>
            {marcasCtx.length > 1 && (query.trim() || cat) && (
              <div className="flex gap-2 overflow-x-auto pb-1 scrollbar-hide">
                {marcasCtx.slice(0, 10).map(([m]) => (
                  <button key={m} onClick={() => { setMarca(marca === m ? '' : m); setVisibles(40) }}
                    className={`shrink-0 px-3 py-1.5 rounded-full text-xs font-semibold border transition
                      ${marca === m ? 'bg-purple-600 text-white border-purple-600' : 'bg-white text-gray-600 border-gray-200'}`}>
                    {m}
                  </button>
                ))}
              </div>
            )}
          </div>

          {/* Barra estado + ordenamiento */}
          <div className="flex items-center justify-between flex-wrap gap-2">
            <div className="flex items-center gap-2 flex-wrap">
              {soloFrecuentes && (
                <span className="flex items-center gap-1 bg-green-100 text-green-700 text-xs font-semibold px-2.5 py-1 rounded-full">
                  🔄 Frecuentes
                  <button onClick={() => {
                    const paramsNew = new URLSearchParams(params.toString())
                    paramsNew.delete('frecuentes')
                    router.push(`/productos?${paramsNew.toString()}`)
                  }}><X size={11} /></button>
                </span>
              )}
              {cat && (
                <span className="flex items-center gap-1 bg-green-100 text-green-700 text-xs font-semibold px-2.5 py-1 rounded-full">
                  {CAT_EMOJI[cat] || ''} {cat}
                  <button onClick={() => { setCat(''); setSub('') }}><X size={11} /></button>
                </span>
              )}
              {sub && (
                <span className="flex items-center gap-1 bg-teal-100 text-teal-700 text-xs font-semibold px-2.5 py-1 rounded-full">
                  🛍️ {sub}
                  <button onClick={() => setSub('')}><X size={11} /></button>
                </span>
              )}
              {marca && (
                <span className="flex items-center gap-1 bg-purple-100 text-purple-700 text-xs font-semibold px-2.5 py-1 rounded-full">
                  {marca}
                  <button onClick={() => setMarca('')}><X size={11} /></button>
                </span>
              )}
            </div>
            {(cat || sub || marca || query) && (
              <button onClick={compartirFiltros} className="flex items-center justify-center bg-[#25D366] hover:bg-[#20c05a] text-white w-9 h-9 rounded-xl shadow-sm transition shrink-0 relative group" title="Compartir sección por WhatsApp">
                <svg viewBox="0 0 24 24" className="w-5 h-5 fill-white">
                  <path d="M17.472 14.382c-.297-.149-1.758-.867-2.03-.967-.273-.099-.471-.148-.67.15-.197.297-.767.966-.94 1.164-.173.199-.347.223-.644.075-.297-.15-1.255-.463-2.39-1.475-.883-.788-1.48-1.761-1.653-2.059-.173-.297-.018-.458.13-.606.134-.133.298-.347.446-.52.149-.174.198-.298.298-.497.099-.198.05-.371-.025-.52-.075-.149-.669-1.612-.916-2.207-.242-.579-.487-.5-.669-.51-.173-.008-.371-.01-.57-.01-.198 0-.52.074-.792.372-.272.297-1.04 1.016-1.04 2.479 0 1.462 1.065 2.875 1.213 3.074.149.198 2.096 3.2 5.077 4.487.709.306 1.262.489 1.694.625.712.227 1.36.195 1.871.118.571-.085 1.758-.719 2.006-1.413.248-.694.248-1.289.173-1.413-.074-.124-.272-.198-.57-.347m-5.421 7.403h-.004a9.87 9.87 0 01-5.031-1.378l-.361-.214-3.741.982.998-3.648-.235-.374a9.86 9.86 0 01-1.51-5.26c.001-5.45 4.436-9.884 9.888-9.884 2.64 0 5.122 1.03 6.988 2.898a9.825 9.825 0 012.893 6.994c-.003 5.45-4.437 9.884-9.885 9.884m8.413-18.297A11.815 11.815 0 0012.05 0C5.495 0 .16 5.335.157 11.892c0 2.096.547 4.142 1.588 5.945L.057 24l6.305-1.654a11.882 11.882 0 005.683 1.448h.005c6.554 0 11.89-5.335 11.893-11.893a11.821 11.821 0 00-3.48-8.413z"/>
                </svg>
                <div className="absolute -top-1 -right-1 bg-white text-[#25D366] rounded-full p-0.5 border border-green-500 shadow-sm flex items-center justify-center">
                  <Share2 size={8} className="stroke-[3]" />
                </div>
              </button>
            )}
            <div className="flex items-center gap-2 ml-auto">
              {!loadingState && (
                <p className="text-xs text-gray-400">{filtrados.length.toLocaleString()} productos</p>
              )}
              {/* Ordenar (móvil + desktop) */}
              <div className="relative md:hidden">
                <button onClick={() => setShowOrden(s => !s)}
                  className="flex items-center gap-1.5 text-xs font-semibold text-gray-600 border border-gray-200 bg-white px-3 py-1.5 rounded-xl hover:bg-gray-50 transition">
                  <ArrowUpDown size={13} /> Ordenar
                </button>
                {showOrden && (
                  <div className="absolute right-0 top-9 bg-white border border-gray-100 rounded-xl shadow-lg z-30 min-w-[160px] py-1">
                    {ORDENES.map(o => (
                      <button key={o.key} onClick={() => { setOrden(o.key); setShowOrden(false) }}
                        className={`w-full text-left px-4 py-2.5 text-sm transition ${orden === o.key ? 'text-green-700 font-bold bg-green-50' : 'text-gray-600 hover:bg-gray-50'}`}>
                        {o.label}
                      </button>
                    ))}
                  </div>
                )}
              </div>
            </div>
          </div>

          {/* Grid */}
          {loadingState ? (
            <div className="grid grid-cols-2 md:grid-cols-3 lg:grid-cols-4 gap-4">
              {[...Array(8)].map((_, i) => <SkeletonCard key={i} />)}
            </div>
          ) : filtrados.length === 0 ? (
            <EstadoVacio query={query || cat || marca} onLimpiar={limpiar} />
          ) : (
            <>
              <div className="grid grid-cols-2 md:grid-cols-3 lg:grid-cols-4 gap-4">
                {filtrados.slice(0, visibles).map((p, idx) => (
                  <ProductCard key={p.codigo} p={p} badge={badgePara(p, idx)} onSelect={(prod) => openQuickView(prod, filtrados.slice(0, visibles))} />
                ))}
              </div>
              {visibles < filtrados.length && (
                <button onClick={() => setVisibles(v => v + 40)}
                  className="w-full py-3.5 bg-white hover:bg-gray-50 text-gray-700 font-semibold text-sm rounded-xl border border-gray-200 shadow-sm transition">
                  Ver más productos ({(filtrados.length - visibles).toLocaleString()} restantes)
                </button>
              )}
            </>
          )}
        </div>
      </div>

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
    </div>
  )
}

export default function ProductosPage() {
  return (
    <Suspense fallback={
      <div className="max-w-5xl mx-auto px-4 py-10">
        <div className="grid grid-cols-2 md:grid-cols-4 gap-4">
          {[...Array(8)].map((_, i) => <SkeletonCard key={i} />)}
        </div>
      </div>
    }>
      <ProductosContent />
    </Suspense>
  )
}

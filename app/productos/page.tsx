'use client'
import { useEffect, useState, useMemo, useRef, Suspense } from 'react'
import { useRouter, useSearchParams } from 'next/navigation'
import Link from 'next/link'
import { supabase } from '@/lib/supabase'
import { customSearch, sugerirCategorias } from '@/lib/search'
import { corregirTermino, registrarBusquedaFallida } from '@/lib/diccionarioBusqueda'
import { agregarItem, getCarrito, cambiarCantidad } from '@/lib/carrito'
import { toggleFavorito, esFavorito } from '@/lib/favoritos'
import { Producto, CAT_EMOJI } from '@/lib/types'
import { Search, X, ShoppingCart, Plus, Minus, ClipboardList, ArrowUpDown, Share2, ChevronRight } from 'lucide-react'
import { useAuth } from '@/context/AuthContext'
import { getPerfil } from '@/lib/perfil'
import QuickViewDrawer from '@/components/QuickViewDrawer'

function fmt(n: number) { return '$' + (n || 0).toFixed(2) }

// --- CONFIGURACIÓN DE VISUALIZACIÓN REVERSIBLE ---
const USE_QUICK_VIEW = true; // Cambiar a 'false' para deshabilitar el Bottom Sheet/Popup y volver al comportamiento original

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
// Solo señales reales (oferta verificada, stock bajo real) — sin "Popular" sintético:
// una insignia que no corresponde a un dato real es justo el tipo de decoración que
// resta seriedad y confianza a la tienda.
function Badge({ tipo }: { tipo: 'oferta' | 'ultimas' }) {
  const cfg = {
    oferta:  { label: 'Oferta',            cls: 'bg-rose-600 text-white' },
    ultimas: { label: 'Últimas unidades',  cls: 'bg-amber-600 text-white' },
  }[tipo]
  return (
    <span className={`absolute top-2 left-2 text-[9px] font-semibold px-1.5 py-0.5 rounded-md z-10 tracking-tight ${cfg.cls}`}>
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
        className="w-full py-2 rounded-lg text-xs font-bold flex items-center justify-center gap-1.5 active:scale-[0.96] transition-transform duration-75 bg-green-600 hover:bg-green-700 text-white">
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
        ${fav ? 'bg-green-600 text-white' : 'bg-white/90 text-gray-400 hover:text-green-600'}`}
      title={fav ? "Quitar de la lista" : "Añadir a la lista de compras"}
    >
      <ClipboardList size={13} />
    </button>
  )
}

// ── Card de producto ───────────────────────────────────────────────
function ProductCard({ p, onSelect, tiendasMap }: { p: Producto; onSelect?: (p: Producto) => void; tiendasMap?: Record<string, { nombre: string; logo_url?: string | null }> }) {
  const router = useRouter()
  const [imageError, setImageError] = useState(false)
  const agotado = p.stock <= 0
  const tieneOferta = p.en_oferta && p.precio_oferta && p.precio_oferta < p.precio_publico
  const badgeTipo = agotado ? undefined : (tieneOferta ? 'oferta' : (p.stock < 5 ? 'ultimas' : undefined))

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

  const tiendaInfo = p.tienda_id && tiendasMap ? tiendasMap[p.tienda_id] : null
  
  function getNombreCorto(completo: string) {
    if (!completo) return ''
    let s = completo.replace(/supermercados?|comisariatos?|librer[ií]a|farmacias?/gi, '').trim()
    const parts = s.split(' ')
    if (parts[0].toLowerCase() === 'el' || parts[0].toLowerCase() === 'la') {
      return parts.slice(0, 2).join(' ')
    }
    return parts[0]
  }
  
  const nombreTienda = tiendaInfo ? getNombreCorto(tiendaInfo.nombre) : ''

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
      <div className="relative bg-gradient-to-br from-gray-50 to-gray-100 h-36 flex items-center justify-center text-4xl overflow-hidden group-hover:from-green-50 group-hover:to-green-100 transition-colors w-full">
        {p.imagen_url && !imageError ? (
          <img
            src={p.imagen_url}
            alt={p.descripcion}
            onError={() => setImageError(true)}
            className="w-full h-full object-contain p-2 animate-fade-in"
            loading="lazy"
          />
        ) : (
          CAT_EMOJI[p.categoria] || '📦'
        )}
        {badgeTipo && <Badge tipo={badgeTipo} />}
        <BtnFavorito prod={p} />
        {(() => {
          const regex = /\b(\d+(?:\.\d+)?\s*(?:ml|l|g|kg|oz|u|unidades))\b/gi;
          const matches = p.descripcion.match(regex);
          const presVal = matches && matches.length > 0 ? matches[matches.length - 1] : '';
          return presVal ? (
            <div className="absolute bottom-2 left-2 bg-black/75 backdrop-blur-[2px] text-white text-[9px] font-black px-1.5 py-0.5 rounded-md tracking-wider uppercase z-20 shadow-sm border border-white/10 select-none">
              {presVal}
            </div>
          ) : null;
        })()}
        {cantidad === 0 && p.stock > 0 && (
          <button
            onClick={(e) => {
              e.stopPropagation()
              e.preventDefault()
              if (typeof navigator !== 'undefined' && navigator.vibrate) {
                navigator.vibrate(15)
              }
              agregarItem(p)
            }}
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

      <div className="p-2 flex-1 flex flex-col justify-between">
        <div className="flex-1">
          <div className="text-xs font-bold text-gray-800 leading-snug line-clamp-2 min-h-[32px] mb-0.5">{p.descripcion}</div>
          <div className="flex items-center gap-1.5 flex-wrap mt-0.5 min-h-[18px]">
            {p.marca && (
              <span className="text-[10px] text-gray-400 font-bold truncate">{p.marca}</span>
            )}
            {nombreTienda && (
              <span className="text-[8px] font-black text-green-700 bg-green-50 border border-green-200/50 px-1.5 py-0.5 rounded-md uppercase tracking-wide">
                {nombreTienda}
              </span>
            )}
          </div>
        </div>

        <div className="mt-2 space-y-1.5">
          {/* Precio */}
          {tieneOferta ? (
            <div className="flex items-baseline gap-1.5">
              <span className="text-sm font-black text-rose-600 tracking-tight">{fmt(p.precio_oferta!)}</span>
              <span className="text-[10px] text-gray-400 line-through font-semibold">{fmt(p.precio_publico)}</span>
            </div>
          ) : (
            <div className="text-sm font-black text-gray-900">{fmt(p.precio_publico)}</div>
          )}

          {/* Stepper de cantidad solo si cantidad > 0 */}
          {cantidad > 0 && (
            <div className="w-full animate-fade-in">
              {p.stock > 0 && <BtnAgregar prod={p} />}
            </div>
          )}
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
  const [queryCorregido, setQueryCorregido] = useState(queryInicial)
  const [cat, setCat]               = useState(catInicial)
  const [sub, setSub]               = useState(subInicial)
  const [tiendaId, setTiendaId]     = useState(params.get('tienda_id') || '')
  const [marca, setMarca]           = useState('')
  const [stockFiltro, setStockFiltro] = useState<'todos'|'disponible'>('disponible')
  const [orden, setOrden]           = useState<Orden>('relevancia')
  const [selectedProduct, setSelectedProduct] = useState<Producto | null>(null)
  const [activeList, setActiveList] = useState<Producto[]>([])
  const [tiendasMap, setTiendasMap] = useState<Record<string, { nombre: string; logo_url?: string | null }>>({})

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

  // Obtener tiendas y el ID de La Crayola
  useEffect(() => {
    supabase.from('ol_tiendas')
      .select('id, nombre, logo_url')
      .then(({ data }) => {
        if (data) {
          const map: Record<string, { nombre: string; logo_url?: string | null }> = {}
          data.forEach((t: any) => {
            map[t.id] = { nombre: t.nombre, logo_url: t.logo_url }
            if (t.nombre.toLowerCase().includes('crayola')) {
              setCrayolaId(t.id)
            }
          })
          setTiendasMap(map)
        }
      })
  }, [])

  const paramsStr = params.toString()
  useEffect(() => {
    setCat(params.get('cat') || '')
    setSub(params.get('sub') || '')
    setTiendaId(params.get('tienda_id') || '')
    setSoloFrecuentes(params.get('frecuentes') === 'true')
    const q = params.get('q') || ''
    setQuery(q)
    setMarca(params.get('marca') || '')
    setVisibles(40)
  }, [paramsStr])

  // Corregir faltas ortográficas frecuentes (asucar -> azucar, aseite -> aceite, etc.)
  // usando el diccionario de variantes antes de buscar. Si una palabra no está
  // catalogada, se deja igual — customSearch ya tolera errores menores.
  useEffect(() => {
    let vigente = true
    const q = query.trim()
    if (!q) { setQueryCorregido(''); return }
    corregirTermino(q).then(corregido => { if (vigente) setQueryCorregido(corregido) })
    return () => { vigente = false }
  }, [query])

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
      setLoading(false)
    }
    cargar()
  }, [])

  const filtrados = useMemo(() => {
    const q = queryCorregido.trim()
    let pool = q.length >= 2 ? customSearch(base, q) : [...base]
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
  }, [base, queryCorregido, cat, sub, tiendaId, crayolaId, marca, stockFiltro, orden, soloFrecuentes, frecuentesCodigos])

  // Búsquedas relacionadas (estilo "연관검색어" de Coupang): fila horizontal debajo
  // de los resultados, solo cuando hay un texto de búsqueda activo.
  const busquedasRelacionadas = useMemo(() => {
    const term = queryCorregido.trim()
    if (term.length < 2) return []
    return sugerirCategorias(customSearch(base, term), term, 8)
  }, [base, queryCorregido])

  // Si ni siquiera con la corrección de faltas ortográficas hubo resultados,
  // se registra para revisión manual (tabla ol_busquedas_sin_resultado).
  useEffect(() => {
    const q = query.trim()
    if (loadingState || q.length < 2) return
    if (filtrados.length === 0) {
      registrarBusquedaFallida(q)
    }
  }, [filtrados.length, query, loadingState])

  function irABusquedaRelacionada(s: { cat: string; sub: string }) {
    const paramsNew = new URLSearchParams()
    if (query.trim()) paramsNew.set('q', query.trim())
    if (s.cat) paramsNew.set('cat', s.cat)
    if (s.sub) paramsNew.set('sub', s.sub)
    router.push(`/productos?${paramsNew.toString()}`)
  }

  const porTienda = useMemo(() => {
    if ((!query.trim() && !cat) || tiendaId) return null
    const groups: Record<string, Producto[]> = {}
    filtrados.forEach(p => {
      const tId = p.tienda_id || crayolaId || 'crayola'
      if (!groups[tId]) groups[tId] = []
      groups[tId].push(p)
    })
    return Object.entries(groups).map(([tId, prods]) => {
      const info = tiendasMap[tId] || { nombre: tId === crayolaId ? 'La Crayola' : 'Tienda Aliada', logo_url: null }
      return {
        id: tId,
        nombre: info.nombre,
        logo_url: info.logo_url,
        productos: prods
      }
    })
  }, [filtrados, query, cat, tiendaId, tiendasMap, crayolaId])

  const catsCtx = useMemo(() => {
    const q = queryCorregido.trim()
    let pool = q.length >= 2 ? customSearch(base, q) : base
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
  }, [base, queryCorregido, tiendaId, crayolaId, marca, stockFiltro, soloFrecuentes, frecuentesCodigos])

  const marcasCtx = useMemo(() => {
    const q = queryCorregido.trim()
    let pool = q.length >= 2 ? customSearch(base, q) : base
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
  }, [base, queryCorregido, cat, tiendaId, crayolaId, stockFiltro, soloFrecuentes, frecuentesCodigos])

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
                      <span>{c}</span>
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


          {/* Barra estado + ordenamiento — los chips de categoría/marca/stock se quitaron:
              quedaban redundantes con la fila de "Relacionado" y ocupaban demasiado espacio
              antes del primer producto visible. La única señal de filtro activo que queda
              es el enlace "Quitar filtro", minimalista. */}
          <div className="flex items-center justify-between flex-wrap gap-1.5">
            <div className="flex items-center gap-1.5 flex-wrap">
              {(soloFrecuentes || cat || sub || marca) && (
                <button
                  onClick={() => {
                    setCat(''); setSub(''); setMarca('')
                    const paramsNew = new URLSearchParams(params.toString())
                    paramsNew.delete('frecuentes'); paramsNew.delete('cat'); paramsNew.delete('sub'); paramsNew.delete('marca')
                    router.push(`/productos?${paramsNew.toString()}`)
                  }}
                  className="flex items-center gap-1 text-[11px] font-medium text-gray-500 hover:text-gray-800 transition"
                >
                  {[cat, sub, marca].filter(Boolean).join(' · ') || 'Frecuentes'}
                  <X size={11} />
                </button>
              )}
            </div>
            <div className="flex items-center gap-2 ml-auto">
              {!loadingState && (
                <p className="text-xs text-gray-400">{filtrados.length.toLocaleString()} productos</p>
              )}
              {(cat || sub || marca || query) && (
                <button onClick={compartirFiltros} className="flex items-center justify-center w-7 h-7 rounded-lg text-gray-400 hover:text-[#25D366] hover:bg-gray-50 transition shrink-0" title="Compartir sección por WhatsApp">
                  <svg viewBox="0 0 24 24" className="w-4 h-4 fill-current">
                    <path d="M17.472 14.382c-.297-.149-1.758-.867-2.03-.967-.273-.099-.471-.148-.67.15-.197.297-.767.966-.94 1.164-.173.199-.347.223-.644.075-.297-.15-1.255-.463-2.39-1.475-.883-.788-1.48-1.761-1.653-2.059-.173-.297-.018-.458.13-.606.134-.133.298-.347.446-.52.149-.174.198-.298.298-.497.099-.198.05-.371-.025-.52-.075-.149-.669-1.612-.916-2.207-.242-.579-.487-.5-.669-.51-.173-.008-.371-.01-.57-.01-.198 0-.52.074-.792.372-.272.297-1.04 1.016-1.04 2.479 0 1.462 1.065 2.875 1.213 3.074.149.198 2.096 3.2 5.077 4.487.709.306 1.262.489 1.694.625.712.227 1.36.195 1.871.118.571-.085 1.758-.719 2.006-1.413.248-.694.248-1.289.173-1.413-.074-.124-.272-.198-.57-.347m-5.421 7.403h-.004a9.87 9.87 0 01-5.031-1.378l-.361-.214-3.741.982.998-3.648-.235-.374a9.86 9.86 0 01-1.51-5.26c.001-5.45 4.436-9.884 9.888-9.884 2.64 0 5.122 1.03 6.988 2.898a9.825 9.825 0 012.893 6.994c-.003 5.45-4.437 9.884-9.885 9.884m8.413-18.297A11.815 11.815 0 0012.05 0C5.495 0 .16 5.335.157 11.892c0 2.096.547 4.142 1.588 5.945L.057 24l6.305-1.654a11.882 11.882 0 005.683 1.448h.005c6.554 0 11.89-5.335 11.893-11.893a11.821 11.821 0 00-3.48-8.413z"/>
                  </svg>
                </button>
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

          {/* Búsquedas relacionadas — pegada justo debajo del header al hacer
              scroll, para que el cliente siga refinando sin subir de nuevo */}
          {busquedasRelacionadas.length > 0 && (
            <div
              className="sticky z-30 flex items-center gap-2 overflow-x-auto scrollbar-hide py-2 -mx-3 px-3 md:mx-0 md:px-0 bg-paper/95 backdrop-blur-sm -mt-2"
              style={{ top: 'var(--header-h, 96px)' }}
            >
              <span className="text-xs text-gray-400 shrink-0">Relacionado:</span>
              {busquedasRelacionadas.map(s => (
                <button
                  key={`${s.cat}-${s.sub}`}
                  onClick={() => irABusquedaRelacionada(s)}
                  className="shrink-0 text-xs font-medium text-emerald-800 bg-emerald-50 hover:bg-emerald-100 border border-emerald-100 px-3 py-1.5 rounded-full transition cursor-pointer"
                >
                  {s.label}
                </button>
              ))}
            </div>
          )}

          {/* Grid */}
          {loadingState ? (
            <div className="grid grid-cols-2 md:grid-cols-3 lg:grid-cols-4 gap-1.5 md:gap-4">
              {[...Array(8)].map((_, i) => <SkeletonCard key={i} />)}
            </div>
          ) : filtrados.length === 0 ? (
            <EstadoVacio query={query || cat || marca} onLimpiar={limpiar} />
          ) : porTienda ? (
            <div className="space-y-6">
              {porTienda.map((group) => {
                if (group.productos.length === 0) return null
                return (
                  <div key={group.id} className="space-y-3 bg-white border border-gray-100 rounded-2xl p-4 shadow-sm animate-fade-in">
                    {/* Header de la Tienda */}
                    <div className="flex items-center justify-between border-b border-gray-50 pb-3">
                      <div className="flex items-center gap-3 min-w-0">
                        <div className="w-10 h-10 bg-green-50 rounded-xl flex items-center justify-center text-xl shrink-0 overflow-hidden border border-gray-100">
                          {group.logo_url ? (
                            <img src={group.logo_url} alt={group.nombre} className="w-7 h-7 object-contain" />
                          ) : (
                            '🏪'
                          )}
                        </div>
                        <div className="min-w-0">
                          <h3 className="font-extrabold text-gray-800 text-sm truncate">{group.nombre}</h3>
                          <p className="text-[10px] text-gray-400 mt-0.5">Entrega: en 1 hr · {group.productos.length} resultados</p>
                        </div>
                      </div>
                      <Link
                        href={`/tiendas/${group.id}?q=${encodeURIComponent(query.trim())}`}
                        className="text-xs text-green-700 font-bold flex items-center gap-0.5 hover:underline shrink-0"
                      >
                        Ver más <ChevronRight size={13} />
                      </Link>
                    </div>

                    {/* Fila Horizontal de Productos */}
                    <div className="flex gap-3 overflow-x-auto pb-2 scrollbar-hide -mx-2 px-2">
                      {group.productos.slice(0, 15).map((p) => (
                        <div key={p.codigo} className="w-[145px] md:w-[170px] shrink-0">
                          <ProductCard
                            p={p}
                            tiendasMap={tiendasMap}
                            onSelect={(prod) => openQuickView(prod, group.productos.slice(0, 15))}
                          />
                        </div>
                      ))}
                    </div>
                  </div>
                )
              })}
            </div>
          ) : (
            <>
              <div className="grid grid-cols-2 md:grid-cols-3 lg:grid-cols-4 gap-1.5 md:gap-4">
                {filtrados.slice(0, visibles).map((p) => (
                  <ProductCard key={p.codigo} p={p} tiendasMap={tiendasMap} onSelect={(prod) => openQuickView(prod, filtrados.slice(0, visibles))} />
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
        <div className="grid grid-cols-2 md:grid-cols-4 gap-1.5 md:gap-4">
          {[...Array(8)].map((_, i) => <SkeletonCard key={i} />)}
        </div>
      </div>
    }>
      <ProductosContent />
    </Suspense>
  )
}

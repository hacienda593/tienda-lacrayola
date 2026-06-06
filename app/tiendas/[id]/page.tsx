'use client'
import { useEffect, useState, useMemo, useRef, Suspense } from 'react'
import { useParams, useRouter, useSearchParams } from 'next/navigation'
import { supabase } from '@/lib/supabase'
import { agregarItem, getCarrito, cambiarCantidad } from '@/lib/carrito'
import { toggleFavorito, esFavorito } from '@/lib/favoritos'
import { OlTienda, Producto } from '@/lib/types'
import Fuse from 'fuse.js'
import {
  ArrowLeft, Search, ShoppingCart, Plus, Minus,
  Heart, Store, MapPin, Loader2, X, Share2,
} from 'lucide-react'

function fmt(n: number) { return '$' + (n || 0).toFixed(2) }

const CAT_EMOJI: Record<string, string> = {
  'Escolar':'📚','Arte':'🎨','Oficina':'🖊️','Tecnologia':'💻','Juguetes':'🧸',
  'Manualidades':'✂️','Libros':'📖','Pintura':'🖌️','Papeleria':'📄',
  'Alimentos':'🥦','Bebidas':'🥤','Limpieza':'🧹','Higiene':'🧴',
  'Farmacia':'💊','Electronicos':'💡','Ropa':'👕',
  'Abarrotes':'🥬','Bebidas y Licores':'🥤','Congelados y Refrigerados':'❄️',
  'Golosinas y Snacks':'🍪','Panadería':'🍞','Cuidado Personal':'🧴',
  'Hogar y Limpieza':'🧹','Mascotas':'🐶','Huevos Lácteos y Leches':'🥛',
}

function BtnAgregar({ prod, tiendaId, tiendaNombre }: { prod: Producto; tiendaId: string; tiendaNombre: string }) {
  const [cantidad, setCantidad] = useState(() => {
    return getCarrito().find(i => i.codigo === prod.codigo)?.cantidad ?? 0
  })

  function agregar(e: React.MouseEvent) {
    e.stopPropagation(); e.preventDefault()
    agregarItem({ ...prod, precio_publico: prod.precio_publico }, 1)
    // Guardar tienda_id en localStorage del item
    const items = getCarrito()
    const idx = items.findIndex(i => i.codigo === prod.codigo)
    if (idx >= 0) {
      items[idx].tienda_id    = tiendaId
      items[idx].tienda_nombre = tiendaNombre
      localStorage.setItem('lc_carrito', JSON.stringify(items))
      window.dispatchEvent(new Event('carrito-update'))
    }
    setCantidad(c => c + 1)
  }

  function cambiar(e: React.MouseEvent, delta: number) {
    e.stopPropagation(); e.preventDefault()
    const nueva = cantidad + delta
    cambiarCantidad(prod.codigo, nueva)
    setCantidad(Math.max(0, nueva))
  }

  if (cantidad === 0) return (
    <button onClick={agregar}
      className="w-full py-2 rounded-lg text-xs font-bold flex items-center justify-center gap-1.5 bg-green-50 text-green-700 border border-green-200 hover:bg-green-600 hover:text-white hover:border-transparent transition">
      <ShoppingCart size={12} /> Agregar
    </button>
  )

  return (
    <div className="flex items-center justify-between bg-green-600 rounded-lg overflow-hidden">
      <button onClick={e => cambiar(e, -1)} className="px-3 py-2 text-white hover:bg-green-700 transition font-bold"><Minus size={12} /></button>
      <span className="text-white text-xs font-bold">{cantidad}</span>
      <button onClick={e => cambiar(e, +1)} className="px-3 py-2 text-white hover:bg-green-700 transition font-bold"><Plus size={12} /></button>
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
        ${fav ? 'bg-red-500 text-white' : 'bg-white/90 text-gray-300 hover:text-red-400'}`}>
      <Heart size={13} className={fav ? 'fill-white' : ''} />
    </button>
  )
}

function ImagenProducto({ src, categoria, alt }: { src?: string | null; categoria: string; alt: string }) {
  const [error, setError] = useState(false)
  const emoji = CAT_EMOJI[categoria] || '📦'

  if (!src || error) return <span className="text-4xl select-none">{emoji}</span>

  return (
    <img
      src={src}
      alt={alt}
      onError={() => setError(true)}
      className="w-full h-full object-contain p-1.5"
      loading="lazy"
    />
  )
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
  const [drawerOpen, setDrawerOpen] = useState(false)
  const [visibles, setVisibles] = useState(40)
  const fuseRef = useRef<Fuse<Producto> | null>(null)

  function compartirFiltros() {
    const params = new URLSearchParams()
    if (cat) params.set('cat', cat)
    if (sub) params.set('sub', sub)
    if (marca) params.set('marca', marca)
    const url = `${window.location.origin}${window.location.pathname}?${params.toString()}`
    
    // Copiar al portapapeles
    navigator.clipboard.writeText(url)
    
    // Abrir WhatsApp
    const texto = `Hola, te comparto los productos de esta sección: ${url}`
    window.open(`https://api.whatsapp.com/send?text=${encodeURIComponent(texto)}`, '_blank')
  }

  // Escuchar el evento del menu inferior movil para abrir filtros
  useEffect(() => {
    const handleOpen = () => setDrawerOpen(true)
    window.addEventListener('open-store-filters', handleOpen)
    return () => window.removeEventListener('open-store-filters', handleOpen)
  }, [])

  // Sincronizar estado local con query params de la URL
  useEffect(() => {
    setCat(searchParams.get('cat') || '')
    setSub(searchParams.get('sub') || '')
    setMarca(searchParams.get('marca') || '')
    setVisibles(40)
  }, [searchParams])

  useEffect(() => {
    async function cargar() {
      const { data: t } = await supabase.from('ol_tiendas').select('*').eq('id', id).single()
      if (!t) {
        setCargando(false)
        return
      }
      setTienda(t as OlTienda)

      const esCrayola = t.nombre.toLowerCase().includes('crayola')

      let pQuery = supabase.from('ol_productos')
        .select('codigo,descripcion,categoria,subcategoria,marca,stock,stock_minimo,precio_publico,precio_con_iva,tienda_id,imagen_url')
        .gt('precio_publico', 0)
        .order('descripcion')

      if (esCrayola) {
        pQuery = pQuery.or(`tienda_id.eq.${id},tienda_id.is.null`)
      } else {
        pQuery = pQuery.eq('tienda_id', id)
      }

      const { data: ps } = await pQuery
      const prods = (ps ?? []) as Producto[]
      setBase(prods)
      fuseRef.current = new Fuse(prods, {
        keys: [{ name: 'descripcion', weight: 0.7 }, { name: 'marca', weight: 0.3 }],
        threshold: 0.35, ignoreLocation: true, minMatchCharLength: 2,
      })
      setCargando(false)
    }
    cargar()
  }, [id])

  const cats = useMemo(() => {
    const map = new Map<string, number>()
    base.filter(p => p.stock > 0).forEach(p => { if (p.categoria) map.set(p.categoria, (map.get(p.categoria) ?? 0) + 1) })
    return Array.from(map.entries()).sort((a, b) => b[1] - a[1])
  }, [base])

  const filtrados = useMemo(() => {
    let pool = q.length >= 2 && fuseRef.current
      ? fuseRef.current.search(q).map(r => r.item)
      : base.filter(p => p.stock > 0)
    if (cat) pool = pool.filter(p => p.categoria === cat)
    if (sub) pool = pool.filter(p => p.subcategoria === sub)
    if (marca) pool = pool.filter(p => p.marca === marca)
    return pool
  }, [base, q, cat, sub, marca])

  // Subcategorias dinamicas de la categoria seleccionada
  const subcats = useMemo(() => {
    if (!cat) return []
    const map = new Map<string, number>()
    base.filter(p => p.stock > 0 && p.categoria === cat).forEach(p => {
      if (p.subcategoria) map.set(p.subcategoria, (map.get(p.subcategoria) ?? 0) + 1)
    })
    return Array.from(map.entries()).sort((a, b) => b[1] - a[1])
  }, [base, cat])

  // Marcas dinamicas
  const marcas = useMemo(() => {
    const map = new Map<string, number>()
    const pool = cat ? base.filter(p => p.stock > 0 && p.categoria === cat) : base.filter(p => p.stock > 0)
    pool.forEach(p => {
      if (p.marca) map.set(p.marca, (map.get(p.marca) ?? 0) + 1)
    })
    return Array.from(map.entries()).sort((a, b) => b[1] - a[1])
  }, [base, cat])

  function limpiarFiltros() {
    setCat('')
    setSub('')
    setMarca('')
    setVisibles(40)
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
    <div className="max-w-5xl mx-auto px-4 py-5 space-y-5">

      {/* Header tienda */}
      <div className="flex items-center gap-3">
        <button onClick={() => router.back()} className="p-2 hover:bg-gray-100 rounded-xl transition shrink-0">
          <ArrowLeft size={18} className="text-gray-600" />
        </button>
        <div className="flex items-center gap-3 flex-1 min-w-0">
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
      </div>

      {/* Buscador */}
      <div className="relative">
        <Search size={15} className="absolute left-3 top-1/2 -translate-y-1/2 text-gray-400" />
        <input value={q} onChange={e => { setQ(e.target.value); setCat(''); setVisibles(40) }}
          placeholder={`Buscar en ${tienda.nombre}...`}
          className="w-full bg-white border border-gray-200 rounded-xl pl-10 pr-10 py-3 text-sm text-gray-800 placeholder-gray-400 focus:outline-none focus:border-green-500 shadow-sm" />
        {q && (
          <button onClick={() => setQ('')} className="absolute right-3 top-1/2 -translate-y-1/2 text-gray-400 hover:text-gray-600">
            <X size={15} />
          </button>
        )}
      </div>

      <div className="flex flex-col md:flex-row gap-6 items-start">
        {/* ── SIDEBAR filtros (desktop) ── */}
        <aside className="hidden md:block w-52 shrink-0 space-y-5 bg-white border border-gray-100 rounded-2xl p-4 shadow-sm">
          {!cat ? (
            // Nivel 1: Lista de Categorías
            <div className="space-y-1">
              <p className="text-[10px] font-bold text-gray-400 uppercase tracking-wider mb-2">Selecciona un Pasillo</p>
              {cats.map(([c, count]) => (
                <button
                  key={c}
                  onClick={() => { setCat(c); setSub(''); setMarca(''); setVisibles(40) }}
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
                onClick={() => { setCat(''); setSub(''); setMarca(''); setVisibles(40) }}
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
                          onClick={() => { setSub(esActiva ? '' : s); setVisibles(40) }}
                          className={`w-full text-left px-3 py-1.5 rounded-xl text-xs font-bold transition flex items-center justify-between border
                            ${esActiva 
                              ? 'bg-teal-50 border-teal-200 text-teal-700' 
                              : 'bg-white border-gray-100 text-gray-600 hover:bg-gray-50'}`}
                        >
                          <span className="truncate max-w-[100px]">📂 {s}</span>
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
                          onClick={() => { setMarca(esActiva ? '' : m); setVisibles(40) }}
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
        </aside>

        {/* ── CONTENIDO PRINCIPAL ── */}
        <div className="flex-1 min-w-0 space-y-4">
          {/* Filtros activos */}
          {(cat || sub || marca) && (
            <div className="flex items-center gap-2 flex-wrap text-xs">
              {cat && (
                <span className="flex items-center gap-1 bg-green-50 text-green-700 font-semibold px-2.5 py-1 rounded-full border border-green-200">
                  {CAT_EMOJI[cat] || ''} {cat}
                  <button onClick={() => { setCat(''); setSub(''); setMarca(''); setVisibles(40) }} className="hover:text-green-950 font-bold"><X size={12} /></button>
                </span>
              )}
              {sub && (
                <span className="flex items-center gap-1 bg-teal-50 text-teal-700 font-semibold px-2.5 py-1 rounded-full border border-teal-200">
                  📂 {sub}
                  <button onClick={() => { setSub(''); setVisibles(40) }} className="hover:text-teal-950 font-bold"><X size={12} /></button>
                </span>
              )}
              {marca && (
                <span className="flex items-center gap-1 bg-purple-50 text-purple-700 font-semibold px-2.5 py-1 rounded-full border border-purple-200">
                  🏷️ {marca}
                  <button onClick={() => { setMarca(''); setVisibles(40) }} className="hover:text-purple-950 font-bold"><X size={12} /></button>
                </span>
              )}
              <button onClick={limpiarFiltros} className="text-[10px] text-gray-400 hover:text-gray-600 underline">
                Limpiar todos
              </button>
              <button onClick={compartirFiltros} className="flex items-center justify-center bg-[#25D366] hover:bg-[#20c05a] text-white w-9 h-9 rounded-xl shadow-sm transition ml-auto shrink-0 relative group" title="Compartir sección por WhatsApp">
                <svg viewBox="0 0 24 24" className="w-5 h-5 fill-white">
                  <path d="M17.472 14.382c-.297-.149-1.758-.867-2.03-.967-.273-.099-.471-.148-.67.15-.197.297-.767.966-.94 1.164-.173.199-.347.223-.644.075-.297-.15-1.255-.463-2.39-1.475-.883-.788-1.48-1.761-1.653-2.059-.173-.297-.018-.458.13-.606.134-.133.298-.347.446-.52.149-.174.198-.298.298-.497.099-.198.05-.371-.025-.52-.075-.149-.669-1.612-.916-2.207-.242-.579-.487-.5-.669-.51-.173-.008-.371-.01-.57-.01-.198 0-.52.074-.792.372-.272.297-1.04 1.016-1.04 2.479 0 1.462 1.065 2.875 1.213 3.074.149.198 2.096 3.2 5.077 4.487.709.306 1.262.489 1.694.625.712.227 1.36.195 1.871.118.571-.085 1.758-.719 2.006-1.413.248-.694.248-1.289.173-1.413-.074-.124-.272-.198-.57-.347m-5.421 7.403h-.004a9.87 9.87 0 01-5.031-1.378l-.361-.214-3.741.982.998-3.648-.235-.374a9.86 9.86 0 01-1.51-5.26c.001-5.45 4.436-9.884 9.888-9.884 2.64 0 5.122 1.03 6.988 2.898a9.825 9.825 0 012.893 6.994c-.003 5.45-4.437 9.884-9.885 9.884m8.413-18.297A11.815 11.815 0 0012.05 0C5.495 0 .16 5.335.157 11.892c0 2.096.547 4.142 1.588 5.945L.057 24l6.305-1.654a11.882 11.882 0 005.683 1.448h.005c6.554 0 11.89-5.335 11.893-11.893a11.821 11.821 0 00-3.48-8.413z"/>
                </svg>
                <div className="absolute -top-1 -right-1 bg-white text-[#25D366] rounded-full p-0.5 border border-green-500 shadow-sm flex items-center justify-center">
                  <Share2 size={8} className="stroke-[3]" />
                </div>
              </button>
            </div>
          )}

          {/* Contador */}
          <p className="text-xs text-gray-400">{filtrados.length} productos disponibles</p>

          {/* Grid productos */}
          {filtrados.length === 0 ? (
            <div className="text-center py-16 space-y-2">
              <div className="text-5xl">🔍</div>
              <p className="text-gray-500 font-medium">Sin productos con ese filtro</p>
              <button onClick={() => { setQ(''); limpiarFiltros() }} className="text-sm text-green-600 underline">Limpiar</button>
            </div>
          ) : (
            <>
              <div className="grid grid-cols-2 md:grid-cols-2 lg:grid-cols-3 gap-4">
                {filtrados.slice(0, visibles).map(p => (
                  <div key={p.codigo}
                    onClick={() => router.push(`/producto/${encodeURIComponent(p.codigo)}`)}
                    className="bg-white rounded-2xl border border-gray-100 p-3.5 shadow-sm hover:shadow-md hover:-translate-y-0.5 transition-all flex flex-col cursor-pointer group">
                    <div className="relative bg-gradient-to-br from-gray-50 to-gray-100 rounded-xl h-28 flex items-center justify-center mb-3 text-4xl overflow-hidden group-hover:from-green-50 group-hover:to-green-100 transition-colors">
                      <ImagenProducto src={p.imagen_url} categoria={p.categoria} alt={p.descripcion} />
                      <BtnFavorito prod={p} />
                      {p.stock > 0 && p.stock < 5 && (
                        <span className="absolute top-2 left-2 text-[9px] font-bold bg-orange-500 text-white px-2 py-0.5 rounded-full">
                          ⚡ Últimas
                        </span>
                      )}
                    </div>
                    <div className="flex-1">
                      <div className="text-[10px] font-semibold text-green-600 uppercase tracking-wide mb-0.5">{p.categoria}</div>
                      <div className="text-xs font-semibold text-gray-800 leading-snug line-clamp-2 mb-1">{p.descripcion}</div>
                      {p.marca && <div className="text-[10px] text-gray-400">{p.marca}</div>}
                    </div>
                    <div className="mt-2.5">
                      <div className="text-lg font-extrabold text-gray-900 mb-1.5">{fmt(p.precio_publico)}</div>
                      <BtnAgregar prod={p} tiendaId={tienda.id} tiendaNombre={tienda.nombre} />
                    </div>
                  </div>
                ))}
              </div>
              {visibles < filtrados.length && (
                <button onClick={() => setVisibles(v => v + 40)}
                  className="w-full py-3.5 bg-white hover:bg-gray-50 text-gray-700 font-semibold text-sm rounded-xl border border-gray-200 shadow-sm transition">
                  Ver más ({filtrados.length - visibles} restantes)
                </button>
              )}
            </>
          )}
        </div>
      </div>

      {/* Drawer de Filtros Lateral Izquierdo */}
      {drawerOpen && (
        <>
          {/* Overlay */}
          <div
            onClick={() => setDrawerOpen(false)}
            className="fixed inset-0 bg-black/50 z-[60] transition-opacity duration-300 animate-fade-in"
          />
          
          {/* Panel */}
          <div className="fixed inset-y-0 left-0 w-[280px] bg-white z-[70] shadow-2xl flex flex-col transition-transform duration-300 animate-slide-in-left">
            
            {/* Header Drawer */}
            <div className="flex items-center justify-between px-4 py-4 border-b border-gray-100">
              <span className="font-extrabold text-gray-800 text-sm">Pasillos y Filtros</span>
              <button onClick={() => setDrawerOpen(false)} className="p-1 hover:bg-gray-100 rounded-lg text-gray-500 transition">
                <X size={16} />
              </button>
            </div>

            {/* Contenido */}
            <div className="flex-1 overflow-y-auto p-4 space-y-5">
              {!cat ? (
                // Nivel 1: Lista de Categorías
                <div className="space-y-1">
                  <p className="text-[10px] font-bold text-gray-400 uppercase tracking-wider mb-2">Selecciona un Pasillo</p>
                  {cats.map(([c, count]) => (
                    <button
                      key={c}
                      onClick={() => { setCat(c); setSub(''); setMarca(''); setVisibles(40) }}
                      className="w-full text-left px-3 py-2.5 rounded-xl text-xs font-bold text-gray-700 hover:bg-green-50 hover:text-green-700 transition flex items-center justify-between border border-transparent hover:border-green-100"
                    >
                      <span className="flex items-center gap-2">
                        <span className="text-sm">{CAT_EMOJI[c] || '📦'}</span>
                        <span>{c}</span>
                      </span>
                      <span className="text-[10px] bg-gray-100 text-gray-500 px-2 py-0.5 rounded-full font-bold">{count}</span>
                    </button>
                  ))}
                </div>
              ) : (
                // Nivel 2: Subcategorías y Marcas de la categoría seleccionada
                <div className="space-y-5">
                  
                  {/* Botón Volver */}
                  <button
                    onClick={() => { setCat(''); setSub(''); setMarca(''); setVisibles(40) }}
                    className="w-full py-2 bg-gray-50 hover:bg-gray-100 text-gray-600 border border-gray-200 rounded-xl text-[11px] font-bold transition flex items-center justify-center gap-1.5"
                  >
                    ← Todos los pasillos
                  </button>

                  {/* Pasillo Activo */}
                  <div>
                    <span className="text-[10px] font-bold text-gray-400 uppercase tracking-wider block mb-1">Pasillo seleccionado</span>
                    <div className="text-sm font-black text-green-700 bg-green-50 border border-green-100 rounded-xl px-3 py-2.5 flex items-center gap-2">
                      <span>{CAT_EMOJI[cat] || '📦'}</span>
                      <span>{cat}</span>
                    </div>
                  </div>

                  {/* Lista de Subcategorías (si hay) */}
                  {subcats.length > 0 && (
                    <div>
                      <p className="text-[10px] font-bold text-gray-400 uppercase tracking-wider mb-2">Subcategorías</p>
                      <div className="space-y-1">
                        {subcats.map(([s, count]) => {
                          const esActiva = sub === s
                          return (
                            <button
                              key={s}
                              onClick={() => { setSub(esActiva ? '' : s); setVisibles(40) }}
                              className={`w-full text-left px-3 py-2 rounded-xl text-xs font-bold transition flex items-center justify-between border
                                ${esActiva 
                                  ? 'bg-teal-50 border-teal-200 text-teal-700' 
                                  : 'bg-white border-gray-100 text-gray-600 hover:bg-gray-50'}`}
                            >
                              <span>📂 {s}</span>
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
                      <div className="space-y-1 max-h-56 overflow-y-auto pr-1">
                        {marcas.map(([m, count]) => {
                          const esActiva = marca === m
                          return (
                            <button
                              key={m}
                              onClick={() => { setMarca(esActiva ? '' : m); setVisibles(40) }}
                              className={`w-full text-left px-3 py-2 rounded-xl text-xs font-bold transition flex items-center justify-between border
                                ${esActiva 
                                  ? 'bg-purple-50 border-purple-200 text-purple-700' 
                                  : 'bg-white border-gray-100 text-gray-600 hover:bg-gray-50'}`}
                            >
                              <span>🏷️ {m}</span>
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

            {/* Footer Drawer */}
            <div className="p-4 border-t border-gray-100 bg-gray-50 flex gap-2 shrink-0">
              <button
                onClick={limpiarFiltros}
                disabled={!cat && !sub && !marca}
                className="flex-1 py-3 border border-gray-200 bg-white hover:bg-gray-50 text-gray-600 text-xs font-bold rounded-xl transition disabled:opacity-50"
              >
                Limpiar
              </button>
              <button
                onClick={() => setDrawerOpen(false)}
                className="flex-1 py-3 bg-green-600 hover:bg-green-700 text-white text-xs font-bold rounded-xl transition shadow-md"
              >
                Ver {filtrados.length} productos
              </button>
            </div>

          </div>
        </>
      )}

      <style>{`
        @keyframes fadeIn {
          from { opacity: 0; }
          to { opacity: 1; }
        }
        @keyframes slideInLeft {
          from { transform: translateX(-100%); }
          to { transform: translateX(0); }
        }
        .animate-fade-in {
          animation: fadeIn 0.2s ease-out forwards;
        }
        .animate-slide-in-left {
          animation: slideInLeft 0.25s cubic-bezier(0.16, 1, 0.3, 1) forwards;
        }
      `}</style>
    </div>
  )
}

export default function TiendaPage() {
  return (
    <Suspense fallback={
      <div className="max-w-5xl mx-auto px-4 py-16 flex justify-center">
        <Loader2 size={28} className="animate-spin text-green-500" />
      </div>
    }>
      <TiendaContent />
    </Suspense>
  )
}

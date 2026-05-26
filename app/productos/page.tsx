'use client'
import { useEffect, useState, useMemo, useRef, Suspense } from 'react'
import { useSearchParams } from 'next/navigation'
import Fuse from 'fuse.js'
import { supabase } from '@/lib/supabase'
import { agregarItem } from '@/lib/carrito'
import { Producto } from '@/lib/types'
import { Search, X, ShoppingCart, Check } from 'lucide-react'

function fmt(n: number) { return '$' + (n || 0).toFixed(2) }

const CAT_EMOJI: Record<string, string> = {
  'Escolar':'📚','Arte':'🎨','Oficina':'🖊️','Tecnologia':'💻','Juguetes':'🧸',
  'Manualidades':'✂️','Libros':'📖','Pintura':'🖌️','Papeleria':'📄',
}

function BtnAgregar({ prod }: { prod: Producto }) {
  const [ok, setOk] = useState(false)
  function handleClick(e: React.MouseEvent) {
    e.stopPropagation()
    agregarItem(prod)
    setOk(true)
    setTimeout(() => setOk(false), 1200)
  }
  return (
    <button onClick={handleClick}
      className={`w-full py-2 rounded-lg text-xs font-bold flex items-center justify-center gap-1.5 transition mt-auto
        ${ok ? 'bg-green-600 text-white' : 'bg-green-50 text-green-700 border border-green-200 hover:bg-green-600 hover:text-white hover:border-transparent'}`}>
      {ok ? <><Check size={12}/>¡Agregado!</> : <><ShoppingCart size={12}/>Agregar</>}
    </button>
  )
}

function ProductosContent() {
  const params = useSearchParams()
  const catInicial   = params.get('cat') || ''
  const queryInicial = params.get('q')   || ''

  const [base, setBase]     = useState<Producto[]>([])
  const [loadingState, setLoadingState] = useState(true)
  const [query, setQuery]   = useState(queryInicial)
  const [cat, setCat]       = useState(catInicial)
  const [marca, setMarca]   = useState('')
  const [stockFiltro, setStockFiltro] = useState<'todos'|'disponible'>('disponible')
  const [visibles, setVisibles] = useState(40)
  const fuseRef = useRef<Fuse<Producto> | null>(null)

  // Carga única
  useEffect(() => {
    async function cargar() {
      const LOTE = 1000
      let todos: Producto[] = []
      let desde = 0
      let hayMas = true
      while (hayMas) {
        const { data } = await supabase.from('catalogo_productos')
          .select('codigo,descripcion,categoria,subcategoria,marca,stock,stock_minimo,precio_publico,precio_con_iva')
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
          { name: 'codigo', weight: 0.2 },
          { name: 'marca', weight: 0.1 },
          { name: 'categoria', weight: 0.1 },
        ],
        threshold: 0.35,
        ignoreLocation: true,
        minMatchCharLength: 2,
      })
      setLoadingState(false)
    }
    cargar()
  }, [])

  // Filtrado
  const filtrados = useMemo(() => {
    const q = query.trim()
    let pool: Producto[]
    if (q.length >= 2 && fuseRef.current) {
      pool = fuseRef.current.search(q).map(r => r.item)
    } else {
      pool = base
    }
    return pool.filter(p => {
      if (cat && p.categoria !== cat) return false
      if (marca && p.marca !== marca) return false
      if (stockFiltro === 'disponible' && p.stock <= 0) return false
      return true
    })
  }, [base, query, cat, marca, stockFiltro])

  // Cats contextuales
  const catsCtx = useMemo(() => {
    const q = query.trim()
    let pool = q.length >= 2 && fuseRef.current ? fuseRef.current.search(q).map(r => r.item) : base
    if (marca) pool = pool.filter(p => p.marca === marca)
    if (stockFiltro === 'disponible') pool = pool.filter(p => p.stock > 0)
    const map = new Map<string, number>()
    pool.forEach(p => { if (p.categoria) map.set(p.categoria, (map.get(p.categoria) || 0) + 1) })
    return Array.from(map.entries()).sort((a, b) => b[1] - a[1])
  // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [base, query, marca, stockFiltro])

  // Marcas contextuales
  const marcasCtx = useMemo(() => {
    const q = query.trim()
    let pool = q.length >= 2 && fuseRef.current ? fuseRef.current.search(q).map(r => r.item) : base
    if (cat) pool = pool.filter(p => p.categoria === cat)
    if (stockFiltro === 'disponible') pool = pool.filter(p => p.stock > 0)
    const map = new Map<string, number>()
    pool.forEach(p => { if (p.marca) map.set(p.marca, (map.get(p.marca) || 0) + 1) })
    return Array.from(map.entries()).sort((a, b) => b[1] - a[1])
  // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [base, query, cat, stockFiltro])

  function limpiar() { setQuery(''); setCat(''); setMarca(''); setVisibles(40) }
  const hayFiltros = !!(query || cat || marca || stockFiltro !== 'disponible')

  return (
    <div className="max-w-5xl mx-auto px-4 py-5">
      <div className="flex flex-col md:flex-row gap-5">

        {/* ── SIDEBAR FILTROS (desktop) ── */}
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

          {catsCtx.length > 0 && (
            <div>
              <div className="text-xs font-bold text-gray-500 uppercase tracking-wider mb-2">Categoría</div>
              <div className="space-y-0.5 max-h-64 overflow-y-auto">
                {catsCtx.map(([c, n]) => (
                  <button key={c} onClick={() => { setCat(cat === c ? '' : c); setMarca(''); setVisibles(40) }}
                    className={`w-full text-left px-3 py-1.5 rounded-lg text-sm transition flex justify-between items-center
                      ${cat === c ? 'bg-green-50 text-green-700 font-semibold border border-green-200' : 'text-gray-600 hover:bg-gray-100'}`}>
                    <span className="flex items-center gap-1.5">{CAT_EMOJI[c] && <span className="text-base">{CAT_EMOJI[c]}</span>}{c}</span>
                    <span className="text-xs text-gray-400">{n}</span>
                  </button>
                ))}
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
              placeholder="Buscar por nombre, código, marca o precio..."
              className="w-full bg-white border border-gray-200 rounded-xl pl-10 pr-10 py-3 text-sm text-gray-800 placeholder-gray-400 focus:outline-none focus:border-green-500 focus:ring-2 focus:ring-green-100 shadow-sm" />
            {hayFiltros && (
              <button onClick={limpiar} className="absolute right-3.5 top-1/2 -translate-y-1/2 text-gray-400 hover:text-gray-600">
                <X size={15} />
              </button>
            )}
          </div>

          {/* Filtros móvil — horizontal */}
          <div className="md:hidden space-y-2">
            <div className="flex gap-2 overflow-x-auto pb-1 scrollbar-hide">
              {(['disponible','todos'] as const).map(v => (
                <button key={v} onClick={() => setStockFiltro(v)}
                  className={`shrink-0 px-3 py-1.5 rounded-full text-xs font-semibold border transition
                    ${stockFiltro === v ? 'bg-green-600 text-white border-green-600' : 'bg-white text-gray-600 border-gray-200'}`}>
                  {v === 'disponible' ? '✅ Con stock' : '📦 Todos'}
                </button>
              ))}
              {catsCtx.slice(0,8).map(([c]) => (
                <button key={c} onClick={() => { setCat(cat === c ? '' : c); setMarca(''); setVisibles(40) }}
                  className={`shrink-0 px-3 py-1.5 rounded-full text-xs font-semibold border transition
                    ${cat === c ? 'bg-green-600 text-white border-green-600' : 'bg-white text-gray-600 border-gray-200'}`}>
                  {CAT_EMOJI[c] || ''} {c}
                </button>
              ))}
            </div>
            {marcasCtx.length > 1 && (query.trim() || cat) && (
              <div className="flex gap-2 overflow-x-auto pb-1 scrollbar-hide">
                {marcasCtx.slice(0,10).map(([m]) => (
                  <button key={m} onClick={() => { setMarca(marca === m ? '' : m); setVisibles(40) }}
                    className={`shrink-0 px-3 py-1.5 rounded-full text-xs font-semibold border transition
                      ${marca === m ? 'bg-purple-600 text-white border-purple-600' : 'bg-white text-gray-600 border-gray-200'}`}>
                    {m}
                  </button>
                ))}
              </div>
            )}
          </div>

          {/* Estado / filtros activos */}
          <div className="flex items-center justify-between flex-wrap gap-2">
            <div className="flex items-center gap-2 flex-wrap">
              {cat && (
                <span className="flex items-center gap-1 bg-green-100 text-green-700 text-xs font-semibold px-2.5 py-1 rounded-full">
                  {CAT_EMOJI[cat] || ''} {cat}
                  <button onClick={() => setCat('')} className="ml-0.5 hover:text-green-900"><X size={11}/></button>
                </span>
              )}
              {marca && (
                <span className="flex items-center gap-1 bg-purple-100 text-purple-700 text-xs font-semibold px-2.5 py-1 rounded-full">
                  {marca}
                  <button onClick={() => setMarca('')} className="ml-0.5 hover:text-purple-900"><X size={11}/></button>
                </span>
              )}
            </div>
            {!loadingState && (
              <p className="text-xs text-gray-400 ml-auto">
                {filtrados.length.toLocaleString()} productos
              </p>
            )}
          </div>

          {/* Grid */}
          {loadingState ? (
            <div className="grid grid-cols-2 md:grid-cols-3 lg:grid-cols-4 gap-4">
              {[...Array(8)].map((_, i) => (
                <div key={i} className="bg-white rounded-2xl border border-gray-100 p-4 animate-pulse">
                  <div className="bg-gray-100 h-32 rounded-xl mb-3" />
                  <div className="h-3 bg-gray-100 rounded mb-2" />
                  <div className="h-3 bg-gray-100 rounded w-2/3 mb-3" />
                  <div className="h-6 bg-gray-100 rounded" />
                </div>
              ))}
            </div>
          ) : filtrados.length === 0 ? (
            <div className="text-center py-20">
              <div className="text-5xl mb-3">🔍</div>
              <p className="text-gray-500 font-medium">Sin resultados para "{query}"</p>
              <button onClick={limpiar} className="mt-3 text-sm text-green-600 underline">Limpiar filtros</button>
            </div>
          ) : (
            <>
              <div className="grid grid-cols-2 md:grid-cols-3 lg:grid-cols-4 gap-4">
                {filtrados.slice(0, visibles).map((p) => (
                  <div key={p.codigo} className="bg-white rounded-2xl border border-gray-100 p-3.5 shadow-sm hover:shadow-md hover:-translate-y-0.5 transition-all flex flex-col group">
                    {/* Imagen */}
                    <div className="bg-gradient-to-br from-gray-50 to-gray-100 rounded-xl h-28 flex items-center justify-center mb-3 text-4xl relative overflow-hidden group-hover:from-green-50 group-hover:to-green-100 transition-colors">
                      {CAT_EMOJI[p.categoria] || '📦'}
                      {p.stock <= 0 && (
                        <div className="absolute inset-0 bg-white/70 flex items-center justify-center">
                          <span className="text-xs font-bold text-red-500 bg-red-50 px-2 py-0.5 rounded-full border border-red-200">AGOTADO</span>
                        </div>
                      )}
                      {p.stock > 0 && p.stock < 5 && (
                        <div className="absolute top-1.5 right-1.5 bg-orange-500 text-white text-[9px] font-bold px-1.5 py-0.5 rounded-full">
                          ¡Últimas {p.stock}!
                        </div>
                      )}
                    </div>
                    {/* Info */}
                    <div className="flex-1">
                      <div className="text-[10px] font-semibold text-green-600 uppercase tracking-wide mb-0.5">{p.categoria}</div>
                      <div className="text-xs font-semibold text-gray-800 leading-snug line-clamp-2 mb-1">{p.descripcion}</div>
                      {p.marca && <div className="text-[10px] text-gray-400">{p.marca}</div>}
                    </div>
                    {/* Precio + botón */}
                    <div className="mt-2.5">
                      <div className="text-lg font-extrabold text-gray-900 mb-1.5">{fmt(p.precio_publico)}</div>
                      {p.stock > 0 && <BtnAgregar prod={p} />}
                    </div>
                  </div>
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
    </div>
  )
}

export default function ProductosPage() {
  return (
    <Suspense fallback={
      <div className="max-w-5xl mx-auto px-4 py-10 grid grid-cols-2 md:grid-cols-4 gap-4">
        {[...Array(8)].map((_, i) => (
          <div key={i} className="bg-white rounded-2xl border border-gray-100 p-4 animate-pulse">
            <div className="bg-gray-100 h-32 rounded-xl mb-3" /><div className="h-3 bg-gray-100 rounded mb-2" /><div className="h-6 bg-gray-100 rounded" />
          </div>
        ))}
      </div>
    }>
      <ProductosContent />
    </Suspense>
  )
}

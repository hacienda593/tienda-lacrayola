'use client'
import { useEffect, useState, useMemo, useRef, Suspense } from 'react'
import { useSearchParams } from 'next/navigation'
import Fuse from 'fuse.js'
import { supabase } from '@/lib/supabase'
import { agregarItem } from '@/lib/carrito'
import { Producto } from '@/lib/types'
import { Search, X, ShoppingCart, Check } from 'lucide-react'

function fmt(n: number) { return '$' + (n || 0).toFixed(2) }

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
      className={`shrink-0 w-8 h-8 rounded-lg flex items-center justify-center transition ${ok ? 'bg-green-600' : 'bg-green-700 hover:bg-green-600 active:scale-90'}`}>
      {ok ? <Check size={14} className="text-white" /> : <ShoppingCart size={14} className="text-white" />}
    </button>
  )
}

function ProductosContent() {
  const params = useSearchParams()
  const catInicial = params.get('cat') || ''

  const [base, setBase]     = useState<Producto[]>([])
  const [cargado, setCargado] = useState(false)
  const [query, setQuery]   = useState('')
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
      setCargado(true)
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

  return (
    <div className="max-w-lg mx-auto px-4 py-4 space-y-3">

      {/* Buscador */}
      <div className="relative">
        <Search size={14} className="absolute left-3 top-1/2 -translate-y-1/2 text-gray-500" />
        <input value={query}
          onChange={e => { setQuery(e.target.value); setCat(''); setMarca(''); setVisibles(40) }}
          placeholder="Nombre, código, marca o precio..."
          className="w-full bg-gray-900 border border-gray-700 rounded-xl pl-8 pr-9 py-2.5 text-sm text-white placeholder-gray-500 focus:outline-none focus:border-green-500" />
        {(query || cat || marca) && (
          <button onClick={limpiar} className="absolute right-3 top-1/2 -translate-y-1/2 text-gray-500">
            <X size={14} />
          </button>
        )}
      </div>

      {/* Filtro stock */}
      <div className="grid grid-cols-2 gap-2">
        {(['disponible', 'todos'] as const).map(v => (
          <button key={v} onClick={() => setStockFiltro(v)}
            className={`py-1.5 rounded-lg text-xs font-medium transition ${stockFiltro === v ? 'bg-green-700 text-white' : 'bg-gray-800 text-gray-400'}`}>
            {v === 'disponible' ? '✅ Con stock' : '📦 Todos'}
          </button>
        ))}
      </div>

      {!cargado ? (
        <div className="text-center py-16 text-gray-500 text-sm animate-pulse">Cargando catálogo...</div>
      ) : (
        <>
          {/* Categorías */}
          {catsCtx.length > 0 && (
            <div>
              <div className="text-[10px] text-gray-600 uppercase tracking-wider mb-1.5">Categoría</div>
              <div className="flex gap-1.5 overflow-x-auto pb-1 scrollbar-hide">
                {catsCtx.map(([c, n]) => (
                  <button key={c} onClick={() => { setCat(cat === c ? '' : c); setMarca(''); setVisibles(40) }}
                    className={`shrink-0 px-2.5 py-1 rounded-lg text-xs font-medium flex items-center gap-1 transition ${cat === c ? 'bg-green-700 text-white' : 'bg-gray-800 text-gray-400 hover:bg-gray-700'}`}>
                    {c} <span className={`text-[10px] ${cat === c ? 'text-green-200' : 'text-gray-600'}`}>{n}</span>
                  </button>
                ))}
              </div>
            </div>
          )}

          {/* Marcas */}
          {marcasCtx.length > 1 && (query.trim() || cat) && (
            <div>
              <div className="text-[10px] text-gray-600 uppercase tracking-wider mb-1.5">Marca</div>
              <div className="flex gap-1.5 overflow-x-auto pb-1 scrollbar-hide">
                {marcasCtx.map(([m, n]) => (
                  <button key={m} onClick={() => { setMarca(marca === m ? '' : m); setVisibles(40) }}
                    className={`shrink-0 px-2.5 py-1 rounded-lg text-xs font-medium flex items-center gap-1 transition ${marca === m ? 'bg-purple-700 text-white' : 'bg-gray-800 text-gray-400 hover:bg-gray-700'}`}>
                    {m} <span className={`text-[10px] ${marca === m ? 'text-purple-200' : 'text-gray-600'}`}>{n}</span>
                  </button>
                ))}
              </div>
            </div>
          )}

          {/* Filtros activos */}
          {(cat || marca) && (
            <div className="flex gap-2 flex-wrap">
              {cat && <span className="flex items-center gap-1 bg-green-900/50 text-green-300 text-xs px-2 py-0.5 rounded-full border border-green-800">
                {cat} <button onClick={() => setCat('')}><X size={10} /></button>
              </span>}
              {marca && <span className="flex items-center gap-1 bg-purple-900/50 text-purple-300 text-xs px-2 py-0.5 rounded-full border border-purple-800">
                {marca} <button onClick={() => setMarca('')}><X size={10} /></button>
              </span>}
            </div>
          )}

          <p className="text-xs text-gray-600">{filtrados.length.toLocaleString()} productos</p>

          {/* Grid productos */}
          {filtrados.length === 0 ? (
            <div className="text-center py-12 text-gray-600 text-sm">Sin resultados</div>
          ) : (
            <>
              <div className="grid grid-cols-2 gap-3">
                {filtrados.slice(0, visibles).map((p) => (
                  <div key={p.codigo} className="bg-gray-900 border border-gray-800 rounded-xl p-3 flex flex-col gap-2">
                    {/* Imagen placeholder */}
                    <div className="bg-gray-800 rounded-lg h-24 flex items-center justify-center text-3xl">
                      📦
                    </div>
                    <div className="flex-1">
                      <div className="text-xs text-white font-medium leading-snug line-clamp-2">{p.descripcion}</div>
                      {p.marca && <div className="text-[10px] text-purple-400 mt-0.5">{p.marca}</div>}
                      <div className="text-[10px] text-gray-600">{p.categoria}</div>
                    </div>
                    <div className="flex items-center justify-between">
                      <div>
                        <div className="text-sm font-bold text-green-400">{fmt(p.precio_publico)}</div>
                        {p.stock <= 0 && <div className="text-[10px] text-red-400 font-bold">AGOTADO</div>}
                        {p.stock > 0 && p.stock < 5 && <div className="text-[10px] text-yellow-400">Últimas {p.stock}</div>}
                      </div>
                      {p.stock > 0 && <BtnAgregar prod={p} />}
                    </div>
                  </div>
                ))}
              </div>
              {visibles < filtrados.length && (
                <button onClick={() => setVisibles(v => v + 40)}
                  className="w-full py-3 bg-gray-800 hover:bg-gray-700 text-gray-300 text-sm rounded-xl transition">
                  Ver más ({filtrados.length - visibles} restantes)
                </button>
              )}
            </>
          )}
        </>
      )}
    </div>
  )
}

export default function ProductosPage() {
  return (
    <Suspense fallback={<div className="text-center py-16 text-gray-500 animate-pulse">Cargando...</div>}>
      <ProductosContent />
    </Suspense>
  )
}

'use client'
import { useEffect, useState, useRef, useMemo } from 'react'
import { useRouter, usePathname, useSearchParams } from 'next/navigation'
import { supabase } from '@/lib/supabase'
import { X, ChevronRight, Search, Loader2, LayoutGrid, Store, ShoppingCart, Plus, Minus } from 'lucide-react'
import { agregarItem, getCarrito, cambiarCantidad } from '@/lib/carrito'
import { OlTienda, Producto } from '@/lib/types'

// ── Configuración visual de categorías (con emojis ampliados para multitienda) ────────────────────────────
const CAT_CFG: Record<string, { emoji: string; color: string; bg: string; bgActive: string }> = {
  'Escolar':      { emoji: '📚', color: 'text-blue-700',   bg: 'bg-blue-50',   bgActive: 'bg-blue-600' },
  'Arte':         { emoji: '🎨', color: 'text-purple-700', bg: 'bg-purple-50', bgActive: 'bg-purple-600' },
  'Oficina':      { emoji: '🖊️', color: 'text-gray-700',   bg: 'bg-gray-100',  bgActive: 'bg-gray-600' },
  'Tecnologia':   { emoji: '💻', color: 'text-indigo-700', bg: 'bg-indigo-50', bgActive: 'bg-indigo-600' },
  'Juguetes':     { emoji: '🧸', color: 'text-orange-700', bg: 'bg-orange-50', bgActive: 'bg-orange-600' },
  'Manualidades': { emoji: '✂️', color: 'text-pink-700',   bg: 'bg-pink-50',   bgActive: 'bg-pink-600' },
  'Libros':       { emoji: '📖', color: 'text-amber-700',  bg: 'bg-amber-50',  bgActive: 'bg-amber-600' },
  'Pintura':      { emoji: '🖌️', color: 'text-red-700',    bg: 'bg-red-50',    bgActive: 'bg-red-600' },
  'Papeleria':    { emoji: '📄', color: 'text-teal-700',   bg: 'bg-teal-50',   bgActive: 'bg-teal-600' },
  
  // Categorías de supermercado y otros
  'Alimentos':    { emoji: '🥦', color: 'text-emerald-700',bg: 'bg-emerald-50',bgActive: 'bg-emerald-600' },
  'Bebidas':      { emoji: '🥤', color: 'text-cyan-700',   bg: 'bg-cyan-50',   bgActive: 'bg-cyan-600' },
  'Limpieza':     { emoji: '🧹', color: 'text-sky-700',    bg: 'bg-sky-50',    bgActive: 'bg-sky-600' },
  'Higiene':      { emoji: '🧴', color: 'text-rose-700',   bg: 'bg-rose-50',   bgActive: 'bg-rose-600' },
  'Farmacia':     { emoji: '💊', color: 'text-red-700',    bg: 'bg-red-50',    bgActive: 'bg-red-600' },
  'Carnes':       { emoji: '🥩', color: 'text-red-800',    bg: 'bg-red-50',    bgActive: 'bg-red-800' },
  'Lacteos':      { emoji: '🧀', color: 'text-yellow-700', bg: 'bg-yellow-50', bgActive: 'bg-yellow-600' },
  'Snacks':       { emoji: '🍿', color: 'text-amber-600',  bg: 'bg-amber-50',  bgActive: 'bg-amber-600' },
}

const DEFAULT_CFG = { emoji: '📦', color: 'text-green-700', bg: 'bg-green-50', bgActive: 'bg-green-600' }

const STORE_EMOJI: Record<string, string> = {
  supermercado: '🛒',
  farmacia: '💊',
  libreria: '🖍️',
  abarrotes: '🥬',
  tecnologia: '💻',
  ropa: '👕',
  otros: '🏪',
}

const FALLBACK_SUBS: Record<string, { nombre: string; emoji: string; hot?: boolean }[]> = {
  'Escolar': [
    { nombre: 'Cuadernos', emoji: '📓', hot: true },
    { nombre: 'Lápices', emoji: '✏️' },
    { nombre: 'Pinturas', emoji: '🎨' },
    { nombre: 'Mochilas', emoji: '🎒', hot: true },
    { nombre: 'Reglas', emoji: '📐' },
    { nombre: 'Gomas', emoji: '🧪' },
  ],
  'Arte': [
    { nombre: 'Pinceles', emoji: '🖌️', hot: true },
    { nombre: 'Acrílicos', emoji: '🎨' },
    { nombre: 'Lienzos', emoji: '🖼️' },
    { nombre: 'Dibujo', emoji: '✏️' },
    { nombre: 'Paletas', emoji: '🎨' },
  ],
  'Oficina': [
    { nombre: 'Esferos', emoji: '🖊️', hot: true },
    { nombre: 'Carpetas', emoji: '📂' },
    { nombre: 'Agendas', emoji: '📅' },
    { nombre: 'Grapadoras', emoji: '📎' },
    { nombre: 'Papel Bond', emoji: '📄', hot: true },
  ],
  'Manualidades': [
    { nombre: 'Limpiapipas', emoji: '✂️', hot: true },
    { nombre: 'Fomix', emoji: '📦' },
    { nombre: 'Silicona', emoji: '🧪' },
    { nombre: 'Cintas', emoji: '🩹' },
    { nombre: 'Escarcha', emoji: '✨' },
  ],
  'Libros': [
    { nombre: 'Novelas', emoji: '📕', hot: true },
    { nombre: 'Cuentos', emoji: '📖' },
    { nombre: 'Autoayuda', emoji: '🧠' },
    { nombre: 'Educativos', emoji: '📚' },
  ],
  'Tecnologia': [
    { nombre: 'Audífonos', emoji: '🎧', hot: true },
    { nombre: 'Teclados', emoji: '⌨️' },
    { nombre: 'Memorias', emoji: '💾' },
    { nombre: 'Cables', emoji: '🔌' },
  ],
}

function toSentenceCase(str: string) {
  if (!str) return ''
  const trimmed = str.trim()
  return trimmed.charAt(0).toUpperCase() + trimmed.slice(1).toLowerCase()
}

interface CatData {
  categoria:    string
  subcategorias: { nombre: string; cantidad: number }[]
  total:        number
}

interface Props {
  open:    boolean
  onClose: () => void
}

export default function CategoriasPanel({ open, onClose }: Props) {
  const router = useRouter()
  const pathname = usePathname()
  const searchParams = useSearchParams()

  const activeTId = pathname.startsWith('/tiendas/') && pathname !== '/tiendas'
    ? pathname.split('/')[2]
    : (pathname.startsWith('/productos') ? (searchParams.get('tienda_id') || '') : '')

  const [tiendas, setTiendas] = useState<OlTienda[]>([])
  const [tiendaActiva, setTiendaActiva] = useState<OlTienda | null>(null)
  
  const [cats,     setCats]     = useState<CatData[]>([])
  const [activa,   setActiva]   = useState<string>('')
  const [cargando, setCargando] = useState(true)
  const [q,        setQ]        = useState('')
  
  const [productos, setProductos] = useState<Producto[]>([])
  const [cargandoProds, setCargandoProds] = useState(false)
  const [carrito, setCarrito] = useState(() => getCarrito())
  
  const subRef = useRef<HTMLDivElement>(null)

  // 1. Escuchar actualizaciones de carrito para renderizar steppers interactivos
  useEffect(() => {
    const sync = () => setCarrito(getCarrito())
    window.addEventListener('carrito-update', sync)
    return () => window.removeEventListener('carrito-update', sync)
  }, [])

  // 2. Cargar Tiendas Aliadas al abrir el panel
  useEffect(() => {
    if (!open) return
    async function cargarTiendas() {
      const { data } = await supabase
        .from('ol_tiendas')
        .select('*')
        .eq('activa', true)
        .order('orden')
      
      if (data && data.length > 0) {
        setTiendas(data as OlTienda[])
        const found = activeTId ? data.find(t => t.id === activeTId) : null
        setTiendaActiva((found as OlTienda) || (data[0] as OlTienda))
      }
    }
    cargarTiendas()
  }, [open, activeTId])

  // 3. Cargar Categorías y Subcategorías del local seleccionado
  useEffect(() => {
    if (!tiendaActiva) return
    setCargando(true)
    setProductos([])
    const activeId = tiendaActiva.id
    const esCrayola = tiendaActiva.nombre.toLowerCase().includes('crayola')

    async function cargar() {
      let query = supabase
        .from('ol_productos')
        .select('categoria, subcategoria')
        .gt('stock', 0)
        .gt('precio_publico', 0)

      if (esCrayola) {
        query = query.or(`tienda_id.eq.${activeId},tienda_id.is.null`)
      } else {
        query = query.eq('tienda_id', activeId)
      }

      const { data } = await query

      if (!data) { 
        setCats([])
        setActiva('')
        setCargando(false)
        return 
      }

      // Agrupar
      const map = new Map<string, Map<string, number>>()
      data.forEach(({ categoria, subcategoria }) => {
        if (!categoria) return
        if (!map.has(categoria)) map.set(categoria, new Map())
        const subMap = map.get(categoria)!
        if (subcategoria) subMap.set(subcategoria, (subMap.get(subcategoria) ?? 0) + 1)
      })

      const result: CatData[] = Array.from(map.entries())
        .map(([categoria, subMap]) => ({
          categoria,
          subcategorias: Array.from(subMap.entries())
            .map(([nombre, cantidad]) => ({ nombre, cantidad }))
            .sort((a, b) => b.cantidad - a.cantidad),
          total: Array.from(subMap.values()).reduce((s, n) => s + n, 0),
        }))
        .sort((a, b) => b.total - a.total)

      setCats(result)
      setActiva(result[0]?.categoria ?? '')
      setCargando(false)
    }

    cargar()
  }, [tiendaActiva])

  // 4. Cargar productos destacados para compra rápida express de la categoría activa
  useEffect(() => {
    if (!tiendaActiva || !activa) {
      setProductos([])
      return
    }
    setCargandoProds(true)
    const activeId = tiendaActiva.id
    const esCrayola = tiendaActiva.nombre.toLowerCase().includes('crayola')
    async function cargarDestacados() {
      let query = supabase
        .from('ol_productos')
        .select('codigo,descripcion,categoria,subcategoria,marca,stock,stock_minimo,precio_publico,precio_con_iva,tienda_id')
        .eq('categoria', activa)
        .gt('stock', 0)
        .limit(6)

      if (esCrayola) {
        query = query.or(`tienda_id.eq.${activeId},tienda_id.is.null`)
      } else {
        query = query.eq('tienda_id', activeId)
      }

      const { data } = await query

      if (data) {
        setProductos(data as Producto[])
      } else {
        setProductos([])
      }
      setCargandoProds(false)
    }
    cargarDestacados()
  }, [tiendaActiva, activa])

  // Al cambiar categoría activa, scroll arriba en la columna derecha
  useEffect(() => {
    subRef.current?.scrollTo({ top: 0, behavior: 'smooth' })
  }, [activa])

  // Redirigir a buscador con filtros preestablecidos
  function navegar(cat: string, sub?: string) {
    if (!tiendaActiva) return
    const params = new URLSearchParams({ tienda_id: tiendaActiva.id, cat })
    if (sub) params.set('sub', sub)
    router.push(`/productos?${params.toString()}`)
    onClose()
  }

  // Lógica de agregado rápido del carrito en minitarjetas
  function handleAddExpress(p: Producto) {
    agregarItem({
      codigo: p.codigo,
      descripcion: p.descripcion,
      categoria: p.categoria,
      precio_publico: p.precio_publico,
      tienda_id: tiendaActiva?.id,
      tienda_nombre: tiendaActiva?.nombre
    }, 1)
  }

  function handleStepper(codigo: string, cantActual: number, delta: number) {
    cambiarCantidad(codigo, cantActual + delta)
  }

  // Filtro de búsqueda local en las categorías cargadas
  const catsFiltradas = q.trim()
    ? cats.filter(c =>
        c.categoria.toLowerCase().includes(q.toLowerCase()) ||
        c.subcategorias.some(s => s.nombre.toLowerCase().includes(q.toLowerCase()))
      )
    : cats

  const activaData = catsFiltradas.find(c => c.categoria === activa) ?? catsFiltradas[0]
  const cfg        = CAT_CFG[activaData?.categoria ?? ''] ?? DEFAULT_CFG

  const subcategoriasAMostrar = useMemo(() => {
    if (!activaData) return []
    
    // Si la base de datos ya tiene subcategorías, las usamos
    if (activaData.subcategorias && activaData.subcategorias.length > 0) {
      return activaData.subcategorias.map((sub, idx) => {
        const match = FALLBACK_SUBS[activaData.categoria]?.find(f => f.nombre.toLowerCase() === sub.nombre.toLowerCase())
        return {
          nombre: sub.nombre,
          emoji: match?.emoji || '📦',
          hot: match?.hot || (idx % 3 === 0)
        }
      })
    }
    
    // Si la base de datos no tiene subcategorías, usamos las de prueba completas para diseño Temu-Style
    return FALLBACK_SUBS[activaData.categoria] || [
      { nombre: 'General', emoji: '📦' }
    ]
  }, [activaData])

  return (
    <>
      {/* Overlay */}
      <div
        onClick={onClose}
        className={`fixed inset-0 bg-black/50 z-[60] transition-opacity duration-300 ${open ? 'opacity-100 pointer-events-auto' : 'opacity-0 pointer-events-none'}`}
      />

      {/* Panel emergente Temu-Style — adaptado a móvil y desktop */}
      <div className={`
        fixed z-[70] bg-white shadow-2xl transition-transform duration-300 ease-out
        /* móvil: bottom sheet con altura estable y hardware acceleration */
        bottom-0 left-0 right-0 rounded-t-2xl h-[86vh] max-h-[86vh]
        /* desktop: panel lateral premium */
        md:bottom-auto md:top-0 md:left-0 md:h-full md:w-[600px] md:rounded-none md:max-h-full
        flex flex-col will-change-transform
        ${open
          ? 'translate-y-0 md:translate-x-0'
          : 'translate-y-full md:translate-y-0 md:-translate-x-full'
        }
      `}>

        {/* 1. Header del panel */}
        <div className="flex items-center justify-between px-4 pt-4 pb-2 border-b border-gray-100 shrink-0">
          <div className="flex items-center gap-2">
            <LayoutGrid size={18} className="text-green-600" />
            <span className="font-extrabold text-gray-800 text-base">Buscar por Categorías</span>
          </div>
          <button onClick={onClose} className="p-1.5 hover:bg-gray-100 rounded-lg transition">
            <X size={18} className="text-gray-500" />
          </button>
        </div>

        {/* 2. Selector de Tiendas Superior (Temu Store Slider) */}
        <div className="px-4 py-3 bg-gray-50 border-b border-gray-100 shrink-0">
          <p className="text-[10px] font-bold text-gray-400 uppercase tracking-wider mb-2">Selecciona la Tienda</p>
          <div className="flex gap-2.5 overflow-x-auto pb-1.5 scrollbar-hide">
            {tiendas.map(tienda => {
              const esActiva = tiendaActiva?.id === tienda.id
              const fallbackEmoji = STORE_EMOJI[tienda.categoria ?? 'otros'] || '🏪'
              return (
                <button
                  key={tienda.id}
                  onClick={() => setTiendaActiva(tienda)}
                  className={`flex items-center gap-2 px-3.5 py-2 rounded-xl text-xs font-bold transition whitespace-nowrap border shrink-0 shadow-sm
                    ${esActiva 
                      ? 'bg-green-600 border-green-600 text-white hover:bg-green-700' 
                      : 'bg-white border-gray-200 text-gray-700 hover:border-green-300'
                    }`}
                >
                  <span className="text-sm">
                    {tienda.logo_url 
                      ? <img src={tienda.logo_url} alt={tienda.nombre} className="w-4 h-4 object-contain inline" />
                      : fallbackEmoji
                    }
                  </span>
                  <span>{tienda.nombre}</span>
                </button>
              )
            })}
          </div>
        </div>

        {/* 3. Buscador */}
        <div className="px-4 py-2.5 border-b border-gray-100 shrink-0">
          <div className="relative">
            <Search size={14} className="absolute left-3 top-1/2 -translate-y-1/2 text-gray-400" />
            <input
              value={q}
              onChange={e => setQ(e.target.value)}
              placeholder={`Buscar categorías en ${tiendaActiva?.nombre ?? 'la tienda'}...`}
              className="w-full bg-gray-50 border border-gray-200 rounded-xl pl-9 pr-4 py-2 text-sm text-gray-800 placeholder-gray-400 focus:outline-none focus:border-green-500 focus:bg-white transition"
            />
          </div>
        </div>

        {/* 4. Cuerpo — 2 columnas de Temu */}
        {cargando ? (
          <div className="flex-1 flex items-center justify-center">
            <Loader2 size={28} className="animate-spin text-green-500" />
          </div>
        ) : (
          <div className="flex flex-1 min-h-0">

            {/* ── Columna izquierda: Categorías principales (Temu Style Text-Only) ── */}
            <div className="w-[110px] md:w-[130px] shrink-0 border-r border-gray-100 overflow-y-auto overscroll-y-contain bg-gray-50/70">
              {catsFiltradas.map(cat => {
                const estaAct = cat.categoria === activa
                return (
                  <button
                    key={cat.categoria}
                    onClick={() => setActiva(cat.categoria)}
                    className={`w-full text-left px-4 py-3.5 transition-all relative font-extrabold text-[11px] border-b border-gray-100/50
                      ${estaAct 
                        ? 'bg-white text-green-600 border-l-4 border-l-green-600 shadow-sm' 
                        : 'text-gray-500 hover:bg-white/50 hover:text-gray-700'
                      }`}
                  >
                    <span className="line-clamp-2 leading-tight">{toSentenceCase(cat.categoria)}</span>
                  </button>
                )
              })}
            </div>

            {/* ── Columna derecha: Subcategorías y Compra Express (Tipti-Style) ── */}
            <div ref={subRef} className="flex-1 overflow-y-auto overscroll-y-contain bg-white flex flex-col">
              {activaData ? (
                <div className="flex flex-col flex-1">
                  {/* Banner de Categoría */}
                  <button
                    onClick={() => navegar(activaData.categoria)}
                    className={`w-full flex items-center justify-between px-4 py-3 ${cfg.bg} border-b border-gray-100 hover:opacity-90 transition shrink-0`}
                  >
                    <div className="flex items-center gap-2.5">
                      <div className={`w-8 h-8 ${cfg.bgActive} rounded-full flex items-center justify-center text-sm shadow-sm`}>
                        <span className="brightness-0 invert">{cfg.emoji}</span>
                      </div>
                      <div className="text-left">
                        <div className={`font-extrabold text-[11px] ${cfg.color}`}>Ver Todo en {activaData.categoria}</div>
                        <div className="text-[9px] text-gray-400">{activaData.total} productos disponibles</div>
                      </div>
                    </div>
                    <ChevronRight size={13} className="text-gray-400" />
                  </button>

                  {/* Title of Section */}
                  <div className="px-4 pt-3.5 pb-1 shrink-0">
                    <h3 className="text-[11px] font-extrabold text-gray-800 uppercase tracking-wider">Comprar por categoría</h3>
                  </div>

                  {/* ── Subcategorías Grid Circular (Temu Style) ── */}
                  {subcategoriasAMostrar.length > 0 && (
                    <div className="px-3 pb-4 border-b border-gray-50 shrink-0">
                      <div className="grid grid-cols-3 gap-y-4 gap-x-2">
                        {subcategoriasAMostrar
                          .filter(s => !q || s.nombre.toLowerCase().includes(q.toLowerCase()))
                          .map((sub) => (
                            <button
                              key={sub.nombre}
                              onClick={() => navegar(activaData.categoria, sub.nombre)}
                              className="flex flex-col items-center group relative transition active:scale-95 duration-100"
                            >
                              {/* Círculo de Subcategoría */}
                              <div className="w-16 h-16 rounded-full bg-gray-50 border border-gray-100 flex items-center justify-center text-3xl shadow-sm group-hover:shadow-md group-hover:scale-105 group-hover:bg-white transition-all relative">
                                <span>{sub.emoji}</span>
                                {sub.hot && (
                                  <span className="absolute -top-0.5 -right-0.5 bg-red-500 text-white text-[7px] font-black px-1.5 py-0.5 rounded-full uppercase tracking-wider scale-90 origin-top-right animate-pulse shadow-sm shadow-red-500/20">
                                    Hot
                                  </span>
                                )}
                              </div>
                              {/* Nombre de Subcategoría */}
                              <span className="text-[10px] text-gray-600 text-center font-extrabold mt-1.5 leading-tight line-clamp-2 max-w-[70px] group-hover:text-green-700">
                                {sub.nombre}
                              </span>
                            </button>
                          ))
                        }
                      </div>
                    </div>
                  )}

                  {/* ── Sección de Compra Rápida Express (Tipti Simplicity) ── */}
                  <div className="flex-1 p-3 bg-gray-50/30">
                    <div className="flex items-center justify-between mb-2">
                      <p className="text-[9px] font-bold text-gray-400 uppercase tracking-wider">
                        ⚡ Compra Rápida (Sugeridos)
                      </p>
                      <span className="text-[9px] text-gray-400">Agrega directo sin salir</span>
                    </div>

                    {cargandoProds ? (
                      <div className="flex justify-center py-10">
                        <Loader2 size={20} className="animate-spin text-green-500" />
                      </div>
                    ) : productos.length > 0 ? (
                      <div className="space-y-2">
                        {productos.map(p => {
                          const itemEnCart = carrito.find(i => i.codigo === p.codigo)
                          const qty = itemEnCart?.cantidad ?? 0
                          return (
                            <div 
                              key={p.codigo}
                              className="flex items-center gap-2 bg-white border border-gray-100 rounded-xl p-2.5 shadow-sm hover:shadow-md transition"
                            >
                              {/* Icono de categoría */}
                              <div className="w-9 h-9 bg-gray-50 rounded-lg flex items-center justify-center text-lg shrink-0">
                                {CAT_CFG[p.categoria]?.emoji || '📦'}
                              </div>
                              
                              {/* Datos del producto */}
                              <div className="flex-1 min-w-0">
                                <div className="text-[11px] font-bold text-gray-800 truncate leading-tight">
                                  {p.descripcion}
                                </div>
                                <div className="flex items-center gap-1.5 mt-0.5">
                                  <span className="text-xs font-extrabold text-green-700">
                                    ${p.precio_publico.toFixed(2)}
                                  </span>
                                  {p.marca && (
                                    <span className="text-[9px] text-gray-400 truncate">
                                      · {p.marca}
                                    </span>
                                  )}
                                </div>
                              </div>

                              {/* Acciones de compra rápida (Tipti) */}
                              <div className="shrink-0">
                                {qty === 0 ? (
                                  <button
                                    onClick={() => handleAddExpress(p)}
                                    className="bg-green-50 hover:bg-green-600 hover:text-white border border-green-200 text-green-700 text-xs font-bold rounded-lg px-3 py-1.5 flex items-center gap-1 transition"
                                  >
                                    <ShoppingCart size={11} /> Agregar
                                  </button>
                                ) : (
                                  <div className="flex items-center bg-green-600 text-white rounded-lg overflow-hidden shrink-0">
                                    <button 
                                      onClick={() => handleStepper(p.codigo, qty, -1)} 
                                      className="px-2 py-1 hover:bg-green-700 transition font-extrabold text-[11px]"
                                    >
                                      <Minus size={10} />
                                    </button>
                                    <span className="px-1 text-[11px] font-bold">{qty}</span>
                                    <button 
                                      onClick={() => handleStepper(p.codigo, qty, 1)} 
                                      className="px-2 py-1 hover:bg-green-700 transition font-extrabold text-[11px]"
                                    >
                                      <Plus size={10} />
                                    </button>
                                  </div>
                                )}
                              </div>
                            </div>
                          )
                        })}
                      </div>
                    ) : (
                      <div className="text-center py-10 text-gray-400 text-xs">
                        No hay productos disponibles en esta categoría
                      </div>
                    )}
                  </div>
                </div>
              ) : (
                <div className="flex flex-col items-center justify-center py-16 gap-3 flex-1 text-gray-400">
                  <Search size={32} className="text-gray-200" />
                  <p className="text-sm">Sin resultados en esta tienda</p>
                </div>
              )}
            </div>
          </div>
        )}
      </div>
    </>
  )
}

'use client'
import { useEffect, useState, Suspense } from 'react'
import { useRouter, usePathname, useSearchParams } from 'next/navigation'
import { supabase } from '@/lib/supabase'
import {
  X, ChevronRight, ChevronLeft, Search, Loader2, Store, Plus, Minus,
  ShoppingBasket, BookOpen, Palette, CupSoda, Cookie, Droplet, Home as HomeIcon, PawPrint,
  Pill, Package,
} from 'lucide-react'
import { agregarItem, getCarrito, cambiarCantidad } from '@/lib/carrito'
import { OlTienda, Producto } from '@/lib/types'

// Ícono de línea por categoría — un solo acento (pine), sin motor de emoji.
// Reglas acotadas por palabra clave; lo que no matchea cae a un ícono genérico.
const REGLAS_ICONO: [string, React.ElementType][] = [
  ['abarrotes', ShoppingBasket], ['alimento', ShoppingBasket],
  ['escolar', BookOpen], ['libreria', BookOpen], ['papeleria', BookOpen], ['libros', BookOpen],
  ['arte', Palette], ['pintura', Palette], ['manualidades', Palette],
  ['bebida', CupSoda], ['licor', CupSoda], ['agua', CupSoda],
  ['golosina', Cookie], ['snack', Cookie], ['dulce', Cookie],
  ['personal', Droplet], ['higiene', Droplet], ['belleza', Droplet], ['capilar', Droplet], ['corporal', Droplet], ['oral', Droplet], ['intimo', Droplet],
  ['hogar', HomeIcon], ['limpieza', HomeIcon], ['lavado', HomeIcon], ['desechable', HomeIcon],
  ['mascota', PawPrint],
  ['farmacia', Pill], ['salud', Pill],
]
const ICONO_DEFECTO = Package

function iconoParaCategoria(categoria: string): React.ElementType {
  const norm = (categoria || '').toLowerCase().normalize('NFD').replace(/[̀-ͯ]/g, '')
  const regla = REGLAS_ICONO.find(([kw]) => norm.includes(kw))
  return regla ? regla[1] : ICONO_DEFECTO
}

const STORE_ICONO: Record<string, React.ElementType> = {
  supermercado: ShoppingBasket, farmacia: Pill, libreria: BookOpen,
  abarrotes: ShoppingBasket, tecnologia: Package, ropa: Package, otros: Store,
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

function CategoriasPanelInner({ open, onClose }: Props) {
  const router = useRouter()
  const pathname = usePathname()
  const searchParams = useSearchParams()

  const activeTId = pathname.startsWith('/tiendas/') && pathname !== '/tiendas'
    ? pathname.split('/')[2]
    : (pathname.startsWith('/productos') ? (searchParams.get('tienda_id') || '') : '')

  const [tiendas, setTiendas] = useState<OlTienda[]>([])
  const [tiendaActiva, setTiendaActiva] = useState<OlTienda | null>(null)

  const [cats,     setCats]     = useState<CatData[]>([])
  const [cargando, setCargando] = useState(true)
  const [q,        setQ]        = useState('')

  // Categoría cuya pantalla de subcategorías está abierta (drill-down)
  const [categoriaAbierta, setCategoriaAbierta] = useState<string>('')

  const [productos, setProductos] = useState<Producto[]>([])
  const [cargandoProds, setCargandoProds] = useState(false)
  const [carrito, setCarrito] = useState(() => getCarrito())

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

  // Al cerrar el panel, regresar siempre a la lista (no dejar la subpantalla abierta)
  useEffect(() => {
    if (!open) setCategoriaAbierta('')
  }, [open])

  // 3. Cargar Categorías y Subcategorías del local seleccionado
  useEffect(() => {
    if (!tiendaActiva) return
    setCargando(true)
    setProductos([])
    setCategoriaAbierta('')
    const activeId = tiendaActiva.id
    const esCrayola = tiendaActiva.nombre.toLowerCase().includes('crayola')

    async function cargar() {
      let todos: { categoria: string; subcategoria: string }[] = []
      let desde = 0
      const LOTE = 1000
      let hayMas = true

      while (hayMas) {
        let query = supabase
          .from('ol_productos')
          .select('categoria, subcategoria')
          .gt('stock', 0)
          .gt('precio_publico', 0)
          .range(desde, desde + LOTE - 1)

        if (esCrayola) {
          query = query.or(`tienda_id.eq.${activeId},tienda_id.is.null`)
        } else {
          query = query.eq('tienda_id', activeId)
        }

        const { data } = await query
        const lote = (data ?? []) as { categoria: string; subcategoria: string }[]
        todos = [...todos, ...lote]
        hayMas = lote.length === LOTE
        desde += LOTE
      }

      if (todos.length === 0) {
        setCats([])
        setCargando(false)
        return
      }

      const map = new Map<string, Map<string, number>>()
      todos.forEach(({ categoria, subcategoria }) => {
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
            .sort((a, b) => a.nombre.localeCompare(b.nombre, 'es', { sensitivity: 'base' })),
          total: Array.from(subMap.values()).reduce((s, n) => s + n, 0),
        }))
        .sort((a, b) => b.total - a.total)

      setCats(result)
      setCargando(false)
    }

    cargar()
  }, [tiendaActiva])

  // 4. Cargar productos destacados para compra rápida express de la categoría abierta
  useEffect(() => {
    if (!tiendaActiva || !categoriaAbierta) {
      setProductos([])
      return
    }
    setCargandoProds(true)
    const activeId = tiendaActiva.id
    const esCrayola = tiendaActiva.nombre.toLowerCase().includes('crayola')
    async function cargarDestacados() {
      let query = supabase
        .from('ol_productos')
        .select('codigo,descripcion,categoria,subcategoria,marca,stock,stock_minimo,precio_publico,precio_con_iva,tienda_id,imagen_url,detalles')
        .eq('categoria', categoriaAbierta)
        .gt('stock', 0)
        .limit(6)

      if (esCrayola) {
        query = query.or(`tienda_id.eq.${activeId},tienda_id.is.null`)
      } else {
        query = query.eq('tienda_id', activeId)
      }

      const { data } = await query
      setProductos(data ? (data as Producto[]) : [])
      setCargandoProds(false)
    }
    cargarDestacados()
  }, [tiendaActiva, categoriaAbierta])

  // Redirigir a buscador con filtros preestablecidos
  function navegar(cat: string, sub?: string) {
    if (!tiendaActiva) return
    const params = new URLSearchParams({ cat })
    if (sub) params.set('sub', sub)
    router.push(`/tiendas/${tiendaActiva.id}?${params.toString()}`)
    onClose()
  }

  function handleAddExpress(p: Producto) {
    if (typeof navigator !== 'undefined' && navigator.vibrate) navigator.vibrate(15)
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
    if (typeof navigator !== 'undefined' && navigator.vibrate) navigator.vibrate(10)
    cambiarCantidad(codigo, cantActual + delta)
  }

  // Filtro de búsqueda local en las categorías cargadas
  const normalize = (str: string) => (str || '').normalize('NFD').replace(/[̀-ͯ]/g, '').toLowerCase()
  const catsFiltradas = q.trim()
    ? cats.filter(c =>
        normalize(c.categoria).includes(normalize(q)) ||
        c.subcategorias.some(s => normalize(s.nombre).includes(normalize(q)))
      )
    : cats

  const catAbiertaData = cats.find(c => c.categoria === categoriaAbierta) || null

  return (
    <>
      {/* Fondo oscurecido — deja ver un fragmento de lo que está detrás */}
      <div
        onClick={onClose}
        className={`fixed inset-0 bg-pine-deep/30 z-[60] transition-opacity duration-300 ${open ? 'opacity-100 pointer-events-auto' : 'opacity-0 pointer-events-none'}`}
      />

      {/* Panel — hoja parcial (86vh, no pantalla completa) en móvil */}
      <div className={`
        fixed z-[70] bg-white shadow-2xl transition-transform duration-300 ease-out font-ui
        bottom-0 left-0 right-0 rounded-t-2xl h-[86vh] max-h-[86vh]
        md:bottom-auto md:top-0 md:left-0 md:h-full md:w-[420px] md:rounded-none md:max-h-full
        flex flex-col overflow-hidden will-change-transform
        ${open ? 'translate-y-0 md:translate-x-0' : 'translate-y-full md:translate-y-0 md:-translate-x-full'}
      `}>

        {/* ── Pantalla 1: lista de categorías ── */}
        <div className={`flex flex-col h-full shrink-0 w-full transition-transform duration-220 ${categoriaAbierta ? '-translate-x-full absolute inset-0' : 'translate-x-0 relative'}`}>
          <div className="px-4 pt-3.5 pb-2 border-b border-line shrink-0 bg-white">
            <div className="flex items-center justify-between gap-3 mb-2.5">
              <div className="flex gap-1.5 overflow-x-auto scrollbar-hide flex-1">
                {tiendas.map(tienda => {
                  const esActiva = tiendaActiva?.id === tienda.id
                  const FallbackIcon = STORE_ICONO[tienda.categoria ?? 'otros'] || Store
                  return (
                    <button
                      key={tienda.id}
                      onClick={() => setTiendaActiva(tienda)}
                      className={`flex items-center gap-1.5 px-3 py-1.5 rounded-lg text-[11px] font-semibold transition whitespace-nowrap border shrink-0
                        ${esActiva ? 'bg-pine border-pine text-white' : 'bg-surface-2 border-line text-ink-soft hover:bg-line/40'}`}
                    >
                      {tienda.logo_url
                        ? <img src={tienda.logo_url} alt={tienda.nombre} className="w-3.5 h-3.5 object-contain inline rounded-sm" />
                        : <FallbackIcon size={12} strokeWidth={2} />
                      }
                      <span>{tienda.nombre}</span>
                    </button>
                  )
                })}
              </div>
              <button onClick={onClose} className="p-1.5 hover:bg-surface-2 rounded-lg transition shrink-0 border border-line bg-surface-2 text-ink-soft">
                <X size={15} />
              </button>
            </div>

            <div className="relative">
              <Search size={13} className="absolute left-3 top-1/2 -translate-y-1/2 text-ink-faint" />
              <input
                value={q}
                onChange={e => setQ(e.target.value)}
                placeholder={`Buscar categoría en ${tiendaActiva?.nombre ?? 'la tienda'}...`}
                className="w-full bg-surface-2 border border-line rounded-lg pl-8.5 pr-4 py-1.5 text-xs text-ink placeholder-ink-faint focus:outline-none focus:border-pine focus:bg-white transition"
              />
            </div>
          </div>

          {cargando ? (
            <div className="flex-1 flex items-center justify-center">
              <Loader2 size={28} className="animate-spin text-pine" />
            </div>
          ) : catsFiltradas.length === 0 ? (
            <div className="flex flex-col items-center justify-center py-16 gap-3 flex-1 text-ink-faint">
              <Search size={32} className="text-line" />
              <p className="text-sm">Sin resultados en esta tienda</p>
            </div>
          ) : (
            <div className="flex-1 overflow-y-auto overscroll-y-contain">
              {catsFiltradas.map(cat => {
                const Icon = iconoParaCategoria(cat.categoria)
                return (
                  <div key={cat.categoria} className="flex items-stretch border-b border-line">
                    <button
                      onClick={() => navegar(cat.categoria)}
                      className="flex-1 min-w-0 flex items-center gap-3 px-4 py-3 text-left hover:bg-surface-2 transition"
                    >
                      <span className="w-8 h-8 rounded-lg bg-pine-tint text-pine-deep flex items-center justify-center shrink-0">
                        <Icon size={16} strokeWidth={1.7} />
                      </span>
                      <span className="flex-1 min-w-0">
                        <span className="block text-sm font-semibold text-ink truncate">{cat.categoria}</span>
                        <span className="block font-price text-[10px] text-ink-faint">{cat.total} productos</span>
                      </span>
                    </button>
                    {cat.subcategorias.length > 0 && (
                      <button
                        onClick={() => setCategoriaAbierta(cat.categoria)}
                        aria-label={`Ver subcategorías de ${cat.categoria}`}
                        className="w-11 shrink-0 border-l border-line flex items-center justify-center text-ink-faint hover:bg-pine-tint hover:text-pine-deep transition"
                      >
                        <ChevronRight size={16} />
                      </button>
                    )}
                  </div>
                )
              })}
            </div>
          )}
        </div>

        {/* ── Pantalla 2: subcategorías + compra rápida (drill-down) ── */}
        <div className={`flex flex-col h-full shrink-0 w-full transition-transform duration-220 absolute inset-0 ${categoriaAbierta ? 'translate-x-0' : 'translate-x-full'}`}>
          <div className="px-2 pt-3.5 pb-2 border-b border-line shrink-0 bg-white flex items-center gap-2">
            <button onClick={() => setCategoriaAbierta('')} className="p-1.5 hover:bg-surface-2 rounded-lg transition text-ink-soft" aria-label="Regresar">
              <ChevronLeft size={18} />
            </button>
            <h2 className="font-display text-[16px] font-bold text-ink truncate flex-1">{categoriaAbierta || 'Categoría'}</h2>
            <button onClick={onClose} className="p-1.5 hover:bg-surface-2 rounded-lg transition shrink-0 border border-line bg-surface-2 text-ink-soft">
              <X size={15} />
            </button>
          </div>

          {catAbiertaData && (
            <div className="flex-1 overflow-y-auto overscroll-y-contain">
              <button
                onClick={() => navegar(catAbiertaData.categoria)}
                className="w-full m-3 p-3 bg-pine text-white rounded-lg flex items-center justify-between hover:bg-pine-deep transition shrink-0"
              >
                <span className="text-left">
                  <span className="block font-semibold text-[13px]">Ver todo {catAbiertaData.categoria}</span>
                  <span className="block font-price text-[10px] text-white/70">{catAbiertaData.total} productos</span>
                </span>
                <ChevronRight size={15} />
              </button>

              <div className="px-1">
                {catAbiertaData.subcategorias.map(sub => (
                  <button
                    key={sub.nombre}
                    onClick={() => navegar(catAbiertaData.categoria, sub.nombre)}
                    className="w-full flex items-center justify-between px-3 py-3 border-b border-line text-left hover:bg-surface-2 transition"
                  >
                    <span className="text-[13.5px] font-medium text-ink">{sub.nombre}</span>
                    <span className="font-price text-[10.5px] text-ink-faint">{sub.cantidad}</span>
                  </button>
                ))}
              </div>

              {/* Compra rápida express */}
              <div className="p-3">
                <div className="flex items-center justify-between mb-2">
                  <p className="font-price text-[9px] font-medium tracking-wide uppercase text-ink-faint">Compra rápida</p>
                  <span className="text-[9px] text-ink-faint">Agrega sin salir</span>
                </div>

                {cargandoProds ? (
                  <div className="flex justify-center py-10">
                    <Loader2 size={20} className="animate-spin text-pine" />
                  </div>
                ) : productos.length > 0 ? (
                  <div className="space-y-2">
                    {productos.map(p => {
                      const itemEnCart = carrito.find(i => i.codigo === p.codigo)
                      const qty = itemEnCart?.cantidad ?? 0
                      const FallbackIcon = iconoParaCategoria(p.categoria)
                      return (
                        <div key={p.codigo} className="flex items-center gap-2 bg-white border border-line rounded-lg p-2.5">
                          <div className="w-10 h-10 bg-pine-tint rounded-lg flex items-center justify-center overflow-hidden shrink-0 relative">
                            {p.imagen_url ? (
                              <img
                                src={p.imagen_url}
                                alt={p.descripcion}
                                className="w-full h-full object-contain"
                                onError={(e) => {
                                  e.currentTarget.classList.add('hidden')
                                  e.currentTarget.nextElementSibling?.classList.remove('hidden')
                                }}
                              />
                            ) : null}
                            <FallbackIcon size={17} strokeWidth={1.7} className={`text-pine-deep ${p.imagen_url ? 'hidden' : ''}`} />
                          </div>

                          <div className="flex-1 min-w-0">
                            <div className="text-[11px] font-semibold text-ink line-clamp-2 leading-snug">{p.descripcion}</div>
                            <div className="flex items-center gap-1.5 mt-0.5">
                              <span className="font-price text-xs font-semibold text-pine-deep">${p.precio_publico.toFixed(2)}</span>
                              {p.marca && <span className="text-[9px] text-ink-faint truncate">· {p.marca}</span>}
                            </div>
                          </div>

                          <div className="shrink-0">
                            {qty === 0 ? (
                              <button
                                onClick={() => handleAddExpress(p)}
                                className="w-8 h-8 rounded-full bg-pine hover:bg-pine-deep text-white flex items-center justify-center transition active:scale-[0.96]"
                                aria-label="Agregar"
                              >
                                <Plus size={16} />
                              </button>
                            ) : (
                              <div className="flex items-center bg-pine-tint border border-pine/30 text-pine-deep h-8 rounded-full overflow-hidden shrink-0">
                                <button onClick={() => handleStepper(p.codigo, qty, -1)} className="w-7 h-full flex items-center justify-center hover:bg-pine/10 transition active:scale-[0.96]" aria-label="Disminuir">
                                  <Minus size={10} />
                                </button>
                                <span className="px-1.5 text-[11px] font-semibold min-w-[14px] text-center">{qty}</span>
                                <button onClick={() => handleStepper(p.codigo, qty, 1)} className="w-7 h-full flex items-center justify-center hover:bg-pine/10 transition active:scale-[0.96]" aria-label="Aumentar">
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
                  <div className="text-center py-10 text-ink-faint text-xs">No hay productos disponibles en esta categoría</div>
                )}
              </div>
            </div>
          )}
        </div>

      </div>
    </>
  )
}

export default function CategoriasPanel(props: Props) {
  return (
    <Suspense fallback={null}>
      <CategoriasPanelInner {...props} />
    </Suspense>
  )
}

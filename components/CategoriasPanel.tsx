'use client'
import { useEffect, useState, useRef, useMemo, Suspense } from 'react'
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

function obtenerEmojiSubcategoria(nombreSub: string, categoria: string): string {
  const subNormalized = (nombreSub || '').toLowerCase().normalize('NFD').replace(/[\u0300-\u036f]/g, '');
  const catNormalized = (categoria || '').toLowerCase().normalize('NFD').replace(/[\u0300-\u036f]/g, '');

  // 1. Detección por palabras clave en la subcategoría
  if (subNormalized.includes('aceite')) return '🛢️';
  if (subNormalized.includes('arroz')) return '🍚';
  if (subNormalized.includes('atun') || subNormalized.includes('pescado') || subNormalized.includes('marisco')) return '🐟';
  if (subNormalized.includes('enlatado') || subNormalized.includes('conserva') || subNormalized.includes('salsa') || subNormalized.includes('aderezo') || subNormalized.includes('condimento') || subNormalized.includes('alineo')) return '🥫';
  if (subNormalized.includes('azucar') || subNormalized.includes('endulzante') || subNormalized.includes('reposteria')) return '🍬';
  if (subNormalized.includes('cafe')) return '☕';
  if (subNormalized.includes('cereal') || subNormalized.includes('granola') || subNormalized.includes('avena')) return '🥣';
  if (subNormalized.includes('fideo') || subNormalized.includes('pasta') || subNormalized.includes('sopa')) return '🍝';
  if (subNormalized.includes('grano') || subNormalized.includes('semilla')) return '🫘';
  if (subNormalized.includes('harina')) return '🌾';
  if (subNormalized.includes('te ') || subNormalized.includes('aromatica') || subNormalized === 'te') return '🍵';
  if (subNormalized.includes('mermelada') || subNormalized.includes('untable') || subNormalized.includes('dulce') || subNormalized.includes('postre') || subNormalized.includes('chocolate') || subNormalized.includes('bocadito')) return '🍫';
  if (subNormalized.includes('caramelo') || subNormalized.includes('chicle')) return '🍬';
  if (subNormalized.includes('snack') || subNormalized.includes('papas') || subNormalized.includes('mani') || subNormalized.includes('frutos secos') || subNormalized.includes('galleta')) return '🍿';
  if (subNormalized.includes('galleta')) return '🍪';

  if (subNormalized.includes('agua')) return '💧';
  if (subNormalized.includes('cola') || subNormalized.includes('gaseosa') || subNormalized.includes('refresco') || subNormalized.includes('bebida')) return '🥤';
  if (subNormalized.includes('energizante') || subNormalized.includes('hidratante')) return '⚡';
  if (subNormalized.includes('jugo')) return '🧃';
  if (subNormalized.includes('cerveza')) return '🍺';
  if (subNormalized.includes('vino') || subNormalized.includes('licor')) return '🍷';

  if (subNormalized.includes('shampoo') || subNormalized.includes('acondicionador') || subNormalized.includes('capilar') || subNormalized.includes('crema') || subNormalized.includes('facial') || subNormalized.includes('locion')) return '🧴';
  if (subNormalized.includes('jabon') || subNormalized.includes('ducha') || subNormalized.includes('gel') || subNormalized.includes('intimo') || subNormalized.includes('toalla humeda') || subNormalized.includes('femenina')) return '🧼';
  if (subNormalized.includes('desodorante') || subNormalized.includes('antitranspirante')) return '💨';
  if (subNormalized.includes('afeita') || subNormalized.includes('depila') || subNormalized.includes('rasuradora')) return '🪒';
  if (subNormalized.includes('oral') || subNormalized.includes('diente') || subNormalized.includes('dental') || subNormalized.includes('bucal') || subNormalized.includes('cepillo')) return '🪥';
  if (subNormalized.includes('perfume') || subNormalized.includes('splash')) return '🧪';

  if (subNormalized.includes('pollo') || subNormalized.includes('ave') || subNormalized.includes('carne') || subNormalized.includes('res') || subNormalized.includes('cerdo')) return '🥩';
  if (subNormalized.includes('embutido') || subNormalized.includes('chorizo') || subNormalized.includes('salchicha') || subNormalized.includes('jamon')) return '🌭';
  if (subNormalized.includes('helado')) return '🍨';

  if (subNormalized.includes('desechable') || subNormalized.includes('funda') || subNormalized.includes('plato') || subNormalized.includes('vaso') || subNormalized.includes('cubierto') || subNormalized.includes('servilleta') || subNormalized.includes('papel y empaque')) return '🍽️';

  if (subNormalized.includes('limpieza') || subNormalized.includes('desinfectante') || subNormalized.includes('lavavajillas') || subNormalized.includes('multiuso') || subNormalized.includes('utensilio')) return '🧹';
  if (subNormalized.includes('detergente') || subNormalized.includes('suavizante') || subNormalized.includes('blanqueador') || subNormalized.includes('ropa')) return '🫧';

  if (subNormalized.includes('leche') || subNormalized.includes('yogurt')) return '🥛';
  if (subNormalized.includes('queso')) return '🧀';
  if (subNormalized.includes('huevo')) return '🥚';
  if (subNormalized.includes('mantequilla') || subNormalized.includes('crema de leche')) return '🧈';

  if (subNormalized.includes('perro') || subNormalized.includes('canino')) return '🐶';
  if (subNormalized.includes('gato') || subNormalized.includes('felino')) return '🐱';
  if (subNormalized.includes('mascota') || subNormalized.includes('animal')) return '🐹';

  if (subNormalized.includes('pan ') || subNormalized === 'pan' || subNormalized.includes('panaderia') || subNormalized.includes('pastel') || subNormalized.includes('cake')) return '🍞';

  if (subNormalized.includes('insecticida') || subNormalized.includes('mosquito') || subNormalized.includes('mosca') || subNormalized.includes('raton') || subNormalized.includes('rastrero') || subNormalized.includes('insecto')) return '🚫';

  if (subNormalized.includes('cuaderno') || subNormalized.includes('carpeta')) return '📓';
  if (subNormalized.includes('lapiz') || subNormalized.includes('esfero') || subNormalized.includes('pluma') || subNormalized.includes('boligrafo') || subNormalized.includes('marcador') || subNormalized.includes('dibujo')) return '✏️';
  if (subNormalized.includes('mochila') || subNormalized.includes('bolso')) return '🎒';
  if (subNormalized.includes('regla') || subNormalized.includes('escuadra')) return '📐';
  if (subNormalized.includes('goma') || subNormalized.includes('silicona') || subNormalized.includes('pega') || subNormalized.includes('grapadora')) return '🧪';
  if (subNormalized.includes('pintura') || subNormalized.includes('oleo') || subNormalized.includes('tempera') || subNormalized.includes('acrilico') || subNormalized.includes('pincel')) return '🎨';
  if (subNormalized.includes('fomix') || subNormalized.includes('cartulina') || subNormalized.includes('papel')) return '📄';
  if (subNormalized.includes('cinta')) return '🎀';
  if (subNormalized.includes('escarcha')) return '✨';
  if (subNormalized.includes('limpiapipas')) return '🧶';
  if (subNormalized.includes('libro') || subNormalized.includes('novela') || subNormalized.includes('cuento') || subNormalized.includes('lectura')) return '📖';
  if (subNormalized.includes('peluche')) return '🧸';
  if (subNormalized.includes('regalo')) return '🎁';
  if (subNormalized.includes('fiesta')) return '🎉';
  if (subNormalized.includes('yanbal')) return '💄';

  if (subNormalized.includes('audifono') || subNormalized.includes('parlante') || subNormalized.includes('tecnologia') || subNormalized.includes('teclado') || subNormalized.includes('mouse') || subNormalized.includes('cable') || subNormalized.includes('cargador')) return '💻';

  if (subNormalized.includes('sexual') || subNormalized.includes('preservativo') || subNormalized.includes('condon') || subNormalized.includes('lubricante')) return '❤️';
  if (subNormalized.includes('farmacia') || subNormalized.includes('medicina') || subNormalized.includes('pastilla') || subNormalized.includes('salud') || subNormalized.includes('bienestar')) return '💊';

  // 2. Respaldo por categoría si no hubo coincidencia por palabra clave
  if (catNormalized.includes('abarrotes') || catNormalized.includes('alimento')) return '🥬';
  if (catNormalized.includes('bebida') || catNormalized.includes('licor') || catNormalized.includes('agua')) return '🥤';
  if (catNormalized.includes('personal') || catNormalized.includes('higiene') || catNormalized.includes('belleza') || catNormalized.includes('oral') || catNormalized.includes('capilar')) return '🧴';
  if (catNormalized.includes('limpieza') || catNormalized.includes('hogar') || catNormalized.includes('lavado')) return '🧹';
  if (catNormalized.includes('lacteo') || catNormalized.includes('leche')) return '🥛';
  if (catNormalized.includes('mascota')) return '🐶';
  if (catNormalized.includes('panaderia') || catNormalized.includes('pasteleria')) return '🍞';
  if (catNormalized.includes('congelado') || catNormalized.includes('refrigerado')) return '❄️';
  if (catNormalized.includes('golosina') || catNormalized.includes('snack') || catNormalized.includes('dulce')) return '🍪';
  if (catNormalized.includes('farmacia') || catNormalized.includes('salud')) return '💊';
  if (catNormalized.includes('escolar') || catNormalized.includes('libreria') || catNormalized.includes('papeleria')) return '📚';
  if (catNormalized.includes('arte') || catNormalized.includes('pintura')) return '🎨';
  if (catNormalized.includes('oficina')) return '🖊️';
  if (catNormalized.includes('manualidades') || catNormalized.includes('peluche')) return '✂️';
  if (catNormalized.includes('libros')) return '📖';
  if (catNormalized.includes('tecnologia')) return '💻';
  if (catNormalized.includes('juguetes')) return '🧸';

  return '📦';
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
        setActiva('')
        setCargando(false)
        return 
      }

      // Agrupar
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
        .select('codigo,descripcion,categoria,subcategoria,marca,stock,stock_minimo,precio_publico,precio_con_iva,tienda_id,imagen_url,detalles')
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
    const params = new URLSearchParams({ cat })
    if (sub) params.set('sub', sub)
    router.push(`/tiendas/${tiendaActiva.id}?${params.toString()}`)
    onClose()
  }

  // Lógica de agregado rápido del carrito en minitarjetas
  function handleAddExpress(p: Producto) {
    if (typeof navigator !== 'undefined' && navigator.vibrate) {
      navigator.vibrate(15)
    }
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
    if (typeof navigator !== 'undefined' && navigator.vibrate) {
      navigator.vibrate(10)
    }
    cambiarCantidad(codigo, cantActual + delta)
  }

  // Filtro de búsqueda local en las categorías cargadas
  const normalize = (str: string) => (str || '').normalize('NFD').replace(/[\u0300-\u036f]/g, '').toLowerCase()
  const catsFiltradas = q.trim()
    ? cats.filter(c =>
        normalize(c.categoria).includes(normalize(q)) ||
        c.subcategorias.some(s => normalize(s.nombre).includes(normalize(q)))
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
          emoji: match?.emoji || obtenerEmojiSubcategoria(sub.nombre, activaData.categoria),
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

        {/* Header Premium (Estilo Temu) */}
        <div className="px-4 pt-3.5 pb-2 border-b border-gray-100 shrink-0 bg-white">
          <div className="flex items-center justify-between gap-3 mb-2.5">
            {/* Selector de Tiendas como Tabs de Categorías */}
            <div className="flex gap-1.5 overflow-x-auto scrollbar-hide flex-1">
              {tiendas.map(tienda => {
                const esActiva = tiendaActiva?.id === tienda.id
                const fallbackEmoji = STORE_EMOJI[tienda.categoria ?? 'otros'] || '🏪'
                return (
                  <button
                    key={tienda.id}
                    onClick={() => setTiendaActiva(tienda)}
                    className={`flex items-center gap-1.5 px-3 py-1.5 rounded-full text-[11px] font-extrabold transition whitespace-nowrap border shrink-0
                      ${esActiva 
                        ? 'bg-green-600 border-green-600 text-white shadow-sm' 
                        : 'bg-gray-50 border-gray-100 text-gray-600 hover:bg-gray-100'
                      }`}
                  >
                    <span className="text-xs">
                      {tienda.logo_url 
                        ? <img src={tienda.logo_url} alt={tienda.nombre} className="w-3.5 h-3.5 object-contain inline rounded-sm" />
                        : fallbackEmoji
                      }
                    </span>
                    <span>{tienda.nombre}</span>
                  </button>
                )
              })}
            </div>
            {/* Botón de Cerrar */}
            <button onClick={onClose} className="p-1.5 hover:bg-gray-100 rounded-xl transition shrink-0 border border-gray-100 bg-gray-50 text-gray-500">
              <X size={15} />
            </button>
          </div>

          {/* Buscador de Categorías */}
          <div className="relative">
            <Search size={13} className="absolute left-3 top-1/2 -translate-y-1/2 text-gray-400" />
            <input
              value={q}
              onChange={e => setQ(e.target.value)}
              placeholder={`Buscar departamentos en ${tiendaActiva?.nombre ?? 'la tienda'}...`}
              className="w-full bg-gray-50 border border-gray-100 rounded-xl pl-8.5 pr-4 py-1.5 text-xs text-gray-800 placeholder-gray-400 focus:outline-none focus:border-green-500 focus:bg-white transition"
            />
          </div>
        </div>

        {/* Cuerpo — 2 columnas de Temu */}
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
                    className={`w-full text-left px-3 py-3 transition-all relative text-[10px] border-b border-gray-100/50
                      ${estaAct 
                        ? 'bg-white text-green-700 border-l-4 border-l-green-600 font-bold shadow-sm' 
                        : 'text-gray-500 hover:bg-white/50 hover:text-gray-700 font-medium'
                      }`}
                  >
                    <span className="block leading-tight break-words max-w-full">{toSentenceCase(cat.categoria)}</span>
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
                    className="m-3 p-3 bg-gradient-to-r from-green-50 to-emerald-50 border border-green-100 rounded-xl flex items-center justify-between hover:opacity-90 transition shrink-0 shadow-sm"
                  >
                    <div className="flex items-center gap-2.5">
                      <div className="w-8 h-8 bg-green-600 rounded-full flex items-center justify-center text-base shadow-sm">
                        <span className="brightness-0 invert">{cfg.emoji}</span>
                      </div>
                      <div className="text-left">
                        <div className="font-extrabold text-[11px] text-green-800">Ver todo {activaData.categoria}</div>
                        <div className="text-[9px] text-green-600/80">{activaData.total} productos · Explorar pasillo</div>
                      </div>
                    </div>
                    <ChevronRight size={13} className="text-green-700" />
                  </button>

                  {/* Title of Section */}
                  <div className="px-3 pt-2 pb-1 shrink-0">
                    <h3 className="text-[10px] font-extrabold text-gray-400 uppercase tracking-wider">Subcategorías</h3>
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
                              <div className="w-14 h-14 rounded-full bg-gray-50 border border-gray-100 flex items-center justify-center text-2xl shadow-sm group-hover:shadow-md group-hover:scale-105 group-hover:bg-white transition-all relative">
                                <span>{sub.emoji}</span>
                                {sub.hot && (
                                  <span className="absolute -top-1 -right-1 bg-red-500 text-white text-[7px] font-black px-1 py-0.5 rounded-full uppercase scale-85 origin-top-right shadow-sm shadow-red-500/20">
                                    Hot
                                  </span>
                                )}
                              </div>
                              {/* Nombre de Subcategoría */}
                              <span className="text-[10px] text-gray-700 font-extrabold text-center mt-1.5 leading-tight line-clamp-3 max-w-[72px] group-hover:text-green-700">
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
                              {/* Imagen de producto o fallback */}
                              <div className="w-10 h-10 bg-gray-50 border border-gray-100 rounded-lg flex items-center justify-center overflow-hidden shrink-0 relative">
                                {p.imagen_url ? (
                                  <>
                                    <img 
                                      src={p.imagen_url} 
                                      alt={p.descripcion} 
                                      className="w-full h-full object-contain"
                                      onError={(e) => {
                                        e.currentTarget.classList.add('hidden')
                                        e.currentTarget.nextElementSibling?.classList.remove('hidden')
                                      }}
                                    />
                                    <span className="text-lg hidden">{CAT_CFG[p.categoria]?.emoji || '📦'}</span>
                                  </>
                                ) : (
                                  <span className="text-lg">{CAT_CFG[p.categoria]?.emoji || '📦'}</span>
                                )}
                              </div>
                              
                              {/* Datos del producto */}
                              <div className="flex-1 min-w-0">
                                <div className="text-[11px] font-bold text-gray-800 line-clamp-2 leading-snug">
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

                              {/* Acciones de compra rápida (Temu/Tipti Style) */}
                              <div className="shrink-0">
                                {qty === 0 ? (
                                  <button
                                    onClick={() => handleAddExpress(p)}
                                    className="w-8 h-8 rounded-full bg-green-600 hover:bg-green-700 text-white flex items-center justify-center transition shadow-sm active:scale-[0.96] transition-transform duration-75"
                                    aria-label="Agregar"
                                  >
                                    <Plus size={16} />
                                  </button>
                                ) : (
                                  <div className="flex items-center bg-green-50 border border-green-200 text-green-700 h-8 rounded-full overflow-hidden shrink-0">
                                    <button 
                                      onClick={() => handleStepper(p.codigo, qty, -1)} 
                                      className="w-7 h-full flex items-center justify-center hover:bg-green-100 transition active:scale-[0.96] transition-transform duration-75"
                                      aria-label="Disminuir"
                                    >
                                      <Minus size={10} />
                                    </button>
                                    <span className="px-1.5 text-[11px] font-bold text-green-800 min-w-[14px] text-center">{qty}</span>
                                    <button 
                                      onClick={() => handleStepper(p.codigo, qty, 1)} 
                                      className="w-7 h-full flex items-center justify-center hover:bg-green-100 transition active:scale-[0.96] transition-transform duration-75"
                                      aria-label="Aumentar"
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

export default function CategoriasPanel(props: Props) {
  return (
    <Suspense fallback={null}>
      <CategoriasPanelInner {...props} />
    </Suspense>
  )
}

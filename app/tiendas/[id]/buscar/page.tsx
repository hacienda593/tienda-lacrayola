'use client'
import React, { useEffect, useState, useMemo, useRef, useCallback, Suspense } from 'react'
import { useParams, useRouter, useSearchParams } from 'next/navigation'
import { supabase } from '@/lib/supabase'
import { agregarItem, getCarrito, cambiarCantidad } from '@/lib/carrito'
import { OlTienda, Producto, CAT_EMOJI } from '@/lib/types'
import { customSearch } from '@/lib/search'
import {
  ArrowLeft, Search, ShoppingCart, Plus, Minus,
  Loader2, X, Store
} from 'lucide-react'

function fmt(n: number) { return '$' + (n || 0).toFixed(2) }

function ImagenProducto({ src, categoria, alt, descripcion }: { src?: string | null; categoria: string; alt: string; descripcion?: string }) {
  const [error, setError] = useState(false)
  if (!src || error) {
    return (
      <span className="select-none scale-95 opacity-80 filter drop-shadow-xs">
        {CAT_EMOJI[categoria] || '📦'}
      </span>
    )
  }
  return (
    <img
      src={src}
      alt={alt}
      onError={() => setError(true)}
      className="w-full h-full object-contain p-1.5 select-none pointer-events-none group-hover:scale-102 transition-transform duration-200"
    />
  )
}

function obtenerEmojiSubcategoria(nombreSub: string, categoria: string): string {
  const sub = (nombreSub || '').toLowerCase();
  if (sub.includes('cuaderno') || sub.includes('carpeta')) return '📓';
  if (sub.includes('lapiz') || sub.includes('esfero') || sub.includes('pluma') || sub.includes('boligrafo') || sub.includes('marcador') || sub.includes('color')) return '✏️';
  if (sub.includes('mochila') || sub.includes('bolso')) return '🎒';
  if (sub.includes('goma') || sub.includes('borrador') || sub.includes('corrector')) return '🧽';
  if (sub.includes('tijera') || sub.includes('cuchilla') || sub.includes('estilete')) return '✂️';
  if (sub.includes('regla') || sub.includes('compas') || sub.includes('escuadra')) return '📏';
  if (sub.includes('pegamento') || sub.includes('silicona') || sub.includes('cinta')) return '🧪';
  if (sub.includes('papel') || sub.includes('cartulina') || sub.includes('fomix')) return '📄';
  if (sub.includes('pincel') || sub.includes('tempera') || sub.includes('oleo') || sub.includes('acuarela') || sub.includes('pintura')) return '🎨';
  if (sub.includes('calculadora') || sub.includes('geometria')) return '🧮';
  if (sub.includes('leche') || sub.includes('lacte')) return '🥛';
  if (sub.includes('queso') || sub.includes('mantequilla')) return '🧀';
  if (sub.includes('yogur')) return '🍼';
  if (sub.includes('pan') || sub.includes('tostad') || sub.includes('galleta')) return '🍞';
  if (sub.includes('gaseosa') || sub.includes('cola') || sub.includes('refresco')) return '🥤';
  if (sub.includes('jugo') || sub.includes('nectar') || sub.includes('pulpa')) return '🧃';
  if (sub.includes('agua') || sub.includes('hidratante') || sub.includes('energizante')) return '💧';
  if (sub.includes('cerveza') || sub.includes('alcohol') || sub.includes('vino') || sub.includes('licor')) return '🍺';
  if (sub.includes('papas') || sub.includes('snacks') || sub.includes('nachos') || sub.includes('chifles') || sub.includes('cueritos')) return '🥔';
  if (sub.includes('chocolate') || sub.includes('bombon') || sub.includes('barra')) return '🍫';
  if (sub.includes('caramelo') || sub.includes('chicle') || sub.includes('gominola') || sub.includes('chupete')) return '🍬';
  if (sub.includes('detergente') || sub.includes('lavavajilla') || sub.includes('limpiador') || sub.includes('desinfectante')) return '🧹';
  if (sub.includes('jabon') || sub.includes('shampoo') || sub.includes('enjuague') || sub.includes('crema') || sub.includes('pasta')) return '🧼';
  if (sub.includes('papel higienico') || sub.includes('servilleta') || sub.includes('toalla')) return '🧻';
  if (sub.includes('insecticida') || sub.includes('veneno') || sub.includes('repelente')) return '🦟';
  if (sub.includes('aceite') || sub.includes('manteca')) return '🌻';
  if (sub.includes('arroz') || sub.includes('fideo') || sub.includes('tallarin') || sub.includes('pasta')) return '🌾';
  if (sub.includes('atun') || sub.includes('sardina') || sub.includes('conserva')) return '🐟';
  if (sub.includes('cafe') || sub.includes('te') || sub.includes('aromatica')) return '☕';
  if (sub.includes('azucar') || sub.includes('sal') || sub.includes('endulzante')) return '🧂';
  if (sub.includes('salsa') || sub.includes('mayonesa') || sub.includes('ketchup') || sub.includes('mostaza')) return '🥫';
  if (sub.includes('grano') || sub.includes('lenteja') || sub.includes('frejol') || sub.includes('garbanzo')) return '🫘';

  const cat = (categoria || '').toLowerCase();
  if (cat.includes('escolar') || cat.includes('oficina') || cat.includes('papeleria')) return '✏️';
  if (cat.includes('lacte') || cat.includes('queso') || cat.includes('leche')) return '🥛';
  if (cat.includes('bebida') || cat.includes('liquido') || cat.includes('gaseosa')) return '🥤';
  if (cat.includes('snack') || cat.includes('bocadito') || cat.includes('dulce')) return '🍿';
  if (cat.includes('limpieza') || cat.includes('aseo')) return '🧹';
  if (cat.includes('abarrotes') || cat.includes('comida') || cat.includes('despensa')) return '🌾';
  return '📦';
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
    if (typeof navigator !== 'undefined' && navigator.vibrate) navigator.vibrate(15)
    agregarItem({ ...p, tienda_id: tienda.id, tienda_nombre: tienda.nombre }, 1)
    if (typeof window !== 'undefined') {
      window.dispatchEvent(new CustomEvent('fly-to-cart', {
        detail: { x: e.clientX, y: e.clientY, emoji: CAT_EMOJI[p.categoria || ''] || '📦' }
      }))
    }
  }

  return (
    <div
      onClick={() => {
        if (onSelect) {
          onSelect(p)
        } else {
          router.push(`/producto/${encodeURIComponent(p.codigo)}`)
        }
      }}
      className="bg-white rounded-2xl border border-line overflow-hidden shadow-xs hover:shadow-sm transition-all flex flex-col cursor-pointer group"
    >
      <div className="relative bg-pine-tint h-36 flex items-center justify-center text-3xl overflow-hidden transition-colors w-full">
        <ImagenProducto src={p.imagen_url} categoria={p.categoria} alt={p.descripcion} descripcion={p.descripcion} />
        {p.stock > 0 && p.stock < 5 && (
          <span className="absolute top-2 left-2 text-[9px] font-bold bg-orange-500 text-white px-2 py-0.5 rounded-full z-10 animate-pulse">
            ⚡ Últimas
          </span>
        )}
        {cantidad === 0 && p.stock > 0 && (
          <button
            onClick={agregar}
            className="absolute bottom-2 right-2 w-9 h-9 rounded-full bg-pine hover:bg-pine-deep text-white flex items-center justify-center shadow-md hover:scale-105 active:scale-90 transition z-20 cursor-pointer border border-white/60 animate-in fade-in zoom-in-50 duration-150"
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
          <div className="text-[10px] md:text-xs font-bold text-ink leading-tight line-clamp-2 min-h-[26px] mb-0.5">{p.descripcion}</div>
          {p.marca && (
            <div className="text-[9px] text-ink-faint font-bold truncate mb-0.5">{p.marca}</div>
          )}
        </div>
        <div className="mt-2 space-y-1.5">
          <div className="text-xs font-black text-ink">{fmt(p.precio_publico)}</div>
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
    if (typeof navigator !== 'undefined' && navigator.vibrate) navigator.vibrate(15)
    agregarItem({ ...prod, tienda_id: tiendaId, tienda_nombre: tiendaNombre }, 1)
    if (typeof window !== 'undefined') {
      window.dispatchEvent(new CustomEvent('fly-to-cart', {
        detail: { x: e.clientX, y: e.clientY, emoji: CAT_EMOJI[prod.categoria || ''] || '📦' }
      }))
    }
  }

  function cambiar(e: React.MouseEvent, delta: number) {
    e.stopPropagation(); e.preventDefault()
    const nueva = cantidad + delta
    cambiarCantidad(prod.codigo, nueva)
  }

  if (cantidad === 0) return (
    <button onClick={agregar}
      className="w-full py-1.5 rounded-lg text-[10px] font-bold flex items-center justify-center gap-1 bg-pine-tint text-pine-deep border border-pine/30 hover:bg-pine hover:text-white hover:border-transparent active:scale-[0.96] transition-transform duration-75">
      <ShoppingCart size={10} /> Agregar
    </button>
  )

  return (
    <div className="flex items-center justify-between bg-pine rounded-lg overflow-hidden h-7">
      <button onClick={e => cambiar(e, -1)} className="px-2 py-1 text-white hover:bg-pine-deep transition font-bold active:scale-[0.96]"><Minus size={10} /></button>
      <span className="text-white text-[10px] font-bold">{cantidad}</span>
      <button onClick={e => cambiar(e, +1)} className="px-2 py-1 text-white hover:bg-pine-deep transition font-bold active:scale-[0.96]"><Plus size={10} /></button>
    </div>
  )
}

function TiendaBuscarContent() {
  const { id } = useParams<{ id: string }>()
  const router = useRouter()
  const searchParams = useSearchParams()

  const [tienda, setTienda] = useState<OlTienda | null>(null)
  const [base, setBase] = useState<Producto[]>([])
  const [cargando, setCargando] = useState(true)

  const [q, setQ] = useState('')
  const [buscando, setBuscando] = useState(false) // modo búsqueda activo
  const [cat, setCat] = useState('')
  const [sub, setSub] = useState('')
  const [visibles, setVisibles] = useState(40)

  // Refs para swipe horizontal y auto-scroll de tabs
  const tabsRef = useRef<HTMLDivElement>(null)
  const swipeAreaRef = useRef<HTMLDivElement>(null)
  const touchStartX = useRef(0)
  const touchStartY = useRef(0)
  const inputRef = useRef<HTMLInputElement>(null)

  // SKU Bottom Sheet States
  // Flying cart animation
  const triggerFlyAnimation = (startX: number, startY: number, emojiOrText: string) => {
    const cartButton = document.getElementById('mobile-cart-btn') || document.getElementById('global-cart-btn')
    if (!cartButton) return
    const cartRect = cartButton.getBoundingClientRect()
    const endX = cartRect.left + cartRect.width / 2
    const endY = cartRect.top + cartRect.height / 2

    const element = document.createElement('div')
    element.className = 'fixed z-[9999] pointer-events-none w-8 h-8 rounded-full bg-pine text-white flex items-center justify-center font-bold shadow-lg text-lg transition-all duration-700 ease-out'
    element.innerText = emojiOrText
    element.style.left = `${startX - 16}px`
    element.style.top = `${startY - 16}px`
    document.body.appendChild(element)

    element.getBoundingClientRect()

    element.style.transform = `translate(${endX - startX}px, ${endY - startY}px) scale(0.2)`
    element.style.opacity = '0.3'

    element.addEventListener('transitionend', () => {
      element.remove()
      cartButton.classList.add('scale-110')
      setTimeout(() => cartButton.classList.remove('scale-110'), 200)
    })
  }

  // Escuchar evento de "agregado al carrito" para disparar la animación de vuelo
  useEffect(() => {
    const handleFly = (e: Event) => {
      const { x, y, emoji } = (e as CustomEvent).detail
      triggerFlyAnimation(x, y, emoji)
    }
    window.addEventListener('fly-to-cart', handleFly)
    return () => window.removeEventListener('fly-to-cart', handleFly)
  }, [])

  // Cargar datos de la tienda
  useEffect(() => {
    async function cargar() {
      if (!id) return
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

  const cats = useMemo(() => {
    const map = new Map<string, number>()
    base.filter(p => p.stock > 0).forEach(p => { if (p.categoria) map.set(p.categoria, (map.get(p.categoria) ?? 0) + 1) })
    return Array.from(map.entries()).sort((a, b) => b[1] - a[1])
  }, [base])

  const activeCat = cat || (cats.length > 0 ? cats[0][0] : '')

  const subcats = useMemo(() => {
    if (!activeCat) return []
    const map = new Map<string, number>()
    base.filter(p => p.stock > 0 && p.categoria === activeCat).forEach(p => {
      if (p.subcategoria) map.set(p.subcategoria, (map.get(p.subcategoria) ?? 0) + 1)
    })
    return Array.from(map.entries()).sort((a, b) => a[0].localeCompare(b[0], 'es', { sensitivity: 'base' }))
  }, [base, activeCat])

  // Lista ordenada de tabs: ['', ...subcats] donde '' = 'Todo'
  const allSubs = useMemo(() => ['', ...subcats.map(([s]) => s)], [subcats])
  const activeSubIndex = allSubs.indexOf(sub === '' ? '' : sub)

  const filtrados = useMemo(() => {
    let pool = q.length >= 2
      ? customSearch(base, q)
      : base.filter(p => p.stock > 0)
    
    if (q.length < 2) {
      if (activeCat) pool = pool.filter(p => p.categoria === activeCat)
      if (sub) pool = pool.filter(p => p.subcategoria === sub)
    }
    return pool
  }, [base, q, activeCat, sub])

  // Auto-scroll del tab activo al centro del strip
  const scrollTabToView = useCallback((idx: number) => {
    if (!tabsRef.current) return
    const tabs = tabsRef.current.querySelectorAll('[data-tab]')
    const el = tabs[idx] as HTMLElement | undefined
    if (el) {
      el.scrollIntoView({ behavior: 'smooth', block: 'nearest', inline: 'center' })
    }
  }, [])

  // Cambiar subcategoría y auto-scroll al tab
  function cambiarSub(nuevaSub: string, idx: number) {
    setSub(nuevaSub)
    setVisibles(40)
    setTimeout(() => scrollTabToView(idx), 60)
  }

  // Handlers de swipe horizontal en el área de productos
  function onTouchStart(e: React.TouchEvent) {
    touchStartX.current = e.touches[0].clientX
    touchStartY.current = e.touches[0].clientY
  }

  function onTouchEnd(e: React.TouchEvent) {
    if (q.length >= 2) return // en modo búsqueda no hay swipe
    const dx = e.changedTouches[0].clientX - touchStartX.current
    const dy = e.changedTouches[0].clientY - touchStartY.current
    // Solo swipe horizontal (dx mayor que dy en valor absoluto, y dx > 40px)
    if (Math.abs(dx) < 40 || Math.abs(dy) > Math.abs(dx) * 0.8) return
    const currentIdx = activeSubIndex < 0 ? 0 : activeSubIndex
    if (dx < 0 && currentIdx < allSubs.length - 1) {
      // Deslizar izquierda → siguiente subcategoría
      cambiarSub(allSubs[currentIdx + 1], currentIdx + 1)
    } else if (dx > 0 && currentIdx > 0) {
      // Deslizar derecha → subcategoría anterior
      cambiarSub(allSubs[currentIdx - 1], currentIdx - 1)
    }
  }

  if (cargando) {
    return (
      <div className="max-w-5xl mx-auto px-4 py-16 flex justify-center items-center min-h-[calc(100vh-120px)]">
        <Loader2 size={32} className="animate-spin text-pine" />
      </div>
    )
  }

  if (!tienda) {
    return (
      <div className="max-w-lg mx-auto px-4 py-16 text-center">
        <Store size={48} className="text-line mx-auto mb-3" />
        <p className="text-ink-faint">Tienda no encontrada</p>
        <button onClick={() => router.back()} className="mt-4 text-pine text-sm underline border-none bg-transparent cursor-pointer">← Volver</button>
      </div>
    )
  }

  return (
    <div className="max-w-5xl mx-auto flex flex-col h-[calc(100dvh)] overflow-hidden bg-white select-none">

      {/* ── HEADER DINÁMICO estilo Tipti ── */}
      <div className="shrink-0 bg-white border-b border-line">

        {buscando ? (
          /* Modo búsqueda: barra de búsqueda expandida */
          <div className="flex items-center gap-2 px-3 py-2.5">
            <button
              onClick={() => { setBuscando(false); setQ(''); setSub('') }}
              className="p-1.5 shrink-0 border-none bg-transparent cursor-pointer active:scale-90 transition"
            >
              <ArrowLeft size={20} className="text-ink-soft" />
            </button>
            <div className="flex-1 relative">
              <input
                ref={inputRef}
                value={q}
                onChange={e => setQ(e.target.value)}
                placeholder={`Buscar en ${tienda.nombre || 'esta tienda'}...`}
                autoFocus
                className="w-full bg-surface-2 border border-transparent rounded-xl pl-3 pr-8 py-2 text-xs text-ink placeholder-ink-faint focus:outline-none focus:border-pine focus:bg-white transition"
              />
              {q && (
                <button
                  onClick={() => setQ('')}
                  className="absolute right-3 top-1/2 -translate-y-1/2 text-ink-faint border-none bg-transparent cursor-pointer"
                >
                  <X size={13} />
                </button>
              )}
            </div>
          </div>
        ) : (
          /* Modo navegación: ← NombreCategoria · 🔍 🛒 */
          <div className="flex items-center gap-1 px-2 py-2.5">
            <button
              onClick={() => router.push(`/tiendas/${id}`)}
              className="p-1.5 shrink-0 border-none bg-transparent cursor-pointer active:scale-90 transition"
            >
              <ArrowLeft size={20} className="text-ink-soft" />
            </button>
            <h1 className="flex-1 text-sm font-extrabold text-ink text-center truncate px-1">
              {activeCat || tienda.nombre}
            </h1>
            <button
              onClick={() => setBuscando(true)}
              className="p-2 shrink-0 border-none bg-transparent cursor-pointer active:scale-90 transition text-ink-soft hover:text-pine"
            >
              <Search size={19} />
            </button>
            <button
              onClick={() => window.dispatchEvent(new Event('open-cart-global'))}
              className="p-2 shrink-0 border-none bg-transparent cursor-pointer active:scale-90 transition text-ink-soft hover:text-pine"
            >
              <ShoppingCart size={19} />
            </button>
          </div>
        )}

        {/* ── Segunda fila: tabs de subcategorías estilo Tipti ── */}
        {!buscando && q.length < 2 && subcats.length > 0 && (
          <div
            ref={tabsRef}
            className="overflow-x-auto scrollbar-hide flex border-t border-line"
          >
            {/* Tab Todo */}
            <button
              data-tab
              onClick={() => cambiarSub('', 0)}
              className={`shrink-0 px-4 py-2.5 text-[11px] font-extrabold relative whitespace-nowrap border-none bg-transparent cursor-pointer transition-colors
                ${sub === '' ? 'text-pine' : 'text-ink-faint hover:text-ink-soft'}`}
            >
              Todos los productos
              {sub === '' && <span className="absolute bottom-0 left-0 right-0 h-[2.5px] bg-pine rounded-t-full" />}
            </button>

            {subcats.map(([s], idx) => (
              <button
                key={s}
                data-tab
                onClick={() => cambiarSub(s, idx + 1)}
                className={`shrink-0 px-4 py-2.5 text-[11px] font-extrabold relative whitespace-nowrap border-none bg-transparent cursor-pointer transition-colors
                  ${sub === s ? 'text-pine' : 'text-ink-faint hover:text-ink-soft'}`}
              >
                {s}
                {sub === s && <span className="absolute bottom-0 left-0 right-0 h-[2.5px] bg-pine rounded-t-full" />}
              </button>
            ))}
          </div>
        )}

        {/* Resultados de búsqueda texto */}
        {q.length >= 2 && (
          <div className="px-3 py-2 flex items-center gap-2 border-t border-line">
            <Search size={12} className="text-pine shrink-0" />
            <span className="text-[10px] font-black text-ink-faint uppercase tracking-wider flex-1">
              {filtrados.length} resultado{filtrados.length !== 1 ? 's' : ''} para &quot;{q}&quot;
            </span>
            <button onClick={() => { setQ(''); setBuscando(false) }} className="text-ink-faint hover:text-ink-soft border-none bg-transparent cursor-pointer">
              <X size={13} />
            </button>
          </div>
        )}
      </div>

      <div className="flex-1 flex flex-row min-h-0 overflow-hidden">
        {/* ── Columna Izquierda: Categorías (Sidebar) ── */}
        <aside className="w-[68px] shrink-0 h-full bg-surface-2 border-r border-line overflow-y-auto flex flex-col select-none">
          {cats.map(([c]) => {
            const esActiva = activeCat === c
            return (
              <button
                key={c}
                onClick={() => {
                  setCat(c)
                  setSub('')
                  setQ('')
                  setBuscando(false)
                  setVisibles(40)
                }}
                className={`py-3.5 px-1 border-l-[3px] cursor-pointer relative active:bg-surface-2 flex flex-col items-center gap-1 transition-all border-none bg-transparent
                  ${esActiva
                    ? 'bg-white border-l-pine text-pine-deep'
                    : 'border-l-transparent text-ink-faint'}`}
              >
                <span className="text-[18px] leading-none">{CAT_EMOJI[c] || '📦'}</span>
                <span className={`text-[8px] leading-tight font-bold break-words text-center max-w-[58px] ${esActiva ? 'text-pine-deep' : 'text-ink-faint'}`}>{c}</span>
                {esActiva && <div className="absolute right-0 top-1/2 -translate-y-1/2 w-[3px] h-6 bg-pine rounded-l-md" />}
              </button>
            )
          })}
        </aside>

        {/* ── Columna Derecha: Productos con swipe entre subcategorías ── */}
        <div
          ref={swipeAreaRef}
          className="flex-1 h-full overflow-y-auto overscroll-y-contain p-2 pb-24"
          onTouchStart={onTouchStart}
          onTouchEnd={onTouchEnd}
        >
          {filtrados.length === 0 ? (
            <div className="text-center py-16 text-ink-faint text-xs italic">
              {q.length >= 2
                ? 'No se encontraron productos'
                : 'Sin productos en este pasillo'}
            </div>
          ) : (
            <>
              <div className="grid grid-cols-2 gap-1.5">
                {filtrados.slice(0, visibles).map(p => (
                  <TiendaVerticalProductCard
                    key={p.codigo}
                    p={p}
                    tienda={tienda}
                    onSelect={(prod) => router.push(`/producto/${encodeURIComponent(prod.codigo)}`)}
                  />
                ))}
              </div>
              {filtrados.length > visibles && (
                <button
                  onClick={() => setVisibles(v => v + 40)}
                  className="w-full mt-4 py-2.5 rounded-xl border border-pine/30 text-pine-deep text-[11px] font-extrabold hover:bg-pine-tint transition cursor-pointer bg-transparent"
                >
                  Ver más ({filtrados.length - visibles} restantes)
                </button>
              )}
            </>
          )}
        </div>
      </div>

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
          <h2 className="font-bold text-sm flex items-center gap-1.5">⚠️ Error de Búsqueda:</h2>
          <p className="font-mono font-bold">{this.state.error?.message}</p>
          <pre className="font-mono text-[9px] overflow-auto max-h-60 bg-white p-2.5 border border-red-100 rounded-xl leading-relaxed">{this.state.error?.stack}</pre>
        </div>
      )
    }
    return this.props.children
  }
}

export default function TiendaBuscarPage() {
  return (
    <Suspense fallback={
      <div className="max-w-5xl mx-auto px-4 py-16 flex justify-center items-center min-h-[calc(100vh-120px)]">
        <Loader2 size={32} className="animate-spin text-pine" />
      </div>
    }>
      <LocalErrorBoundary>
        <TiendaBuscarContent />
      </LocalErrorBoundary>
    </Suspense>
  )
}

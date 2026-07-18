'use client'
import React, { useEffect, useState, useMemo, useRef, useCallback, Suspense } from 'react'
import { useParams, useRouter } from 'next/navigation'
import { supabase } from '@/lib/supabase'
import { getCarrito, cambiarCantidad } from '@/lib/carrito'
import { OlTienda, Producto, CAT_EMOJI } from '@/lib/types'
import { customSearch } from '@/lib/search'
import { ArrowLeft, Search, ShoppingCart, Plus, Minus, Loader2, X, ScanLine } from 'lucide-react'
import dynamic from 'next/dynamic'
import CartDrawer from '@/components/CartDrawer'

const BarcodeScanner = dynamic(() => import('@/components/BarcodeScanner'), { ssr: false })

function fmt(n: number) { return '$' + (n || 0).toFixed(2) }

function ImagenProducto({ src, categoria, alt }: { src?: string | null; categoria: string; alt: string }) {
  const [err, setErr] = useState(false)
  if (!src || err) return <span className="text-2xl select-none">{CAT_EMOJI[categoria] || '📦'}</span>
  return <img src={src} alt={alt} onError={() => setErr(true)} className="w-full h-full object-contain p-1 pointer-events-none" />
}

function ProductCard({ p, tiendaId, tiendaNombre }: { p: Producto; tiendaId: string; tiendaNombre: string }) {
  const [qty, setQty] = useState(() => getCarrito().find(i => i.codigo === p.codigo)?.cantidad ?? 0)

  useEffect(() => {
    const sync = () => setQty(getCarrito().find(i => i.codigo === p.codigo)?.cantidad ?? 0)
    window.addEventListener('carrito-update', sync)
    return () => window.removeEventListener('carrito-update', sync)
  }, [p.codigo])

  function agregar(e: React.MouseEvent) {
    e.stopPropagation()
    window.dispatchEvent(new CustomEvent('open-sku-selector', {
      detail: { prod: p, clientX: e.clientX, clientY: e.clientY, tiendaId, tiendaNombre }
    }))
  }
  function quitar(e: React.MouseEvent) {
    e.stopPropagation(); cambiarCantidad(p.codigo, qty - 1)
  }

  const agotado = p.stock <= 0
  return (
    <div className="bg-white rounded-xl border border-gray-100 overflow-hidden shadow-sm flex flex-col relative">
      <div className="relative bg-gray-50 aspect-square flex items-center justify-center overflow-hidden">
        <ImagenProducto src={p.imagen_url} categoria={p.categoria} alt={p.descripcion} />
        {agotado && (
          <div className="absolute inset-0 bg-white/75 flex items-center justify-center">
            <span className="text-[9px] font-extrabold text-red-500 bg-red-50 px-1.5 py-0.5 rounded-full border border-red-200">AGOTADO</span>
          </div>
        )}
        {!agotado && qty === 0 && (
          <button onClick={agregar} className="absolute bottom-1.5 right-1.5 w-7 h-7 rounded-full bg-green-600 text-white flex items-center justify-center shadow border-none cursor-pointer active:scale-90 transition">
            <Plus size={14} strokeWidth={3} />
          </button>
        )}
        {!agotado && qty > 0 && (
          <div className="absolute bottom-1.5 right-1.5 flex items-center gap-0.5 bg-green-600 rounded-full px-1.5 py-0.5 shadow">
            <button onClick={quitar} className="w-5 h-5 flex items-center justify-center text-white border-none bg-transparent cursor-pointer"><Minus size={11} strokeWidth={3} /></button>
            <span className="text-white text-[11px] font-extrabold min-w-[14px] text-center">{qty}</span>
            <button onClick={agregar} className="w-5 h-5 flex items-center justify-center text-white border-none bg-transparent cursor-pointer"><Plus size={11} strokeWidth={3} /></button>
          </div>
        )}
      </div>
      <div className="p-2 flex flex-col gap-0.5 flex-1">
        <p className="text-[10px] text-gray-700 font-semibold leading-tight line-clamp-2">{p.descripcion}</p>
        {p.marca && <p className="text-[9px] text-gray-400 uppercase tracking-wide truncate">{p.marca}</p>}
        <p className="text-xs font-extrabold text-green-700 mt-auto">{fmt(p.precio_publico)}</p>
      </div>
    </div>
  )
}

function CategoriaContent() {
  const { id, cat: catParam } = useParams<{ id: string; cat: string }>()
  const cat = decodeURIComponent(catParam || '')
  const router = useRouter()

  const [tienda, setTienda] = useState<OlTienda | null>(null)
  const [base, setBase] = useState<Producto[]>([])
  const [cargando, setCargando] = useState(true)
  const [sub, setSub] = useState('')
  const [q, setQ] = useState('')
  const [buscando, setBuscando] = useState(false)
  const [escaner, setEscaner] = useState(false)
  const [visibles, setVisibles] = useState(60)
  const [cartOpen, setCartOpen] = useState(false)

  const tabsRef = useRef<HTMLDivElement>(null)
  const touchStartX = useRef(0)
  const touchStartY = useRef(0)

  useEffect(() => {
    const abrirCart = () => setCartOpen(true)
    window.addEventListener('open-cart-global', abrirCart)
    return () => window.removeEventListener('open-cart-global', abrirCart)
  }, [])

  useEffect(() => {
    if (!id) return
    setCargando(true)
    supabase.from('ol_tiendas').select('*').eq('id', id).single()
      .then(({ data }) => { if (data) setTienda(data as OlTienda) })

    supabase.from('ol_productos')
      .select('*').gt('stock', 0).gt('precio_publico', 0)
      .or(`tienda_id.eq.${id},tienda_id.is.null`)
      .then(({ data }) => {
        if (data) setBase(data as Producto[])
        setCargando(false)
      })
  }, [id])

  const subcats = useMemo(() => {
    const map = new Map<string, number>()
    base.filter(p => p.stock > 0 && p.categoria === cat).forEach(p => {
      if (p.subcategoria) map.set(p.subcategoria, (map.get(p.subcategoria) ?? 0) + 1)
    })
    return Array.from(map.entries()).sort((a, b) => a[0].localeCompare(b[0], 'es', { sensitivity: 'base' }))
  }, [base, cat])

  const allSubs = useMemo(() => ['', ...subcats.map(([s]) => s)], [subcats])
  const activeIdx = allSubs.indexOf(sub)

  const filtrados = useMemo(() => {
    let pool = q.length >= 2 ? customSearch(base, q) : base.filter(p => p.stock > 0 && p.categoria === cat)
    if (q.length < 2 && sub) pool = pool.filter(p => p.subcategoria === sub)
    return pool
  }, [base, cat, sub, q])

  const scrollTabToView = useCallback((idx: number) => {
    if (!tabsRef.current) return
    const tabs = tabsRef.current.querySelectorAll('[data-tab]')
    const el = tabs[idx] as HTMLElement | undefined
    if (el) el.scrollIntoView({ behavior: 'smooth', block: 'nearest', inline: 'center' })
  }, [])

  function cambiarSub(s: string, idx: number) {
    setSub(s); setVisibles(60)
    setTimeout(() => scrollTabToView(idx), 60)
  }

  function onTouchStart(e: React.TouchEvent) {
    touchStartX.current = e.touches[0].clientX
    touchStartY.current = e.touches[0].clientY
  }
  function onTouchEnd(e: React.TouchEvent) {
    if (q.length >= 2) return
    const dx = e.changedTouches[0].clientX - touchStartX.current
    const dy = e.changedTouches[0].clientY - touchStartY.current
    if (Math.abs(dx) < 45 || Math.abs(dy) > Math.abs(dx) * 0.8) return
    const cur = activeIdx < 0 ? 0 : activeIdx
    if (dx < 0 && cur < allSubs.length - 1) cambiarSub(allSubs[cur + 1], cur + 1)
    else if (dx > 0 && cur > 0) cambiarSub(allSubs[cur - 1], cur - 1)
  }

  async function onBarcodeDetected(code: string) {
    setEscaner(false)
    const match = base.find(p => p.codigo === code || (p as any).codigo_barras === code)
    if (match) {
      window.dispatchEvent(new CustomEvent('open-sku-selector', {
        detail: { prod: match, clientX: 200, clientY: 300, tiendaId: id, tiendaNombre: tienda?.nombre || '' }
      }))
    } else {
      setQ(code); setBuscando(true)
    }
  }

  if (cargando) return (
    <div className="min-h-dvh bg-white flex items-center justify-center">
      <Loader2 size={32} className="animate-spin text-green-500" />
    </div>
  )

  return (
    <div className="bg-white flex flex-col h-dvh overflow-hidden select-none">
      <CartDrawer isOpen={cartOpen} onClose={() => setCartOpen(false)} />
      {escaner && <BarcodeScanner onDetected={onBarcodeDetected} onClose={() => setEscaner(false)} />}

      {/* ── HEADER ESTILO TIPTI ── */}
      <div className="shrink-0 bg-white border-b border-gray-100 z-20">
        {buscando ? (
          <div className="flex items-center gap-2 px-3 py-2.5">
            <button onClick={() => { setBuscando(false); setQ('') }}
              className="p-1.5 border-none bg-transparent cursor-pointer active:scale-90 transition shrink-0">
              <ArrowLeft size={20} className="text-gray-700" />
            </button>
            <div className="flex-1 relative">
              <input value={q} onChange={e => setQ(e.target.value)}
                placeholder={`Buscar en ${cat}...`} autoFocus
                className="w-full bg-gray-100 rounded-xl pl-3 pr-16 py-2 text-xs text-gray-800 placeholder-gray-400 focus:outline-none focus:ring-2 focus:ring-green-400 border-none transition" />
              <div className="absolute right-2 top-1/2 -translate-y-1/2 flex items-center gap-1">
                {q && <button onClick={() => setQ('')} className="w-6 h-6 flex items-center justify-center text-gray-400 border-none bg-transparent cursor-pointer"><X size={13} /></button>}
                <button onClick={() => { setEscaner(true); setBuscando(false) }}
                  className="w-7 h-7 flex items-center justify-center rounded-lg bg-green-600 text-white border-none cursor-pointer active:scale-90 transition">
                  <ScanLine size={14} />
                </button>
              </div>
            </div>
          </div>
        ) : (
          <div className="flex items-center px-2 py-2.5 gap-1">
            <button onClick={() => router.push(`/tiendas/${id}`)}
              className="p-1.5 shrink-0 border-none bg-transparent cursor-pointer active:scale-90 transition">
              <ArrowLeft size={20} className="text-gray-700" />
            </button>
            <h1 className="flex-1 text-[13px] font-extrabold text-gray-800 text-center truncate px-1">
              {CAT_EMOJI[cat] || '📦'} {cat}
            </h1>
            <button onClick={() => setBuscando(true)}
              className="p-2 shrink-0 border-none bg-transparent cursor-pointer active:scale-90 transition text-gray-600 hover:text-green-600">
              <Search size={19} />
            </button>
            <button onClick={() => setEscaner(true)}
              className="p-2 shrink-0 border-none bg-transparent cursor-pointer active:scale-90 transition text-green-600"
              title="Escanear código de barras">
              <ScanLine size={19} />
            </button>
            <button onClick={() => setCartOpen(true)}
              className="p-2 shrink-0 border-none bg-transparent cursor-pointer active:scale-90 transition text-gray-600 hover:text-green-600">
              <ShoppingCart size={19} />
            </button>
          </div>
        )}

        {/* Tabs subcategorías con indicador verde */}
        {!buscando && subcats.length > 0 && (
          <div ref={tabsRef} className="overflow-x-auto scrollbar-hide flex border-t border-gray-100">
            <button data-tab onClick={() => cambiarSub('', 0)}
              className={`shrink-0 px-4 py-2.5 text-[11px] font-extrabold relative whitespace-nowrap border-none bg-transparent cursor-pointer transition-colors ${!sub ? 'text-green-600' : 'text-gray-500 hover:text-gray-700'}`}>
              Todos los productos
              {!sub && <span className="absolute bottom-0 left-0 right-0 h-[2.5px] bg-green-600 rounded-t-full" />}
            </button>
            {subcats.map(([s], idx) => (
              <button key={s} data-tab onClick={() => cambiarSub(s, idx + 1)}
                className={`shrink-0 px-4 py-2.5 text-[11px] font-extrabold relative whitespace-nowrap border-none bg-transparent cursor-pointer transition-colors ${sub === s ? 'text-green-600' : 'text-gray-500 hover:text-gray-700'}`}>
                {s}
                {sub === s && <span className="absolute bottom-0 left-0 right-0 h-[2.5px] bg-green-600 rounded-t-full" />}
              </button>
            ))}
          </div>
        )}

        {q.length >= 2 && (
          <div className="px-3 py-1.5 border-t border-gray-100 flex items-center gap-2">
            <Search size={11} className="text-green-600 shrink-0" />
            <span className="text-[10px] font-black text-gray-500 flex-1">
              {filtrados.length} resultado{filtrados.length !== 1 ? 's' : ''} para &quot;{q}&quot;
            </span>
          </div>
        )}
      </div>

      {/* ── GRID DE PRODUCTOS (swipeable entre subcats) ── */}
      <div className="flex-1 overflow-y-auto overscroll-y-contain p-2 pb-24"
        onTouchStart={onTouchStart} onTouchEnd={onTouchEnd}>
        {filtrados.length === 0 ? (
          <div className="text-center py-20 text-gray-400 text-xs italic">
            {q.length >= 2 ? `Sin resultados para "${q}"` : 'Sin productos en esta sección'}
          </div>
        ) : (
          <>
            <div className="grid grid-cols-2 gap-2">
              {filtrados.slice(0, visibles).map(p => (
                <ProductCard key={p.codigo} p={p} tiendaId={id} tiendaNombre={tienda?.nombre || ''} />
              ))}
            </div>
            {filtrados.length > visibles && (
              <button onClick={() => setVisibles(v => v + 60)}
                className="w-full mt-4 py-2.5 rounded-xl border border-green-200 text-green-700 text-[11px] font-extrabold hover:bg-green-50 transition cursor-pointer bg-transparent">
                Ver más ({filtrados.length - visibles} restantes)
              </button>
            )}
          </>
        )}
      </div>
    </div>
  )
}

export default function CategoriaPage() {
  return (
    <Suspense fallback={
      <div className="min-h-dvh bg-white flex items-center justify-center">
        <Loader2 size={28} className="animate-spin text-green-500" />
      </div>
    }>
      <CategoriaContent />
    </Suspense>
  )
}

'use client'
import Link from 'next/link'
import { useRouter, usePathname, useSearchParams } from 'next/navigation'
import { ShoppingCart, Search, LayoutGrid, X, Home, ChevronDown, ChevronUp, Camera } from 'lucide-react'
import { useEffect, useState, Suspense } from 'react'
import { getCarrito } from '@/lib/carrito'
import { supabase } from '@/lib/supabase'
import MenuDrawer from '@/components/MenuDrawer'
import CategoriasPanel from '@/components/CategoriasPanel'
import CartDrawer from '@/components/CartDrawer'
import BarcodeScannerModal from '@/components/BarcodeScannerModal'

function TopBar() {
  const pathname = usePathname()
  const [tiendaNombre, setTiendaNombre] = useState('')

  const activeTId = pathname.startsWith('/tiendas/') && pathname !== '/tiendas'
    ? pathname.split('/')[2]
    : ''
  const esTienda = !!activeTId

  useEffect(() => {
    if (!activeTId) {
      setTiendaNombre('')
      return
    }
    supabase.from('ol_tiendas')
      .select('nombre')
      .eq('id', activeTId)
      .single()
      .then(({ data }) => {
        if (data) setTiendaNombre(data.nombre)
      })
  }, [activeTId])

  const compartirActual = () => {
    if (typeof window === 'undefined') return
    const url = window.location.href
    navigator.clipboard.writeText(url)
    const texto = `Te comparto la tienda ${tiendaNombre || 'aliada'} en línea: ${url}`
    window.open(`https://api.whatsapp.com/send?text=${encodeURIComponent(texto)}`, '_blank')
  }

  if (esTienda) {
    return (
      <div className="bg-green-700 text-white text-[11px] md:text-xs text-center py-1.5 px-4 font-medium flex items-center justify-center gap-2 animate-fade-in select-none">
        <span>🏪 Comprando en <strong className="font-extrabold text-green-100">{tiendaNombre || 'la tienda'}</strong></span>
        <span className="opacity-40">·</span>
        <Link href="/" className="underline hover:text-green-200 transition font-bold flex items-center gap-0.5">
          🏠 Ir al Inicio
        </Link>
        <span className="opacity-40">·</span>
        <button
          onClick={compartirActual}
          className="underline hover:text-green-200 transition font-bold flex items-center gap-0.5 cursor-pointer bg-transparent border-none text-white p-0"
          title="Compartir tienda"
        >
          🔗 Compartir
        </button>
      </div>
    )
  }

  return (
    <div className="bg-green-700 text-white text-[11px] md:text-xs text-center py-1.5 px-4 font-medium select-none">
      🚚 Envíos a domicilio en Los Bancos · Respaldado por La Crayola
    </div>
  )
}

function HeaderStoreCategories() {
  const pathname = usePathname()
  const searchParams = useSearchParams()
  const router = useRouter()

  const [mounted, setMounted] = useState(false)
  useEffect(() => {
    setMounted(true)
  }, [])

  if (mounted && searchParams?.get('view') === 'pasillos') return null

  const activeTId = pathname.startsWith('/tiendas/') && pathname !== '/tiendas'
    ? pathname.split('/')[2]
    : ''

  const [cats, setCats] = useState<[string, number][]>([])
  const [localCatOpen, setLocalCatOpen] = useState(false)
  const cat = searchParams?.get('cat') || ''

  useEffect(() => {
    setLocalCatOpen(false)
  }, [cat])

  useEffect(() => {
    if (!activeTId) {
      setCats([])
      return
    }

    supabase.from('ol_tiendas')
      .select('nombre')
      .eq('id', activeTId)
      .single()
      .then(({ data: tienda }) => {
        if (!tienda) return
        const esCray = tienda.nombre.toLowerCase().includes('crayola')
        
        let pQuery = supabase.from('ol_productos')
          .select('categoria')
          .gt('stock', 0)
          .gt('precio_publico', 0)
          
        if (esCray) {
          pQuery = pQuery.or(`tienda_id.eq.${activeTId},tienda_id.is.null`)
        } else {
          pQuery = pQuery.eq('tienda_id', activeTId)
        }
        
        pQuery.then(({ data }) => {
          if (data) {
            const map = new Map<string, number>()
            data.forEach(p => {
              if (p.categoria) map.set(p.categoria, (map.get(p.categoria) ?? 0) + 1)
            })
            const list = Array.from(map.entries()).sort((a, b) => b[1] - a[1])
            setCats(list)
          }
        })
      })
  }, [activeTId])

  if (!activeTId || cats.length === 0) return null

  function updateFiltersUrl(newFilters: { cat?: string; sub?: string; marca?: string; q?: string }) {
    const params = new URLSearchParams(searchParams ? searchParams.toString() : '')
    if (newFilters.cat !== undefined) {
      if (newFilters.cat) params.set('cat', newFilters.cat)
      else params.delete('cat')
      params.delete('sub')
      params.delete('marca')
    }
    const qs = params.toString()
    router.push(qs ? `${pathname}?${qs}` : pathname)
  }

  const CAT_EMOJI: Record<string, string> = {
    'Escolar': '📚', 'Arte': '🎨', 'Oficina': '🖊️', 'Tecnologia': '💻',
    'Juguetes': '🧸', 'Manualidades': '✂️', 'Libros': '📖', 'Pintura': '🖌️',
    'Papeleria': '📄', 'Alimentos': '🥦', 'Bebidas': '🥤', 'Limpieza': '🧹',
    'Higiene': '🧴', 'Farmacia': '💊', 'Carnes': '🥩', 'Lacteos': '🧀', 'Snacks': '🍿'
  }

  return (
    <div className="md:hidden relative border-t border-gray-100 px-4 bg-white pb-2 shadow-xs transition-all duration-200">
      <div className="flex items-center justify-between gap-2 relative">
        <div className="flex-1 overflow-x-auto scrollbar-hide pr-10">
          <div className="flex gap-4.5 whitespace-nowrap text-xs font-bold items-center py-1.5">
            <button
              onClick={() => updateFiltersUrl({ cat: '', sub: '', marca: '' })}
              className={`pb-1 transition-all relative shrink-0 cursor-pointer
                ${!cat 
                  ? 'text-green-700 font-extrabold border-b-2 border-green-600' 
                  : 'text-gray-500 hover:text-gray-700'}`}
            >
              🏪 Todos
            </button>
            {cats.map(([c, count]) => {
              const esActivo = cat === c
              return (
                <button
                  key={c}
                  onClick={() => updateFiltersUrl({ cat: c, sub: '', marca: '' })}
                  className={`pb-1 transition-all relative shrink-0 cursor-pointer
                    ${esActivo 
                      ? 'text-green-700 font-extrabold border-b-2 border-green-600' 
                      : 'text-gray-500 hover:text-gray-700'}`}
                >
                  {c}
                </button>
              )
            })}
          </div>
        </div>

        <div className="absolute right-0 top-0 bottom-0 flex items-center bg-gradient-to-l from-white via-white/95 to-transparent pl-8 pr-0.5 z-10">
          <button
            onClick={() => setLocalCatOpen(!localCatOpen)}
            className={`w-7 h-7 rounded-full flex items-center justify-center border transition shadow-xs cursor-pointer active:scale-90
              ${localCatOpen 
                ? 'bg-green-600 border-green-600 text-white' 
                : 'bg-white border-gray-200 text-gray-500 hover:bg-gray-50'}`}
            title="Ver todos los pasillos"
          >
            {localCatOpen ? <ChevronUp size={14} className="stroke-[3]" /> : <ChevronDown size={14} className="stroke-[3]" />}
          </button>
        </div>
      </div>

      {localCatOpen && (
        <div className="absolute left-0 right-0 top-full mt-0 bg-white border border-gray-100 rounded-b-2xl shadow-xl p-4.5 z-50 animate-in slide-in-from-top-4 fade-in duration-200 space-y-3">
          <div className="text-[10px] font-black text-gray-400 uppercase tracking-wider">Pasillos del Local</div>
          <div className="grid grid-cols-5 gap-y-4 gap-x-1.5 justify-items-center">
            <button
              onClick={() => { updateFiltersUrl({ cat: '', sub: '', marca: '' }); setLocalCatOpen(false) }}
              className="flex flex-col items-center group relative transition active:scale-95 duration-100 cursor-pointer"
            >
              <div className={`w-11 h-11 rounded-full flex items-center justify-center text-xl shadow-xs border transition
                ${!cat 
                  ? 'bg-green-50 border-green-200 text-green-700 shadow-sm' 
                  : 'bg-gray-50 border-gray-100 text-gray-600 hover:bg-white'}`}
              >
                🏪
              </div>
              <span className={`text-[9px] font-extrabold text-center mt-1.5 leading-tight line-clamp-2 max-w-[64px]
                ${!cat ? 'text-green-700' : 'text-gray-600'}`}
              >
                Todos
              </span>
            </button>
            {cats.map(([c, count]) => {
              const esActivo = cat === c
              return (
                <button
                  key={c}
                  onClick={() => { updateFiltersUrl({ cat: c, sub: '', marca: '' }); setLocalCatOpen(false) }}
                  className="flex flex-col items-center group relative transition active:scale-95 duration-100 cursor-pointer"
                >
                  <div className={`w-11 h-11 rounded-full flex items-center justify-center text-xl shadow-xs border transition
                    ${esActivo 
                      ? 'bg-green-50 border-green-200 text-green-700 shadow-sm' 
                      : 'bg-gray-50 border-gray-100 text-gray-600 hover:bg-white'}`}
                  >
                    {CAT_EMOJI[c] || '📦'}
                  </div>
                  <span className={`text-[9px] font-extrabold text-center mt-1.5 leading-tight line-clamp-2 max-w-[64px]
                    ${esActivo ? 'text-green-700' : 'text-gray-600'}`}
                  >
                    {c}
                  </span>
                </button>
              )
            })}
          </div>
        </div>
      )}
    </div>
  )
}

function HeaderSearch() {
  const router = useRouter()
  const pathname = usePathname()
  const searchParams = useSearchParams()
  const [q, setQ] = useState('')
  const [tiendaNombre, setTiendaNombre] = useState('')
  const [isScannerOpen, setIsScannerOpen] = useState(false)

  const handleScanSuccess = async (barcode: string) => {
    setIsScannerOpen(false)
    if (!barcode) return

    try {
      const { data } = await supabase
        .from('ol_productos')
        .select('codigo')
        .eq('codigo', barcode)
        .limit(1)
        .maybeSingle()

      if (data) {
        router.push(`/producto/${barcode}`)
      } else {
        router.push(`/productos?q=${encodeURIComponent(barcode)}`)
      }
    } catch (e) {
      console.error(e)
      router.push(`/productos?q=${encodeURIComponent(barcode)}`)
    }
  }

  // 1. Detectar si estamos en una tienda
  const activeTId = pathname.startsWith('/tiendas/') && pathname !== '/tiendas'
    ? pathname.split('/')[2]
    : ''
  const esTienda = !!activeTId

  // 2. Obtener el nombre de la tienda
  useEffect(() => {
    if (!activeTId) {
      setTiendaNombre('')
      return
    }
    supabase.from('ol_tiendas')
      .select('nombre')
      .eq('id', activeTId)
      .single()
      .then(({ data }) => {
        if (data) setTiendaNombre(data.nombre)
      })
  }, [activeTId])

  const searchParamsStr = searchParams ? searchParams.toString() : ''
  // 3. Sincronizar el input local con la URL query param q
  useEffect(() => {
    setQ(searchParams.get('q') || '')
  }, [searchParamsStr])

  // Limpiar el nombre para formato móvil compacto (ej: "Supermercado Tuti" -> "Tuti")
  function getNombreCorto(completo: string) {
    if (!completo) return ''
    let s = completo.replace(/supermercados?|comisariatos?|librer[ií]a|farmacias?/gi, '').trim()
    const parts = s.split(' ')
    if (parts[0].toLowerCase() === 'el' || parts[0].toLowerCase() === 'la') {
      return parts.slice(0, 2).join(' ')
    }
    return parts[0]
  }

  function buscar(e: React.SyntheticEvent<HTMLFormElement>) {
    e.preventDefault()
    if (typeof document !== 'undefined') {
      (document.activeElement as HTMLElement)?.blur()
    }
    if (esTienda || pathname === '/productos') {
      const params = new URLSearchParams(searchParams ? searchParams.toString() : '')
      if (q.trim()) params.set('q', q.trim())
      else params.delete('q')
      params.delete('cat')
      params.delete('sub')
      params.delete('marca')
      const qs = params.toString()
      router.replace(qs ? `${pathname}?${qs}` : pathname)
    } else {
      router.push(`/productos${q.trim() ? `?q=${encodeURIComponent(q.trim())}` : ''}`)
    }
  }

  function manejarEscribir(val: string) {
    setQ(val)
  }

  function limpiar() {
    setQ('')
    if (esTienda || pathname === '/productos') {
      const params = new URLSearchParams(searchParams ? searchParams.toString() : '')
      params.delete('q')
      const qs = params.toString()
      router.replace(qs ? `${pathname}?${qs}` : pathname)
    }
  }

  const nombreTiendaCorto = getNombreCorto(tiendaNombre)
  const prPadding = 'pr-10'

  return (
    <form onSubmit={buscar} className="flex-1 max-w-xl">
      <div className="relative">
        <Search size={15} className="absolute left-3 top-1/2 -translate-y-1/2 text-gray-400" />
        <input
          value={q}
          onChange={e => manejarEscribir(e.target.value)}
          placeholder={esTienda ? `Buscar en ${nombreTiendaCorto || 'la tienda'}...` : "Buscar productos, marcas, categorías..."}
          className={`w-full bg-gray-100 border border-gray-200 rounded-xl pl-9 ${prPadding} py-2.5 text-sm text-gray-800 placeholder-gray-400 focus:outline-none focus:border-green-500 focus:bg-white transition`}
        />
        {q ? (
          <button
            type="button"
            onClick={limpiar}
            className="absolute right-3 top-1/2 -translate-y-1/2 text-gray-400 hover:text-gray-600 cursor-pointer"
          >
            <X size={14} />
          </button>
        ) : (
          <button
            type="button"
            onClick={() => setIsScannerOpen(true)}
            className="absolute right-3 top-1/2 -translate-y-1/2 text-gray-400 hover:text-green-600 active:scale-90 transition cursor-pointer border-none bg-transparent"
            title="Escanear código de barras"
          >
            <Camera size={15} />
          </button>
        )}
      </div>

      <BarcodeScannerModal
        isOpen={isScannerOpen}
        onClose={() => setIsScannerOpen(false)}
        onScanSuccess={handleScanSuccess}
      />
    </form>
  )
}

export default function Header() {
  const router = useRouter()
  const [n, setN]                   = useState(0)
  const [drawerOpen, setDrawerOpen] = useState(false)
  const [catOpen,    setCatOpen]    = useState(false)
  const [cartDrawerOpen, setCartDrawerOpen] = useState(false)

  useEffect(() => {
    const update = () => setN(getCarrito().reduce((s, i) => s + i.cantidad, 0))
    update()
    window.addEventListener('carrito-update', update)
    return () => window.removeEventListener('carrito-update', update)
  }, [])

  useEffect(() => {
    const abrirCats = () => setCatOpen(true)
    const abrirMenu = () => setDrawerOpen(true)
    const abrirCart = () => setCartDrawerOpen(true)
    window.addEventListener('open-categorias-global', abrirCats)
    window.addEventListener('open-menu-global', abrirMenu)
    window.addEventListener('open-cart-global', abrirCart)
    return () => {
      window.removeEventListener('open-categorias-global', abrirCats)
      window.removeEventListener('open-menu-global', abrirMenu)
      window.removeEventListener('open-cart-global', abrirCart)
    }
  }, [])

  return (
    <>
      <Suspense fallback={null}>
        <MenuDrawer    open={drawerOpen} onClose={() => setDrawerOpen(false)} />
      </Suspense>
      <CategoriasPanel open={catOpen}  onClose={() => setCatOpen(false)} />
      <CartDrawer isOpen={cartDrawerOpen} onClose={() => setCartDrawerOpen(false)} />

      <header className="sticky top-0 z-50 bg-white border-b border-gray-200 shadow-sm">
        {/* Top bar */}
        <TopBar />

        <div className="max-w-5xl mx-auto px-4 py-3 flex items-center gap-3">
          {/* Hamburguesa */}
          <button
            onClick={() => setDrawerOpen(true)}
            className="flex items-center justify-center w-9 h-9 rounded-xl hover:bg-gray-100 transition shrink-0"
            aria-label="Abrir menú"
          >
            <span className="flex flex-col gap-[5px]">
              <span className="block w-5 h-[2px] bg-gray-700 rounded" />
              <span className="block w-5 h-[2px] bg-gray-700 rounded" />
              <span className="block w-5 h-[2px] bg-gray-700 rounded" />
            </span>
          </button>

          {/* Logo */}
          <Link href="/" className="flex items-center gap-2 shrink-0 group" aria-label="Inicio">
            <img
              src="/logo-tienlo.png"
              alt="Tienlo Logo"
              className="h-9 md:h-11 w-auto object-contain bg-white rounded-lg p-0.5"
            />
            <div className="hidden md:flex items-center gap-2 pl-2 border-l border-gray-200">
              <span className="text-[10px] font-bold text-emerald-700 bg-emerald-50 px-2 py-0.5 rounded-md">
                Una marca de La Crayola
              </span>
            </div>
          </Link>

          {/* Buscador */}
          <Suspense fallback={<div className="flex-1 max-w-xl h-10 bg-gray-100 rounded-xl" />}>
            <HeaderSearch />
          </Suspense>

          {/* Carrito */}
          <button
            id="global-cart-btn"
            onClick={() => setCartDrawerOpen(true)}
            className="relative flex items-center gap-1.5 bg-green-600 hover:bg-green-700 text-white px-3.5 py-2.5 rounded-xl transition shrink-0 active:scale-[0.96] cursor-pointer"
          >
            <ShoppingCart size={18} />
            <span className="text-sm font-semibold hidden sm:block">Carrito</span>
            {n > 0 && (
              <span className="absolute -top-1.5 -right-1.5 bg-red-500 text-white text-[10px] font-bold rounded-full min-w-[18px] h-[18px] flex items-center justify-center px-1">
                {n > 99 ? '99+' : n}
              </span>
            )}
          </button>
        </div>

        {/* Barra inferior del header */}
        <div className="border-t border-gray-100 bg-white hidden md:block">
          <div className="max-w-5xl mx-auto px-4">
            <div className="flex items-center gap-1 py-1.5">

              {/* Botón Categorías — siempre visible */}
              <button
                onClick={() => setCatOpen(true)}
                className="flex items-center gap-1.5 bg-green-600 hover:bg-green-700 text-white text-xs font-bold px-3 py-1.5 rounded-lg transition shrink-0 mr-2"
              >
                <LayoutGrid size={13} />
                Tiendas
              </button>

              {/* Links rápidos desktop */}
              <div className="hidden md:flex gap-5 overflow-x-auto scrollbar-hide">
                <Link href="/tiendas"
                  className="shrink-0 text-sm font-bold text-green-700 hover:text-green-900 transition whitespace-nowrap py-0.5 flex items-center gap-1">
                  🏪 Tiendas
                </Link>
                <span className="text-gray-200 py-0.5">|</span>
                <Link href="/productos?frecuentes=true"
                  className="shrink-0 text-sm font-bold text-green-700 hover:text-green-900 transition whitespace-nowrap py-0.5 flex items-center gap-1">
                  🔄 Frecuentes
                </Link>
                <span className="text-gray-200 py-0.5">|</span>
                <Link href="/impresion"
                  className="shrink-0 text-sm font-bold text-green-700 hover:text-green-900 transition whitespace-nowrap py-0.5 flex items-center gap-1">
                  🖨️ Impresiones
                </Link>
                <span className="text-gray-200 py-0.5">|</span>
                <Link href="/recargas"
                  className="shrink-0 text-sm font-bold text-green-700 hover:text-green-900 transition whitespace-nowrap py-0.5 flex items-center gap-1">
                  📱 Recargas
                </Link>
                <span className="text-gray-200 py-0.5">|</span>
                {['Escolar','Arte','Oficina','Tecnologia','Juguetes','Manualidades','Libros','Pintura'].map(c => (
                  <Link key={c} href={`/productos?cat=${encodeURIComponent(c)}`}
                    className="shrink-0 text-sm text-gray-600 hover:text-green-700 font-medium transition whitespace-nowrap py-0.5">
                    {c}
                  </Link>
                ))}
              </div>

              {/* Móvil: chips de categorías horizontales */}
              <div className="md:hidden flex gap-2 overflow-x-auto scrollbar-hide flex-1 items-center min-w-0">
                <Link href="/productos?frecuentes=true"
                  className="shrink-0 text-xs text-green-700 hover:text-green-900 font-bold bg-green-50 px-2.5 py-1 rounded-lg border border-green-200 transition whitespace-nowrap flex items-center gap-1">
                  🔄 Frecuentes
                </Link>
                <Link href="/impresion"
                  className="shrink-0 text-xs text-green-700 hover:text-green-900 font-bold bg-green-50 px-2.5 py-1 rounded-lg border border-green-200 transition whitespace-nowrap flex items-center gap-1">
                  🖨️ Impresiones
                </Link>
                <Link href="/recargas"
                  className="shrink-0 text-xs text-green-700 hover:text-green-900 font-bold bg-green-50 px-2.5 py-1 rounded-lg border border-green-200 transition whitespace-nowrap flex items-center gap-1">
                  📱 Recargas
                </Link>
                {['Escolar','Arte','Oficina','Juguetes','Libros'].map(c => (
                  <Link key={c} href={`/productos?cat=${encodeURIComponent(c)}`}
                    className="shrink-0 text-xs text-gray-600 hover:text-green-700 font-medium transition whitespace-nowrap py-1">
                    {c}
                  </Link>
                ))}
              </div>

            </div>
          </div>
        </div>

        {/* Dynamic Store Categories Bar (2nd Row) */}
        <Suspense fallback={null}>
          <HeaderStoreCategories />
        </Suspense>
      </header>
    </>
  )
}

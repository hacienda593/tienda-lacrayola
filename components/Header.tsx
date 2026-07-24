'use client'
import Link from 'next/link'
import { useRouter, usePathname, useSearchParams } from 'next/navigation'
import { ShoppingCart, Search, LayoutGrid, X, Home, ChevronDown, ChevronUp, Camera } from 'lucide-react'
import { useEffect, useState, useRef, Suspense } from 'react'
import { getCarrito } from '@/lib/carrito'
import { supabase } from '@/lib/supabase'
import MenuDrawer from '@/components/MenuDrawer'
import CategoriasPanel from '@/components/CategoriasPanel'
import CartDrawer from '@/components/CartDrawer'
import BarcodeScannerModal from '@/components/BarcodeScannerModal'
import HeaderCategoryTabs from '@/components/HeaderCategoryTabs'
import { sugerirCategorias, type SugerenciaBusqueda } from '@/lib/search'
import { corregirTermino } from '@/lib/diccionarioBusqueda'

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
      <div className="bg-surface-2 border-b border-line text-ink-soft text-[10px] md:text-[11px] font-ui font-medium tracking-wide uppercase text-center py-1.5 px-4 flex items-center justify-center gap-2 animate-fade-in select-none">
        <span>Comprando en <strong className="font-semibold text-ink normal-case">{tiendaNombre || 'la tienda'}</strong></span>
        <span className="opacity-40">·</span>
        <Link href="/" className="hover:text-pine transition font-semibold">
          Ir al inicio
        </Link>
        <span className="opacity-40">·</span>
        <button
          onClick={compartirActual}
          className="hover:text-pine transition font-semibold cursor-pointer bg-transparent border-none text-ink-soft p-0"
          title="Compartir tienda"
        >
          Compartir
        </button>
      </div>
    )
  }

  return (
    <div className="bg-surface-2 border-b border-line text-ink-soft text-[10px] md:text-[11px] font-ui font-medium tracking-wide uppercase text-center py-1.5 px-4 select-none">
      Envíos a domicilio en Los Bancos · <span className="text-pine font-semibold">Respaldado por La Crayola</span>
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

  const activeTId = pathname.startsWith('/tiendas/') && pathname !== '/tiendas'
    ? pathname.split('/')[2]
    : ''

  const [cats, setCats] = useState<[string, number][]>([])
  const [localCatOpen, setLocalCatOpen] = useState(false)
  const cat = searchParams?.get('cat') || ''

  const shouldHide = mounted && (searchParams?.get('view') === 'pasillos' || pathname.endsWith('/buscar'))
  const catActivoEnTienda = mounted && !!cat && activeTId !== ''

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

  if (shouldHide || !activeTId || cats.length === 0) return null

  const wrapperClass = catActivoEnTienda ? 'hidden md:block' : 'block'

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

  // En móvil: navegar a ruta dedicada /tiendas/[id]/categoria/[cat]
  function navegarACategoria(c: string) {
    router.push(`/tiendas/${activeTId}/categoria/${encodeURIComponent(c)}`)
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
                  onClick={() => navegarACategoria(c)}
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
                  onClick={() => { navegarACategoria(c); setLocalCatOpen(false) }}
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
  const [sugerencias, setSugerencias] = useState<SugerenciaBusqueda[]>([])
  const [inputFocused, setInputFocused] = useState(false)
  const debounceRef = useRef<ReturnType<typeof setTimeout> | null>(null)

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
    setQ(searchParams?.get('q') || '')
  }, [searchParamsStr])

  // 4. Fila de refinamiento: sugerencias de subcategoría mientras el usuario escribe
  useEffect(() => {
    if (debounceRef.current) clearTimeout(debounceRef.current)
    const term = q.trim()
    if (term.length < 2) {
      setSugerencias([])
      return
    }
    debounceRef.current = setTimeout(async () => {
      const termCorregido = await corregirTermino(term)

      let query = supabase
        .from('ol_productos')
        .select('categoria,subcategoria')
        .ilike('descripcion', `%${termCorregido}%`)
        .gt('stock', 0)
        .limit(300)
      if (esTienda) query = query.eq('tienda_id', activeTId)

      const { data } = await query
      if (!data) return

      setSugerencias(sugerirCategorias(data, termCorregido, 6))
    }, 300)

    return () => { if (debounceRef.current) clearTimeout(debounceRef.current) }
  }, [q, esTienda, activeTId])

  function irASugerencia(s: SugerenciaBusqueda) {
    const params = new URLSearchParams(searchParams ? searchParams.toString() : '')
    if (q.trim()) params.set('q', q.trim())
    if (s.cat) params.set('cat', s.cat)
    if (s.sub) params.set('sub', s.sub)
    setSugerencias([])
    setInputFocused(false)
    const destino = esTienda ? pathname : '/productos'
    const qs = params.toString()
    router.push(qs ? `${destino}?${qs}` : destino)
  }

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
    <form onSubmit={buscar} className="flex-1 max-w-xl relative">
      <div className="relative">
        <Search size={15} className="absolute left-3 top-1/2 -translate-y-1/2 text-ink-faint" />
        <input
          value={q}
          onChange={e => manejarEscribir(e.target.value)}
          onFocus={() => setInputFocused(true)}
          onBlur={() => setTimeout(() => setInputFocused(false), 150)}
          placeholder={esTienda ? `Buscar en ${nombreTiendaCorto || 'la tienda'}...` : "Buscar productos, marcas, categorías..."}
          className={`w-full font-ui bg-surface-2 border border-line rounded-xl pl-9 ${prPadding} py-2.5 text-sm text-ink placeholder-ink-faint focus:outline-none focus:border-pine focus:bg-white transition`}
        />
        {q ? (
          <button
            type="button"
            onClick={limpiar}
            className="absolute right-3 top-1/2 -translate-y-1/2 text-ink-faint hover:text-ink cursor-pointer"
          >
            <X size={14} />
          </button>
        ) : (
          <button
            type="button"
            onClick={() => setIsScannerOpen(true)}
            className="absolute right-3 top-1/2 -translate-y-1/2 text-ink-faint hover:text-pine active:scale-90 transition cursor-pointer border-none bg-transparent"
            title="Escanear código de barras"
          >
            <Camera size={15} />
          </button>
        )}
      </div>

      {inputFocused && sugerencias.length > 0 && (
        <div className="absolute left-0 right-0 top-full mt-1.5 bg-white border border-line rounded-xl shadow-lg z-50 py-1.5 animate-in fade-in slide-in-from-top-1 duration-150 overflow-hidden font-ui">
          {sugerencias.map(s => (
            <button
              key={`${s.cat}-${s.sub}`}
              type="button"
              onMouseDown={e => e.preventDefault()}
              onClick={() => irASugerencia(s)}
              className="w-full flex items-center gap-2.5 text-left text-sm text-ink hover:bg-surface-2 hover:text-pine-deep px-3.5 py-2 transition cursor-pointer"
            >
              <Search size={13} className="text-ink-faint shrink-0" />
              <span className="truncate">{s.label}</span>
            </button>
          ))}
        </div>
      )}

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
  const pathname = usePathname()
  const [mounted, setMounted] = useState(false)
  
  useEffect(() => {
    setMounted(true)
  }, [])

  const [n, setN]                   = useState(0)
  const [drawerOpen, setDrawerOpen] = useState(false)
  const [catOpen,    setCatOpen]    = useState(false)
  const [cartDrawerOpen, setCartDrawerOpen] = useState(false)

  // Ocultar header en /buscar y en rutas de categoria (tienen su propio header Tipti)
  const hideHeader = mounted && (pathname.endsWith('/buscar') || pathname.includes('/categoria/'))

  // --- Render del Header original (mantener el resto del JSX) ---

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

  if (hideHeader) return null;

  return (
    <>
      <Suspense fallback={null}>
        <MenuDrawer    open={drawerOpen} onClose={() => setDrawerOpen(false)} />
      </Suspense>
      <CategoriasPanel open={catOpen}  onClose={() => setCatOpen(false)} />
      <CartDrawer isOpen={cartDrawerOpen} onClose={() => setCartDrawerOpen(false)} />

      <header className="sticky top-0 z-50 bg-white border-b border-line shadow-sm font-ui">
        {/* Top bar */}
        <TopBar />

        <div className="max-w-5xl mx-auto px-4 py-3 flex items-center gap-3">
          {/* Hamburguesa */}
          <button
            onClick={() => setDrawerOpen(true)}
            className="flex items-center justify-center w-9 h-9 rounded-xl hover:bg-surface-2 transition shrink-0"
            aria-label="Abrir menú"
          >
            <span className="flex flex-col gap-[5px]">
              <span className="block w-5 h-[2px] bg-ink rounded" />
              <span className="block w-5 h-[2px] bg-ink rounded" />
              <span className="block w-5 h-[2px] bg-ink rounded" />
            </span>
          </button>

          {/* Logo */}
          <Link href="/" className="flex items-center gap-2 shrink-0 group" aria-label="Inicio">
            <img
              src="/logo-tienlo.png"
              alt="Tienlo Logo"
              className="h-9 md:h-11 w-auto object-contain bg-white rounded-lg p-0.5"
            />
            <div className="hidden md:flex items-center gap-2 pl-2.5 border-l border-line">
              <span className="text-[9px] font-price font-medium tracking-wide uppercase text-ink-faint">
                La Crayola
              </span>
            </div>
          </Link>

          {/* Buscador */}
          <Suspense fallback={<div className="flex-1 max-w-xl h-10 bg-surface-2 rounded-xl" />}>
            <HeaderSearch />
          </Suspense>

          {/* Carrito */}
          <button
            id="global-cart-btn"
            onClick={() => setCartDrawerOpen(true)}
            className="relative flex items-center gap-1.5 bg-surface-2 hover:bg-line/60 border border-line text-ink px-3 py-2.5 rounded-xl transition shrink-0 active:scale-[0.96] cursor-pointer"
          >
            <ShoppingCart size={18} />
            <span className="text-sm font-semibold hidden sm:block">Carrito</span>
            {n > 0 && (
              <span className="absolute -top-1.5 -right-1.5 bg-ink text-white text-[10px] font-price font-semibold rounded-full min-w-[18px] h-[18px] flex items-center justify-center px-1">
                {n > 99 ? '99+' : n}
              </span>
            )}
          </button>
        </div>

        {/* Barra de pestañas de categorías estilo Pinduoduo / Marketplace */}
        <Suspense fallback={null}>
          <HeaderCategoryTabs />
        </Suspense>

        {/* Dynamic Store Categories Bar (2nd Row para dentro de tiendas) */}
        <Suspense fallback={null}>
          <HeaderStoreCategories />
        </Suspense>
      </header>
    </>
  )
}

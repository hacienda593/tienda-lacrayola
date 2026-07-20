'use client'
import Link from 'next/link'
import { usePathname, useSearchParams, useRouter } from 'next/navigation'
import { Home, Store, ShoppingCart, ClipboardList, Menu, LayoutGrid, Sparkles, ArrowLeft, Package, Search, LayoutList, Tag } from 'lucide-react'
import { useEffect, useState, Suspense } from 'react'
import { getCarrito } from '@/lib/carrito'
import { supabase } from '@/lib/supabase'

function NavBarMobileInner() {
  const pathname = usePathname()
  const searchParams = useSearchParams()
  const router = useRouter()
  const [n, setN] = useState(0)
  const [crayolaId, setCrayolaId] = useState('')
  const [tiendaNombre, setTiendaNombre] = useState('')
  const [marcaFiltro, setMarcaFiltro] = useState('')

  useEffect(() => {
    const update = (e: Event) => {
      const customEvent = e as CustomEvent
      setMarcaFiltro(customEvent.detail?.marca || '')
    }
    window.addEventListener('marca-filtro-update', update)
    return () => window.removeEventListener('marca-filtro-update', update)
  }, [])

  const [mounted, setMounted] = useState(false)
  useEffect(() => {
    setMounted(true)
  }, [])

  const activeCat = searchParams?.get('cat') || ''
  const activeSub = searchParams?.get('sub') || ''
  const activeMarca = searchParams?.get('marca') || ''
  const activeQ = searchParams?.get('q') || ''
  const hasActiveFilter = !!(activeCat || activeSub || activeMarca || activeQ)

  // 1. Obtener la ID de la tienda activa si está en la URL o ruta
  const activeTId = pathname.startsWith('/tiendas/') && pathname !== '/tiendas'
    ? pathname.split('/')[2]
    : (pathname.startsWith('/productos') ? ((searchParams ? searchParams.get('tienda_id') : null) || crayolaId || 'b7fe17b9-c3da-4c9f-9a87-169d70623566') : '')

  const esTienda = !!activeTId

  // 2. Escuchar actualizaciones de la cantidad de artículos del carrito
  useEffect(() => {
    const update = () => setN(getCarrito().reduce((s, i) => s + i.cantidad, 0))
    update()
    window.addEventListener('carrito-update', update)
    return () => window.removeEventListener('carrito-update', update)
  }, [])

  // 3. Obtener dinámicamente el ID de la tienda La Crayola
  useEffect(() => {
    supabase.from('ol_tiendas')
      .select('id')
      .ilike('nombre', '%crayola%')
      .single()
      .then(({ data }) => { if (data) setCrayolaId(data.id) })
  }, [])

  // 4. Obtener dinámicamente el nombre de la tienda aliada actual
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
  }, [pathname, activeTId])

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

  function openCart(e: React.MouseEvent) {
    e.preventDefault()
    window.dispatchEvent(new Event('open-cart-global'))
  }

  function handleBuscarClick() {
    try {
      const url = `/tiendas/${activeTId}/buscar`;
      window.open(url, '_blank');
    } catch (e) {
      console.error('Error al abrir la página de búsqueda:', e);
    }
  }

  // ── Lógica Inteligente para el botón INICIO ──
  // 1er click dentro de tienda: regresa al inicio de esa tienda o resetea filtros/scroll
  // 2do click (o estando ya en el inicio de la tienda): regresa al Inicio General de la App Web (/)
  function handleInicioTiendaClick() {
    const storeRootPath = `/tiendas/${activeTId}`
    const estaEnRaizTienda = pathname === storeRootPath && !hasActiveFilter

    if (estaEnRaizTienda) {
      // 2do click estando ya en el inicio de la tienda: ir al inicio de la web app
      router.push('/')
    } else {
      // 1er click: ir al inicio de la tienda actual y subir scroll
      if (typeof window !== 'undefined') window.scrollTo({ top: 0, behavior: 'smooth' })
      router.push(storeRootPath)
    }
  }

  function handleInicioAppClick(e: React.MouseEvent) {
    if (pathname === '/') {
      if (hasActiveFilter) {
        e.preventDefault()
        window.dispatchEvent(new CustomEvent('category-tab-change', { detail: '' }))
        router.push('/')
      }
      if (typeof window !== 'undefined') {
        window.scrollTo({ top: 0, behavior: 'smooth' })
      }
    }
  }

  if (esTienda) {
    // ── Contexto Tienda Aliada: Navegación interna ──
    const hasAislesActive = mounted && (searchParams?.get('view') === 'pasillos' || pathname.endsWith('/buscar'))
    const nombreCorto = getNombreCorto(tiendaNombre)
    const estaEnRaizTienda = pathname === `/tiendas/${activeTId}` && !hasActiveFilter

    return (
      <nav className="md:hidden fixed bottom-0 inset-x-0 bg-white/85 backdrop-blur-xl border-t border-gray-200/50 z-50 shadow-[0_-4px_24px_rgba(0,0,0,0.06)] rounded-t-2xl will-change-transform">
        <div className="flex h-16 items-center px-2">
          
          {/* Botón 1: Inicio Tienda / Inicio App (Inteligente) */}
          <button 
            onClick={handleInicioTiendaClick}
            className={`flex-1 flex flex-col items-center justify-center gap-0.5 active:scale-95 transition-transform duration-100 cursor-pointer border-none bg-transparent
              ${!hasAislesActive ? 'text-green-600 font-extrabold' : 'text-gray-400 hover:text-green-600'}`}
            title={estaEnRaizTienda ? "Toca de nuevo para ir al Inicio Principal" : "Ir al inicio de la tienda"}
          >
            <Home size={20} className={!hasAislesActive ? 'stroke-[2.2]' : 'stroke-[1.8]'} />
            <span className="text-[9px] font-bold">
              {estaEnRaizTienda ? 'Inicio Web' : 'Inicio'}
            </span>
          </button>

          {/* Botón 2: Catálogo */}
          <button 
            onClick={handleBuscarClick}
            className={`flex-1 flex flex-col items-center justify-center gap-0.5 active:scale-95 transition-transform duration-100 cursor-pointer border-none bg-transparent
              ${hasAislesActive ? 'text-green-600 font-extrabold' : 'text-gray-400 hover:text-green-600'}`}
          >
            <LayoutList size={20} className={hasAislesActive ? 'stroke-[2.2]' : 'stroke-[1.8]'} />
            <span className="text-[9px] font-bold">Catálogo</span>
          </button>

          {/* Botón 3: PASILLOS */}
          <div className="flex-1 flex flex-col items-center justify-center relative h-full">
            <button
              onClick={() => window.dispatchEvent(new Event('open-categorias-global'))}
              className="w-14 h-14 bg-gradient-to-br from-green-600 to-emerald-500 rounded-full flex items-center justify-center text-white shadow-lg shadow-green-500/30 border-4 border-white absolute -top-5 active:scale-90 transition-transform duration-150 cursor-pointer"
            >
              <LayoutGrid size={22} className="stroke-[2.5]" />
            </button>
            <span className="text-[9px] font-extrabold text-green-600 mt-7 uppercase tracking-wider text-center px-1 truncate max-w-full">
              Pasillos {nombreCorto}
            </span>
          </div>

          {/* Botón 4: Lista o Marcas */}
          {mounted && pathname.includes('/categoria/') ? (
            <button 
              onClick={() => window.dispatchEvent(new Event('open-marcas-global'))}
              className={`flex-1 flex flex-col items-center justify-center gap-0.5 active:scale-95 transition-transform duration-100 cursor-pointer border-none bg-transparent
                ${marcaFiltro ? 'text-green-600 font-extrabold font-black' : 'text-gray-400 hover:text-green-600'}`}
            >
              <Tag size={20} className={marcaFiltro ? 'stroke-[2.2]' : 'stroke-[1.8]'} />
              <span className="text-[9px] font-bold truncate max-w-[70px]">
                {marcaFiltro ? marcaFiltro : 'Marcas'}
              </span>
            </button>
          ) : (
            <button 
              onClick={() => router.push('/favoritos')}
              className="flex-1 flex flex-col items-center justify-center gap-0.5 active:scale-95 transition-transform duration-100 cursor-pointer border-none bg-transparent text-gray-400 hover:text-green-600"
            >
              <ClipboardList size={20} className="stroke-[1.8]" />
              <span className="text-[9px] font-bold">Lista</span>
            </button>
          )}

          {/* Botón 5: Comercios */}
          <button 
            onClick={() => router.push('/tiendas')}
            className="flex-1 flex flex-col items-center justify-center gap-0.5 active:scale-95 transition-transform duration-100 cursor-pointer border-none bg-transparent text-gray-400 hover:text-green-600"
          >
            <Store size={20} className="stroke-[1.8]" />
            <span className="text-[9px] font-bold">Comercios</span>
          </button>

        </div>
      </nav>
    )
  }

  // ── Contexto General ──
  return (
    <nav className="md:hidden fixed bottom-0 inset-x-0 bg-white/85 backdrop-blur-xl border-t border-gray-200/50 z-50 shadow-[0_-4px_24px_rgba(0,0,0,0.06)] rounded-t-2xl will-change-transform">
      <div className="flex h-16 items-center px-2">

        {/* Botón 1: Inicio */}
        <Link 
          href="/" 
          onClick={handleInicioAppClick}
          className={`flex-1 flex flex-col items-center justify-center gap-0.5 active:scale-95 transition-transform duration-100
            ${pathname === '/' ? 'text-green-600' : 'text-gray-400 hover:text-green-600'}`}
        >
          <Home size={20} className={pathname === '/' ? 'stroke-[2.2]' : 'stroke-[1.8]'} />
          <span className="text-[9px] font-bold">Inicio</span>
        </Link>

        {/* Botón 2: Lista */}
        <Link 
          href="/favoritos" 
          className={`flex-1 flex flex-col items-center justify-center gap-0.5 active:scale-95 transition-transform duration-100
            ${pathname === '/favoritos' ? 'text-green-600' : 'text-gray-400 hover:text-green-600'}`}
        >
          <ClipboardList size={20} className={pathname === '/favoritos' ? 'stroke-[2.2]' : 'stroke-[1.8]'} />
          <span className="text-[9px] font-bold">Lista</span>
        </Link>

        {/* Botón 3: TIENDAS */}
        <div className="flex-1 flex flex-col items-center justify-center relative h-full">
          <Link
            href="/tiendas"
            className="w-14 h-14 bg-gradient-to-br from-green-600 to-emerald-500 rounded-full flex items-center justify-center text-white shadow-lg shadow-green-500/30 border-4 border-white absolute -top-5 active:scale-90 transition-transform duration-150"
          >
            <Store size={22} className="stroke-[2.5]" />
          </Link>
          <span className="text-[9px] font-extrabold text-green-600 mt-7 uppercase tracking-wider">Tiendas</span>
        </div>

        {/* Botón 4: Pasillos */}
        <button 
          onClick={() => window.dispatchEvent(new Event('open-categorias-global'))}
          className="flex-1 flex flex-col items-center justify-center gap-0.5 text-gray-400 hover:text-green-600 active:scale-95 transition-transform duration-100 cursor-pointer"
        >
          <LayoutGrid size={20} className="stroke-[1.8]" />
          <span className="text-[9px] font-bold">Pasillos</span>
        </button>

        {/* Botón 5: Pedidos */}
        <Link 
          href="/pedidos" 
          className={`flex-1 flex flex-col items-center justify-center gap-0.5 active:scale-95 transition-transform duration-100
            ${pathname === '/pedidos' ? 'text-green-600' : 'text-gray-400 hover:text-green-600'}`}
        >
          <Package size={20} className={pathname === '/pedidos' ? 'stroke-[2.2]' : 'stroke-[1.8]'} />
          <span className="text-[9px] font-bold">Pedidos</span>
        </Link>

      </div>
    </nav>
  )
}

export default function NavBarMobile() {
  return (
    <Suspense fallback={
      <nav className="md:hidden fixed bottom-0 inset-x-0 bg-white/85 backdrop-blur-xl border-t border-gray-200/50 z-50 shadow-[0_-4px_24px_rgba(0,0,0,0.06)] rounded-t-2xl h-16" />
    }>
      <NavBarMobileInner />
    </Suspense>
  )
}

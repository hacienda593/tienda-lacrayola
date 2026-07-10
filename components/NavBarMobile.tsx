'use client'
import Link from 'next/link'
import { usePathname, useSearchParams, useRouter } from 'next/navigation'
import { Home, Store, ShoppingCart, Heart, Menu, LayoutGrid, Sparkles, ArrowLeft } from 'lucide-react'
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

  const activeCat = searchParams.get('cat') || ''
  const activeSub = searchParams.get('sub') || ''
  const activeMarca = searchParams.get('marca') || ''
  const activeQ = searchParams.get('q') || ''
  const hasActiveFilter = !!(activeCat || activeSub || activeMarca || activeQ)

  function handleVolver() {
    const params = new URLSearchParams(searchParams.toString())
    if (activeSub) {
      params.delete('sub')
    } else if (activeMarca) {
      params.delete('marca')
    } else if (activeCat) {
      params.delete('cat')
    } else if (activeQ) {
      params.delete('q')
    }
    const qs = params.toString()
    router.push(qs ? `${pathname}?${qs}` : pathname)
  }

  // 1. Obtener la ID de la tienda activa si está en la URL o ruta (defecto La Crayola)
  const activeTId = pathname.startsWith('/tiendas/') && pathname !== '/tiendas'
    ? pathname.split('/')[2]
    : (pathname.startsWith('/productos') ? (searchParams.get('tienda_id') || crayolaId || 'b7fe17b9-c3da-4c9f-9a87-169d70623566') : '')

  const esTienda = !!activeTId
  const esProductos = pathname.startsWith('/productos') && !activeTId

  // 2. Escuchar actualizaciones de la cantidad de artículos del carrito
  useEffect(() => {
    const update = () => setN(getCarrito().reduce((s, i) => s + i.cantidad, 0))
    update()
    window.addEventListener('carrito-update', update)
    return () => window.removeEventListener('carrito-update', update)
  }, [])

  // 3. Obtener dinámicamente el ID de la tienda La Crayola para el botón Hero del Home
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

  // 5. Definir la botonera líquida según el contexto
  if (esTienda) {
    // ── Contexto Tienda Aliada (o búsqueda dentro de tienda): Enfoque en recolección rápida, favoritos y pasillos dinámicos ──
    const nombreCorto = getNombreCorto(tiendaNombre)
    return (
      <nav className="md:hidden fixed bottom-0 inset-x-0 bg-white/85 backdrop-blur-xl border-t border-gray-200/50 z-50 shadow-[0_-4px_24px_rgba(0,0,0,0.06)] rounded-t-2xl will-change-transform">
        <div className="flex h-16 items-center px-2">
          
          {/* Botón 1: Inicio o Atrás dinámico */}
          {hasActiveFilter ? (
            <button
              onClick={handleVolver}
              className="flex-1 flex flex-col items-center justify-center gap-0.5 text-gray-500 hover:text-green-600 active:scale-95 transition-transform duration-100 cursor-pointer"
            >
              <ArrowLeft size={20} className="stroke-[2.2] text-green-600" />
              <span className="text-[9px] font-extrabold text-green-600">Atrás</span>
            </button>
          ) : (
            <Link href="/" className="flex-1 flex flex-col items-center justify-center gap-0.5 text-gray-400 hover:text-green-600 active:scale-95 transition-transform duration-100">
              <Home size={20} className="stroke-[1.8]" />
              <span className="text-[9px] font-bold">Inicio</span>
            </Link>
          )}

          {/* Botón 2: Favoritos */}
          <Link href="/favoritos" className="flex-1 flex flex-col items-center justify-center gap-0.5 text-gray-400 hover:text-green-600 active:scale-95 transition-transform duration-100">
            <Heart size={20} className="stroke-[1.8]" />
            <span className="text-[9px] font-bold">Favoritos</span>
          </Link>

          {/* Botón 3: PASILLOS (CENTRAL HERO FLOTANTE CON NOMBRE DE TIENDA) */}
          <div className="flex-1 flex flex-col items-center justify-center relative h-full">
            <button
              onClick={() => window.dispatchEvent(new Event('open-categorias-global'))}
              className="w-14 h-14 bg-gradient-to-br from-green-600 to-emerald-500 rounded-full flex items-center justify-center text-white shadow-lg shadow-green-500/30 border-4 border-white absolute -top-5 active:scale-90 transition-transform duration-150"
            >
              <LayoutGrid size={22} className="stroke-[2.5]" />
            </button>
            <span className="text-[9px] font-extrabold text-green-600 mt-7 uppercase tracking-wider text-center px-1 truncate max-w-full">
              Pasillos {nombreCorto}
            </span>
          </div>

          {/* Botón 4: Comercios */}
          <Link href="/tiendas" className="flex-1 flex flex-col items-center justify-center gap-0.5 text-gray-400 hover:text-green-600 active:scale-95 transition-transform duration-100">
            <Store size={20} className="stroke-[1.8]" />
            <span className="text-[9px] font-bold">Comercios</span>
          </Link>

          {/* Botón 5: Carrito */}
          <button onClick={openCart} className="flex-1 flex flex-col items-center justify-center gap-0.5 text-gray-400 hover:text-green-600 active:scale-95 transition-transform duration-100 relative cursor-pointer">
            <div className="relative">
              <ShoppingCart size={20} className="stroke-[1.8]" />
              {n > 0 && (
                <span className="absolute -top-1.5 -right-2 bg-red-500 text-white text-[8px] font-black rounded-full min-w-[15px] h-3.5 flex items-center justify-center px-0.5">
                  {n > 99 ? '99+' : n}
                </span>
              )}
            </div>
            <span className="text-[9px] font-bold">Carrito</span>
          </button>

        </div>
      </nav>
    )
  }

  // ── Contexto General (Home, Tiendas list, Favoritos, Catálogo, Carrito): Centro de mando unificado ──
  return (
    <nav className="md:hidden fixed bottom-0 inset-x-0 bg-white/85 backdrop-blur-xl border-t border-gray-200/50 z-50 shadow-[0_-4px_24px_rgba(0,0,0,0.06)] rounded-t-2xl will-change-transform">
      <div className="flex h-16 items-center px-2">

        {/* Botón 1: Inicio */}
        <Link 
          href="/" 
          className={`flex-1 flex flex-col items-center justify-center gap-0.5 active:scale-95 transition-transform duration-100
            ${pathname === '/' ? 'text-green-600' : 'text-gray-400 hover:text-green-600'}`}
        >
          <Home size={20} className={pathname === '/' ? 'stroke-[2.2]' : 'stroke-[1.8]'} />
          <span className="text-[9px] font-bold">Inicio</span>
        </Link>

        {/* Botón 2: Favoritos */}
        <Link 
          href="/favoritos" 
          className={`flex-1 flex flex-col items-center justify-center gap-0.5 active:scale-95 transition-transform duration-100
            ${pathname === '/favoritos' ? 'text-green-600' : 'text-gray-400 hover:text-green-600'}`}
        >
          <Heart size={20} className={pathname === '/favoritos' ? 'stroke-[2.2]' : 'stroke-[1.8]'} />
          <span className="text-[9px] font-bold">Favoritos</span>
        </Link>

        {/* Botón 3: TIENDAS (CENTRAL HERO FLOTANTE GLOBAL) */}
        <div className="flex-1 flex flex-col items-center justify-center relative h-full">
          <Link
            href="/tiendas"
            className="w-14 h-14 bg-gradient-to-br from-green-600 to-emerald-500 rounded-full flex items-center justify-center text-white shadow-lg shadow-green-500/30 border-4 border-white absolute -top-5 active:scale-90 transition-transform duration-150"
          >
            <Store size={22} className="stroke-[2.5]" />
          </Link>
          <span className="text-[9px] font-extrabold text-green-600 mt-7 uppercase tracking-wider">Tiendas</span>
        </div>

        {/* Botón 4: Pasillos (Categorías globales) */}
        <button 
          onClick={() => window.dispatchEvent(new Event('open-categorias-global'))}
          className="flex-1 flex flex-col items-center justify-center gap-0.5 text-gray-400 hover:text-green-600 active:scale-95 transition-transform duration-100 cursor-pointer"
        >
          <LayoutGrid size={20} className="stroke-[1.8]" />
          <span className="text-[9px] font-bold">Pasillos</span>
        </button>

        {/* Botón 5: Carrito */}
        <button 
          onClick={openCart}
          className={`flex-1 flex flex-col items-center justify-center gap-0.5 active:scale-95 transition-transform duration-100 relative cursor-pointer
            ${pathname === '/carrito' ? 'text-green-600' : 'text-gray-400 hover:text-green-600'}`}
        >
          <div className="relative">
            <ShoppingCart size={20} className={pathname === '/carrito' ? 'stroke-[2.2]' : 'stroke-[1.8]'} />
            {n > 0 && (
              <span className="absolute -top-1.5 -right-2 bg-red-500 text-white text-[8px] font-black rounded-full min-w-[15px] h-3.5 flex items-center justify-center px-0.5">
                {n > 99 ? '99+' : n}
              </span>
            )}
          </div>
          <span className="text-[9px] font-bold">Carrito</span>
        </button>

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

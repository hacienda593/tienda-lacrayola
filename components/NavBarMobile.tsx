'use client'
import Link from 'next/link'
import { usePathname } from 'next/navigation'
import { Home, Store, ShoppingCart, Heart, Menu, LayoutGrid, Search, Sparkles } from 'lucide-react'
import { useEffect, useState } from 'react'
import { getCarrito } from '@/lib/carrito'
import { supabase } from '@/lib/supabase'

export default function NavBarMobile() {
  const pathname = usePathname()
  const [n, setN] = useState(0)
  const [crayolaId, setCrayolaId] = useState('')

  // 1. Escuchar actualizaciones de la cantidad de artículos del carrito
  useEffect(() => {
    const update = () => setN(getCarrito().reduce((s, i) => s + i.cantidad, 0))
    update()
    window.addEventListener('carrito-update', update)
    return () => window.removeEventListener('carrito-update', update)
  }, [])

  // 2. Obtener dinámicamente el ID de la tienda La Crayola para el botón Hero
  useEffect(() => {
    supabase.from('ol_tiendas')
      .select('id')
      .ilike('nombre', '%crayola%')
      .single()
      .then(({ data }) => { if (data) setCrayolaId(data.id) })
  }, [])

  // 3. Determinar el contexto de navegación dinámico (Home, Tienda Aliada o Búsqueda)
  const esTienda = pathname.startsWith('/tiendas/') && pathname !== '/tiendas'
  const esProductos = pathname.startsWith('/productos')

  // 4. Lógica para enfocar el buscador de la tienda actual
  function handleFocusSearch() {
    // Buscar cualquier input de texto dentro de la página y enfocarlo con scroll suave
    const searchInput = document.querySelector('input[type="text"], input[placeholder*="Buscar"]') as HTMLInputElement
    if (searchInput) {
      searchInput.scrollIntoView({ behavior: 'smooth', block: 'center' })
      setTimeout(() => searchInput.focus(), 300)
    }
  }

  // 5. Definir la botonera líquida según el contexto
  if (esTienda) {
    // ── Contexto Tienda Aliada: Enfoque en recolección rápida y pasillos ──
    return (
      <nav className="md:hidden fixed bottom-0 inset-x-0 bg-white/85 backdrop-blur-xl border-t border-gray-200/50 z-50 shadow-[0_-4px_24px_rgba(0,0,0,0.06)] rounded-t-2xl will-change-transform">
        <div className="flex h-16 items-center px-2">
          
          {/* Botón 1: Inicio */}
          <Link href="/" className="flex-1 flex flex-col items-center justify-center gap-0.5 text-gray-400 hover:text-green-600 active:scale-95 transition-transform duration-100">
            <Home size={20} className="stroke-[1.8]" />
            <span className="text-[9px] font-bold">Inicio</span>
          </Link>

          {/* Botón 2: Buscar en Tienda */}
          <button 
            onClick={handleFocusSearch} 
            className="flex-1 flex flex-col items-center justify-center gap-0.5 text-gray-400 hover:text-green-600 active:scale-95 transition-transform duration-100"
          >
            <Search size={20} className="stroke-[1.8]" />
            <span className="text-[9px] font-bold">Buscar</span>
          </button>

          {/* Botón 3: CATEGORÍAS (CENTRAL HERO FLOTANTE) */}
          <div className="flex-1 flex flex-col items-center justify-center relative h-full">
            <button
              onClick={() => window.dispatchEvent(new Event('open-categorias-global'))}
              className="w-14 h-14 bg-gradient-to-br from-green-600 to-emerald-500 rounded-full flex items-center justify-center text-white shadow-lg shadow-green-500/30 border-4 border-white absolute -top-5 active:scale-90 transition-transform duration-150"
            >
              <LayoutGrid size={22} className="stroke-[2.5]" />
            </button>
            <span className="text-[9px] font-extrabold text-green-600 mt-7 uppercase tracking-wider">Pasillos</span>
          </div>

          {/* Botón 4: Tiendas */}
          <Link href="/tiendas" className="flex-1 flex flex-col items-center justify-center gap-0.5 text-gray-400 hover:text-green-600 active:scale-95 transition-transform duration-100">
            <Store size={20} className="stroke-[1.8]" />
            <span className="text-[9px] font-bold">Comercios</span>
          </Link>

          {/* Botón 5: Carrito */}
          <Link href="/carrito" className="flex-1 flex flex-col items-center justify-center gap-0.5 text-gray-400 hover:text-green-600 active:scale-95 transition-transform duration-100 relative">
            <div className="relative">
              <ShoppingCart size={20} className="stroke-[1.8]" />
              {n > 0 && (
                <span className="absolute -top-1.5 -right-2 bg-red-500 text-white text-[8px] font-black rounded-full min-w-[15px] h-3.5 flex items-center justify-center px-0.5">
                  {n > 99 ? '99+' : n}
                </span>
              )}
            </div>
            <span className="text-[9px] font-bold">Carrito</span>
          </Link>

        </div>
      </nav>
    )
  }

  if (esProductos) {
    // ── Contexto Catálogo / Búsqueda: Enfoque en filtración y refinamiento ──
    return (
      <nav className="md:hidden fixed bottom-0 inset-x-0 bg-white/85 backdrop-blur-xl border-t border-gray-200/50 z-50 shadow-[0_-4px_24px_rgba(0,0,0,0.06)] rounded-t-2xl will-change-transform">
        <div className="flex h-16 items-center px-2">

          {/* Botón 1: Inicio */}
          <Link href="/" className="flex-1 flex flex-col items-center justify-center gap-0.5 text-gray-400 hover:text-green-600 active:scale-95 transition-transform duration-100">
            <Home size={20} className="stroke-[1.8]" />
            <span className="text-[9px] font-bold">Inicio</span>
          </Link>

          {/* Botón 2: Tiendas */}
          <Link href="/tiendas" className="flex-1 flex flex-col items-center justify-center gap-0.5 text-gray-400 hover:text-green-600 active:scale-95 transition-transform duration-100">
            <Store size={20} className="stroke-[1.8]" />
            <span className="text-[9px] font-bold">Tiendas</span>
          </Link>

          {/* Botón 3: FILTRAR CATEGORÍAS (CENTRAL HERO FLOTANTE) */}
          <div className="flex-1 flex flex-col items-center justify-center relative h-full">
            <button
              onClick={() => window.dispatchEvent(new Event('open-categorias-global'))}
              className="w-14 h-14 bg-gradient-to-br from-indigo-600 to-blue-500 rounded-full flex items-center justify-center text-white shadow-lg shadow-indigo-500/30 border-4 border-white absolute -top-5 active:scale-90 transition-transform duration-150"
            >
              <LayoutGrid size={22} className="stroke-[2.5]" />
            </button>
            <span className="text-[9px] font-extrabold text-indigo-600 mt-7 uppercase tracking-wider">Filtrar</span>
          </div>

          {/* Botón 4: Favoritos */}
          <Link href="/favoritos" className="flex-1 flex flex-col items-center justify-center gap-0.5 text-gray-400 hover:text-green-600 active:scale-95 transition-transform duration-100">
            <Heart size={20} className="stroke-[1.8]" />
            <span className="text-[9px] font-bold">Favoritos</span>
          </Link>

          {/* Botón 5: Carrito */}
          <Link href="/carrito" className="flex-1 flex flex-col items-center justify-center gap-0.5 text-gray-400 hover:text-green-600 active:scale-95 transition-transform duration-100 relative">
            <div className="relative">
              <ShoppingCart size={20} className="stroke-[1.8]" />
              {n > 0 && (
                <span className="absolute -top-1.5 -right-2 bg-red-500 text-white text-[8px] font-black rounded-full min-w-[15px] h-3.5 flex items-center justify-center px-0.5">
                  {n > 99 ? '99+' : n}
                </span>
              )}
            </div>
            <span className="text-[9px] font-bold">Carrito</span>
          </Link>

        </div>
      </nav>
    )
  }

  // ── Contexto General (Home, Tiendas list, Favoritos, Carrito): Centro de mando ──
  return (
    <nav className="md:hidden fixed bottom-0 inset-x-0 bg-white/85 backdrop-blur-xl border-t border-gray-200/50 z-50 shadow-[0_-4px_24px_rgba(0,0,0,0.06)] rounded-t-2xl will-change-transform">
      <div className="flex h-16 items-center px-2">

        {/* Botón 1: Menú Lateral */}
        <button 
          onClick={() => window.dispatchEvent(new Event('open-menu-global'))}
          className="flex-1 flex flex-col items-center justify-center gap-0.5 text-gray-400 hover:text-green-600 active:scale-95 transition-transform duration-100"
        >
          <Menu size={20} className="stroke-[1.8]" />
          <span className="text-[9px] font-bold">Menú</span>
        </button>

        {/* Botón 2: Tiendas Aliadas */}
        <Link 
          href="/tiendas" 
          className={`flex-1 flex flex-col items-center justify-center gap-0.5 active:scale-95 transition-transform duration-100
            ${pathname === '/tiendas' ? 'text-green-600' : 'text-gray-400 hover:text-green-600'}`}
        >
          <Store size={20} className={pathname === '/tiendas' ? 'stroke-[2.2]' : 'stroke-[1.8]'} />
          <span className="text-[9px] font-bold">Tiendas</span>
        </Link>

        {/* Botón 3: SHORTCUT LA CRAYOLA (CENTRAL HERO FLOTANTE) */}
        <div className="flex-1 flex flex-col items-center justify-center relative h-full">
          <Link
            href={crayolaId ? `/tiendas/${crayolaId}` : '/productos'}
            className="w-14 h-14 bg-gradient-to-br from-green-600 to-emerald-500 rounded-full flex items-center justify-center text-white shadow-lg shadow-green-500/30 border-4 border-white absolute -top-5 active:scale-90 transition-transform duration-150"
          >
            <Sparkles size={22} className="stroke-[2.5]" />
          </Link>
          <span className="text-[9px] font-extrabold text-green-600 mt-7 uppercase tracking-wider">Crayola</span>
        </div>

        {/* Botón 4: Favoritos */}
        <Link 
          href="/favoritos" 
          className={`flex-1 flex flex-col items-center justify-center gap-0.5 active:scale-95 transition-transform duration-100
            ${pathname === '/favoritos' ? 'text-green-600' : 'text-gray-400 hover:text-green-600'}`}
        >
          <Heart size={20} className={pathname === '/favoritos' ? 'stroke-[2.2]' : 'stroke-[1.8]'} />
          <span className="text-[9px] font-bold">Favoritos</span>
        </Link>

        {/* Botón 5: Carrito */}
        <Link 
          href="/carrito" 
          className={`flex-1 flex flex-col items-center justify-center gap-0.5 active:scale-95 transition-transform duration-100 relative
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
        </Link>

      </div>
    </nav>
  )
}

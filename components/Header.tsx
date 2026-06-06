'use client'
import Link from 'next/link'
import { useRouter } from 'next/navigation'
import { ShoppingCart, Search, LayoutGrid } from 'lucide-react'
import { useEffect, useState, Suspense } from 'react'
import { getCarrito } from '@/lib/carrito'
import MenuDrawer from '@/components/MenuDrawer'
import CategoriasPanel from '@/components/CategoriasPanel'

export default function Header() {
  const router = useRouter()
  const [n, setN]                   = useState(0)
  const [q, setQ]                   = useState('')
  const [drawerOpen, setDrawerOpen] = useState(false)
  const [catOpen,    setCatOpen]    = useState(false)

  useEffect(() => {
    const update = () => setN(getCarrito().reduce((s, i) => s + i.cantidad, 0))
    update()
    window.addEventListener('carrito-update', update)
    return () => window.removeEventListener('carrito-update', update)
  }, [])

  useEffect(() => {
    const abrirCats = () => setCatOpen(true)
    const abrirMenu = () => setDrawerOpen(true)
    window.addEventListener('open-categorias-global', abrirCats)
    window.addEventListener('open-menu-global', abrirMenu)
    return () => {
      window.removeEventListener('open-categorias-global', abrirCats)
      window.removeEventListener('open-menu-global', abrirMenu)
    }
  }, [])

  function buscar(e: React.SyntheticEvent<HTMLFormElement>) {
    e.preventDefault()
    if (q.trim()) router.push(`/productos?q=${encodeURIComponent(q.trim())}`)
  }

  return (
    <>
      <Suspense fallback={null}>
        <MenuDrawer    open={drawerOpen} onClose={() => setDrawerOpen(false)} />
      </Suspense>
      <CategoriasPanel open={catOpen}  onClose={() => setCatOpen(false)} />

      <header className="sticky top-0 z-50 bg-white border-b border-gray-200 shadow-sm">
        {/* Top bar */}
        <div className="bg-green-700 text-white text-xs text-center py-1.5 px-4">
          🚚 Envíos a domicilio en Los Bancos · Pedidos por WhatsApp
        </div>

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
          <Link href="/" className="flex items-center gap-2 shrink-0">
            <span className="text-2xl">🖍️</span>
            <div className="hidden sm:block">
              <div className="text-base font-extrabold text-green-700 leading-tight">La Crayola</div>
              <div className="text-[10px] text-gray-400 leading-tight">Librería & Papelería</div>
            </div>
          </Link>

          {/* Buscador */}
          <form onSubmit={buscar} className="flex-1 max-w-xl">
            <div className="relative">
              <Search size={15} className="absolute left-3 top-1/2 -translate-y-1/2 text-gray-400" />
              <input
                value={q} onChange={e => setQ(e.target.value)}
                placeholder="Buscar productos, marcas, categorías..."
                className="w-full bg-gray-100 border border-gray-200 rounded-xl pl-9 pr-4 py-2.5 text-sm text-gray-800 placeholder-gray-400 focus:outline-none focus:border-green-500 focus:bg-white transition"
              />
            </div>
          </form>

          {/* Carrito */}
          <Link href="/carrito" className="relative flex items-center gap-1.5 bg-green-600 hover:bg-green-700 text-white px-3.5 py-2.5 rounded-xl transition shrink-0">
            <ShoppingCart size={18} />
            <span className="text-sm font-semibold hidden sm:block">Carrito</span>
            {n > 0 && (
              <span className="absolute -top-1.5 -right-1.5 bg-red-500 text-white text-[10px] font-bold rounded-full min-w-[18px] h-[18px] flex items-center justify-center px-1">
                {n > 99 ? '99+' : n}
              </span>
            )}
          </Link>
        </div>

        {/* Barra inferior del header */}
        <div className="border-t border-gray-100 bg-white">
          <div className="max-w-5xl mx-auto px-4">
            <div className="flex items-center gap-1 py-1.5">

              {/* Botón Categorías — siempre visible */}
              <button
                onClick={() => setCatOpen(true)}
                className="flex items-center gap-1.5 bg-green-600 hover:bg-green-700 text-white text-xs font-bold px-3 py-1.5 rounded-lg transition shrink-0 mr-2"
              >
                <LayoutGrid size={13} />
                Categorías
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
                {['Escolar','Arte','Oficina','Tecnologia','Juguetes','Manualidades','Libros','Pintura'].map(c => (
                  <Link key={c} href={`/productos?cat=${encodeURIComponent(c)}`}
                    className="shrink-0 text-sm text-gray-600 hover:text-green-700 font-medium transition whitespace-nowrap py-0.5">
                    {c}
                  </Link>
                ))}
              </div>

              {/* Móvil: chips de categorías horizontales */}
              <div className="md:hidden flex gap-2 overflow-x-auto scrollbar-hide flex-1 items-center">
                <Link href="/productos?frecuentes=true"
                  className="shrink-0 text-xs text-green-700 hover:text-green-900 font-bold bg-green-50 px-2.5 py-1 rounded-lg border border-green-200 transition whitespace-nowrap flex items-center gap-1">
                  🔄 Frecuentes
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
      </header>
    </>
  )
}

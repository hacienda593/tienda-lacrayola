'use client'
import Link from 'next/link'
import { useRouter, usePathname, useSearchParams } from 'next/navigation'
import { ShoppingCart, Search, LayoutGrid, X } from 'lucide-react'
import { useEffect, useState, Suspense } from 'react'
import { getCarrito } from '@/lib/carrito'
import { supabase } from '@/lib/supabase'
import MenuDrawer from '@/components/MenuDrawer'
import CategoriasPanel from '@/components/CategoriasPanel'
import CartDrawer from '@/components/CartDrawer'

function HeaderSearch() {
  const router = useRouter()
  const pathname = usePathname()
  const searchParams = useSearchParams()
  const [q, setQ] = useState('')
  const [tiendaNombre, setTiendaNombre] = useState('')

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

  // 3. Sincronizar el input local con la URL query param q
  useEffect(() => {
    setQ(searchParams.get('q') || '')
  }, [searchParams])

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
    if (esTienda) {
      const params = new URLSearchParams(searchParams.toString())
      if (q.trim()) params.set('q', q.trim())
      else params.delete('q')
      params.delete('cat')
      params.delete('sub')
      params.delete('marca')
      const qs = params.toString()
      router.replace(qs ? `${pathname}?${qs}` : pathname)
    } else {
      if (q.trim()) {
        router.push(`/productos?q=${encodeURIComponent(q.trim())}`)
      }
    }
  }

  function manejarEscribir(val: string) {
    setQ(val)
    if (esTienda) {
      const params = new URLSearchParams(searchParams.toString())
      if (val.trim()) params.set('q', val.trim())
      else params.delete('q')
      params.delete('cat')
      params.delete('sub')
      params.delete('marca')
      const qs = params.toString()
      router.replace(qs ? `${pathname}?${qs}` : pathname)
    }
  }

  function limpiar() {
    setQ('')
    if (esTienda) {
      const params = new URLSearchParams(searchParams.toString())
      params.delete('q')
      const qs = params.toString()
      router.replace(qs ? `${pathname}?${qs}` : pathname)
    }
  }

  const nombreTiendaCorto = getNombreCorto(tiendaNombre)

  return (
    <form onSubmit={buscar} className="flex-1 max-w-xl">
      <div className="relative">
        <Search size={15} className="absolute left-3 top-1/2 -translate-y-1/2 text-gray-400" />
        <input
          value={q}
          onChange={e => manejarEscribir(e.target.value)}
          placeholder={esTienda ? `Buscar en ${nombreTiendaCorto || 'la tienda'}...` : "Buscar productos, marcas, categorías..."}
          className="w-full bg-gray-100 border border-gray-200 rounded-xl pl-9 pr-8 py-2.5 text-sm text-gray-800 placeholder-gray-400 focus:outline-none focus:border-green-500 focus:bg-white transition"
        />
        {q && (
          <button
            type="button"
            onClick={limpiar}
            className="absolute right-3 top-1/2 -translate-y-1/2 text-gray-400 hover:text-gray-600 cursor-pointer"
          >
            <X size={14} />
          </button>
        )}
      </div>
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
          <Suspense fallback={<div className="flex-1 max-w-xl h-10 bg-gray-100 rounded-xl" />}>
            <HeaderSearch />
          </Suspense>

          {/* Carrito */}
          <button
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
      </header>
    </>
  )
}

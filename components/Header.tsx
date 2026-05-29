'use client'
import Link from 'next/link'
import { useRouter } from 'next/navigation'
import { ShoppingCart, Search, Menu } from 'lucide-react'
import { useEffect, useState } from 'react'
import { getCarrito } from '@/lib/carrito'

export default function Header() {
  const router = useRouter()
  const [n, setN] = useState(0)
  const [q, setQ] = useState('')

  useEffect(() => {
    const update = () => setN(getCarrito().reduce((s, i) => s + i.cantidad, 0))
    update()
    window.addEventListener('carrito-update', update)
    return () => window.removeEventListener('carrito-update', update)
  }, [])

  function buscar(e: React.FormEvent) {
    e.preventDefault()
    if (q.trim()) router.push(`/productos?q=${encodeURIComponent(q.trim())}`)
  }

  return (
    <header className="sticky top-0 z-50 bg-white border-b border-gray-200 shadow-sm">
      {/* Top bar */}
      <div className="bg-green-700 text-white text-xs text-center py-1.5 px-4">
        🚚 Envíos a domicilio en S. M  de Los Bancos · Pedidos por WhatsApp
      </div>

      <div className="max-w-5xl mx-auto px-4 py-3 flex items-center gap-3">
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

      {/* Categorías nav — desktop */}
      <div className="hidden md:block border-t border-gray-100 bg-white">
        <div className="max-w-5xl mx-auto px-4">
          <div className="flex gap-6 overflow-x-auto scrollbar-hide py-2">
            {['Escolar','Arte','Oficina','Tecnologia','Juguetes','Manualidades','Libros'].map(c => (
              <Link key={c} href={`/productos?cat=${encodeURIComponent(c)}`}
                className="shrink-0 text-sm text-gray-600 hover:text-green-700 font-medium transition whitespace-nowrap">
                {c}
              </Link>
            ))}
          </div>
        </div>
      </div>
    </header>
  )
}

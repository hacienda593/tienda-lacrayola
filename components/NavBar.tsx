'use client'
import Link from 'next/link'
import { usePathname } from 'next/navigation'
import { Home, ShoppingBag, ShoppingCart, User } from 'lucide-react'
import { useEffect, useState } from 'react'
import { getCarrito } from '@/lib/carrito'

export default function NavBar() {
  const pathname = usePathname()
  const [n, setN] = useState(0)

  useEffect(() => {
    const update = () => setN(getCarrito().reduce((s, i) => s + i.cantidad, 0))
    update()
    window.addEventListener('carrito-update', update)
    return () => window.removeEventListener('carrito-update', update)
  }, [])

  const TABS = [
    { href: '/',          label: 'Inicio',   icon: Home },
    { href: '/productos', label: 'Productos', icon: ShoppingBag },
    { href: '/carrito',   label: 'Carrito',  icon: ShoppingCart, badge: n },
    { href: '/cuenta',    label: 'Cuenta',   icon: User },
  ]

  return (
    <nav className="fixed bottom-0 inset-x-0 bg-gray-900 border-t border-gray-800 z-40">
      <div className="flex max-w-lg mx-auto">
        {TABS.map(({ href, label, icon: Icon, badge }) => {
          const active = href === '/' ? pathname === '/' : pathname.startsWith(href)
          return (
            <Link key={href} href={href}
              className={`flex-1 flex flex-col items-center justify-center py-2 gap-0.5 transition-colors relative
                ${active ? 'text-green-400' : 'text-gray-500 hover:text-gray-300'}`}>
              <div className="relative">
                <Icon size={20} strokeWidth={active ? 2.5 : 1.8} />
                {badge != null && badge > 0 && (
                  <span className="absolute -top-1.5 -right-2 bg-red-500 text-white text-[9px] font-bold rounded-full min-w-[16px] h-4 flex items-center justify-center px-0.5">
                    {badge > 99 ? '99+' : badge}
                  </span>
                )}
              </div>
              <span className="text-[10px] font-medium">{label}</span>
            </Link>
          )
        })}
      </div>
    </nav>
  )
}

'use client'
import Link from 'next/link'
import { ChevronRight } from 'lucide-react'

interface Vertical {
  id: string
  titulo: string
  emoji: string
  bg: string
  border: string
  color: string
  sub: string
  href: string
  badge?: string
  badgeBg?: string
  destacado?: boolean
}

const VERTICALES: Vertical[] = [
  {
    id: 'crayola',
    titulo: 'Crayola Útiles',
    emoji: '🎒',
    bg: 'bg-gradient-to-br from-green-50/70 to-emerald-100/40 hover:from-green-100 hover:to-emerald-200/60',
    border: 'border-green-200/40 hover:border-green-300',
    color: 'text-green-800',
    sub: 'Útiles & libros',
    href: '/productos',
    badge: 'Crayola',
    badgeBg: 'bg-green-600 text-white',
    destacado: true,
  },
  {
    id: 'supermercados',
    titulo: 'Supermercados',
    emoji: '🛒',
    bg: 'bg-gradient-to-br from-blue-50/70 to-indigo-100/40 hover:from-blue-100 hover:to-indigo-200/60',
    border: 'border-blue-200/40 hover:border-blue-300',
    color: 'text-blue-800',
    sub: 'Tuti, Tía y más',
    href: '/tiendas',
    badge: 'Tuti & Tía',
    badgeBg: 'bg-blue-600 text-white',
  },
  {
    id: 'farmacias',
    titulo: 'Farmacias',
    emoji: '💊',
    bg: 'bg-gradient-to-br from-rose-50/70 to-red-100/40 hover:from-rose-100 hover:to-red-200/60',
    border: 'border-red-200/40 hover:border-red-300',
    color: 'text-red-800',
    sub: 'Salud y bienestar',
    href: '/tiendas',
    badge: 'Salud 24h',
    badgeBg: 'bg-red-500 text-white',
  },
  {
    id: 'bebidas',
    titulo: 'Bebidas',
    emoji: '🥤',
    bg: 'bg-gradient-to-br from-amber-50/70 to-orange-100/40 hover:from-amber-100 hover:to-orange-200/60',
    border: 'border-orange-200/40 hover:border-orange-300',
    color: 'text-orange-800',
    sub: 'Licores & refrescos',
    href: '/tiendas',
    badge: 'Express',
    badgeBg: 'bg-orange-500 text-white',
  },
  {
    id: 'abarrotes',
    titulo: 'Abarrotes',
    emoji: '🥬',
    bg: 'bg-gradient-to-br from-emerald-50/70 to-teal-100/40 hover:from-emerald-100 hover:to-teal-200/60',
    border: 'border-teal-200/40 hover:border-teal-300',
    color: 'text-teal-800',
    sub: 'Frutas & verduras',
    href: '/tiendas',
    badge: 'Fresco',
    badgeBg: 'bg-teal-600 text-white',
  },
  {
    id: 'mascotas',
    titulo: 'Mascotas',
    emoji: '🧸',
    bg: 'bg-gradient-to-br from-purple-50/70 to-fuchsia-100/40 hover:from-purple-100 hover:to-fuchsia-200/60',
    border: 'border-purple-200/40 hover:border-purple-300',
    color: 'text-purple-800',
    sub: 'Alimento & juguetes',
    href: '/tiendas',
    badge: 'Cuidado',
    badgeBg: 'bg-purple-600 text-white',
  },
]

export default function LocalGrid() {
  return (
    <div className="space-y-4">
      <div className="flex items-center justify-between">
        <div>
          <h2 className="text-base font-bold text-gray-800">🛵 ¿Qué deseas pedir hoy?</h2>
          <p className="text-[11px] text-gray-400">Pide de múltiples comercios en un solo envío consolidado</p>
        </div>
      </div>

      {/* Grid de verticales principales */}
      <div className="grid grid-cols-2 sm:grid-cols-3 md:grid-cols-6 gap-3">
        {VERTICALES.map(v => (
          <Link
            key={v.id}
            href={v.href}
            className={`relative border ${v.border} ${v.bg} rounded-2xl p-4 flex flex-col justify-between h-[115px] shadow-sm hover:shadow-md hover:-translate-y-1 active:scale-[0.97] transition-all duration-200 group cursor-pointer`}
          >
            <div className="flex justify-between items-start">
              <span className="text-3xl select-none group-hover:scale-110 group-hover:rotate-3 transition-transform duration-200">{v.emoji}</span>
              <div className="flex items-center gap-1.5">
                {v.badge && (
                  <span className={`text-[8px] font-black uppercase tracking-wider px-1.5 py-0.5 rounded-md ${v.badgeBg} shadow-sm select-none`}>
                    {v.badge}
                  </span>
                )}
                <ChevronRight size={13} className="text-gray-400 group-hover:text-gray-700 group-hover:translate-x-0.5 transition-all duration-200" />
              </div>
            </div>
            <div>
              <div className={`text-xs font-bold ${v.color} truncate`}>
                {v.titulo}
              </div>
              <div className="text-[9px] text-gray-400 font-medium truncate mt-0.5">
                {v.sub}
              </div>
            </div>
          </Link>
        ))}
      </div>
    </div>
  )
}

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
  destacado?: boolean
}

const VERTICALES: Vertical[] = [
  {
    id: 'crayola',
    titulo: 'Crayola Útiles',
    emoji: '🎒',
    bg: 'bg-gradient-to-br from-green-50 to-emerald-100 hover:from-green-100 hover:to-emerald-200',
    border: 'border-green-200/60',
    color: 'text-green-800',
    sub: 'Útiles & libros',
    href: '/productos',
    destacado: true,
  },
  {
    id: 'supermercados',
    titulo: 'Supermercados',
    emoji: '🛒',
    bg: 'bg-gradient-to-br from-blue-50 to-indigo-50 hover:from-blue-100 hover:to-indigo-100',
    border: 'border-blue-100',
    color: 'text-blue-800',
    sub: 'Tuti, Tía y más',
    href: '/tiendas',
  },
  {
    id: 'farmacias',
    titulo: 'Farmacias',
    emoji: '💊',
    bg: 'bg-gradient-to-br from-red-50 to-rose-50 hover:from-red-100 hover:to-rose-100',
    border: 'border-red-100',
    color: 'text-red-800',
    sub: 'Salud y bienestar',
    href: '/tiendas',
  },
  {
    id: 'bebidas',
    titulo: 'Bebidas',
    emoji: '🥤',
    bg: 'bg-gradient-to-br from-amber-50 to-orange-50 hover:from-amber-100 hover:to-orange-100',
    border: 'border-amber-100',
    color: 'text-amber-800',
    sub: 'Licores & refrescos',
    href: '/tiendas',
  },
  {
    id: 'abarrotes',
    titulo: 'Abarrotes',
    emoji: '🥬',
    bg: 'bg-gradient-to-br from-emerald-50 to-teal-50 hover:from-emerald-100 hover:to-teal-100',
    border: 'border-emerald-100',
    color: 'text-emerald-800',
    sub: 'Frutas & verduras',
    href: '/tiendas',
  },
  {
    id: 'mascotas',
    titulo: 'Mascotas',
    emoji: '🧸',
    bg: 'bg-gradient-to-br from-purple-50 to-fuchsia-50 hover:from-purple-100 hover:to-fuchsia-100',
    border: 'border-purple-100',
    color: 'text-purple-800',
    sub: 'Alimento & juguetes',
    href: '/tiendas',
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
            className={`border ${v.border} ${v.bg} rounded-2xl p-4 flex flex-col justify-between h-[115px] shadow-sm hover:shadow-md hover:-translate-y-0.5 active:scale-95 transition-all group`}
          >
            <div className="flex justify-between items-start">
              <span className="text-3xl select-none group-hover:scale-110 transition-transform">{v.emoji}</span>
              <ChevronRight size={14} className="text-gray-400 group-hover:text-gray-700 transition-colors" />
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

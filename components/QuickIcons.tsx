'use client'
import Link from 'next/link'
import { useEffect, useState } from 'react'
import { supabase } from '@/lib/supabase'
import { Zap, Heart, Store, LayoutGrid, RotateCw, Package } from 'lucide-react'

interface QuickIcon {
  id: string
  label: string
  href?: string
  scrollTo?: string
  icon: React.ElementType
}

// Roster aprobado sobre el mockup: 6 accesos, relleno sólido de marca (pine) —
// no fondo pálido. La corrección de color: apps de alta conversión usan color
// con confianza para que el ícono se reconozca por forma+color al vuelo, no
// arcoíris decorativo (eso sí seguimos evitando: un solo acento, aplicado fuerte).
const ICONS: QuickIcon[] = [
  { id: 'ofertas',   label: 'Ofertas',   scrollTo: 'sec-ofertas',    icon: Zap },
  { id: 'favoritos', label: 'Favoritos', href: '/favoritos',         icon: Heart },
  { id: 'comercios', label: 'Comercios', href: '/tiendas',           icon: Store },
  { id: 'catalogo',  label: 'Catálogo',  href: '/productos',         icon: LayoutGrid },
  { id: 'recompra',  label: 'Recompra',  scrollTo: 'sec-frecuentes', icon: RotateCw },
  { id: 'tienlo',    label: 'Tienlo',    href: '',                   icon: Package },
]

export default function QuickIcons() {
  const [crayolaId, setCrayolaId] = useState('')

  useEffect(() => {
    supabase.from('ol_tiendas')
      .select('id')
      .ilike('nombre', '%crayola%')
      .single()
      .then(({ data }) => { if (data) setCrayolaId(data.id) })
  }, [])

  function handleClick(icon: QuickIcon) {
    if (icon.scrollTo) {
      const el = document.getElementById(icon.scrollTo)
      if (el) {
        el.scrollIntoView({ behavior: 'smooth', block: 'start' })
      }
    }
  }

  return (
    <div 
      onTouchStart={(e) => e.stopPropagation()}
      onTouchEnd={(e) => e.stopPropagation()}
      className="w-full overflow-x-auto scrollbar-hide py-1 px-0.5"
    >
      <div className="flex gap-1 justify-start md:justify-center min-w-max px-1">
        {ICONS.map(iconItem => {
          const IconComp = iconItem.icon
          const href = iconItem.id === 'tienlo'
            ? (crayolaId ? `/tiendas/${crayolaId}` : '/tiendas')
            : iconItem.href

          const content = (
            <div className="flex flex-col items-center gap-1 w-[52px] group cursor-pointer select-none">
              <div className="w-10 h-10 rounded-lg bg-pine group-hover:bg-pine-deep
                flex items-center justify-center
                group-hover:scale-[1.03] group-active:scale-95
                transition-all duration-150"
              >
                <IconComp size={17} className="text-white stroke-[1.75]" />
              </div>

              {/* Label */}
              <span className="text-[9px] font-price font-medium tracking-wide uppercase text-ink-soft group-hover:text-pine-deep transition-colors leading-tight text-center truncate w-full">
                {iconItem.label}
              </span>
            </div>
          )

          if (href) {
            return (
              <Link key={iconItem.id} href={href} className="no-underline">
                {content}
              </Link>
            )
          }

          return (
            <button 
              key={iconItem.id} 
              onClick={() => handleClick(iconItem)} 
              className="bg-transparent border-none p-0 m-0 text-left cursor-pointer"
            >
              {content}
            </button>
          )
        })}
      </div>
    </div>
  )
}

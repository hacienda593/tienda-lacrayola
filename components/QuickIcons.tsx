'use client'
import Link from 'next/link'
import { useEffect, useState } from 'react'
import { supabase } from '@/lib/supabase'
import { Flame, Star, Store, Backpack, Sparkles, Package, Tag, Heart } from 'lucide-react'

interface QuickIcon {
  id: string
  label: string
  href?: string
  scrollTo?: string
  icon: React.ElementType
  iconColor: string
  bgColor: string
  borderColor: string
}

// Un único acento neutro para todos los íconos — la diferenciación la da el ícono
// y la etiqueta, no un arcoíris de colores. Los badges decorativos (HOT/TOP/NUEVO)
// se quitaron: no aportan información real y leían como estética infantil.
const ICON_STYLE = {
  iconColor: 'text-gray-600 group-hover:text-emerald-700',
  bgColor: 'bg-gray-50 hover:bg-gray-100',
  borderColor: 'border-gray-200',
}

const ICONS: QuickIcon[] = [
  { id: 'ofertas',    label: 'Ofertas',    scrollTo: 'sec-ofertas',    icon: Flame,    ...ICON_STYLE },
  { id: 'exclusivos', label: 'Exclusivos', scrollTo: 'sec-exclusivos', icon: Star,     ...ICON_STYLE },
  { id: 'tiendas',    label: 'Tiendas',    href: '/tiendas',           icon: Store,    ...ICON_STYLE },
  { id: 'crayola',    label: 'Crayola',    href: '',                   icon: Backpack, ...ICON_STYLE },
  { id: 'nuevos',     label: 'Nuevos',     scrollTo: 'sec-novedades',  icon: Sparkles, ...ICON_STYLE },
  { id: 'miscompras', label: 'Recompra',   scrollTo: 'sec-frecuentes', icon: Package,  ...ICON_STYLE },
  { id: 'marcas',     label: 'Marcas',     href: '/productos',        icon: Tag,      ...ICON_STYLE },
  { id: 'favoritos',  label: 'Favoritos',  href: '/favoritos',        icon: Heart,    ...ICON_STYLE },
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
          const href = iconItem.id === 'crayola'
            ? (crayolaId ? `/tiendas/${crayolaId}` : '/tiendas')
            : iconItem.href

          const content = (
            <div className="flex flex-col items-center gap-1 w-[52px] group cursor-pointer select-none">
              <div className={`w-10 h-10 rounded-lg ${iconItem.bgColor} ${iconItem.borderColor} border
                flex items-center justify-center
                group-hover:scale-[1.03] group-active:scale-95
                transition-all duration-150`}
              >
                <IconComp size={17} className={`${iconItem.iconColor} stroke-[1.75] transition-colors duration-150`} />
              </div>

              {/* Label */}
              <span className="text-[10.5px] font-semibold text-gray-600 group-hover:text-emerald-700 transition-colors leading-tight text-center truncate w-full">
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

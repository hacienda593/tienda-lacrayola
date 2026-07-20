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
  bgGradient: string
  glowColor: string
  badge?: string
  badgeBg?: string
}

const ICONS: QuickIcon[] = [
  { 
    id: 'ofertas',    
    label: 'Ofertas',    
    scrollTo: 'sec-ofertas',    
    icon: Flame,
    iconColor: 'text-amber-500',
    bgGradient: 'from-red-500 via-orange-500 to-amber-500',
    glowColor: 'shadow-orange-500/30',
    badge: 'HOT',
    badgeBg: 'bg-red-600 text-white'
  },
  { 
    id: 'exclusivos', 
    label: 'Exclusivos', 
    scrollTo: 'sec-exclusivos', 
    icon: Star,
    iconColor: 'text-yellow-400',
    bgGradient: 'from-amber-400 via-yellow-500 to-orange-400',
    glowColor: 'shadow-amber-500/30',
    badge: 'TOP',
    badgeBg: 'bg-amber-600 text-white'
  },
  { 
    id: 'tiendas',    
    label: 'Tiendas',    
    href: '/tiendas',           
    icon: Store,
    iconColor: 'text-blue-500',
    bgGradient: 'from-blue-600 via-indigo-600 to-sky-500',
    glowColor: 'shadow-blue-500/30'
  },
  { 
    id: 'crayola',    
    label: 'Crayola',    
    href: '',                   
    icon: Backpack,
    iconColor: 'text-emerald-400',
    bgGradient: 'from-emerald-600 via-green-500 to-teal-500',
    glowColor: 'shadow-emerald-500/30',
    badge: 'OFICIAL',
    badgeBg: 'bg-emerald-700 text-white'
  },
  { 
    id: 'nuevos',     
    label: 'Nuevos',     
    scrollTo: 'sec-novedades',  
    icon: Sparkles,
    iconColor: 'text-fuchsia-400',
    bgGradient: 'from-purple-600 via-fuchsia-500 to-pink-500',
    glowColor: 'shadow-purple-500/30',
    badge: 'NUEVO',
    badgeBg: 'bg-purple-600 text-white'
  },
  { 
    id: 'miscompras', 
    label: 'Recompra', 
    scrollTo: 'sec-frecuentes', 
    icon: Package,
    iconColor: 'text-teal-400',
    bgGradient: 'from-teal-600 via-cyan-500 to-emerald-500',
    glowColor: 'shadow-teal-500/30'
  },
  { 
    id: 'marcas',     
    label: 'Marcas',     
    href: '/productos',          
    icon: Tag,
    iconColor: 'text-rose-400',
    bgGradient: 'from-rose-500 via-pink-500 to-red-400',
    glowColor: 'shadow-pink-500/30'
  },
  { 
    id: 'favoritos',  
    label: 'Favoritos',  
    href: '/favoritos',          
    icon: Heart,
    iconColor: 'text-red-400',
    bgGradient: 'from-red-600 via-rose-500 to-pink-600',
    glowColor: 'shadow-red-500/30'
  },
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
      className="w-full overflow-x-auto scrollbar-hide py-1.5 px-0.5"
    >
      <div className="flex gap-4.5 justify-start md:justify-center min-w-max px-1">
        {ICONS.map(iconItem => {
          const IconComp = iconItem.icon
          const href = iconItem.id === 'crayola'
            ? (crayolaId ? `/tiendas/${crayolaId}` : '/tiendas')
            : iconItem.href

          const content = (
            <div className="flex flex-col items-center gap-1.5 w-[62px] group cursor-pointer select-none">
              <div className="relative">
                {/* Icon Squircle Container with 3D gradient, soft shadow glow & micro-interactions */}
                <div className={`w-13 h-13 rounded-[18px] bg-gradient-to-br ${iconItem.bgGradient}
                  flex items-center justify-center text-white shadow-md ${iconItem.glowColor}
                  border border-white/25
                  group-hover:scale-110 group-hover:shadow-lg group-active:scale-90
                  transition-all duration-200 ease-out relative overflow-hidden`}
                >
                  {/* Subtle inner highlight gloss */}
                  <div className="absolute inset-x-0 top-0 h-1/2 bg-gradient-to-b from-white/25 to-transparent pointer-events-none" />
                  <IconComp size={24} className="stroke-[2.2] drop-shadow-sm transition-transform duration-200 group-hover:scale-110" />
                </div>

                {/* Micro Badge */}
                {iconItem.badge && (
                  <span className={`absolute -top-1.5 -right-2 text-[7px] font-black tracking-wider uppercase px-1.2 py-0.2 rounded-full shadow-sm border border-white ${iconItem.badgeBg}`}>
                    {iconItem.badge}
                  </span>
                )}
              </div>

              {/* Label */}
              <span className="text-[11px] font-extrabold text-gray-700 group-hover:text-green-700 transition-colors leading-tight text-center truncate w-full tracking-tight">
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

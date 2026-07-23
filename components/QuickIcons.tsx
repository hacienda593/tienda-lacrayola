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
  badge?: string
  badgeBg?: string
}

const ICONS: QuickIcon[] = [
  { 
    id: 'ofertas',    
    label: 'Ofertas',    
    scrollTo: 'sec-ofertas',    
    icon: Flame,
    iconColor: 'text-rose-600',
    bgColor: 'bg-rose-500/10 hover:bg-rose-500/15',
    borderColor: 'border-rose-500/20',
    badge: 'HOT',
    badgeBg: 'bg-rose-600 text-white'
  },
  { 
    id: 'exclusivos', 
    label: 'Exclusivos', 
    scrollTo: 'sec-exclusivos', 
    icon: Star,
    iconColor: 'text-emerald-700',
    bgColor: 'bg-emerald-600/10 hover:bg-emerald-600/15',
    borderColor: 'border-emerald-600/20',
    badge: 'TOP',
    badgeBg: 'bg-emerald-700 text-white'
  },
  { 
    id: 'tiendas',    
    label: 'Tiendas',    
    href: '/tiendas',           
    icon: Store,
    iconColor: 'text-slate-800',
    bgColor: 'bg-slate-100 hover:bg-slate-200/70',
    borderColor: 'border-slate-200/80'
  },
  { 
    id: 'crayola',    
    label: 'Crayola',    
    href: '',                   
    icon: Backpack,
    iconColor: 'text-emerald-700',
    bgColor: 'bg-emerald-600/10 hover:bg-emerald-600/15',
    borderColor: 'border-emerald-600/25',
    badge: 'OFICIAL',
    badgeBg: 'bg-emerald-700 text-white'
  },
  { 
    id: 'nuevos',     
    label: 'Nuevos',     
    scrollTo: 'sec-novedades',  
    icon: Sparkles,
    iconColor: 'text-amber-600',
    bgColor: 'bg-amber-500/10 hover:bg-amber-500/15',
    borderColor: 'border-amber-500/20',
    badge: 'NUEVO',
    badgeBg: 'bg-amber-600 text-white'
  },
  { 
    id: 'miscompras', 
    label: 'Recompra', 
    scrollTo: 'sec-frecuentes', 
    icon: Package,
    iconColor: 'text-slate-800',
    bgColor: 'bg-slate-100 hover:bg-slate-200/70',
    borderColor: 'border-slate-200/80'
  },
  { 
    id: 'marcas',     
    label: 'Marcas',     
    href: '/productos',          
    icon: Tag,
    iconColor: 'text-slate-800',
    bgColor: 'bg-slate-100 hover:bg-slate-200/70',
    borderColor: 'border-slate-200/80'
  },
  { 
    id: 'favoritos',  
    label: 'Favoritos',  
    href: '/favoritos',          
    icon: Heart,
    iconColor: 'text-rose-600',
    bgColor: 'bg-rose-500/10 hover:bg-rose-500/15',
    borderColor: 'border-rose-500/20'
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
      className="w-full overflow-x-auto scrollbar-hide py-1 px-0.5"
    >
      <div className="flex gap-3 justify-start md:justify-center min-w-max px-1">
        {ICONS.map(iconItem => {
          const IconComp = iconItem.icon
          const href = iconItem.id === 'crayola'
            ? (crayolaId ? `/tiendas/${crayolaId}` : '/tiendas')
            : iconItem.href

          const content = (
            <div className="flex flex-col items-center gap-1.5 w-[60px] group cursor-pointer select-none">
              <div className="relative">
                {/* Clean, professional squircle container */}
                <div className={`w-12 h-12 rounded-2xl ${iconItem.bgColor} ${iconItem.borderColor} border
                  flex items-center justify-center shadow-2xs
                  group-hover:scale-105 group-active:scale-95
                  transition-all duration-150 relative overflow-hidden`}
                >
                  <IconComp size={22} className={`${iconItem.iconColor} stroke-[2.2] transition-transform duration-150 group-hover:scale-110`} />
                </div>

                {/* Micro Badge */}
                {iconItem.badge && (
                  <span className={`absolute -top-1.5 -right-1 text-[7px] font-black tracking-wider uppercase px-1.2 py-0.2 rounded-md shadow-2xs border border-white ${iconItem.badgeBg}`}>
                    {iconItem.badge}
                  </span>
                )}
              </div>

              {/* Label */}
              <span className="text-[10.5px] font-extrabold text-gray-700 group-hover:text-green-700 transition-colors leading-tight text-center truncate w-full tracking-tight">
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

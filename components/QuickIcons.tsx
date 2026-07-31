'use client'
import Link from 'next/link'
import { useEffect, useState } from 'react'
import { supabase } from '@/lib/supabase'
import { Zap, Heart, Store, LayoutGrid, RotateCw, Package, Printer, Smartphone } from 'lucide-react'

interface QuickIcon {
  id: string
  label: string
  href?: string
  scrollTo?: string
  icon: React.ElementType
}

const ICONS: QuickIcon[] = [
  { id: 'ofertas',   label: 'Ofertas',   scrollTo: 'sec-ofertas',    icon: Zap },
  { id: 'favoritos', label: 'Favoritos', href: '/favoritos',         icon: Heart },
  { id: 'comercios', label: 'Comercios', href: '/tiendas',           icon: Store },
  { id: 'catalogo',  label: 'Catálogo',  href: '/productos',         icon: LayoutGrid },
  { id: 'impresion', label: 'Impresión', href: '/impresion',         icon: Printer },
  { id: 'recargas',  label: 'Recargas',  href: '/recargas',          icon: Smartphone },
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
      className="w-full py-1 px-1"
    >
      <div className="grid grid-cols-4 sm:flex sm:flex-wrap sm:justify-center gap-y-3 gap-x-2 w-full px-1">
        {ICONS.map(iconItem => {
          const IconComp = iconItem.icon
          const href = iconItem.id === 'tienlo'
            ? (crayolaId ? `/tiendas/${crayolaId}` : '/tiendas')
            : iconItem.href

          const content = (
            <div className="flex flex-col items-center gap-1.5 w-full group cursor-pointer select-none">
              <div className="w-11 h-11 rounded-xl bg-pine group-hover:bg-pine-deep
                flex items-center justify-center shadow-xs
                group-hover:scale-[1.03] group-active:scale-95
                transition-all duration-150"
              >
                <IconComp size={18} className="text-white stroke-[1.8]" />
              </div>

              {/* Label */}
              <span className="text-[9.5px] font-price font-semibold tracking-wide uppercase text-ink-soft group-hover:text-pine-deep transition-colors leading-tight text-center truncate w-full">
                {iconItem.label}
              </span>
            </div>
          )

          if (href) {
            return (
              <Link key={iconItem.id} href={href} className="no-underline w-full flex justify-center">
                {content}
              </Link>
            )
          }

          return (
            <button 
              key={iconItem.id} 
              onClick={() => handleClick(iconItem)} 
              className="bg-transparent border-none p-0 m-0 cursor-pointer w-full flex justify-center"
            >
              {content}
            </button>
          )
        })}
      </div>
    </div>
  )
}

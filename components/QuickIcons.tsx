'use client'
import Link from 'next/link'
import { useEffect, useState } from 'react'
import { supabase } from '@/lib/supabase'

interface QuickIcon {
  id: string
  emoji: string
  label: string
  href?: string
  scrollTo?: string
  gradient: string
  border: string
}

const ICONS: QuickIcon[] = [
  { id: 'ofertas',    emoji: '🔥', label: 'Ofertas',    scrollTo: 'sec-ofertas',    gradient: 'from-red-400 to-orange-400',   border: 'border-red-200' },
  { id: 'exclusivos', emoji: '⭐', label: 'Exclusivos', scrollTo: 'sec-exclusivos', gradient: 'from-amber-400 to-yellow-300', border: 'border-amber-200' },
  { id: 'tiendas',    emoji: '🏪', label: 'Tiendas',    href: '/tiendas',           gradient: 'from-blue-400 to-indigo-400',  border: 'border-blue-200' },
  { id: 'crayola',    emoji: '🎒', label: 'Crayola',    href: '',                   gradient: 'from-green-400 to-emerald-400', border: 'border-green-200' },
  { id: 'nuevos',     emoji: '🆕', label: 'Nuevos',     scrollTo: 'sec-novedades',  gradient: 'from-purple-400 to-fuchsia-400', border: 'border-purple-200' },
  { id: 'miscompras', emoji: '📦', label: 'Mis compras', scrollTo: 'sec-frecuentes', gradient: 'from-teal-400 to-cyan-400',   border: 'border-teal-200' },
  { id: 'marcas',     emoji: '🏷️', label: 'Marcas',     href: '/productos',          gradient: 'from-pink-400 to-rose-400',   border: 'border-pink-200' },
  { id: 'favoritos',  emoji: '❤️', label: 'Favoritos',  href: '/favoritos',          gradient: 'from-rose-400 to-red-400',    border: 'border-rose-200' },
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
    <div className="w-full overflow-x-auto scrollbar-hide -mx-1 px-1">
      <div className="flex gap-4 justify-start md:justify-center py-1 min-w-max">
        {ICONS.map(icon => {
          const href = icon.id === 'crayola'
            ? (crayolaId ? `/tiendas/${crayolaId}` : '/tiendas')
            : icon.href

          const content = (
            <div className="flex flex-col items-center gap-1.5 w-[56px] group cursor-pointer">
              <div className={`w-12 h-12 rounded-2xl bg-gradient-to-br ${icon.gradient} border ${icon.border}
                flex items-center justify-center text-xl shadow-sm
                group-hover:scale-110 group-hover:shadow-md group-active:scale-95
                transition-all duration-200`}>
                <span className="select-none">{icon.emoji}</span>
              </div>
              <span className="text-[10px] font-bold text-gray-600 group-hover:text-gray-900 transition-colors leading-tight text-center truncate w-full">
                {icon.label}
              </span>
            </div>
          )

          if (href) {
            return (
              <Link key={icon.id} href={href} className="no-underline">
                {content}
              </Link>
            )
          }

          return (
            <button key={icon.id} onClick={() => handleClick(icon)} className="bg-transparent border-none p-0 m-0">
              {content}
            </button>
          )
        })}
      </div>
    </div>
  )
}

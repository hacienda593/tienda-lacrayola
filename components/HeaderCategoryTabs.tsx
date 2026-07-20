'use client'
import { useRouter, useSearchParams, usePathname } from 'next/navigation'
import { useEffect, useState } from 'react'

export interface CategoryTab {
  name: string
  cat: string
  emoji?: string
}

export const MAIN_CATEGORY_TABS: CategoryTab[] = [
  { name: 'Inicio', cat: '', emoji: '🏠' },
  { name: 'Abarrotes', cat: 'Abarrotes', emoji: '🥬' },
  { name: 'Escolar', cat: 'Escolar', emoji: '📚' },
  { name: 'Arte', cat: 'Arte', emoji: '🎨' },
  { name: 'Bebidas', cat: 'Bebidas y Licores', emoji: '🥤' },
  { name: 'Snacks', cat: 'Golosinas y Snacks', emoji: '🍪' },
  { name: 'Cuidado Personal', cat: 'Cuidado Personal', emoji: '🧴' },
  { name: 'Limpieza', cat: 'Hogar y Limpieza', emoji: '🧹' },
  { name: 'Mascotas', cat: 'Mascotas', emoji: '🐶' },
  { name: 'Tecnología', cat: 'Tecnologia', emoji: '💻' },
  { name: 'Juguetes', cat: 'Juguetes', emoji: '🧸' },
  { name: 'Libros', cat: 'Libros', emoji: '📖' },
]

export default function HeaderCategoryTabs() {
  const router = useRouter()
  const pathname = usePathname()
  const searchParams = useSearchParams()

  const [mounted, setMounted] = useState(false)
  useEffect(() => {
    setMounted(true)
  }, [])

  if (!mounted) return null

  // Solo mostrar en página principal o catálogo general de productos
  const isHomeOrCatalog = pathname === '/' || pathname === '/productos'
  if (!isHomeOrCatalog) return null

  const activeCat = searchParams?.get('cat') || ''

  function selectTab(catValue: string) {
    const params = new URLSearchParams(searchParams ? searchParams.toString() : '')
    if (catValue) {
      params.set('cat', catValue)
    } else {
      params.delete('cat')
    }
    params.delete('sub')
    params.delete('marca')
    params.delete('q')

    const qs = params.toString()
    router.push(qs ? `/?${qs}` : '/')
  }

  return (
    <div className="w-full bg-white border-t border-gray-100 shadow-xs z-30 sticky top-[57px]">
      <div className="max-w-5xl mx-auto px-2">
        <div className="flex items-center gap-5 overflow-x-auto scrollbar-hide py-2 text-xs md:text-sm font-bold select-none">
          {MAIN_CATEGORY_TABS.map((tab) => {
            const isActive = activeCat === tab.cat || (!activeCat && !tab.cat)
            return (
              <button
                key={tab.cat || 'inicio'}
                onClick={() => selectTab(tab.cat)}
                className={`relative shrink-0 flex items-center gap-1.5 px-2 py-1 rounded-lg transition-all duration-150 cursor-pointer border-none bg-transparent
                  ${isActive
                    ? 'text-green-700 font-extrabold bg-green-50 scale-105'
                    : 'text-gray-500 hover:text-gray-800 hover:bg-gray-50 font-medium'
                  }`}
              >
                <span>{tab.emoji}</span>
                <span>{tab.name}</span>
                {isActive && (
                  <span className="absolute bottom-0 left-2 right-2 h-[2.5px] bg-green-600 rounded-full" />
                )}
              </button>
            )
          })}
        </div>
      </div>
    </div>
  )
}

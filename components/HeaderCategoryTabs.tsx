'use client'
import { useRouter, useSearchParams, usePathname } from 'next/navigation'
import { useEffect, useState, useRef } from 'react'

export interface CategoryTab {
  name: string
  cat: string
}

export const MAIN_CATEGORY_TABS: CategoryTab[] = [
  { name: 'Inicio', cat: '' },
  { name: 'Abarrotes', cat: 'Abarrotes' },
  { name: 'Escolar', cat: 'Escolar' },
  { name: 'Arte', cat: 'Arte' },
  { name: 'Bebidas', cat: 'Bebidas y Licores' },
  { name: 'Snacks', cat: 'Golosinas y Snacks' },
  { name: 'Cuidado Personal', cat: 'Cuidado Personal' },
  { name: 'Limpieza', cat: 'Hogar y Limpieza' },
  { name: 'Mascotas', cat: 'Mascotas' },
  { name: 'Tecnología', cat: 'Tecnologia' },
  { name: 'Juguetes', cat: 'Juguetes' },
  { name: 'Libros', cat: 'Libros' },
]

export default function HeaderCategoryTabs() {
  const router = useRouter()
  const pathname = usePathname()
  const searchParams = useSearchParams()

  const [mounted, setMounted] = useState(false)
  const tabRefs = useRef<Record<string, HTMLButtonElement | null>>({})

  useEffect(() => {
    setMounted(true)
  }, [])

  const activeCat = searchParams?.get('cat') || ''

  // Auto-centrar la pestaña activa suavemente cuando cambia la categoría (click o swipe)
  useEffect(() => {
    if (!mounted) return
    const key = activeCat || 'inicio'
    const activeEl = tabRefs.current[key]
    if (activeEl) {
      activeEl.scrollIntoView({
        behavior: 'smooth',
        block: 'nearest',
        inline: 'center'
      })
    }
  }, [activeCat, mounted])

  if (!mounted) return null

  // Solo mostrar en página principal o catálogo general de productos
  const isHomeOrCatalog = pathname === '/' || pathname === '/productos'
  if (!isHomeOrCatalog) return null

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
        <div className="flex items-center gap-2 overflow-x-auto scrollbar-hide py-2 text-xs md:text-sm font-bold select-none px-1">
          {MAIN_CATEGORY_TABS.map((tab) => {
            const tabKey = tab.cat || 'inicio'
            const isActive = activeCat === tab.cat || (!activeCat && !tab.cat)
            return (
              <button
                key={tabKey}
                ref={(el) => { tabRefs.current[tabKey] = el }}
                onClick={() => selectTab(tab.cat)}
                className={`relative shrink-0 flex items-center justify-center px-3.5 py-1.5 rounded-full transition-all duration-200 cursor-pointer border
                  ${isActive
                    ? 'bg-green-600 text-white border-green-600 shadow-md font-black scale-105'
                    : 'bg-gray-50 text-gray-600 border-gray-200 hover:bg-gray-100 font-bold'
                  }`}
              >
                <span>{tab.name}</span>
              </button>
            )
          })}
        </div>
      </div>
    </div>
  )
}

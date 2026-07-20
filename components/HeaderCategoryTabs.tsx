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
  const [activeCat, setActiveCat] = useState('')
  const tabRefs = useRef<Record<string, HTMLButtonElement | null>>({})
  const containerRef = useRef<HTMLDivElement | null>(null)

  useEffect(() => {
    setMounted(true)
    const currentCat = searchParams?.get('cat') || ''
    setActiveCat(currentCat)
  }, [searchParams])

  // Escuchar cambios de categoría globales
  useEffect(() => {
    const handleGlobalChange = (e: Event) => {
      const customEvent = e as CustomEvent
      if (typeof customEvent.detail === 'string') {
        setActiveCat(customEvent.detail)
      }
    }
    window.addEventListener('category-tab-change', handleGlobalChange)
    return () => window.removeEventListener('category-tab-change', handleGlobalChange)
  }, [])

  // Centrar suavemente la pestaña activa en el contenedor horizontal
  useEffect(() => {
    if (!mounted) return
    const key = activeCat || 'inicio'
    const timer = setTimeout(() => {
      const activeEl = tabRefs.current[key]
      const container = containerRef.current
      if (activeEl && container) {
        const containerWidth = container.offsetWidth
        const elLeft = activeEl.offsetLeft
        const elWidth = activeEl.offsetWidth
        const targetScroll = elLeft - (containerWidth / 2) + (elWidth / 2)
        container.scrollTo({
          left: Math.max(0, targetScroll),
          behavior: 'smooth'
        })
      }
    }, 50)
    return () => clearTimeout(timer)
  }, [activeCat, mounted])

  if (!mounted) return null

  const isHomeOrCatalog = pathname === '/' || pathname === '/productos'
  if (!isHomeOrCatalog) return null

  function selectTab(catValue: string) {
    setActiveCat(catValue)

    const params = new URLSearchParams(searchParams ? searchParams.toString() : '')
    if (catValue) {
      params.set('cat', catValue)
    } else {
      params.delete('cat')
    }
    params.delete('sub')
    params.delete('marca')
    params.delete('q')

    const targetUrl = params.toString() ? `/?${params.toString()}` : '/'

    window.dispatchEvent(new CustomEvent('category-tab-change', { detail: catValue }))
    window.history.pushState(null, '', targetUrl)
    router.push(targetUrl)
  }

  return (
    <div className="w-full bg-white border-b border-gray-100 shadow-2xs z-30 sticky top-[56px]">
      <div className="max-w-5xl mx-auto px-2">
        <div
          ref={containerRef}
          className="flex items-center gap-1.5 overflow-x-auto scrollbar-hide py-1.5 text-xs md:text-sm font-extrabold select-none px-1"
        >
          {MAIN_CATEGORY_TABS.map((tab) => {
            const tabKey = tab.cat || 'inicio'
            const isActive = activeCat === tab.cat || (!activeCat && !tab.cat)
            return (
              <button
                key={tabKey}
                ref={(el) => { tabRefs.current[tabKey] = el }}
                onClick={(e) => {
                  e.preventDefault()
                  e.stopPropagation()
                  selectTab(tab.cat)
                }}
                className={`relative shrink-0 flex items-center justify-center px-3.5 py-1.5 rounded-full transition-all duration-150 cursor-pointer border-none
                  ${isActive
                    ? 'bg-emerald-600 text-white font-black shadow-sm'
                    : 'bg-transparent text-gray-600 hover:text-emerald-700 hover:bg-emerald-50/60 font-bold'
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

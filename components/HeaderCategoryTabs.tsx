'use client'
import { useRouter, useSearchParams, usePathname } from 'next/navigation'
import { useEffect, useState, useRef } from 'react'
import { X } from 'lucide-react'

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
          className="flex items-center gap-3.5 overflow-x-auto scrollbar-hide text-xs md:text-sm select-none px-1"
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
                className={`relative shrink-0 flex items-center justify-center py-2 transition-colors duration-150 cursor-pointer border-none bg-transparent
                  ${isActive
                    ? 'text-emerald-700 font-semibold'
                    : 'text-gray-500 hover:text-gray-800 font-medium'
                  }`}
              >
                <span>{tab.name}</span>
                <span className={`absolute left-0 right-0 -bottom-px h-[2px] rounded-full transition-colors
                  ${isActive ? 'bg-emerald-600' : 'bg-transparent'}`} />
              </button>
            )
          })}
        </div>
      </div>

      {/* Sub-barra discreta pegada al Header estilo Almacenes Tía */}
      {activeCat && (
        <div className="bg-emerald-50/80 border-t border-emerald-100/80 py-1.5 px-3.5 flex items-center justify-between text-xs font-bold text-emerald-900 animate-in fade-in duration-150">
          <div className="flex items-center gap-1.5 min-w-0 max-w-5xl mx-auto w-full justify-between">
            <div className="flex items-center gap-1.5 min-w-0">
              <span className="text-emerald-700 text-sm">📍</span>
              <span className="truncate">Pasillo: <strong className="font-black text-emerald-800">{activeCat}</strong></span>
            </div>
            <button
              onClick={() => selectTab('')}
              className="flex items-center gap-1 text-[11px] font-extrabold text-emerald-700 hover:text-emerald-900 bg-white border border-emerald-200/80 px-2.5 py-0.5 rounded-lg shadow-2xs hover:bg-emerald-100/50 transition cursor-pointer shrink-0"
            >
              <X size={11} className="stroke-[3]" />
              <span>Quitar filtro</span>
            </button>
          </div>
        </div>
      )}
    </div>
  )
}

'use client'
import { useEffect, useState, useRef } from 'react'
import { useRouter } from 'next/navigation'
import { supabase } from '@/lib/supabase'
import { X, ChevronRight, Search, Loader2, LayoutGrid } from 'lucide-react'

// ── Configuración visual de categorías ────────────────────────────
const CAT_CFG: Record<string, { emoji: string; color: string; bg: string; bgActive: string }> = {
  'Escolar':      { emoji: '📚', color: 'text-blue-700',   bg: 'bg-blue-50',   bgActive: 'bg-blue-600' },
  'Arte':         { emoji: '🎨', color: 'text-purple-700', bg: 'bg-purple-50', bgActive: 'bg-purple-600' },
  'Oficina':      { emoji: '🖊️', color: 'text-gray-700',   bg: 'bg-gray-100',  bgActive: 'bg-gray-600' },
  'Tecnologia':   { emoji: '💻', color: 'text-indigo-700', bg: 'bg-indigo-50', bgActive: 'bg-indigo-600' },
  'Juguetes':     { emoji: '🧸', color: 'text-orange-700', bg: 'bg-orange-50', bgActive: 'bg-orange-600' },
  'Manualidades': { emoji: '✂️', color: 'text-pink-700',   bg: 'bg-pink-50',   bgActive: 'bg-pink-600' },
  'Libros':       { emoji: '📖', color: 'text-amber-700',  bg: 'bg-amber-50',  bgActive: 'bg-amber-600' },
  'Pintura':      { emoji: '🖌️', color: 'text-red-700',    bg: 'bg-red-50',    bgActive: 'bg-red-600' },
  'Papeleria':    { emoji: '📄', color: 'text-teal-700',   bg: 'bg-teal-50',   bgActive: 'bg-teal-600' },
}

const DEFAULT_CFG = { emoji: '📦', color: 'text-green-700', bg: 'bg-green-50', bgActive: 'bg-green-600' }

interface CatData {
  categoria:    string
  subcategorias: { nombre: string; cantidad: number }[]
  total:        number
}

interface Props {
  open:    boolean
  onClose: () => void
}

export default function CategoriasPanel({ open, onClose }: Props) {
  const router = useRouter()
  const [cats,     setCats]     = useState<CatData[]>([])
  const [activa,   setActiva]   = useState<string>('')
  const [cargando, setCargando] = useState(true)
  const [q,        setQ]        = useState('')
  const subRef = useRef<HTMLDivElement>(null)

  // Cargar categorías y subcategorías desde Supabase
  useEffect(() => {
    if (!open) return
    if (cats.length > 0) return // ya cargado

    async function cargar() {
      const { data } = await supabase
        .from('ol_productos')
        .select('categoria, subcategoria')
        .gt('stock', 0)
        .gt('precio_publico', 0)

      if (!data) { setCargando(false); return }

      // Agrupar
      const map = new Map<string, Map<string, number>>()
      data.forEach(({ categoria, subcategoria }) => {
        if (!categoria) return
        if (!map.has(categoria)) map.set(categoria, new Map())
        const subMap = map.get(categoria)!
        if (subcategoria) subMap.set(subcategoria, (subMap.get(subcategoria) ?? 0) + 1)
      })

      const result: CatData[] = Array.from(map.entries())
        .map(([categoria, subMap]) => ({
          categoria,
          subcategorias: Array.from(subMap.entries())
            .map(([nombre, cantidad]) => ({ nombre, cantidad }))
            .sort((a, b) => b.cantidad - a.cantidad),
          total: Array.from(subMap.values()).reduce((s, n) => s + n, 0),
        }))
        .sort((a, b) => b.total - a.total)

      setCats(result)
      setActiva(result[0]?.categoria ?? '')
      setCargando(false)
    }

    cargar()
  }, [open, cats.length])

  // Al cambiar categoría activa, scroll arriba en subcategorías
  useEffect(() => {
    subRef.current?.scrollTo({ top: 0, behavior: 'smooth' })
  }, [activa])

  function navegar(cat: string, sub?: string) {
    const params = new URLSearchParams({ cat })
    if (sub) params.set('sub', sub)
    router.push(`/productos?${params.toString()}`)
    onClose()
  }

  // Filtro de búsqueda sobre categorías
  const catsFiltradas = q.trim()
    ? cats.filter(c =>
        c.categoria.toLowerCase().includes(q.toLowerCase()) ||
        c.subcategorias.some(s => s.nombre.toLowerCase().includes(q.toLowerCase()))
      )
    : cats

  const activaData = catsFiltradas.find(c => c.categoria === activa) ?? catsFiltradas[0]
  const cfg        = CAT_CFG[activaData?.categoria ?? ''] ?? DEFAULT_CFG

  return (
    <>
      {/* Overlay */}
      <div
        onClick={onClose}
        className={`fixed inset-0 bg-black/50 z-[60] transition-opacity duration-300 ${open ? 'opacity-100 pointer-events-auto' : 'opacity-0 pointer-events-none'}`}
      />

      {/* Panel — bottom sheet en móvil, lateral en desktop */}
      <div className={`
        fixed z-[70] bg-white shadow-2xl transition-all duration-300 ease-in-out
        /* móvil: bottom sheet */
        bottom-0 left-0 right-0 rounded-t-2xl max-h-[88vh]
        /* desktop: panel lateral izquierdo */
        md:bottom-auto md:top-0 md:left-0 md:h-full md:w-[560px] md:rounded-none md:max-h-full
        flex flex-col
        ${open
          ? 'translate-y-0 md:translate-x-0'
          : 'translate-y-full md:translate-y-0 md:-translate-x-full'
        }
      `}>

        {/* Header del panel */}
        <div className="flex items-center justify-between px-4 pt-4 pb-3 border-b border-gray-100 shrink-0">
          <div className="flex items-center gap-2">
            <LayoutGrid size={18} className="text-green-600" />
            <span className="font-bold text-gray-800">Categorías</span>
          </div>
          <button onClick={onClose} className="p-1.5 hover:bg-gray-100 rounded-lg transition">
            <X size={18} className="text-gray-500" />
          </button>
        </div>

        {/* Buscador */}
        <div className="px-4 py-2.5 border-b border-gray-100 shrink-0">
          <div className="relative">
            <Search size={14} className="absolute left-3 top-1/2 -translate-y-1/2 text-gray-400" />
            <input
              value={q}
              onChange={e => setQ(e.target.value)}
              placeholder="Buscar categoría o subcategoría..."
              className="w-full bg-gray-50 border border-gray-200 rounded-xl pl-9 pr-4 py-2 text-sm text-gray-800 placeholder-gray-400 focus:outline-none focus:border-green-500 focus:bg-white transition"
            />
          </div>
        </div>

        {/* Cuerpo — 2 columnas */}
        {cargando ? (
          <div className="flex-1 flex items-center justify-center">
            <Loader2 size={28} className="animate-spin text-green-500" />
          </div>
        ) : (
          <div className="flex flex-1 min-h-0">

            {/* ── Columna izquierda: categorías principales ── */}
            <div className="w-[120px] md:w-[140px] shrink-0 border-r border-gray-100 overflow-y-auto bg-gray-50">
              {catsFiltradas.map(cat => {
                const c      = CAT_CFG[cat.categoria] ?? DEFAULT_CFG
                const estaAct = cat.categoria === activa
                return (
                  <button
                    key={cat.categoria}
                    onClick={() => setActiva(cat.categoria)}
                    className={`w-full flex flex-col items-center gap-1.5 px-2 py-3.5 transition-all relative
                      ${estaAct ? 'bg-white' : 'hover:bg-white/70'}`}
                  >
                    {/* Indicador activo */}
                    {estaAct && (
                      <span className="absolute left-0 top-2 bottom-2 w-0.5 bg-green-500 rounded-r" />
                    )}

                    {/* Emoji en círculo */}
                    <div className={`w-11 h-11 rounded-xl flex items-center justify-center text-xl transition-all
                      ${estaAct ? c.bgActive + ' shadow-sm' : c.bg}`}>
                      <span className={estaAct ? 'brightness-0 invert' : ''}>{c.emoji}</span>
                    </div>

                    <span className={`text-[10px] font-semibold text-center leading-tight line-clamp-2
                      ${estaAct ? 'text-green-700' : 'text-gray-600'}`}>
                      {cat.categoria}
                    </span>

                    {/* Contador */}
                    <span className={`text-[9px] ${estaAct ? 'text-green-500' : 'text-gray-400'}`}>
                      {cat.total}
                    </span>
                  </button>
                )
              })}
            </div>

            {/* ── Columna derecha: subcategorías ── */}
            <div ref={subRef} className="flex-1 overflow-y-auto">
              {activaData && (
                <>
                  {/* Banner de categoría */}
                  <button
                    onClick={() => navegar(activaData.categoria)}
                    className={`w-full flex items-center gap-3 px-4 py-4 ${cfg.bg} border-b border-gray-100 hover:opacity-90 transition`}
                  >
                    <div className={`w-12 h-12 ${cfg.bgActive} rounded-xl flex items-center justify-center text-2xl shadow-sm`}>
                      <span className="brightness-0 invert">{cfg.emoji}</span>
                    </div>
                    <div className="flex-1 text-left">
                      <div className={`font-bold text-base ${cfg.color}`}>Todo en {activaData.categoria}</div>
                      <div className="text-xs text-gray-500">{activaData.total} productos disponibles</div>
                    </div>
                    <ChevronRight size={16} className="text-gray-400" />
                  </button>

                  {/* Subcategorías */}
                  {activaData.subcategorias.length > 0 ? (
                    <div className="p-3">
                      <p className="text-[10px] font-bold text-gray-400 uppercase tracking-wider mb-2 px-1">
                        Subcategorías
                      </p>
                      <div className="grid grid-cols-2 gap-2">
                        {activaData.subcategorias
                          .filter(s => !q || s.nombre.toLowerCase().includes(q.toLowerCase()))
                          .map(sub => (
                            <button
                              key={sub.nombre}
                              onClick={() => navegar(activaData.categoria, sub.nombre)}
                              className="flex items-center justify-between bg-white border border-gray-100 hover:border-green-200 hover:bg-green-50 rounded-xl px-3 py-2.5 text-left transition group"
                            >
                              <span className="text-xs font-medium text-gray-700 group-hover:text-green-700 leading-tight line-clamp-2 flex-1">
                                {sub.nombre}
                              </span>
                              <span className="text-[10px] text-gray-400 ml-1.5 shrink-0 bg-gray-50 group-hover:bg-green-100 px-1.5 py-0.5 rounded-full">
                                {sub.cantidad}
                              </span>
                            </button>
                          ))
                        }
                      </div>
                    </div>
                  ) : (
                    <div className="flex flex-col items-center justify-center py-12 text-gray-400 gap-2">
                      <span className="text-3xl">{cfg.emoji}</span>
                      <p className="text-sm">Sin subcategorías aún</p>
                    </div>
                  )}
                </>
              )}

              {catsFiltradas.length === 0 && (
                <div className="flex flex-col items-center justify-center py-16 gap-3">
                  <Search size={32} className="text-gray-200" />
                  <p className="text-sm text-gray-400">Sin resultados para "{q}"</p>
                </div>
              )}
            </div>
          </div>
        )}
      </div>
    </>
  )
}

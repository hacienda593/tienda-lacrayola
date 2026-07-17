'use client'
import { useEffect, useState, Suspense } from 'react'
import { useRouter, useSearchParams } from 'next/navigation'
import { supabase } from '@/lib/supabase'
import { OlTienda } from '@/lib/types'
import { Loader2, Store, ChevronRight, MapPin } from 'lucide-react'

const CAT_CFG: Record<string, { emoji: string; color: string; bg: string }> = {
  supermercado: { emoji: '🛒', color: 'text-green-700',  bg: 'bg-green-50' },
  farmacia:     { emoji: '💊', color: 'text-red-700',    bg: 'bg-red-50' },
  libreria:     { emoji: '📚', color: 'text-blue-700',   bg: 'bg-blue-50' },
  abarrotes:    { emoji: '🥬', color: 'text-emerald-700',bg: 'bg-emerald-50' },
  tecnologia:   { emoji: '💻', color: 'text-indigo-700', bg: 'bg-indigo-50' },
  ropa:         { emoji: '👕', color: 'text-pink-700',   bg: 'bg-pink-50' },
  otros:        { emoji: '🏪', color: 'text-gray-700',   bg: 'bg-gray-50' },
}

function TiendasContent() {
  const router  = useRouter()
  const searchParams = useSearchParams()
  const catFiltrada = searchParams.get('cat') || ''

  const [tiendas,  setTiendas]  = useState<OlTienda[]>([])
  const [cargando, setCargando] = useState(true)

  useEffect(() => {
    supabase.from('ol_tiendas')
      .select('*')
      .eq('activa', true)
      .order('orden')
      .then(({ data }) => {
        const list = (data ?? []) as OlTienda[]
        const virtuales: OlTienda[] = [
          {
            id: 'frecuentes-servicios',
            nombre: 'Productos Frecuentes',
            descripcion: 'Tus productos más comprados y favoritos para agregarlos al carrito al instante.',
            categoria: 'otros',
            logo_url: null,
            activa: true,
            orden: 97,
            direccion: 'Tu Historial'
          },
          {
            id: 'impresion-servicios',
            nombre: 'Centro de Impresiones',
            descripcion: 'Sube tus documentos, PDF y tareas escolares para entrega a domicilio express.',
            categoria: 'libreria',
            logo_url: null,
            activa: true,
            orden: 98,
            direccion: 'Servicio Express'
          },
          {
            id: 'recargas-servicios',
            nombre: 'Recargas y Servicios Básicos',
            descripcion: 'Recarga combos Claro/Movistar/Tuenti y paga tus planillas de Luz, Agua e Internet.',
            categoria: 'tecnologia',
            logo_url: null,
            activa: true,
            orden: 99,
            direccion: 'Servicio en Línea (WhatsApp)'
          }
        ]
        setTiendas([...list, ...virtuales])
        setCargando(false)
      })
  }, [])

  const categorias = [...new Set(tiendas.map(t => t.categoria ?? 'otros'))]
    .filter(c => !catFiltrada || c.toLowerCase() === catFiltrada.toLowerCase())

  return (
    <div className="max-w-5xl mx-auto px-4 py-6 space-y-8">

      {/* Hero */}
      <div className="bg-gradient-to-br from-green-700 to-emerald-600 rounded-2xl p-4 sm:p-6 text-white">
        <div className="flex items-center gap-2 sm:gap-3 mb-1 sm:mb-2">
          <Store className="w-5 h-5 sm:w-6 sm:h-6 shrink-0" />
          <h1 className="text-lg sm:text-xl font-extrabold">Tiendas disponibles</h1>
        </div>
        <p className="text-green-100 text-xs sm:text-sm max-w-md leading-relaxed">
          Compra en tus tiendas favoritas de Los Bancos. Nosotros recogemos y te entregamos en casa.
        </p>
        <div className="flex gap-2 mt-3 overflow-x-auto flex-nowrap scrollbar-hide -mx-4 px-4 sm:mx-0 sm:px-0 sm:flex-wrap">
          {['📍 Solo en Los Bancos', '🚚 Entrega a domicilio', '🛒 Varias tiendas en 1 pedido'].map(b => (
            <span key={b} className="bg-white/20 text-white text-[11px] sm:text-xs font-medium px-2.5 py-1 rounded-full whitespace-nowrap shrink-0">{b}</span>
          ))}
        </div>
      </div>

      {cargando ? (
        <div className="flex justify-center py-16">
          <Loader2 size={28} className="animate-spin text-green-500" />
        </div>
      ) : tiendas.length === 0 ? (
        <div className="text-center py-16 space-y-2">
          <Store size={48} className="text-gray-200 mx-auto" />
          <p className="text-gray-500 font-medium">Pronto agregaremos tiendas disponibles</p>
        </div>
      ) : (
        /* Tiendas agrupadas por categoría */
        categorias.map(cat => {
          const grupo = tiendas.filter(t => (t.categoria ?? 'otros') === cat)
          const cfg   = CAT_CFG[cat] ?? CAT_CFG.otros
          return (
            <section key={cat}>
              <div className="flex items-center gap-2 mb-3">
                <span className="text-xl">{cfg.emoji}</span>
                <h2 className="font-bold text-gray-800 capitalize">{cat}</h2>
                <span className="text-xs text-gray-400">({grupo.length})</span>
              </div>
              <div className="grid grid-cols-1 sm:grid-cols-2 md:grid-cols-3 gap-4">
                {grupo.map(tienda => (
                  <button
                    key={tienda.id}
                    onClick={() => {
                      if (tienda.id === 'recargas-servicios') {
                        router.push('/recargas')
                      } else if (tienda.id === 'impresion-servicios') {
                        router.push('/impresion')
                      } else if (tienda.id === 'frecuentes-servicios') {
                        router.push('/productos?frecuentes=true')
                      } else {
                        router.push(`/tiendas/${tienda.id}`)
                      }
                    }}
                    className="bg-white border border-gray-100 rounded-2xl p-5 shadow-sm hover:shadow-md hover:-translate-y-0.5 transition-all text-left flex items-center gap-4 group"
                  >
                    {/* Logo o emoji */}
                    <div className={`w-14 h-14 ${cfg.bg} rounded-xl flex items-center justify-center text-3xl shrink-0 group-hover:scale-105 transition-transform`}>
                      {tienda.logo_url
                        ? <img src={tienda.logo_url} alt={tienda.nombre} className="w-10 h-10 object-contain" />
                        : tienda.id === 'recargas-servicios'
                          ? '📱'
                          : tienda.id === 'impresion-servicios'
                            ? '🖨️'
                            : tienda.id === 'frecuentes-servicios'
                              ? '🔄'
                              : cfg.emoji
                      }
                    </div>

                    <div className="flex-1 min-w-0">
                      <div className="font-bold text-gray-800 text-base">{tienda.nombre}</div>
                      {tienda.descripcion && (
                        <div className="text-xs text-gray-400 line-clamp-2 mt-0.5">{tienda.descripcion}</div>
                      )}
                      {tienda.direccion && (
                        <div className="flex items-center gap-1 text-[10px] text-gray-400 mt-1">
                          <MapPin size={9} /> {tienda.direccion}
                        </div>
                      )}
                    </div>

                    <ChevronRight size={16} className="text-gray-300 group-hover:text-green-500 shrink-0 transition-colors" />
                  </button>
                ))}
              </div>
            </section>
          )
        })
      )}
    </div>
  )
}

export default function TiendasPage() {
  return (
    <Suspense fallback={
      <div className="flex justify-center py-16">
        <Loader2 size={28} className="animate-spin text-green-500" />
      </div>
    }>
      <TiendasContent />
    </Suspense>
  )
}

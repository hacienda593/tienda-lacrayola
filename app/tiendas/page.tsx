'use client'
import { useEffect, useState } from 'react'
import { useRouter } from 'next/navigation'
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

export default function TiendasPage() {
  const router  = useRouter()
  const [tiendas,  setTiendas]  = useState<OlTienda[]>([])
  const [cargando, setCargando] = useState(true)

  useEffect(() => {
    supabase.from('ol_tiendas')
      .select('*')
      .eq('activa', true)
      .order('orden')
      .then(({ data }) => {
        const list = (data ?? []) as OlTienda[]
        const recargasTienda: OlTienda = {
          id: 'recargas-servicios',
          nombre: 'Recargas y Servicios Básicos',
          descripcion: 'Recarga saldo, combos de Claro/Movistar/Tuenti y paga tus planillas de Luz, Agua e Internet.',
          categoria: 'tecnologia',
          logo_url: null,
          activa: true,
          orden: 99,
          direccion: 'Servicio en Línea (WhatsApp)'
        }
        setTiendas([...list, recargasTienda])
        setCargando(false)
      })
  }, [])

  const categorias = [...new Set(tiendas.map(t => t.categoria ?? 'otros'))]

  return (
    <div className="max-w-5xl mx-auto px-4 py-6 space-y-8">

      {/* Hero */}
      <div className="bg-gradient-to-br from-green-700 to-emerald-600 rounded-2xl p-6 text-white">
        <div className="flex items-center gap-3 mb-2">
          <Store size={24} />
          <h1 className="text-xl font-extrabold">Tiendas disponibles</h1>
        </div>
        <p className="text-green-100 text-sm max-w-md">
          Compra en tus tiendas favoritas de Los Bancos. Nosotros recogemos y te entregamos en casa.
        </p>
        <div className="flex gap-3 mt-4 flex-wrap">
          {['📍 Solo en Los Bancos', '🚚 Entrega a domicilio', '🛒 Varias tiendas en 1 pedido'].map(b => (
            <span key={b} className="bg-white/20 text-white text-xs font-semibold px-3 py-1.5 rounded-full">{b}</span>
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

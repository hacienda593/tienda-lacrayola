'use client'
import { useEffect, useState, Suspense } from 'react'
import { useRouter, useSearchParams } from 'next/navigation'
import { supabase } from '@/lib/supabase'
import { OlTienda } from '@/lib/types'
import { Loader2, Store, ChevronRight, MapPin, Pill, BookOpen, ShoppingBasket, Cpu, Shirt, Smartphone, Printer, RotateCw } from 'lucide-react'

const CAT_CFG: Record<string, { icon: React.ElementType }> = {
  supermercado: { icon: ShoppingBasket },
  farmacia:     { icon: Pill },
  libreria:     { icon: BookOpen },
  abarrotes:    { icon: ShoppingBasket },
  tecnologia:   { icon: Cpu },
  ropa:         { icon: Shirt },
  otros:        { icon: Store },
}

const ICONO_SERVICIO: Record<string, React.ElementType> = {
  'recargas-servicios': Smartphone,
  'impresion-servicios': Printer,
  'frecuentes-servicios': RotateCw,
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
    <div className="max-w-5xl mx-auto px-4 py-6 space-y-8 font-ui">

      {/* Signage */}
      <div className="bg-pine-deep rounded-2xl p-4 sm:p-6 text-white">
        <div className="flex items-center gap-2 sm:gap-3 mb-1 sm:mb-2">
          <Store size={20} strokeWidth={1.5} className="shrink-0 text-white/80" />
          <h1 className="font-display text-lg sm:text-xl font-bold">Tiendas disponibles</h1>
        </div>
        <p className="text-white/70 text-xs sm:text-sm max-w-md leading-relaxed">
          Compra en tus tiendas favoritas de Los Bancos. Nosotros recogemos y te entregamos en casa.
        </p>
        <div className="flex gap-2 mt-3 overflow-x-auto flex-nowrap scrollbar-hide -mx-4 px-4 sm:mx-0 sm:px-0 sm:flex-wrap">
          {['Solo en Los Bancos', 'Entrega a domicilio', 'Varias tiendas en 1 pedido'].map(b => (
            <span key={b} className="font-price text-white/60 text-[10px] sm:text-[11px] font-medium tracking-wide uppercase whitespace-nowrap shrink-0">{b}</span>
          ))}
        </div>
      </div>

      {cargando ? (
        <div className="flex justify-center py-16">
          <Loader2 size={28} className="animate-spin text-pine" />
        </div>
      ) : tiendas.length === 0 ? (
        <div className="text-center py-16 space-y-2">
          <Store size={48} className="text-line mx-auto" />
          <p className="text-ink-faint font-medium">Pronto agregaremos tiendas disponibles</p>
        </div>
      ) : (
        /* Tiendas agrupadas por categoría */
        categorias.map(cat => {
          const grupo = tiendas.filter(t => (t.categoria ?? 'otros') === cat)
          const cfg   = CAT_CFG[cat] ?? CAT_CFG.otros
          const CatIcon = cfg.icon
          return (
            <section key={cat}>
              <div className="flex items-baseline gap-2 mb-3">
                <h2 className="font-display text-[17px] font-bold text-ink capitalize">{cat}</h2>
                <span className="font-price text-xs text-ink-faint">({grupo.length})</span>
              </div>
              <div className="grid grid-cols-1 sm:grid-cols-2 md:grid-cols-3 gap-4">
                {grupo.map(tienda => {
                  const ServicioIcon = ICONO_SERVICIO[tienda.id]
                  const Icon = ServicioIcon || CatIcon
                  return (
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
                      className="bg-white border border-line rounded-xl p-5 hover:shadow-md hover:-translate-y-0.5 transition-all text-left flex items-center gap-4 group"
                    >
                      {/* Logo o ícono */}
                      <div className="w-14 h-14 bg-pine-tint rounded-lg flex items-center justify-center shrink-0 group-hover:scale-105 transition-transform">
                        {tienda.logo_url
                          ? <img src={tienda.logo_url} alt={tienda.nombre} className="w-10 h-10 object-contain" />
                          : <Icon size={24} strokeWidth={1.5} className="text-pine-deep" />
                        }
                      </div>

                      <div className="flex-1 min-w-0">
                        <div className="font-semibold text-ink text-base">{tienda.nombre}</div>
                        {tienda.descripcion && (
                          <div className="text-xs text-ink-faint line-clamp-2 mt-0.5">{tienda.descripcion}</div>
                        )}
                        {tienda.direccion && (
                          <div className="flex items-center gap-1 font-price text-[10px] text-ink-faint mt-1">
                            <MapPin size={9} /> {tienda.direccion}
                          </div>
                        )}
                      </div>

                      <ChevronRight size={16} className="text-ink-faint group-hover:text-pine shrink-0 transition-colors" />
                    </button>
                  )
                })}
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
        <Loader2 size={28} className="animate-spin text-pine" />
      </div>
    }>
      <TiendasContent />
    </Suspense>
  )
}

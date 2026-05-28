'use client'
import { useEffect, useState } from 'react'
import Link from 'next/link'
import { supabase } from '@/lib/supabase'
import { ChevronRight, ShoppingCart, Truck, Shield, Clock } from 'lucide-react'
import { agregarItem } from '@/lib/carrito'
import { Producto } from '@/lib/types'

function fmt(n: number) { return '$' + n.toFixed(2) }

const CAT_CONFIG: Record<string, { emoji: string; color: string; bg: string }> = {
  'Escolar':      { emoji: '📚', color: 'text-blue-700',   bg: 'bg-blue-50 border-blue-100' },
  'Arte':         { emoji: '🎨', color: 'text-purple-700', bg: 'bg-purple-50 border-purple-100' },
  'Oficina':      { emoji: '🖊️', color: 'text-gray-700',   bg: 'bg-gray-50 border-gray-200' },
  'Tecnologia':   { emoji: '💻', color: 'text-indigo-700', bg: 'bg-indigo-50 border-indigo-100' },
  'Juguetes':     { emoji: '🧸', color: 'text-orange-700', bg: 'bg-orange-50 border-orange-100' },
  'Manualidades': { emoji: '✂️', color: 'text-pink-700',   bg: 'bg-pink-50 border-pink-100' },
  'Libros':       { emoji: '📖', color: 'text-amber-700',  bg: 'bg-amber-50 border-amber-100' },
  'Pintura':      { emoji: '🖌️', color: 'text-red-700',    bg: 'bg-red-50 border-red-100' },
}

function BtnAgregar({ prod }: { prod: Producto }) {
  const [ok, setOk] = useState(false)
  return (
    <button onClick={e => { e.preventDefault(); agregarItem(prod); setOk(true); setTimeout(() => setOk(false), 1200) }}
      className={`w-full mt-3 py-2 rounded-lg text-xs font-bold transition flex items-center justify-center gap-1.5
        ${ok ? 'bg-green-600 text-white' : 'bg-green-50 text-green-700 border border-green-200 hover:bg-green-600 hover:text-white hover:border-green-600'}`}>
      <ShoppingCart size={13} />
      {ok ? '¡Agregado!' : 'Agregar al carrito'}
    </button>
  )
}

export default function Home() {
  const [cats, setCats] = useState<{ categoria: string; n: number }[]>([])
  const [destacados, setDestacados] = useState<Producto[]>([])

  useEffect(() => {
    // Categorías con stock
    supabase.from('ol_productos').select('categoria').gt('stock', 0)
      .then(({ data }) => {
        if (!data) return
        const map = new Map<string, number>()
        data.forEach((d: { categoria: string }) => {
          if (d.categoria) map.set(d.categoria, (map.get(d.categoria) || 0) + 1)
        })
        setCats(Array.from(map.entries()).sort((a, b) => b[1] - a[1]).slice(0, 9).map(([categoria, n]) => ({ categoria, n })))
      })
    // Productos destacados: los de mayor precio con stock (los más premium)
    supabase.from('ol_productos')
      .select('codigo,descripcion,categoria,subcategoria,marca,stock,stock_minimo,precio_publico,precio_con_iva')
      .gt('stock', 0).gt('precio_publico', 5).order('precio_publico', { ascending: false }).limit(8)
      .then(({ data }) => { if (data) setDestacados(data as Producto[]) })
  }, [])

  return (
    <div>
      {/* ── HERO ── */}
      <div className="bg-gradient-to-br from-green-700 via-green-600 to-emerald-500 text-white">
        <div className="max-w-5xl mx-auto px-4 py-12 md:py-16 flex flex-col md:flex-row items-center gap-8">
          <div className="flex-1 text-center md:text-left">
            <div className="inline-block bg-white/20 text-white text-xs font-bold px-3 py-1 rounded-full mb-4">
              🎒 Temporada escolar 2026
            </div>
            <h1 className="text-3xl md:text-4xl font-extrabold leading-tight mb-3">
              Todo para el regreso<br/>a clases
            </h1>
            <p className="text-green-100 text-sm md:text-base mb-6 max-w-md">
              Más de 17,000 productos en stock. Útiles, arte, tecnología y más. Envíos a domicilio en Quito.
            </p>
            <div className="flex flex-col sm:flex-row gap-3 justify-center md:justify-start">
              <Link href="/productos?cat=Escolar"
                className="bg-white text-green-700 font-bold px-6 py-3 rounded-xl hover:bg-green-50 transition text-sm text-center">
                Ver útiles escolares
              </Link>
              <Link href="/productos"
                className="bg-green-800/50 text-white font-semibold px-6 py-3 rounded-xl hover:bg-green-800 transition text-sm text-center border border-white/20">
                Todo el catálogo →
              </Link>
            </div>
          </div>
          <div className="text-[120px] md:text-[160px] leading-none select-none">🖍️</div>
        </div>
      </div>

      {/* ── TRUST BADGES ── */}
      <div className="bg-white border-b border-gray-100">
        <div className="max-w-5xl mx-auto px-4 py-4 grid grid-cols-3 gap-4">
          {[
            { icon: Truck,  text: 'Envíos a domicilio',  sub: 'En Quito' },
            { icon: Shield, text: 'Productos garantizados', sub: 'Calidad verificada' },
            { icon: Clock,  text: 'Atención rápida',     sub: 'Lun–Sáb 8–18h' },
          ].map(({ icon: Icon, text, sub }) => (
            <div key={text} className="flex items-center gap-2.5 text-center md:text-left justify-center md:justify-start">
              <div className="bg-green-100 p-2 rounded-lg shrink-0">
                <Icon size={16} className="text-green-700" />
              </div>
              <div>
                <div className="text-xs font-semibold text-gray-800">{text}</div>
                <div className="text-[10px] text-gray-400">{sub}</div>
              </div>
            </div>
          ))}
        </div>
      </div>

      <div className="max-w-5xl mx-auto px-4 py-8 space-y-10">

        {/* ── CATEGORÍAS ── */}
        <section>
          <div className="flex items-center justify-between mb-4">
            <h2 className="text-lg font-bold text-gray-900">Categorías</h2>
            <Link href="/productos" className="text-sm text-green-600 font-medium flex items-center gap-1 hover:underline">
              Ver todo <ChevronRight size={14} />
            </Link>
          </div>
          {cats.length === 0 ? (
            <div className="grid grid-cols-3 md:grid-cols-5 gap-3">
              {[...Array(9)].map((_, i) => <div key={i} className="h-24 bg-gray-100 rounded-2xl animate-pulse" />)}
            </div>
          ) : (
            <div className="grid grid-cols-3 md:grid-cols-5 gap-3">
              {cats.map(({ categoria, n }) => {
                const cfg = CAT_CONFIG[categoria] || { emoji: '📦', color: 'text-gray-700', bg: 'bg-gray-50 border-gray-200' }
                return (
                  <Link key={categoria} href={`/productos?cat=${encodeURIComponent(categoria)}`}
                    className={`${cfg.bg} border rounded-2xl p-4 text-center hover:shadow-md active:scale-95 transition group`}>
                    <div className="text-3xl mb-2">{cfg.emoji}</div>
                    <div className={`text-xs font-bold ${cfg.color} leading-tight`}>{categoria}</div>
                    <div className="text-[10px] text-gray-400 mt-0.5">{n} productos</div>
                  </Link>
                )
              })}
            </div>
          )}
        </section>

        {/* ── PRODUCTOS DESTACADOS ── */}
        {destacados.length > 0 && (
          <section>
            <div className="flex items-center justify-between mb-4">
              <h2 className="text-lg font-bold text-gray-900">Productos destacados</h2>
              <Link href="/productos" className="text-sm text-green-600 font-medium flex items-center gap-1 hover:underline">
                Ver todos <ChevronRight size={14} />
              </Link>
            </div>
            <div className="grid grid-cols-2 md:grid-cols-4 gap-4">
              {destacados.map(p => (
                <div key={p.codigo} className="bg-white rounded-2xl border border-gray-100 p-4 shadow-sm hover:shadow-md transition flex flex-col">
                  {/* Imagen placeholder elegante */}
                  <div className="bg-gradient-to-br from-gray-50 to-gray-100 rounded-xl h-32 flex items-center justify-center mb-3 text-4xl">
                    {CAT_CONFIG[p.categoria]?.emoji || '📦'}
                  </div>
                  <div className="flex-1">
                    <div className="text-[10px] font-semibold text-green-600 uppercase tracking-wide mb-0.5">{p.categoria}</div>
                    <div className="text-sm font-semibold text-gray-800 leading-snug line-clamp-2">{p.descripcion}</div>
                    {p.marca && <div className="text-[10px] text-gray-400 mt-0.5">{p.marca}</div>}
                  </div>
                  <div className="flex items-center justify-between mt-2">
                    <div className="text-lg font-extrabold text-gray-900">{fmt(p.precio_publico)}</div>
                    {p.stock < 5 && p.stock > 0 && (
                      <span className="text-[10px] bg-orange-100 text-orange-600 font-bold px-2 py-0.5 rounded-full">Últimas {p.stock}</span>
                    )}
                  </div>
                  <BtnAgregar prod={p} />
                </div>
              ))}
            </div>
          </section>
        )}

        {/* ── BANNER ESCOLAR ── */}
        <section className="bg-gradient-to-r from-blue-600 to-indigo-600 rounded-2xl p-6 md:p-8 text-white flex flex-col md:flex-row items-center gap-6">
          <div className="text-6xl">🎒</div>
          <div className="flex-1 text-center md:text-left">
            <h3 className="text-xl font-extrabold mb-1">Lista escolar completa</h3>
            <p className="text-blue-100 text-sm">Cuadernos, lápices, colores, mochilas y más. Todo en un solo lugar.</p>
          </div>
          <Link href="/productos?cat=Escolar"
            className="bg-white text-blue-700 font-bold px-6 py-3 rounded-xl hover:bg-blue-50 transition text-sm shrink-0">
            Ver útiles →
          </Link>
        </section>

      </div>

      {/* WhatsApp flotante */}
      <a href="https://wa.me/593999999999?text=Hola%2C%20quiero%20hacer%20un%20pedido"
        target="_blank" rel="noopener noreferrer"
        className="fixed bottom-24 md:bottom-8 right-4 z-40 bg-[#25D366] hover:bg-[#20c05a] text-white rounded-full p-3.5 shadow-lg hover:shadow-xl transition">
        <svg viewBox="0 0 24 24" className="w-6 h-6 fill-white">
          <path d="M17.472 14.382c-.297-.149-1.758-.867-2.03-.967-.273-.099-.471-.148-.67.15-.197.297-.767.966-.94 1.164-.173.199-.347.223-.644.075-.297-.15-1.255-.463-2.39-1.475-.883-.788-1.48-1.761-1.653-2.059-.173-.297-.018-.458.13-.606.134-.133.298-.347.446-.52.149-.174.198-.298.298-.497.099-.198.05-.371-.025-.52-.075-.149-.669-1.612-.916-2.207-.242-.579-.487-.5-.669-.51-.173-.008-.371-.01-.57-.01-.198 0-.52.074-.792.372-.272.297-1.04 1.016-1.04 2.479 0 1.462 1.065 2.875 1.213 3.074.149.198 2.096 3.2 5.077 4.487.709.306 1.262.489 1.694.625.712.227 1.36.195 1.871.118.571-.085 1.758-.719 2.006-1.413.248-.694.248-1.289.173-1.413-.074-.124-.272-.198-.57-.347m-5.421 7.403h-.004a9.87 9.87 0 01-5.031-1.378l-.361-.214-3.741.982.998-3.648-.235-.374a9.86 9.86 0 01-1.51-5.26c.001-5.45 4.436-9.884 9.888-9.884 2.64 0 5.122 1.03 6.988 2.898a9.825 9.825 0 012.893 6.994c-.003 5.45-4.437 9.884-9.885 9.884m8.413-18.297A11.815 11.815 0 0012.05 0C5.495 0 .16 5.335.157 11.892c0 2.096.547 4.142 1.588 5.945L.057 24l6.305-1.654a11.882 11.882 0 005.683 1.448h.005c6.554 0 11.89-5.335 11.893-11.893a11.821 11.821 0 00-3.48-8.413z"/>
        </svg>
      </a>
    </div>
  )
}

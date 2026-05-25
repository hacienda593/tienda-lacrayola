'use client'
import { useEffect, useState } from 'react'
import Link from 'next/link'
import { supabase } from '@/lib/supabase'
import { ShoppingBag, ChevronRight } from 'lucide-react'

const CAT_EMOJI: Record<string, string> = {
  'Escolar':'📚','Arte':'🎨','Oficina':'🖊️','Tecnologia':'💻','Juguetes':'🧸',
  'Papeleria':'📄','Pintura':'🖌️','Manualidades':'✂️','Libros':'📖',
}

export default function Home() {
  const [cats, setCats] = useState<{ categoria: string; n: number }[]>([])

  useEffect(() => {
    supabase.from('catalogo_productos').select('categoria').gt('stock', 0)
      .then(({ data }) => {
        if (!data) return
        const map = new Map<string, number>()
        data.forEach((d: { categoria: string }) => {
          if (d.categoria) map.set(d.categoria, (map.get(d.categoria) || 0) + 1)
        })
        setCats(Array.from(map.entries()).sort((a, b) => b[1] - a[1]).slice(0, 12).map(([categoria, n]) => ({ categoria, n })))
      })
  }, [])

  return (
    <div className="max-w-lg mx-auto px-4 py-6 space-y-8">

      {/* Hero */}
      <div className="bg-gradient-to-br from-green-900 to-green-950 border border-green-800 rounded-2xl p-6 text-center">
        <div className="text-5xl mb-2">🖍️</div>
        <h1 className="text-2xl font-bold text-white">La Crayola</h1>
        <p className="text-green-300 text-sm mt-1">Útiles escolares · Arte · Papelería</p>
        <Link href="/productos"
          className="mt-5 inline-flex items-center gap-2 bg-green-500 hover:bg-green-400 text-white text-sm font-bold px-6 py-3 rounded-xl transition">
          <ShoppingBag size={16} /> Ver catálogo
        </Link>
      </div>

      {/* Categorías */}
      <div>
        <div className="flex items-center justify-between mb-3">
          <h2 className="text-sm font-bold text-gray-200">Categorías</h2>
          <Link href="/productos" className="text-xs text-green-400 flex items-center gap-0.5">
            Ver todo <ChevronRight size={12} />
          </Link>
        </div>
        {cats.length === 0 ? (
          <div className="grid grid-cols-3 gap-2">
            {[...Array(6)].map((_, i) => (
              <div key={i} className="bg-gray-900 border border-gray-800 rounded-xl p-3 h-20 animate-pulse" />
            ))}
          </div>
        ) : (
          <div className="grid grid-cols-3 gap-2">
            {cats.map(({ categoria, n }) => (
              <Link key={categoria} href={`/productos?cat=${encodeURIComponent(categoria)}`}
                className="bg-gray-900 border border-gray-800 rounded-xl p-3 text-center hover:border-green-700 active:scale-95 transition">
                <div className="text-2xl mb-1">{CAT_EMOJI[categoria] || '📦'}</div>
                <div className="text-xs font-medium text-white leading-tight">{categoria}</div>
                <div className="text-[10px] text-gray-500 mt-0.5">{n} items</div>
              </Link>
            ))}
          </div>
        )}
      </div>

    </div>
  )
}

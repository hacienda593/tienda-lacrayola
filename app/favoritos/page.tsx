'use client'
import { useEffect, useState } from 'react'
import { Heart, ShoppingCart, Share2, Trash2, Package } from 'lucide-react'
import Link from 'next/link'
import { getFavoritos, toggleFavorito, ItemFavorito, serializarFavoritos } from '@/lib/favoritos'
import { agregarItem } from '@/lib/carrito'

function fmt(n: number) { return '$' + n.toFixed(2) }

export default function FavoritosPage() {
  const [lista, setLista] = useState<ItemFavorito[]>([])
  const [copiado, setCopiado] = useState(false)
  const [agregados, setAgregados] = useState<Set<string>>(new Set())

  useEffect(() => {
    setLista(getFavoritos())
    const sync = () => setLista(getFavoritos())
    window.addEventListener('favoritos-update', sync)
    return () => window.removeEventListener('favoritos-update', sync)
  }, [])

  function quitar(prod: ItemFavorito) {
    toggleFavorito({ codigo: prod.codigo, descripcion: prod.descripcion, categoria: prod.categoria, precio_publico: prod.precio_unitario })
  }

  function agregar(prod: ItemFavorito) {
    if (typeof navigator !== 'undefined' && navigator.vibrate) {
      navigator.vibrate(15)
    }
    agregarItem({ codigo: prod.codigo, descripcion: prod.descripcion, categoria: prod.categoria, precio_publico: prod.precio_unitario })
    setAgregados(s => new Set(s).add(prod.codigo))
    setTimeout(() => setAgregados(s => { const n = new Set(s); n.delete(prod.codigo); return n }), 1500)
  }

  function agregarTodos() {
    if (typeof navigator !== 'undefined' && navigator.vibrate) {
      navigator.vibrate(25)
    }
    lista.forEach(p => agregarItem({ codigo: p.codigo, descripcion: p.descripcion, categoria: p.categoria, precio_publico: p.precio_unitario }))
    const todos = new Set(lista.map(p => p.codigo))
    setAgregados(todos)
    setTimeout(() => setAgregados(new Set()), 1500)
  }

  function compartir() {
    const ids  = serializarFavoritos()
    const url  = `${window.location.origin}/favoritos?lista=${encodeURIComponent(ids)}`
    navigator.clipboard.writeText(url).then(() => {
      setCopiado(true)
      setTimeout(() => setCopiado(false), 2000)
    })
  }

  if (lista.length === 0) {
    return (
      <div className="max-w-lg mx-auto px-4 py-16 flex flex-col items-center gap-4 text-center">
        <Heart size={48} className="text-gray-200" />
        <h2 className="text-lg font-bold text-gray-700">Sin favoritos aún</h2>
        <p className="text-sm text-gray-400">Toca el ❤️ en cualquier producto para guardarlo aquí.</p>
        <Link href="/productos"
          className="mt-2 bg-green-600 hover:bg-green-700 text-white font-semibold px-6 py-2.5 rounded-xl text-sm transition">
          Explorar productos
        </Link>
      </div>
    )
  }

  const totalLista = lista.reduce((s, p) => s + p.precio_unitario, 0)

  return (
    <div className="max-w-lg mx-auto px-4 py-5 space-y-4">
      {/* Encabezado */}
      <div className="flex items-center justify-between">
        <div>
          <h1 className="text-lg font-bold text-gray-800">Mis favoritos</h1>
          <p className="text-xs text-gray-400">{lista.length} producto{lista.length > 1 ? 's' : ''}</p>
        </div>
        <button
          onClick={compartir}
          className="flex items-center gap-1.5 border border-gray-200 hover:bg-gray-50 text-gray-600 text-xs font-medium px-3 py-2 rounded-xl transition"
        >
          <Share2 size={13} />
          {copiado ? '¡Copiado!' : 'Compartir lista'}
        </button>
      </div>

      {/* Lista */}
      <div className="space-y-2">
        {lista.map(prod => (
          <div key={prod.codigo} className="bg-white border border-gray-100 rounded-2xl p-3.5 shadow-sm flex items-center gap-3">
            {/* Icono categoría */}
            <div className="w-10 h-10 bg-green-50 rounded-xl flex items-center justify-center text-xl shrink-0">
              {emojiCategoria(prod.categoria)}
            </div>

            {/* Info */}
            <div className="flex-1 min-w-0">
              <div className="text-sm font-medium text-gray-800 truncate">{prod.descripcion}</div>
              <div className="text-xs text-gray-400">{prod.categoria}</div>
              <div className="text-sm font-bold text-green-700 mt-0.5">{fmt(prod.precio_unitario)}</div>
            </div>

            {/* Acciones */}
            <div className="flex flex-col gap-1.5 shrink-0">
              <button
                onClick={() => agregar(prod)}
                className={`flex items-center gap-1 text-xs font-semibold px-2.5 py-1.5 rounded-lg active:scale-[0.96] transition-transform duration-75 transition ${
                  agregados.has(prod.codigo)
                    ? 'bg-green-100 text-green-700'
                    : 'bg-green-600 hover:bg-green-700 text-white'
                }`}
              >
                <ShoppingCart size={12} />
                {agregados.has(prod.codigo) ? '✓' : 'Agregar'}
              </button>
              <button
                onClick={() => quitar(prod)}
                className="flex items-center justify-center text-gray-300 hover:text-red-400 transition p-1"
              >
                <Trash2 size={14} />
              </button>
            </div>
          </div>
        ))}
      </div>

      {/* Footer con total + agregar todos */}
      <div className="bg-white border border-gray-100 rounded-2xl p-4 shadow-sm flex items-center justify-between">
        <div>
          <div className="text-xs text-gray-400">Total estimado</div>
          <div className="font-bold text-green-700">{fmt(totalLista)}</div>
        </div>
        <button
          onClick={agregarTodos}
          className="flex items-center gap-2 bg-green-600 hover:bg-green-700 text-white font-semibold px-4 py-2.5 rounded-xl text-sm active:scale-[0.96] transition-transform duration-75 transition"
        >
          <ShoppingCart size={15} />
          Agregar todos al carrito
        </button>
      </div>
    </div>
  )
}

function emojiCategoria(cat: string): string {
  const map: Record<string, string> = {
    Escolar: '📚', Arte: '🎨', Oficina: '🖊️',
    Tecnologia: '💻', Juguetes: '🧸', Manualidades: '✂️',
    Libros: '📖', Pintura: '🖌️',
  }
  return map[cat] ?? '🖍️'
}

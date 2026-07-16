'use client'
import { useEffect, useState } from 'react'
import Link from 'next/link'
import { getCarrito, cambiarCantidad, vaciarCarrito, totalCarrito, calcularEnvioConsolidado, obtenerTiendasUnicas } from '@/lib/carrito'
import { ItemCarrito } from '@/lib/types'
import { Minus, Plus, Trash2, ShoppingBag, ArrowRight } from 'lucide-react'
import RecargoEnvioBadge from '@/components/RecargoEnvioBadge'

function fmt(n: number) { return '$' + n.toFixed(2) }

export default function CarritoPage() {
  const [items, setItems] = useState<ItemCarrito[]>([])

  useEffect(() => {
    const update = () => setItems(getCarrito())
    update()
    window.addEventListener('carrito-update', update)
    return () => window.removeEventListener('carrito-update', update)
  }, [])

  const total = totalCarrito(items)
  const nItems = items.reduce((s, i) => s + i.cantidad, 0)
  const nTiendas = obtenerTiendasUnicas(items).length || (items.length > 0 ? 1 : 0)
  const costoEnvio = calcularEnvioConsolidado(items)
  const granTotal = total + costoEnvio

  if (items.length === 0) return (
    <div className="max-w-lg mx-auto px-4 py-16 text-center space-y-4">
      <ShoppingBag size={48} className="text-gray-700 mx-auto" />
      <p className="text-gray-500">Tu carrito está vacío</p>
      <Link href="/productos" className="inline-block bg-green-600 hover:bg-green-500 text-white text-sm font-semibold px-6 py-3 rounded-xl transition">
        Ver productos
      </Link>
    </div>
  )

  // Agrupar items por tienda física
  const itemsPorTienda: Record<string, ItemCarrito[]> = {}
  items.forEach(item => {
    const key = item.tienda_nombre || 'Inventario Crayola'
    if (!itemsPorTienda[key]) itemsPorTienda[key] = []
    itemsPorTienda[key].push(item)
  })

  return (
    <div className="max-w-lg mx-auto px-4 py-4 space-y-4">
      <div className="flex items-center justify-between">
        <h1 className="text-base font-bold">Carrito <span className="text-gray-500 font-normal">({nItems} items)</span></h1>
        <button onClick={() => { vaciarCarrito(); setItems([]) }}
          className="text-xs text-gray-500 hover:text-red-400 flex items-center gap-1 transition">
          <Trash2 size={12} /> Vaciar
        </button>
      </div>

      {/* Items agrupados por tienda */}
      <div className="space-y-4">
        {Object.entries(itemsPorTienda).map(([tiendaNombre, prods]) => (
          <div key={tiendaNombre} className="space-y-2.5">
            <div className="text-xs font-black text-gray-400 uppercase tracking-wider pl-1.5 flex items-center gap-1.5">
              <span>🏪</span> {tiendaNombre}
            </div>
            <div className="space-y-2">
              {prods.map(item => (
                <div key={item.codigo} className="bg-white border border-gray-100 rounded-2xl p-3 flex items-center gap-3 shadow-xs">
                  <div className="flex-1 min-w-0">
                    <div className="text-sm text-gray-900 font-extrabold leading-snug line-clamp-2">{item.descripcion}</div>
                    <div className="text-xs font-bold text-green-700 uppercase tracking-wide mt-0.5">{item.categoria}</div>
                    <div className="text-sm font-black text-gray-900 mt-1">{fmt(item.precio_unitario)}</div>
                  </div>
                  <div className="flex flex-col items-end gap-1.5 shrink-0">
                    <div className="flex items-center gap-2 bg-gray-50 border border-gray-100 rounded-lg p-0.5">
                      <button onClick={() => cambiarCantidad(item.codigo, item.cantidad - 1)}
                        className="w-6 h-6 rounded bg-white border border-gray-100 flex items-center justify-center hover:bg-gray-50 active:scale-90 transition">
                        <Minus size={10} className="text-gray-500" />
                      </button>
                      <span className="text-xs font-extrabold text-gray-800 w-4 text-center">{item.cantidad}</span>
                      <button onClick={() => cambiarCantidad(item.codigo, item.cantidad + 1)}
                        className="w-6 h-6 rounded bg-white border border-gray-100 flex items-center justify-center hover:bg-gray-50 active:scale-90 transition">
                        <Plus size={10} className="text-gray-500" />
                      </button>
                    </div>
                    <div className="text-xs font-extrabold text-gray-400">{fmt(item.precio_unitario * item.cantidad)}</div>
                  </div>
                </div>
              ))}
            </div>
          </div>
        ))}
      </div>

      {/* Resumen */}
      <div className="bg-white border border-gray-100 rounded-2xl p-4.5 space-y-4 shadow-xs">
        <div className="flex justify-between text-sm font-bold text-gray-500 px-1">
          <span>Subtotal ({nItems} productos)</span>
          <span className="font-extrabold text-gray-800">{fmt(total)}</span>
        </div>
        
        {/* Recargo por parada adicional */}
        <RecargoEnvioBadge nTiendas={nTiendas} costoTotalEnvio={costoEnvio} />

        <div className="flex justify-between text-base font-black text-gray-900 border-t border-gray-100 pt-3 px-1">
          <span>Total consolidado</span>
          <span className="text-green-700 text-lg font-black">{fmt(granTotal)}</span>
        </div>
      </div>

      <Link href="/checkout"
        className="w-full flex items-center justify-center gap-2 bg-green-600 hover:bg-green-700 text-white font-bold py-4 rounded-xl transition text-base active:scale-[0.96] shadow-lg shadow-green-600/10 cursor-pointer">
        Confirmar pedido <ArrowRight size={16} />
      </Link>

      <Link href="/productos" className="block text-center text-xs font-bold text-gray-400 hover:text-green-700 transition py-1 cursor-pointer">
        ← Seguir comprando
      </Link>
    </div>
  )
}

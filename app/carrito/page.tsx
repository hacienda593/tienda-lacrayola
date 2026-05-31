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
          <div key={tiendaNombre} className="space-y-2">
            <div className="text-[10px] font-bold text-gray-400 uppercase tracking-wider pl-1 flex items-center gap-1.5">
              <span>🏪</span> {tiendaNombre}
            </div>
            <div className="space-y-2">
              {prods.map(item => (
                <div key={item.codigo} className="bg-gray-950 border border-gray-900 rounded-xl p-3 flex items-center gap-3">
                  <div className="flex-1 min-w-0">
                    <div className="text-sm text-white font-medium leading-tight line-clamp-2">{item.descripcion}</div>
                    <div className="text-xs text-gray-500 mt-0.5">{item.categoria}</div>
                    <div className="text-sm font-bold text-green-400 mt-1">{fmt(item.precio_unitario)}</div>
                  </div>
                  <div className="flex flex-col items-end gap-2 shrink-0">
                    <div className="flex items-center gap-2">
                      <button onClick={() => cambiarCantidad(item.codigo, item.cantidad - 1)}
                        className="w-7 h-7 rounded-lg bg-gray-800 hover:bg-gray-700 flex items-center justify-center transition">
                        <Minus size={12} className="text-gray-300" />
                      </button>
                      <span className="text-sm font-bold text-white w-5 text-center">{item.cantidad}</span>
                      <button onClick={() => cambiarCantidad(item.codigo, item.cantidad + 1)}
                        className="w-7 h-7 rounded-lg bg-gray-800 hover:bg-gray-700 flex items-center justify-center transition">
                        <Plus size={12} className="text-gray-300" />
                      </button>
                    </div>
                    <div className="text-xs text-gray-400">{fmt(item.precio_unitario * item.cantidad)}</div>
                  </div>
                </div>
              ))}
            </div>
          </div>
        ))}
      </div>

      {/* Resumen */}
      <div className="bg-gray-900 border border-gray-800 rounded-xl p-4 space-y-3.5">
        <div className="flex justify-between text-sm text-gray-400">
          <span>Subtotal ({nItems} productos)</span>
          <span>{fmt(total)}</span>
        </div>
        
        {/* Recargo por parada adicional */}
        <RecargoEnvioBadge nTiendas={nTiendas} costoTotalEnvio={costoEnvio} />

        <div className="flex justify-between text-base font-bold text-white border-t border-gray-800 pt-2.5">
          <span>Total consolidado</span>
          <span className="text-green-400">{fmt(granTotal)}</span>
        </div>
      </div>

      <Link href="/checkout"
        className="w-full flex items-center justify-center gap-2 bg-green-600 hover:bg-green-500 text-white font-bold py-3.5 rounded-xl transition text-sm">
        Confirmar pedido <ArrowRight size={16} />
      </Link>

      <Link href="/productos" className="block text-center text-xs text-gray-500 hover:text-gray-300 transition py-1">
        ← Seguir comprando
      </Link>
    </div>
  )
}

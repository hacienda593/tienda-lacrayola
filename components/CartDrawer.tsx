'use client'
import { useEffect, useState } from 'react'
import Link from 'next/link'
import { X, ShoppingBag, Minus, Plus, Trash2, ArrowRight } from 'lucide-react'
import { getCarrito, cambiarCantidad, vaciarCarrito, totalCarrito, calcularEnvioConsolidado, obtenerTiendasUnicas } from '@/lib/carrito'
import { ItemCarrito } from '@/lib/types'
import RecargoEnvioBadge from './RecargoEnvioBadge'

interface CartDrawerProps {
  isOpen: boolean
  onClose: () => void
}

function fmt(n: number) { return '$' + n.toFixed(2) }

export default function CartDrawer({ isOpen, onClose }: CartDrawerProps) {
  const [items, setItems] = useState<ItemCarrito[]>([])

  useEffect(() => {
    const update = () => setItems(getCarrito())
    update()
    window.addEventListener('carrito-update', update)
    return () => window.removeEventListener('carrito-update', update)
  }, [])

  // Cerrar al presionar la tecla Escape
  useEffect(() => {
    const handleKeyDown = (e: KeyboardEvent) => {
      if (e.key === 'Escape') onClose()
    }
    if (isOpen) window.addEventListener('keydown', handleKeyDown)
    return () => window.removeEventListener('keydown', handleKeyDown)
  }, [isOpen, onClose])

  const total = totalCarrito(items)
  const nItems = items.reduce((s, i) => s + i.cantidad, 0)
  const nTiendas = obtenerTiendasUnicas(items).length || (items.length > 0 ? 1 : 0)
  const costoEnvio = calcularEnvioConsolidado(items)
  const granTotal = total + costoEnvio

  // Agrupar items por tienda física
  const itemsPorTienda: Record<string, ItemCarrito[]> = {}
  items.forEach(item => {
    const key = item.tienda_nombre || 'Inventario Crayola'
    if (!itemsPorTienda[key]) itemsPorTienda[key] = []
    itemsPorTienda[key].push(item)
  })

  function handleQuantityChange(codigo: string, currentQty: number, delta: number) {
    if (typeof navigator !== 'undefined' && navigator.vibrate) {
      navigator.vibrate(10)
    }
    cambiarCantidad(codigo, currentQty + delta)
  }

  return (
    <>
      {/* Backdrop de fondo */}
      <div
        onClick={onClose}
        className={`fixed inset-0 bg-black/60 backdrop-blur-sm z-[100] transition-opacity duration-300 ${
          isOpen ? 'opacity-100 pointer-events-auto' : 'opacity-0 pointer-events-none'
        }`}
      />

      {/* Panel deslizable (Desktop Sidebar / Mobile Bottom Sheet) */}
      <div
        className={`fixed z-[101] bg-white border-gray-100 shadow-2xl flex flex-col transition-all duration-300 ease-out
          /* Mobile Bottom Sheet Layout */
          bottom-0 left-0 w-full rounded-t-3xl max-h-[88vh] h-full
          ${isOpen ? 'translate-y-0 opacity-100' : 'translate-y-full opacity-0 pointer-events-none'}
          /* Desktop Sidebar Layout */
          md:top-0 md:right-0 md:left-auto md:bottom-auto md:w-full md:max-w-md md:h-full md:rounded-none md:max-h-screen
          ${isOpen ? 'md:translate-x-0 md:translate-y-0 md:opacity-100' : 'md:translate-x-full md:translate-y-0 md:opacity-0'}
        `}
      >
        {/* Cabecera del panel */}
        <div className="flex items-center justify-between px-5 py-4 border-b border-gray-100 shrink-0">
          <div className="flex items-center gap-2">
            <ShoppingBag size={18} className="text-green-600" />
            <h2 className="text-base font-extrabold text-gray-800">
              Mi Pedido <span className="text-xs text-gray-400 font-bold ml-1">({nItems} items)</span>
            </h2>
          </div>
          <div className="flex items-center gap-3">
            {items.length > 0 && (
              <button
                onClick={() => {
                  if (typeof navigator !== 'undefined' && navigator.vibrate) navigator.vibrate(20)
                  vaciarCarrito()
                }}
                className="text-xs font-bold text-gray-400 hover:text-red-500 flex items-center gap-1 transition"
              >
                <Trash2 size={12} /> Vaciar
              </button>
            )}
            <button
              onClick={onClose}
              className="w-8 h-8 rounded-full bg-gray-50 border border-gray-100 flex items-center justify-center text-gray-400 hover:text-gray-600 hover:bg-gray-100 transition"
              aria-label="Cerrar carrito"
            >
              <X size={15} />
            </button>
          </div>
        </div>

        {/* Cuerpo del carrito con scroll */}
        <div className="flex-1 overflow-y-auto p-5 space-y-5 bg-gray-50/50">
          {items.length === 0 ? (
            <div className="flex flex-col items-center justify-center h-full text-center py-20 space-y-4">
              <ShoppingBag size={48} className="text-gray-300" />
              <p className="text-sm font-bold text-gray-400">Tu carrito está vacío</p>
              <p className="text-xs text-gray-400 max-w-xs">Agrega productos desde las tiendas o el catálogo para verlos listados aquí.</p>
              <button
                onClick={onClose}
                className="bg-green-600 hover:bg-green-700 text-white text-xs font-bold px-6 py-2.5 rounded-xl transition active:scale-[0.96]"
              >
                Explorar productos
              </button>
            </div>
          ) : (
            <div className="space-y-5">
              {Object.entries(itemsPorTienda).map(([tiendaNombre, prods]) => (
                <div key={tiendaNombre} className="space-y-2.5">
                  <div className="text-[10px] font-extrabold text-gray-400 uppercase tracking-wider pl-1.5 flex items-center gap-1.5">
                    <span>🏪</span> {tiendaNombre}
                  </div>
                  <div className="space-y-2">
                    {prods.map(item => (
                      <div key={item.codigo} className="bg-white border border-gray-100 rounded-2xl p-3 flex flex-items-center gap-3 shadow-xs hover:shadow-sm transition-shadow">
                        <div className="flex-1 min-w-0">
                          <div className="text-xs text-gray-800 font-extrabold leading-snug line-clamp-2">{item.descripcion}</div>
                          <div className="text-[9px] font-semibold text-green-600 uppercase tracking-wide mt-0.5">{item.categoria}</div>
                          <div className="text-xs font-black text-gray-900 mt-1">{fmt(item.precio_unitario)}</div>
                        </div>
                        <div className="flex flex-col items-end gap-1.5 shrink-0">
                          <div className="flex items-center gap-2 bg-gray-50 border border-gray-100 rounded-lg p-0.5">
                            <button
                              onClick={() => handleQuantityChange(item.codigo, item.cantidad, -1)}
                              className="w-6 h-6 rounded bg-white border border-gray-100 flex items-center justify-center hover:bg-gray-50 active:scale-90 transition"
                            >
                              <Minus size={10} className="text-gray-500" />
                            </button>
                            <span className="text-xs font-extrabold text-gray-800 w-4 text-center">{item.cantidad}</span>
                            <button
                              onClick={() => handleQuantityChange(item.codigo, item.cantidad, 1)}
                              className="w-6 h-6 rounded bg-white border border-gray-100 flex items-center justify-center hover:bg-gray-50 active:scale-90 transition"
                            >
                              <Plus size={10} className="text-gray-500" />
                            </button>
                          </div>
                          <div className="text-[10px] font-bold text-gray-400">{fmt(item.precio_unitario * item.cantidad)}</div>
                        </div>
                      </div>
                    ))}
                  </div>
                </div>
              ))}
            </div>
          )}
        </div>

        {/* Footer (Resumen + Checkout) */}
        {items.length > 0 && (
          <div className="p-5 border-t border-gray-100 bg-white shrink-0 space-y-4">
            <div className="space-y-2.5">
              <div className="flex justify-between text-xs font-bold text-gray-400 px-1">
                <span>Subtotal ({nItems} productos)</span>
                <span>{fmt(total)}</span>
              </div>
              
              {/* Recargo por parada adicional */}
              <RecargoEnvioBadge nTiendas={nTiendas} costoTotalEnvio={costoEnvio} />

              <div className="flex justify-between text-sm font-extrabold text-gray-900 border-t border-gray-100 pt-3 px-1">
                <span>Total consolidado</span>
                <span className="text-green-700 text-base">{fmt(granTotal)}</span>
              </div>
            </div>

            <div className="flex flex-col gap-2 pt-1">
              <Link
                href="/checkout"
                onClick={onClose}
                className="w-full flex items-center justify-center gap-2 bg-green-600 hover:bg-green-700 text-white font-bold py-3.5 rounded-xl transition text-sm active:scale-[0.96] shadow-lg shadow-green-600/10"
              >
                Confirmar pedido <ArrowRight size={16} />
              </Link>
              <button
                onClick={onClose}
                className="w-full py-2.5 text-center text-xs font-semibold text-gray-400 hover:text-green-700 transition"
              >
                ← Seguir comprando
              </button>
            </div>
          </div>
        )}
      </div>
    </>
  )
}

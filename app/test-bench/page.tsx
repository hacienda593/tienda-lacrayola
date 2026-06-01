'use client'

import { useEffect, useState } from 'react'
import { getCarrito, agregarItem, cambiarCantidad, vaciarCarrito, totalCarrito, obtenerTiendasUnicas, calcularEnvioConsolidado } from '@/lib/carrito'
import { ItemCarrito } from '@/lib/types'
import RecargoEnvioBadge from '@/components/RecargoEnvioBadge'
import { Trash2, Plus, Minus, ShoppingBag, Eye, Copy, Check, Info } from 'lucide-react'

function fmt(n: number) { return '$' + (n ?? 0).toFixed(2) }

const PRODUCTOS_MOCK = [
  { codigo: 'TUTI-001', descripcion: 'Leche Semidescremada 1L', categoria: 'Lácteos', precio_publico: 1.10, tienda_id: 'tuti-1', tienda_nombre: 'Supermercados Tuti' },
  { codigo: 'TUTI-002', descripcion: 'Pan de Hamburguesa ×6', categoria: 'Panadería', precio_publico: 1.50, tienda_id: 'tuti-1', tienda_nombre: 'Supermercados Tuti' },
  { codigo: 'TIA-001', descripcion: 'Detergente Deja Lavanda 1kg', categoria: 'Limpieza', precio_publico: 3.50, tienda_id: 'tia-2', tienda_nombre: 'Almacenes Tía' },
  { codigo: 'TIA-002', descripcion: 'Aceite de Girasol La Favorita 1L', categoria: 'Abarrotes', precio_publico: 2.90, tienda_id: 'tia-2', tienda_nombre: 'Almacenes Tía' },
  { codigo: 'SANA-001', descripcion: 'Paracetamol 500mg ×10', categoria: 'Farmacia', precio_publico: 0.85, tienda_id: 'sanasana-3', tienda_nombre: 'Farmacias SanaSana' },
  { codigo: 'SANA-002', descripcion: 'Alcohol Antiséptico 500ml', categoria: 'Farmacia', precio_publico: 1.20, tienda_id: 'sanasana-3', tienda_nombre: 'Farmacias SanaSana' },
  { codigo: 'CRAY-001', descripcion: 'Cuaderno Espiral Universitario A4', categoria: 'Útiles Escolares', precio_publico: 2.20, tienda_id: null, tienda_nombre: null },
  { codigo: 'CRAY-002', descripcion: 'Caja de Colores Faber-Castell ×12', categoria: 'Útiles Escolares', precio_publico: 3.50, tienda_id: null, tienda_nombre: null },
]

export default function StorefrontTestBench() {
  const [items, setItems] = useState<ItemCarrito[]>([])
  const [copied, setCopied] = useState(false)

  function refrescar() {
    setItems(getCarrito())
  }

  useEffect(() => {
    refrescar()
    window.addEventListener('carrito-update', refrescar)
    return () => window.removeEventListener('carrito-update', refrescar)
  }, [])

  function handleAdd(prod: typeof PRODUCTOS_MOCK[0]) {
    agregarItem(prod, 1)
  }

  function handleQuantity(codigo: string, cant: number) {
    cambiarCantidad(codigo, cant)
  }

  function handleClear() {
    vaciarCarrito()
  }

  const subtotal = totalCarrito(items)
  const tiendas = obtenerTiendasUnicas(items)
  const nTiendas = tiendas.length || (items.length > 0 ? 1 : 0)
  const costoEnvio = calcularEnvioConsolidado(items)
  const granTotal = subtotal + costoEnvio

  // Formatear mensaje para previsualización de WhatsApp
  const agrupados: Record<string, ItemCarrito[]> = {}
  items.forEach(i => {
    const key = i.tienda_nombre || 'Inventario Crayola'
    if (!agrupados[key]) agrupados[key] = []
    agrupados[key].push(i)
  })

  const bloques = Object.entries(agrupados).map(([tienda, prods]) => {
    const listado = prods.map(p => `  • ${p.descripcion} ×${p.cantidad} = ${fmt(p.precio_unitario * p.cantidad)}`).join('\n')
    return `🏪 *${tienda}:*\n${listado}`
  }).join('\n\n')

  const msg = [
    `🛒 *Nuevo pedido #MOCK*`,
    `👤 *Cliente:* Tester La Crayola`,
    ``,
    `*Detalle de compra:*`,
    bloques || '  (Ningún artículo en el carrito)',
    ``,
    `*Resumen:*`,
    `  • Subtotal: ${fmt(subtotal)}`,
    `  • Envío Consolidado: ${fmt(costoEnvio)}`,
    `  • *Total a pagar: ${fmt(granTotal)}*`,
    `📍 *Entrega:* Calle Rocafuerte, San Miguel de los Bancos`,
  ].join('\n')

  function copiarMensaje() {
    navigator.clipboard.writeText(msg)
    setCopied(true)
    setTimeout(() => setCopied(false), 2000)
  }

  return (
    <div className="min-h-screen bg-[#0c0f12] text-white p-4 md:p-8">
      <div className="max-w-5xl mx-auto space-y-6">
        
        {/* Cabecera */}
        <div className="flex items-center justify-between border-b border-gray-800 pb-4">
          <div>
            <h1 className="text-2xl font-black text-green-400">LABORATORIO DE PRUEBAS</h1>
            <p className="text-gray-400 text-xs mt-1">Ecosistema La Crayola - Simulación de Compra y Envío Consolidado</p>
          </div>
          <a href="/" className="bg-gray-800 hover:bg-gray-700 text-xs px-3.5 py-1.5 rounded-lg transition font-semibold">
            Volver a la Tienda
          </a>
        </div>

        {/* Alerta de Contexto */}
        <div className="bg-yellow-500/10 border border-yellow-500/20 text-yellow-200 text-[11px] p-3 rounded-xl flex items-start gap-2">
          <Info size={14} className="shrink-0 mt-0.5" />
          <div>
            <strong>Modo Sandbox Activo:</strong> Esta pantalla interactiva te permite simular agregar productos de diferentes tiendas físicas (Tuti, Tía, SanaSana e Inventario propio de Crayola) a tu carrito actual de forma instantánea para verificar cómo se agrupan los subtotales, se calcula el envío consolidado y se formatea el pedido final para el despachador.
          </div>
        </div>

        <div className="grid grid-cols-1 lg:grid-cols-3 gap-6">
          
          {/* Panel Izquierdo: Catálogo de Simulación */}
          <div className="lg:col-span-2 space-y-4">
            <div className="bg-gray-900 border border-gray-800 rounded-2xl p-4 space-y-4">
              <h2 className="text-sm font-bold text-gray-200 uppercase tracking-wider">1. Agregar Productos de Prueba</h2>
              
              <div className="grid grid-cols-1 md:grid-cols-2 gap-3">
                {PRODUCTOS_MOCK.map(p => (
                  <div key={p.codigo} className="bg-gray-800/40 hover:bg-gray-800/80 border border-gray-800 rounded-xl p-3.5 flex flex-col justify-between transition group">
                    <div className="space-y-1">
                      <div className="flex items-center justify-between">
                        <span className={`text-[9px] font-bold px-2 py-0.5 rounded-full ${
                          p.tienda_id === 'tuti-1' ? 'bg-orange-500/10 text-orange-400' :
                          p.tienda_id === 'tia-2' ? 'bg-red-500/10 text-red-400' :
                          p.tienda_id === 'sanasana-3' ? 'bg-teal-500/10 text-teal-400' :
                          'bg-green-500/10 text-green-400'
                        }`}>
                          {p.tienda_nombre || 'Inventario Crayola'}
                        </span>
                        <span className="text-[10px] text-gray-500 font-mono">{p.codigo}</span>
                      </div>
                      <h3 className="font-bold text-xs text-white pt-1">{p.descripcion}</h3>
                    </div>
                    <div className="flex items-center justify-between pt-3 mt-2 border-t border-gray-800/40">
                      <span className="text-xs font-black text-green-400">{fmt(p.precio_publico)}</span>
                      <button
                        onClick={() => handleAdd(p)}
                        className="bg-green-600 hover:bg-green-500 active:scale-95 text-white font-bold px-2.5 py-1 rounded-lg transition text-[10px] flex items-center gap-1">
                        <Plus size={11} /> Agregar
                      </button>
                    </div>
                  </div>
                ))}
              </div>
            </div>

            {/* Carrito de Compras Actual */}
            <div className="bg-gray-900 border border-gray-800 rounded-2xl p-4 space-y-4">
              <div className="flex items-center justify-between">
                <h2 className="text-sm font-bold text-gray-200 uppercase tracking-wider flex items-center gap-1.5">
                  <ShoppingBag size={15} /> 2. Carrito de Compras ({items.length} ítems)
                </h2>
                {items.length > 0 && (
                  <button 
                    onClick={handleClear}
                    className="text-red-400 hover:text-red-300 text-[10px] font-bold flex items-center gap-1 px-2 py-1 rounded-lg hover:bg-red-500/10 transition">
                    <Trash2 size={11} /> Vaciar
                  </button>
                )}
              </div>

              {items.length === 0 ? (
                <div className="text-center py-10 border border-dashed border-gray-800 rounded-xl space-y-2">
                  <p className="text-xs text-gray-500 font-medium">El carrito de compras está vacío.</p>
                  <p className="text-[10px] text-gray-600">Presiona "Agregar" arriba para simular productos.</p>
                </div>
              ) : (
                <div className="space-y-4">
                  {Object.entries(agrupados).map(([tienda, prods]) => (
                    <div key={tienda} className="bg-gray-800/20 border border-gray-800/40 rounded-xl overflow-hidden">
                      <div className="bg-gray-800/40 px-3.5 py-2 text-[10px] font-black text-green-400 uppercase tracking-wider border-b border-gray-800/40 flex items-center justify-between">
                        <span>🏪 {tienda}</span>
                        <span className="text-[9px] text-gray-500 lowercase font-medium">
                          {prods.length} {prods.length === 1 ? 'artículo' : 'artículos'}
                        </span>
                      </div>
                      <div className="divide-y divide-gray-800/40">
                        {prods.map(i => (
                          <div key={i.codigo} className="px-3.5 py-2.5 flex items-center justify-between text-xs">
                            <div className="space-y-0.5">
                              <div className="font-bold text-white">{i.descripcion}</div>
                              <div className="text-[10px] text-gray-400 font-medium">
                                Unitario: {fmt(i.precio_unitario)} | Total: {fmt(i.precio_unitario * i.cantidad)}
                              </div>
                            </div>
                            <div className="flex items-center gap-2">
                              <button
                                onClick={() => handleQuantity(i.codigo, i.cantidad - 1)}
                                className="w-6 h-6 rounded-lg bg-gray-800 hover:bg-gray-700 active:scale-95 flex items-center justify-center transition text-gray-300">
                                <Minus size={11} />
                              </button>
                              <span className="w-5 text-center font-bold text-xs text-white">{i.cantidad}</span>
                              <button
                                onClick={() => handleQuantity(i.codigo, i.cantidad + 1)}
                                className="w-6 h-6 rounded-lg bg-gray-800 hover:bg-gray-700 active:scale-95 flex items-center justify-center transition text-gray-300">
                                <Plus size={11} />
                              </button>
                            </div>
                          </div>
                        ))}
                      </div>
                    </div>
                  ))}
                </div>
              )}
            </div>
          </div>

          {/* Panel Derecho: Resumen Financiero y WhatsApp */}
          <div className="space-y-4">
            
            {/* Tarifa de Envíos */}
            <div className="bg-gray-900 border border-gray-800 rounded-2xl p-4 space-y-4">
              <h2 className="text-sm font-bold text-gray-200 uppercase tracking-wider">3. Costo de Envío Consolidado</h2>
              
              <div className="space-y-3">
                <RecargoEnvioBadge nTiendas={nTiendas} costoTotalEnvio={costoEnvio} />
                
                <div className="bg-gray-850/50 border border-gray-800 rounded-xl p-3 space-y-2 text-xs">
                  <div className="flex justify-between text-gray-400">
                    <span>Subtotal productos:</span>
                    <span className="font-semibold text-white">{fmt(subtotal)}</span>
                  </div>
                  <div className="flex justify-between text-gray-400">
                    <span>Costo de envío:</span>
                    <span className="font-semibold text-white">{fmt(costoEnvio)}</span>
                  </div>
                  <div className="flex justify-between border-t border-gray-800 pt-2 text-sm font-black">
                    <span className="text-green-400">TOTAL ESTIMADO:</span>
                    <span className="text-green-400">{fmt(granTotal)}</span>
                  </div>
                </div>
              </div>
            </div>

            {/* Previsualización Mensaje WhatsApp */}
            <div className="bg-gray-900 border border-gray-800 rounded-2xl p-4 space-y-3">
              <div className="flex items-center justify-between">
                <h2 className="text-sm font-bold text-gray-200 uppercase tracking-wider flex items-center gap-1.5">
                  <Eye size={14} /> 4. Mensaje a WhatsApp
                </h2>
                <button
                  onClick={copiarMensaje}
                  disabled={items.length === 0}
                  className={`text-[10px] font-bold px-2 py-1 rounded-lg transition flex items-center gap-1 shrink-0 ${
                    items.length === 0 
                      ? 'text-gray-600 bg-transparent cursor-not-allowed'
                      : 'text-green-400 hover:text-green-300 hover:bg-green-500/10'
                  }`}>
                  {copied ? <Check size={11} className="text-green-400" /> : <Copy size={11} />}
                  {copied ? 'Copiado' : 'Copiar'}
                </button>
              </div>

              <div className="relative">
                <textarea
                  readOnly
                  value={msg}
                  className="w-full bg-gray-950 border border-gray-850 rounded-xl p-3 font-mono text-[10px] text-gray-300 h-64 focus:outline-none resize-none leading-relaxed"
                />
                {items.length === 0 && (
                  <div className="absolute inset-0 bg-gray-950/80 backdrop-blur-xs rounded-xl flex items-center justify-center text-center p-4">
                    <p className="text-[11px] text-gray-500 font-medium">
                      Agrega productos de prueba para generar y previsualizar el mensaje de WhatsApp consolidado.
                    </p>
                  </div>
                )}
              </div>
            </div>

          </div>
          
        </div>
      </div>
    </div>
  )
}

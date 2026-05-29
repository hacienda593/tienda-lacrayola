'use client'
import { useEffect, useState } from 'react'
import Link from 'next/link'
import { useRouter } from 'next/navigation'
import { getPedidosLocales, PedidoLocal } from '@/lib/perfil'
import { agregarItem } from '@/lib/carrito'
import { ShoppingCart, Clock, ChevronRight, Package, RotateCcw } from 'lucide-react'

function fmt(n: number) { return '$' + n.toFixed(2) }

const ESTADOS: Record<string, { label: string; color: string; bg: string }> = {
  pendiente:  { label: 'Pendiente',      color: 'text-yellow-700', bg: 'bg-yellow-100' },
  confirmado: { label: 'Confirmado',     color: 'text-blue-700',   bg: 'bg-blue-100' },
  preparando: { label: 'Preparando',     color: 'text-purple-700', bg: 'bg-purple-100' },
  enviado:    { label: 'Enviado',        color: 'text-green-700',  bg: 'bg-green-100' },
  entregado:  { label: 'Entregado',      color: 'text-green-800',  bg: 'bg-green-200' },
  cancelado:  { label: 'Cancelado',      color: 'text-red-700',    bg: 'bg-red-100' },
}

function fechaRelativa(iso: string): string {
  const diff = Date.now() - new Date(iso).getTime()
  const mins  = Math.floor(diff / 60000)
  const horas = Math.floor(mins / 60)
  const dias  = Math.floor(horas / 24)
  if (dias > 0)  return `hace ${dias} día${dias > 1 ? 's' : ''}`
  if (horas > 0) return `hace ${horas} hora${horas > 1 ? 's' : ''}`
  if (mins > 0)  return `hace ${mins} min`
  return 'Ahora mismo'
}

export default function PedidosPage() {
  const router = useRouter()
  const [pedidos, setPedidos] = useState<PedidoLocal[]>([])
  const [recomprandoId, setRecomprandoId] = useState<string | null>(null)

  useEffect(() => {
    setPedidos(getPedidosLocales())
  }, [])

  function recomprar(pedido: PedidoLocal) {
    setRecomprandoId(pedido.id)
    pedido.items.forEach(item => {
      agregarItem({
        codigo:        item.codigo,
        descripcion:   item.descripcion,
        categoria:     '',
        precio_publico: item.precio_unitario,
      }, item.cantidad)
    })
    setTimeout(() => router.push('/carrito'), 600)
  }

  if (pedidos.length === 0) {
    return (
      <div className="max-w-lg mx-auto px-4 py-16 flex flex-col items-center gap-4 text-center">
        <Package size={48} className="text-gray-300" />
        <h2 className="text-lg font-bold text-gray-700">Sin pedidos aún</h2>
        <p className="text-sm text-gray-400">Tus pedidos aparecerán aquí una vez que confirmes tu primera compra.</p>
        <Link href="/productos"
          className="mt-2 bg-green-600 hover:bg-green-700 text-white font-semibold px-6 py-2.5 rounded-xl text-sm transition">
          Ver productos
        </Link>
      </div>
    )
  }

  return (
    <div className="max-w-lg mx-auto px-4 py-5 space-y-4">
      <div className="flex items-center justify-between">
        <h1 className="text-lg font-bold text-gray-800">Mis pedidos</h1>
        <span className="text-xs text-gray-400">{pedidos.length} pedido{pedidos.length > 1 ? 's' : ''}</span>
      </div>

      <div className="space-y-3">
        {pedidos.map(pedido => {
          const estado = ESTADOS[pedido.estado] ?? { label: pedido.estado, color: 'text-gray-600', bg: 'bg-gray-100' }
          return (
            <div key={pedido.id} className="bg-white border border-gray-100 rounded-2xl p-4 shadow-sm space-y-3">
              {/* Cabecera */}
              <div className="flex items-start justify-between gap-2">
                <div>
                  <div className="font-bold text-gray-800 text-sm">
                    Pedido #{String(pedido.numero).padStart(4, '0')}
                  </div>
                  <div className="flex items-center gap-1 text-xs text-gray-400 mt-0.5">
                    <Clock size={11} />
                    {fechaRelativa(pedido.fecha)}
                  </div>
                </div>
                <span className={`text-[11px] font-semibold px-2.5 py-1 rounded-full ${estado.bg} ${estado.color}`}>
                  {estado.label}
                </span>
              </div>

              {/* Items resumidos */}
              <div className="space-y-1">
                {pedido.items.slice(0, 3).map((it, i) => (
                  <div key={i} className="flex justify-between text-xs text-gray-600">
                    <span className="truncate flex-1">{it.descripcion} ×{it.cantidad}</span>
                    <span className="ml-2 shrink-0 text-gray-500">{fmt(it.precio_unitario * it.cantidad)}</span>
                  </div>
                ))}
                {pedido.items.length > 3 && (
                  <div className="text-xs text-gray-400">+{pedido.items.length - 3} producto{pedido.items.length - 3 > 1 ? 's' : ''} más</div>
                )}
              </div>

              {/* Total + acciones */}
              <div className="flex items-center justify-between pt-2 border-t border-gray-100">
                <span className="font-bold text-green-700">{fmt(pedido.total)}</span>
                <div className="flex items-center gap-2">
                  {/* Recomprar con 1 clic */}
                  <button
                    onClick={() => recomprar(pedido)}
                    disabled={recomprandoId === pedido.id}
                    className="flex items-center gap-1.5 bg-green-600 hover:bg-green-700 disabled:opacity-60 text-white text-xs font-semibold px-3 py-1.5 rounded-lg transition"
                  >
                    {recomprandoId === pedido.id
                      ? <><ShoppingCart size={12} className="animate-bounce" />Agregando...</>
                      : <><RotateCcw size={12} />Recomprar</>
                    }
                  </button>
                  {/* Ver detalle */}
                  <Link href={`/pedido/${pedido.id}`}
                    className="flex items-center gap-1 text-xs text-gray-400 hover:text-gray-600 transition">
                    Ver <ChevronRight size={13} />
                  </Link>
                </div>
              </div>
            </div>
          )
        })}
      </div>
    </div>
  )
}

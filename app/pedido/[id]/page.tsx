'use client'
import { useEffect, useState, useCallback } from 'react'
import Link from 'next/link'
import { useParams } from 'next/navigation'
import { createClient } from '@supabase/supabase-js'
import { CheckCircle, Clock, Package, Truck, Star, RefreshCw } from 'lucide-react'
import { actualizarEstadoPedidoLocal } from '@/lib/perfil'

const supabase = createClient(
  process.env.NEXT_PUBLIC_SUPABASE_URL!,
  process.env.NEXT_PUBLIC_SUPABASE_ANON_KEY!
)

function fmt(n: number) { return '$' + n.toFixed(2) }

const PASOS: { estado: string; label: string; icon: React.ReactNode }[] = [
  { estado: 'pendiente',  label: 'Recibido',     icon: <Clock size={16} /> },
  { estado: 'confirmado', label: 'Confirmado',   icon: <CheckCircle size={16} /> },
  { estado: 'preparando', label: 'Preparando',   icon: <Package size={16} /> },
  { estado: 'enviado',    label: 'En camino',    icon: <Truck size={16} /> },
  { estado: 'entregado',  label: 'Entregado',    icon: <Star size={16} /> },
]

const ORDEN_ESTADO = ['pendiente','confirmado','preparando','enviado','entregado','cancelado']

interface Item { descripcion: string; cantidad: number; precio_unitario: number }
interface Pedido {
  numero: number
  nombre_cliente: string
  telefono: string
  direccion: string
  ciudad: string
  estado: string
  total: number
  created_at: string
}

export default function PedidoPage() {
  const { id } = useParams<{ id: string }>()
  const [pedido, setPedido] = useState<Pedido | null>(null)
  const [items,  setItems]  = useState<Item[]>([])
  const [error,  setError]  = useState(false)
  const [ultima, setUltima] = useState<Date>(new Date())

  const cargar = useCallback(async () => {
    const [{ data: p }, { data: its }] = await Promise.all([
      supabase.from('ol_pedidos').select('*').eq('id', id).single(),
      supabase.from('ol_pedido_items').select('descripcion,cantidad,precio_unitario').eq('pedido_id', id),
    ])
    if (!p) { setError(true); return }
    setPedido(p as Pedido)
    setItems((its ?? []) as Item[])
    setUltima(new Date())
    actualizarEstadoPedidoLocal(id, (p as Pedido).estado)
  }, [id])

  useEffect(() => {
    cargar()
    // Polling cada 30 segundos
    const t = setInterval(cargar, 30_000)
    return () => clearInterval(t)
  }, [cargar])

  if (error) return (
    <div className="max-w-lg mx-auto px-4 py-16 text-center">
      <p className="text-gray-500">Pedido no encontrado.</p>
      <Link href="/pedidos" className="text-green-600 text-sm mt-2 block">← Mis pedidos</Link>
    </div>
  )

  if (!pedido) return (
    <div className="max-w-lg mx-auto px-4 py-16 flex flex-col items-center gap-3">
      <RefreshCw size={28} className="text-green-500 animate-spin" />
      <p className="text-sm text-gray-400">Cargando pedido...</p>
    </div>
  )

  const idxActual    = ORDEN_ESTADO.indexOf(pedido.estado)
  const cancelado    = pedido.estado === 'cancelado'

  return (
    <div className="max-w-lg mx-auto px-4 py-5 space-y-5">
      {/* Encabezado */}
      <div className="text-center space-y-1">
        <CheckCircle size={44} className="text-green-500 mx-auto" />
        <h1 className="text-xl font-bold text-gray-800">¡Pedido recibido!</h1>
        <p className="text-gray-500 text-sm">
          Pedido <span className="font-bold text-gray-800">#{String(pedido.numero).padStart(4,'0')}</span>
        </p>
        <div className="flex items-center justify-center gap-1.5 text-xs text-gray-400">
          <RefreshCw size={11} />
          Actualizado {ultima.toLocaleTimeString('es', { hour: '2-digit', minute: '2-digit' })}
          <button onClick={cargar} className="underline hover:text-green-600 transition">Refrescar</button>
        </div>
      </div>

      {/* Progreso de estado */}
      {!cancelado && (
        <div className="bg-white border border-gray-100 rounded-2xl p-4 shadow-sm">
          <div className="text-xs font-bold text-gray-400 uppercase tracking-wider mb-4">Estado del pedido</div>
          <div className="flex items-start justify-between relative">
            {/* Línea de fondo */}
            <div className="absolute top-4 left-4 right-4 h-0.5 bg-gray-100" />
            {/* Línea de progreso */}
            <div
              className="absolute top-4 left-4 h-0.5 bg-green-500 transition-all duration-700"
              style={{ width: `${(Math.max(0, idxActual) / (PASOS.length - 1)) * 100}%` }}
            />
            {PASOS.map((paso, i) => {
              const done   = i <= idxActual
              const actual = i === idxActual
              return (
                <div key={paso.estado} className="flex flex-col items-center gap-1.5 z-10 flex-1">
                  <div className={`w-8 h-8 rounded-full flex items-center justify-center border-2 transition-all duration-500 ${
                    done
                      ? actual
                        ? 'bg-green-500 border-green-500 text-white scale-110'
                        : 'bg-green-500 border-green-500 text-white'
                      : 'bg-white border-gray-200 text-gray-300'
                  }`}>
                    {paso.icon}
                  </div>
                  <span className={`text-[10px] text-center font-medium leading-tight ${done ? 'text-green-700' : 'text-gray-300'}`}>
                    {paso.label}
                  </span>
                </div>
              )
            })}
          </div>
        </div>
      )}

      {cancelado && (
        <div className="bg-red-50 border border-red-200 rounded-xl px-4 py-3 text-sm text-red-700 text-center font-semibold">
          Este pedido fue cancelado
        </div>
      )}

      {/* Datos de entrega */}
      <div className="bg-white border border-gray-100 rounded-2xl p-4 shadow-sm space-y-2">
        <div className="text-xs font-bold text-gray-400 uppercase tracking-wider">Datos de entrega</div>
        <div className="space-y-1 text-sm">
          <div className="flex gap-2"><span className="text-gray-400 w-20 shrink-0">Nombre</span><span className="text-gray-800 font-medium">{pedido.nombre_cliente}</span></div>
          <div className="flex gap-2"><span className="text-gray-400 w-20 shrink-0">Teléfono</span><span className="text-gray-800">{pedido.telefono}</span></div>
          {pedido.direccion && <div className="flex gap-2"><span className="text-gray-400 w-20 shrink-0">Dirección</span><span className="text-gray-800">{pedido.direccion}, {pedido.ciudad}</span></div>}
        </div>
      </div>

      {/* Productos */}
      <div className="bg-white border border-gray-100 rounded-2xl p-4 shadow-sm space-y-2">
        <div className="text-xs font-bold text-gray-400 uppercase tracking-wider">Productos</div>
        {items.map((it, i) => (
          <div key={i} className="flex justify-between text-sm">
            <span className="text-gray-600 flex-1 truncate">{it.descripcion} ×{it.cantidad}</span>
            <span className="text-gray-800 font-medium ml-2 shrink-0">{fmt(it.precio_unitario * it.cantidad)}</span>
          </div>
        ))}
        <div className="flex justify-between font-bold text-gray-800 border-t border-gray-100 pt-2 mt-1">
          <span>Total</span>
          <span className="text-green-600">{fmt(pedido.total)}</span>
        </div>
      </div>

      {/* Aviso WhatsApp */}
      <div className="bg-yellow-50 border border-yellow-200 rounded-xl p-4 text-xs text-yellow-800 text-center leading-relaxed">
        Te contactaremos pronto por WhatsApp al <strong>{pedido.telefono}</strong> para coordinar la entrega y el pago. 🚚
      </div>

      <div className="flex gap-3">
        <Link href="/pedidos" className="flex-1 text-center border border-gray-200 hover:bg-gray-50 text-gray-700 font-semibold py-3 rounded-xl transition text-sm">
          Mis pedidos
        </Link>
        <Link href="/productos" className="flex-1 text-center bg-green-600 hover:bg-green-700 text-white font-semibold py-3 rounded-xl transition text-sm">
          Seguir comprando
        </Link>
      </div>
    </div>
  )
}

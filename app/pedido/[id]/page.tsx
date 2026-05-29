import Link from 'next/link'
import { createClient } from '@supabase/supabase-js'
import { CheckCircle } from 'lucide-react'
import { notFound } from 'next/navigation'

const supabaseServer = createClient(
  process.env.NEXT_PUBLIC_SUPABASE_URL!,
  process.env.SUPABASE_SERVICE_ROLE_KEY ?? process.env.NEXT_PUBLIC_SUPABASE_ANON_KEY!
)

interface Item { descripcion: string; cantidad: number; precio_unitario: number }
interface Pedido { numero: number; nombre_cliente: string; telefono: string; direccion: string; ciudad: string; estado: string; total: number; created_at: string }

function fmt(n: number) { return '$' + n.toFixed(2) }
const ESTADOS: Record<string, { label: string; color: string }> = {
  pendiente:   { label: 'Pendiente de confirmación', color: 'text-yellow-400' },
  confirmado:  { label: 'Confirmado',   color: 'text-blue-400' },
  preparando:  { label: 'En preparación', color: 'text-purple-400' },
  enviado:     { label: 'Enviado',      color: 'text-green-400' },
  entregado:   { label: 'Entregado',    color: 'text-green-300' },
  cancelado:   { label: 'Cancelado',    color: 'text-red-400' },
}

export default async function PedidoPage({ params }: { params: Promise<{ id: string }> }) {
  const { id } = await params

  const [{ data: pedido }, { data: items }] = await Promise.all([
    supabaseServer.from('ol_pedidos').select('*').eq('id', id).single(),
    supabaseServer.from('ol_pedido_items').select('descripcion,cantidad,precio_unitario').eq('pedido_id', id),
  ])

  if (!pedido) notFound()

  const estado = ESTADOS[(pedido as Pedido).estado] || { label: (pedido as Pedido).estado, color: 'text-gray-400' }
  const p = pedido as Pedido
  const its = (items ?? []) as Item[]

  return (
    <div className="max-w-lg mx-auto px-4 py-6 space-y-5">

      <div className="text-center space-y-2">
        <CheckCircle size={48} className="text-green-400 mx-auto" />
        <h1 className="text-xl font-bold text-white">¡Pedido recibido!</h1>
        <p className="text-gray-400 text-sm">Pedido <span className="text-white font-bold">#{String(p.numero).padStart(4, '0')}</span></p>
        <p className={`text-sm font-semibold ${estado.color}`}>{estado.label}</p>
      </div>

      <div className="bg-gray-900 border border-gray-800 rounded-xl p-4 space-y-3">
        <div className="text-xs font-bold text-gray-400 uppercase tracking-wider">Datos de entrega</div>
        <div className="space-y-1 text-sm">
          <div className="flex gap-2"><span className="text-gray-500 w-20 shrink-0">Nombre</span><span className="text-white">{p.nombre_cliente}</span></div>
          <div className="flex gap-2"><span className="text-gray-500 w-20 shrink-0">Teléfono</span><span className="text-white">{p.telefono}</span></div>
          {p.direccion && <div className="flex gap-2"><span className="text-gray-500 w-20 shrink-0">Dirección</span><span className="text-white">{p.direccion}, {p.ciudad}</span></div>}
        </div>
      </div>

      <div className="bg-gray-900 border border-gray-800 rounded-xl p-4 space-y-2">
        <div className="text-xs font-bold text-gray-400 uppercase tracking-wider mb-1">Productos</div>
        {its.map((it, i) => (
          <div key={i} className="flex justify-between text-sm">
            <span className="text-gray-300 flex-1 truncate">{it.descripcion} ×{it.cantidad}</span>
            <span className="text-white ml-2 shrink-0">{fmt(it.precio_unitario * it.cantidad)}</span>
          </div>
        ))}
        <div className="flex justify-between font-bold text-white border-t border-gray-700 pt-2 mt-2">
          <span>Total</span>
          <span className="text-green-400">{fmt(p.total)}</span>
        </div>
      </div>

      <div className="bg-yellow-950/40 border border-yellow-900/60 rounded-xl p-4 text-xs text-yellow-300 text-center leading-relaxed">
        Te contactaremos pronto por WhatsApp al <strong>{p.telefono}</strong> para coordinar la entrega y el pago. 🚚
      </div>

      <Link href="/productos"
        className="block w-full text-center bg-green-700 hover:bg-green-600 text-white font-semibold py-3 rounded-xl transition text-sm">
        Seguir comprando
      </Link>
    </div>
  )
}

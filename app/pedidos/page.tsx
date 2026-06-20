'use client'
import { useEffect, useState } from 'react'
import Link from 'next/link'
import { useRouter } from 'next/navigation'
import { useAuth } from '@/context/AuthContext'
import { getPedidosLocales } from '@/lib/perfil'
import { supabase } from '@/lib/supabase'
import { agregarItem } from '@/lib/carrito'
import { ShoppingCart, Clock, ChevronRight, Package, RotateCcw, Loader2 } from 'lucide-react'

function fmt(n: number) { return '$' + n.toFixed(2) }

const ESTADOS: Record<string, { label: string; color: string; bg: string }> = {
  pendiente:  { label: 'Pendiente',  color: 'text-yellow-700', bg: 'bg-yellow-100' },
  confirmado: { label: 'Confirmado', color: 'text-blue-700',   bg: 'bg-blue-100' },
  preparando: { label: 'Preparando', color: 'text-purple-700', bg: 'bg-purple-100' },
  preparado:  { label: 'Preparando', color: 'text-purple-700', bg: 'bg-purple-100' },
  enviado:    { label: 'Enviado',    color: 'text-green-700',  bg: 'bg-green-100' },
  entregado:  { label: 'Entregado',  color: 'text-green-800',  bg: 'bg-green-200' },
  cancelado:  { label: 'Cancelado',  color: 'text-red-700',    bg: 'bg-red-100' },
}

function fechaRelativa(iso: string) {
  const diff  = Date.now() - new Date(iso).getTime()
  const mins  = Math.floor(diff / 60000)
  const horas = Math.floor(mins / 60)
  const dias  = Math.floor(horas / 24)
  if (dias > 0)  return `hace ${dias} día${dias > 1 ? 's' : ''}`
  if (horas > 0) return `hace ${horas} hora${horas > 1 ? 's' : ''}`
  if (mins > 0)  return `hace ${mins} min`
  return 'Ahora mismo'
}

// ── Tipo unificado para mostrar ────────────────────────────────────
interface PedidoVista {
  id: string
  numero: number
  fecha: string
  total: number
  estado: string
  items: { codigo: string; descripcion: string; cantidad: number; precio_unitario: number }[]
}

// ── Tarjeta de pedido ──────────────────────────────────────────────
function TarjetaPedido({ pedido, onRecomprar, recomprando }: {
  pedido: PedidoVista
  onRecomprar: (p: PedidoVista) => void
  recomprando: boolean
}) {
  const estado = ESTADOS[pedido.estado] ?? { label: pedido.estado, color: 'text-gray-600', bg: 'bg-gray-100' }
  return (
    <div className="bg-white border border-gray-100 rounded-2xl p-4 shadow-sm space-y-3">
      <div className="flex items-start justify-between gap-2">
        <div>
          <div className="font-bold text-gray-800 text-sm">Pedido #{String(pedido.numero).padStart(4,'0')}</div>
          <div className="flex items-center gap-1 text-xs text-gray-400 mt-0.5">
            <Clock size={11} />{fechaRelativa(pedido.fecha)}
          </div>
        </div>
        <span className={`text-[11px] font-semibold px-2.5 py-1 rounded-full ${estado.bg} ${estado.color}`}>
          {estado.label}
        </span>
      </div>

      <div className="space-y-1">
        {pedido.items.slice(0, 3).map((it, i) => (
          <div key={i} className="flex justify-between text-xs text-gray-600">
            <span className="truncate flex-1">{it.descripcion} ×{it.cantidad}</span>
            <span className="ml-2 shrink-0 text-gray-400">{fmt(it.precio_unitario * it.cantidad)}</span>
          </div>
        ))}
        {pedido.items.length > 3 && (
          <div className="text-xs text-gray-400">+{pedido.items.length - 3} producto{pedido.items.length - 3 > 1 ? 's' : ''} más</div>
        )}
      </div>

      <div className="flex items-center justify-between pt-2 border-t border-gray-100">
        <span className="font-bold text-green-700">{fmt(pedido.total)}</span>
        <div className="flex items-center gap-2">
          <button onClick={() => onRecomprar(pedido)} disabled={recomprando}
            className="flex items-center gap-1.5 bg-green-600 hover:bg-green-700 disabled:opacity-60 text-white text-xs font-semibold px-3 py-1.5 rounded-lg transition">
            {recomprando
              ? <><ShoppingCart size={12} className="animate-bounce" />Agregando...</>
              : <><RotateCcw size={12} />Recomprar</>}
          </button>
          <Link href={`/pedido/${pedido.id}`}
            className="flex items-center gap-1 text-xs text-gray-400 hover:text-gray-600 transition">
            Ver <ChevronRight size={13} />
          </Link>
        </div>
      </div>
    </div>
  )
}

// ── Página ─────────────────────────────────────────────────────────
export default function PedidosPage() {
  const router = useRouter()
  const { user, loading: authLoading } = useAuth()
  const [pedidos,     setPedidos]     = useState<PedidoVista[]>([])
  const [cargando,    setCargando]    = useState(true)
  const [recomprandoId, setRecomprandoId] = useState<string | null>(null)

  useEffect(() => {
    if (authLoading) return

    async function cargar() {
      if (user) {
        // Registrado: buscar por user_id + por email (pedidos previos al registro)
        const email = user.email ?? ''
        const [{ data: porId }, { data: porEmail }] = await Promise.all([
          supabase.from('ol_pedidos')
            .select('id,numero,estado,total,created_at')
            .eq('user_id', user.id)
            .order('created_at', { ascending: false }),
          supabase.from('ol_pedidos')
            .select('id,numero,estado,total,created_at')
            .eq('email_cliente', email)
            .is('user_id', null)
            .order('created_at', { ascending: false }),
        ])

        const vistos = new Set<string>()
        const todos = [...(porId ?? []), ...(porEmail ?? [])].filter(p => {
          if (vistos.has(p.id)) return false
          vistos.add(p.id)
          return true
        }).sort((a, b) => new Date(b.created_at).getTime() - new Date(a.created_at).getTime())

        if (todos.length === 0) { setCargando(false); return }

        const conItems = await Promise.all(todos.map(async p => {
          const { data: items } = await supabase
            .from('ol_pedido_items')
            .select('codigo,descripcion,cantidad,precio_unitario')
            .eq('pedido_id', p.id)
          return {
            id:     p.id,
            numero: p.numero,
            fecha:  p.created_at,
            total:  p.total,
            estado: p.estado,
            items:  items ?? [],
          } as PedidoVista
        }))
        setPedidos(conItems)
        setCargando(false)
      } else {
        // Invitado: localStorage
        const locales = getPedidosLocales()
        setPedidos(locales.map(p => ({
          id:     p.id,
          numero: p.numero,
          fecha:  p.fecha,
          total:  p.total,
          estado: p.estado,
          items:  p.items,
        })))
        setCargando(false)
      }
    }

    cargar()
  }, [user, authLoading])

  function recomprar(pedido: PedidoVista) {
    setRecomprandoId(pedido.id)
    pedido.items.forEach(it => agregarItem({
      codigo: it.codigo, descripcion: it.descripcion,
      categoria: '', precio_publico: it.precio_unitario,
    }, it.cantidad))
    setTimeout(() => router.push('/carrito'), 600)
  }

  if (authLoading || cargando) {
    return (
      <div className="max-w-lg mx-auto px-4 py-16 flex justify-center">
        <Loader2 size={28} className="animate-spin text-green-500" />
      </div>
    )
  }

  return (
    <div className="max-w-lg mx-auto px-4 py-5 space-y-4">
      <div className="flex items-center justify-between">
        <div>
          <h1 className="text-lg font-bold text-gray-800">Mis pedidos</h1>
          {user && <p className="text-xs text-gray-400">Cuenta registrada · {pedidos.length} pedido{pedidos.length !== 1 ? 's' : ''}</p>}
          {!user && <p className="text-xs text-gray-400">Modo invitado · {pedidos.length} pedido{pedidos.length !== 1 ? 's' : ''} en este dispositivo</p>}
        </div>
        {!user && (
          <Link href="/cuenta" className="text-xs text-green-600 underline">Registrarme →</Link>
        )}
      </div>

      {pedidos.length === 0 ? (
        <div className="text-center py-16 space-y-3">
          <Package size={48} className="text-gray-200 mx-auto" />
          <p className="text-gray-600 font-semibold">Sin pedidos aún</p>
          <p className="text-sm text-gray-400">Tus pedidos aparecerán aquí una vez que confirmes tu primera compra.</p>
          <Link href="/productos"
            className="inline-block mt-2 bg-green-600 hover:bg-green-700 text-white font-semibold px-6 py-2.5 rounded-xl text-sm transition">
            Ver productos
          </Link>
        </div>
      ) : (
        <div className="space-y-3">
          {pedidos.map(p => (
            <TarjetaPedido key={p.id} pedido={p}
              onRecomprar={recomprar}
              recomprando={recomprandoId === p.id} />
          ))}
        </div>
      )}
    </div>
  )
}

'use client'
import { useEffect, useState, useCallback } from 'react'
import Link from 'next/link'
import { useParams } from 'next/navigation'
import { createClient } from '@supabase/supabase-js'
import { CheckCircle, Clock, Package, Truck, Star, RefreshCw, MessageSquare } from 'lucide-react'
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

interface Item {
  codigo: string
  descripcion: string
  cantidad: number
  precio_unitario: number
  picking_completado?: boolean
  picking_agotado?: boolean
  tienda_nombre?: string | null
  imagen_url?: string | null
}

interface Pedido {
  numero: number
  nombre_cliente: string
  telefono: string
  direccion: string
  ciudad: string
  estado: string
  total: number
  created_at: string
  notas?: string | null
  geo_lat?: number | null
  geo_lng?: number | null
  prov_establecimiento?: string | null
  prov_punto_emision?: string | null
  prov_secuencial?: string | null
  prov_costo_real?: number | null
  prov_factura_url?: string | null
  prov_clave_acceso?: string | null
  prov_ruc?: string | null
}

interface Repartidor {
  nombre: string
  telefono: string
}

interface EncabezadoConfig {
  titulo: string
  subtitulo: string
  colorClase: string
  icon: React.ReactNode
}

function obtenerEncabezado(estado: string): EncabezadoConfig {
  switch (estado) {
    case 'pendiente':
      return {
        titulo: '¡Pedido recibido!',
        subtitulo: 'Estamos esperando que un comprador acepte tu pedido.',
        colorClase: 'text-yellow-500',
        icon: <Clock size={44} className="text-yellow-500 mx-auto" />
      }
    case 'confirmado':
      return {
        titulo: '¡Pedido confirmado!',
        subtitulo: 'Un comprador ha sido asignado y pronto empezará tus compras.',
        colorClase: 'text-blue-500',
        icon: <CheckCircle size={44} className="text-blue-500 mx-auto" />
      }
    case 'preparado':
    case 'preparando':
      return {
        titulo: '🧺 Comprando tus productos',
        subtitulo: 'Tu comprador está en el supermercado recolectando tus productos.',
        colorClase: 'text-purple-500',
        icon: <Package size={44} className="text-purple-500 mx-auto animate-pulse" />
      }
    case 'enviado':
      return {
        titulo: '🚚 ¡Pedido en camino!',
        subtitulo: 'El repartidor está llevando tu pedido a tu dirección.',
        colorClase: 'text-green-500',
        icon: <Truck size={44} className="text-green-500 mx-auto" />
      }
    case 'entregado':
      return {
        titulo: '🎉 ¡Pedido entregado!',
        subtitulo: '¡Gracias por comprar en Tienda La Crayola! Esperamos que disfrutes tu compra.',
        colorClase: 'text-green-600',
        icon: <Star size={44} className="text-green-600 mx-auto fill-green-600" />
      }
    default:
      return {
        titulo: '¡Pedido recibido!',
        subtitulo: 'Puedes seguir el estado de tu pedido en tiempo real.',
        colorClase: 'text-green-500',
        icon: <CheckCircle size={44} className="text-green-500 mx-auto" />
      }
  }
}

export default function PedidoPage() {
  const { id } = useParams<{ id: string }>()
  const [pedido, setPedido] = useState<Pedido | null>(null)
  const [items,  setItems]  = useState<Item[]>([])
  const [repartidor, setRepartidor] = useState<Repartidor | null>(null)
  const [error,  setError]  = useState(false)
  const [ultima, setUltima] = useState<Date>(new Date())
  const [comprobantes, setComprobantes] = useState<any[]>([])

  const cargar = useCallback(async () => {
    const [{ data: p }, { data: its }, { data: comps }] = await Promise.all([
      supabase.from('ol_pedidos').select('*').eq('id', id).single(),
      supabase.from('ol_pedido_items').select('codigo,descripcion,cantidad,precio_unitario,picking_completado,picking_agotado').eq('pedido_id', id),
      supabase.from('ol_pedidos_comprobantes_proveedor')
        .select('prov_establecimiento, prov_punto_emision, prov_secuencial, prov_costo_real, prov_factura_url, prov_ruc, tienda_id, ol_tiendas(nombre)')
        .eq('pedido_id', id)
    ])
    if (!p) { setError(true); return }

    let itemsMapeados = (its ?? []) as Item[]
    if (its && its.length > 0) {
      const codigos = its.map(it => it.codigo).filter(Boolean)
      const { data: prods } = await supabase
        .from('ol_productos')
        .select('codigo,descripcion,imagen_url,tienda_id,ol_tiendas(nombre)')
        .in('codigo', codigos)
      if (prods && prods.length > 0) {
        const prodMap = new Map(prods.map(pr => [pr.codigo, pr.descripcion]))
        const imageMap = new Map(prods.map(pr => [pr.codigo, pr.imagen_url]))
        const tiendaMap = new Map(prods.map(pr => [
          pr.codigo, 
          (pr.ol_tiendas as any)?.nombre || null
        ]))
        itemsMapeados = its.map(it => ({
          ...it,
          descripcion: prodMap.get(it.codigo) || it.descripcion,
          imagen_url: imageMap.get(it.codigo) || null,
          tienda_nombre: tiendaMap.get(it.codigo) || null
        })) as Item[]
      }
    }

    setPedido(p as Pedido)
    setItems(itemsMapeados)
    setComprobantes(comps ?? [])
    setUltima(new Date())
    actualizarEstadoPedidoLocal(id, (p as Pedido).estado)

    // Fetch assignment & repartidor
    try {
      const { data: asig } = await supabase
        .from('rep_asignaciones')
        .select('repartidor_id')
        .eq('pedido_id', id)
        .maybeSingle()

      if (asig?.repartidor_id) {
        const { data: rep } = await supabase
          .from('rep_repartidores')
          .select('nombre,telefono')
          .eq('id', asig.repartidor_id)
          .maybeSingle()
        if (rep) {
          setRepartidor(rep as Repartidor)
        } else {
          setRepartidor(null)
        }
      } else {
        setRepartidor(null)
      }
    } catch (e) {
      console.error("Error cargando repartidor:", e)
    }
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

  const estadoNormalizado = pedido.estado === 'preparado' ? 'preparando' : pedido.estado
  const idxActual    = ORDEN_ESTADO.indexOf(estadoNormalizado)
  const cancelado    = pedido.estado === 'cancelado'

  const formatWhatsAppNumber = (phone: string) => {
    const cleaned = phone.replace(/\D/g, '')
    if (cleaned.startsWith('0')) {
      return '593' + cleaned.slice(1)
    }
    if (cleaned.startsWith('593')) {
      return cleaned
    }
    return '593' + cleaned
  }

  const parseNotas = (notasStr: string | null | undefined) => {
    if (!notasStr) return { pago: null, factura: null, cleanNotas: null }
    const pagoMatch = notasStr.match(/\[PAGO:\s*([^\]]+)\]/)
    const facturaMatch = notasStr.match(/\[FACTURA:\s*([^\]]+)\]/)
    const cleanNotas = notasStr
      .replace(/\[PAGO:\s*[^\]]+\]/, '')
      .replace(/\[FACTURA:\s*[^\]]+\]/, '')
      .trim()
    return {
      pago: pagoMatch ? pagoMatch[1] : null,
      factura: facturaMatch ? facturaMatch[1] : null,
      cleanNotas: cleanNotas || null
    }
  }
  const infoNotas = parseNotas(pedido.notas)

  const headerInfo = obtenerEncabezado(pedido.estado)

const HORARIOS_TIENDAS: Record<string, string> = {
  'Tuti': '8:00 AM - 8:00 PM',
  'TIA': '8:30 AM - 9:00 PM',
  'Tía': '8:30 AM - 9:00 PM',
  'La Crayola': '8:00 AM - 7:00 PM',
}

  // Progress calculations
  const totalItems = items.length
  const processedItems = items.filter(it => it.picking_completado || it.picking_agotado).length
  const progressPercent = totalItems > 0 ? Math.round((processedItems / totalItems) * 100) : 0
  const tiendasPedido = Array.from(new Set(items.map(it => it.tienda_nombre).filter(Boolean))) as string[]

  return (
    <div className="max-w-lg mx-auto px-4 py-5 space-y-5">
      {/* Encabezado */}
      <div className="text-center space-y-1 bg-white border border-gray-100 rounded-2xl p-6 shadow-sm">
        {headerInfo.icon}
        <h1 className="text-xl font-bold text-gray-800 mt-2">{headerInfo.titulo}</h1>
        <p className="text-gray-500 text-sm max-w-sm mx-auto">{headerInfo.subtitulo}</p>
        {pedido.estado === 'preparado' && tiendasPedido.length > 0 && (
          <div className="mt-2.5 text-xs font-semibold text-purple-700 bg-purple-50 border border-purple-100/50 px-3 py-1.5 rounded-xl inline-flex flex-wrap items-center justify-center gap-x-3 gap-y-1">
            {tiendasPedido.map(t => (
              <span key={t}>🏪 {t}: {HORARIOS_TIENDAS[t] || '8:00 AM - 8:00 PM'}</span>
            ))}
          </div>
        )}
        <div className="pt-2 border-t border-gray-50 mt-3 flex items-center justify-between text-xs text-gray-400">
          <span>Pedido <strong className="text-gray-700">#{String(pedido.numero).padStart(4,'0')}</strong></span>
          <div className="flex items-center gap-1">
            <RefreshCw size={11} className="animate-spin-slow" />
            <span>Actualizado {ultima.toLocaleTimeString('es', { hour: '2-digit', minute: '2-digit' })}</span>
            <button onClick={cargar} className="underline hover:text-green-600 transition ml-1">Refrescar</button>
          </div>
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

      {/* Tarjeta de Progreso de Compra */}
      {pedido.estado === 'preparado' && (
        <div className="bg-gradient-to-br from-purple-50 to-indigo-50 border border-purple-100 rounded-2xl p-4 shadow-sm space-y-3">
          <div className="flex items-center justify-between">
            <span className="text-xs font-bold text-purple-700 uppercase tracking-wider">Progreso de la compra</span>
            <span className="text-xs font-semibold text-purple-600 bg-purple-100 px-2 py-0.5 rounded-full">
              {processedItems} de {totalItems} items
            </span>
          </div>
          <div className="w-full bg-purple-200/50 h-2.5 rounded-full overflow-hidden">
            <div 
              className="bg-purple-600 h-2.5 rounded-full transition-all duration-500" 
              style={{ width: `${progressPercent}%` }}
            />
          </div>
          <p className="text-[11px] text-purple-700 font-medium leading-relaxed">
            {progressPercent === 100 
              ? '¡Tu comprador ha terminado de recolectar todos los artículos!' 
              : 'Tu comprador está marcando los productos a medida que los agrega a su canasta.'}
          </p>
        </div>
      )}

      {/* Información del Repartidor / Comprador */}
      {repartidor && (
        <div className="bg-white border border-gray-100 rounded-2xl p-4 shadow-sm flex items-center justify-between gap-3">
          <div className="flex items-center gap-3">
            <div className="w-10 h-10 rounded-full bg-green-100 flex items-center justify-center text-green-700 font-bold text-sm shrink-0">
              {repartidor.nombre.charAt(0).toUpperCase()}
            </div>
            <div>
              <div className="text-[10px] font-bold text-gray-400 uppercase tracking-wider">
                {pedido.estado === 'preparado' ? 'Tu Comprador' : 'Tu Repartidor'}
              </div>
              <div className="font-semibold text-gray-800 text-sm">{repartidor.nombre}</div>
            </div>
          </div>
          <a
            href={`https://wa.me/${formatWhatsAppNumber(repartidor.telefono)}?text=${encodeURIComponent(
              `Hola ${repartidor.nombre}, soy el cliente del pedido #${String(pedido.numero).padStart(4, '0')}.`
            )}`}
            target="_blank"
            rel="noopener noreferrer"
            className="flex items-center gap-1.5 bg-green-600 hover:bg-green-700 text-white font-semibold px-3.5 py-2 rounded-xl transition text-xs shadow-sm"
          >
            <MessageSquare size={14} />
            Escribirle
          </a>
        </div>
      )}

      {/* Mapa de Entrega */}
      {['preparado', 'enviado', 'entregado'].includes(pedido.estado) && (
        <div className="bg-white border border-gray-100 rounded-2xl p-4 shadow-sm space-y-3">
          <div className="text-xs font-bold text-gray-400 uppercase tracking-wider">Ubicación de Entrega</div>
          <div className="relative rounded-xl overflow-hidden bg-gray-50 border border-gray-150 h-48">
            <iframe 
              src={`https://maps.google.com/maps?q=${pedido.geo_lat && pedido.geo_lng ? `${pedido.geo_lat},${pedido.geo_lng}` : encodeURIComponent(`${pedido.direccion ?? ''}, ${pedido.ciudad ?? ''}`)}&z=16&output=embed`} 
              className="w-full h-full border-0" 
              loading="lazy" 
              referrerPolicy="no-referrer-when-downgrade" 
            />
          </div>
          <div className="flex items-center gap-1.5 text-xs text-gray-500">
            <span>📍</span>
            <span>
              {pedido.geo_lat && pedido.geo_lng 
                ? 'Coordenadas GPS confirmadas por el repartidor' 
                : 'Ubicación aproximada basada en la dirección'}
            </span>
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

      {/* Pago y Facturación */}
      {(infoNotas.pago || infoNotas.factura || infoNotas.cleanNotas || comprobantes.length > 0 || pedido.prov_secuencial) && (() => {
        const listadoComprobantes = comprobantes.length > 0 
          ? comprobantes 
          : (pedido.prov_secuencial ? [{
              prov_establecimiento: pedido.prov_establecimiento,
              prov_punto_emision: pedido.prov_punto_emision,
              prov_secuencial: pedido.prov_secuencial,
              prov_costo_real: pedido.prov_costo_real,
              prov_factura_url: pedido.prov_factura_url,
              prov_ruc: pedido.prov_ruc,
              ol_tiendas: { nombre: 'Proveedor' }
            }] : [])

        return (
          <div className="bg-white border border-gray-100 rounded-2xl p-4 shadow-sm space-y-2.5">
            <div className="text-xs font-bold text-gray-400 uppercase tracking-wider">Pago y Facturación</div>
            <div className="space-y-3.5 text-sm">
              {infoNotas.pago && (
                <div className="flex gap-2">
                  <span className="text-gray-400 w-24 shrink-0 font-medium">Forma de pago</span>
                  <span className="text-gray-800 font-semibold">{infoNotas.pago}</span>
                </div>
              )}
              
              {/* Listado de comprobantes de proveedores */}
              {listadoComprobantes.map((comp: any, idx: number) => (
                <div key={idx} className="border-t border-gray-100 pt-2.5 first:border-0 first:pt-0 space-y-1">
                  <p className="text-[11px] font-bold text-gray-500 uppercase tracking-wider mb-1">
                    🛒 Compra en {comp.ol_tiendas?.nombre || 'Proveedor'}
                  </p>
                  <div className="flex gap-2">
                    <span className="text-gray-400 w-24 shrink-0 font-medium">Comprobante</span>
                    <span className="text-gray-800 font-mono font-semibold">
                      {comp.prov_establecimiento}-{comp.prov_punto_emision}-{comp.prov_secuencial}
                    </span>
                  </div>
                  {comp.prov_costo_real && (
                    <div className="flex gap-2">
                      <span className="text-gray-400 w-24 shrink-0 font-medium">Costo Compra</span>
                      <span className="text-gray-800 font-semibold">${Number(comp.prov_costo_real).toFixed(2)}</span>
                    </div>
                  )}
                  {comp.prov_factura_url && (
                    <div className="flex gap-2 pt-0.5">
                      <span className="text-gray-400 w-24 shrink-0 font-medium">Foto Ticket</span>
                      <a 
                        href={comp.prov_factura_url} 
                        target="_blank" 
                        rel="noopener noreferrer"
                        className="text-green-600 hover:text-green-700 font-semibold underline flex items-center gap-1"
                      >
                        Ver comprobante adjunto
                      </a>
                    </div>
                  )}
                </div>
              ))}

              {!pedido.prov_secuencial && infoNotas.factura && listadoComprobantes.length === 0 && (
                <div className="flex gap-2">
                  <span className="text-gray-400 w-24 shrink-0 font-medium">Factura</span>
                  <span className="text-gray-800">{infoNotas.factura}</span>
                </div>
              )}

              {infoNotas.cleanNotas && (
                <div className="flex gap-2 pt-2 border-t border-gray-100">
                  <span className="text-gray-400 w-24 shrink-0 font-medium">Notas</span>
                  <span className="text-gray-650 italic">"{infoNotas.cleanNotas}"</span>
                </div>
              )}
            </div>
          </div>
        )
      })()}

      {/* Productos */}
      <div className="bg-white border border-gray-100 rounded-2xl p-4 shadow-sm space-y-3">
        <div className="text-xs font-bold text-gray-400 uppercase tracking-wider">Productos</div>
        <div className="divide-y divide-gray-50 space-y-2">
          {items.map((it, i) => {
            const showStatus = ['preparado', 'enviado', 'entregado'].includes(pedido.estado)
            const isPicked = it.picking_completado
            const isAgotado = it.picking_agotado
            const isPending = !isPicked && !isAgotado

            return (
              <div key={i} className="flex items-center justify-between text-sm pt-2 first:pt-0 gap-3">
                <div className="flex items-center gap-3 flex-1 min-w-0">
                  {/* Miniature Thumbnail */}
                  <div className="w-10 h-10 rounded-lg bg-gray-50 border border-gray-150 flex items-center justify-center overflow-hidden shrink-0">
                    {it.imagen_url ? (
                      <img src={it.imagen_url} alt={it.descripcion} className="w-full h-full object-contain p-1" />
                    ) : (
                      <Package size={16} className="text-gray-400" />
                    )}
                  </div>
                  
                  <div className="flex-1 min-w-0">
                    <span className={`text-gray-750 block font-medium truncate ${isAgotado ? 'line-through text-gray-400' : ''}`}>
                      {it.descripcion} <span className="text-gray-400 font-normal text-xs">×{it.cantidad}</span>
                    </span>
                    
                    {/* Badge de estado en tiempo real */}
                    {showStatus && (
                      <div className="mt-0.5">
                        {isPicked && (
                          <span className="inline-flex items-center gap-1 text-[10px] font-bold text-green-700 bg-green-50 px-1.5 py-0.5 rounded">
                            🧺 En canasta
                          </span>
                        )}
                        {isAgotado && (
                          <span className="inline-flex items-center gap-1 text-[10px] font-bold text-red-650 bg-red-50 px-1.5 py-0.5 rounded">
                            ❌ No disponible
                          </span>
                        )}
                        {isPending && (
                          <span className="inline-flex items-center gap-1 text-[10px] font-bold text-gray-450 bg-gray-50 px-1.5 py-0.5 rounded">
                            ⏳ Pendiente
                          </span>
                        )}
                      </div>
                    )}
                  </div>
                </div>
                <span className={`text-gray-800 font-semibold shrink-0 ${isAgotado ? 'text-gray-400 line-through' : ''}`}>
                  {fmt(it.precio_unitario * it.cantidad)}
                </span>
              </div>
            )
          })}
        </div>
        <div className="flex justify-between font-bold text-gray-800 border-t border-gray-100 pt-3 mt-1">
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

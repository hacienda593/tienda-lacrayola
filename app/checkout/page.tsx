'use client'
import { useState, useEffect } from 'react'
import { useRouter } from 'next/navigation'
import { getCarrito, totalCarrito, vaciarCarrito, calcularEnvioConsolidado, obtenerTiendasUnicas } from '@/lib/carrito'
import { getPerfil, guardarPerfil, guardarPedidoLocal } from '@/lib/perfil'
import { sumarPuntos } from '@/lib/puntos'
import { sumarPuntosCloud } from '@/lib/puntosCloud'
import { useAuth } from '@/context/AuthContext'
import { crearPedido } from './actions'
import { Loader2, MapPin, Star, CheckCircle } from 'lucide-react'
import { ItemCarrito } from '@/lib/types'
import RecargoEnvioBadge from '@/components/RecargoEnvioBadge'

const WA_NUMERO = '593984341953'

function fmt(n: number) { return '$' + n.toFixed(2) }

function abrirWhatsApp(
  numero: string, 
  nombre: string, 
  items: ItemCarrito[], 
  subtotal: number, 
  costoEnvio: number, 
  granTotal: number, 
  direccion: string, 
  ciudad: string, 
  referencias: string, 
  numeroPedido: number,
  metodoEntrega: 'domicilio' | 'retiro'
) {
  // Agrupar ítems por tienda para el mensaje
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

  const entrega = metodoEntrega === 'retiro' ? 'Retiro en local principal (La Crayola)' : [direccion, ciudad, referencias].filter(Boolean).join(', ')
  const msg = [
    `🛒 *Nuevo pedido #${String(numeroPedido).padStart(4,'0')}*`,
    `👤 *Cliente:* ${nombre}`,
    ``,
    `*Detalle de compra:*`,
    bloques,
    ``,
    `*Resumen:*`,
    `  • Subtotal: ${fmt(subtotal)}`,
    metodoEntrega === 'domicilio' ? `  • Envío Consolidado: ${fmt(costoEnvio)}` : `  • Entrega: Retiro en tienda (Gratis)`,
    `  • *Total a pagar: ${fmt(granTotal)}*`,
    `📍 *Forma de entrega:* ${entrega}`,
  ].filter(l => l !== undefined).join('\n')
  window.open(`https://wa.me/${numero}?text=${encodeURIComponent(msg)}`, '_blank')
}

export default function CheckoutPage() {
  const router = useRouter()
  const { user } = useAuth()
  const [form, setForm] = useState({
    nombre: '', email: '', telefono: '',
    direccion: '', ciudad: 'Los Bancos', referencias: '', notas: ''
  })
  const [geo, setGeo]       = useState<{ lat: number; lng: number } | null>(null)
  const [geoMsg, setGeoMsg] = useState('')
  const [loading, setLoading]   = useState(false)
  const [error, setError]       = useState('')
  const [puntosGanados, setPuntosGanados] = useState<number | null>(null)
  const [metodoEntrega, setMetodoEntrega] = useState<'domicilio' | 'retiro'>('domicilio')

  // Pre-rellenar: Google tiene prioridad, luego perfil local guardado
  useEffect(() => {
    const perfil = getPerfil()
    const nombreGoogle = user?.user_metadata?.full_name || user?.user_metadata?.name || ''
    const emailGoogle  = user?.email || ''
    setForm(f => ({
      ...f,
      nombre:      nombreGoogle || perfil?.nombre      || f.nombre,
      email:       emailGoogle  || perfil?.email       || f.email,
      telefono:    perfil?.telefono   || f.telefono,
      direccion:   perfil?.direccion  || f.direccion,
      ciudad:      perfil?.ciudad     || f.ciudad,
      referencias: perfil?.referencias|| f.referencias,
    }))
  // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [user])

  const items = getCarrito()
  const total = totalCarrito(items)
  const nTiendas = obtenerTiendasUnicas(items).length || (items.length > 0 ? 1 : 0)

  const CRAYOLA_ID = 'b7fe17b9-c3da-4c9f-9a87-169d70623566'
  const esSoloCrayola = items.every(item => !item.tienda_id || item.tienda_id === CRAYOLA_ID)

  useEffect(() => {
    if (!esSoloCrayola) {
      setMetodoEntrega('domicilio')
    }
  }, [esSoloCrayola])

  const costoEnvioBase = calcularEnvioConsolidado(items)
  const costoEnvio = metodoEntrega === 'domicilio' ? costoEnvioBase : 0
  const granTotal = total + costoEnvio

  function set(k: string, v: string) { setForm(f => ({ ...f, [k]: v })) }

  function pedirUbicacion() {
    if (!navigator.geolocation) { setGeoMsg('No disponible'); return }
    setGeoMsg('Obteniendo...')
    navigator.geolocation.getCurrentPosition(
      pos => {
        setGeo({ lat: pos.coords.latitude, lng: pos.coords.longitude })
        setGeoMsg('✓ Ubicación obtenida')
      },
      () => setGeoMsg('No se pudo obtener')
    )
  }

  async function confirmar(e: React.SyntheticEvent<HTMLFormElement>) {
    e.preventDefault()
    if (!form.nombre || !form.telefono) { setError('Nombre y teléfono son obligatorios'); return }
    if (items.length === 0) { setError('El carrito está vacío'); return }
    setError('')
    setLoading(true)

    const resultado = await crearPedido(
      { 
        ...form, 
        direccion: metodoEntrega === 'retiro' ? 'RETIRO EN TIENDA' : form.direccion,
        ciudad: metodoEntrega === 'retiro' ? 'Los Bancos' : form.ciudad,
        referencias: metodoEntrega === 'retiro' ? 'Retiro directo en local' : form.referencias,
        geo_lat: metodoEntrega === 'retiro' ? null : geo?.lat, 
        geo_lng: metodoEntrega === 'retiro' ? null : geo?.lng, 
        user_id: user?.id ?? null 
      },
      items.map(i => ({ codigo: i.codigo, cantidad: i.cantidad }))
    )

    if (!resultado.ok) {
      setError(resultado.error ?? 'Error al procesar pedido')
      setLoading(false)
      return
    }

    // Guardar perfil para próximas compras
    guardarPerfil({
      nombre:      form.nombre,
      email:       form.email,
      telefono:    form.telefono,
      direccion:   form.direccion,
      ciudad:      form.ciudad,
      referencias: form.referencias,
    })

    // Guardar pedido en historial local
    guardarPedidoLocal({
      id:     resultado.pedidoId!,
      numero: resultado.numeroPedido!,
      fecha:  new Date().toISOString(),
      total,
      estado: 'pendiente',
      items:  items.map(i => ({ codigo: i.codigo, descripcion: i.descripcion, cantidad: i.cantidad, precio_unitario: i.precio_unitario })),
    })

    // Sumar puntos: en nube si está registrado, local si es invitado
    let ganados: number
    if (user) {
      ganados = await sumarPuntosCloud(user.id, total)
    } else {
      ganados = sumarPuntos(total)
    }
    setPuntosGanados(ganados)

    vaciarCarrito()

    abrirWhatsApp(
      WA_NUMERO, 
      form.nombre, 
      items, 
      total, 
      costoEnvio,
      granTotal,
      metodoEntrega === 'retiro' ? 'RETIRO EN TIENDA' : form.direccion, 
      metodoEntrega === 'retiro' ? 'Los Bancos' : form.ciudad, 
      metodoEntrega === 'retiro' ? 'Retiro directo en local' : form.referencias, 
      resultado.numeroPedido!,
      metodoEntrega
    )

    setTimeout(() => router.push(`/pedido/${resultado.pedidoId}`), 1800)
  }

  if (items.length === 0 && !puntosGanados) {
    router.replace('/carrito')
    return null
  }

  // Pantalla de éxito brevemente antes de redirigir
  if (puntosGanados !== null) {
    return (
      <div className="max-w-lg mx-auto px-4 py-16 flex flex-col items-center gap-4 text-center">
        <CheckCircle size={56} className="text-green-500" />
        <h2 className="text-xl font-bold text-gray-800">¡Pedido enviado!</h2>
        <div className="flex items-center gap-2 bg-yellow-50 border border-yellow-200 rounded-xl px-5 py-3">
          <Star size={18} className="text-yellow-500 fill-yellow-400" />
          <span className="text-sm font-semibold text-yellow-800">+{puntosGanados} puntos ganados</span>
        </div>
        <p className="text-sm text-gray-500">Redirigiendo al seguimiento...</p>
      </div>
    )
  }

  return (
    <div className="max-w-lg mx-auto px-4 py-4 space-y-4">
      <h1 className="text-base font-bold">Confirmar pedido</h1>

      <form onSubmit={confirmar} className="space-y-4">
        {/* Datos personales */}
        <div className="bg-gray-900 border border-gray-800 rounded-xl p-4 space-y-3">
          <div className="flex items-center justify-between">
            <div className="text-xs font-bold text-gray-400 uppercase tracking-wider">Tus datos</div>
            {user
              ? <span className="flex items-center gap-1 text-[10px] text-green-400">
                  <CheckCircle size={10} /> Cuenta Google
                </span>
              : getPerfil()?.nombre
                ? <span className="text-[10px] text-green-400">✓ Datos guardados</span>
                : null
            }
          </div>

          {/* Avatar Google si está logueado */}
          {user && (
            <div className="flex items-center gap-3 bg-gray-800 rounded-xl px-3 py-2.5">
              {user.user_metadata?.avatar_url
                ? <img src={user.user_metadata.avatar_url} className="w-8 h-8 rounded-full" alt="" />
                : <div className="w-8 h-8 bg-green-700 rounded-full flex items-center justify-center text-white text-xs font-bold">
                    {form.nombre?.[0]?.toUpperCase() || 'U'}
                  </div>
              }
              <div>
                <div className="text-sm font-semibold text-white">{form.nombre || user.email}</div>
                <div className="text-[10px] text-gray-400">{user.email}</div>
              </div>
            </div>
          )}

          {[
            { k: 'nombre',   label: 'Nombre completo *',      type: 'text',  placeholder: 'Juan Pérez',    hidden: !!user },
            { k: 'telefono', label: 'Teléfono / WhatsApp *',  type: 'tel',   placeholder: '0991234567',    hidden: false },
            { k: 'email',    label: 'Email (opcional)',        type: 'email', placeholder: 'juan@email.com', hidden: !!user },
          ].filter(f => !f.hidden).map(({ k, label, type, placeholder }) => (
            <div key={k}>
              <label className="text-xs text-gray-400 block mb-1">{label}</label>
              <input type={type} value={(form as Record<string, string>)[k]}
                onChange={e => set(k, e.target.value)} placeholder={placeholder}
                className="w-full bg-gray-800 border border-gray-700 rounded-lg px-3 py-2 text-sm text-white placeholder-gray-500 focus:outline-none focus:border-green-500" />
            </div>
          ))}
        </div>

        {/* Método de Entrega */}
        <div className="bg-gray-900 border border-gray-800 rounded-xl p-4 space-y-3">
          <div className="text-xs font-bold text-gray-400 uppercase tracking-wider">Método de entrega</div>
          <div className="grid grid-cols-2 gap-2">
            <button
              type="button"
              onClick={() => setMetodoEntrega('domicilio')}
              className={`py-2.5 rounded-xl font-bold text-xs transition border flex flex-col items-center justify-center gap-1 cursor-pointer ${
                metodoEntrega === 'domicilio'
                  ? 'bg-green-600 text-white border-transparent'
                  : 'bg-gray-800 text-gray-400 border-gray-700 hover:bg-gray-700'
              }`}
            >
              <span>🚚 Envío a domicilio</span>
              <span className="text-[10px] font-medium opacity-80">({fmt(costoEnvioBase)})</span>
            </button>
            <button
              type="button"
              disabled={!esSoloCrayola}
              onClick={() => setMetodoEntrega('retiro')}
              className={`py-2.5 rounded-xl font-bold text-xs transition border flex flex-col items-center justify-center gap-1 ${
                !esSoloCrayola
                  ? 'opacity-40 bg-gray-900 text-gray-600 border-gray-800 cursor-not-allowed'
                  : metodoEntrega === 'retiro'
                    ? 'bg-green-600 text-white border-transparent cursor-pointer'
                    : 'bg-gray-800 text-gray-400 border-gray-700 hover:bg-gray-700 cursor-pointer'
              }`}
            >
              <span>🏪 Retiro en tienda</span>
              <span className="text-[10px] font-medium opacity-80">(Gratis)</span>
            </button>
          </div>
          {!esSoloCrayola && (
            <p className="text-[10px] text-orange-400 font-medium leading-relaxed">
              ⚠️ El retiro en tienda no está disponible porque tienes productos de otros locales en tu carrito.
            </p>
          )}
        </div>

        {/* Entrega */}
        {metodoEntrega === 'domicilio' ? (
          <div className="bg-gray-900 border border-gray-800 rounded-xl p-4 space-y-3">
            <div className="flex items-center justify-between">
              <div className="text-xs font-bold text-gray-400 uppercase tracking-wider">Dirección de entrega</div>
              {geo ? (
                <span className="flex items-center gap-1 text-[10px] text-green-400"><MapPin size={10}/>Ubicación obtenida</span>
              ) : (
                <button type="button" onClick={pedirUbicacion}
                  className="flex items-center gap-1 text-[10px] text-gray-400 hover:text-green-400 transition cursor-pointer">
                  <MapPin size={10}/>{geoMsg || 'Compartir ubicación'}
                </button>
              )}
            </div>
            {[
              { k: 'ciudad',      label: 'Ciudad',      placeholder: 'Los Bancos' },
              { k: 'direccion',   label: 'Dirección',   placeholder: 'Calle, número, sector...' },
              { k: 'referencias', label: 'Referencias', placeholder: 'Cerca de, color de casa...' },
            ].map(({ k, label, placeholder }) => (
              <div key={k}>
                <label className="text-xs text-gray-400 block mb-1">{label}</label>
                <input value={(form as Record<string, string>)[k]} onChange={e => set(k, e.target.value)}
                  placeholder={placeholder}
                  className="w-full bg-gray-800 border border-gray-700 rounded-lg px-3 py-2 text-sm text-white placeholder-gray-500 focus:outline-none focus:border-green-500" />
              </div>
            ))}
            <div>
              <label className="text-xs text-gray-400 block mb-1">Notas del pedido</label>
              <textarea value={form.notas} onChange={e => set('notas', e.target.value)}
                rows={2} placeholder="Instrucciones especiales..."
                className="w-full bg-gray-800 border border-gray-700 rounded-lg px-3 py-2 text-sm text-white placeholder-gray-500 focus:outline-none focus:border-green-500 resize-none" />
            </div>
          </div>
        ) : (
          <div className="bg-gray-900 border border-gray-800 rounded-xl p-4 space-y-3">
            <div className="text-xs font-bold text-gray-400 uppercase tracking-wider">Punto de retiro</div>
            <div className="bg-gray-800 rounded-xl p-3 border border-gray-700 text-xs text-gray-300 leading-relaxed space-y-1">
              <p className="font-bold text-white">📍 Local Principal - La Crayola</p>
              <p>Dirección: Av. Principal, San Miguel de los Bancos, Ecuador</p>
              <p>Horario: Lunes a Sábado de 8:00 AM a 6:00 PM</p>
            </div>
            <div>
              <label className="text-xs text-gray-400 block mb-1">Notas para tu retiro (opcional)</label>
              <textarea value={form.notas} onChange={e => set('notas', e.target.value)}
                rows={2} placeholder="¿Quién retirará el pedido? ¿A qué hora pasarás?..."
                className="w-full bg-gray-800 border border-gray-700 rounded-lg px-3 py-2 text-sm text-white placeholder-gray-500 focus:outline-none focus:border-green-500 resize-none" />
            </div>
          </div>
        )}

        {/* Puntos a ganar */}
        <div className="flex items-center gap-2 bg-yellow-50 border border-yellow-200 rounded-xl px-4 py-2.5">
          <Star size={15} className="text-yellow-500 fill-yellow-400 shrink-0" />
          <span className="text-xs text-yellow-800">
            Ganarás <strong>+{Math.floor(total)} puntos</strong> con esta compra
          </span>
        </div>

        {/* Resumen */}
        <div className="bg-gray-900 border border-gray-800 rounded-xl p-4 space-y-3.5">
          <div className="text-xs font-bold text-gray-400 uppercase tracking-wider mb-2">Resumen</div>
          <div className="space-y-1">
            {items.map(i => (
              <div key={i.codigo} className="flex justify-between text-xs text-gray-300">
                <span className="truncate flex-1">{i.descripcion} ×{i.cantidad}</span>
                <span className="ml-2 shrink-0">{fmt(i.precio_unitario * i.cantidad)}</span>
              </div>
            ))}
          </div>

          {/* Recargo por envío consolidado */}
          {metodoEntrega === 'domicilio' && (
            <RecargoEnvioBadge nTiendas={nTiendas} costoTotalEnvio={costoEnvio} />
          )}

          <div className="flex justify-between font-bold text-white border-t border-gray-800 pt-2.5">
            <span>{metodoEntrega === 'domicilio' ? 'Total consolidado' : 'Total a pagar'}</span>
            <span className="text-green-400">{fmt(granTotal)}</span>
          </div>
        </div>

        {error && <p className="text-red-400 text-xs text-center">{error}</p>}

        <button type="submit" disabled={loading}
          className="w-full flex items-center justify-center gap-2 bg-green-600 hover:bg-green-500 disabled:opacity-60 text-white font-bold py-3.5 rounded-xl transition text-sm cursor-pointer">
          {loading ? <><Loader2 size={16} className="animate-spin" />Procesando...</> : <>✅ Confirmar pedido · {fmt(granTotal)}</>}
        </button>

        <p className="text-center text-xs text-gray-500">
          Al confirmar se abrirá WhatsApp para coordinar la entrega y el pago.
        </p>
      </form>
    </div>
  )
}

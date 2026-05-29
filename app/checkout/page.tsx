'use client'
import { useState, useEffect } from 'react'
import { useRouter } from 'next/navigation'
import { getCarrito, totalCarrito, vaciarCarrito } from '@/lib/carrito'
import { getPerfil, guardarPerfil, guardarPedidoLocal } from '@/lib/perfil'
import { sumarPuntos } from '@/lib/puntos'
import { crearPedido } from './actions'
import { Loader2, MapPin, Star, CheckCircle } from 'lucide-react'
import { ItemCarrito } from '@/lib/types'

const WA_NUMERO = '593984341953'

function fmt(n: number) { return '$' + n.toFixed(2) }

function abrirWhatsApp(numero: string, nombre: string, items: ItemCarrito[], total: number, direccion: string, ciudad: string, referencias: string, numeroPedido: number) {
  const lineas = items.map(i => `  • ${i.descripcion} ×${i.cantidad} = ${fmt(i.precio_unitario * i.cantidad)}`).join('\n')
  const entrega = [direccion, ciudad, referencias].filter(Boolean).join(', ')
  const msg = [
    `🛒 *Nuevo pedido #${String(numeroPedido).padStart(4,'0')}*`,
    `👤 ${nombre}`,
    ``,
    `*Productos:*`,
    lineas,
    ``,
    `*Total: ${fmt(total)}*`,
    entrega ? `📍 ${entrega}` : '',
  ].filter(l => l !== undefined).join('\n')
  window.open(`https://wa.me/${numero}?text=${encodeURIComponent(msg)}`, '_blank')
}

export default function CheckoutPage() {
  const router = useRouter()
  const [form, setForm] = useState({
    nombre: '', email: '', telefono: '',
    direccion: '', ciudad: 'Los Bancos', referencias: '', notas: ''
  })
  const [geo, setGeo]       = useState<{ lat: number; lng: number } | null>(null)
  const [geoMsg, setGeoMsg] = useState('')
  const [loading, setLoading]   = useState(false)
  const [error, setError]       = useState('')
  const [puntosGanados, setPuntosGanados] = useState<number | null>(null)

  // Pre-rellenar datos del cliente guardados
  useEffect(() => {
    const perfil = getPerfil()
    if (perfil) {
      setForm(f => ({
        ...f,
        nombre:     perfil.nombre     || f.nombre,
        email:      perfil.email      || f.email,
        telefono:   perfil.telefono   || f.telefono,
        direccion:  perfil.direccion  || f.direccion,
        ciudad:     perfil.ciudad     || f.ciudad,
        referencias:perfil.referencias|| f.referencias,
      }))
    }
  }, [])

  const items = getCarrito()
  const total = totalCarrito(items)

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
      { ...form, geo_lat: geo?.lat, geo_lng: geo?.lng },
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

    // Sumar puntos de fidelización
    const ganados = sumarPuntos(total)
    setPuntosGanados(ganados)

    vaciarCarrito()

    abrirWhatsApp(WA_NUMERO, form.nombre, items, total, form.direccion, form.ciudad, form.referencias, resultado.numeroPedido!)

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
            {getPerfil()?.nombre && (
              <span className="text-[10px] text-green-400">✓ Datos guardados</span>
            )}
          </div>
          {[
            { k: 'nombre',   label: 'Nombre completo *', type: 'text',  placeholder: 'Juan Pérez' },
            { k: 'telefono', label: 'Teléfono / WhatsApp *', type: 'tel', placeholder: '0991234567' },
            { k: 'email',    label: 'Email (opcional)', type: 'email', placeholder: 'juan@email.com' },
          ].map(({ k, label, type, placeholder }) => (
            <div key={k}>
              <label className="text-xs text-gray-400 block mb-1">{label}</label>
              <input type={type} value={(form as Record<string, string>)[k]}
                onChange={e => set(k, e.target.value)} placeholder={placeholder}
                className="w-full bg-gray-800 border border-gray-700 rounded-lg px-3 py-2 text-sm text-white placeholder-gray-500 focus:outline-none focus:border-green-500" />
            </div>
          ))}
        </div>

        {/* Entrega */}
        <div className="bg-gray-900 border border-gray-800 rounded-xl p-4 space-y-3">
          <div className="flex items-center justify-between">
            <div className="text-xs font-bold text-gray-400 uppercase tracking-wider">Dirección de entrega</div>
            {geo ? (
              <span className="flex items-center gap-1 text-[10px] text-green-400"><MapPin size={10}/>Ubicación obtenida</span>
            ) : (
              <button type="button" onClick={pedirUbicacion}
                className="flex items-center gap-1 text-[10px] text-gray-400 hover:text-green-400 transition">
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

        {/* Puntos a ganar */}
        <div className="flex items-center gap-2 bg-yellow-50 border border-yellow-200 rounded-xl px-4 py-2.5">
          <Star size={15} className="text-yellow-500 fill-yellow-400 shrink-0" />
          <span className="text-xs text-yellow-800">
            Ganarás <strong>+{Math.floor(total)} puntos</strong> con esta compra
          </span>
        </div>

        {/* Resumen */}
        <div className="bg-gray-900 border border-gray-800 rounded-xl p-4">
          <div className="text-xs font-bold text-gray-400 uppercase tracking-wider mb-2">Resumen</div>
          <div className="space-y-1 mb-3">
            {items.map(i => (
              <div key={i.codigo} className="flex justify-between text-xs text-gray-300">
                <span className="truncate flex-1">{i.descripcion} ×{i.cantidad}</span>
                <span className="ml-2 shrink-0">{fmt(i.precio_unitario * i.cantidad)}</span>
              </div>
            ))}
          </div>
          <div className="flex justify-between font-bold text-white border-t border-gray-700 pt-2">
            <span>Total</span>
            <span className="text-green-400">{fmt(total)}</span>
          </div>
        </div>

        {error && <p className="text-red-400 text-xs text-center">{error}</p>}

        <button type="submit" disabled={loading}
          className="w-full flex items-center justify-center gap-2 bg-green-600 hover:bg-green-500 disabled:opacity-60 text-white font-bold py-3.5 rounded-xl transition text-sm">
          {loading ? <><Loader2 size={16} className="animate-spin" />Procesando...</> : <>✅ Confirmar pedido · {fmt(total)}</>}
        </button>

        <p className="text-center text-xs text-gray-500">
          Al confirmar se abrirá WhatsApp para coordinar la entrega y el pago.
        </p>
      </form>
    </div>
  )
}

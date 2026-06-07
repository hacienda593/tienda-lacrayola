'use client'
import { useState, useEffect, useRef } from 'react'
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
import { supabase } from '@/lib/supabase'

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
  metodoEntrega: 'domicilio' | 'retiro',
  geo: { lat: number; lng: number } | null,
  pedirUbicacionChat: boolean,
  metodoPago: 'efectivo' | 'transferencia',
  billeteCambio: string,
  facturaConDatos: boolean,
  identificacion: string,
  razonSocial: string,
  correoFactura: string
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
  const gpsLink = metodoEntrega === 'domicilio'
    ? (geo ? `\n📍 *Ubicación GPS:* https://www.google.com/maps?q=${geo.lat},${geo.lng}` : `\n📍 *Ubicación GPS:* ⚠️ (Por favor, comparte tu ubicación actual de WhatsApp por aquí)`)
    : ''

  const notaUbicacion = pedirUbicacionChat && metodoEntrega === 'domicilio'
    ? `\n\n🚚 *Para una entrega sin retrasos:* Por favor, compártenos tu ubicación por aquí (presionando el botón de clip 📎 > Ubicación en tu WhatsApp) para que nuestro repartidor encuentre tu casa fácilmente.`
    : ''

  const pagoMsg = metodoPago === 'efectivo'
    ? `💵 *Pago:* Efectivo (Cambio de: ${billeteCambio})`
    : `🏦 *Pago:* Transferencia Bancaria (Pichincha)`

  const facturaMsg = facturaConDatos
    ? `📄 *Factura:* Con datos\n  • Identificación: ${identificacion}\n  • Razón Social: ${razonSocial}${correoFactura ? `\n  • Correo: ${correoFactura}` : ''}`
    : `📄 *Factura:* Consumidor Final`

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
    ``,
    pagoMsg,
    facturaMsg,
    ``,
    `📍 *Forma de entrega:* ${entrega}${gpsLink}${notaUbicacion}`,
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
  const [pedidoCompletado, setPedidoCompletado] = useState(false)
  const [metodoEntrega, setMetodoEntrega] = useState<'domicilio' | 'retiro'>('domicilio')
  const [metodoPago, setMetodoPago] = useState<'efectivo' | 'transferencia'>('efectivo')
  const [billeteCambio, setBilleteCambio] = useState('Pago exacto')
  const [facturaConDatos, setFacturaConDatos] = useState(false)
  const [identificacion, setIdentificacion] = useState('')
  const [razonSocial, setRazonSocial] = useState('')
  const [correoFactura, setCorreoFactura] = useState('')

  const [verMapa, setVerMapa] = useState(false)
  const [direcciones, setDirecciones] = useState<any[]>([])
  const [direccionSeleccionadaId, setDireccionSeleccionadaId] = useState<string>('nueva')
  const [nombreEtiqueta, setNombreEtiqueta] = useState('')
  const [guardandoDir, setGuardandoDir] = useState(false)
  const [dirMsg, setDirMsg] = useState('')

  const mapContainerRef = useRef<HTMLDivElement | null>(null)
  const mapInstanceRef = useRef<any>(null)
  const markerRef = useRef<any>(null)

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

    if (perfil) {
      if (perfil.identificacion) setIdentificacion(perfil.identificacion)
      if (perfil.razonSocial) setRazonSocial(perfil.razonSocial)
      if (perfil.correoFactura) {
        setCorreoFactura(perfil.correoFactura)
      } else if (emailGoogle || perfil.email) {
        setCorreoFactura(emailGoogle || perfil.email)
      }
    } else if (emailGoogle) {
      setCorreoFactura(emailGoogle)
    }
  // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [user])

  // Cargar direcciones guardadas
  useEffect(() => {
    async function cargarDirecciones() {
      if (user) {
        // Registrado: consultar en Supabase (solo por user_id, 100% seguro)
        const { data } = await supabase
          .from('ol_direcciones_cliente')
          .select('*')
          .eq('user_id', user.id)
        if (data) {
          setDirecciones(data)
        }
      } else {
        // Invitado: cargar localmente de localStorage
        if (typeof window !== 'undefined') {
          try {
            const raw = JSON.parse(localStorage.getItem('lc_direcciones') || 'null')
            setDirecciones(raw || [])
          } catch {
            setDirecciones([])
          }
        }
      }
    }
    cargarDirecciones()
  }, [user])

  function alSeleccionarDireccion(id: string) {
    setDireccionSeleccionadaId(id)
    if (id === 'nueva') {
      setForm(f => ({ ...f, direccion: '', referencias: '', ciudad: 'Los Bancos' }))
      setGeo(null)
      setVerMapa(false)
      return
    }
    const d = direcciones.find(x => x.id === id)
    if (d) {
      setForm(f => ({
        ...f,
        direccion: d.direccion_texto,
        referencias: d.referencias || '',
        ciudad: d.ciudad,
      }))
      setGeo({ lat: d.geo_lat, lng: d.geo_lng })
      setVerMapa(true) // Mostrar mapa centrado en la dirección guardada
    }
  }

  async function guardarDireccionNueva() {
    if (!form.telefono.trim()) { setDirMsg('Ingresa tu teléfono primero'); return }
    if (!form.direccion.trim()) { setDirMsg('Ingresa la dirección'); return }
    if (!geo) { setDirMsg('Obtén tu ubicación GPS en el mapa'); return }
    if (!nombreEtiqueta.trim()) { setDirMsg('Escribe un nombre (ej: Casa)'); return }
    
    setGuardandoDir(true)
    setDirMsg('')

    if (user) {
      // Registrado: guardar en Supabase (seguro, por user_id)
      const { data, error } = await supabase.from('ol_direcciones_cliente')
        .upsert({
          user_id: user.id,
          telefono: form.telefono.trim(),
          nombre_etiqueta: nombreEtiqueta.trim(),
          direccion_texto: form.direccion.trim(),
          ciudad: form.ciudad,
          referencias: form.referencias || null,
          geo_lat: geo.lat,
          geo_lng: geo.lng,
        }, { onConflict: 'user_id,nombre_etiqueta' })
        .select()

      setGuardandoDir(false)
      if (error) {
        setDirMsg('Error al guardar: ' + error.message)
      } else {
        setDirMsg('✓ Guardada con éxito')
        if (data && data[0]) {
          setDirecciones(prev => {
            const filtered = prev.filter(x => x.nombre_etiqueta !== nombreEtiqueta.trim())
            return [...filtered, data[0]]
          })
          setDireccionSeleccionadaId(data[0].id)
          setNombreEtiqueta('')
        }
      }
    } else {
      // Invitado: guardar únicamente en localStorage (100% seguro contra espionaje)
      try {
        const localDir = {
          id: 'local-' + Date.now(),
          user_id: null,
          telefono: form.telefono.trim(),
          nombre_etiqueta: nombreEtiqueta.trim(),
          direccion_texto: form.direccion.trim(),
          ciudad: form.ciudad,
          referencias: form.referencias || null,
          geo_lat: geo.lat,
          geo_lng: geo.lng,
        }
        const prev = JSON.parse(localStorage.getItem('lc_direcciones') || '[]')
        const filtered = prev.filter((x: any) => x.nombre_etiqueta !== nombreEtiqueta.trim())
        const nuevaLista = [...filtered, localDir]
        localStorage.setItem('lc_direcciones', JSON.stringify(nuevaLista))
        setDirecciones(nuevaLista)
        setDireccionSeleccionadaId(localDir.id)
        setNombreEtiqueta('')
        setDirMsg('✓ Guardada en tu dispositivo')
      } catch (err: any) {
        setDirMsg('Error al guardar localmente')
      } finally {
        setGuardandoDir(false)
      }
    }
  }

  // Cargar e inicializar Leaflet dinámicamente
  useEffect(() => {
    if (typeof window === 'undefined' || !mapContainerRef.current || !verMapa) return

    let LInstance: any = null

    async function initMap() {
      LInstance = (await import('leaflet')).default
      await import('leaflet/dist/leaflet.css')

      delete LInstance.Icon.Default.prototype._getIconUrl
      LInstance.Icon.Default.mergeOptions({
        iconRetinaUrl: 'https://cdnjs.cloudflare.com/ajax/libs/leaflet/1.7.1/images/marker-icon-2x.png',
        iconUrl: 'https://cdnjs.cloudflare.com/ajax/libs/leaflet/1.7.1/images/marker-icon.png',
        shadowUrl: 'https://cdnjs.cloudflare.com/ajax/libs/leaflet/1.7.1/images/marker-shadow.png',
      })

      const centerLat = geo?.lat ?? -0.0221
      const centerLng = geo?.lng ?? -78.8983

      if (mapInstanceRef.current) {
        mapInstanceRef.current.remove()
        mapInstanceRef.current = null
      }

      const map = LInstance.map(mapContainerRef.current).setView([centerLat, centerLng], 15)
      mapInstanceRef.current = map

      LInstance.tileLayer('https://{s}.tile.openstreetmap.org/{z}/{x}/{y}.png', {
        attribution: '&copy; OpenStreetMap'
      }).addTo(map)

      const marker = LInstance.marker([centerLat, centerLng], { draggable: true }).addTo(map)
      markerRef.current = marker

      marker.on('dragend', () => {
        const position = marker.getLatLng()
        setGeo({ lat: position.lat, lng: position.lng })
        setGeoMsg('✓ Ubicación del mapa')
        reversoGeocoding(position.lat, position.lng)
      })

      map.on('click', (e: any) => {
        marker.setLatLng(e.latlng)
        setGeo({ lat: e.latlng.lat, lng: e.latlng.lng })
        setGeoMsg('✓ Ubicación del mapa')
        reversoGeocoding(e.latlng.lat, e.latlng.lng)
      })
    }

    initMap()

    return () => {
      if (mapInstanceRef.current) {
        mapInstanceRef.current.remove()
        mapInstanceRef.current = null
      }
    }
  }, [verMapa])

  // Sincronizar mapa si geo cambia externamente
  useEffect(() => {
    if (mapInstanceRef.current && markerRef.current && geo && verMapa) {
      const currentPos = markerRef.current.getLatLng()
      if (Math.abs(currentPos.lat - geo.lat) > 0.00001 || Math.abs(currentPos.lng - geo.lng) > 0.00001) {
        mapInstanceRef.current.setView([geo.lat, geo.lng], 15)
        markerRef.current.setLatLng([geo.lat, geo.lng])
      }
    }
  }, [geo, verMapa])

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

  const requiereDatosLey = granTotal >= 50
  useEffect(() => {
    if (requiereDatosLey) {
      setFacturaConDatos(true)
    }
  }, [requiereDatosLey])

  function set(k: string, v: string) { setForm(f => ({ ...f, [k]: v })) }

  function pedirUbicacion() {
    if (!navigator.geolocation) {
      setGeoMsg('No disponible')
      return
    }
    setGeoMsg('Obteniendo...')

    const options = {
      enableHighAccuracy: true,
      timeout: 8000,
      maximumAge: 0
    }

    navigator.geolocation.getCurrentPosition(
      pos => {
        setGeo({ lat: pos.coords.latitude, lng: pos.coords.longitude })
        setGeoMsg('✓ Ubicación obtenida')
        setVerMapa(true)
        setDireccionSeleccionadaId('nueva')
        reversoGeocoding(pos.coords.latitude, pos.coords.longitude)
      },
      err => {
        console.warn('Fallo GPS alta precisión, intentando red móvil...', err)
        navigator.geolocation.getCurrentPosition(
          pos => {
            setGeo({ lat: pos.coords.latitude, lng: pos.coords.longitude })
            setGeoMsg('✓ Ubicación (red)')
            setVerMapa(true)
            setDireccionSeleccionadaId('nueva')
            reversoGeocoding(pos.coords.latitude, pos.coords.longitude)
          },
          err2 => {
            console.error('Fallo geolocalización total:', err2)
            let msg = 'No se pudo obtener'
            if (err2.code === err2.PERMISSION_DENIED) {
              msg = 'Permiso denegado'
            } else if (err2.code === err2.POSITION_UNAVAILABLE) {
              msg = 'No disponible'
            } else if (err2.code === err2.TIMEOUT) {
              msg = 'Tiempo agotado'
            }
            setGeoMsg(msg)
          },
          { enableHighAccuracy: false, timeout: 8000 }
        )
      },
      options
    )
  }

  async function reversoGeocoding(lat: number, lng: number) {
    try {
      const res = await fetch(`https://nominatim.openstreetmap.org/reverse?format=jsonv2&lat=${lat}&lon=${lng}`, {
        headers: {
          'User-Agent': 'TiendaLaCrayola/1.0'
        }
      })
      if (!res.ok) return
      const data = await res.json()
      if (data) {
        const addr = data.address || {}
        const calle = addr.road || addr.pedestrian || addr.path || addr.footway || ''
        const num = addr.house_number || ''
        const sector = addr.neighbourhood || addr.suburb || addr.village || addr.hamlet || ''
        
        let direccionFormateada = [calle, num, sector].filter(Boolean).join(', ')
        if (!direccionFormateada && data.display_name) {
          direccionFormateada = data.display_name.split(',').slice(0, 3).join(',').trim()
        }
        
        const ciudadFormateada = addr.town || addr.city || addr.village || addr.municipality || 'Los Bancos'
        
        if (direccionFormateada) {
          setForm(f => ({ ...f, direccion: direccionFormateada, ciudad: ciudadFormateada }))
        }
      }
    } catch (err) {
      console.error('Error reverse geocoding:', err)
    }
  }

  async function confirmar(e: React.SyntheticEvent<HTMLFormElement>) {
    e.preventDefault()
    if (!form.nombre || !form.telefono) { setError('Nombre y teléfono son obligatorios'); return }
    if (items.length === 0) { setError('El carrito está vacío'); return }
    
    if (facturaConDatos) {
      if (!identificacion.trim()) { setError('La identificación (Cédula/RUC) es obligatoria para la factura.'); return }
      if (!razonSocial.trim()) { setError('La razón social o nombre es obligatorio para la factura.'); return }
    }
    
    setError('')
    setLoading(true)

    // Formatear notas con tags de pago y facturación para no alterar el esquema de BD
    const pagoText = metodoPago === 'efectivo'
      ? `Efectivo (Cambio de: ${billeteCambio})`
      : 'Transferencia Bancaria'
    const facturaText = facturaConDatos
      ? `RUC/Cédula: ${identificacion.trim()} | Razón Social: ${razonSocial.trim()} | Correo: ${correoFactura.trim() || 'Sin correo'}`
      : 'Consumidor Final'
      
    const tagPago = `[PAGO: ${pagoText}]`
    const tagFactura = `[FACTURA: ${facturaText}]`
    const notasFinales = [tagPago, tagFactura, form.notas.trim()].filter(Boolean).join(' ')

    const resultado = await crearPedido(
      { 
        ...form, 
        notas: notasFinales,
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

    // Guardar perfil para próximas compras (incluye datos de facturación)
    guardarPerfil({
      nombre:      form.nombre,
      email:       form.email,
      telefono:    form.telefono,
      direccion:   form.direccion,
      ciudad:      form.ciudad,
      referencias: form.referencias,
      identificacion: identificacion.trim(),
      razonSocial:    razonSocial.trim(),
      correoFactura:  correoFactura.trim(),
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

    // Sumar puntos: registrados en la nube, invitados localmente
    let ganados = 0
    if (user) {
      ganados = await sumarPuntosCloud(user.id, total)
      setPuntosGanados(ganados)
    } else {
      ganados = sumarPuntos(total)
      setPuntosGanados(ganados)
    }

    vaciarCarrito()
    setPedidoCompletado(true)

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
      metodoEntrega,
      metodoEntrega === 'retiro' ? null : geo,
      direccionSeleccionadaId === 'nueva',
      metodoPago,
      billeteCambio,
      facturaConDatos,
      identificacion.trim(),
      razonSocial.trim(),
      correoFactura.trim()
    )

    setTimeout(() => router.push(`/pedido/${resultado.pedidoId}`), 1800)
  }

  if (items.length === 0 && !pedidoCompletado) {
    router.replace('/carrito')
    return null
  }

  // Pantalla de éxito brevemente antes de redirigir
  if (pedidoCompletado) {
    return (
      <div className="max-w-lg mx-auto px-4 py-16 flex flex-col items-center gap-4 text-center">
        <CheckCircle size={56} className="text-green-500" />
        <h2 className="text-xl font-bold text-gray-800">¡Pedido enviado!</h2>
        {puntosGanados !== null && puntosGanados > 0 && (
          <div className="flex items-center gap-2 bg-yellow-50 border border-yellow-200 rounded-xl px-5 py-3">
            <Star size={18} className="text-yellow-500 fill-yellow-400" />
            <span className="text-sm font-semibold text-yellow-800">
              {user ? `+${puntosGanados} puntos ganados` : `+${puntosGanados} puntos temporales acumulados`}
            </span>
          </div>
        )}
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
          ].filter(f => !f.hidden).map(({ k, label, type, placeholder }) => (
            <div key={k}>
              <label className="text-xs text-gray-400 block mb-1">{label}</label>
              <input type={type} value={(form as Record<string, string>)[k]}
                onChange={e => set(k, e.target.value)} placeholder={placeholder}
                className="w-full bg-gray-800 border border-gray-700 rounded-lg px-3 py-2 text-sm text-white placeholder-gray-500 focus:outline-none focus:border-green-500" />
            </div>
          ))}
        </div>

        {/* Facturación */}
        <div className="bg-gray-900 border border-gray-800 rounded-xl p-4 space-y-3">
          <div className="flex items-center justify-between">
            <div className="text-xs font-bold text-gray-400 uppercase tracking-wider">Facturación</div>
            {requiereDatosLey && (
              <span className="text-[9px] bg-red-950 text-red-400 border border-red-900 rounded px-1.5 py-0.5 font-bold uppercase tracking-wider">
                Requerido por Ley
              </span>
            )}
          </div>

          <label className="flex items-center gap-2.5 cursor-pointer select-none">
            <input
              type="checkbox"
              checked={facturaConDatos}
              disabled={requiereDatosLey}
              onChange={(e) => setFacturaConDatos(e.target.checked)}
              className="w-4 h-4 rounded border-gray-700 bg-gray-800 text-green-600 focus:ring-green-500 focus:ring-offset-gray-900 disabled:opacity-50"
            />
            <span className="text-xs text-gray-200 font-medium">
              ¿Necesitas factura con datos?
            </span>
          </label>

          {requiereDatosLey && (
            <div className="bg-orange-950/40 border border-orange-900/40 rounded-xl p-3 text-[11px] text-orange-200 leading-relaxed">
              ⚠️ <strong>Control de Facturación (SRI):</strong> De acuerdo con la normativa legal de Ecuador, las transacciones de <strong>$50.00 o más</strong> requieren obligatoriamente datos de facturación (no se permite Consumidor Final).
            </div>
          )}

          {facturaConDatos ? (
            <div className="space-y-2.5 border-t border-gray-800 pt-3 transition-all">
              <div>
                <label className="text-xs text-gray-400 block mb-1">Identificación (Cédula o RUC) *</label>
                <input
                  type="text"
                  value={identificacion}
                  onChange={(e) => setIdentificacion(e.target.value)}
                  placeholder="Ej: 1726384920 o 1793081928001"
                  className="w-full bg-gray-800 border border-gray-700 rounded-lg px-3 py-2 text-sm text-white placeholder-gray-500 focus:outline-none focus:border-green-500"
                />
              </div>
              <div>
                <label className="text-xs text-gray-400 block mb-1">Razón Social / Nombre Completo *</label>
                <input
                  type="text"
                  value={razonSocial}
                  onChange={(e) => setRazonSocial(e.target.value)}
                  placeholder="Ej: Juan Pérez o Empresa S.A."
                  className="w-full bg-gray-800 border border-gray-700 rounded-lg px-3 py-2 text-sm text-white placeholder-gray-500 focus:outline-none focus:border-green-500"
                />
              </div>
              <div>
                <label className="text-xs text-gray-400 block mb-1">Correo Electrónico para Factura (Opcional)</label>
                <input
                  type="email"
                  value={correoFactura}
                  onChange={(e) => setCorreoFactura(e.target.value)}
                  placeholder="Ej: factura@cliente.com"
                  className="w-full bg-gray-800 border border-gray-700 rounded-lg px-3 py-2 text-sm text-white placeholder-gray-500 focus:outline-none focus:border-green-500"
                />
              </div>
            </div>
          ) : (
            <p className="text-[11px] text-gray-500 italic leading-relaxed">
              Se emitirá la factura como <strong>Consumidor Final</strong> (sin identificación ni datos detallados).
            </p>
          )}
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
              {geoMsg && (
                <span className={`text-[10px] font-semibold ${
                  geoMsg.includes('denegado') || geoMsg.includes('No') || geoMsg.includes('agotado')
                    ? 'text-orange-400'
                    : 'text-green-400'
                }`}>{geoMsg}</span>
              )}
            </div>

            <div className="flex gap-3 justify-end border-b border-gray-800 pb-2">
              <button type="button" onClick={pedirUbicacion}
                className="flex items-center gap-1 text-[10px] text-gray-400 hover:text-green-400 transition cursor-pointer">
                <MapPin size={10}/> Obtener GPS
              </button>
              <button type="button" onClick={() => {
                if (!geo) {
                  setGeo({ lat: -0.0221, lng: -78.8983 })
                  setGeoMsg('✓ Ubicación manual')
                }
                setVerMapa(!verMapa)
                setDireccionSeleccionadaId('nueva')
              }}
                className="flex items-center gap-1 text-[10px] text-green-400 hover:text-green-300 font-bold underline cursor-pointer">
                🗺️ {verMapa ? 'Ocultar mapa' : 'Ver mapa'}
              </button>
            </div>

            {/* Selector de direcciones guardadas */}
            {direcciones.length > 0 && (
              <div className="border-b border-gray-800 pb-3">
                <label className="text-xs text-gray-400 block mb-1">📍 Mis direcciones guardadas</label>
                <select
                  value={direccionSeleccionadaId}
                  onChange={e => alSeleccionarDireccion(e.target.value)}
                  className="w-full bg-gray-800 border border-gray-700 rounded-lg px-3 py-2 text-sm text-white focus:outline-none focus:border-green-500"
                >
                  <option value="nueva">-- Nueva dirección / Ingresar otra --</option>
                  {direcciones.map(d => (
                    <option key={d.id} value={d.id}>
                      📌 {d.nombre_etiqueta} ({d.direccion_texto})
                    </option>
                  ))}
                </select>
              </div>
            )}

            {/* Mapa interactivo */}
            {verMapa && (
              <div className="space-y-1.5 border-b border-gray-800 pb-3">
                <div className="text-[10px] text-gray-400 flex items-center justify-between">
                  <span>📍 Arrastra la chincheta sobre tu ubicación exacta:</span>
                  <div className="flex gap-2.5">
                    <button type="button" onClick={pedirUbicacion} className="text-green-400 hover:underline">📡 Obtener GPS</button>
                    <button type="button" onClick={() => setVerMapa(false)} className="text-red-400 hover:underline">Ocultar</button>
                  </div>
                </div>
                {geoMsg?.includes('denegado') && (
                  <div className="bg-yellow-950/40 border border-yellow-850/40 rounded-xl p-3 text-[11px] text-yellow-200 leading-relaxed">
                    💡 <strong>GPS bloqueado:</strong> Puedes activarlo tocando el candado/ajustes ⚙️ en la barra de direcciones de tu navegador (arriba) y permitiendo la ubicación. Si no sabes cómo, puedes arrastrar la chincheta azul en el mapa, o simplemente <strong>enviarnos tu ubicación de WhatsApp</strong> al finalizar el pedido.
                  </div>
                )}
                <div 
                  ref={mapContainerRef} 
                  className="w-full h-[220px] rounded-xl border border-gray-800 bg-gray-950 overflow-hidden relative z-10" 
                />
                {geo && (
                  <div className="text-[9px] text-gray-500 text-right">
                    Lat: {geo.lat.toFixed(5)} · Lng: {geo.lng.toFixed(5)}
                  </div>
                )}
              </div>
            )}

            {/* Guardar nueva dirección */}
            {direccionSeleccionadaId === 'nueva' && geo && (
              <div className="bg-gray-800/40 border border-gray-800 rounded-xl p-3 space-y-2">
                <div className="text-[11px] font-semibold text-gray-300">💾 ¿Quieres guardar esta ubicación para futuras compras?</div>
                <div className="flex gap-2">
                  <input 
                    value={nombreEtiqueta} 
                    onChange={e => setNombreEtiqueta(e.target.value)}
                    placeholder="Nombre (ej: Casa, Trabajo, Escuela...)"
                    className="flex-1 bg-gray-900 border border-gray-700 rounded-lg px-3 py-1.5 text-xs text-white placeholder-gray-500 focus:outline-none focus:border-green-500" 
                  />
                  <button 
                    type="button" 
                    onClick={guardarDireccionNueva} 
                    disabled={guardandoDir}
                    className="bg-green-600 hover:bg-green-500 disabled:opacity-60 text-white font-bold px-3 py-1.5 rounded-lg text-xs transition cursor-pointer"
                  >
                    {guardandoDir ? 'Guardando...' : 'Guardar'}
                  </button>
                </div>
                {dirMsg && <p className="text-[10px] text-green-400 font-semibold">{dirMsg}</p>}
              </div>
            )}
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
            {user ? (
              <>Ganarás <strong>+{Math.floor(total)} puntos</strong> con esta compra</>
            ) : (
              <>Ganarás <strong>+{Math.floor(total)} puntos temporales</strong>. Regístrate para guardarlos de forma permanente y poder canjearlos.</>
            )}
          </span>
        </div>

        {/* Forma de Pago */}
        <div className="bg-gray-900 border border-gray-800 rounded-xl p-4 space-y-3">
          <div className="text-xs font-bold text-gray-400 uppercase tracking-wider">Forma de pago</div>
          <div className="grid grid-cols-2 gap-2">
            <button
              type="button"
              onClick={() => setMetodoPago('efectivo')}
              className={`py-2.5 rounded-xl font-bold text-xs transition border flex flex-col items-center justify-center gap-1 cursor-pointer ${
                metodoPago === 'efectivo'
                  ? 'bg-green-600 text-white border-transparent'
                  : 'bg-gray-800 text-gray-400 border-gray-700 hover:bg-gray-750'
              }`}
            >
              <span>💵 Efectivo al recibir</span>
              <span className="text-[9px] font-medium opacity-80">Paga al recibir pedido</span>
            </button>
            <button
              type="button"
              onClick={() => setMetodoPago('transferencia')}
              className={`py-2.5 rounded-xl font-bold text-xs transition border flex flex-col items-center justify-center gap-1 cursor-pointer ${
                metodoPago === 'transferencia'
                  ? 'bg-green-600 text-white border-transparent'
                  : 'bg-gray-800 text-gray-400 border-gray-700 hover:bg-gray-750'
              }`}
            >
              <span>🏦 Transferencia Bancaria</span>
              <span className="text-[9px] font-medium opacity-80">Banco Pichincha</span>
            </button>
          </div>

          {metodoPago === 'efectivo' && (
            <div className="space-y-2 bg-gray-800/40 border border-gray-800 rounded-xl p-3">
              <label className="text-xs text-gray-400 block font-medium">¿Con cuánto pagarás? (Para llevar sueltos)</label>
              <select
                value={billeteCambio}
                onChange={e => setBilleteCambio(e.target.value)}
                className="w-full bg-gray-800 border border-gray-700 rounded-lg px-3 py-2 text-sm text-white focus:outline-none focus:border-green-500"
              >
                <option value="Pago exacto">Tengo el pago exacto</option>
                <option value="Billete de $5">Billete de $5</option>
                <option value="Billete de $10">Billete de $10</option>
                <option value="Billete de $20">Billete de $20</option>
                <option value="Billete de $50">Billete de $50</option>
                <option value="Billete de $100">Billete de $100</option>
              </select>
            </div>
          )}

          {metodoPago === 'transferencia' && (
            <div className="bg-gray-800/50 border border-gray-800 rounded-xl p-3 space-y-2">
              <div className="text-[11px] font-bold text-green-400 uppercase tracking-wider">Datos de transferencia:</div>
              <div className="space-y-1.5 text-xs text-gray-300">
                <div className="flex justify-between border-b border-gray-800/60 pb-1">
                  <span className="text-gray-500">Banco</span>
                  <span className="font-semibold text-white">Banco Pichincha</span>
                </div>
                <div className="flex justify-between border-b border-gray-800/60 pb-1">
                  <span className="text-gray-500">Tipo de Cuenta</span>
                  <span className="font-medium text-white">Cuenta de Ahorros</span>
                </div>
                <div className="flex justify-between border-b border-gray-800/60 pb-1">
                  <span className="text-gray-500">Nro. de Cuenta</span>
                  <span className="font-bold text-green-400 select-all">2208546193</span>
                </div>
                <div className="flex justify-between border-b border-gray-800/60 pb-1">
                  <span className="text-gray-500">Beneficiario</span>
                  <span className="font-medium text-white">La Crayola</span>
                </div>
                <div className="flex justify-between border-b border-gray-800/60 pb-1">
                  <span className="text-gray-500">RUC / Identificación</span>
                  <span className="font-medium text-white select-all">1793081928001</span>
                </div>
                <div className="flex justify-between">
                  <span className="text-gray-500">Correo</span>
                  <span className="font-medium text-gray-300 select-all">pagos@lacrayola.com</span>
                </div>
              </div>
              <div className="text-[10px] text-gray-400 leading-relaxed border-t border-gray-800 pt-2 flex items-start gap-1">
                <span>💡</span>
                <span>Por favor, realiza la transferencia y envíanos el comprobante por WhatsApp al terminar. Tu pedido será procesado una vez verificado.</span>
              </div>
            </div>
          )}
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

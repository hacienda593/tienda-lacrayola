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
  ventanaPrevia: Window | null,
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
  const url = `https://wa.me/${numero}?text=${encodeURIComponent(msg)}`
  // Reutiliza la pestaña reservada en el clic original (ver comentario en
  // confirmar()) en vez de abrir una nueva -- esa segunda llamada a
  // window.open() sí sería bloqueada por el navegador.
  if (ventanaPrevia && !ventanaPrevia.closed) {
    ventanaPrevia.location.href = url
  } else {
    window.open(url, '_blank')
  }
}

export default function CheckoutPage() {
  const router = useRouter()
  const { user, loginGoogle } = useAuth()
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
  const [referenciaTransferencia, setReferenciaTransferencia] = useState('')
  const [comprobanteFile, setComprobanteFile] = useState<File | null>(null)
  const [comprobantePreview, setComprobantePreview] = useState<string | null>(null)
  const [comprobanteError, setComprobanteError] = useState('')
  const [subiendoComprobante, setSubiendoComprobante] = useState(false)
  const [facturaConDatos, setFacturaConDatos] = useState(false)
  const [identificacion, setIdentificacion] = useState('')
  const [razonSocial, setRazonSocial] = useState('')
  const [correoFactura, setCorreoFactura] = useState('')
  const [items, setItems] = useState<ItemCarrito[]>([])
  const [cargandoCarrito, setCargandoCarrito] = useState(true)
  // Antifraude: sin historial de compras ENTREGADAS con ese telefono, el
  // checkout obliga a pagar por transferencia (evita pedidos COD "de
  // broma" donde nadie recibe ni paga). Es solo la UX -- la validacion que
  // de verdad protege corre en el servidor, en crearPedido().
  const [esClienteNuevo, setEsClienteNuevo] = useState(false)
  const [verificandoHistorial, setVerificandoHistorial] = useState(false)

  useEffect(() => {
    setItems(getCarrito())
    setCargandoCarrito(false)
  }, [])

  // Redirigir si el carrito está vacío (seguro para SSR)
  useEffect(() => {
    if (!cargandoCarrito && items.length === 0 && !pedidoCompletado) {
      router.replace('/carrito')
    }
  }, [cargandoCarrito, items, pedidoCompletado, router])

  const [verMapa, setVerMapa] = useState(false)
  const [direcciones, setDirecciones] = useState<any[]>([])
  const [direccionSeleccionadaId, setDireccionSeleccionadaId] = useState<string>('nueva')
  // Controla si la lista de tarjetas de direcciones esta abierta. Una vez hay
  // una direccion guardada activa, la lista se colapsa y solo se ve el
  // resumen compacto -- "Cambiar" la vuelve a abrir. Sin esto, la lista y el
  // resumen quedaban visibles al mismo tiempo mostrando el mismo dato dos veces.
  const [eligiendoDireccion, setEligiendoDireccion] = useState(false)
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

  // Antifraude: apenas el telefono tiene forma valida, se consulta (debounced,
  // via RPC que no expone datos de otros pedidos) si ese numero ya tiene al
  // menos una compra ENTREGADA. Si no, se bloquea "Efectivo al recibir" y se
  // fuerza transferencia -- pero la garantia real esta en el servidor.
  useEffect(() => {
    const telefonoLimpio = form.telefono.trim()
    if (telefonoLimpio.length < 9) { setEsClienteNuevo(false); return }

    let vigente = true
    setVerificandoHistorial(true)
    const timer = setTimeout(async () => {
      const { data, error } = await supabase.rpc('cliente_tiene_historial', { p_telefono: telefonoLimpio })
      if (!vigente) return
      setVerificandoHistorial(false)
      // Fallar CERRADO, no abierto: si la verificacion no responde (ej. la
      // funcion RPC no existe todavia, o hubo un corte de red), se trata
      // igual que "cliente nuevo" -- exactamente lo mismo que ya hace el
      // servidor en crearPedido(). Antes esto fallaba al reves (asumia que
      // NO era nuevo), lo que dejaba ver "Efectivo" habilitado en pantalla
      // aunque el servidor lo iba a rechazar al confirmar.
      const nuevo = Boolean(error) || data !== true
      setEsClienteNuevo(nuevo)
      if (nuevo) setMetodoPago('transferencia')
    }, 500)

    return () => { vigente = false; clearTimeout(timer) }
  }, [form.telefono])

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

  const total = totalCarrito(items)
  const nTiendas = obtenerTiendasUnicas(items).length || (items.length > 0 ? 1 : 0)

  const CRAYOLA_ID = 'b7fe17b9-c3da-4c9f-9a87-169d70623566'
  const esSoloCrayola = items.every(item => !item.tienda_id || item.tienda_id === CRAYOLA_ID)

  // Cuando el cliente eligio una direccion ya guardada (no "nueva"), no tiene
  // sentido mostrarle de nuevo los campos editables ni el mapa -- se muestra
  // un resumen compacto en su lugar, como en checkouts de apps mas maduras.
  const direccionGuardadaActiva = direcciones.find(d => d.id === direccionSeleccionadaId)

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

  async function reversoGeocoding(lat: number, lng: number, reintentando = false) {
    try {
      const res = await fetch(`https://nominatim.openstreetmap.org/reverse?format=jsonv2&lat=${lat}&lon=${lng}`, {
        headers: {
          'User-Agent': 'TiendaLaCrayola/1.0'
        }
      })
      if (!res.ok) throw new Error(`HTTP ${res.status}`)
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
        } else {
          setGeoMsg('✓ Ubicación marcada — completa la dirección a mano')
        }
      }
    } catch (err) {
      console.error('Error reverse geocoding:', err)
      if (!reintentando) {
        setTimeout(() => reversoGeocoding(lat, lng, true), 1200)
      } else {
        setGeoMsg('No pudimos autocompletar la dirección — escríbela abajo')
      }
    }
  }

  async function subirComprobante(file: File): Promise<string> {
    const ext = (file.name.split('.').pop() || 'jpg').toLowerCase().replace(/[^a-z0-9]/g, '') || 'jpg'
    const path = `pendientes/${Date.now()}-${Math.random().toString(36).slice(2)}.${ext}`
    const { error } = await supabase.storage
      .from('comprobantes-clientes')
      .upload(path, file, { cacheControl: '3600', upsert: false, contentType: file.type || 'image/jpeg' })
    if (error) throw error
    return path
  }

  async function confirmar(e: React.SyntheticEvent<HTMLFormElement>) {
    e.preventDefault()
    if (!form.nombre || !form.telefono) { setError('Nombre y teléfono son obligatorios'); return }
    if (items.length === 0) { setError('El carrito está vacío'); return }
    
    if (facturaConDatos) {
      if (!identificacion.trim()) { setError('La identificación (Cédula/RUC) es obligatoria para la factura.'); return }
      if (!razonSocial.trim()) { setError('La razón social o nombre es obligatorio para la factura.'); return }
    }
    
    if (metodoPago === 'transferencia' && !referenciaTransferencia.trim()) {
      setError('Por favor, ingresa el número de referencia o comprobante de tu transferencia.')
      setLoading(false)
      return
    }
    if (metodoPago === 'transferencia' && !comprobanteFile) {
      setError('Por favor, adjunta una foto o captura del comprobante de tu transferencia.')
      setLoading(false)
      return
    }

    setError('')
    setLoading(true)

    // Se reserva la pestaña de WhatsApp AQUI MISMO, en el mismo tick del
    // clic del usuario -- si se abre despues (tras el await de la subida
    // del comprobante o de crearPedido), el navegador ya no lo reconoce
    // como resultado directo de un gesto del usuario y bloquea el
    // window.open() como si fuera un pop-up. Se le pone la URL real recien
    // al final, cuando ya se sabe el numero de pedido.
    const ventanaWhatsApp = window.open('', '_blank')

    let comprobantePath: string | null = null
    if (metodoPago === 'transferencia' && comprobanteFile) {
      setSubiendoComprobante(true)
      try {
        comprobantePath = await subirComprobante(comprobanteFile)
      } catch (err) {
        console.error('Error al subir comprobante:', err)
        setSubiendoComprobante(false)
        ventanaWhatsApp?.close()
        setError('No se pudo subir la foto del comprobante. Verifica tu conexión e intenta de nuevo.')
        setLoading(false)
        return
      }
      setSubiendoComprobante(false)
    }

    // Formatear notas con tags de pago y facturación para no alterar el esquema de BD
    const pagoText = metodoPago === 'efectivo'
      ? `Efectivo (Cambio de: ${billeteCambio})`
      : `Transferencia Bancaria (Ref: ${referenciaTransferencia.trim()})`
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
        user_id: user?.id ?? null,
        referencia_transferencia: metodoPago === 'transferencia' ? referenciaTransferencia.trim() : null,
        comprobante_transferencia_path: metodoPago === 'transferencia' ? comprobantePath : null,
        metodo_pago: metodoPago === 'transferencia' ? 'transferencia' : 'contra_entrega'
      },
      items.map(i => ({
        codigo: i.codigo,
        cantidad: i.cantidad,
        precio_unitario: i.precio_unitario,
        descripcion: i.descripcion,
        categoria: i.categoria,
        detallesImpresion: i.detallesImpresion
      }))
    )

    if (!resultado.ok) {
      ventanaWhatsApp?.close()
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
      ventanaWhatsApp,
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

  if (cargandoCarrito) {
    return (
      <div className="max-w-lg mx-auto px-4 py-20 flex flex-col items-center justify-center gap-3">
        <Loader2 className="w-10 h-10 animate-spin text-pine" />
        <p className="text-sm font-bold text-ink-faint">Cargando tu pedido...</p>
      </div>
    )
  }

  if (items.length === 0 && !pedidoCompletado) {
    return null
  }

  // Pantalla de éxito brevemente antes de redirigir
  if (pedidoCompletado) {
    return (
      <div className="max-w-lg mx-auto px-4 py-16 flex flex-col items-center gap-4 text-center">
        <CheckCircle size={56} className="text-pine" />
        <h2 className="font-display text-xl font-bold text-ink">¡Pedido enviado!</h2>
        {puntosGanados !== null && puntosGanados > 0 && (
          <div className="flex items-center gap-2 bg-wheat/10 border border-wheat/30 rounded-xl px-5 py-3">
            <Star size={18} className="text-wheat fill-wheat" />
            <span className="text-sm font-semibold text-wheat">
              {user ? `+${puntosGanados} puntos ganados` : `+${puntosGanados} puntos temporales acumulados`}
            </span>
          </div>
        )}
        <p className="text-sm text-ink-faint">Redirigiendo al seguimiento...</p>
      </div>
    )
  }

  return (
    <div className="max-w-lg mx-auto px-4 py-4 space-y-4 font-ui">
      <h1 className="font-display text-lg font-bold text-ink">Confirmar pedido</h1>

      <form onSubmit={confirmar} className="space-y-4">
        {/* Datos personales */}
        <div className="bg-white border border-line rounded-xl p-4 space-y-3">
          <div className="flex items-center justify-between">
            <div className="text-xs font-bold text-ink-faint uppercase tracking-wider">Tus datos</div>
            {user
              ? <span className="flex items-center gap-1 text-[10px] text-pine">
                  <CheckCircle size={10} /> Cuenta Google
                </span>
              : getPerfil()?.nombre
                ? <span className="text-[10px] text-pine">✓ Datos guardados</span>
                : null
            }
          </div>

          {/* Avatar Google si está logueado */}
          {user && (
            <div className="flex items-center gap-3 bg-surface-2 rounded-xl px-3 py-2.5">
              {user.user_metadata?.avatar_url
                ? <img src={user.user_metadata.avatar_url} className="w-8 h-8 rounded-full" alt="" />
                : <div className="w-8 h-8 bg-pine-deep rounded-full flex items-center justify-center text-white text-xs font-bold">
                    {form.nombre?.[0]?.toUpperCase() || 'U'}
                  </div>
              }
              <div>
                <div className="text-sm font-semibold text-ink">{form.nombre || user.email}</div>
                <div className="text-[10px] text-ink-faint">{user.email}</div>
              </div>
            </div>
          )}

          {[
            { k: 'nombre',   label: 'Nombre completo *',      type: 'text',  placeholder: 'Juan Pérez',    hidden: !!user },
            { k: 'telefono', label: 'Teléfono / WhatsApp *',  type: 'tel',   placeholder: '0991234567',    hidden: false },
          ].filter(f => !f.hidden).map(({ k, label, type, placeholder }) => (
            <div key={k}>
              <label className="text-xs text-ink-faint block mb-1">{label}</label>
              <input type={type} value={(form as Record<string, string>)[k]}
                onChange={e => set(k, e.target.value)} placeholder={placeholder}
                className="w-full bg-surface-2 border border-line rounded-lg px-3 py-2 text-sm text-ink placeholder-ink-faint focus:outline-none focus:border-pine" />
            </div>
          ))}
        </div>

        {/* Facturación */}
        <div className="bg-white border border-line rounded-xl p-4 space-y-3">
          <div className="flex items-center justify-between">
            <div className="text-xs font-bold text-ink-faint uppercase tracking-wider">Facturación</div>
            {requiereDatosLey && (
              <span className="text-[9px] bg-sale/10 text-sale border border-sale/30 rounded px-1.5 py-0.5 font-bold uppercase tracking-wider">
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
              className="w-4 h-4 rounded border-line bg-surface-2 text-pine focus:ring-pine focus:ring-offset-white disabled:opacity-50"
            />
            <span className="text-xs text-ink-soft font-medium">
              ¿Necesitas factura con datos?
            </span>
          </label>

          {requiereDatosLey && (
            <div className="bg-wheat/10 border border-wheat/30 rounded-xl p-3 text-[11px] text-wheat leading-relaxed">
              ⚠️ <strong>Control de Facturación (SRI):</strong> De acuerdo con la normativa legal de Ecuador, las transacciones de <strong>$50.00 o más</strong> requieren obligatoriamente datos de facturación (no se permite Consumidor Final).
            </div>
          )}

          {facturaConDatos ? (
            <div className="space-y-2.5 border-t border-line pt-3 transition-all">
              <div>
                <label className="text-xs text-ink-faint block mb-1">Identificación (Cédula o RUC) *</label>
                <input
                  type="text"
                  value={identificacion}
                  onChange={(e) => setIdentificacion(e.target.value)}
                  placeholder="Ej: 1726384920 o 1793081928001"
                  className="w-full bg-surface-2 border border-line rounded-lg px-3 py-2 text-sm text-ink placeholder-ink-faint focus:outline-none focus:border-pine"
                />
              </div>
              <div>
                <label className="text-xs text-ink-faint block mb-1">Razón Social / Nombre Completo *</label>
                <input
                  type="text"
                  value={razonSocial}
                  onChange={(e) => setRazonSocial(e.target.value)}
                  placeholder="Ej: Juan Pérez o Empresa S.A."
                  className="w-full bg-surface-2 border border-line rounded-lg px-3 py-2 text-sm text-ink placeholder-ink-faint focus:outline-none focus:border-pine"
                />
              </div>
              <div>
                <label className="text-xs text-ink-faint block mb-1">Correo Electrónico para Factura (Opcional)</label>
                <input
                  type="email"
                  value={correoFactura}
                  onChange={(e) => setCorreoFactura(e.target.value)}
                  placeholder="Ej: factura@cliente.com"
                  className="w-full bg-surface-2 border border-line rounded-lg px-3 py-2 text-sm text-ink placeholder-ink-faint focus:outline-none focus:border-pine"
                />
              </div>
            </div>
          ) : (
            <p className="text-[11px] text-ink-faint italic leading-relaxed">
              Se emitirá la factura como <strong>Consumidor Final</strong> (sin identificación ni datos detallados).
            </p>
          )}
        </div>

        {/* Método de Entrega */}
        <div className="bg-white border border-line rounded-xl p-4 space-y-3">
          <div className="text-xs font-bold text-ink-faint uppercase tracking-wider">Método de entrega</div>
          <div className="grid grid-cols-2 gap-2">
            <button
              type="button"
              onClick={() => setMetodoEntrega('domicilio')}
              className={`py-2.5 rounded-xl font-bold text-xs transition border flex flex-col items-center justify-center gap-1 cursor-pointer ${
                metodoEntrega === 'domicilio'
                  ? 'bg-pine text-white border-transparent'
                  : 'bg-surface-2 text-ink-faint border-line hover:bg-line/40'
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
                  ? 'opacity-40 bg-surface-2 text-ink-faint border-line cursor-not-allowed'
                  : metodoEntrega === 'retiro'
                    ? 'bg-pine text-white border-transparent cursor-pointer'
                    : 'bg-surface-2 text-ink-faint border-line hover:bg-line/40 cursor-pointer'
              }`}
            >
              <span>🏪 Retiro en tienda</span>
              <span className="text-[10px] font-medium opacity-80">(Gratis)</span>
            </button>
          </div>
          {!esSoloCrayola && (
            <p className="text-[10px] text-wheat font-medium leading-relaxed">
              ⚠️ El retiro en tienda no está disponible porque tienes productos de otros locales en tu carrito.
            </p>
          )}
        </div>

        {/* Entrega */}
        {metodoEntrega === 'domicilio' ? (
          <div className="bg-white border border-line rounded-xl p-4 space-y-3">
            <div className="flex items-center justify-between">
              <div className="text-xs font-bold text-ink-faint uppercase tracking-wider">Dirección de entrega</div>
              {geoMsg && (
                <span className={`text-[10px] font-semibold ${
                  geoMsg.includes('denegado') || geoMsg.includes('No') || geoMsg.includes('agotado')
                    ? 'text-wheat'
                    : 'text-pine'
                }`}>{geoMsg}</span>
              )}
            </div>

            {/* Invitacion sutil a iniciar sesion: solo para invitados. Sin explicar
                el motivo tecnico (RLS/privacidad), solo el beneficio para el cliente. */}
            {!user && (
              <button
                type="button"
                onClick={() => loginGoogle('/checkout')}
                className="w-full flex items-center justify-between gap-2 bg-surface-2 hover:bg-line/40 border border-line rounded-xl px-3 py-2 text-left transition cursor-pointer"
              >
                <span className="text-[11px] text-ink-soft">
                  ¿Ya compraste antes? <strong className="text-pine">Inicia sesión</strong> para ver tus direcciones guardadas
                </span>
                <span className="text-[10px] font-bold text-pine shrink-0">🔐 Entrar</span>
              </button>
            )}

            {/* Botón de Obtener Ubicación GPS Destacado: solo tiene sentido cuando se
                esta ingresando/editando una direccion nueva, no cuando ya se eligio
                una guardada (esa ya trae sus coordenadas). */}
            {!direccionGuardadaActiva && (
              <div className="flex gap-2.5 border-b border-line pb-3">
                <button
                  type="button"
                  onClick={pedirUbicacion}
                  disabled={geoMsg === 'Obteniendo...'}
                  className="flex-1 flex items-center justify-center gap-2 bg-pine-tint text-pine border border-pine/30 hover:bg-pine-deep/20 active:bg-pine/25 disabled:bg-pine-tint disabled:text-pine disabled:border-pine/10 font-bold py-2.5 px-4 rounded-xl transition text-xs shadow-sm cursor-pointer select-none"
                >
                  {geoMsg === 'Obteniendo...' ? (
                    <>
                      <Loader2 className="animate-spin" size={14} />
                      Obteniendo ubicación...
                    </>
                  ) : (
                    <>
                      <MapPin className="animate-bounce" size={14} />
                      Obtener dirección por GPS
                    </>
                  )}
                </button>
                <button
                  type="button"
                  onClick={() => {
                    if (!geo) {
                      setGeo({ lat: -0.0221, lng: -78.8983 })
                      setGeoMsg('✓ Ubicación manual')
                    }
                    setVerMapa(!verMapa)
                    setDireccionSeleccionadaId('nueva')
                  }}
                  className={`flex items-center justify-center gap-1.5 px-4 py-2.5 rounded-xl border text-xs font-semibold transition cursor-pointer select-none ${
                    verMapa
                      ? 'bg-orange-600/10 text-wheat border-orange-500/30 hover:bg-orange-600/20'
                      : 'bg-surface-2 text-ink-soft border-line hover:bg-line/40 hover:text-ink'
                  }`}
                >
                  🗺️ {verMapa ? 'Ocultar mapa' : 'Ver mapa'}
                </button>
              </div>
            )}

            {/* Selector de direcciones guardadas: tarjetas seleccionables en vez de
                un <select> plano, con la opcion de "nueva" como accion separada y
                explicita en vez de mezclada dentro del mismo combo. Se colapsa
                apenas hay una direccion guardada activa -- si no, quedaba
                visible al mismo tiempo que el resumen de abajo, duplicando la
                misma informacion en pantalla. */}
            {direcciones.length > 0 && (eligiendoDireccion || !direccionGuardadaActiva) && (
              <div className="border-b border-line pb-3 space-y-2">
                <label className="text-xs text-ink-faint block">📍 Mis direcciones guardadas</label>
                <div className="grid gap-1.5">
                  {direcciones.map(d => {
                    const activa = direccionSeleccionadaId === d.id
                    return (
                      <button
                        key={d.id}
                        type="button"
                        onClick={() => { alSeleccionarDireccion(d.id); setEligiendoDireccion(false) }}
                        className={`w-full text-left px-3 py-2.5 rounded-xl border flex items-start gap-2.5 transition cursor-pointer ${
                          activa ? 'bg-pine-tint border-pine' : 'bg-surface-2 border-line hover:bg-line/40'
                        }`}
                      >
                        <span className="text-base leading-none mt-0.5">📌</span>
                        <span className="flex-1 min-w-0">
                          <span className={`block text-xs font-bold ${activa ? 'text-pine' : 'text-ink'}`}>{d.nombre_etiqueta}</span>
                          <span className="block text-[11px] text-ink-faint truncate">{d.direccion_texto}</span>
                        </span>
                        {activa && <CheckCircle size={15} className="text-pine shrink-0 mt-0.5" />}
                      </button>
                    )
                  })}
                  <button
                    type="button"
                    onClick={() => { alSeleccionarDireccion('nueva'); setEligiendoDireccion(false) }}
                    className={`w-full text-left px-3 py-2.5 rounded-xl border-2 border-dashed flex items-center gap-2 transition cursor-pointer ${
                      direccionSeleccionadaId === 'nueva'
                        ? 'border-pine text-pine bg-pine-tint'
                        : 'border-line text-ink-faint hover:border-pine/50 hover:text-pine'
                    }`}
                  >
                    <span className="text-base">➕</span>
                    <span className="text-xs font-bold">Usar una dirección nueva</span>
                  </button>
                </div>
              </div>
            )}

            {direccionGuardadaActiva && !eligiendoDireccion ? (
              /* Resumen compacto: ya se eligio una direccion guardada, no hace
                 falta repetirle al cliente los mismos campos que ya lleno antes.
                 Solo "Notas del pedido" sigue editable porque es especifica de
                 este pedido, no de la direccion. "Cambiar" reabre la lista de
                 arriba en vez de saltar directo al formulario de "nueva". */
              <div className="bg-pine-tint border border-pine/30 rounded-xl p-3 flex items-start justify-between gap-3">
                <div className="min-w-0">
                  <div className="text-xs font-bold text-pine flex items-center gap-1.5">📌 {direccionGuardadaActiva.nombre_etiqueta}</div>
                  <div className="text-[11px] text-ink-soft mt-0.5">{direccionGuardadaActiva.direccion_texto}</div>
                  {direccionGuardadaActiva.referencias && (
                    <div className="text-[10px] text-ink-faint mt-0.5">Ref: {direccionGuardadaActiva.referencias}</div>
                  )}
                </div>
                <button type="button" onClick={() => setEligiendoDireccion(true)}
                  className="text-[10px] font-bold text-pine hover:underline shrink-0 cursor-pointer">
                  Cambiar
                </button>
              </div>
            ) : direccionGuardadaActiva ? null : (
              <>
                {/* Mapa interactivo */}
                {verMapa && (
                  <div className="space-y-1.5 border-b border-line pb-3">
                    <div className="text-[10px] text-ink-faint flex items-center justify-between">
                      <span>📍 Arrastra la chincheta sobre tu ubicación exacta:</span>
                      <div className="flex gap-2.5">
                        <button type="button" onClick={pedirUbicacion} className="text-pine hover:underline">📡 Obtener GPS</button>
                        <button type="button" onClick={() => setVerMapa(false)} className="text-sale hover:underline">Ocultar</button>
                      </div>
                    </div>
                    {geoMsg?.includes('denegado') && (
                      <div className="bg-wheat/10 border border-wheat/30 rounded-xl p-3 text-[11px] text-wheat leading-relaxed">
                        💡 <strong>GPS bloqueado:</strong> Puedes activarlo tocando el candado/ajustes ⚙️ en la barra de direcciones de tu navegador (arriba) y permitiendo la ubicación. Si no sabes cómo, puedes arrastrar la chincheta azul en el mapa, o simplemente <strong>enviarnos tu ubicación de WhatsApp</strong> al finalizar el pedido.
                      </div>
                    )}
                    <div
                      ref={mapContainerRef}
                      className="w-full h-[220px] rounded-xl border border-line bg-surface-2 overflow-hidden relative z-10"
                    />
                    {geo && (
                      <div className="text-[9px] text-ink-faint text-right">
                        Lat: {geo.lat.toFixed(5)} · Lng: {geo.lng.toFixed(5)}
                      </div>
                    )}
                  </div>
                )}

                {/* Guardar nueva dirección */}
                {direccionSeleccionadaId === 'nueva' && geo && (
                  <div className="bg-surface-2 border border-line rounded-xl p-3 space-y-2">
                    <div className="text-[11px] font-semibold text-ink-soft">💾 ¿Quieres guardar esta ubicación para futuras compras?</div>
                    <div className="flex gap-2">
                      <input
                        value={nombreEtiqueta}
                        onChange={e => setNombreEtiqueta(e.target.value)}
                        placeholder="Nombre (ej: Casa, Trabajo, Escuela...)"
                        className="flex-1 bg-surface-2 border border-line rounded-lg px-3 py-1.5 text-xs text-ink placeholder-ink-faint focus:outline-none focus:border-pine"
                      />
                      <button
                        type="button"
                        onClick={guardarDireccionNueva}
                        disabled={guardandoDir}
                        className="bg-pine hover:bg-pine-deep disabled:opacity-60 text-white font-bold px-3 py-1.5 rounded-lg text-xs transition cursor-pointer"
                      >
                        {guardandoDir ? 'Guardando...' : 'Guardar'}
                      </button>
                    </div>
                    {dirMsg && <p className="text-[10px] text-pine font-semibold">{dirMsg}</p>}
                  </div>
                )}
                {[
                  { k: 'ciudad',      label: 'Ciudad',      placeholder: 'Los Bancos' },
                  { k: 'direccion',   label: 'Dirección',   placeholder: 'Calle, número, sector...' },
                  { k: 'referencias', label: 'Referencias', placeholder: 'Cerca de, color de casa...' },
                ].map(({ k, label, placeholder }) => (
                  <div key={k}>
                    <label className="text-xs text-ink-faint block mb-1">{label}</label>
                    <input value={(form as Record<string, string>)[k]} onChange={e => set(k, e.target.value)}
                      placeholder={placeholder}
                      className="w-full bg-surface-2 border border-line rounded-lg px-3 py-2 text-sm text-ink placeholder-ink-faint focus:outline-none focus:border-pine" />
                  </div>
                ))}
              </>
            )}
            <div>
              <label className="text-xs text-ink-faint block mb-1">Notas del pedido</label>
              <textarea value={form.notas} onChange={e => set('notas', e.target.value)}
                rows={2} placeholder="Instrucciones especiales..."
                className="w-full bg-surface-2 border border-line rounded-lg px-3 py-2 text-sm text-ink placeholder-ink-faint focus:outline-none focus:border-pine resize-none" />
            </div>
          </div>
        ) : (
          <div className="bg-white border border-line rounded-xl p-4 space-y-3">
            <div className="text-xs font-bold text-ink-faint uppercase tracking-wider">Punto de retiro</div>
            <div className="bg-surface-2 rounded-xl p-3 border border-line text-xs text-ink-soft leading-relaxed space-y-1">
              <p className="font-bold text-ink">📍 Local Principal - La Crayola</p>
              <p>Dirección: Av. Principal, San Miguel de los Bancos, Ecuador</p>
              <p>Horario: Lunes a Sábado de 8:00 AM a 6:00 PM</p>
            </div>
            <div>
              <label className="text-xs text-ink-faint block mb-1">Notas para tu retiro (opcional)</label>
              <textarea value={form.notas} onChange={e => set('notas', e.target.value)}
                rows={2} placeholder="¿Quién retirará el pedido? ¿A qué hora pasarás?..."
                className="w-full bg-surface-2 border border-line rounded-lg px-3 py-2 text-sm text-ink placeholder-ink-faint focus:outline-none focus:border-pine resize-none" />
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
        <div className="bg-white border border-line rounded-xl p-4 space-y-3">
          <div className="text-xs font-bold text-ink-faint uppercase tracking-wider">Forma de pago</div>

          {esClienteNuevo && (
            <div className="bg-amber-50 border border-amber-200 rounded-xl px-3 py-2.5 text-[11px] text-amber-800 leading-relaxed">
              🔒 Como es tu primer pedido con este número, por seguridad debe pagarse por <strong>transferencia bancaria</strong>.
              Después de tu primera compra entregada, podrás elegir pago contra-entrega.
            </div>
          )}

          <div className="grid grid-cols-2 gap-2">
            <button
              type="button"
              onClick={() => !esClienteNuevo && setMetodoPago('efectivo')}
              disabled={esClienteNuevo || verificandoHistorial}
              title={esClienteNuevo ? 'Disponible después de tu primera compra entregada' : undefined}
              className={`py-2.5 rounded-xl font-bold text-xs transition border flex flex-col items-center justify-center gap-1 ${
                esClienteNuevo || verificandoHistorial
                  ? 'bg-surface-2 text-ink-faint/40 border-line cursor-not-allowed opacity-60'
                  : metodoPago === 'efectivo'
                    ? 'bg-pine text-white border-transparent cursor-pointer'
                    : 'bg-surface-2 text-ink-faint border-line hover:bg-line/40 cursor-pointer'
              }`}
            >
              <span>{esClienteNuevo ? '🔒' : '💵'} Efectivo al recibir</span>
              <span className="text-[9px] font-medium opacity-80">
                {esClienteNuevo ? 'No disponible en tu 1ra compra' : 'Paga al recibir pedido'}
              </span>
            </button>
            <button
              type="button"
              onClick={() => setMetodoPago('transferencia')}
              className={`py-2.5 rounded-xl font-bold text-xs transition border flex flex-col items-center justify-center gap-1 cursor-pointer ${
                metodoPago === 'transferencia'
                  ? 'bg-pine text-white border-transparent'
                  : 'bg-surface-2 text-ink-faint border-line hover:bg-line/40'
              }`}
            >
              <span>🏦 Transferencia Bancaria</span>
              <span className="text-[9px] font-medium opacity-80">Banco Pichincha</span>
            </button>
          </div>

          {metodoPago === 'efectivo' && (
            <div className="space-y-2 bg-surface-2 border border-line rounded-xl p-3">
              <label className="text-xs text-ink-faint block font-medium">¿Con cuánto pagarás? (Para llevar sueltos)</label>
              <select
                value={billeteCambio}
                onChange={e => setBilleteCambio(e.target.value)}
                className="w-full bg-surface-2 border border-line rounded-lg px-3 py-2 text-sm text-ink focus:outline-none focus:border-pine"
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
            <div className="bg-surface-2 border border-line rounded-xl p-3 space-y-2">
              <div className="text-[11px] font-bold text-pine uppercase tracking-wider">Datos de transferencia:</div>
              <div className="space-y-1.5 text-xs text-ink-soft">
                <div className="flex justify-between border-b border-line pb-1">
                  <span className="text-ink-faint">Banco</span>
                  <span className="font-semibold text-ink">Banco Pichincha</span>
                </div>
                <div className="flex justify-between border-b border-line pb-1">
                  <span className="text-ink-faint">Tipo de Cuenta</span>
                  <span className="font-medium text-ink">Cuenta de Ahorros</span>
                </div>
                <div className="flex justify-between border-b border-line pb-1">
                  <span className="text-ink-faint">Nro. de Cuenta</span>
                  <span className="font-bold text-pine select-all">2208546193</span>
                </div>
                <div className="flex justify-between border-b border-line pb-1">
                  <span className="text-ink-faint">Beneficiario</span>
                  <span className="font-medium text-ink">La Crayola</span>
                </div>
                <div className="flex justify-between border-b border-line pb-1">
                  <span className="text-ink-faint">RUC / Identificación</span>
                  <span className="font-medium text-ink select-all">1793081928001</span>
                </div>
                <div className="flex justify-between">
                  <span className="text-ink-faint">Correo</span>
                  <span className="font-medium text-ink-soft select-all">pagos@lacrayola.com</span>
                </div>
              </div>

              {/* Botón Deuna + monto a transferir */}
              <div className="pt-3 border-t border-line space-y-2">
                <div className="flex items-center justify-between gap-2 bg-[#f3e8f9] border border-purple-200 rounded-xl px-3 py-2">
                  <div className="leading-tight">
                    <div className="text-[9px] font-black text-purple-900/70 uppercase tracking-wide">Total a transferir</div>
                    <div className="text-sm font-black text-purple-900">{fmt(granTotal)}</div>
                  </div>
                  <a
                    href="https://pagar.deuna.app/H92p/merchant?id=828c98695b77537a52da2f2dd281b2746c019154"
                    target="_blank"
                    rel="noopener noreferrer"
                    className="py-2.5 px-3.5 bg-[#702082] hover:bg-[#5a166a] active:scale-[0.99] text-white font-extrabold text-xs rounded-xl shadow-md transition flex items-center justify-center gap-2 cursor-pointer hover:shadow-lg border border-purple-800 text-center select-none shrink-0"
                  >
                    <span className="text-sm">🟣</span> Pagar con Deuna
                  </a>
                </div>
              </div>

              <div className="pt-2 border-t border-line space-y-1 text-left">
                <label className="text-[10px] font-black text-ink-faint uppercase tracking-wide block">Nro. de Comprobante / Referencia *</label>
                <input
                  type="text"
                  required
                  placeholder="Escribe el número de transferencia..."
                  value={referenciaTransferencia}
                  onChange={e => setReferenciaTransferencia(e.target.value)}
                  className="w-full bg-[#f8fafc] border border-line rounded-xl px-3.5 py-2 text-ink text-xs focus:outline-none focus:border-pine font-bold"
                />
              </div>

              <div className="pt-2 space-y-1 text-left">
                <label className="text-[10px] font-black text-ink-faint uppercase tracking-wide block">Foto del comprobante *</label>
                <input
                  type="file"
                  accept="image/*"
                  onChange={e => {
                    const f = e.target.files?.[0] ?? null
                    setComprobanteError('')
                    if (f && f.size > 5 * 1024 * 1024) {
                      setComprobanteError('La imagen no debe superar 5 MB.')
                      e.target.value = ''
                      setComprobanteFile(null)
                      setComprobantePreview(null)
                      return
                    }
                    setComprobanteFile(f)
                    setComprobantePreview(f ? URL.createObjectURL(f) : null)
                  }}
                  className="w-full text-[11px] text-ink-faint file:mr-2 file:rounded-lg file:border-0 file:bg-pine file:px-3 file:py-1.5 file:text-[11px] file:font-bold file:text-white file:cursor-pointer cursor-pointer"
                />
                {comprobantePreview && (
                  <img src={comprobantePreview} alt="Vista previa del comprobante" className="mt-1 h-20 w-20 rounded-lg object-cover border border-line" />
                )}
                {comprobanteError && <p className="text-[10px] text-sale font-semibold">{comprobanteError}</p>}
              </div>

              <div className="text-[10px] text-ink-faint leading-relaxed border-t border-line pt-2 flex items-start gap-1">
                <span>💡</span>
                <span>Adjunta la foto o captura de tu comprobante. Si tienes algún inconveniente, también puedes enviárnoslo por WhatsApp.</span>
              </div>
            </div>
          )}
        </div>

        {/* Resumen */}
        <div className="bg-white border border-line rounded-2xl p-4.5 space-y-4 shadow-xs">
          <div className="text-xs font-black text-ink-faint uppercase tracking-wider">Resumen de compra</div>
          <div className="space-y-2 max-h-48 overflow-y-auto divide-y divide-surface-2 pr-1">
            {items.map(i => (
              <div key={i.codigo} className="flex justify-between text-xs text-ink-soft pt-2 first:pt-0">
                <span className="truncate flex-1 font-medium">{i.descripcion} <span className="text-ink-faint font-bold ml-1">×{i.cantidad}</span></span>
                <span className="ml-2 shrink-0 font-bold text-ink">{fmt(i.precio_unitario * i.cantidad)}</span>
              </div>
            ))}
          </div>

          {/* Recargo por envío consolidado */}
          {metodoEntrega === 'domicilio' && (
            <RecargoEnvioBadge nTiendas={nTiendas} costoTotalEnvio={costoEnvio} />
          )}

          <div className="flex justify-between font-black text-sm text-ink border-t border-line pt-3">
            <span>{metodoEntrega === 'domicilio' ? 'Total consolidado' : 'Total a pagar'}</span>
            <span className="text-pine-deep text-base font-black">{fmt(granTotal)}</span>
          </div>
        </div>

        {error && <p className="text-sale text-xs text-center">{error}</p>}

        <button type="submit" disabled={loading}
          className="w-full flex items-center justify-center gap-2 bg-pine hover:bg-pine-deep disabled:opacity-60 text-white font-bold py-3.5 rounded-xl transition text-sm cursor-pointer">
          {loading ? <><Loader2 size={16} className="animate-spin" />{subiendoComprobante ? 'Subiendo comprobante...' : 'Procesando...'}</> : <>✅ Confirmar pedido · {fmt(granTotal)}</>}
        </button>

        <p className="text-center text-xs text-ink-faint">
          Al confirmar se abrirá WhatsApp para coordinar la entrega y el pago.
        </p>
      </form>
    </div>
  )
}

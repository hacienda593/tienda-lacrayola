'use client'
import { useEffect, useState, useRef } from 'react'
import { useAuth } from '@/context/AuthContext'
import { getPuntosCloud, progresoNivel, BADGE_NIVEL, EstadoPuntosCloud, sincronizarPuntosLocales, agregarPuntosFijosCloud } from '@/lib/puntosCloud'
import { getFavoritosCloud, sincronizarFavoritosLocales } from '@/lib/favoritosCloud'
import { getFavoritos } from '@/lib/favoritos'
import { getPuntos, agregarPuntosFijos } from '@/lib/puntos'
import { supabase } from '@/lib/supabase'
import { useRouter } from 'next/navigation'
import {
  LogOut, User, Trophy, ClipboardList,
  Package, Phone, ChevronRight, Loader2, CheckCircle, Shield,
  MapPin, Trash2, Edit, Plus, X,
  Calendar, Gift, Sparkles,
} from 'lucide-react'
import Link from 'next/link'


function DailyCheckinSection({ userId, onUpdate }: { userId: string, onUpdate: () => void }) {
  const [streak, setStreak] = useState(0)
  const [reclamado, setReclamado] = useState(false)
  const [puntosGanados, setPuntosGanados] = useState<number | null>(null)
  const [animando, setAnimando] = useState(false)

  function getTodayString() {
    const d = new Date()
    const offset = d.getTimezoneOffset()
    const local = new Date(d.getTime() - (offset * 60 * 1000))
    return local.toISOString().split('T')[0]
  }

  function getYesterdayString() {
    const d = new Date()
    d.setDate(d.getDate() - 1)
    const offset = d.getTimezoneOffset()
    const local = new Date(d.getTime() - (offset * 60 * 1000))
    return local.toISOString().split('T')[0]
  }

  const key = `lc_checkin_${userId}`

  const cargarEstado = () => {
    if (typeof window === 'undefined') return
    const today = getTodayString()
    const yesterday = getYesterdayString()
    let history = { lastDate: '', streak: 0 }
    try {
      const raw = localStorage.getItem(key)
      if (raw) history = JSON.parse(raw)
    } catch {}

    const yaReclamado = history.lastDate === today
    setReclamado(yaReclamado)

    let rachaVisual = history.streak
    if (history.lastDate !== today && history.lastDate !== yesterday) {
      rachaVisual = 0
    }
    setStreak(rachaVisual)
  }

  useEffect(() => {
    cargarEstado()
    window.addEventListener('puntos-update', cargarEstado)
    return () => window.removeEventListener('puntos-update', cargarEstado)
  }, [userId])

  async function handleCheckin() {
    if (reclamado || animando) return
    setAnimando(true)

    const today = getTodayString()
    const nuevaRacha = streak >= 7 ? 1 : streak + 1
    const pts = nuevaRacha === 7 ? 20 : 5 // 20 puntos de bono el día 7, 5 puntos normales

    if (typeof navigator !== 'undefined' && navigator.vibrate) {
      navigator.vibrate([40, 30, 40])
    }

    try {
      if (userId === 'invitado') {
        agregarPuntosFijos(pts)
      } else {
        await agregarPuntosFijosCloud(userId, pts)
      }

      const nuevoHistorial = { lastDate: today, streak: nuevaRacha }
      localStorage.setItem(key, JSON.stringify(nuevoHistorial))
      
      setPuntosGanados(pts)
      setStreak(nuevaRacha)
      setReclamado(true)
      
      onUpdate()
      window.dispatchEvent(new Event('puntos-update'))
    } catch (err) {
      console.error(err)
    } finally {
      setTimeout(() => {
        setPuntosGanados(null)
        setAnimando(false)
      }, 3500)
    }
  }

  const dias = Array.from({ length: 7 }, (_, i) => i + 1)

  return (
    <div className="bg-gradient-to-r from-amber-500 to-orange-600 text-white rounded-2xl p-5 shadow-sm relative overflow-hidden text-left">
      <div className="absolute -right-6 -bottom-6 w-24 h-24 bg-white/10 rounded-full blur-xl pointer-events-none" />
      <div className="absolute -left-6 -top-6 w-20 h-20 bg-white/10 rounded-full blur-lg pointer-events-none" />

      <div className="flex items-center justify-between mb-3.5 relative z-10">
        <div className="flex items-center gap-2">
          <Calendar size={17} className="text-yellow-200" />
          <h3 className="font-bold text-sm tracking-wide">Autocuidado & Puntos Diarios</h3>
        </div>
        <div className="text-[10px] bg-white/20 px-2.5 py-0.5 rounded-full font-bold">
          Racha: {streak} {streak === 1 ? 'día' : 'días'}
        </div>
      </div>

      <p className="text-xs text-orange-155 mb-4 leading-normal relative z-10">
        Entra a la app diariamente para reclamar puntos de fidelidad. Completa la racha de 7 días y obtén un bono especial.
      </p>

      <div className="grid grid-cols-7 gap-1.5 mb-4 relative z-10">
        {dias.map(d => {
          const esPasado = reclamado ? d <= streak : d < streak + 1
          const esHoy = reclamado ? false : d === streak + 1
          const esBono = d === 7

          return (
            <div 
              key={d} 
              className={`flex flex-col items-center p-1.5 rounded-xl transition text-center relative ${
                esHoy 
                  ? 'bg-yellow-400 text-orange-950 font-black shadow-lg scale-105 animate-pulse border border-yellow-300' 
                  : esPasado 
                    ? 'bg-white/20 text-orange-100' 
                    : 'bg-white/10 text-orange-200/55'
              }`}
            >
              <span className="text-[8px] font-bold uppercase tracking-wider block opacity-85">Día {d}</span>
              
              <div className="my-1 text-sm">
                {esPasado ? (
                  <span className="text-yellow-300 text-xs font-bold">✓</span>
                ) : esBono ? (
                  <span>🎁</span>
                ) : (
                  <span>⭐</span>
                )}
              </div>

              <span className="text-[9px] font-extrabold leading-none">
                {esBono ? '+20' : '+5'}
              </span>
            </div>
          )
        })}
      </div>

      <div className="relative z-10">
        {reclamado ? (
          <button 
            disabled 
            className="w-full bg-white/25 text-orange-100 font-bold py-2.5 px-4 rounded-xl text-xs flex items-center justify-center gap-1.5 cursor-not-allowed border border-white/10"
          >
            <CheckCircle size={14} className="text-yellow-305" /> ¡Puntos de hoy reclamados!
          </button>
        ) : (
          <button
            onClick={handleCheckin}
            disabled={animando}
            className="w-full bg-yellow-400 hover:bg-yellow-300 active:scale-[0.98] text-orange-950 font-extrabold py-2.5 px-4 rounded-xl text-xs flex items-center justify-center gap-1.5 transition shadow-lg shadow-orange-700/20 cursor-pointer"
          >
            <Gift size={14} /> {animando ? 'Reclamando...' : '📅 Reclamar +5 puntos gratis'}
          </button>
        )}
      </div>

      {puntosGanados !== null && (
        <div className="absolute inset-0 bg-orange-950/95 flex flex-col items-center justify-center text-center animate-fade-in p-4 z-20">
          <div className="text-4xl animate-bounce mb-1">🎉</div>
          <div className="text-lg font-black text-yellow-300">¡Check-in Exitoso!</div>
          <div className="text-xs text-orange-100 mt-1">Has ganado</div>
          <div className="text-3xl font-black text-white mt-1.5">+{puntosGanados} Puntos</div>
          <div className="text-[9px] text-yellow-400 mt-2 font-bold uppercase tracking-wider animate-pulse flex items-center gap-1">
            <Sparkles size={10} /> {puntosGanados === 20 ? '¡Bono de racha completada!' : '¡Sigue así mañana!'}
          </div>
        </div>
      )}
    </div>
  )
}

function fmt(n: number) { return '$' + n.toFixed(2) }

// ── Login / consulta invitado ──────────────────────────────────────
function PanelInvitado() {
  const { loginGoogle } = useAuth()
  const [localPuntos, setLocalPuntos] = useState<any | null>(null)
  const [modalOpen, setModalOpen] = useState(false)

  useEffect(() => {
    setLocalPuntos(getPuntos())
  }, [])

  return (
    <div className="space-y-5">
      {/* Check-in Diario */}
      <DailyCheckinSection userId="invitado" onUpdate={() => setLocalPuntos(getPuntos())} />

      {/* Tarjeta de puntos acumulados para invitados */}

      {localPuntos && localPuntos.total > 0 && (
        <div className="bg-white border border-gray-100 rounded-2xl p-5 shadow-sm space-y-3">
          <div className="flex items-center justify-between">
            <div className="flex items-center gap-2">
              <Trophy size={17} className="text-yellow-500" />
              <span className="font-bold text-gray-800 text-sm">Mis puntos acumulados</span>
            </div>
            <span className="text-[10px] font-bold px-2.5 py-0.5 rounded-full bg-amber-100 text-amber-800">
              Temporal (Invitado)
            </span>
          </div>
          <div className="grid grid-cols-2 gap-2 text-center">
            <div className="bg-yellow-50 rounded-xl p-3">
              <div className="text-lg font-extrabold text-yellow-700">{localPuntos.disponibles}</div>
              <div className="text-[10px] text-yellow-600 font-medium">Disponibles</div>
            </div>
            <div className="bg-green-50 rounded-xl p-3">
              <div className="text-lg font-extrabold text-green-700">{fmt(localPuntos.disponibles / 100)}</div>
              <div className="text-[10px] text-green-600 font-medium">En descuentos</div>
            </div>
          </div>
          
          <button
            onClick={() => setModalOpen(true)}
            className="w-full bg-yellow-500 hover:bg-yellow-600 text-white font-semibold py-2.5 rounded-xl text-xs transition flex items-center justify-center gap-1.5 cursor-pointer"
          >
            🎟️ Canjear puntos
          </button>
        </div>
      )}

      {/* Modal de Advertencia de Registro */}
      {modalOpen && (
        <div className="fixed inset-0 bg-black/50 z-50 flex items-center justify-center p-4">
          <div className="bg-white rounded-2xl p-6 max-w-sm w-full space-y-4 shadow-xl animate-fade-in text-left">
            <div className="text-center space-y-2">
              <div className="text-4xl">🔑</div>
              <h3 className="font-bold text-gray-800 text-base">Registro Requerido</h3>
              <p className="text-xs text-gray-500 leading-relaxed">
                Para hacer uso de tus **{localPuntos?.disponibles} puntos** y convertirlos en descuentos, debes registrarte con Google. 
                <br/><br/>
                ¡Tus puntos acumulados se guardarán permanentemente en tu cuenta!
              </p>
            </div>
            <div className="flex flex-col gap-2">
              <button
                onClick={() => {
                  setModalOpen(false)
                  loginGoogle()
                }}
                className="w-full bg-green-600 hover:bg-green-700 text-white font-bold py-2.5 rounded-xl text-xs transition flex items-center justify-center gap-1.5 cursor-pointer"
              >
                🔐 Registrarme con Google
              </button>
              <button
                onClick={() => setModalOpen(false)}
                className="w-full bg-gray-100 hover:bg-gray-200 text-gray-700 font-semibold py-2.5 rounded-xl text-xs transition cursor-pointer"
              >
                Cancelar
              </button>
            </div>
          </div>
        </div>
      )}
      <div className="bg-white border border-gray-100 rounded-2xl p-6 shadow-sm space-y-4">
        <div className="text-center space-y-1">
          <div className="text-4xl mb-2">🖍️</div>
          <h2 className="font-bold text-gray-800 text-lg">Cuenta registrada</h2>
          <p className="text-sm text-gray-400">Accede con Google para acumular puntos, sincronizar favoritos y ver tus pedidos desde cualquier dispositivo.</p>
        </div>

        <button onClick={loginGoogle}
          className="w-full flex items-center justify-center gap-3 border border-gray-200 hover:bg-gray-50 rounded-xl py-3 font-semibold text-gray-700 transition text-sm">
          <svg className="w-5 h-5" viewBox="0 0 24 24">
            <path d="M22.56 12.25c0-.78-.07-1.53-.2-2.25H12v4.26h5.92c-.26 1.37-1.04 2.53-2.21 3.31v2.77h3.57c2.08-1.92 3.28-4.74 3.28-8.09z" fill="#4285F4"/>
            <path d="M12 23c2.97 0 5.46-.98 7.28-2.66l-3.57-2.77c-.98.66-2.23 1.06-3.71 1.06-2.86 0-5.29-1.93-6.16-4.53H2.18v2.84C3.99 20.53 7.7 23 12 23z" fill="#34A853"/>
            <path d="M5.84 14.09c-.22-.66-.35-1.36-.35-2.09s.13-1.43.35-2.09V7.07H2.18C1.43 8.55 1 10.22 1 12s.43 3.45 1.18 4.93l3.66-2.84z" fill="#FBBC05"/>
            <path d="M12 5.38c1.62 0 3.06.56 4.21 1.64l3.15-3.15C17.45 2.09 14.97 1 12 1 7.7 1 3.99 3.47 2.18 7.07l3.66 2.84c.87-2.6 3.3-4.53 6.16-4.53z" fill="#EA4335"/>
          </svg>
          Continuar con Google
        </button>

        <div className="grid grid-cols-3 gap-2 pt-1">
          {[
            { icon: '⭐', label: 'Puntos', sub: 'Acumula y sube de nivel' },
            { icon: '❤️', label: 'Favoritos', sub: 'Sincronizados' },
            { icon: '📦', label: 'Pedidos', sub: 'Desde cualquier dispositivo' },
          ].map(b => (
            <div key={b.label} className="text-center p-2.5 bg-gray-50 rounded-xl">
              <div className="text-xl mb-1">{b.icon}</div>
              <div className="text-xs font-semibold text-gray-700">{b.label}</div>
              <div className="text-[10px] text-gray-400 leading-tight mt-0.5">{b.sub}</div>
            </div>
          ))}
        </div>
      </div>

    </div>
  )
}

// ── Panel usuario registrado ───────────────────────────────────────
function PanelRegistrado() {
  const { user, logout } = useAuth()
  const [puntos,     setPuntos]     = useState<EstadoPuntosCloud | null>(null)
  const [numFavs,    setNumFavs]    = useState(0)
  const [numPedidos, setNumPedidos] = useState(0)
  const [sincronizado, setSincronizado] = useState(false)
  const [sincronizadoPuntos, setSincronizadoPuntos] = useState(false)

  // Estados de direcciones
  const [direcciones, setDirecciones] = useState<any[]>([])
  const [cargandoDirs, setCargandoDirs] = useState(true)
  const [editandoDir, setEditandoDir] = useState<any | null>(null)

  // Formulario states
  const [nombreEtiqueta, setNombreEtiqueta] = useState('')
  const [telefonoForm, setTelefonoForm] = useState('')
  const [direccionTexto, setDireccionTexto] = useState('')
  const [referencias, setReferencias] = useState('')
  const [ciudad, setCiudad] = useState('Los Bancos')
  const [geo, setGeo] = useState<{ lat: number; lng: number } | null>(null)
  const [verMapa, setVerMapa] = useState(false)
  const [geoMsg, setGeoMsg] = useState('')
  const [guardandoDir, setGuardandoDir] = useState(false)
  const [dirMsg, setDirMsg] = useState('')

  const mapContainerRef = useRef<HTMLDivElement | null>(null)
  const mapInstanceRef = useRef<any>(null)
  const markerRef = useRef<any>(null)

  async function cargarDirecciones() {
    if (!user) return
    setCargandoDirs(true)
    const { data } = await supabase
      .from('ol_direcciones_cliente')
      .select('*')
      .eq('user_id', user.id)
    if (data) {
      setDirecciones(data)
    }
    setCargandoDirs(false)
  }

  function iniciarNuevaDireccion() {
    setEditandoDir({ nuevo: true })
    setNombreEtiqueta('')
    const perfil = typeof window !== 'undefined' ? JSON.parse(localStorage.getItem('lc_perfil') || 'null') : null
    setTelefonoForm(perfil?.telefono || '')
    setDireccionTexto('')
    setReferencias('')
    setCiudad('Los Bancos')
    setGeo(null)
    setVerMapa(false)
    setGeoMsg('')
    setDirMsg('')
  }

  function iniciarEdicion(d: any) {
    setEditandoDir(d)
    setNombreEtiqueta(d.nombre_etiqueta)
    setTelefonoForm(d.telefono)
    setDireccionTexto(d.direccion_texto)
    setReferencias(d.referencias || '')
    setCiudad(d.ciudad || 'Los Bancos')
    setGeo({ lat: d.geo_lat, lng: d.geo_lng })
    setVerMapa(true)
    setGeoMsg('✓ Ubicación cargada')
    setDirMsg('')
  }

  async function eliminarDireccion(id: string) {
    if (!confirm('¿Estás seguro de que deseas eliminar esta dirección?')) return
    const { error } = await supabase
      .from('ol_direcciones_cliente')
      .delete()
      .eq('id', id)

    if (error) {
      alert('Error al eliminar: ' + error.message)
    } else {
      setDirecciones(prev => prev.filter(x => x.id !== id))
    }
  }

  async function guardarDireccion() {
    if (!user) return
    if (!nombreEtiqueta.trim()) { setDirMsg('Escribe un nombre (ej: Casa, Trabajo)'); return }
    if (!telefonoForm.trim()) { setDirMsg('Ingresa tu teléfono de contacto'); return }
    if (!direccionTexto.trim()) { setDirMsg('Ingresa la dirección detallada'); return }
    if (!geo) { setDirMsg('Obtén tu ubicación GPS en el mapa'); return }

    const duplicado = direcciones.find(d =>
      d.nombre_etiqueta.toLowerCase() === nombreEtiqueta.trim().toLowerCase() &&
      (!editandoDir || editandoDir.id !== d.id)
    )
    if (duplicado) {
      setDirMsg(`Ya tienes una dirección guardada como "${nombreEtiqueta.trim()}". Por favor, usa otra etiqueta.`)
      return
    }

    setGuardandoDir(true)
    setDirMsg('')

    const payload = {
      user_id: user.id,
      telefono: telefonoForm.trim(),
      nombre_etiqueta: nombreEtiqueta.trim(),
      direccion_texto: direccionTexto.trim(),
      ciudad: ciudad,
      referencias: referencias.trim() || null,
      geo_lat: geo.lat,
      geo_lng: geo.lng
    }

    let res
    if (editandoDir && !editandoDir.nuevo) {
      res = await supabase
        .from('ol_direcciones_cliente')
        .update(payload)
        .eq('id', editandoDir.id)
        .select()
    } else {
      res = await supabase
        .from('ol_direcciones_cliente')
        .insert(payload)
        .select()
    }

    const { error } = res
    setGuardandoDir(false)

    if (error) {
      setDirMsg('Error al guardar: ' + error.message)
    } else {
      setDirMsg('✓ Guardado con éxito')
      setEditandoDir(null)
      cargarDirecciones()
    }
  }

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
        reversoGeocoding(pos.coords.latitude, pos.coords.longitude)
      },
      err => {
        console.warn('Fallo GPS alta precisión, intentando red móvil...', err)
        navigator.geolocation.getCurrentPosition(
          pos => {
            setGeo({ lat: pos.coords.latitude, lng: pos.coords.longitude })
            setGeoMsg('✓ Ubicación (red)')
            setVerMapa(true)
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
          setDireccionTexto(direccionFormateada)
          setCiudad(ciudadFormateada)
        }
      }
    } catch (err) {
      console.error('Error reverse geocoding:', err)
    }
  }

  // Cargar e inicializar Leaflet dinámicamente para el formulario
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

  useEffect(() => {
    if (!user) return
    getPuntosCloud(user.id).then(setPuntos)
    getFavoritosCloud(user.id).then(f => setNumFavs(f.length))
    supabase.from('ol_pedidos').select('id', { count: 'exact', head: true })
      .eq('user_id', user.id)
      .then(({ count }) => setNumPedidos(count ?? 0))
    
    cargarDirecciones()

    const locales = getFavoritos()
    if (locales.length > 0) {
      sincronizarFavoritosLocales(user.id, locales).then(() => setSincronizado(true))
    }
    const localPpts = getPuntos()
    if (localPpts.total > 0) {
      sincronizarPuntosLocales(user.id, localPpts.total).then(() => {
        localStorage.removeItem('lc_puntos')
        setSincronizadoPuntos(true)
        getPuntosCloud(user.id).then(setPuntos)
      })
    }
  }, [user])

  if (!user) return null
  const rawNombre = user.user_metadata?.full_name || user.user_metadata?.name || ''
  const nombre    = rawNombre
    ? rawNombre.normalize('NFD').replace(/[̀-ͯ]/g, '').replace(/[^\x20-\x7EÀ-ɏ]/g, '').trim() || rawNombre
    : (user.email?.split('@')[0] || 'Usuario')
  const avatar  = user.user_metadata?.avatar_url
  const progreso = puntos ? progresoNivel(puntos.total) : null

  return (
    <div className="space-y-4">
      {/* Perfil */}
      <div className="bg-white border border-gray-100 rounded-2xl p-5 shadow-sm flex items-center gap-4">
        {avatar
          ? <img src={avatar} alt={nombre} className="w-14 h-14 rounded-full border-2 border-green-200" />
          : <div className="w-14 h-14 bg-green-100 rounded-full flex items-center justify-center shrink-0"><User size={24} className="text-green-700" /></div>
        }
        <div className="flex-1 min-w-0">
          <div className="font-bold text-gray-800 truncate">{nombre}</div>
          <div className="text-xs text-gray-400 truncate">{user.email}</div>
          <div className="flex items-center gap-1 mt-1">
            <Shield size={11} className="text-green-500" />
            <span className="text-[11px] text-green-600 font-semibold">Cliente verificado</span>
          </div>
        </div>
      </div>

      {/* Puntos */}
      {puntos && (
        <div className="bg-white border border-gray-100 rounded-2xl p-5 shadow-sm space-y-3">
          <div className="flex items-center justify-between">
            <div className="flex items-center gap-2">
              <Trophy size={17} className="text-yellow-500" />
              <span className="font-bold text-gray-800">Mis puntos</span>
            </div>
            <span className={`text-xs font-bold px-2.5 py-1 rounded-full ${BADGE_NIVEL[puntos.nivel]}`}>
              {puntos.nivel}
            </span>
          </div>
          <div className="grid grid-cols-3 gap-2 text-center">
            <div className="bg-yellow-50 rounded-xl p-3">
              <div className="text-xl font-extrabold text-yellow-700">{puntos.disponibles}</div>
              <div className="text-[10px] text-yellow-600 font-medium">Disponibles</div>
            </div>
            <div className="bg-gray-50 rounded-xl p-3">
              <div className="text-xl font-extrabold text-gray-700">{puntos.total}</div>
              <div className="text-[10px] text-gray-500 font-medium">Acumulados</div>
            </div>
            <div className="bg-green-50 rounded-xl p-3">
              <div className="text-xl font-extrabold text-green-700">{fmt(puntos.disponibles / 100)}</div>
              <div className="text-[10px] text-green-600 font-medium">En descuentos</div>
            </div>
          </div>
          {progreso && progreso.faltan > 0 && (
            <div className="space-y-1.5">
              <div className="flex justify-between text-xs text-gray-400">
                <span>Hacia nivel {progreso.siguiente}</span>
                <span>{progreso.faltan} pts más</span>
              </div>
              <div className="w-full bg-gray-100 rounded-full h-2">
                <div className="bg-yellow-400 h-2 rounded-full transition-all duration-700"
                  style={{ width: `${Math.min(100, progreso.porcentaje)}%` }} />
              </div>
            </div>
          )}
          {progreso?.faltan === 0 && (
            <p className="text-center text-xs text-yellow-600 font-semibold">🏆 ¡Nivel máximo alcanzado!</p>
          )}
        </div>
      )}

      {/* Check-in Diario */}
      {user && (
        <DailyCheckinSection userId={user.id} onUpdate={() => getPuntosCloud(user.id).then(setPuntos)} />
      )}

      {/* Accesos */}
      <div className="bg-white border border-gray-100 rounded-2xl shadow-sm divide-y divide-gray-50">
        <Link href="/pedidos" className="flex items-center gap-3 px-5 py-4 hover:bg-gray-50 transition">
          <Package size={17} className="text-green-600" />
          <div className="flex-1">
            <div className="text-sm font-medium text-gray-800">Mis pedidos</div>
            <div className="text-xs text-gray-400">{numPedidos} pedido{numPedidos !== 1 ? 's' : ''}</div>
          </div>
          <ChevronRight size={14} className="text-gray-300" />
        </Link>
        <Link href="/favoritos" className="flex items-center gap-3 px-5 py-4 hover:bg-gray-50 transition">
          <ClipboardList size={17} className="text-green-600" />
          <div className="flex-1">
            <div className="text-sm font-medium text-gray-800">Mi lista de compras</div>
            <div className="text-xs text-gray-400">{numFavs} artículo{numFavs !== 1 ? 's' : ''} en tus listas</div>
          </div>
          <ChevronRight size={14} className="text-gray-300" />
        </Link>
      </div>

      {/* Direcciones de entrega */}
      <div className="bg-white border border-gray-100 rounded-2xl p-5 shadow-sm space-y-4">
        <div className="flex items-center justify-between">
          <div className="flex items-center gap-2">
            <MapPin size={17} className="text-green-600" />
            <span className="font-bold text-gray-800">Direcciones de entrega</span>
          </div>
          {!editandoDir && (
            <button
              onClick={iniciarNuevaDireccion}
              className="flex items-center gap-1 text-xs font-bold text-green-600 hover:text-green-700 transition cursor-pointer"
            >
              <Plus size={14} /> Agregar
            </button>
          )}
        </div>

        {cargandoDirs ? (
          <div className="flex items-center justify-center py-4">
            <Loader2 size={20} className="animate-spin text-green-500" />
          </div>
        ) : direcciones.length === 0 && !editandoDir ? (
          <p className="text-xs text-gray-400 italic">No tienes direcciones guardadas. Agrega una para que aparezca precargada al finalizar tus pedidos.</p>
        ) : (
          <div className="space-y-3">
            {!editandoDir && direcciones.map(d => (
              <div key={d.id} className="border border-gray-100 rounded-xl p-3 flex items-start justify-between gap-3 bg-gray-50/50 hover:bg-gray-50 transition">
                <div className="space-y-1 text-left min-w-0">
                  <div className="flex items-center gap-1.5 flex-wrap">
                    <span className="text-[9px] font-bold bg-green-50 text-green-700 border border-green-200 px-2 py-0.5 rounded-full uppercase tracking-wider">
                      {d.nombre_etiqueta}
                    </span>
                    <span className="text-[10px] text-gray-400 font-semibold">{d.telefono}</span>
                  </div>
                  <p className="text-xs text-gray-750 font-semibold mt-1 break-words">{d.direccion_texto}, {d.ciudad}</p>
                  {d.referencias && <p className="text-[10px] text-gray-500 italic truncate">Ref: {d.referencias}</p>}
                </div>
                <div className="flex gap-2 shrink-0">
                  <button onClick={() => iniciarEdicion(d)} className="text-gray-400 hover:text-green-600 p-1 transition cursor-pointer">
                    <Edit size={14} />
                  </button>
                  <button onClick={() => eliminarDireccion(d.id)} className="text-gray-400 hover:text-red-650 p-1 transition cursor-pointer">
                    <Trash2 size={14} />
                  </button>
                </div>
              </div>
            ))}
          </div>
        )}

        {/* Formulario de creación/edición */}
        {editandoDir && (
          <div className="border border-gray-150 rounded-xl p-4 bg-gray-50/50 space-y-3.5 transition-all text-left">
            <div className="flex items-center justify-between border-b border-gray-150 pb-2">
              <span className="text-xs font-bold text-gray-700">
                {editandoDir.nuevo ? '➕ Nueva dirección de entrega' : '📝 Editar dirección de entrega'}
              </span>
              <button onClick={() => setEditandoDir(null)} className="text-gray-400 hover:text-red-500 cursor-pointer">
                <X size={15} />
              </button>
            </div>

            <div className="space-y-3 text-xs text-left">
              <div>
                <label className="text-[10px] font-bold text-gray-500 block mb-1">Nombre / Etiqueta *</label>
                <input
                  type="text"
                  value={nombreEtiqueta}
                  onChange={e => setNombreEtiqueta(e.target.value)}
                  placeholder="Ej: Casa, Trabajo, Escuela, Casa Mamá..."
                  className="w-full bg-white border border-gray-200 rounded-lg px-3 py-2 text-xs text-gray-800 placeholder-gray-400 focus:outline-none focus:border-green-500"
                />
              </div>

              <div>
                <label className="text-[10px] font-bold text-gray-500 block mb-1">Teléfono de contacto *</label>
                <input
                  type="tel"
                  value={telefonoForm}
                  onChange={e => setTelefonoForm(e.target.value)}
                  placeholder="Ej: 0991234567"
                  className="w-full bg-white border border-gray-200 rounded-lg px-3 py-2 text-xs text-gray-800 placeholder-gray-400 focus:outline-none focus:border-green-500"
                />
              </div>

              <div>
                <label className="text-[10px] font-bold text-gray-500 block mb-1">Ciudad</label>
                <input
                  type="text"
                  value={ciudad}
                  onChange={e => setCiudad(e.target.value)}
                  placeholder="Ej: Los Bancos"
                  className="w-full bg-white border border-gray-200 rounded-lg px-3 py-2 text-xs text-gray-800 placeholder-gray-400 focus:outline-none focus:border-green-500"
                />
              </div>

              <div>
                <label className="text-[10px] font-bold text-gray-500 block mb-1">Dirección exacta *</label>
                <input
                  type="text"
                  value={direccionTexto}
                  onChange={e => setDireccionTexto(e.target.value)}
                  placeholder="Calle, número de casa, barrio..."
                  className="w-full bg-white border border-gray-200 rounded-lg px-3 py-2 text-xs text-gray-800 placeholder-gray-400 focus:outline-none focus:border-green-500"
                />
              </div>

              <div>
                <label className="text-[10px] font-bold text-gray-500 block mb-1">Referencias de entrega (Opcional)</label>
                <input
                  type="text"
                  value={referencias}
                  onChange={e => setReferencias(e.target.value)}
                  placeholder="Frente a la tienda, portón negro..."
                  className="w-full bg-white border border-gray-200 rounded-lg px-3 py-2 text-xs text-gray-800 placeholder-gray-400 focus:outline-none focus:border-green-500"
                />
              </div>

              {/* Botones del mapa */}
              <div className="flex gap-3 justify-end items-center border-t border-gray-150/50 pt-2 flex-wrap">
                {geoMsg && (
                  <span className={`text-[10px] font-bold ${geoMsg.includes('denegado') || geoMsg.includes('No') ? 'text-orange-600' : 'text-green-600'}`}>
                    {geoMsg}
                  </span>
                )}
                <button type="button" onClick={pedirUbicacion}
                  className="flex items-center gap-1 text-[10px] text-gray-500 hover:text-green-600 transition cursor-pointer">
                  <MapPin size={11}/> Obtener GPS
                </button>
                <button type="button" onClick={() => {
                  if (!geo) {
                    setGeo({ lat: -0.0221, lng: -78.8983 })
                    setGeoMsg('✓ Ubicación manual')
                  }
                  setVerMapa(!verMapa)
                }}
                  className="flex items-center gap-1 text-[10px] text-green-600 font-bold underline cursor-pointer">
                  🗺️ {verMapa ? 'Ocultar mapa' : 'Ubicar en mapa'}
                </button>
              </div>

              {/* Contenedor del mapa */}
              {verMapa && (
                <div className="space-y-1.5 pt-1 border-t border-gray-150/50 relative z-10">
                  <div className="text-[10px] text-gray-450 flex items-center justify-between">
                    <span>Arrastra la chincheta sobre tu ubicación exacta:</span>
                    <button type="button" onClick={() => setVerMapa(false)} className="text-red-500 hover:underline">Ocultar</button>
                  </div>
                  <div 
                    ref={mapContainerRef} 
                    className="w-full h-[180px] rounded-xl border border-gray-200 bg-gray-100 overflow-hidden relative z-10" 
                  />
                  {geo && (
                    <div className="text-[9px] text-gray-450 text-right">
                      Lat: {geo.lat.toFixed(5)} · Lng: {geo.lng.toFixed(5)}
                    </div>
                  )}
                </div>
              )}
            </div>

            {dirMsg && <p className="text-[10px] text-center font-bold text-orange-600">{dirMsg}</p>}

            <div className="flex gap-2 pt-2">
              <button
                onClick={guardarDireccion}
                disabled={guardandoDir}
                className="flex-1 bg-green-600 hover:bg-green-700 disabled:opacity-50 text-white font-bold py-2.5 rounded-xl text-xs transition cursor-pointer"
              >
                {guardandoDir ? 'Guardando...' : '💾 Guardar dirección'}
              </button>
              <button
                onClick={() => setEditandoDir(null)}
                className="flex-1 bg-gray-100 hover:bg-gray-200 text-gray-700 font-semibold py-2.5 rounded-xl text-xs transition cursor-pointer"
              >
                Cancelar
              </button>
            </div>
          </div>
        )}
      </div>

      {sincronizado && (
        <div className="flex items-center gap-2 bg-green-50 border border-green-200 rounded-xl px-4 py-2.5 text-xs text-green-700">
          <CheckCircle size={13} /> Tus favoritos locales se sincronizaron con tu cuenta.
        </div>
      )}

      {sincronizadoPuntos && (
        <div className="flex items-center gap-2 bg-yellow-50 border border-yellow-200 rounded-xl px-4 py-2.5 text-xs text-yellow-800">
          <CheckCircle size={13} className="text-yellow-600" /> Tus puntos acumulados como invitado se guardaron en tu cuenta.
        </div>
      )}

      <button onClick={logout}
        className="w-full flex items-center justify-center gap-2 border border-gray-200 hover:bg-red-50 hover:border-red-200 hover:text-red-600 text-gray-500 font-semibold py-3 rounded-xl transition text-sm">
        <LogOut size={14} /> Cerrar sesión
      </button>
    </div>
  )
}



// ── Página ─────────────────────────────────────────────────────────
export default function CuentaPage() {
  const { user, loading } = useAuth()

  if (loading) {
    return (
      <div className="max-w-lg mx-auto px-4 py-16 flex justify-center">
        <Loader2 size={28} className="animate-spin text-green-500" />
      </div>
    )
  }

  return (
    <div className="max-w-lg mx-auto px-4 py-5">
      <h1 className="text-lg font-bold text-gray-800 mb-5">Mi cuenta</h1>
      {user ? (
        <PanelRegistrado />
      ) : (
        <PanelInvitado />
      )}
    </div>
  )
}

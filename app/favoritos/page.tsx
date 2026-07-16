'use client'
import { useEffect, useState, useRef } from 'react'
import { ShoppingCart, Share2, Trash2, Search, QrCode, X, Plus, Minus, History, Check, Loader2, Sparkles, AlertCircle, ShoppingBag } from 'lucide-react'
import Link from 'next/link'
import { getFavoritos, toggleFavorito, ItemFavorito, serializarFavoritos } from '@/lib/favoritos'
import { agregarItem, getCarrito, cambiarCantidad } from '@/lib/carrito'
import { supabase } from '@/lib/supabase'
import { useAuth } from '@/context/AuthContext'
import { getPedidosLocales } from '@/lib/perfil'
import { CAT_EMOJI } from '@/lib/types'

function fmt(n: number) { return '$' + n.toFixed(2) }

export default function FavoritosPage() {
  const { user } = useAuth()
  
  // ── Estados Principales de la Lista ──
  const [lista, setLista] = useState<ItemFavorito[]>([])
  const [checkedCodes, setCheckedCodes] = useState<Set<string>>(new Set())
  const [cartItems, setCartItems] = useState<any[]>([])
  const [copiado, setCopiado] = useState(false)
  const [agregados, setAgregados] = useState<Set<string>>(new Set())

  // ── Estados para Añadir por Nombre ──
  const [searchQuery, setSearchQuery] = useState('')
  const [suggestions, setSuggestions] = useState<any[]>([])
  const [isSearching, setIsSearching] = useState(false)

  // ── Estados para Añadir por Escáner ──
  const [isScanning, setIsScanning] = useState(false)
  const [manualCode, setManualCode] = useState('')
  const [errorMsg, setErrorMsg] = useState('')
  const [isCameraReady, setIsCameraReady] = useState(false)
  const [mediaStream, setMediaStream] = useState<MediaStream | null>(null)
  const videoRef = useRef<HTMLVideoElement>(null)
  const canvasRef = useRef<HTMLCanvasElement>(null)

  // ── Estados para Compras Históricas ──
  const [historico, setHistorico] = useState<any[]>([])
  const [cargandoHistorico, setCargandoHistorico] = useState(false)
  const [showHistorico, setShowHistorico] = useState(false)

  // ── 1. Sincronización Inicial y Eventos ──
  useEffect(() => {
    setLista(getFavoritos())
    setCartItems(getCarrito())
    
    // Cargar códigos tachados de localStorage
    try {
      const savedChecked = localStorage.getItem('lc_checked_items')
      if (savedChecked) setCheckedCodes(new Set(JSON.parse(savedChecked)))
    } catch (e) {
      console.error(e)
    }

    const syncFavoritos = () => setLista(getFavoritos())
    const syncCarrito = () => setCartItems(getCarrito())

    window.addEventListener('favoritos-update', syncFavoritos)
    window.addEventListener('carrito-update', syncCarrito)

    return () => {
      window.removeEventListener('favoritos-update', syncFavoritos)
      window.removeEventListener('carrito-update', syncCarrito)
    }
  }, [])

  // ── 2. Acciones sobre la Lista ──
  const toggleChecked = (codigo: string) => {
    setCheckedCodes(prev => {
      const next = new Set(prev)
      if (next.has(codigo)) {
        next.delete(codigo)
      } else {
        next.add(codigo)
      }
      localStorage.setItem('lc_checked_items', JSON.stringify(Array.from(next)))
      return next
    })
  }

  function quitar(prod: ItemFavorito) {
    toggleFavorito({ codigo: prod.codigo, descripcion: prod.descripcion, categoria: prod.categoria, precio_publico: prod.precio_unitario })
    // Si se quita de la lista, quitar también del estado de tachado
    setCheckedCodes(prev => {
      if (prev.has(prod.codigo)) {
        const next = new Set(prev)
        next.delete(prod.codigo)
        localStorage.setItem('lc_checked_items', JSON.stringify(Array.from(next)))
        return next
      }
      return prev
    })
  }

  const getQty = (codigo: string) => cartItems.find(i => i.codigo === codigo)?.cantidad ?? 0

  function handleAgregarCarrito(prod: ItemFavorito) {
    if (typeof navigator !== 'undefined' && navigator.vibrate) {
      navigator.vibrate(15)
    }
    agregarItem({ codigo: prod.codigo, descripcion: prod.descripcion, categoria: prod.categoria, precio_publico: prod.precio_unitario })
    setAgregados(s => new Set(s).add(prod.codigo))
    setTimeout(() => setAgregados(s => { const n = new Set(s); n.delete(prod.codigo); return n }), 1200)
  }

  function handleCambiarCantidad(codigo: string, cant: number) {
    if (typeof navigator !== 'undefined' && navigator.vibrate) {
      navigator.vibrate(10)
    }
    cambiarCantidad(codigo, cant)
  }

  function agregarTodos() {
    if (typeof navigator !== 'undefined' && navigator.vibrate) {
      navigator.vibrate(25)
    }
    lista.forEach(p => agregarItem({ codigo: p.codigo, descripcion: p.descripcion, categoria: p.categoria, precio_publico: p.precio_unitario }))
    const todos = new Set(lista.map(p => p.codigo))
    setAgregados(todos)
    setTimeout(() => setAgregados(new Set()), 1500)
  }

  function compartir() {
    const ids = serializarFavoritos()
    const url = `${window.location.origin}/favoritos?lista=${encodeURIComponent(ids)}`
    navigator.clipboard.writeText(url).then(() => {
      setCopiado(true)
      setTimeout(() => setCopiado(false), 2000)
    })
  }

  // ── 3. Buscador por Nombre Autocomplete ──
  useEffect(() => {
    if (searchQuery.trim().length < 2) {
      setSuggestions([])
      return
    }
    setIsSearching(true)
    const delayDebounce = setTimeout(async () => {
      const { data } = await supabase
        .from('ol_productos')
        .select('codigo, descripcion, categoria, precio_publico')
        .ilike('descripcion', `%${searchQuery}%`)
        .limit(6)
      if (data) setSuggestions(data)
      setIsSearching(false)
    }, 250)

    return () => clearTimeout(delayDebounce)
  }, [searchQuery])

  function handleSelectSuggestion(prod: any) {
    toggleFavorito({
      codigo: prod.codigo,
      descripcion: prod.descripcion,
      categoria: prod.categoria,
      precio_publico: prod.precio_publico
    })
    setSearchQuery('')
    setSuggestions([])
  }

  // ── 4. Lógica de Escáner de Código de Barras ──
  const startScanning = async () => {
    setIsScanning(true)
    setErrorMsg('')
    setIsCameraReady(false)
    try {
      const stream = await navigator.mediaDevices.getUserMedia({ video: { facingMode: 'environment' } })
      if (videoRef.current) {
        videoRef.current.srcObject = stream
        videoRef.current.setAttribute('playsinline', 'true')
        videoRef.current.play()
      }
      setMediaStream(stream)
      setIsCameraReady(true)
    } catch (err) {
      console.error(err)
      setErrorMsg('No se pudo acceder a la cámara. Puedes escribir el código de barras manualmente.')
    }
  }

  const stopScanning = () => {
    if (mediaStream) {
      mediaStream.getTracks().forEach(track => track.stop())
    }
    setMediaStream(null)
    setIsScanning(false)
    setIsCameraReady(false)
    setManualCode('')
    setErrorMsg('')
  }

  const handleBarcodeSubmit = async (code: string) => {
    if (!code.trim()) return
    setIsSearching(true)
    const { data } = await supabase
      .from('ol_productos')
      .select('codigo, descripcion, categoria, precio_publico')
      .eq('codigo', code.trim())
      .single()

    setIsSearching(false)
    if (data) {
      toggleFavorito({
        codigo: data.codigo,
        descripcion: data.descripcion,
        categoria: data.categoria,
        precio_publico: data.precio_publico
      })
      stopScanning()
      if (typeof navigator !== 'undefined' && navigator.vibrate) {
        navigator.vibrate([80, 40, 80])
      }
    } else {
      setErrorMsg(`Código "${code}" no encontrado en el catálogo de tiendas.`)
    }
  }

  // Bucle de lectura de cámara nativa (BarcodeDetector)
  useEffect(() => {
    let active = true
    let animationFrameId: number

    const scanLoop = async () => {
      if (!active) return
      if (isCameraReady && videoRef.current && canvasRef.current && 'BarcodeDetector' in window) {
        const video = videoRef.current
        const canvas = canvasRef.current
        const ctx = canvas.getContext('2d')
        if (ctx && video.readyState === video.HAVE_ENOUGH_DATA) {
          canvas.width = video.videoWidth
          canvas.height = video.videoHeight
          ctx.drawImage(video, 0, 0, canvas.width, canvas.height)
          
          try {
            // @ts-ignore
            const detector = new BarcodeDetector({ formats: ['ean_13', 'code_128', 'qr_code', 'upc_a'] })
            const barcodes = await detector.detect(canvas)
            if (barcodes.length > 0 && active) {
              const code = barcodes[0].rawValue
              handleBarcodeSubmit(code)
              active = false
              return
            }
          } catch (e) {
            console.error(e)
          }
        }
      }
      animationFrameId = requestAnimationFrame(scanLoop)
    }

    if (isScanning && isCameraReady) {
      scanLoop()
    }

    return () => {
      active = false
      cancelAnimationFrame(animationFrameId)
    }
  // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [isScanning, isCameraReady])

  const simularEscaneoPrueba = async () => {
    setIsSearching(true)
    const { data } = await supabase
      .from('ol_productos')
      .select('codigo, descripcion, categoria, precio_publico')
      .gt('stock', 0)
      .limit(20)

    setIsSearching(false)
    if (data && data.length > 0) {
      // Tomar uno al azar
      const randomProd = data[Math.floor(Math.random() * data.length)]
      toggleFavorito({
        codigo: randomProd.codigo,
        descripcion: randomProd.descripcion,
        categoria: randomProd.categoria,
        precio_publico: randomProd.precio_publico
      })
      stopScanning()
      if (typeof navigator !== 'undefined' && navigator.vibrate) {
        navigator.vibrate(60)
      }
    }
  }

  // ── 5. Cargar Compras Históricas ──
  useEffect(() => {
    if (!showHistorico) return

    async function cargarHistorico() {
      setCargandoHistorico(true)
      let items: any[] = []

      if (user) {
        const email = user.email ?? ''
        const { data: pedidos } = await supabase
          .from('ol_pedidos')
          .select('id')
          .or(`user_id.eq.${user.id},email_cliente.eq.${email}`)
          .limit(10)

        if (pedidos && pedidos.length > 0) {
          const { data: pedidoItems } = await supabase
            .from('ol_pedido_items')
            .select('codigo, descripcion, precio_unitario')
            .in('pedido_id', pedidos.map(p => p.id))
          
          if (pedidoItems) items = pedidoItems
        }
      } else {
        const locales = getPedidosLocales()
        items = locales.flatMap(p => p.items)
      }

      // De-duplicar por código y buscar categoría faltante
      const map = new Map()
      items.forEach(it => {
        if (it.codigo) {
          map.set(it.codigo, {
            codigo: it.codigo,
            descripcion: it.descripcion,
            precio_unitario: it.precio_unitario,
            categoria: 'Abarrotes' // Categoría por defecto si no existe
          })
        }
      })
      
      setHistorico(Array.from(map.values()))
      setCargandoHistorico(false)
    }

    cargarHistorico()
  }, [showHistorico, user])

  // Ordenar lista: artículos sin tachar primero, tachados al final
  const sortedLista = [...lista].sort((a, b) => {
    const aChecked = checkedCodes.has(a.codigo) ? 1 : 0
    const bChecked = checkedCodes.has(b.codigo) ? 1 : 0
    return aChecked - bChecked
  })

  const totalLista = lista.reduce((s, p) => s + p.precio_unitario, 0)

  return (
    <div className="max-w-lg mx-auto px-4 py-5 space-y-4 pb-24">
      {/* Encabezado */}
      <div className="flex items-center justify-between">
        <div>
          <h1 className="text-xl font-black text-gray-900 flex items-center gap-1.5">
            <span>🛒</span> Lista de compras
          </h1>
          <p className="text-xs text-gray-400">
            {lista.length} artículo{lista.length !== 1 ? 's' : ''} en tu lista
          </p>
        </div>
        <button
          onClick={compartir}
          className="flex items-center gap-1.5 border border-gray-200 bg-white hover:bg-gray-50 text-gray-600 text-xs font-semibold px-3 py-2 rounded-xl shadow-sm transition cursor-pointer"
        >
          <Share2 size={13} />
          {copiado ? '¡Copiado!' : 'Compartir lista'}
        </button>
      </div>

      {/* ── SECCIÓN AÑADIR PRODUCTO ── */}
      <div className="bg-white border border-gray-100 rounded-2xl p-3.5 shadow-sm space-y-3 relative">
        <div className="text-xs font-bold text-gray-500 uppercase tracking-wide">Añadir a la lista</div>
        <div className="flex gap-2">
          {/* Autocomplete Input */}
          <div className="flex-1 relative">
            <Search size={16} className="absolute left-3.5 top-1/2 -translate-y-1/2 text-gray-400" />
            <input
              type="text"
              placeholder="Buscar producto por nombre..."
              value={searchQuery}
              onChange={e => setSearchQuery(e.target.value)}
              className="w-full bg-gray-50 border border-gray-200 rounded-xl pl-9 pr-4 py-2.5 text-sm text-gray-800 placeholder-gray-400 focus:outline-none focus:border-green-600 focus:bg-white transition"
            />
            {isSearching && (
              <Loader2 size={14} className="absolute right-3 top-1/2 -translate-y-1/2 animate-spin text-green-600" />
            )}
            
            {/* Sugerencias desplegables */}
            {suggestions.length > 0 && (
              <div className="absolute left-0 right-0 mt-2 bg-white border border-gray-100 rounded-xl shadow-lg z-25 max-h-60 overflow-y-auto divide-y divide-gray-50">
                {suggestions.map(s => (
                  <button
                    key={s.codigo}
                    onClick={() => handleSelectSuggestion(s)}
                    className="w-full text-left px-4 py-3 hover:bg-green-50/50 flex items-center justify-between text-xs font-medium text-gray-800 transition"
                  >
                    <span className="truncate pr-2">{s.descripcion}</span>
                    <span className="font-bold text-green-700 shrink-0">{fmt(s.precio_publico)}</span>
                  </button>
                ))}
              </div>
            )}
          </div>

          {/* Botón Escanear */}
          <button
            onClick={startScanning}
            className="bg-green-600 hover:bg-green-700 text-white p-2.5 rounded-xl flex items-center justify-center shadow-sm transition active:scale-95 cursor-pointer shrink-0"
            title="Escanear código de barras"
          >
            <QrCode size={18} />
          </button>
        </div>
      </div>

      {/* ── SECCIÓN COMPRAS HISTÓRICAS ── */}
      <div className="bg-white border border-gray-100 rounded-2xl overflow-hidden shadow-sm">
        <button
          onClick={() => setShowHistorico(!showHistorico)}
          className="w-full px-4 py-3 flex items-center justify-between hover:bg-gray-50/50 transition text-left cursor-pointer"
        >
          <div className="flex items-center gap-2">
            <History size={16} className="text-gray-500" />
            <span className="text-sm font-bold text-gray-700">Agregar de mis compras pasadas</span>
          </div>
          <span className="text-xs text-gray-400 font-extrabold">{showHistorico ? '▲' : '▼'}</span>
        </button>

        {showHistorico && (
          <div className="border-t border-gray-50 p-3 bg-gray-50/30">
            {cargandoHistorico ? (
              <div className="flex justify-center py-4">
                <Loader2 size={20} className="animate-spin text-green-600" />
              </div>
            ) : historico.length === 0 ? (
              <div className="text-xs text-gray-400 text-center py-3">No tienes compras anteriores guardadas en este dispositivo.</div>
            ) : (
              <div className="flex flex-wrap gap-1.5 max-h-48 overflow-y-auto pr-1">
                {historico.map(h => {
                  const yaEnLista = lista.some(x => x.codigo === h.codigo)
                  return (
                    <button
                      key={h.codigo}
                      disabled={yaEnLista}
                      onClick={() => toggleFavorito({ codigo: h.codigo, descripcion: h.descripcion, categoria: h.categoria, precio_publico: h.precio_unitario })}
                      className={`text-[11px] font-semibold px-2.5 py-1.5 rounded-lg border transition flex items-center gap-1 active:scale-95 cursor-pointer
                        ${yaEnLista 
                          ? 'bg-gray-100 text-gray-400 border-gray-200 cursor-not-allowed'
                          : 'bg-white hover:bg-green-50 hover:border-green-200 border-gray-200 text-gray-700 shadow-xs'}`}
                    >
                      <Plus size={10} />
                      <span className="truncate max-w-[120px]">{h.descripcion}</span>
                    </button>
                  )
                })}
              </div>
            )}
          </div>
        )}
      </div>

      {/* ── LISTADO PRINCIPAL DE LA LISTA DE COMPRAS ── */}
      {lista.length === 0 ? (
        <div className="bg-white border border-gray-100 rounded-3xl p-10 flex flex-col items-center gap-4 text-center shadow-xs">
          <div className="w-16 h-16 rounded-2xl bg-green-50 flex items-center justify-center text-3xl">📝</div>
          <h2 className="text-base font-extrabold text-gray-800">Tu lista está vacía</h2>
          <p className="text-xs text-gray-400 max-w-xs leading-relaxed">Escanea un código de barras de un contenedor vacío o escribe nombres de productos para armar tu lista de compras para el súper.</p>
          <Link href="/productos"
            className="bg-green-600 hover:bg-green-700 text-white font-bold px-5 py-2.5 rounded-xl text-xs transition shadow-sm">
            Explorar catálogo
          </Link>
        </div>
      ) : (
        <div className="space-y-2">
          {sortedLista.map(prod => {
            const isChecked = checkedCodes.has(prod.codigo)
            const cantEnCarrito = getQty(prod.codigo)
            
            return (
              <div
                key={prod.codigo}
                className={`bg-white border rounded-2xl p-3 shadow-xs flex items-center gap-3 transition-all duration-150
                  ${isChecked 
                    ? 'border-gray-200 bg-gray-50/50 opacity-65' 
                    : 'border-gray-100 hover:border-gray-200'}`}
              >
                {/* 1. Casilla de Verificación (Tachar) */}
                <button
                  onClick={() => toggleChecked(prod.codigo)}
                  className={`w-5 h-5 rounded-full flex items-center justify-center border transition shrink-0 cursor-pointer
                    ${isChecked 
                      ? 'bg-green-600 border-green-600 text-white' 
                      : 'border-gray-300 hover:border-green-600 bg-white'}`}
                >
                  {isChecked && <Check size={11} className="stroke-[3.5]" />}
                </button>

                {/* Emoji Categoría */}
                <div className="w-9 h-9 bg-gray-50 border border-gray-100 rounded-xl flex items-center justify-center text-lg shrink-0">
                  {CAT_EMOJI[prod.categoria] || '🛒'}
                </div>

                {/* Información */}
                <div className="flex-1 min-w-0" onClick={() => toggleChecked(prod.codigo)}>
                  <div className={`text-xs font-bold text-gray-800 leading-snug truncate cursor-pointer
                    ${isChecked ? 'line-through text-gray-400' : ''}`}>
                    {prod.descripcion}
                  </div>
                  <div className="text-[10px] text-gray-400 mt-0.5">{prod.categoria}</div>
                  <div className={`text-xs font-black text-green-700 mt-0.5 ${isChecked ? 'text-gray-400' : ''}`}>
                    {fmt(prod.precio_unitario)}
                  </div>
                </div>

                {/* 2. Selector de Cantidad en Carrito o Botón Agregar */}
                <div className="shrink-0 flex items-center gap-1.5">
                  {cantEnCarrito === 0 ? (
                    <button
                      onClick={() => handleAgregarCarrito(prod)}
                      className={`flex items-center gap-1 text-[11px] font-bold px-2.5 py-1.5 rounded-lg active:scale-95 transition shadow-xs cursor-pointer
                        ${agregados.has(prod.codigo)
                          ? 'bg-green-100 text-green-700'
                          : 'bg-green-600 hover:bg-green-700 text-white'}`}
                    >
                      <ShoppingCart size={11} />
                      {agregados.has(prod.codigo) ? 'Listo' : '+ Carrito'}
                    </button>
                  ) : (
                    <div className="flex items-center bg-green-600 text-white rounded-lg overflow-hidden h-[30px] shadow-sm select-none border border-green-700">
                      <button
                        onClick={() => handleCambiarCantidad(prod.codigo, cantEnCarrito - 1)}
                        className="px-2.5 h-full hover:bg-green-700 active:scale-90 transition flex items-center justify-center font-bold"
                      >
                        <Minus size={9} />
                      </button>
                      <span className="text-[11px] font-black w-5 text-center">{cantEnCarrito}</span>
                      <button
                        onClick={() => handleCambiarCantidad(prod.codigo, cantEnCarrito + 1)}
                        className="px-2.5 h-full hover:bg-green-700 active:scale-90 transition flex items-center justify-center font-bold"
                      >
                        <Plus size={9} />
                      </button>
                    </div>
                  )}

                  {/* Botón Borrar de la Lista */}
                  <button
                    onClick={() => quitar(prod)}
                    className="text-gray-300 hover:text-red-500 transition p-1.5 rounded-lg hover:bg-gray-50 active:scale-95 cursor-pointer"
                    title="Quitar de la lista"
                  >
                    <Trash2 size={13} />
                  </button>
                </div>
              </div>
            )
          })}
        </div>
      )}

      {/* ── TOTAL ESTIMADO Y BOTÓN DE ACCIÓN ── */}
      {lista.length > 0 && (
        <div className="bg-white border border-gray-100 rounded-2xl p-4 shadow-sm flex items-center justify-between">
          <div>
            <div className="text-[10px] text-gray-400 uppercase font-bold">Total estimado</div>
            <div className="text-lg font-black text-green-700">{fmt(totalLista)}</div>
          </div>
          <button
            onClick={agregarTodos}
            className="flex items-center gap-1.5 bg-green-600 hover:bg-green-700 text-white font-bold px-4 py-2.5 rounded-xl text-xs active:scale-95 transition shadow-sm cursor-pointer"
          >
            <ShoppingCart size={13} />
            Agregar todos al carrito
          </button>
        </div>
      )}

      {/* ── MODAL DEL ESCÁNER DE CÓDIGO DE BARRAS ── */}
      {isScanning && (
        <div className="fixed inset-0 bg-black/75 backdrop-blur-md z-50 flex flex-col justify-between p-4">
          {/* Header del Escáner */}
          <div className="flex items-center justify-between text-white">
            <div>
              <h3 className="font-extrabold text-sm flex items-center gap-1.5">
                <QrCode size={16} className="text-green-400" /> Escanear Código
              </h3>
              <p className="text-[10px] text-gray-400">Enfoca el código de barras en el recuadro</p>
            </div>
            <button
              onClick={stopScanning}
              className="w-8 h-8 rounded-full bg-white/10 flex items-center justify-center text-white hover:bg-white/20 active:scale-95 transition cursor-pointer"
            >
              <X size={16} />
            </button>
          </div>

          {/* Cámara y Visor */}
          <div className="flex-1 flex flex-col items-center justify-center py-4 relative">
            <div className="w-72 h-56 rounded-2xl border-2 border-dashed border-green-500 overflow-hidden bg-black/40 relative shadow-[0_0_50px_rgba(34,197,94,0.15)]">
              {/* Línea de escaneo láser */}
              <div className="absolute inset-x-0 h-[2px] bg-red-500 animate-pulse shadow-[0_0_8px_#ef4444]" style={{ top: '50%' }} />
              
              <video
                ref={videoRef}
                className="w-full h-full object-cover"
                style={{ transform: 'scaleX(1)' }}
              />
              <canvas ref={canvasRef} className="hidden" />

              {!isCameraReady && !errorMsg && (
                <div className="absolute inset-0 flex flex-col items-center justify-center gap-2 text-white bg-black/60 p-4 text-center">
                  <Loader2 size={24} className="animate-spin text-green-500" />
                  <span className="text-xs">Cargando visor de cámara...</span>
                </div>
              )}
            </div>

            {errorMsg && (
              <div className="mt-4 bg-red-950/60 border border-red-800 text-red-200 text-xs px-3.5 py-2.5 rounded-xl max-w-xs flex items-start gap-2 shadow-sm">
                <AlertCircle size={14} className="shrink-0 mt-0.5 text-red-400" />
                <span>{errorMsg}</span>
              </div>
            )}
          </div>

          {/* Controles de Entrada Manual / Simulación */}
          <div className="bg-white border border-gray-100 rounded-3xl p-4 space-y-3.5 max-w-sm mx-auto w-full shadow-lg">
            <div className="text-center font-bold text-gray-800 text-xs uppercase tracking-wider">¿No puedes escanear?</div>
            
            {/* Input Manual */}
            <div className="flex gap-2">
              <input
                type="text"
                placeholder="Escribe código de barras..."
                value={manualCode}
                onChange={e => setManualCode(e.target.value)}
                className="flex-1 bg-gray-50 border border-gray-200 rounded-xl px-3 py-2 text-xs focus:outline-none focus:border-green-600 focus:bg-white"
              />
              <button
                onClick={() => handleBarcodeSubmit(manualCode)}
                className="bg-green-600 hover:bg-green-700 text-white font-bold px-4 py-2 rounded-xl text-xs transition active:scale-95 cursor-pointer"
              >
                Ingresar
              </button>
            </div>

            <div className="relative flex py-1 items-center">
              <div className="flex-grow border-t border-gray-100"></div>
              <span className="flex-shrink mx-3 text-[10px] text-gray-300 font-bold uppercase">o</span>
              <div className="flex-grow border-t border-gray-100"></div>
            </div>

            {/* Simulación */}
            <button
              onClick={simularEscaneoPrueba}
              className="w-full bg-orange-50 hover:bg-orange-100 border border-orange-200 text-orange-700 font-bold py-2.5 rounded-xl text-xs flex items-center justify-center gap-1.5 transition active:scale-95 cursor-pointer shadow-xs"
            >
              <Sparkles size={13} className="text-orange-500" />
              Simular escaneo de prueba (ej. Tuti)
            </button>
          </div>
        </div>
      )}
    </div>
  )
}


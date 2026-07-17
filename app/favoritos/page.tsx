'use client'
import { useEffect, useState, useRef } from 'react'
import { ShoppingCart, Share2, Trash2, Search, QrCode, X, Plus, Minus, History, Check, Loader2, Sparkles, AlertCircle, ClipboardList, Edit3, Save } from 'lucide-react'
import Link from 'next/link'
import { getFavoritos, toggleFavorito, ItemFavorito, serializarFavoritos } from '@/lib/favoritos'
import { agregarItem, getCarrito, cambiarCantidad } from '@/lib/carrito'
import { supabase } from '@/lib/supabase'
import { useAuth } from '@/context/AuthContext'
import { getPedidosLocales } from '@/lib/perfil'
import { CAT_EMOJI } from '@/lib/types'

function fmt(n: number) { return '$' + n.toFixed(2) }

interface ListaCompras {
  id: string
  nombre: string
  notas: string
  items: ItemFavorito[]
  created_at: string
}

export default function FavoritosPage() {
  const { user } = useAuth()
  
  // ── Estados Múltiples Listas ──
  const [lists, setLists] = useState<ListaCompras[]>([])
  const [activeListId, setActiveListId] = useState<string>('general')
  const [isCreatingList, setIsCreatingList] = useState(false)
  const [newListName, setNewListName] = useState('')
  const [isRenamingList, setIsRenamingList] = useState(false)
  const [renameValue, setRenameValue] = useState('')
  const [activeListNotes, setActiveListNotes] = useState('')

  // ── Estados de Interacción de Items ──
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

  // ── Estados de Importación de Lista Compartida ──
  const [importData, setImportData] = useState<{ n: string; o: string; i: any[] } | null>(null)
  const [mostrarImportModal, setMostrarImportModal] = useState(false)

  // ── 1. Inicialización de Listas ──
  useEffect(() => {
    let savedLists: ListaCompras[] = []
    let activeId = 'general'
    
    try {
      const rawLists = localStorage.getItem('lc_shopping_lists')
      if (rawLists) {
        savedLists = JSON.parse(rawLists)
      }
      
      const rawActiveId = localStorage.getItem('lc_active_list_id')
      if (rawActiveId) {
        activeId = rawActiveId
      }
    } catch (e) {
      console.error(e)
    }

    // Inicializar por defecto si está vacío
    if (savedLists.length === 0) {
      savedLists = [
        {
          id: 'general',
          nombre: 'Lista General',
          notas: '',
          items: getFavoritos(), // Migrar favoritos existentes
          created_at: new Date().toISOString()
        }
      ]
    }
    
    setLists(savedLists)
    setActiveListId(activeId)
    setCartItems(getCarrito())

    // Cargar códigos tachados de localStorage
    try {
      const savedChecked = localStorage.getItem('lc_checked_items')
      if (savedChecked) setCheckedCodes(new Set(JSON.parse(savedChecked)))
    } catch (e) {
      console.error(e)
    }

    const syncCarrito = () => setCartItems(getCarrito())
    window.addEventListener('carrito-update', syncCarrito)

    return () => {
      window.removeEventListener('carrito-update', syncCarrito)
    }
  }, [])

  // Sincronizar las notas de la lista activa al cambiar de lista
  useEffect(() => {
    const activeList = lists.find(l => l.id === activeListId)
    if (activeList) {
      setActiveListNotes(activeList.notas)
    }
  }, [activeListId, lists])

  // ── Importación de Lista Compartida al Cargar ──
  useEffect(() => {
    if (typeof window === 'undefined') return
    const params = new URLSearchParams(window.location.search)
    const importListVal = params.get('importList')
    if (importListVal) {
      try {
        const decodedStr = decodeURIComponent(escape(atob(importListVal)))
        const parsed = JSON.parse(decodedStr)
        if (parsed && parsed.n && Array.isArray(parsed.i)) {
          setImportData(parsed)
          setMostrarImportModal(true)
        }
      } catch (e) {
        console.error("Error al decodificar la lista importada:", e)
      }
    }
  }, [])

  // ── 2. Guardar en Storage & Sincronizar con el Catálogo (lc_favoritos) ──
  const updateListsStateAndStorage = (newLists: ListaCompras[], nextActiveId: string = activeListId) => {
    setLists(newLists)
    localStorage.setItem('lc_shopping_lists', JSON.stringify(newLists))
    
    // Sincronizar la lista activa con 'lc_favoritos' (legado) para que el catálogo de productos refleje el estado correcto
    const activeList = newLists.find(l => l.id === nextActiveId)
    if (activeList) {
      localStorage.setItem('lc_favoritos', JSON.stringify(activeList.items))
      window.dispatchEvent(new Event('favoritos-update'))
    }
  }

  // Escuchar cuando el usuario hace clic en el botón de agregar a la lista desde otras páginas (Home / Catálogo)
  useEffect(() => {
    const handleFavoritosUpdate = () => {
      const legacyItems = getFavoritos()
      setLists(prevLists => {
        const nextLists = prevLists.map(l => {
          if (l.id === activeListId) {
            return { ...l, items: legacyItems }
          }
          return l
        })
        localStorage.setItem('lc_shopping_lists', JSON.stringify(nextLists))
        return nextLists
      })
    }

    window.addEventListener('favoritos-update', handleFavoritosUpdate)
    return () => window.removeEventListener('favoritos-update', handleFavoritosUpdate)
  }, [activeListId])

  // Cambiar de lista activa
  const handleSwitchList = (id: string) => {
    setActiveListId(id)
    localStorage.setItem('lc_active_list_id', id)
    
    // Sincronizar de inmediato
    const activeList = lists.find(l => l.id === id)
    if (activeList) {
      localStorage.setItem('lc_favoritos', JSON.stringify(activeList.items))
      window.dispatchEvent(new Event('favoritos-update'))
    }
  }

  // ── 3. Creación y Renombrado de Listas ──
  const handleCreateList = () => {
    if (!newListName.trim()) return
    const newListId = 'list_' + Math.random().toString(36).substr(2, 9)
    const newLists: ListaCompras[] = [
      ...lists,
      {
        id: newListId,
        nombre: newListName.trim(),
        notas: '',
        items: [],
        created_at: new Date().toISOString()
      }
    ]
    updateListsStateAndStorage(newLists, newListId)
    setActiveListId(newListId)
    localStorage.setItem('lc_active_list_id', newListId)
    
    setNewListName('')
    setIsCreatingList(false)
  }

  const handleRenameList = () => {
    if (!renameValue.trim()) return
    const newLists = lists.map(l => {
      if (l.id === activeListId) {
        return { ...l, nombre: renameValue.trim() }
      }
      return l
    })
    updateListsStateAndStorage(newLists)
    setIsRenamingList(false)
  }

  const handleDeleteList = (idToDelete: string) => {
    if (lists.length <= 1) return
    const confirmDelete = window.confirm('¿Seguro que deseas eliminar esta lista de compras y todos sus productos?')
    if (!confirmDelete) return

    const newLists = lists.filter(l => l.id !== idToDelete)
    let nextActiveId = activeListId
    if (activeListId === idToDelete) {
      nextActiveId = newLists[0].id
    }
    
    updateListsStateAndStorage(newLists, nextActiveId)
    setActiveListId(nextActiveId)
    localStorage.setItem('lc_active_list_id', nextActiveId)
  }

  const handleNotesChange = (val: string) => {
    setActiveListNotes(val)
    const newLists = lists.map(l => {
      if (l.id === activeListId) {
        return { ...l, notas: val }
      }
      return l
    })
    setLists(newLists)
    localStorage.setItem('lc_shopping_lists', JSON.stringify(newLists))
  }

  // ── 4. Acciones sobre la Lista Activa ──
  const activeList = lists.find(l => l.id === activeListId) || { id: 'general', nombre: 'Lista General', notas: '', items: [] }
  const activeItems = activeList.items

  const handleCheckedToggle = (codigo: string) => {
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
    const updatedItems = activeItems.filter(f => f.codigo !== prod.codigo)
    const newLists = lists.map(l => {
      if (l.id === activeListId) {
        return { ...l, items: updatedItems }
      }
      return l
    })
    updateListsStateAndStorage(newLists)
    
    // Quitar del tachado
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
    activeItems.forEach(p => agregarItem({ codigo: p.codigo, descripcion: p.descripcion, categoria: p.categoria, precio_publico: p.precio_unitario }))
    const todos = new Set(activeItems.map(p => p.codigo))
    setAgregados(todos)
    setTimeout(() => setAgregados(new Set()), 1500)
  }

  function compartir() {
    try {
      const shareData = {
        n: activeList.nombre,
        o: activeList.notas || '',
        i: activeList.items.map(item => ({
          c: item.codigo,
          d: item.descripcion,
          cat: item.categoria,
          p: item.precio_unitario
        }))
      }
      const base64Str = btoa(unescape(encodeURIComponent(JSON.stringify(shareData))))
      const url = `${window.location.origin}/favoritos?importList=${base64Str}`
      
      if (navigator.clipboard) {
        navigator.clipboard.writeText(url).then(() => {
          setCopiado(true)
          setTimeout(() => setCopiado(false), 2000)
        })
      }
      
      const text = `Te comparto mi lista de compras "${activeList.nombre}" en Tienlo. Abre el link para ver los artículos o agregar los tuyos: ${url}`
      const whatsappUrl = `https://api.whatsapp.com/send?text=${encodeURIComponent(text)}`
      window.open(whatsappUrl, '_blank')
    } catch (e) {
      console.error("Error al compartir la lista:", e)
      alert("No se pudo generar el enlace para compartir.")
    }
  }

  const handleImportConfirm = () => {
    if (!importData) return
    const newListId = 'list_' + Math.random().toString(36).substr(2, 9)
    
    const parsedItems: ItemFavorito[] = importData.i.map((item: any) => ({
      codigo: item.c,
      descripcion: item.d,
      categoria: item.cat || 'General',
      precio_unitario: item.p || 0,
      agregadoEn: new Date().toISOString()
    }))

    const newLists: ListaCompras[] = [
      ...lists,
      {
        id: newListId,
        nombre: `${importData.n} (Importada)`,
        notas: importData.o || '',
        items: parsedItems,
        created_at: new Date().toISOString()
      }
    ]

    updateListsStateAndStorage(newLists, newListId)
    setActiveListId(newListId)
    localStorage.setItem('lc_active_list_id', newListId)

    const newUrl = window.location.pathname
    window.history.replaceState({}, '', newUrl)

    setImportData(null)
    setMostrarImportModal(false)
    
    if (typeof navigator !== 'undefined' && navigator.vibrate) {
      navigator.vibrate([100, 50, 100])
    }
  }

  const handleImportCancel = () => {
    const newUrl = window.location.pathname
    window.history.replaceState({}, '', newUrl)
    setImportData(null)
    setMostrarImportModal(false)
  }

  // ── 5. Buscador por Nombre Autocomplete ──
  useEffect(() => {
    if (searchQuery.trim().length < 2) {
      setSuggestions([])
      return
    }
    setIsSearching(true)
    const delayDebounce = setTimeout(async () => {
      // 1. Intentar Búsqueda de Texto Completo (FTS)
      let { data, error } = await supabase
        .from('ol_productos')
        .select('codigo, descripcion, categoria, precio_publico')
        .textSearch('descripcion', searchQuery.trim(), {
          config: 'spanish',
          type: 'websearch'
        })
        .limit(6)
      
      // 2. Fallback a coincidencia ilike por palabras clave si no hay resultados
      if (error || !data || data.length === 0) {
        const words = searchQuery.trim().split(/\s+/).filter(w => w.length > 1)
        if (words.length > 0) {
          let query = supabase.from('ol_productos').select('codigo, descripcion, categoria, precio_publico')
          words.forEach(w => {
            query = query.ilike('descripcion', `%${w}%`)
          })
          const { data: fallbackData } = await query.limit(6)
          if (fallbackData) data = fallbackData
        }
      }
      
      if (data) setSuggestions(data)
      setIsSearching(false)
    }, 250)

    return () => clearTimeout(delayDebounce)
  }, [searchQuery])

  const handleAddCustomItem = (name: string) => {
    if (!name) return
    const customCode = 'manual_' + Math.random().toString(36).substr(2, 9)
    const yaExiste = activeItems.some(f => f.descripcion.toLowerCase() === name.toLowerCase())
    
    if (!yaExiste) {
      const updatedItems = [
        {
          codigo: customCode,
          descripcion: name,
          categoria: 'Personalizado',
          precio_unitario: 0,
          agregadoEn: new Date().toISOString()
        },
        ...activeItems
      ]
      const newLists = lists.map(l => {
        if (l.id === activeListId) {
          return { ...l, items: updatedItems }
        }
        return l
      })
      updateListsStateAndStorage(newLists)
    }
    
    setSearchQuery('')
    setSuggestions([])
  }

  function handleSelectSuggestion(prod: any) {
    const yaExiste = activeItems.some(f => f.codigo === prod.codigo)
    if (!yaExiste) {
      const updatedItems = [
        {
          codigo: prod.codigo,
          descripcion: prod.descripcion,
          categoria: prod.categoria,
          precio_unitario: prod.precio_publico,
          agregadoEn: new Date().toISOString()
        },
        ...activeItems
      ]
      const newLists = lists.map(l => {
        if (l.id === activeListId) {
          return { ...l, items: updatedItems }
        }
        return l
      })
      updateListsStateAndStorage(newLists)
    }
    setSearchQuery('')
    setSuggestions([])
  }

  // ── 6. Lógica de Escáner de Código de Barras ──
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
      const yaExiste = activeItems.some(f => f.codigo === data.codigo)
      if (!yaExiste) {
        const updatedItems = [
          {
            codigo: data.codigo,
            descripcion: data.descripcion,
            categoria: data.categoria,
            precio_unitario: data.precio_publico,
            agregadoEn: new Date().toISOString()
          },
          ...activeItems
        ]
        const newLists = lists.map(l => {
          if (l.id === activeListId) {
            return { ...l, items: updatedItems }
          }
          return l
        })
        updateListsStateAndStorage(newLists)
      }
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
      const randomProd = data[Math.floor(Math.random() * data.length)]
      const yaExiste = activeItems.some(f => f.codigo === randomProd.codigo)
      if (!yaExiste) {
        const updatedItems = [
          {
            codigo: randomProd.codigo,
            descripcion: randomProd.descripcion,
            categoria: randomProd.categoria,
            precio_unitario: randomProd.precio_publico,
            agregadoEn: new Date().toISOString()
          },
          ...activeItems
        ]
        const newLists = lists.map(l => {
          if (l.id === activeListId) {
            return { ...l, items: updatedItems }
          }
          return l
        })
        updateListsStateAndStorage(newLists)
      }
      stopScanning()
      if (typeof navigator !== 'undefined' && navigator.vibrate) {
        navigator.vibrate(60)
      }
    }
  }

  // ── 7. Cargar Compras Históricas ──
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

      const map = new Map()
      items.forEach(it => {
        if (it.codigo) {
          map.set(it.codigo, {
            codigo: it.codigo,
            descripcion: it.descripcion,
            precio_unitario: it.precio_unitario,
            categoria: 'Abarrotes'
          })
        }
      })
      
      setHistorico(Array.from(map.values()))
      setCargandoHistorico(false)
    }

    cargarHistorico()
  }, [showHistorico, user])

  // Ordenar lista activa: artículos sin tachar primero, tachados al final
  const sortedLista = [...activeItems].sort((a, b) => {
    const aChecked = checkedCodes.has(a.codigo) ? 1 : 0
    const bChecked = checkedCodes.has(b.codigo) ? 1 : 0
    return aChecked - bChecked
  })

  const totalLista = activeItems.reduce((s, p) => s + p.precio_unitario, 0)

  return (
    <div className="max-w-lg mx-auto px-4 py-5 space-y-4 pb-24">
      {/* ── ENCABEZADO Y COMPARTIR ── */}
      <div className="flex items-center justify-between">
        <div>
          <h1 className="text-xl font-black text-gray-900 flex items-center gap-1.5">
            <ClipboardList size={22} className="text-green-600" />
            <span>Lista de compras</span>
          </h1>
          <p className="text-xs text-gray-400">
            Gestiona tus listas y agrégalas al súper
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

      {/* ── SELECTOR DE MÚLTIPLES LISTAS (TABS) ── */}
      <div className="space-y-2">
        <div className="flex items-center justify-between">
          <span className="text-xs font-bold text-gray-400 uppercase tracking-wide">Mis Listas</span>
          {!isCreatingList && (
            <button
              onClick={() => setIsCreatingList(true)}
              className="text-xs font-bold text-green-600 hover:text-green-700 flex items-center gap-1 cursor-pointer"
            >
              <Plus size={12} /> Nueva Lista
            </button>
          )}
        </div>

        {/* Input para crear nueva lista inline */}
        {isCreatingList && (
          <div className="bg-white border border-green-100 rounded-xl p-3 flex gap-2 items-center shadow-xs">
            <input
              type="text"
              placeholder="Nombre de la lista (ej. Asado, Farmacia...)"
              value={newListName}
              onChange={e => setNewListName(e.target.value)}
              className="flex-1 bg-gray-50 border border-gray-200 rounded-lg px-3 py-1.5 text-xs focus:outline-none focus:border-green-600"
              onKeyDown={e => e.key === 'Enter' && handleCreateList()}
            />
            <button
              onClick={handleCreateList}
              className="bg-green-600 hover:bg-green-700 text-white text-xs font-bold px-3 py-1.5 rounded-lg active:scale-95 transition"
            >
              Crear
            </button>
            <button
              onClick={() => setIsCreatingList(false)}
              className="text-gray-400 hover:text-gray-600 text-xs p-1.5"
            >
              <X size={14} />
            </button>
          </div>
        )}

        {/* Listado de pestañas horizontales */}
        <div className="flex gap-2 overflow-x-auto pb-1 scrollbar-hide">
          {lists.map(l => (
            <button
              key={l.id}
              onClick={() => handleSwitchList(l.id)}
              className={`px-3.5 py-2 rounded-xl text-xs font-bold whitespace-nowrap border shrink-0 transition flex items-center gap-1.5 active:scale-95 cursor-pointer
                ${l.id === activeListId
                  ? 'bg-green-600 text-white border-green-700 shadow-sm'
                  : 'bg-white text-gray-600 border-gray-200 hover:bg-gray-50'}`}
            >
              <span>📁 {l.nombre}</span>
              <span className={`text-[10px] px-1.5 py-0.5 rounded-full font-extrabold ${l.id === activeListId ? 'bg-white/20 text-white' : 'bg-gray-100 text-gray-500'}`}>
                {l.items.length}
              </span>
            </button>
          ))}
        </div>
      </div>

      {/* ── DETALLES DE LA LISTA ACTIVA (NOTAS / RENOMBRAR / ELIMINAR) ── */}
      <div className="bg-white border border-gray-100 rounded-2xl p-4 shadow-sm space-y-3">
        <div className="flex items-center justify-between gap-4">
          {isRenamingList ? (
            <div className="flex gap-2 items-center flex-1">
              <input
                type="text"
                value={renameValue}
                onChange={e => setRenameValue(e.target.value)}
                className="flex-1 bg-gray-50 border border-gray-200 rounded-lg px-2.5 py-1 text-sm font-bold focus:outline-none"
              />
              <button onClick={handleRenameList} className="text-green-600 p-1 hover:text-green-700 cursor-pointer">
                <Save size={16} />
              </button>
              <button onClick={() => setIsRenamingList(false)} className="text-gray-400 p-1 cursor-pointer">
                <X size={16} />
              </button>
            </div>
          ) : (
            <div className="flex items-center gap-2 flex-1 min-w-0">
              <span className="font-extrabold text-gray-800 truncate">{activeList.nombre}</span>
              <button
                onClick={() => { setRenameValue(activeList.nombre); setIsRenamingList(true); }}
                className="text-gray-300 hover:text-gray-500 transition p-0.5 cursor-pointer"
                title="Renombrar lista"
              >
                <Edit3 size={12} />
              </button>
            </div>
          )}

          {/* Botón eliminar (Solo si hay más de 1 lista) */}
          {lists.length > 1 && (
            <button
              onClick={() => handleDeleteList(activeListId)}
              className="text-gray-300 hover:text-red-500 transition text-xs flex items-center gap-1 shrink-0 p-1 cursor-pointer"
            >
              <Trash2 size={13} /> Eliminar Lista
            </button>
          )}
        </div>

        {/* Textarea para Notas */}
        <div>
          <textarea
            placeholder="Notas de esta lista (ej. Comprar la marca Tuti, traer suelto...)"
            value={activeListNotes}
            onChange={e => handleNotesChange(e.target.value)}
            rows={2}
            className="w-full text-xs bg-gray-50/50 hover:bg-gray-50 border border-gray-200 rounded-xl px-3 py-2 text-gray-600 placeholder-gray-400 focus:outline-none focus:border-green-600 focus:bg-white transition resize-none"
          />
        </div>
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
            
            {/* Sugerencias desplegables mejoradas (FTS + Personalizados) */}
            {searchQuery.trim().length >= 2 && (
              <div className="absolute left-0 right-0 mt-2 bg-white border border-gray-100 rounded-2xl shadow-xl z-25 max-h-64 overflow-y-auto divide-y divide-gray-50 animate-in fade-in duration-100">
                {/* 1. Coincidencias del catálogo */}
                {suggestions.map(s => {
                  const yaEnLista = activeItems.some(x => x.codigo === s.codigo)
                  return (
                    <div
                      key={s.codigo}
                      className="px-3.5 py-2.5 hover:bg-gray-50 flex items-center justify-between gap-3 text-xs"
                    >
                      <div 
                        className="flex-1 min-w-0 cursor-pointer"
                        onClick={() => handleSelectSuggestion(s)}
                      >
                        <div className="font-bold text-gray-800 truncate">{s.descripcion}</div>
                        <div className="text-[10px] text-gray-400 mt-0.5">{s.categoria} • {fmt(s.precio_publico)}</div>
                      </div>
                      
                      <button
                        onClick={() => handleSelectSuggestion(s)}
                        className={`p-1.5 rounded-lg active:scale-95 transition shrink-0 cursor-pointer
                          ${yaEnLista 
                            ? 'bg-gray-100 text-gray-400 cursor-default' 
                            : 'bg-green-50 text-green-600 hover:bg-green-100'}`}
                        disabled={yaEnLista}
                        title={yaEnLista ? "Ya en la lista" : "Añadir a la lista"}
                      >
                        {yaEnLista ? <Check size={14} /> : <Plus size={14} />}
                      </button>
                    </div>
                  )
                })}

                {/* 2. Banner de artículo personalizado */}
                <button
                  onClick={() => handleAddCustomItem(searchQuery.trim())}
                  className="w-full text-left px-3.5 py-3 bg-orange-50/50 hover:bg-orange-50 text-xs font-bold text-orange-700 flex items-center gap-2 transition cursor-pointer"
                >
                  <span className="text-sm">📝</span>
                  <span className="truncate flex-1 text-left">
                    Agregar <strong className="underline">"{searchQuery.trim()}"</strong> como personalizado
                  </span>
                  <Plus size={14} className="shrink-0 text-orange-600" />
                </button>
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
                  const yaEnLista = activeItems.some(x => x.codigo === h.codigo)
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

      {/* ── LISTADO PRINCIPAL DE LA LISTA DE COMPRAS ACTIVA ── */}
      {activeItems.length === 0 ? (
        <div className="bg-white border border-gray-100 rounded-3xl p-10 flex flex-col items-center gap-4 text-center shadow-xs">
          <div className="w-16 h-16 rounded-2xl bg-green-50 flex items-center justify-center text-3xl">📝</div>
          <h2 className="text-base font-extrabold text-gray-800">Esta lista está vacía</h2>
          <p className="text-xs text-gray-400 max-w-xs leading-relaxed">Escanea códigos de barras de contenedores vacíos o busca productos por nombre para llenar tu lista <strong>"{activeList.nombre}"</strong>.</p>
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
                  onClick={() => handleCheckedToggle(prod.codigo)}
                  className={`w-5 h-5 rounded-full flex items-center justify-center border transition shrink-0 cursor-pointer
                    ${isChecked 
                      ? 'bg-green-600 border-green-600 text-white' 
                      : 'border-gray-300 hover:border-green-600 bg-white'}`}
                >
                  {isChecked && <Check size={11} className="stroke-[3.5]" />}
                </button>

                {/* Emoji Categoría */}
                <div className="w-9 h-9 bg-gray-50 border border-gray-100 rounded-xl flex items-center justify-center text-lg shrink-0">
                  {prod.categoria === 'Personalizado' ? '📝' : (CAT_EMOJI[prod.categoria] || '🛒')}
                </div>

                {/* Información */}
                <div className="flex-1 min-w-0" onClick={() => handleCheckedToggle(prod.codigo)}>
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
                        className="px-2.5 h-full hover:bg-green-700 active:scale-90 transition flex items-center justify-center font-bold cursor-pointer"
                      >
                        <Minus size={9} />
                      </button>
                      <span className="text-[11px] font-black w-5 text-center">{cantEnCarrito}</span>
                      <button
                        onClick={() => handleCambiarCantidad(prod.codigo, cantEnCarrito + 1)}
                        className="px-2.5 h-full hover:bg-green-700 active:scale-90 transition flex items-center justify-center font-bold cursor-pointer"
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
      {activeItems.length > 0 && (
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

      {/* ── MODAL DE IMPORTACIÓN DE LISTA COMPARTIDA ── */}
      {mostrarImportModal && importData && (
        <div className="fixed inset-0 bg-black/50 backdrop-blur-xs z-50 flex items-center justify-center p-4">
          <div className="bg-white border border-gray-100 rounded-3xl p-6 max-w-sm w-full shadow-2xl space-y-4 animate-in fade-in zoom-in-95 duration-150">
            <div className="flex items-center gap-3">
              <div className="w-10 h-10 rounded-full bg-green-50 flex items-center justify-center text-green-600 shrink-0">
                <Share2 size={20} />
              </div>
              <div>
                <h3 className="font-black text-gray-900 text-base">Importar Lista</h3>
                <p className="text-[10px] text-gray-400">Recibida desde WhatsApp</p>
              </div>
            </div>

            <div className="bg-gray-50 border border-gray-100 rounded-2xl p-3.5 space-y-2">
              <div className="text-sm font-extrabold text-gray-800">{importData.n}</div>
              {importData.o && (
                <div className="text-xs text-gray-500 bg-white p-2 rounded-lg border border-gray-100 italic">
                  "{importData.o}"
                </div>
              )}
              <div className="text-xs text-gray-400 font-bold flex items-center gap-1.5 mt-2">
                <span>📦</span> {importData.i.length} productos detectados
              </div>
            </div>

            <div className="flex gap-2">
              <button
                onClick={handleImportCancel}
                className="flex-1 border border-gray-200 text-gray-500 font-bold py-3 rounded-xl text-xs hover:bg-gray-50 transition active:scale-95 cursor-pointer"
              >
                Ignorar
              </button>
              <button
                onClick={handleImportConfirm}
                className="flex-1 bg-green-600 hover:bg-green-700 text-white font-bold py-3 rounded-xl text-xs transition active:scale-95 cursor-pointer flex items-center justify-center gap-1"
              >
                <Check size={14} /> Importar Lista
              </button>
            </div>
          </div>
        </div>
      )}
    </div>
  )
}

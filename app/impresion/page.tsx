'use client'
import { useState, useEffect, useRef } from 'react'
import { useRouter } from 'next/navigation'
import { 
  Upload, Scissors, FileText, Check, RotateCw, Trash2, 
  Plus, Minus, Info, ArrowLeft, CheckCircle, HelpCircle, Loader2
} from 'lucide-react'
import Link from 'next/link'
import { getCarrito, setCarrito } from '@/lib/carrito'
import { supabase } from '@/lib/supabase'

function fmt(n: number) { return '$' + n.toFixed(2) }

export default function ImpresionPage() {
  const router = useRouter()
  
  // Archivo principal
  const [archivo, setArchivo] = useState<File | null>(null)
  const [tipoArchivo, setTipoArchivo] = useState<'imagen' | 'documento' | null>(null)
  const [previewUrl, setPreviewUrl] = useState<string>('')
  
  // Estados de Recorte (Canvas-based screenshot editor)
  const [croppedImage, setCroppedImage] = useState<string | null>(null)
  const [cropBox, setCropBox] = useState({ x: 0, y: 0, w: 100, h: 100 }) // en porcentajes de la imagen
  const [cropActive, setCropActive] = useState(false)
  const [esScreenshotDetectado, setEsScreenshotDetectado] = useState(false)
  
  // Opciones de Impresión
  const [formatoSize, setFormatoSize] = useState<'A4' | 'A5' | 'A6' | 'carnet' | 'personalizado'>('A4')
  const [customWidth, setCustomWidth] = useState(15) // en cm
  const [customHeight, setCustomHeight] = useState(10) // en cm
  
  const [colorMode, setColorMode] = useState<'bn' | 'color'>('bn')
  const [coberturaColor, setCoberturaColor] = useState<'bajo' | 'medio' | 'alto'>('bajo') // <25%, 50%, 100%
  const [tipoPapel, setTipoPapel] = useState<'bond75' | 'bond90' | 'cartulina' | 'foto'>('bond75')
  const [dobleFaz, setDobleFaz] = useState(false)
  const [numeroCopias, setNumeroCopias] = useState(1)
  
  // Para PDF/Documentos
  const [paginasDocumento, setPaginasDocumento] = useState(1)
  const [rangoModo, setRangoModo] = useState<'todo' | 'rango'>('todo')
  const [rangoTexto, setRangoTexto] = useState('')
  const [paginasCalculadas, setPaginasCalculadas] = useState(1)
  const [paginasColorManual, setPaginasColorManual] = useState('') // ej: "1, 3" para mixto
  const [modoMixtoDoc, setModoMixtoDoc] = useState(false)

  // Estados de UI y Envío
  const [loading, setLoading] = useState(false)
  const [agregadoExito, setAgregadoExito] = useState(false)
  const [errorMsg, setErrorMsg] = useState('')
  const [msgCarga, setMsgCarga] = useState('')

  const imgRef = useRef<HTMLImageElement | null>(null)
  const cropperContainerRef = useRef<HTMLDivElement | null>(null)
  const isDragging = useRef<string | null>(null) // handle de arrastre
  const startDragOffset = useRef({ x: 0, y: 0 })

  // 1. Detectar páginas de PDF al cargar archivo
  useEffect(() => {
    if (!archivo) return
    
    if (archivo.type.startsWith('image/')) {
      setTipoArchivo('imagen')
      setCroppedImage(null)
      setCropActive(false)
      setEsScreenshotDetectado(false)
      
      const url = URL.createObjectURL(archivo)
      setPreviewUrl(url)
      
      // Auto-detección de captura de pantalla
      const isScreenshotName = archivo.name.toLowerCase().includes('screenshot') || archivo.name.toLowerCase().includes('captura')
      
      // Creamos una imagen temporal para validar aspecto
      const tempImg = new Image()
      tempImg.onload = () => {
        const aspect = tempImg.height / tempImg.width
        const isTallRatio = aspect > 1.8 // Relación móvil típica
        
        if (isScreenshotName || isTallRatio) {
          setEsScreenshotDetectado(true)
          // Pre-ajustar recorte: omitir 6% superior (status bar) y 6% inferior (nav bar)
          setCropBox({ x: 0, y: 6, w: 100, h: 88 })
          setCropActive(true)
        } else {
          setCropBox({ x: 10, y: 10, w: 80, h: 80 })
        }
      }
      tempImg.src = url

    } else {
      setTipoArchivo('documento')
      setPreviewUrl('')
      setCroppedImage(null)
      setCropActive(false)
      setEsScreenshotDetectado(false)
      setPaginasDocumento(1)
      setPaginasCalculadas(1)
      
      if (archivo.type === 'application/pdf') {
        setMsgCarga('Analizando PDF...')
        // Lector binario super liviano para estimar páginas en el cliente
        const reader = new FileReader()
        reader.onload = function(e) {
          const contents = e.target?.result as string
          // Buscamos todas las ocurrencias de "/Type /Page" o "/Type/Page" en la estructura del PDF
          const matches = contents.match(/\/Type\s*\/Page\b/g)
          const pages = matches ? matches.length : 1
          setPaginasDocumento(pages)
          setPaginasCalculadas(pages)
          setMsgCarga('')
        }
        reader.readAsBinaryString(archivo)
      } else {
        // Word/Excel, etc.
        setPaginasDocumento(1)
        setPaginasCalculadas(1)
      }
    }
  }, [archivo])

  // 2. Calcular páginas a imprimir según rango manual
  useEffect(() => {
    if (tipoArchivo !== 'documento') {
      setPaginasCalculadas(1)
      return
    }
    
    if (rangoModo === 'todo') {
      setPaginasCalculadas(paginasDocumento)
    } else {
      // Intentar evaluar el rango (ej: 1-5, 8)
      if (!rangoTexto.trim()) {
        setPaginasCalculadas(paginasDocumento)
        return
      }
      try {
        let totalPags = 0
        const partes = rangoTexto.split(',')
        partes.forEach(part => {
          if (part.includes('-')) {
            const range = part.split('-')
            const inicio = parseInt(range[0])
            const fin = parseInt(range[1])
            if (!isNaN(inicio) && !isNaN(fin) && fin >= inicio) {
              totalPags += (fin - inicio + 1)
            }
          } else {
            const val = parseInt(part)
            if (!isNaN(val)) totalPags += 1
          }
        })
        setPaginasCalculadas(totalPags > 0 ? Math.min(totalPags, paginasDocumento) : paginasDocumento)
      } catch {
        setPaginasCalculadas(paginasDocumento)
      }
    }
  }, [rangoModo, rangoTexto, paginasDocumento, tipoArchivo])

  // 3. Motor de Precios
  const calcularPrecioUnitario = () => {
    // A. Si es Imagen/Foto
    if (tipoArchivo === 'imagen') {
      let base = 0.05 // Blanco y Negro por defecto
      
      if (colorMode === 'color') {
        // En color depende del tamaño del lienzo
        if (formatoSize === 'carnet' || formatoSize === 'A6') {
          base = 0.25 // <25%
        } else if (formatoSize === 'A5') {
          base = 0.50 // 50%
        } else if (formatoSize === 'A4') {
          base = 1.00 // 100%
        } else {
          // Personalizado
          const area = customWidth * customHeight
          const areaA4 = 21 * 29.7
          const pct = area / areaA4
          if (pct < 0.25) base = 0.25
          else if (pct < 0.55) base = 0.50
          else base = 1.00
        }
      } else {
        // BN es más económico por tamaño
        if (formatoSize === 'carnet' || formatoSize === 'A6') base = 0.05
        else if (formatoSize === 'A5') base = 0.07
        else base = 0.10
      }
      
      // Papel recargos
      let extraPapel = 0
      if (tipoPapel === 'bond90') extraPapel = 0.02
      else if (tipoPapel === 'cartulina') extraPapel = 0.08
      else if (tipoPapel === 'foto') extraPapel = 0.40
      
      return base + extraPapel
    }
    
    // B. Si es Documento (PDF/Word)
    if (tipoArchivo === 'documento') {
      let costoTotalHojas = 0
      
      // Calcular por cada página a imprimir
      const colorVal = coberturaColor === 'bajo' ? 0.25 : (coberturaColor === 'medio' ? 0.50 : 1.00)
      const bnVal = 0.05
      
      if (colorMode === 'bn') {
        costoTotalHojas = paginasCalculadas * bnVal
      } else if (modoMixtoDoc) {
        // Modo mixto: contar cuántas páginas a color manual
        let pagsColor = 0
        try {
          const arr = paginasColorManual.split(',').map(x => parseInt(x)).filter(x => !isNaN(x))
          pagsColor = Array.from(new Set(arr)).length // Unicos
        } catch {}
        
        pagsColor = Math.min(pagsColor, paginasCalculadas)
        const pagsBN = Math.max(0, paginasCalculadas - pagsColor)
        
        costoTotalHojas = (pagsColor * colorVal) + (pagsBN * bnVal)
      } else {
        // Todo color
        costoTotalHojas = paginasCalculadas * colorVal
      }
      
      // Recargos de papel por cada hoja física requerida
      let extraPapel = 0
      if (tipoPapel === 'bond90') extraPapel = 0.02
      else if (tipoPapel === 'cartulina') extraPapel = 0.08
      else if (tipoPapel === 'foto') extraPapel = 0.40
      
      const totalHojasFisicas = dobleFaz ? Math.ceil(paginasCalculadas / 2) : paginasCalculadas
      
      // Costo final unitario (por juego de copia del documento completo)
      let costoJuego = costoTotalHojas + (totalHojasFisicas * extraPapel)
      return costoJuego
    }
    
    return 0
  }

  const precioUnitario = calcularPrecioUnitario()
  const subtotalSinDescuento = precioUnitario * numeroCopias
  
  // Descuentos de volumen
  let porcentajeDescuento = 0
  if (numeroCopias > 50) porcentajeDescuento = 0.20
  else if (numeroCopias > 10) porcentajeDescuento = 0.10
  
  const descuento = subtotalSinDescuento * porcentajeDescuento
  const totalCotizado = subtotalSinDescuento - descuento

  // 4. Lógica de Drag & Resize Táctil para el Screenshot Cropper
  const handleMouseDown = (e: React.MouseEvent | React.TouchEvent, handler: string) => {
    e.stopPropagation()
    isDragging.current = handler
    const clientX = 'touches' in e ? e.touches[0].clientX : e.clientX
    const clientY = 'touches' in e ? e.touches[0].clientY : e.clientY
    
    startDragOffset.current = { x: clientX, y: clientY }
  }

  const handleMouseMove = (e: MouseEvent | TouchEvent) => {
    if (!isDragging.current || !cropperContainerRef.current) return
    e.preventDefault()
    
    const clientX = 'touches' in e ? e.touches[0].clientX : e.clientX
    const clientY = 'touches' in e ? e.touches[0].clientY : e.clientY
    
    const rect = cropperContainerRef.current.getBoundingClientRect()
    const dx = ((clientX - startDragOffset.current.x) / rect.width) * 100
    const dy = ((clientY - startDragOffset.current.y) / rect.height) * 100
    
    startDragOffset.current = { x: clientX, y: clientY }
    
    setCropBox(prev => {
      let { x, y, w, h } = prev
      const handler = isDragging.current
      
      if (handler === 'move') {
        x = Math.max(0, Math.min(100 - w, x + dx))
        y = Math.max(0, Math.min(100 - h, y + dy))
      } else if (handler === 'top-left') {
        const nx = Math.max(0, Math.min(x + w - 10, x + dx))
        const ny = Math.max(0, Math.min(y + h - 10, y + dy))
        w = w - (nx - x)
        h = h - (ny - y)
        x = nx
        y = ny
      } else if (handler === 'top-right') {
        const ny = Math.max(0, Math.min(y + h - 10, y + dy))
        w = Math.max(10, Math.min(100 - x, w + dx))
        h = h - (ny - y)
        y = ny
      } else if (handler === 'bottom-left') {
        const nx = Math.max(0, Math.min(x + w - 10, x + dx))
        w = w - (nx - x)
        h = Math.max(10, Math.min(100 - y, h + dy))
        x = nx
      } else if (handler === 'bottom-right') {
        w = Math.max(10, Math.min(100 - x, w + dx))
        h = Math.max(10, Math.min(100 - y, h + dy))
      }
      
      return { x, y, w, h }
    })
  }

  const handleMouseUp = () => {
    isDragging.current = null
  }

  useEffect(() => {
    if (cropActive) {
      window.addEventListener('mousemove', handleMouseMove, { passive: false })
      window.addEventListener('mouseup', handleMouseUp)
      window.addEventListener('touchmove', handleMouseMove, { passive: false })
      window.addEventListener('touchend', handleMouseUp)
    }
    return () => {
      window.removeEventListener('mousemove', handleMouseMove)
      window.removeEventListener('mouseup', handleMouseUp)
      window.removeEventListener('touchmove', handleMouseMove)
      window.removeEventListener('touchend', handleMouseUp)
    }
  // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [cropActive])

  // 5. Aplicar Recorte en Canvas
  const aplicarRecorte = () => {
    if (!imgRef.current) return
    const canvas = document.createElement('canvas')
    const img = imgRef.current
    
    // Tamaño real de la imagen
    const naturalW = img.naturalWidth
    const naturalH = img.naturalHeight
    
    const rx = (cropBox.x / 100) * naturalW
    const ry = (cropBox.y / 100) * naturalH
    const rw = (cropBox.w / 100) * naturalW
    const rh = (cropBox.h / 100) * naturalH
    
    canvas.width = rw
    canvas.height = rh
    const ctx = canvas.getContext('2d')
    if (ctx) {
      ctx.drawImage(img, rx, ry, rw, rh, 0, 0, rw, rh)
      const dataUrl = canvas.toDataURL('image/jpeg', 0.9)
      setCroppedImage(dataUrl)
      setCropActive(false)
    }
  }

  // 6. Añadir al Carrito con fallbacks
  const añadirAlCarrito = async () => {
    if (!archivo) { setErrorMsg('Carga un archivo o imagen primero.'); return }
    setErrorMsg('')
    setLoading(true)
    setMsgCarga('Subiendo archivo de impresión...')
    
    let urlDescarga: string | null = null
    
    try {
      // Intentar subir al Storage de Supabase en bucket 'ol_impresiones'
      const extension = archivo.name.split('.').pop()
      const fileName = `imp-${Date.now()}.${extension}`
      
      let fileToUpload: Blob = archivo
      if (tipoArchivo === 'imagen' && croppedImage) {
        // Convertir base64 a blob
        const res = await fetch(croppedImage)
        fileToUpload = await res.blob()
      }
      
      const { data, error } = await supabase.storage
        .from('ol_impresiones')
        .upload(fileName, fileToUpload, { cacheControl: '3600', upsert: true })
        
      if (!error && data) {
        const { data: publicData } = supabase.storage
          .from('ol_impresiones')
          .getPublicUrl(fileName)
        urlDescarga = publicData?.publicUrl || null
      }
    } catch (err) {
      console.warn('Fallo Supabase Storage upload, se utilizará fallback de WhatsApp:', err)
    }
    
    setMsgCarga('Preparando el carrito...')
    
    // Configurar descripción del item
    let configStr = ''
    if (tipoArchivo === 'imagen') {
      const sizeStr = formatoSize === 'personalizado' ? `${customWidth}x${customHeight}cm` : formatoSize.toUpperCase()
      const colorStr = colorMode === 'bn' ? 'B/N' : 'Color'
      configStr = `Foto (${sizeStr}, ${colorStr}, ${tipoPapel.toUpperCase()})`
    } else {
      const colorStr = colorMode === 'bn' ? 'B/N' : (modoMixtoDoc ? `Mixto (Color: ${paginasColorManual})` : 'Color')
      const duplexStr = dobleFaz ? 'Doble Faz' : 'Simple Faz'
      configStr = `Doc (${paginasCalculadas} pág, ${colorStr}, ${tipoPapel.toUpperCase()}, ${duplexStr})`
    }
    
    const labelOrigen = urlDescarga 
      ? `[Descarga: ${urlDescarga}]` 
      : `[Enviar por WhatsApp: ${archivo.name}]`

    const uniqueId = `IMP-${Date.now()}`
    const itemCarrito = {
      codigo: uniqueId,
      descripcion: `🖨️ ${configStr} - ${archivo.name} ${labelOrigen}`,
      categoria: 'Impresión',
      precio_unitario: precioUnitario,
      cantidad: numeroCopias,
      tienda_id: null,
      tienda_nombre: 'Servicio de Impresión'
    }

    const prevCarrito = getCarrito()
    prevCarrito.push(itemCarrito)
    setCarrito(prevCarrito)
    
    setLoading(false)
    setAgregadoExito(true)
    setMsgCarga('')
    
    setTimeout(() => {
      router.push('/carrito')
    }, 1200)
  }

  return (
    <div className="max-w-lg mx-auto px-4 py-4 space-y-4">
      {/* Header de retorno */}
      <div className="flex items-center gap-3">
        <Link href="/" className="p-2 bg-gray-100 hover:bg-gray-250 rounded-xl transition cursor-pointer">
          <ArrowLeft size={16} className="text-gray-650" />
        </Link>
        <h1 className="text-base font-extrabold text-gray-800">Servicio de Impresión</h1>
      </div>

      {agregadoExito ? (
        <div className="bg-white border border-gray-100 rounded-2xl p-8 shadow-sm flex flex-col items-center gap-3 text-center">
          <CheckCircle size={48} className="text-green-500 animate-bounce" />
          <h3 className="font-bold text-gray-800 text-sm">¡Impresión añadida al carrito!</h3>
          <p className="text-xs text-gray-500">Redirigiendo a tu carrito de compras...</p>
        </div>
      ) : (
        <div className="space-y-4 text-left">
          
          {/* 1. Subida del Archivo */}
          <div className="bg-white border border-gray-100 rounded-2xl p-4 shadow-sm space-y-3">
            <h3 className="text-xs font-bold text-gray-400 uppercase tracking-wider">1. Sube tu archivo</h3>
            
            {!archivo ? (
              <label className="flex flex-col items-center justify-center border-2 border-dashed border-gray-200 hover:border-green-400 rounded-2xl py-8 px-4 cursor-pointer transition bg-gray-50/50">
                <Upload size={32} className="text-gray-400 mb-2" />
                <span className="text-xs font-bold text-gray-700">Seleccionar documento o imagen</span>
                <span className="text-[10px] text-gray-400 text-center mt-1">PDF, Word, Excel, JPG, PNG, WEBP.</span>
                <input 
                  type="file" 
                  accept="image/*,application/pdf,.docx,.xlsx,.doc,.xls" 
                  className="hidden" 
                  onChange={e => {
                    if (e.target.files?.[0]) setArchivo(e.target.files[0])
                  }}
                />
              </label>
            ) : (
              <div className="border border-gray-100 rounded-xl p-3 flex items-center justify-between gap-3 bg-gray-50/30">
                <div className="flex items-center gap-2.5 min-w-0">
                  <FileText size={18} className="text-green-600 shrink-0" />
                  <div className="min-w-0">
                    <p className="text-xs font-semibold text-gray-800 truncate leading-snug">{archivo.name}</p>
                    <p className="text-[10px] text-gray-400">
                      {(archivo.size / 1024 / 1024).toFixed(2)} MB · {tipoArchivo === 'imagen' ? 'Imagen' : 'Documento'}
                    </p>
                  </div>
                </div>
                <button 
                  onClick={() => {
                    setArchivo(null)
                    setTipoArchivo(null)
                    setPreviewUrl('')
                    setCroppedImage(null)
                  }}
                  className="p-1.5 hover:bg-red-50 text-gray-400 hover:text-red-500 rounded-lg transition cursor-pointer"
                >
                  <Trash2 size={14} />
                </button>
              </div>
            )}
            {msgCarga && <p className="text-[11px] font-semibold text-green-600 animate-pulse">{msgCarga}</p>}
          </div>

          {/* 2. Recorte Inteligente (Solo si es captura de pantalla / imagen) */}
          {archivo && tipoArchivo === 'imagen' && (
            <div className="bg-white border border-gray-100 rounded-2xl p-4 shadow-sm space-y-3">
              <div className="flex items-center justify-between">
                <h3 className="text-xs font-bold text-gray-400 uppercase tracking-wider">2. Recortar captura / Bordes</h3>
                {esScreenshotDetectado && !croppedImage && (
                  <span className="text-[9px] bg-green-50 text-green-700 border border-green-200 px-2 py-0.5 rounded-full font-bold uppercase tracking-wider flex items-center gap-1">
                    ✨ Captura detectada
                  </span>
                )}
              </div>

              {esScreenshotDetectado && !croppedImage && !cropActive && (
                <div className="bg-green-50 border border-green-200 rounded-xl p-3 text-[11px] text-green-800 leading-relaxed">
                  💡 <strong>Auto-recorte:</strong> Detectamos que subiste una captura de pantalla. Hemos pre-seleccionado un recorte automático para quitar la hora y los botones del teléfono. Puedes dar clic en el botón de abajo para aplicarlo o editarlo.
                </div>
              )}

              {!cropActive && !croppedImage && previewUrl && (
                <div className="relative rounded-xl overflow-hidden border border-gray-100 bg-gray-50 flex items-center justify-center py-2.5">
                  <img src={previewUrl} alt="Vista previa" className="max-h-[220px] object-contain rounded" />
                  <button 
                    onClick={() => setCropActive(true)}
                    className="absolute bottom-4 bg-green-600 hover:bg-green-700 text-white font-bold px-3 py-1.5 rounded-lg text-[10px] shadow-md transition flex items-center gap-1 cursor-pointer"
                  >
                    <Scissors size={11} /> Recortar imagen / Quitar bordes
                  </button>
                </div>
              )}

              {cropActive && previewUrl && (
                <div className="space-y-3">
                  <p className="text-[10px] text-gray-400">Arrastra los bordes de la caja para recortar partes no deseadas:</p>
                  <div 
                    ref={cropperContainerRef}
                    className="relative max-w-full overflow-hidden bg-gray-900 rounded-xl flex items-center justify-center select-none"
                    style={{ height: '240px' }}
                  >
                    <img 
                      ref={imgRef}
                      src={previewUrl} 
                      alt="Para recortar" 
                      className="max-h-full max-w-full object-contain pointer-events-none"
                    />
                    
                    {/* Bounding box de recorte */}
                    <div 
                      className="absolute border border-green-400 bg-green-400/25 cursor-move"
                      style={{
                        left: `${cropBox.x}%`,
                        top: `${cropBox.y}%`,
                        width: `${cropBox.w}%`,
                        height: `${cropBox.h}%`
                      }}
                      onTouchStart={e => handleMouseDown(e, 'move')}
                      onMouseDown={e => handleMouseDown(e, 'move')}
                    >
                      {/* Control handles esquinas */}
                      {['top-left', 'top-right', 'bottom-left', 'bottom-right'].map(pos => (
                        <div 
                          key={pos}
                          className={`absolute w-7 h-7 flex items-center justify-center z-25 cursor-pointer`}
                          style={{
                            top: pos.startsWith('top') ? '-10px' : 'auto',
                            bottom: pos.startsWith('bottom') ? '-10px' : 'auto',
                            left: pos.endsWith('left') ? '-10px' : 'auto',
                            right: pos.endsWith('right') ? '-10px' : 'auto',
                          }}
                          onTouchStart={e => handleMouseDown(e, pos)}
                          onMouseDown={e => handleMouseDown(e, pos)}
                        >
                          <span className="w-2.5 h-2.5 bg-green-500 border border-white rounded-full shadow" />
                        </div>
                      ))}
                    </div>
                  </div>
                  <div className="flex gap-2">
                    <button 
                      onClick={aplicarRecorte}
                      className="flex-1 bg-green-600 hover:bg-green-700 text-white font-bold py-2 rounded-xl text-xs transition cursor-pointer"
                    >
                      Aplicar recorte
                    </button>
                    <button 
                      onClick={() => setCropActive(false)}
                      className="flex-1 bg-gray-100 hover:bg-gray-250 text-gray-700 font-semibold py-2 rounded-xl text-xs transition cursor-pointer"
                    >
                      Cancelar
                    </button>
                  </div>
                </div>
              )}

              {croppedImage && (
                <div className="space-y-3">
                  <div className="relative rounded-xl overflow-hidden border border-gray-150 bg-gray-50 flex items-center justify-center py-2.5">
                    <img src={croppedImage} alt="Recorte aplicado" className="max-h-[200px] object-contain rounded" />
                    <span className="absolute top-2 right-2 bg-green-600 text-white text-[9px] font-bold px-1.5 py-0.5 rounded shadow">
                      ✓ Recortado
                    </span>
                  </div>
                  <button 
                    onClick={() => {
                      setCroppedImage(null)
                      setCropActive(true)
                    }}
                    className="w-full border border-gray-200 hover:bg-gray-50 text-gray-600 font-bold py-2 rounded-xl text-[10px] transition cursor-pointer"
                  >
                    🔄 Ajustar / Recortar de nuevo
                  </button>
                </div>
              )}
            </div>
          )}

          {/* 3. Selector Gráfico dentro de Hoja A4 */}
          {archivo && (
            <div className="bg-white border border-gray-100 rounded-2xl p-4 shadow-sm space-y-4">
              <h3 className="text-xs font-bold text-gray-400 uppercase tracking-wider">
                {tipoArchivo === 'imagen' ? '3. Tamaño de Impresión' : '2. Páginas y Tamaño'}
              </h3>

              {tipoArchivo === 'documento' && (
                <div className="space-y-3 border-b border-gray-100 pb-3">
                  {/* Selector de Rango */}
                  <div className="grid grid-cols-2 gap-2">
                    <button
                      onClick={() => setRangoModo('todo')}
                      className={`py-2 rounded-xl text-xs font-bold border transition ${
                        rangoModo === 'todo'
                          ? 'bg-green-600 text-white border-transparent'
                          : 'bg-gray-50 text-gray-500 border-gray-200 hover:bg-gray-100'
                      }`}
                    >
                      Imprimir todo ({paginasDocumento} pág)
                    </button>
                    <button
                      onClick={() => setRangoModo('rango')}
                      className={`py-2 rounded-xl text-xs font-bold border transition ${
                        rangoModo === 'rango'
                          ? 'bg-green-600 text-white border-transparent'
                          : 'bg-gray-50 text-gray-500 border-gray-200 hover:bg-gray-100'
                      }`}
                    >
                      Rango de páginas
                    </button>
                  </div>

                  {rangoModo === 'rango' && (
                    <div className="space-y-1 bg-gray-50 border border-gray-200 rounded-xl p-3">
                      <label className="text-[10px] font-bold text-gray-500 block">Indica el rango de páginas a imprimir:</label>
                      <input 
                        type="text"
                        value={rangoTexto}
                        onChange={e => setRangoTexto(e.target.value)}
                        placeholder="Ej: 1-5, 8 (Páginas totales a imprimir: 6)"
                        className="w-full bg-white border border-gray-250 rounded-lg px-2.5 py-1.5 text-xs text-gray-800 focus:outline-none focus:border-green-500"
                      />
                      <p className="text-[9px] text-gray-400">Total calculado: {paginasCalculadas} página(s)</p>
                    </div>
                  )}
                  {archivo.name.endsWith('.docx') || archivo.name.endsWith('.xlsx') ? (
                    <div className="bg-yellow-50 border border-yellow-200 rounded-xl p-3 text-[10px] text-yellow-800 leading-normal space-y-1.5">
                      <p>⚠️ <strong>Nota sobre Word/Excel:</strong> No es posible auto-detectar las páginas de forma exacta en el navegador. Por favor, estima el número de páginas:</p>
                      <div className="flex items-center gap-2">
                        <span className="text-[10px] font-semibold">Páginas:</span>
                        <input 
                          type="number" 
                          min={1} 
                          value={paginasDocumento} 
                          onChange={e => setPaginasDocumento(Math.max(1, parseInt(e.target.value) || 1))}
                          className="w-16 bg-white border border-gray-250 rounded-lg px-2 py-1 text-xs font-bold text-gray-800"
                        />
                      </div>
                    </div>
                  ) : null}
                </div>
              )}

              {/* Selector de Tamaño / Visual A4 */}
              <div className="flex gap-4 items-start flex-col sm:flex-row">
                
                {/* Menú de Opciones de Tamaño */}
                {tipoArchivo === 'imagen' && (
                  <div className="flex-1 space-y-2.5 w-full">
                    <label className="text-[11px] font-bold text-gray-500 block">Formato / Tamaño:</label>
                    <div className="flex flex-col gap-1.5">
                      {[
                        { size: 'A4', label: 'Página completa (A4)', desc: '21 x 29.7 cm · 100% de la hoja' },
                        { size: 'A5', label: 'Media página (A5)', desc: '14.8 x 21 cm · 50% de la hoja' },
                        { size: 'A6', label: 'Un cuarto (A6)', desc: '10.5 x 14.8 cm · 25% de la hoja' },
                        { size: 'carnet', label: 'Foto carnet', desc: '4 x 5 cm · Recuadro pequeño' },
                        { size: 'personalizado', label: 'Tamaño personalizado', desc: 'Ajuste libre en centímetros' },
                      ].map(item => (
                        <button
                          key={item.size}
                          onClick={() => setFormatoSize(item.size as any)}
                          className={`w-full text-left p-2.5 rounded-xl border transition flex flex-col ${
                            formatoSize === item.size
                              ? 'bg-green-50 border-green-500'
                              : 'bg-white border-gray-150 hover:bg-gray-50'
                          }`}
                        >
                          <span className="text-xs font-bold text-gray-700">{item.label}</span>
                          <span className="text-[9px] text-gray-400 mt-0.5">{item.desc}</span>
                        </button>
                      ))}
                    </div>

                    {formatoSize === 'personalizado' && (
                      <div className="grid grid-cols-2 gap-2 bg-gray-50 border border-gray-150 rounded-xl p-3">
                        <div>
                          <label className="text-[9px] font-bold text-gray-400 block mb-0.5">Ancho (cm):</label>
                          <input 
                            type="number"
                            min={1} max={21}
                            value={customWidth}
                            onChange={e => setCustomWidth(Math.min(21, Math.max(1, parseFloat(e.target.value) || 1)))}
                            className="w-full bg-white border border-gray-250 rounded-lg px-2 py-1 text-xs text-gray-800"
                          />
                        </div>
                        <div>
                          <label className="text-[9px] font-bold text-gray-400 block mb-0.5">Alto (cm):</label>
                          <input 
                            type="number"
                            min={1} max={29.7}
                            value={customHeight}
                            onChange={e => setCustomHeight(Math.min(29.7, Math.max(1, parseFloat(e.target.value) || 1)))}
                            className="w-full bg-white border border-gray-250 rounded-lg px-2 py-1 text-xs text-gray-800"
                          />
                        </div>
                      </div>
                    )}
                  </div>
                )}

                {/* Hoja A4 Visual - Sombreado de área ocupada */}
                <div className="flex flex-col items-center justify-center shrink-0 w-full sm:w-[200px] border-t sm:border-t-0 sm:border-l border-gray-100 pt-3 sm:pt-0 sm:pl-4">
                  <span className="text-[9px] font-bold text-gray-450 uppercase mb-2">Vista previa de hoja A4</span>
                  
                  {/* Hoja A4 (Lienzo proporcional) */}
                  <div className="w-[126px] h-[178px] bg-white border border-gray-300 rounded shadow-md relative overflow-hidden bg-[radial-gradient(#e5e7eb_1px,transparent_1px)] [background-size:6px_6px]">
                    
                    {/* Caja de selección / Sombreado dinámico */}
                    {formatoSize === 'A4' && (
                      <div className="absolute inset-0 bg-green-500/25 border-2 border-green-500 flex items-center justify-center animate-pulse">
                        <span className="text-[10px] font-black text-green-700 bg-white/80 px-1.5 py-0.5 rounded border border-green-300">A4 (100%)</span>
                      </div>
                    )}

                    {formatoSize === 'A5' && (
                      <div className="absolute left-0 top-0 w-full h-1/2 bg-green-500/25 border-b-2 border-green-500 flex items-center justify-center">
                        <span className="text-[10px] font-black text-green-700 bg-white/80 px-1.5 py-0.5 rounded border border-green-300">A5 (50%)</span>
                      </div>
                    )}

                    {formatoSize === 'A6' && (
                      <div className="absolute left-0 top-0 w-1/2 h-1/2 bg-green-500/25 border-r-2 border-b-2 border-green-500 flex items-center justify-center">
                        <span className="text-[10px] font-black text-green-700 bg-white/80 px-1.5 py-0.5 rounded border border-green-300">A6 (25%)</span>
                      </div>
                    )}

                    {formatoSize === 'carnet' && (
                      <div className="absolute left-1 top-1 w-6 h-8 bg-green-500/25 border-2 border-green-500 flex items-center justify-center">
                        <span className="text-[8px] font-bold text-green-700 bg-white/80 px-0.5 rounded">Carnet</span>
                      </div>
                    )}

                    {formatoSize === 'personalizado' && (
                      <div 
                        className="absolute left-0 top-0 bg-green-500/25 border-r-2 border-b-2 border-green-500 flex items-center justify-center"
                        style={{
                          width: `${(customWidth / 21) * 100}%`,
                          height: `${(customHeight / 29.7) * 100}%`,
                        }}
                      >
                        <span className="text-[8px] font-bold text-green-700 bg-white/85 px-1 py-0.5 rounded leading-none">
                          {customWidth}x{customHeight}cm
                        </span>
                      </div>
                    )}
                  </div>
                  <span className="text-[8px] text-gray-400 mt-1.5 leading-none">Representación no apta para márgenes</span>
                </div>
              </div>
            </div>
          )}

          {/* 4. Opciones Avanzadas */}
          {archivo && (
            <div className="bg-white border border-gray-100 rounded-2xl p-4 shadow-sm space-y-3.5">
              <h3 className="text-xs font-bold text-gray-400 uppercase tracking-wider">3. Opciones de Impresión</h3>

              {/* A. Blanco y negro vs Color */}
              <div className="space-y-1.5">
                <label className="text-[10px] font-bold text-gray-500 block">Tinta / Color:</label>
                <div className="grid grid-cols-2 gap-2">
                  <button
                    onClick={() => {
                      setColorMode('bn')
                      setModoMixtoDoc(false)
                    }}
                    className={`py-2 rounded-xl text-xs font-bold border transition ${
                      colorMode === 'bn'
                        ? 'bg-green-600 text-white border-transparent'
                        : 'bg-white border-gray-200 text-gray-500 hover:bg-gray-50'
                    }`}
                  >
                    ⚫ Blanco y Negro ($0.05 / pág)
                  </button>
                  <button
                    onClick={() => setColorMode('color')}
                    className={`py-2 rounded-xl text-xs font-bold border transition ${
                      colorMode === 'color'
                        ? 'bg-green-600 text-white border-transparent'
                        : 'bg-white border-gray-200 text-gray-500 hover:bg-gray-50'
                    }`}
                  >
                    🌈 Color
                  </button>
                </div>
              </div>

              {/* B. Cobertura de tinta color (si seleccionan color) */}
              {colorMode === 'color' && (
                <div className="space-y-2.5 bg-gray-50 border border-gray-200 rounded-xl p-3 transition-all">
                  
                  {/* Si es documento, dar opción de modo mixto */}
                  {tipoArchivo === 'documento' && (
                    <div className="flex items-center justify-between border-b border-gray-200/60 pb-2">
                      <label className="flex items-center gap-2 cursor-pointer select-none text-xs text-gray-700 font-semibold">
                        <input 
                          type="checkbox"
                          checked={modoMixtoDoc}
                          onChange={e => setModoMixtoDoc(e.target.checked)}
                          className="w-3.5 h-3.5 rounded border-gray-300 text-green-600 focus:ring-green-500"
                        />
                        Impresión mixta (Color y B/N mezclados)
                      </label>
                    </div>
                  )}

                  {modoMixtoDoc ? (
                    <div className="space-y-1.5 text-xs">
                      <label className="text-[10px] font-bold text-gray-400 block">Indica cuáles páginas específicas van a color:</label>
                      <input 
                        type="text"
                        value={paginasColorManual}
                        onChange={e => setPaginasColorManual(e.target.value)}
                        placeholder="Ej: 1, 5, 8 (las demás saldrán en B/N)"
                        className="w-full bg-white border border-gray-250 rounded-lg px-2.5 py-1.5 text-xs text-gray-800 focus:outline-none focus:border-green-500"
                      />
                    </div>
                  ) : null}

                  {/* Cobertura de Color */}
                  <div className="space-y-1.5">
                    <div className="flex items-center gap-1">
                      <label className="text-[10px] font-bold text-gray-400 block">
                        {tipoArchivo === 'documento' ? 'Cobertura de color (páginas a color):' : 'Porcentaje de color de la foto:'}
                      </label>
                      <HelpCircle size={10} className="text-gray-400 cursor-help" onClick={() => alert('Bajo Color: Textos y logos pequeños ($0.25).\nMedio Color: Gráficos e imágenes a media página ($0.50).\nAlto Color: Fotos completas o portadas ($1.00).')} />
                    </div>
                    <div className="grid grid-cols-3 gap-1.5">
                      {[
                        { code: 'bajo', label: '🟢 Bajo (<25%)', price: 0.25 },
                        { code: 'medio', label: '🟡 Medio (~50%)', price: 0.50 },
                        { code: 'alto', label: '🔴 Alto (100%)', price: 1.00 },
                      ].map(cob => (
                        <button
                          key={cob.code}
                          onClick={() => setCoberturaColor(cob.code as any)}
                          className={`py-1.5 rounded-lg text-[10px] font-bold border transition ${
                            coberturaColor === cob.code
                              ? 'bg-green-100 border-green-500 text-green-700'
                              : 'bg-white border-gray-200 text-gray-500 hover:bg-gray-50'
                          }`}
                        >
                          <span className="block">{cob.label}</span>
                          <span className="block text-[8px] opacity-75">{fmt(cob.price)}</span>
                        </button>
                      ))}
                    </div>
                  </div>
                </div>
              )}

              {/* C. Tipo de Papel */}
              <div className="space-y-1.5">
                <label className="text-[10px] font-bold text-gray-500 block">Tipo de Papel:</label>
                <select
                  value={tipoPapel}
                  onChange={e => setTipoPapel(e.target.value as any)}
                  className="w-full bg-white border border-gray-200 rounded-xl px-3 py-2 text-xs text-gray-700 focus:outline-none focus:border-green-500"
                >
                  <option value="bond75">Papel Bond 75g (Estándar)</option>
                  <option value="bond90">Papel Bond 90g (Premium +$0.02)</option>
                  <option value="cartulina">Cartulina Escolar (+$0.08)</option>
                  <option value="foto">Papel Fotográfico Brillante (+$0.40)</option>
                </select>
              </div>

              {/* D. Doble faz (Dúplex) — Solo para documentos */}
              {tipoArchivo === 'documento' && (
                <div className="flex items-center justify-between border-t border-gray-100 pt-3">
                  <div>
                    <label className="text-xs font-semibold text-gray-700 block">Imprimir por ambos lados (Doble Faz)</label>
                    <span className="text-[10px] text-gray-400 block leading-tight">Reduce el uso de hojas físicas de papel</span>
                  </div>
                  <input
                    type="checkbox"
                    checked={dobleFaz}
                    onChange={e => setDobleFaz(e.target.checked)}
                    className="w-4 h-4 rounded border-gray-300 text-green-600 focus:ring-green-500"
                  />
                </div>
              )}
            </div>
          )}

          {/* 5. Cantidad de Copias y Cotización */}
          {archivo && (
            <div className="bg-gray-900 border border-gray-800 rounded-2xl p-4 text-white space-y-4">
              
              {/* Selector de copias */}
              <div className="flex items-center justify-between">
                <div>
                  <span className="text-xs font-bold text-gray-400 uppercase tracking-wider block">4. Número de copias</span>
                  <span className="text-[10px] text-gray-500">¿Cuántos juegos/copias idénticos deseas?</span>
                </div>
                <div className="flex items-center gap-3 bg-gray-850 rounded-xl px-3 py-1">
                  <button 
                    onClick={() => setNumeroCopias(Math.max(1, numeroCopias - 1))}
                    className="p-1 hover:text-green-400 transition cursor-pointer"
                  >
                    <Minus size={15} />
                  </button>
                  <span className="font-extrabold text-sm w-6 text-center">{numeroCopias}</span>
                  <button 
                    onClick={() => setNumeroCopias(numeroCopias + 1)}
                    className="p-1 hover:text-green-400 transition cursor-pointer"
                  >
                    <Plus size={15} />
                  </button>
                </div>
              </div>

              {/* Cotización final */}
              <div className="border-t border-gray-800 pt-3 space-y-2 text-xs">
                <div className="flex justify-between text-gray-400">
                  <span>Precio por copia / juego:</span>
                  <span>{fmt(precioUnitario)}</span>
                </div>
                {descuento > 0 && (
                  <div className="flex justify-between text-green-400 font-semibold">
                    <span>Descuento por volumen ({(porcentajeDescuento * 100)}%):</span>
                    <span>-{fmt(descuento)}</span>
                  </div>
                )}
                <div className="flex justify-between items-center text-sm font-extrabold border-t border-gray-800 pt-2.5">
                  <span className="text-white">Total a pagar:</span>
                  <span className="text-green-400 text-base">{fmt(totalCotizado)}</span>
                </div>
              </div>

              {errorMsg && <p className="text-red-400 text-xs text-center">{errorMsg}</p>}

              <button
                onClick={añadirAlCarrito}
                disabled={loading}
                className="w-full flex items-center justify-center gap-2 bg-green-600 hover:bg-green-500 disabled:opacity-50 text-white font-extrabold py-3.5 rounded-xl transition text-sm cursor-pointer"
              >
                {loading ? (
                  <>
                    <Loader2 size={16} className="animate-spin" />
                    Subiendo archivo...
                  </>
                ) : (
                  <>🛒 Añadir al carrito · {fmt(totalCotizado)}</>
                )}
              </button>
            </div>
          )}
        </div>
      )}
    </div>
  )
}

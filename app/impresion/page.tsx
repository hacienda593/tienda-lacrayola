'use client'
import { useState, useEffect, useRef, useMemo } from 'react'
import { useRouter } from 'next/navigation'
import { 
  Upload, Scissors, FileText, Check, RotateCw, Trash2, 
  Plus, Minus, Info, ArrowLeft, CheckCircle, HelpCircle, Loader2, Image as ImageIcon
} from 'lucide-react'
import Link from 'next/link'
import { getCarrito, setCarrito } from '@/lib/carrito'
import { supabase } from '@/lib/supabase'
import { useAuth } from '@/context/AuthContext'

function fmt(n: number) { return '$' + n.toFixed(2) }

interface ImagenImpresion {
  id: string
  file: File
  name: string
  size: number
  rawUrl: string
  croppedUrl: string | null
  formatoSize: 'A4' | 'A5' | 'A6' | 'carnet' | 'personalizado'
  customW: number
  customH: number
  colorMode: 'bn' | 'color'
  esScreenshot: boolean
  aspectRatio: number // width / height
  originalAspectRatio: number // always stores the original image aspect ratio
  requiereEdicionTienda: boolean // true if the customer requests the store to edit/crop for +$0.25
  copias: number // cantidad de copias de la imagen
}

interface PackedItem {
  id: string
  x: number // cm
  y: number // cm
  w: number // cm
  h: number // cm
  imgUrl: string
  colorMode: 'bn' | 'color'
  name: string
}

interface PhysicalPage {
  items: PackedItem[]
  hasColor: boolean
  colorArea: number // cm2
}

export default function ImpresionPage() {
  const router = useRouter()
  const { user, loading: authLoading, loginGoogle } = useAuth()
  
  // Archivo y modo principal
  const [tipoArchivo, setTipoArchivo] = useState<'imagen' | 'documento' | null>(null)
  
  // Lista de Imágenes para diagramación
  const [imagenes, setImagenes] = useState<ImagenImpresion[]>([])
  
  // Rango / Páginas para Documentos individuales (PDF/Word/Excel)
  const [docFile, setDocFile] = useState<File | null>(null)
  const [paginasDocumento, setPaginasDocumento] = useState(1)
  const [rangoModo, setRangoModo] = useState<'todo' | 'rango'>('todo')
  const [rangoTexto, setRangoTexto] = useState('')
  const [paginasCalculadasDoc, setPaginasCalculadasDoc] = useState(1)
  const [paginasColorManual, setPaginasColorManual] = useState('')
  const [modoMixtoDoc, setModoMixtoDoc] = useState(false)
  const [docColorMode, setDocColorMode] = useState<'bn' | 'color'>('bn')
  const [coberturaColorDoc, setCoberturaColorDoc] = useState<'bajo' | 'medio' | 'alto'>('bajo')
  
  // Recorte (Cropper modal)
  const [imagenACortarId, setImagenACortarId] = useState<string | null>(null)
  const [cropBox, setCropBox] = useState({ x: 10, y: 10, w: 80, h: 80 })
  const isDragging = useRef<string | null>(null)
  const startDragOffset = useRef({ x: 0, y: 0 })
  const imgRef = useRef<HTMLImageElement | null>(null)
  const cropperContainerRef = useRef<HTMLDivElement | null>(null)

  // Opciones globales de impresión
  const [tipoPapel, setTipoPapel] = useState<'bond75' | 'bond90' | 'cartulina' | 'foto'>('bond75')
  const [dobleFaz, setDobleFaz] = useState(false)
  const [numeroCopias, setNumeroCopias] = useState(1)
  const [paginaActivaIndex, setPaginaActivaIndex] = useState(0)
  const [orientacionHoja, setOrientacionHoja] = useState<'portrait' | 'landscape'>('portrait')
  const [autoAjustarModo, setAutoAjustarModo] = useState<'libre' | '1' | '2' | '3'>('libre')

  // Estados de UI
  const [loading, setLoading] = useState(false)
  const [agregadoExito, setAgregadoExito] = useState(false)
  const [errorMsg, setErrorMsg] = useState('')
  const [msgCarga, setMsgCarga] = useState('')

  // Bloqueo de Proporciones en personalizado
  const [bloquearProporcion, setBloquearProporcion] = useState(true)

  // 1. Manejador de Carga de Archivos con detección asíncrona de Aspect Ratio
  const handleUploadArchivos = (e: React.ChangeEvent<HTMLInputElement>) => {
    if (!e.target.files) return
    setErrorMsg('')
    const files = Array.from(e.target.files)
    
    // Verificar si es imagen o documento
    const file = files[0]
    if (!file) return

    const isImg = file.type.startsWith('image/')
    
    if (isImg) {
      if (tipoArchivo === 'documento') {
        setDocFile(null)
      }
      setTipoArchivo('imagen')
      setMsgCarga('Procesando imágenes...')
      
      const promesas = files.filter(f => f.type.startsWith('image/')).map(f => {
        return new Promise<ImagenImpresion>((resolve) => {
          const url = URL.createObjectURL(f)
          const tempImg = new Image()
          tempImg.onload = () => {
            const aspect = tempImg.width / tempImg.height
            const nameLower = f.name.toLowerCase()
            const esScreenshot = nameLower.includes('screenshot') || nameLower.includes('captura')
            
            // Si la imagen es horizontal, adaptamos su tamaño personalizado inicial
            let customW = 10
            let customH = 15
            if (aspect > 1) {
              customW = 15
              customH = parseFloat((15 / aspect).toFixed(1))
            } else {
              customH = 15
              customW = parseFloat((15 * aspect).toFixed(1))
            }

            resolve({
              id: `img-${Date.now()}-${Math.random().toString(36).substr(2, 9)}`,
              file: f,
              name: f.name,
              size: f.size,
              rawUrl: url,
              croppedUrl: null,
              formatoSize: 'A6', // default to A6 (1/4 page)
              customW,
              customH,
              colorMode: 'color',
              esScreenshot,
              aspectRatio: aspect,
              originalAspectRatio: aspect,
              requiereEdicionTienda: false,
              copias: 1
            })
          }
          tempImg.src = url
        })
      })

      Promise.all(promesas).then(nuevasImgs => {
        setImagenes(prev => [...prev, ...nuevasImgs])
        setMsgCarga('')
      })
    } else {
      // Documento (PDF/Word/Excel)
      setTipoArchivo('documento')
      setImagenes([])
      setDocFile(file)
      setPaginasDocumento(1)
      setPaginasCalculadasDoc(1)
      
      if (file.type === 'application/pdf') {
        setMsgCarga('Analizando páginas del PDF...')
        const reader = new FileReader()
        reader.onload = function(evt) {
          const contents = evt.target?.result as string
          const matches = contents.match(/\/Type\s*\/Page\b/g)
          const pages = matches ? matches.length : 1
          setPaginasDocumento(pages)
          setPaginasCalculadasDoc(pages)
          setMsgCarga('')
        }
        reader.readAsBinaryString(file)
      }
    }
    e.target.value = ''
  }

  // 2. Control del rango de páginas para documentos
  useEffect(() => {
    if (tipoArchivo !== 'documento' || !docFile) return
    
    if (rangoModo === 'todo') {
      setPaginasCalculadasDoc(paginasDocumento)
    } else {
      if (!rangoTexto.trim()) {
        setPaginasCalculadasDoc(paginasDocumento)
        return
      }
      try {
        let total = 0
        const partes = rangoTexto.split(',')
        partes.forEach(part => {
          if (part.includes('-')) {
            const range = part.split('-')
            const inicio = parseInt(range[0])
            const fin = parseInt(range[1])
            if (!isNaN(inicio) && !isNaN(fin) && fin >= inicio) {
              total += (fin - inicio + 1)
            }
          } else {
            const val = parseInt(part)
            if (!isNaN(val)) total += 1
          }
        })
        setPaginasCalculadasDoc(total > 0 ? Math.min(total, paginasDocumento) : paginasDocumento)
      } catch {
        setPaginasCalculadasDoc(paginasDocumento)
      }
    }
  }, [rangoModo, rangoTexto, paginasDocumento, docFile, tipoArchivo])

  // Función para obtener las dimensiones proporcionales exactas de una imagen según el formato seleccionado
  const getImgDimensions = (img: ImagenImpresion) => {
    const aspect = img.aspectRatio || 1.0
    
    if (img.formatoSize === 'A4') {
      const anchoMax = orientacionHoja === 'portrait' ? 21 : 29.7
      const altoMax = orientacionHoja === 'portrait' ? 29.7 : 21
      if (aspect >= 1) {
        return { w: anchoMax, h: parseFloat((anchoMax / aspect).toFixed(1)) }
      } else {
        return { w: parseFloat((altoMax * aspect).toFixed(1)), h: altoMax }
      }
    }
    
    if (img.formatoSize === 'A5') {
      // Caja contenedora de A5: 21 x 14.8 (Horizontal) o 14.8 x 21 (Vertical)
      if (aspect >= 1) {
        // Horizontal: cabe en 21 x 14.8
        const w = 21
        const h = w / aspect
        if (h > 14.8) {
          return { w: parseFloat((14.8 * aspect).toFixed(1)), h: 14.8 }
        }
        return { w, h: parseFloat(h.toFixed(1)) }
      } else {
        // Vertical: cabe en 14.8 x 21
        const h = 21
        const w = h * aspect
        if (w > 14.8) {
          return { w: 14.8, h: parseFloat((14.8 / aspect).toFixed(1)) }
        }
        return { w: parseFloat(w.toFixed(1)), h }
      }
    }
    
    if (img.formatoSize === 'A6') {
      // Caja contenedora de A6: 14.8 x 10.5 (Horizontal) o 10.5 x 14.8 (Vertical)
      if (aspect >= 1) {
        const w = 14.8
        const h = w / aspect
        if (h > 10.5) {
          return { w: parseFloat((10.5 * aspect).toFixed(1)), h: 10.5 }
        }
        return { w, h: parseFloat(h.toFixed(1)) }
      } else {
        const h = 14.8
        const w = h * aspect
        if (w > 10.5) {
          return { w: 10.5, h: parseFloat((10.5 / aspect).toFixed(1)) }
        }
        return { w: parseFloat(w.toFixed(1)), h }
      }
    }
    
    if (img.formatoSize === 'carnet') {
      // Bounding box de Carnet: 4 x 5 (Vertical) o 5 x 4 (Horizontal)
      if (aspect >= 1) {
        return { w: 5, h: parseFloat((5 / aspect).toFixed(1)) }
      } else {
        return { w: parseFloat((5 * aspect).toFixed(1)), h: 5 }
      }
    }
    
    // Personalizado
    return { w: img.customW, h: img.customH }
  }

  // 3. Algoritmo 2D de Empaquetado (2D Shelf Packing) para Imágenes
  const paginasFisicasData = useMemo(() => {
    if (tipoArchivo !== 'imagen' || imagenes.length === 0) return { pages: [], scale: 1.0 }
    
    const pages: PhysicalPage[] = []
    
    const anchoHoja = orientacionHoja === 'portrait' ? 21 : 29.7
    const altoHoja = orientacionHoja === 'portrait' ? 29.7 : 21
    
    // Margen físico de impresión (0.6 cm en cada borde de la hoja A4)
    const margin = 0.6
    
    // Expandir imágenes según cantidad de copias
    const imagenesExpandidas: ImagenImpresion[] = []
    imagenes.forEach(img => {
      const c = img.copias || 1
      for (let i = 0; i < c; i++) {
        imagenesExpandidas.push(img)
      }
    })
    
    // Ordenar de mayor a menor altura para empaquetamiento óptimo
    const ordenadas = [...imagenesExpandidas].sort((a, b) => {
      const hA = getImgDimensions(a).h
      const hB = getImgDimensions(b).h
      return hB - hA
    })
    
    // Función auxiliar que realiza el empaquetado para una escala dada S (entre 0.05 y 1.0)
    const empaquetarConEscala = (S: number) => {
      const pagesList: PhysicalPage[] = []
      let currentPage: PhysicalPage = { items: [], hasColor: false, colorArea: 0 }
      
      let x = margin
      let y = margin
      let shelfHeight = 0
      
      ordenadas.forEach((img) => {
        let { w, h } = getImgDimensions(img)
        
        // Aplicar factor de escala S
        w = w * S
        h = h * S
        
        // Limitar al espacio imprimible disponible (restando márgenes)
        const maxW = anchoHoja - 2 * margin
        const maxH = altoHoja - 2 * margin
        
        if (w > maxW) {
          const aspect = w / h
          w = maxW
          h = maxW / aspect
        }
        if (h > maxH) {
          const aspect = w / h
          h = maxH
          w = maxH * aspect
        }
        
        // Probar si cabe en el estante actual
        if (x + w <= anchoHoja - margin && y + h <= altoHoja - margin) {
          currentPage.items.push({
            id: `${img.id}-copy-${Math.random().toString(36).substr(2, 9)}`,
            x,
            y,
            w,
            h,
            imgUrl: img.croppedUrl || img.rawUrl,
            colorMode: img.colorMode,
            name: img.name
          })
          x += w
          shelfHeight = Math.max(shelfHeight, h)
        } else {
          // Nueva fila/estante
          x = margin
          y += shelfHeight
          shelfHeight = h
          
          if (y + h <= altoHoja - margin) {
            currentPage.items.push({
              id: `${img.id}-copy-${Math.random().toString(36).substr(2, 9)}`,
              x,
              y,
              w,
              h,
              imgUrl: img.croppedUrl || img.rawUrl,
              colorMode: img.colorMode,
              name: img.name
            })
            x += w
          } else {
            // Nueva página A4
            pagesList.push(currentPage)
            currentPage = { items: [], hasColor: false, colorArea: 0 }
            x = margin
            y = margin
            shelfHeight = h
            
            currentPage.items.push({
              id: `${img.id}-copy-${Math.random().toString(36).substr(2, 9)}`,
              x,
              y,
              w,
              h,
              imgUrl: img.croppedUrl || img.rawUrl,
              colorMode: img.colorMode,
              name: img.name
            })
            x += w
          }
        }
      })
      
      if (currentPage.items.length > 0) {
        pagesList.push(currentPage)
      }
      
      // Analizar la cobertura de color por cada página física
      pagesList.forEach(p => {
        p.hasColor = p.items.some(it => it.colorMode === 'color')
        let area = 0
        p.items.forEach(it => {
          if (it.colorMode === 'color') {
            area += (it.w * it.h)
          }
        })
        p.colorArea = area
      })
      
      return pagesList
    }
    
    let finalPages: PhysicalPage[] = []
    let scaleUsed = 1.0
    
    if (autoAjustarModo === 'libre') {
      finalPages = empaquetarConEscala(1.0)
    } else {
      const targetPages = parseInt(autoAjustarModo)
      
      // Búsqueda binaria iterativa para encontrar la escala máxima S que quepa en targetPages
      let minS = 0.05
      let maxS = 1.0
      let bestS = 0.05
      let bestPages: PhysicalPage[] = []
      
      for (let step = 0; step < 15; step++) {
        const midS = (minS + maxS) / 2
        const pgs = empaquetarConEscala(midS)
        if (pgs.length <= targetPages) {
          bestS = midS
          bestPages = pgs
          minS = midS // Intentar una escala mayor
        } else {
          maxS = midS // Escala demasiado grande, reducir
        }
      }
      
      if (bestPages.length === 0) {
        bestPages = empaquetarConEscala(0.05)
        bestS = 0.05
      }
      
      finalPages = bestPages
      scaleUsed = bestS
    }
    
    return { pages: finalPages, scale: scaleUsed }
  }, [imagenes, tipoArchivo, orientacionHoja, autoAjustarModo])

  const paginasFisicas = paginasFisicasData.pages
  const escalaUtilizada = paginasFisicasData.scale

  // Ajustar página activa si se reduce el número de hojas
  useEffect(() => {
    if (paginaActivaIndex >= paginasFisicas.length && paginasFisicas.length > 0) {
      setPaginaActivaIndex(paginasFisicas.length - 1)
    }
  }, [paginasFisicas, paginaActivaIndex])

  // 4. Motor de Precios
  const calcularPrecioTotal = () => {
    let recargoPapelPorHoja = 0
    if (tipoPapel === 'bond90') recargoPapelPorHoja = 0.02
    else if (tipoPapel === 'cartulina') recargoPapelPorHoja = 0.08
    else if (tipoPapel === 'foto') recargoPapelPorHoja = 0.40
    
    // A. Imágenes (Pack Diagramado)
    if (tipoArchivo === 'imagen') {
      if (paginasFisicas.length === 0) return 0
      
      let costoHojas = 0
      paginasFisicas.forEach(p => {
        let costoBasePag = 0.05 // B/N por defecto
        
        if (p.hasColor) {
          const areaA4 = 21 * 29.7
          const pct = p.colorArea / areaA4
          if (pct <= 0.05) costoBasePag = 0.25
          else if (pct <= 0.20) costoBasePag = 0.50
          else if (pct <= 0.40) costoBasePag = 0.75
          else costoBasePag = 1.00
        }
        
        costoHojas += (costoBasePag + recargoPapelPorHoja)
      })
      
      let costoEdicion = 0
      imagenes.forEach(img => {
        if (img.requiereEdicionTienda && !img.croppedUrl) {
          costoEdicion += 0.25
        }
      })
      
      return costoHojas + costoEdicion
    }
    
    // B. Documento Individual (PDF/Word/Excel)
    if (tipoArchivo === 'documento' && docFile) {
      let costoHojasDoc = 0
      const colorVal = coberturaColorDoc === 'bajo' ? 0.25 : (coberturaColorDoc === 'medio' ? 0.50 : 1.00)
      const bnVal = 0.05
      
      if (docColorMode === 'bn') {
        costoHojasDoc = paginasCalculadasDoc * bnVal
      } else if (modoMixtoDoc) {
        let pagsColor = 0
        try {
          const arr = paginasColorManual.split(',').map(x => parseInt(x)).filter(x => !isNaN(x))
          pagsColor = Array.from(new Set(arr)).length
        } catch {}
        
        pagsColor = Math.min(pagsColor, paginasCalculadasDoc)
        const pagsBN = Math.max(0, paginasCalculadasDoc - pagsColor)
        costoHojasDoc = (pagsColor * colorVal) + (pagsBN * bnVal)
      } else {
        costoHojasDoc = paginasCalculadasDoc * colorVal
      }
      
      const totalHojasFisicas = dobleFaz ? Math.ceil(paginasCalculadasDoc / 2) : paginasCalculadasDoc
      return costoHojasDoc + (totalHojasFisicas * recargoPapelPorHoja)
    }
    
    return 0
  }

  const precioUnitario = calcularPrecioTotal()
  const subtotalSinDescuento = precioUnitario * numeroCopias
  
  let porcentajeDescuento = 0
  if (numeroCopias > 50) porcentajeDescuento = 0.20
  else if (numeroCopias > 10) porcentajeDescuento = 0.10
  
  const descuento = subtotalSinDescuento * porcentajeDescuento
  const totalCotizado = subtotalSinDescuento - descuento

  // 5. Configuración de Screenshot Cropper por Imagen
  const abrirRecortador = (img: ImagenImpresion) => {
    setImagenACortarId(img.id)
    if (img.esScreenshot) {
      setCropBox({ x: 0, y: 6, w: 100, h: 88 })
    } else {
      setCropBox({ x: 10, y: 10, w: 80, h: 80 })
    }
  }

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
    if (imagenACortarId) {
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
  }, [imagenACortarId])

  const aplicarRecorte = () => {
    if (!imgRef.current || !imagenACortarId) return
    const canvas = document.createElement('canvas')
    const img = imgRef.current
    const naturalW = img.naturalWidth
    const naturalH = img.naturalHeight
    
    // Como ahora el contenedor cropperContainerRef está ceñido estrictamente al tamaño de la imagen,
    // el cálculo de porcentajes mapea al 100% de forma proporcional sin distorsiones
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
      
      // Creamos una imagen temporal para obtener el nuevo aspecto ratio del recorte
      const tempImg = new Image()
      tempImg.onload = () => {
        const aspect = tempImg.width / tempImg.height
        
        setImagenes(prev => prev.map(imgItem => {
          if (imgItem.id === imagenACortarId) {
            // Actualizamos la URL recortada y el aspect ratio a partir del corte
            let customW = imgItem.customW
            let customH = imgItem.customH
            
            if (imgItem.formatoSize === 'personalizado') {
              if (bloquearProporcion) {
                customH = parseFloat((customW / aspect).toFixed(1))
              }
            }
            
            return { 
              ...imgItem, 
              croppedUrl: dataUrl,
              aspectRatio: aspect,
              customW,
              customH,
              requiereEdicionTienda: false
            }
          }
          return imgItem
        }))
        setImagenACortarId(null)
      }
      tempImg.src = dataUrl
    }
  }

  // Auto-detectar contornos del contenido real de la imagen usando canvas
  const autoDetectarContorno = () => {
    if (!imagenACortarId) return
    const imgItem = imagenes.find(i => i.id === imagenACortarId)
    if (!imgItem) return
    
    setMsgCarga('Analizando contornos...')
    const tempImg = new Image()
    tempImg.crossOrigin = 'anonymous'
    tempImg.onload = () => {
      const canvas = document.createElement('canvas')
      const ctx = canvas.getContext('2d')
      if (!ctx) {
        setMsgCarga('')
        return
      }
      
      const scale = Math.min(1, 300 / Math.max(tempImg.width, tempImg.height))
      const w = Math.round(tempImg.width * scale)
      const h = Math.round(tempImg.height * scale)
      canvas.width = w
      canvas.height = h
      
      ctx.drawImage(tempImg, 0, 0, w, h)
      const imgData = ctx.getImageData(0, 0, w, h)
      const data = imgData.data
      
      // Obtener el color de la esquina superior izquierda
      const bgR = data[0]
      const bgG = data[1]
      const bgB = data[2]
      const bgA = data[3]
      const isBgTransparent = bgA < 10
      const tolerance = 25
      
      const isBgColor = (r: number, g: number, b: number, a: number) => {
        if (isBgTransparent) return a < 15
        if (a < 15) return true
        return Math.abs(r - bgR) < tolerance &&
               Math.abs(g - bgG) < tolerance &&
               Math.abs(b - bgB) < tolerance
      }
      
      let minX = w
      let minY = h
      let maxX = 0
      let maxY = 0
      let contentFound = false
      
      for (let y = 0; y < h; y++) {
        for (let x = 0; x < w; x++) {
          const idx = (y * w + x) * 4
          const r = data[idx]
          const g = data[idx + 1]
          const b = data[idx + 2]
          const a = data[idx + 3]
          
          if (!isBgColor(r, g, b, a)) {
            contentFound = true
            if (x < minX) minX = x
            if (x > maxX) maxX = x
            if (y < minY) minY = y
            if (y > maxY) maxY = y
          }
        }
      }
      
      if (contentFound) {
        const paddingX = Math.round(w * 0.015)
        const paddingY = Math.round(h * 0.015)
        
        const cropX = Math.max(0, minX - paddingX)
        const cropY = Math.max(0, minY - paddingY)
        const cropW = Math.min(w - cropX, (maxX - minX) + paddingX * 2)
        const cropH = Math.min(h - cropY, (maxY - minY) + paddingY * 2)
        
        setCropBox({
          x: parseFloat(((cropX / w) * 100).toFixed(1)),
          y: parseFloat(((cropY / h) * 100).toFixed(1)),
          w: parseFloat(((cropW / w) * 100).toFixed(1)),
          h: parseFloat(((cropH / h) * 100).toFixed(1))
        })
      }
      setMsgCarga('')
    }
    tempImg.onerror = () => {
      setMsgCarga('')
    }
    tempImg.src = imgItem.rawUrl
  }

  // 6. Añadir al Carrito (Compilación a PDF o subida de documento a Supabase Storage)
  const añadirAlCarrito = async () => {
    if (tipoArchivo === 'imagen' && imagenes.length === 0) {
      setErrorMsg('Sube al menos una imagen.')
      return
    }
    if (tipoArchivo === 'documento' && !docFile) {
      setErrorMsg('Sube un archivo de documento.')
      return
    }
    
    setErrorMsg('')
    setLoading(true)
    setMsgCarga('Subiendo archivos al Storage...')
    
    const urlsDescarga: string[] = []
    const fallbacks: string[] = []
    
    try {
      if (tipoArchivo === 'imagen') {
        setMsgCarga('Preparando lienzo de impresión...')
        const { jsPDF } = await import('jspdf')
        
        const isPortrait = orientacionHoja === 'portrait'
        const orientationChar = isPortrait ? 'p' : 'l'
        const pdf = new jsPDF(orientationChar, 'mm', 'a4')
        
        const a4W_mm = isPortrait ? 210 : 297
        const a4H_mm = isPortrait ? 297 : 210
        
        // Canvas de alta resolución (300 DPI)
        const scaleDPI = 300 / 25.4 // pixels por mm
        const canvasW = Math.round(a4W_mm * scaleDPI)
        const canvasH = Math.round(a4H_mm * scaleDPI)
        
        const cargarImagenHTML = (src: string): Promise<HTMLImageElement> => {
          return new Promise((resolve, reject) => {
            const img = new Image()
            img.crossOrigin = 'anonymous'
            img.onload = () => resolve(img)
            img.onerror = (e) => reject(e)
            img.src = src
          })
        }
        
        for (let pageIdx = 0; pageIdx < paginasFisicas.length; pageIdx++) {
          setMsgCarga(`Generando hoja ${pageIdx + 1} de ${paginasFisicas.length}...`)
          const page = paginasFisicas[pageIdx]
          
          const canvas = document.createElement('canvas')
          canvas.width = canvasW
          canvas.height = canvasH
          const ctx = canvas.getContext('2d')
          if (!ctx) throw new Error('No se pudo obtener el contexto 2D del Canvas')
          
          ctx.fillStyle = '#ffffff'
          ctx.fillRect(0, 0, canvasW, canvasH)
          
          for (const item of page.items) {
            try {
              const htmlImg = await cargarImagenHTML(item.imgUrl)
              
              // item.x, item.y, item.w, item.h están en cm.
              // Convertir a mm (x10), luego a píxeles (* scaleDPI)
              const itemX_px = (item.x * 10) * scaleDPI
              const itemY_px = (item.y * 10) * scaleDPI
              const itemW_px = (item.w * 10) * scaleDPI
              const itemH_px = (item.h * 10) * scaleDPI
              
              ctx.save()
              if (item.colorMode === 'bn') {
                ctx.filter = 'grayscale(100%)'
              }
              ctx.drawImage(htmlImg, itemX_px, itemY_px, itemW_px, itemH_px)
              ctx.restore()
            } catch (err) {
              console.error(`Error dibujando imagen ${item.name}:`, err)
            }
          }
          
          const dataUrl = canvas.toDataURL('image/jpeg', 0.95)
          if (pageIdx > 0) {
            pdf.addPage('a4', orientationChar)
          }
          pdf.addImage(dataUrl, 'JPEG', 0, 0, a4W_mm, a4H_mm)
        }
        
        const pdfBlob = pdf.output('blob')
        setMsgCarga('Subiendo documento de impresión PDF...')
        const fileName = `imp-${Date.now()}.pdf`
        
        const { data, error } = await supabase.storage
          .from('ol_impresiones')
          .upload(fileName, pdfBlob, { 
            contentType: 'application/pdf',
            cacheControl: '3600', 
            upsert: true 
          })
          
        if (!error && data) {
          const { data: publicData } = supabase.storage
            .from('ol_impresiones')
            .getPublicUrl(fileName)
          if (publicData?.publicUrl) urlsDescarga.push(publicData.publicUrl)
        } else {
          if (error) throw error
          fallbacks.push('Documento_Compilado.pdf')
        }
      } else if (tipoArchivo === 'documento' && docFile) {
        const extension = docFile.name.split('.').pop()
        const fileName = `imp-${Date.now()}.${extension}`
        
        const { data, error } = await supabase.storage
          .from('ol_impresiones')
          .upload(fileName, docFile, { cacheControl: '3600', upsert: true })
          
        if (!error && data) {
          const { data: publicData } = supabase.storage
            .from('ol_impresiones')
            .getPublicUrl(fileName)
          if (publicData?.publicUrl) urlsDescarga.push(publicData.publicUrl)
        } else {
          fallbacks.push(docFile.name)
        }
      }
    } catch (err: any) {
      console.warn('Error en subida, se usará envío manual por WhatsApp:', err)
      setErrorMsg(`Error al subir archivos: ${err?.message || err}. Puedes intentar agregarlo de nuevo.`)
      setLoading(false)
      return
    }
    
    setMsgCarga('Agregando al carrito...')
    
    let configStr = ''
    let totalPagsFisicas = 0
    
    if (tipoArchivo === 'imagen') {
      totalPagsFisicas = paginasFisicas.length
      const necesitaEdicion = imagenes.some(img => img.requiereEdicionTienda && !img.croppedUrl)
      const edicionTag = necesitaEdicion ? ' +EdiciónTienda' : ''
      const orientacionTag = orientacionHoja === 'landscape' ? ' HORIZONTAL' : ''
      configStr = `Pack Fotos (${totalPagsFisicas} hojas, ${imagenes.length} arch, ${tipoPapel.toUpperCase()}${orientacionTag}${edicionTag})`
    } else {
      totalPagsFisicas = dobleFaz ? Math.ceil(paginasCalculadasDoc / 2) : paginasCalculadasDoc
      const colorStr = docColorMode === 'bn' ? 'B/N' : (modoMixtoDoc ? 'Mixto' : 'Color')
      configStr = `Doc (${paginasCalculadasDoc} pág, ${colorStr}, ${tipoPapel.toUpperCase()}, ${dobleFaz ? 'Doble Faz' : 'Simple Faz'})`
    }
    
    const labelDescargas = urlsDescarga.length > 0 
      ? `Descargas: ${urlsDescarga.join(', ')}` 
      : ''
    const labelFallbacks = fallbacks.length > 0 
      ? `[Adjuntar por WhatsApp: ${fallbacks.join(', ')}]` 
      : ''
      
    const uniqueId = `IMP-${Date.now()}`
    const itemCarrito = {
      codigo: uniqueId,
      descripcion: `🖨️ ${configStr} ${labelDescargas} ${labelFallbacks}`.trim(),
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

  // Dimensiones calculadas del cropper para centrar y ajustar al tamaño real de la imagen en pantalla
  const cropperDimensions = useMemo(() => {
    if (!imagenACortarId) return { w: 320, h: 240 }
    const img = imagenes.find(i => i.id === imagenACortarId)
    if (!img) return { w: 320, h: 240 }
    
    const aspect = img.originalAspectRatio || 1.0
    const maxW = 380 // ancho máximo modal
    const maxH = 260 // alto máximo modal
    
    let renderW = maxW
    let renderH = maxW / aspect
    
    if (renderH > maxH) {
      renderH = maxH
      renderW = maxH * aspect
    }
    
    return { w: Math.round(renderW), h: Math.round(renderH) }
  }, [imagenACortarId, imagenes])

  // Si está cargando auth
  if (authLoading) {
    return (
      <div className="max-w-lg mx-auto px-4 py-16 flex flex-col items-center justify-center gap-3">
        <Loader2 size={32} className="animate-spin text-green-650" />
        <p className="text-xs text-gray-555 font-medium animate-pulse">Validando acceso...</p>
      </div>
    )
  }

  // Bloqueo si no hay usuario registrado
  if (!user) {
    return (
      <div className="max-w-lg mx-auto px-4 py-4 space-y-4">
        <div className="flex items-center gap-3">
          <Link href="/" className="p-2 bg-gray-100 hover:bg-gray-200 rounded-xl transition cursor-pointer">
            <ArrowLeft size={16} className="text-gray-600" />
          </Link>
          <h1 className="text-base font-extrabold text-gray-800">Servicio de Impresión</h1>
        </div>

        <div className="bg-white border border-gray-150 rounded-2xl p-6 shadow-sm flex flex-col items-center text-center space-y-4">
          <div className="w-16 h-16 bg-green-50 rounded-full flex items-center justify-center text-3xl">
            🖨️
          </div>
          <div className="space-y-1">
            <h3 className="font-extrabold text-gray-850 text-base">Inicia sesión para imprimir</h3>
            <p className="text-xs text-gray-500 max-w-sm leading-relaxed">
              Por motivos de seguridad, confidencialidad y control de tus archivos, el servicio de copiado e impresión en línea está disponible únicamente para usuarios registrados.
            </p>
          </div>

          <div className="bg-amber-50 border border-amber-200 rounded-xl p-3 text-left w-full">
            <h4 className="text-xs font-bold text-amber-800 mb-1 flex items-center gap-1.5 font-sans">
              🛡️ Protección y Privacidad
            </h4>
            <p className="text-[10px] text-amber-700 leading-normal">
              Tus documentos se suben mediante conexiones seguras y se auto-eliminarán del sistema de manera automática a las 48 horas de haber sido procesados.
            </p>
          </div>

          <button 
            onClick={loginGoogle}
            className="w-full bg-green-600 hover:bg-green-500 text-white font-extrabold py-3.5 rounded-xl transition text-sm cursor-pointer shadow-md flex items-center justify-center gap-2"
          >
            <span>🔐 Continuar con Google</span>
          </button>
        </div>
      </div>
    )
  }

  return (
    <div className="max-w-lg mx-auto px-4 py-4 space-y-4">
      {/* Header de retorno */}
      <div className="flex items-center justify-between">
        <div className="flex items-center gap-3">
          <Link href="/" className="p-2 bg-gray-100 hover:bg-gray-200 rounded-xl transition cursor-pointer">
            <ArrowLeft size={16} className="text-gray-600" />
          </Link>
          <h1 className="text-base font-extrabold text-gray-800">Servicio de Impresión</h1>
        </div>
        
        {tipoArchivo && (
          <button 
            onClick={() => {
              setTipoArchivo(null)
              setImagenes([])
              setDocFile(null)
            }}
            className="text-[10px] text-red-500 font-bold hover:underline"
          >
            Limpiar todo
          </button>
        )}
      </div>

      {agregadoExito ? (
        <div className="bg-white border border-gray-100 rounded-2xl p-8 shadow-sm flex flex-col items-center gap-3 text-center">
          <CheckCircle size={48} className="text-green-500 animate-bounce" />
          <h3 className="font-bold text-gray-800 text-sm">¡Añadido al carrito!</h3>
          <p className="text-xs text-gray-500">Redirigiendo a tu carrito de compras...</p>
        </div>
      ) : (
        <div className="space-y-4 text-left">
          
          {/* 1. Subida del Archivo */}
          <div className="bg-white border border-gray-100 rounded-2xl p-4 shadow-sm space-y-3">
            <h3 className="text-xs font-bold text-gray-400 uppercase tracking-wider">1. Sube tus archivos</h3>
            
            <div className="grid grid-cols-3 gap-2">
              {/* Opción Fotos */}
              <label className="flex flex-col items-center justify-center border-2 border-dashed border-gray-250 hover:border-green-500 rounded-2xl p-3 cursor-pointer transition bg-gray-50/50 hover:bg-green-50/20 text-center select-none active:scale-95">
                <span className="text-xl mb-1">📸</span>
                <span className="text-[10px] font-bold text-gray-700 block leading-tight">Fotos / Capturas</span>
                <span className="text-[8px] text-gray-400 mt-1 block">Fotos y Capturas</span>
                <input 
                  type="file" 
                  multiple
                  accept="image/*" 
                  className="hidden" 
                  onChange={handleUploadArchivos}
                />
              </label>

              {/* Opción PDF */}
              <label className="flex flex-col items-center justify-center border-2 border-dashed border-gray-250 hover:border-green-500 rounded-2xl p-3 cursor-pointer transition bg-gray-50/50 hover:bg-green-50/20 text-center select-none active:scale-95">
                <span className="text-xl mb-1">📄</span>
                <span className="text-[10px] font-bold text-gray-700 block leading-tight">Documento PDF</span>
                <span className="text-[8px] text-gray-400 mt-1 block">Archivos PDF</span>
                <input 
                  type="file" 
                  accept="application/pdf" 
                  className="hidden" 
                  onChange={handleUploadArchivos}
                />
              </label>

              {/* Opción Word/Excel */}
              <label className="flex flex-col items-center justify-center border-2 border-dashed border-gray-250 hover:border-green-500 rounded-2xl p-3 cursor-pointer transition bg-gray-50/50 hover:bg-green-50/20 text-center select-none active:scale-95">
                <span className="text-xl mb-1">📝</span>
                <span className="text-[10px] font-bold text-gray-700 block leading-tight">Word / Excel</span>
                <span className="text-[8px] text-gray-400 mt-1 block">DOCX, XLSX, etc.</span>
                <input 
                  type="file" 
                  accept=".docx,.doc,.xlsx,.xls,application/msword,application/vnd.openxmlformats-officedocument.wordprocessingml.document,application/vnd.ms-excel,application/vnd.openxmlformats-officedocument.spreadsheetml.sheet" 
                  className="hidden" 
                  onChange={handleUploadArchivos}
                />
              </label>
            </div>
            
            {msgCarga && <p className="text-[10px] font-semibold text-green-600 animate-pulse text-center">{msgCarga}</p>}
          </div>

          {/* 2. Visualización y controles de Archivos subidos */}
          {tipoArchivo === 'documento' && docFile && (
            <div className="bg-white border border-gray-100 rounded-2xl p-4 shadow-sm space-y-3">
              <h3 className="text-xs font-bold text-gray-400 uppercase tracking-wider">Documento cargado</h3>
              <div className="border border-gray-150 rounded-xl p-3 flex items-center justify-between gap-3 bg-gray-50/50">
                <div className="flex items-center gap-2.5 min-w-0">
                  <FileText size={18} className="text-green-600 shrink-0" />
                  <div className="min-w-0">
                    <p className="text-xs font-semibold text-gray-800 truncate leading-snug">{docFile.name}</p>
                    <p className="text-[9px] text-gray-400">
                      {(docFile.size / 1024 / 1024).toFixed(2)} MB · {paginasDocumento} página(s)
                    </p>
                  </div>
                </div>
                <button 
                  onClick={() => {
                    setDocFile(null)
                    setTipoArchivo(null)
                  }}
                  className="p-1.5 hover:bg-red-50 text-gray-400 hover:text-red-500 rounded-lg transition"
                >
                  <Trash2 size={14} />
                </button>
              </div>

              {/* Rango de páginas y contador manual para Word */}
              <div className="space-y-3 pt-2 border-t border-gray-100">
                <div className="grid grid-cols-2 gap-2">
                  <button
                    onClick={() => setRangoModo('todo')}
                    className={`py-2 rounded-xl text-xs font-bold border transition ${
                      rangoModo === 'todo' ? 'bg-green-600 text-white border-transparent' : 'bg-gray-50 text-gray-500 border-gray-200'
                    }`}
                  >
                    Imprimir todo ({paginasDocumento} pág)
                  </button>
                  <button
                    onClick={() => setRangoModo('rango')}
                    className={`py-2 rounded-xl text-xs font-bold border transition ${
                      rangoModo === 'rango' ? 'bg-green-600 text-white border-transparent' : 'bg-gray-50 text-gray-500 border-gray-200'
                    }`}
                  >
                    Rango de páginas
                  </button>
                </div>

                {rangoModo === 'rango' && (
                  <div className="space-y-1 bg-gray-50 border border-gray-150 rounded-xl p-3">
                    <label className="text-[10px] font-bold text-gray-455 block">Rango de páginas a imprimir:</label>
                    <input 
                      type="text"
                      value={rangoTexto}
                      onChange={e => setRangoTexto(e.target.value)}
                      placeholder="Ej: 1-3, 5 (Total a imprimir: 4 páginas)"
                      className="w-full bg-white border border-gray-250 rounded-lg px-2.5 py-1.5 text-xs focus:outline-none focus:border-green-500"
                    />
                    <p className="text-[9px] text-gray-400">Páginas calculadas: {paginasCalculadasDoc} pág.</p>
                  </div>
                )}

                {/* Ingreso manual para Word/Excel */}
                {(docFile.name.endsWith('.docx') || docFile.name.endsWith('.xlsx') || docFile.name.endsWith('.doc')) && (
                  <div className="bg-amber-50 border border-amber-150 rounded-xl p-3 text-[10px] text-amber-800 space-y-1.5">
                    <p>⚠️ <strong>Nota:</strong> No se puede auto-detectar las páginas de Word/Excel. Por favor, indícalas manualmente:</p>
                    <div className="flex items-center gap-2">
                      <span className="font-semibold">Nro de Páginas:</span>
                      <input 
                        type="number" 
                        min={1} 
                        value={paginasDocumento} 
                        onChange={e => setPaginasDocumento(Math.max(1, parseInt(e.target.value) || 1))}
                        className="w-16 bg-white border border-gray-250 rounded-lg px-2 py-1 text-xs font-bold text-gray-800"
                      />
                    </div>
                  </div>
                )}
              </div>
            </div>
          )}

          {/* 3. Panel de Diagramación y Lista de Imágenes */}
          {tipoArchivo === 'imagen' && imagenes.length > 0 && (
            <div className="grid grid-cols-1 md:grid-cols-5 gap-4">
              
              {/* Lista de Imágenes subidas y controles individuales */}
              <div className="md:col-span-3 bg-white border border-gray-100 rounded-2xl p-4 shadow-sm space-y-3 max-h-[460px] overflow-y-auto">
                <h3 className="text-xs font-bold text-gray-450 uppercase tracking-wider flex items-center justify-between">
                  <span>Imágenes en el lote ({imagenes.length})</span>
                  <span className="text-[9px] bg-green-50 text-green-700 border border-green-150 px-2 py-0.5 rounded-full font-bold uppercase">
                    Diagramable
                  </span>
                </h3>

                <div className="space-y-3">
                  {imagenes.map((img) => (
                    <div key={img.id} className="border border-gray-150 rounded-xl p-2.5 space-y-2 bg-gray-50/20">
                      <div className="flex items-center gap-3">
                        <div className="w-12 h-12 rounded-lg overflow-hidden border border-gray-200 shrink-0 relative bg-gray-100 flex items-center justify-center">
                          <img src={img.croppedUrl || img.rawUrl} className="max-w-full max-h-full object-contain transition-all duration-300" style={{ filter: img.colorMode === 'bn' ? 'grayscale(100%)' : 'none' }} alt="Thumb" />
                          {img.croppedUrl && (
                            <span className="absolute top-0 right-0 bg-green-600 text-white text-[7px] font-bold px-0.5 rounded-bl">
                              Cortada
                            </span>
                          )}
                        </div>
                        <div className="min-w-0 flex-1">
                          <p className="text-xs font-bold text-gray-700 truncate leading-tight">{img.name}</p>
                          <p className="text-[9px] text-gray-400 mt-0.5">
                            {(img.size / 1024).toFixed(1)} KB · Relación: {img.aspectRatio > 1 ? 'Horizontal' : 'Vertical'} ({img.aspectRatio.toFixed(2)})
                          </p>
                        </div>
                        <button 
                          onClick={() => setImagenes(prev => prev.filter(i => i.id !== img.id))}
                          className="p-1 hover:bg-red-50 text-gray-400 hover:text-red-500 rounded transition"
                        >
                          <Trash2 size={13} />
                        </button>
                      </div>

                      {/* Configuración individual de tamaño, tinta y copias */}
                      <div className="grid grid-cols-3 gap-1.5 pt-1.5 border-t border-gray-100">
                        <div>
                          <label className="text-[8px] font-bold text-gray-400 block uppercase">Tamaño:</label>
                          <select
                            value={img.formatoSize}
                            onChange={e => {
                              const val = e.target.value as any
                              setImagenes(prev => prev.map(i => {
                                if (i.id === img.id) {
                                  let customW = i.customW
                                  let customH = i.customH
                                  // Re-calcular según aspecto si se selecciona personalizado
                                  if (val === 'personalizado') {
                                    if (i.aspectRatio > 1) {
                                      customW = 15
                                      customH = parseFloat((15 / i.aspectRatio).toFixed(1))
                                    } else {
                                      customH = 15
                                      customW = parseFloat((15 * i.aspectRatio).toFixed(1))
                                    }
                                  }
                                  return { ...i, formatoSize: val, customW, customH }
                                }
                                return i
                              }))
                            }}
                            className="w-full bg-white border border-gray-200 rounded px-0.5 py-0.5 text-[9px] text-gray-700 focus:outline-none"
                          >
                            <option value="A4">A4 (Completa)</option>
                            <option value="A5">A5 (Media)</option>
                            <option value="A6">A6 (1/4)</option>
                            <option value="carnet">Carnet</option>
                            <option value="personalizado">Personalizado</option>
                          </select>
                        </div>
                        
                        <div>
                          <label className="text-[8px] font-bold text-gray-400 block uppercase">Tinta:</label>
                          <select
                            value={img.colorMode}
                            onChange={e => {
                              const val = e.target.value as any
                              setImagenes(prev => prev.map(i => i.id === img.id ? { ...i, colorMode: val } : i))
                            }}
                            className="w-full bg-white border border-gray-200 rounded px-0.5 py-0.5 text-[9px] text-gray-700 focus:outline-none"
                          >
                            <option value="color">🌈 Color</option>
                            <option value="bn">⚫ B/N</option>
                          </select>
                        </div>

                        <div>
                          <label className="text-[8px] font-bold text-gray-400 block uppercase">Copias:</label>
                          <div className="flex items-center border border-gray-200 rounded bg-white px-1 py-0.5 justify-between select-none">
                            <button
                              type="button"
                              onClick={() => {
                                setImagenes(prev => prev.map(i => i.id === img.id ? { ...i, copias: Math.max(1, (i.copias || 1) - 1) } : i))
                              }}
                              className="text-gray-500 hover:text-green-650 font-extrabold px-1 text-[10px] cursor-pointer"
                            >
                              -
                            </button>
                            <span className="text-[9px] font-bold text-gray-800">
                              {img.copias || 1}
                            </span>
                            <button
                              type="button"
                              onClick={() => {
                                setImagenes(prev => prev.map(i => i.id === img.id ? { ...i, copias: (i.copias || 1) + 1 } : i))
                              }}
                              className="text-gray-500 hover:text-green-650 font-extrabold px-1 text-[10px] cursor-pointer"
                            >
                              +
                            </button>
                          </div>
                        </div>
                      </div>

                      {/* Configuración personalizada de cm con bloqueo de proporciones */}
                      {img.formatoSize === 'personalizado' && (
                        <div className="space-y-1.5 bg-white border border-gray-150 rounded p-1.5">
                          <div className="grid grid-cols-2 gap-1">
                            <div className="flex items-center gap-1">
                              <span className="text-[8px] text-gray-400 font-bold">Ancho (cm):</span>
                              <input 
                                type="number"
                                min={1} max={21}
                                step="0.1"
                                value={img.customW}
                                onChange={e => {
                                  const val = Math.min(21, Math.max(1, parseFloat(e.target.value) || 1))
                                  setImagenes(prev => prev.map(i => {
                                    if (i.id === img.id) {
                                      const newH = bloquearProporcion ? parseFloat((val / i.aspectRatio).toFixed(1)) : i.customH
                                      return { ...i, customW: val, customH: newH > 29.7 ? 29.7 : newH }
                                    }
                                    return i
                                  }))
                                }}
                                className="w-12 bg-gray-50 border border-gray-200 rounded px-1 py-0.2 text-[9px] text-center"
                              />
                            </div>
                            <div className="flex items-center gap-1">
                              <span className="text-[8px] text-gray-400 font-bold">Alto (cm):</span>
                              <input 
                                type="number"
                                min={1} max={29.7}
                                step="0.1"
                                value={img.customH}
                                onChange={e => {
                                  const val = Math.min(29.7, Math.max(1, parseFloat(e.target.value) || 1))
                                  setImagenes(prev => prev.map(i => {
                                    if (i.id === img.id) {
                                      const newW = bloquearProporcion ? parseFloat((val * i.aspectRatio).toFixed(1)) : i.customW
                                      return { ...i, customH: val, customW: newW > 21 ? 21 : newW }
                                    }
                                    return i
                                  }))
                                }}
                                className="w-12 bg-gray-50 border border-gray-200 rounded px-1 py-0.2 text-[9px] text-center"
                              />
                            </div>
                          </div>
                          <label className="flex items-center gap-1 text-[8px] text-gray-450 select-none cursor-pointer">
                            <input 
                              type="checkbox"
                              checked={bloquearProporcion}
                              onChange={e => setBloquearProporcion(e.target.checked)}
                              className="w-2.5 h-2.5 rounded border-gray-300 text-green-650"
                            />
                            Mantener proporción original
                          </label>
                        </div>
                      )}

                      {/* Cargo por edición si no está recortada */}
                      {!img.croppedUrl && (
                        <label className="flex items-center gap-1.5 text-[9px] text-amber-800 select-none cursor-pointer bg-amber-50/50 border border-amber-200 p-1.5 rounded-lg">
                          <input 
                            type="checkbox"
                            checked={img.requiereEdicionTienda}
                            onChange={e => {
                              const val = e.target.checked
                              setImagenes(prev => prev.map(i => i.id === img.id ? { ...i, requiereEdicionTienda: val } : i))
                            }}
                            className="w-3 h-3 rounded border-gray-300 text-amber-600 focus:ring-amber-500"
                          />
                          <span>Solicitar recorte en tienda (+$0.25)</span>
                        </label>
                      )}

                      {/* Botón de Recorte */}
                      <button 
                        onClick={() => abrirRecortador(img)}
                        className="w-full py-1 bg-green-50 hover:bg-green-100 border border-green-200 text-green-700 font-bold rounded text-[9px] transition flex items-center justify-center gap-1 cursor-pointer"
                      >
                        <Scissors size={10} /> {img.croppedUrl ? '🔄 Recortar de nuevo' : '✂️ Recortar yo mismo (Ahorrar $0.25)'}
                      </button>
                    </div>
                  ))}
                </div>
              </div>

              {/* Vista previa proporcional de la A4 */}
              <div className="md:col-span-2 bg-white border border-gray-100 rounded-2xl p-4 shadow-sm flex flex-col items-center justify-center">
                <span className="text-[10px] font-bold text-gray-455 uppercase mb-2">Previsualización de Hojas</span>
                
                {paginasFisicas.length > 0 ? (
                  <div className="space-y-3 flex flex-col items-center">
                    
                    {/* Contenedor Hoja A4 Dinámico (Portrait / Landscape) */}
                    {(() => {
                      const isPortrait = orientacionHoja === 'portrait'
                      const containerW = isPortrait ? 147 : 208
                      const containerH = isPortrait ? 208 : 147
                      const anchoHoja = isPortrait ? 21 : 29.7
                      const altoHoja = isPortrait ? 29.7 : 21
                      
                      return (
                        <div 
                          className="bg-white border border-gray-300 rounded shadow-md relative overflow-hidden bg-[radial-gradient(#e5e7eb_1.2px,transparent_1.2px)] [background-size:6px_6px] transition-all duration-300"
                          style={{
                            width: `${containerW}px`,
                            height: `${containerH}px`
                          }}
                        >
                          {paginasFisicas[paginaActivaIndex]?.items.map((item) => (
                            <div
                              key={item.id}
                              className="absolute border border-green-500 bg-green-500/10 flex items-center justify-center overflow-hidden group"
                              style={{
                                left: `${(item.x / anchoHoja) * 100}%`,
                                top: `${(item.y / altoHoja) * 100}%`,
                                width: `${(item.w / anchoHoja) * 100}%`,
                                height: `${(item.h / altoHoja) * 100}%`,
                              }}
                            >
                              <img src={item.imgUrl} className="w-full h-full object-contain opacity-95 transition-all duration-300" style={{ filter: item.colorMode === 'bn' ? 'grayscale(100%)' : 'none' }} alt="Item" />
                              <div className="absolute inset-0 bg-black/30 opacity-0 group-hover:opacity-100 transition flex items-center justify-center">
                                <span className="text-[7px] text-white font-bold truncate max-w-full px-1">{item.name}</span>
                              </div>
                              <span className="absolute bottom-0.5 right-0.5 bg-green-700 text-white text-[7px] font-bold px-0.5 rounded leading-none">
                                {item.w.toFixed(1)}x{item.h.toFixed(1)}cm
                              </span>
                            </div>
                          ))}
                        </div>
                      )
                    })()}

                    {/* Controles de Paginación */}
                    <div className="flex items-center gap-3">
                      <button 
                        disabled={paginaActivaIndex === 0}
                        onClick={() => setPaginaActivaIndex(prev => prev - 1)}
                        className="p-1 bg-gray-50 border border-gray-200 rounded-lg disabled:opacity-30 hover:bg-gray-100 transition text-[9px] font-bold cursor-pointer"
                      >
                        ◄ Ant
                      </button>
                      <span className="text-[10px] font-bold text-gray-555">
                        Hoja {paginaActivaIndex + 1} de {paginasFisicas.length}
                      </span>
                      <button 
                        disabled={paginaActivaIndex === paginasFisicas.length - 1}
                        onClick={() => setPaginaActivaIndex(prev => prev + 1)}
                        className="p-1 bg-gray-50 border border-gray-200 rounded-lg disabled:opacity-30 hover:bg-gray-100 transition text-[9px] font-bold cursor-pointer"
                      >
                        Sig ►
                      </button>
                    </div>

                    <p className="text-[8px] text-gray-400 text-center leading-tight">
                      *El sistema distribuye tus imágenes en {paginasFisicas.length} hoja(s) física(s) A4.
                    </p>
                  </div>
                ) : (
                  <div className="h-[200px] flex items-center justify-center text-xs text-gray-400">
                    Carga imágenes para diagramar
                  </div>
                )}
              </div>
            </div>
          )}

          {/* 4. Opciones Avanzadas Globales */}
          {tipoArchivo && (
            <div className="bg-white border border-gray-100 rounded-2xl p-4 shadow-sm space-y-3.5">
              <h3 className="text-xs font-bold text-gray-400 uppercase tracking-wider">2. Opciones de Impresión</h3>

              {/* A. Tinta / Color para Documentos */}
              {tipoArchivo === 'documento' && (
                <div className="space-y-2 pb-2">
                  <label className="text-[10px] font-bold text-gray-500 block uppercase">Tinta / Color:</label>
                  <div className="grid grid-cols-2 gap-2">
                    <button
                      onClick={() => { setDocColorMode('bn'); setModoMixtoDoc(false) }}
                      className={`py-2 rounded-xl text-xs font-bold border transition ${
                        docColorMode === 'bn' ? 'bg-green-600 text-white border-transparent' : 'bg-white border-gray-200 text-gray-550'
                      }`}
                    >
                      ⚫ Blanco y Negro ($0.05 / pág)
                    </button>
                    <button
                      onClick={() => setDocColorMode('color')}
                      className={`py-2 rounded-xl text-xs font-bold border transition ${
                        docColorMode === 'color' ? 'bg-green-600 text-white border-transparent' : 'bg-white border-gray-200 text-gray-550'
                      }`}
                    >
                      🌈 Color
                    </button>
                  </div>

                  {docColorMode === 'color' && (
                    <div className="space-y-2 bg-gray-50 border border-gray-150 rounded-xl p-3 transition-all">
                      <div className="flex items-center justify-between border-b border-gray-200/60 pb-1.5">
                        <label className="flex items-center gap-2 cursor-pointer text-xs text-gray-700 font-semibold select-none">
                          <input 
                            type="checkbox"
                            checked={modoMixtoDoc}
                            onChange={e => setModoMixtoDoc(e.target.checked)}
                            className="w-3.5 h-3.5 rounded border-gray-300 text-green-600 focus:ring-green-500"
                          />
                          Impresión mixta (Color y B/N mezclados)
                        </label>
                      </div>

                      {modoMixtoDoc && (
                        <div className="space-y-1">
                          <label className="text-[9px] font-bold text-gray-400 block uppercase">¿Cuáles páginas van a color?</label>
                          <input 
                            type="text"
                            value={paginasColorManual}
                            onChange={e => setPaginasColorManual(e.target.value)}
                            placeholder="Ej: 1, 3 (las otras saldrán en B/N)"
                            className="w-full bg-white border border-gray-250 rounded-lg px-2.5 py-1.5 text-xs focus:outline-none"
                          />
                        </div>
                      )}

                      <div className="space-y-1">
                        <div className="flex items-center gap-1">
                          <label className="text-[9px] font-bold text-gray-400 block uppercase">Cobertura de color:</label>
                          <HelpCircle size={10} className="text-gray-400 cursor-help" onClick={() => alert('Bajo Color: Textos y logos pequeños ($0.25).\nMedio Color: Gráficos a media página ($0.50).\nAlto Color: Fotos completas o portadas ($1.00).')} />
                        </div>
                        <div className="grid grid-cols-3 gap-1.5">
                          {[
                            { code: 'bajo', label: '🟢 Bajo (<25%)', price: 0.25 },
                            { code: 'medio', label: '🟡 Medio (~50%)', price: 0.50 },
                            { code: 'alto', label: '🔴 Alto (100%)', price: 1.00 },
                          ].map(cob => (
                            <button
                              key={cob.code}
                              onClick={() => setCoberturaColorDoc(cob.code as any)}
                              className={`py-1 rounded-lg text-[9px] font-bold border transition ${
                                coberturaColorDoc === cob.code ? 'bg-green-50 border-green-500 text-green-700' : 'bg-white border-gray-200'
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
                </div>
              )}

              {/* Orientación de Hoja (Solo para Imágenes) */}
              {tipoArchivo === 'imagen' && (
                <div className="space-y-2 pb-2 border-b border-gray-100">
                  <label className="text-[10px] font-bold text-gray-500 block uppercase">Orientación de las Hojas:</label>
                  <div className="grid grid-cols-2 gap-2">
                    <button
                      type="button"
                      onClick={() => setOrientacionHoja('portrait')}
                      className={`py-2 rounded-xl text-xs font-bold border transition cursor-pointer ${
                        orientacionHoja === 'portrait' ? 'bg-green-600 text-white border-transparent' : 'bg-white border-gray-200 text-gray-550 hover:bg-gray-50'
                      }`}
                    >
                      Vertical (Portrait)
                    </button>
                    <button
                      type="button"
                      onClick={() => setOrientacionHoja('landscape')}
                      className={`py-2 rounded-xl text-xs font-bold border transition cursor-pointer ${
                        orientacionHoja === 'landscape' ? 'bg-green-600 text-white border-transparent' : 'bg-white border-gray-200 text-gray-550 hover:bg-gray-50'
                      }`}
                    >
                      Horizontal (Landscape)
                    </button>
                  </div>
                </div>
              )}

              {/* Distribución / Auto-ajuste de Hojas (Solo para Imágenes) */}
              {tipoArchivo === 'imagen' && (
                <div className="space-y-2 pb-2 border-b border-gray-100">
                  <label className="text-[10px] font-bold text-gray-500 block uppercase">Distribución de Hojas:</label>
                  <div className="grid grid-cols-4 gap-1.5">
                    {[
                      { code: 'libre', label: '📱 Libre' },
                      { code: '1', label: '📄 1 Hoja' },
                      { code: '2', label: '📄 2 Hojas' },
                      { code: '3', label: '📄 3 Hojas' },
                    ].map(opt => (
                      <button
                        key={opt.code}
                        type="button"
                        onClick={() => setAutoAjustarModo(opt.code as any)}
                        className={`py-2 rounded-xl text-[10px] font-bold border transition cursor-pointer text-center ${
                          autoAjustarModo === opt.code
                            ? 'bg-green-600 text-white border-transparent'
                            : 'bg-white border-gray-200 text-gray-550 hover:bg-gray-50'
                        }`}
                      >
                        {opt.label}
                      </button>
                    ))}
                  </div>

                  {/* Advertencia / Asesoría si el factor de escala encoge mucho las fotos */}
                  {escalaUtilizada < 0.98 && (
                    <div className="bg-amber-50 border border-amber-200 rounded-xl p-2.5 text-[10px] text-amber-800 space-y-1 mt-1.5 transition-all text-left">
                      <div className="font-bold flex items-center gap-1">⚡ Auto-ajustado activo (Escala: {Math.round(escalaUtilizada * 100)}%)</div>
                      <p className="leading-tight">
                        Tus imágenes se han encogido un poco para caber en exactamente {autoAjustarModo} {parseInt(autoAjustarModo) === 1 ? 'hoja' : 'hojas'}.
                      </p>
                      {(() => {
                        const promW = imagenes.reduce((acc, img) => acc + getImgDimensions(img).w * escalaUtilizada, 0) / imagenes.length
                        const promH = imagenes.reduce((acc, img) => acc + getImgDimensions(img).h * escalaUtilizada, 0) / imagenes.length
                        if (promW < 5.0 || promH < 5.0) {
                          return (
                            <p className="text-red-700 font-semibold leading-tight pt-1">
                              ⚠️ Las fotos saldrán muy pequeñas (promedio: {promW.toFixed(1)} x {promH.toFixed(1)} cm). Te sugerimos elegir más hojas si deseas que se impriman con mayor detalle y nitidez.
                            </p>
                          )
                        }
                        return null
                      })()}
                    </div>
                  )}
                </div>
              )}

              {/* B. Tipo de Papel */}
              <div className="space-y-1">
                <label className="text-[10px] font-bold text-gray-500 block uppercase">Tipo de Papel:</label>
                <select
                  value={tipoPapel}
                  onChange={e => setTipoPapel(e.target.value as any)}
                  className="w-full bg-white border border-gray-200 rounded-xl px-3 py-2 text-xs text-gray-700 focus:outline-none focus:border-green-500"
                >
                  <option value="bond75">Papel Bond 75g (Estándar)</option>
                  <option value="bond90">Papel Bond 90g (Premium +$0.02)</option>
                  <option value="cartulina">Cartulina Escolar (+$0.08)</option>
                  {tipoArchivo === 'imagen' && <option value="foto">Papel Fotográfico Brillante (+$0.40)</option>}
                </select>
              </div>

              {/* C. Doble faz (Dúplex) — Solo para documentos */}
              {tipoArchivo === 'documento' && (
                <div className="flex items-center justify-between border-t border-gray-100 pt-3">
                  <div>
                    <label className="text-xs font-semibold text-gray-700 block">Imprimir por ambos lados (Doble Faz)</label>
                    <span className="text-[9px] text-gray-400 block leading-tight">Reduce a la mitad el uso de hojas físicas de papel</span>
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
          {tipoArchivo && (
            <div className="bg-gray-900 border border-gray-800 rounded-2xl p-4 text-white space-y-4">
              
              {/* Selector de copias */}
              <div className="flex items-center justify-between">
                <div>
                  <span className="text-xs font-bold text-gray-400 uppercase tracking-wider block">3. Número de copias</span>
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
                  <span>
                    {tipoArchivo === 'imagen' 
                      ? `Precio por lote (${paginasFisicas.length} hojas físicas A4):` 
                      : `Precio por juego (${dobleFaz ? Math.ceil(paginasCalculadasDoc / 2) : paginasCalculadasDoc} hojas):`
                    }
                  </span>
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
                className="w-full flex items-center justify-center gap-2 bg-green-600 hover:bg-green-550 disabled:opacity-50 text-white font-extrabold py-3.5 rounded-xl transition text-sm cursor-pointer"
              >
                {loading ? (
                  <>
                    <Loader2 size={16} className="animate-spin" />
                    Subiendo archivos...
                  </>
                ) : (
                  <>🛒 Añadir al carrito · {fmt(totalCotizado)}</>
                )}
              </button>
            </div>
          )}
        </div>
      )}

      {/* ========================================== */}
      {/* SCREENSHOT CROPPER MODAL (OVERLAY FLOATING) */}
      {/* ========================================== */}
      {imagenACortarId && (
        <div className="fixed inset-0 bg-black/80 z-[100] flex flex-col items-center justify-center p-4">
          <div className="bg-white rounded-2xl w-full max-w-md p-4 space-y-4 shadow-2xl flex flex-col items-center text-center">
            <h3 className="text-xs font-bold text-gray-450 uppercase tracking-wider block self-start">Recortar captura de pantalla</h3>
            
            <p className="text-[10px] text-gray-450 leading-relaxed text-left self-start">
              Arrastra la caja o sus esquinas para eliminar barras de notificaciones o botones negros de tu teléfono:
            </p>

            {/* Contenedor externo gris */}
            <div className="relative w-full overflow-hidden bg-gray-900 rounded-xl flex items-center justify-center p-4" style={{ height: '280px' }}>
              
              {/* Contenedor del Cropper ceñido estrictamente al tamaño renderizado de la imagen */}
              <div 
                ref={cropperContainerRef}
                className="relative select-none"
                style={{
                  width: `${cropperDimensions.w}px`,
                  height: `${cropperDimensions.h}px`
                }}
              >
                <img 
                  ref={imgRef}
                  src={imagenes.find(img => img.id === imagenACortarId)?.rawUrl} 
                  alt="Para recortar" 
                  className="w-full h-full object-contain pointer-events-none"
                />
                
                {/* Bounding box de recorte */}
                <div 
                  className="absolute border border-green-400 bg-green-400/20 cursor-move"
                  style={{
                    left: `${cropBox.x}%`,
                    top: `${cropBox.y}%`,
                    width: `${cropBox.w}%`,
                    height: `${cropBox.h}%`
                  }}
                  onTouchStart={e => handleMouseDown(e, 'move')}
                  onMouseDown={e => handleMouseDown(e, 'move')}
                >
                  {/* Control handles esquinas con 32px targets */}
                  {['top-left', 'top-right', 'bottom-left', 'bottom-right'].map(pos => (
                    <div 
                      key={pos}
                      className={`absolute w-8 h-8 flex items-center justify-center z-[110] cursor-pointer`}
                      style={{
                        top: pos.startsWith('top') ? '-14px' : 'auto',
                        bottom: pos.startsWith('bottom') ? '-14px' : 'auto',
                        left: pos.endsWith('left') ? '-14px' : 'auto',
                        right: pos.endsWith('right') ? '-14px' : 'auto',
                      }}
                      onTouchStart={e => handleMouseDown(e, pos)}
                      onMouseDown={e => handleMouseDown(e, pos)}
                    >
                      <span className="w-3 h-3 bg-green-500 border-2 border-white rounded-full shadow-md" />
                    </div>
                  ))}
                </div>
              </div>
            </div>

            <div className="grid grid-cols-3 gap-2 w-full pt-2">
              <button 
                type="button"
                onClick={autoDetectarContorno}
                className="bg-amber-600 hover:bg-amber-500 text-white font-bold py-2 rounded-xl text-xs transition cursor-pointer"
              >
                ✨ Auto-detectar
              </button>
              <button 
                type="button"
                onClick={aplicarRecorte}
                className="bg-green-600 hover:bg-green-700 text-white font-bold py-2 rounded-xl text-xs transition cursor-pointer"
              >
                Aplicar
              </button>
              <button 
                type="button"
                onClick={() => setImagenACortarId(null)}
                className="bg-gray-150 hover:bg-gray-200 text-gray-700 font-semibold py-2 rounded-xl text-xs transition cursor-pointer"
              >
                Cancelar
              </button>
            </div>
          </div>
        </div>
      )}
    </div>
  )
}

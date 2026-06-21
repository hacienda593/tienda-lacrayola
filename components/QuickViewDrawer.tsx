'use client'
import { useEffect, useState, useRef } from 'react'
import Link from 'next/link'
import { X, ShoppingCart, Heart, Shield, Check, ChevronLeft, ChevronRight } from 'lucide-react'
import { Producto } from '@/lib/types'
import { agregarItem } from '@/lib/carrito'
import { toggleFavorito, esFavorito } from '@/lib/favoritos'

interface QuickViewDrawerProps {
  producto: Producto | null
  prevProducto?: Producto | null
  nextProducto?: Producto | null
  isOpen: boolean
  onClose: () => void
  onNext?: () => void
  onPrev?: () => void
}

const CAT_EMOJI: Record<string, string> = {
  'Escolar': '📚', 'Arte': '🎨', 'Oficina': '🖊️', 'Tecnologia': '💻',
  'Juguetes': '🧸', 'Manualidades': '✂️', 'Libros': '📖', 'Pintura': '🖌️',
  'Abarrotes': '🥬', 'Bebidas y Licores': '🥤', 'Congelados y Refrigerados': '❄️',
  'Golosinas y Snacks': '🍪', 'Panadería': '🍞', 'Cuidado Personal': '🧴',
  'Hogar y Limpieza': '🧹', 'Mascotas': '🐶', 'Huevos Lácteos y Leches': '🥛'
}

export default function QuickViewDrawer({ producto, prevProducto, nextProducto, isOpen, onClose, onNext, onPrev }: QuickViewDrawerProps) {
  const [fav, setFav] = useState(false)
  const [agregado, setAgregado] = useState(false)
  const [imageError, setImageError] = useState(false)
  
  const imageRef = useRef<HTMLImageElement>(null)
  const containerRef = useRef<HTMLDivElement>(null)
  
  // Swipe state
  const [touchStart, setTouchStart] = useState<number | null>(null)
  const [touchEnd, setTouchEnd] = useState<number | null>(null)
  const minSwipeDistance = 60

  // Sync state when product changes
  useEffect(() => {
    if (producto) {
      setFav(esFavorito(producto.codigo))
      setAgregado(false)
      setImageError(false)
      resetImageTransform()
    }
  }, [producto, isOpen])

  if (!producto) return null

  const agotado = producto.stock <= 0
  const pocasUnidades = producto.stock > 0 && producto.stock < 5

  function handleAddToCart() {
    if (!producto || agotado) return
    if (typeof navigator !== 'undefined' && navigator.vibrate) {
      navigator.vibrate(15)
    }
    agregarItem(producto)
    setAgregado(true)
    
    // Sync cart counts in header
    window.dispatchEvent(new Event('carrito-update'))
    
    setTimeout(() => {
      setAgregado(false)
      onClose()
    }, 1200)
  }

  // --- TACTILE PAN-ZOOM LOGIC (Lupa de inspección táctil) ---
  function handlePointerMove(e: React.MouseEvent<HTMLDivElement> | React.TouchEvent<HTMLDivElement>) {
    const container = containerRef.current
    const img = imageRef.current
    if (!container || !img) return

    const rect = container.getBoundingClientRect()
    let clientX = 0
    let clientY = 0

    // Capture touch or mouse coordinates
    if ('touches' in e) {
      if (e.touches.length === 0) return
      clientX = e.touches[0].clientX
      clientY = e.touches[0].clientY
    } else {
      clientX = e.clientX
      clientY = e.clientY
    }

    // Percentage coordinates inside container
    const xPercent = ((clientX - rect.left) / rect.width) * 100
    const yPercent = ((clientY - rect.top) / rect.height) * 100

    // Pan zoom centered at pointer position
    img.style.transformOrigin = `${xPercent}% ${yPercent}%`
    img.style.transform = 'scale(1.45)'
    img.style.filter = 'drop-shadow(0 25px 35px rgba(0, 0, 0, 0.35))'
  }

  function resetImageTransform() {
    const img = imageRef.current
    if (img) {
      img.style.transformOrigin = 'center center'
      img.style.transform = 'scale(1)'
      img.style.filter = 'drop-shadow(0 15px 20px rgba(0, 0, 0, 0.25))'
    }
  }

  function handleToggleFav() {
    if (!producto) return
    const isFav = toggleFavorito({
      codigo: producto.codigo,
      descripcion: producto.descripcion,
      categoria: producto.categoria,
      precio_publico: producto.precio_publico
    })
    setFav(isFav)
  }

  // --- TOUCH SWIPE CAROUSEL LOGIC ---
  const handleTouchStart = (e: React.TouchEvent<HTMLDivElement>) => {
    setTouchEnd(null)
    setTouchStart(e.targetTouches[0].clientX)
  }

  const handleTouchMove = (e: React.TouchEvent<HTMLDivElement>) => {
    setTouchEnd(e.targetTouches[0].clientX)
  }

  const handleTouchEnd = () => {
    if (!touchStart || !touchEnd) return
    const distance = touchStart - touchEnd
    const isLeftSwipe = distance > minSwipeDistance
    const isRightSwipe = distance < -minSwipeDistance
    
    if (isLeftSwipe && onNext) {
      if (typeof navigator !== 'undefined' && navigator.vibrate) navigator.vibrate(8)
      onNext()
    }
    if (isRightSwipe && onPrev) {
      if (typeof navigator !== 'undefined' && navigator.vibrate) navigator.vibrate(8)
      onPrev()
    }
  }

  return (
    <>
      {/* Backdrop */}
      <div
        onClick={onClose}
        className={`fixed inset-0 bg-black/60 backdrop-blur-sm z-[100] transition-opacity duration-300 ${
          isOpen ? 'opacity-100 pointer-events-auto' : 'opacity-0 pointer-events-none'
        }`}
      />

      {/* Chevron left desktop button */}
      {onPrev && (
        <button
          onClick={onPrev}
          className="fixed left-4 top-1/2 -translate-y-1/2 z-[102] hidden md:flex w-12 h-12 rounded-full bg-white/10 hover:bg-white/20 border border-white/10 items-center justify-center text-white transition-all hover:scale-105 active:scale-95 shadow-lg backdrop-blur-md"
        >
          <ChevronLeft size={24} />
        </button>
      )}

      {/* Chevron right desktop button */}
      {onNext && (
        <button
          onClick={onNext}
          className="fixed right-4 top-1/2 -translate-y-1/2 z-[102] hidden md:flex w-12 h-12 rounded-full bg-white/10 hover:bg-white/20 border border-white/10 items-center justify-center text-white transition-all hover:scale-105 active:scale-95 shadow-lg backdrop-blur-md"
        >
          <ChevronRight size={24} />
        </button>
      )}

      {/* Drawer Container (Desktop Modal / Mobile Bottom Sheet) */}
      <div
        onTouchStart={handleTouchStart}
        onTouchMove={handleTouchMove}
        onTouchEnd={handleTouchEnd}
        className={`fixed z-[101] bg-white transition-all duration-300 ease-out
          /* Mobile layout */
          bottom-0 left-0 w-full rounded-t-3xl border-t border-gray-100 p-5 shadow-2xl flex flex-col gap-4 max-h-[95vh] overflow-y-auto
          ${isOpen ? 'translate-y-0 opacity-100' : 'translate-y-full opacity-0'}
          /* Desktop layout */
          md:top-1/2 md:left-1/2 md:-translate-x-1/2 md:-translate-y-1/2 md:max-w-md md:rounded-2xl md:border md:w-full md:bottom-auto md:p-7 md:max-h-[90vh]
          ${isOpen ? 'md:scale-100 md:opacity-100' : 'md:scale-95 md:opacity-0 md:pointer-events-none'}
        `}
      >
        {/* Floating Close button in header */}
        <div className="flex justify-end items-center absolute top-4 right-4 z-50">
          <button
            onClick={onClose}
            className="w-8 h-8 rounded-full bg-white/80 border border-gray-100 flex items-center justify-center text-gray-400 hover:text-gray-600 hover:bg-gray-100 transition shadow-sm"
          >
            <X size={15} />
          </button>
        </div>

        {/* 1. King-Size Interactive Image Container (Floating Thumbnails + 100% Pan-Zoom) */}
        <div
          ref={containerRef}
          onMouseMove={handlePointerMove}
          onMouseLeave={resetImageTransform}
          onTouchMove={handlePointerMove}
          onTouchEnd={resetImageTransform}
          className="relative bg-gradient-to-br from-gray-50/70 to-gray-100 rounded-2xl h-60 md:h-72 flex items-center justify-center text-8xl overflow-hidden border border-gray-100/50 touch-pan-y select-none"
        >
          {producto.imagen_url && !imageError ? (
            <img
              ref={imageRef}
              src={producto.imagen_url}
              alt={producto.descripcion}
              onError={() => setImageError(true)}
              style={{
                transition: 'transform 0.15s ease-out, filter 0.15s ease-out',
                transformOrigin: 'center center',
                transform: 'scale(1)',
                filter: 'drop-shadow(0 15px 20px rgba(0, 0, 0, 0.25))'
              }}
              className="w-full h-full object-contain p-6"
              loading="lazy"
            />
          ) : (
            CAT_EMOJI[producto.categoria] || '📦'
          )}

          {/* Floating Category Badge inside image */}
          <span className="absolute bottom-3 left-3 text-[10px] font-extrabold text-green-700 bg-white/90 border border-green-100/50 px-2.5 py-1 rounded-lg backdrop-blur shadow-sm select-none">
            {producto.categoria}
          </span>
          
          {/* Favorite badge inside image */}
          <button
            onClick={handleToggleFav}
            className={`absolute bottom-3 right-3 w-8.5 h-8.5 rounded-full flex items-center justify-center shadow-md transition ${
              fav ? 'bg-red-500 text-white' : 'bg-white/95 text-gray-300 hover:text-red-400'
            }`}
          >
            <Heart size={14} className={fav ? 'fill-white' : ''} />
          </button>

          {/* Agotado / Pocas unidades Badge */}
          {agotado ? (
            <div className="absolute inset-0 bg-white/70 backdrop-blur-[1px] flex items-center justify-center">
              <span className="text-xs font-black text-red-600 bg-red-50/90 px-3.5 py-1.5 rounded-full border border-red-200 shadow-sm">
                PRODUCTO AGOTADO
              </span>
            </div>
          ) : pocasUnidades ? (
            <span className="absolute top-3 left-3 text-[10px] font-bold bg-orange-500 text-white px-2.5 py-1 rounded-lg shadow-sm">
              ⚡ Últimas {producto.stock} unidades
            </span>
          ) : null}

          {/* Floating Circle Thumbnail Left (Prev Producto) */}
          {prevProducto && (
            <button
              onClick={(e) => { e.stopPropagation(); onPrev?.(); }}
              className="absolute left-2.5 top-1/2 -translate-y-1/2 w-11 h-11 rounded-full bg-white/95 border border-gray-200/50 shadow-md hover:shadow-lg flex items-center justify-center overflow-hidden active:scale-90 transition-all z-50 cursor-pointer"
              title={prevProducto.descripcion}
            >
              {prevProducto.imagen_url ? (
                <img src={prevProducto.imagen_url} alt="Anterior" className="w-full h-full object-contain p-1 blur-[0.3px]" />
              ) : (
                <span className="text-xl">{CAT_EMOJI[prevProducto.categoria] || '📦'}</span>
              )}
            </button>
          )}

          {/* Floating Circle Thumbnail Right (Next Producto) */}
          {nextProducto && (
            <button
              onClick={(e) => { e.stopPropagation(); onNext?.(); }}
              className="absolute right-2.5 top-1/2 -translate-y-1/2 w-11 h-11 rounded-full bg-white/95 border border-gray-200/50 shadow-md hover:shadow-lg flex items-center justify-center overflow-hidden active:scale-90 transition-all z-50 cursor-pointer"
              title={nextProducto.descripcion}
            >
              {nextProducto.imagen_url ? (
                <img src={nextProducto.imagen_url} alt="Siguiente" className="w-full h-full object-contain p-1 blur-[0.3px]" />
              ) : (
                <span className="text-xl">{CAT_EMOJI[nextProducto.categoria] || '📦'}</span>
              )}
            </button>
          )}
        </div>

        {/* 2. Structured Product Details below image */}
        <div className="space-y-3.5 mt-1">
          <div>
            <h3 className="text-lg font-extrabold text-gray-900 leading-tight">
              {producto.descripcion}
            </h3>
            {producto.marca && (
              <span className="text-xs text-gray-400 mt-1 block">
                Marca: <strong className="text-gray-600 font-bold">{producto.marca}</strong>
              </span>
            )}
          </div>

          <div className="flex items-center gap-3 bg-gray-50/50 p-2.5 rounded-xl border border-gray-100/30">
            <span className="text-2xl font-black text-gray-900 leading-none">
              ${producto.precio_publico.toFixed(2)}
            </span>
            <span className="text-[10px] text-gray-400 font-bold bg-white border border-gray-100 px-1.5 py-0.5 rounded shadow-2xs">
              PVP SUGERIDO
            </span>
          </div>

          {/* Mini Metadata list */}
          <div className="space-y-1.5 text-xs text-gray-500 border-t border-gray-100/60 pt-3">
            <div className="flex justify-between">
              <span>Código interno de percha:</span>
              <span className="font-mono text-gray-800 font-bold">{producto.codigo}</span>
            </div>
            <div className="flex justify-between">
              <span>Estado en tienda física:</span>
              <span className={`font-bold ${agotado ? 'text-red-500' : 'text-green-600'}`}>
                {agotado ? 'Sin inventario' : `${producto.stock} unidades listas`}
              </span>
            </div>
            <div className="flex justify-between items-center">
              <span>Garantía de frescura:</span>
              <span className="text-gray-700 font-semibold flex items-center gap-0.5">
                <Shield size={12} className="text-green-600 shrink-0" /> Control verificado
              </span>
            </div>
          </div>

          {/* 3. Action Buttons */}
          <div className="space-y-2 pt-1.5">
            <button
              disabled={agotado}
              onClick={handleAddToCart}
              className={`w-full py-3.5 rounded-xl font-extrabold text-sm flex items-center justify-center gap-2 select-none active:scale-[0.96] transition-transform duration-75 ${
                agotado
                  ? 'bg-gray-100 text-gray-400 cursor-not-allowed border border-gray-200'
                  : agregado
                  ? 'bg-green-600 text-white shadow-lg shadow-green-600/25'
                  : 'bg-green-600 hover:bg-green-700 text-white shadow-lg shadow-green-600/20'
              }`}
            >
              {agregado ? <Check size={16} /> : <ShoppingCart size={16} />}
              {agotado ? 'Agotado' : agregado ? '¡Agregado!' : 'Agregar al carrito'}
            </button>

            <Link
              href={`/producto/${encodeURIComponent(producto.codigo)}`}
              onClick={onClose}
              className="w-full py-2.5 rounded-xl font-bold text-xs text-gray-400 hover:text-green-700 bg-gray-50 hover:bg-green-50/50 border border-gray-100 hover:border-green-100 transition text-center block"
            >
              Ver ficha técnica completa →
            </Link>
          </div>
        </div>
      </div>
    </>
  )
}

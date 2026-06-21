'use client'
import { useEffect, useState } from 'react'
import { X, ShoppingCart, Heart, Shield, Check } from 'lucide-react'
import { Producto } from '@/lib/types'
import { agregarItem } from '@/lib/carrito'
import { toggleFavorito, esFavorito } from '@/lib/favoritos'
import Link from 'next/link'

interface QuickViewDrawerProps {
  producto: Producto | null
  isOpen: boolean
  onClose: () => void
}

const CAT_EMOJI: Record<string, string> = {
  'Escolar': '📚', 'Arte': '🎨', 'Oficina': '🖊️', 'Tecnologia': '💻',
  'Juguetes': '🧸', 'Manualidades': '✂️', 'Libros': '📖', 'Pintura': '🖌️',
  'Abarrotes': '🥬', 'Bebidas y Licores': '🥤', 'Congelados y Refrigerados': '❄️',
  'Golosinas y Snacks': '🍪', 'Panadería': '🍞', 'Cuidado Personal': '🧴',
  'Hogar y Limpieza': '🧹', 'Mascotas': '🐶', 'Huevos Lácteos y Leches': '🥛'
}

export default function QuickViewDrawer({ producto, isOpen, onClose }: QuickViewDrawerProps) {
  const [fav, setFav] = useState(false)
  const [agregado, setAgregado] = useState(false)
  const [imageError, setImageError] = useState(false)

  // Sync favorite state when product changes or drawer opens
  useEffect(() => {
    if (producto) {
      setFav(esFavorito(producto.codigo))
      setAgregado(false)
      setImageError(false)
    }
  }, [producto, isOpen])

  if (!producto) return null

  const agotado = producto.stock <= 0
  const pocasUnidades = producto.stock > 0 && producto.stock < 5

  function handleAddToCart() {
    if (!producto || agotado) return
    agregarItem(producto)
    setAgregado(true)
    
    // Dispatch cart update event for NavBar/Header sync
    window.dispatchEvent(new Event('carrito-update'))
    
    setTimeout(() => {
      setAgregado(false)
      onClose()
    }, 1000)
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

  return (
    <>
      {/* Backdrop (Back blur overlay) */}
      <div
        onClick={onClose}
        className={`fixed inset-0 bg-black/60 backdrop-blur-sm z-[100] transition-opacity duration-300 ${
          isOpen ? 'opacity-100 pointer-events-auto' : 'opacity-0 pointer-events-none'
        }`}
      />

      {/* Drawer Container (Desktop Modal / Mobile Bottom Sheet) */}
      <div
        className={`fixed z-[101] bg-white transition-all duration-300 ease-out
          /* Mobile layout (Bottom Sheet) */
          bottom-0 left-0 w-full rounded-t-3xl border-t border-gray-100 p-6 shadow-2xl flex flex-col gap-4 max-h-[90vh] overflow-y-auto
          ${isOpen ? 'translate-y-0 opacity-100' : 'translate-y-full opacity-0'}
          /* Desktop layout (Centered Modal) */
          md:top-1/2 md:left-1/2 md:-translate-x-1/2 md:-translate-y-1/2 md:max-w-lg md:rounded-2xl md:border md:w-full md:bottom-auto md:p-8 md:max-h-[85vh]
          ${isOpen ? 'md:scale-100 md:opacity-100' : 'md:scale-95 md:opacity-0 md:pointer-events-none'}
        `}
      >
        {/* Header: Title and Close button */}
        <div className="flex justify-between items-start gap-4">
          <div className="flex-1">
            <span className="text-[10px] font-bold text-green-600 uppercase tracking-wider bg-green-50 border border-green-100 px-2 py-0.5 rounded-md">
              {producto.categoria}
            </span>
            <h3 className="text-lg font-bold text-gray-900 leading-snug mt-2">
              {producto.descripcion}
            </h3>
            {producto.marca && (
              <span className="text-xs text-gray-400 block mt-0.5">
                Marca: <strong className="text-gray-600 font-medium">{producto.marca}</strong>
              </span>
            )}
          </div>
          
          <button
            onClick={onClose}
            className="w-8 h-8 rounded-full bg-gray-50 border border-gray-100 flex items-center justify-center text-gray-400 hover:text-gray-600 hover:bg-gray-100 transition shrink-0"
          >
            <X size={16} />
          </button>
        </div>

        {/* Body content */}
        <div className="grid grid-cols-1 md:grid-cols-2 gap-5 py-2">
          
          {/* Left: Product Image Box */}
          <div className="relative bg-gradient-to-br from-gray-50 to-gray-100/50 rounded-2xl h-44 flex items-center justify-center text-6xl overflow-hidden border border-gray-50">
            {producto.imagen_url && !imageError ? (
              <img
                src={producto.imagen_url}
                alt={producto.descripcion}
                onError={() => setImageError(true)}
                className="w-full h-full object-contain p-4"
                loading="lazy"
              />
            ) : (
              CAT_EMOJI[producto.categoria] || '📦'
            )}
            
            {/* Favorite toggle badge */}
            <button
              onClick={handleToggleFav}
              className={`absolute top-3 right-3 w-8 h-8 rounded-full flex items-center justify-center shadow-sm transition ${
                fav ? 'bg-red-500 text-white' : 'bg-white/90 text-gray-300 hover:text-red-400'
              }`}
            >
              <Heart size={14} className={fav ? 'fill-white' : ''} />
            </button>

            {/* Agotado / Pocas unidades Badge */}
            {agotado ? (
              <div className="absolute inset-0 bg-white/70 flex items-center justify-center">
                <span className="text-xs font-bold text-red-500 bg-red-50 px-2 py-1 rounded-full border border-red-200">
                  AGOTADO
                </span>
              </div>
            ) : pocasUnidades ? (
              <span className="absolute top-3 left-3 text-[10px] font-bold bg-orange-500 text-white px-2 py-0.5 rounded-full">
                ⚡ ¡Últimas {producto.stock} unidades!
              </span>
            ) : null}
          </div>

          {/* Right: Technical specifications and pricing */}
          <div className="flex flex-col justify-between gap-4">
            <div className="space-y-2.5">
              <div className="flex items-baseline gap-2">
                <span className="text-2xl font-black text-gray-900">
                  ${producto.precio_publico.toFixed(2)}
                </span>
                <span className="text-[10px] text-gray-400 font-semibold bg-gray-50 px-1.5 py-0.5 rounded">
                  PVP sugerido
                </span>
              </div>

              <div className="space-y-1.5 text-xs text-gray-500">
                <div className="flex justify-between border-b border-gray-50 pb-1">
                  <span>Código de producto:</span>
                  <span className="font-mono text-gray-800 font-medium">{producto.codigo}</span>
                </div>
                <div className="flex justify-between border-b border-gray-50 pb-1">
                  <span>Estado de stock:</span>
                  <span className={`font-bold ${agotado ? 'text-red-500' : 'text-green-600'}`}>
                    {agotado ? 'Sin inventario' : `${producto.stock} disponibles`}
                  </span>
                </div>
                <div className="flex justify-between border-b border-gray-50 pb-1">
                  <span>Garantía de entrega:</span>
                  <span className="text-gray-800 flex items-center gap-0.5">
                    <Shield size={12} className="text-green-600" /> Compra segura
                  </span>
                </div>
              </div>
            </div>

            {/* Action buttons */}
            <div className="space-y-2 mt-2">
              <button
                disabled={agotado}
                onClick={handleAddToCart}
                className={`w-full py-3 rounded-xl font-bold text-sm flex items-center justify-center gap-2 transition select-none ${
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
                className="w-full py-2.5 rounded-xl font-semibold text-xs text-gray-500 hover:text-green-700 bg-gray-50 border border-gray-100 hover:bg-green-50/50 hover:border-green-100 transition text-center block"
              >
                Ver ficha técnica completa →
              </Link>
            </div>
          </div>

        </div>
      </div>
    </>
  )
}

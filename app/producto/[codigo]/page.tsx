'use client'
import { useEffect, useState } from 'react'
import { useParams, useRouter } from 'next/navigation'
import { supabase } from '@/lib/supabase'
import { agregarItem, getCarrito, cambiarCantidad } from '@/lib/carrito'
import { toggleFavorito, esFavorito } from '@/lib/favoritos'
import { Producto } from '@/lib/types'
import {
  ArrowLeft, Heart, ShoppingCart, Plus, Minus,
  Package, Tag, Barcode, CheckCircle, Share2,
} from 'lucide-react'

function fmt(n: number) { return '$' + (n || 0).toFixed(2) }

const CAT_EMOJI: Record<string, string> = {
  'Escolar':'📚','Arte':'🎨','Oficina':'🖊️','Tecnologia':'💻','Juguetes':'🧸',
  'Manualidades':'✂️','Libros':'📖','Pintura':'🖌️','Papeleria':'📄',
  'Abarrotes':'🥬','Bebidas y Licores':'🥤','Congelados y Refrigerados':'❄️',
  'Golosinas y Snacks':'🍪','Panadería':'🍞','Cuidado Personal':'🧴',
  'Hogar y Limpieza':'🧹','Mascotas':'🐶','Huevos Lácteos y Leches':'🥛',
}

const CAT_BG: Record<string, string> = {
  'Escolar':'from-blue-50 to-blue-100','Arte':'from-purple-50 to-purple-100',
  'Oficina':'from-gray-50 to-gray-100','Tecnologia':'from-indigo-50 to-indigo-100',
  'Juguetes':'from-orange-50 to-orange-100','Manualidades':'from-pink-50 to-pink-100',
  'Libros':'from-amber-50 to-amber-100','Pintura':'from-red-50 to-red-100',
  'Abarrotes':'from-green-50 to-green-100','Bebidas y Licores':'from-sky-50 to-sky-100',
  'Congelados y Refrigerados':'from-cyan-50 to-cyan-100','Golosinas y Snacks':'from-amber-50 to-amber-100',
  'Panadería':'from-yellow-50 to-yellow-100','Cuidado Personal':'from-teal-50 to-teal-100',
  'Hogar y Limpieza':'from-emerald-50 to-emerald-100','Mascotas':'from-orange-50 to-orange-100',
  'Huevos Lácteos y Leches':'from-blue-50 to-blue-100',
}

function SkeletonProducto() {
  return (
    <div className="max-w-2xl mx-auto px-4 py-5 animate-pulse space-y-5">
      <div className="h-5 w-32 bg-gray-200 rounded" />
      <div className="bg-gray-100 rounded-2xl h-56" />
      <div className="space-y-3">
        <div className="h-4 bg-gray-200 rounded w-1/4" />
        <div className="h-6 bg-gray-200 rounded w-3/4" />
        <div className="h-4 bg-gray-200 rounded w-1/3" />
        <div className="h-8 bg-gray-200 rounded w-1/4" />
      </div>
      <div className="h-12 bg-gray-200 rounded-xl" />
    </div>
  )
}

function ImagenRelacionado({ src, categoria, alt }: { src?: string | null; categoria: string; alt: string }) {
  const [error, setError] = useState(false)
  const emoji = CAT_EMOJI[categoria] || '📦'

  if (!src || error) return <span className="text-3xl select-none">{emoji}</span>

  return (
    <img
      src={src}
      alt={alt}
      onError={() => setError(true)}
      className="w-full h-full object-contain p-2"
      loading="lazy"
    />
  )
}


export default function ProductoPage() {
  const { codigo } = useParams<{ codigo: string }>()
  const router = useRouter()
  const [prod, setProd]       = useState<Producto | null>(null)
  const [relacionados, setRelacionados] = useState<Producto[]>([])
  const [cargando, setCargando] = useState(true)
  const [cantidad, setCantidad] = useState(0)
  const [fav, setFav]         = useState(false)
  const [copiado, setCopiado] = useState(false)
  const [agregado, setAgregado] = useState(false)
  const [imageError, setImageError] = useState(false)

  useEffect(() => {
    async function cargar() {
      const { data } = await supabase
        .from('ol_productos')
        .select('*')
        .eq('codigo', decodeURIComponent(codigo))
        .single()
      if (!data) { setCargando(false); return }
      const p = data as Producto
      setProd(p)
      setFav(esFavorito(p.codigo))
      // Cantidad en carrito
      const enCarrito = getCarrito().find(i => i.codigo === p.codigo)
      if (enCarrito) setCantidad(enCarrito.cantidad)
      // Relacionados
      const { data: rel } = await supabase
        .from('ol_productos')
        .select('codigo,descripcion,categoria,subcategoria,marca,stock,stock_minimo,precio_publico,precio_con_iva,imagen_url')
        .eq('categoria', p.categoria)
        .neq('codigo', p.codigo)
        .gt('stock', 0)
        .limit(4)
      if (rel) {
        console.log("Relacionados cargados:", rel)
        setRelacionados(rel as Producto[])
      }
      setCargando(false)
    }
    cargar()
  }, [codigo])

  function agregar() {
    if (!prod) return
    agregarItem(prod)
    setCantidad(c => c + 1)
    setAgregado(true)
    setTimeout(() => setAgregado(false), 1500)
  }

  function cambiar(delta: number) {
    if (!prod) return
    const nueva = cantidad + delta
    cambiarCantidad(prod.codigo, nueva)
    setCantidad(Math.max(0, nueva))
  }

  function toggleFav() {
    if (!prod) return
    const ahora = toggleFavorito({ codigo: prod.codigo, descripcion: prod.descripcion, categoria: prod.categoria, precio_publico: prod.precio_publico })
    setFav(ahora)
  }

  function compartir() {
    navigator.clipboard.writeText(window.location.href)
    setCopiado(true)
    setTimeout(() => setCopiado(false), 2000)
  }

  if (cargando) return <SkeletonProducto />

  if (!prod) return (
    <div className="max-w-lg mx-auto px-4 py-16 text-center">
      <div className="text-5xl mb-3">🔍</div>
      <p className="text-gray-500 font-medium">Producto no encontrado</p>
      <button onClick={() => router.back()} className="mt-4 text-green-600 text-sm underline">← Volver</button>
    </div>
  )

  const agotado   = prod.stock <= 0
  const ultimas   = prod.stock > 0 && prod.stock < 5
  const gradient  = CAT_BG[prod.categoria] || 'from-gray-50 to-gray-100'
  const emoji     = CAT_EMOJI[prod.categoria] || '📦'

  return (
    <div className="max-w-2xl mx-auto px-4 py-5 space-y-6">
      {/* Back */}
      <button onClick={() => router.back()} className="flex items-center gap-1.5 text-sm text-gray-500 hover:text-gray-800 transition">
        <ArrowLeft size={16} /> Volver
      </button>

      {/* Imagen */}
      <div className={`bg-gradient-to-br ${gradient} rounded-2xl h-56 flex items-center justify-center relative overflow-hidden`}>
        {prod.imagen_url && !imageError ? (
          <img
            src={prod.imagen_url}
            alt={prod.descripcion}
            onError={() => setImageError(true)}
            className="w-full h-full object-contain p-4 animate-fade-in"
          />
        ) : (
          <span className="text-[90px] select-none">{emoji}</span>
        )}
        {agotado && (
          <div className="absolute inset-0 bg-white/70 flex items-center justify-center">
            <span className="text-sm font-bold text-red-500 bg-red-50 px-4 py-1.5 rounded-full border border-red-200">AGOTADO</span>
          </div>
        )}
        {ultimas && (
          <div className="absolute top-3 right-3 bg-orange-500 text-white text-xs font-bold px-2.5 py-1 rounded-full">
            ¡Últimas {prod.stock}!
          </div>
        )}
        {/* Acciones flotantes */}
        <div className="absolute top-3 left-3 flex gap-2">
          <button onClick={toggleFav}
            className={`w-9 h-9 rounded-full flex items-center justify-center shadow-md transition ${fav ? 'bg-red-500 text-white' : 'bg-white text-gray-400 hover:text-red-400'}`}>
            <Heart size={16} className={fav ? 'fill-white' : ''} />
          </button>
          <button onClick={compartir}
            className="w-9 h-9 bg-white rounded-full flex items-center justify-center shadow-md text-gray-400 hover:text-green-600 transition">
            {copiado ? <CheckCircle size={16} className="text-green-500" /> : <Share2 size={16} />}
          </button>
        </div>
      </div>

      {/* Info principal */}
      <div className="space-y-2">
        <div className="flex items-center gap-2 flex-wrap">
          <span className="text-xs font-semibold text-green-700 bg-green-50 px-2.5 py-1 rounded-full border border-green-200">
            {CAT_EMOJI[prod.categoria]} {prod.categoria}
          </span>
          {prod.subcategoria && (
            <span className="text-xs text-gray-500 bg-gray-100 px-2.5 py-1 rounded-full">{prod.subcategoria}</span>
          )}
        </div>

        <h1 className="text-xl font-bold text-gray-900 leading-snug">{prod.descripcion}</h1>

        {prod.marca && (
          <p className="text-sm text-gray-500 flex items-center gap-1.5">
            <Tag size={13} /> {prod.marca}
          </p>
        )}

        <div className="flex items-end gap-3 pt-1">
          <span className="text-3xl font-extrabold text-gray-900">{fmt(prod.precio_publico)}</span>
          {prod.precio_con_iva !== prod.precio_publico && prod.precio_con_iva > 0 && (
            <span className="text-sm text-gray-400 line-through mb-1">{fmt(prod.precio_con_iva)}</span>
          )}
        </div>

        {/* Stock */}
        <div className={`flex items-center gap-1.5 text-xs font-medium ${agotado ? 'text-red-500' : ultimas ? 'text-orange-500' : 'text-green-600'}`}>
          <Package size={13} />
          {agotado ? 'Sin stock disponible' : ultimas ? `Solo quedan ${prod.stock} unidades` : `${prod.stock} unidades disponibles`}
        </div>

        {/* Código */}
        <div className="flex items-center gap-1.5 text-xs text-gray-400">
          <Barcode size={13} /> Código: {prod.codigo}
        </div>
      </div>

      {/* Botón agregar / contador */}
      {!agotado && (
        <div className="space-y-3">
          {cantidad === 0 ? (
            <button onClick={agregar}
              className={`w-full flex items-center justify-center gap-2 py-3.5 rounded-2xl font-bold text-sm transition ${
                agregado ? 'bg-green-500 text-white' : 'bg-green-600 hover:bg-green-700 text-white'
              }`}>
              <ShoppingCart size={18} />
              {agregado ? '¡Agregado al carrito!' : 'Agregar al carrito'}
            </button>
          ) : (
            <div className="flex items-center gap-4">
              <div className="flex items-center bg-green-600 rounded-2xl overflow-hidden">
                <button onClick={() => cambiar(-1)} className="px-5 py-3.5 text-white hover:bg-green-700 transition">
                  <Minus size={16} />
                </button>
                <span className="text-white font-bold text-lg px-3 min-w-[2.5rem] text-center">{cantidad}</span>
                <button onClick={() => cambiar(+1)} className="px-5 py-3.5 text-white hover:bg-green-700 transition">
                  <Plus size={16} />
                </button>
              </div>
              <span className="text-sm text-gray-500">en tu carrito</span>
            </div>
          )}
          <p className="text-xs text-center text-gray-400">
            Al confirmar te contactaremos por WhatsApp para coordinar la entrega.
          </p>
        </div>
      )}

      {/* Relacionados */}
      {relacionados.length > 0 && (
        <section className="pt-2">
          <h2 className="text-base font-bold text-gray-800 mb-3">Más de {prod.categoria}</h2>
          <div className="grid grid-cols-2 gap-3">
            {relacionados.map(r => (
              <a key={r.codigo} href={`/producto/${encodeURIComponent(r.codigo)}`}
                className="bg-white border border-gray-100 rounded-2xl p-3 shadow-sm hover:shadow-md transition flex flex-col">
                <div className={`bg-gradient-to-br ${CAT_BG[r.categoria] || 'from-gray-50 to-gray-100'} rounded-xl h-20 flex items-center justify-center mb-2 overflow-hidden`}>
                  <ImagenRelacionado src={r.imagen_url} categoria={r.categoria} alt={r.descripcion} />
                </div>
                <div className="text-xs font-medium text-gray-700 line-clamp-2 flex-1">{r.descripcion}</div>
                <div className="text-sm font-bold text-gray-900 mt-1.5">{fmt(r.precio_publico)}</div>
              </a>
            ))}
          </div>
        </section>
      )}
    </div>
  )
}

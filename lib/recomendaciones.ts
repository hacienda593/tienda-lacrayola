'use client'
import { supabase } from './supabase'
import { Producto } from './types'

const KEY_RECOMENDACIONES = 'lc_perfil_intereses'
const FACTOR_DECAIMIENTO = 0.8 // Se reduce un 20% en cada sesión nueva o decaimiento

export interface PerfilIntereses {
  categorias: Record<string, number>
  subcategorias: Record<string, number>
  ultimosVistos: string[]
  ultimaVisita: string // Fecha ISO
}

// Obtener el perfil de intereses guardado
export function getPerfilIntereses(): PerfilIntereses {
  if (typeof window === 'undefined') {
    return { categorias: {}, subcategorias: {}, ultimosVistos: [], ultimaVisita: new Date().toISOString() }
  }
  try {
    const raw = localStorage.getItem(KEY_RECOMENDACIONES)
    if (!raw) return { categorias: {}, subcategorias: {}, ultimosVistos: [], ultimaVisita: new Date().toISOString() }
    return JSON.parse(raw)
  } catch {
    return { categorias: {}, subcategorias: {}, ultimosVistos: [], ultimaVisita: new Date().toISOString() }
  }
}

// Guardar el perfil de intereses
export function guardarPerfilIntereses(perfil: PerfilIntereses) {
  if (typeof window !== 'undefined') {
    localStorage.setItem(KEY_RECOMENDACIONES, JSON.stringify(perfil))
  }
}

// Trackear una acción del usuario (Ver producto, Favoritos, Carrito, etc.)
// - Ver producto: peso = 1
// - Favoritos: peso = 3
// - Agregar al carrito: peso = 5
export function trackearAccion(categoria: string, subcategoria: string | undefined, peso: number, codigoProducto?: string) {
  if (!categoria) return
  const perfil = getPerfilIntereses()

  // 1. Sumar puntos a la categoría
  perfil.categorias[categoria] = (perfil.categorias[categoria] || 0) + peso

  // 2. Sumar puntos a la subcategoría
  if (subcategoria) {
    perfil.subcategorias[subcategoria] = (perfil.subcategorias[subcategoria] || 0) + peso
  }

  // 3. Registrar en últimos vistos
  if (codigoProducto) {
    // Eliminar si ya existía para mandarlo al inicio
    perfil.ultimosVistos = perfil.ultimosVistos.filter(c => c !== codigoProducto)
    perfil.ultimosVistos.unshift(codigoProducto)
    // Mantener máximo 10 ítems
    perfil.ultimosVistos = perfil.ultimosVistos.slice(0, 10)
  }

  perfil.ultimaVisita = new Date().toISOString()
  guardarPerfilIntereses(perfil)
  // Despachar evento para sincronizar interfaces en tiempo real si es necesario
  window.dispatchEvent(new Event('recomendaciones-update'))
}

// Decaer intereses (Envejecimiento de la data para dar paso a lo nuevo)
export function decaerIntereses() {
  const perfil = getPerfilIntereses()
  
  // Multiplicar todas las puntuaciones por el factor de decaimiento
  Object.keys(perfil.categorias).forEach(cat => {
    perfil.categorias[cat] = parseFloat((perfil.categorias[cat] * FACTOR_DECAIMIENTO).toFixed(2))
    if (perfil.categorias[cat] < 0.1) delete perfil.categorias[cat]
  })

  Object.keys(perfil.subcategorias).forEach(sub => {
    perfil.subcategorias[sub] = parseFloat((perfil.subcategorias[sub] * FACTOR_DECAIMIENTO).toFixed(2))
    if (perfil.subcategorias[sub] < 0.1) delete perfil.subcategorias[sub]
  })

  guardarPerfilIntereses(perfil)
}

// Verificar si es hora de almuerzo (11:30 AM a 3:00 PM) para forzar recomendaciones de comida
export function esHoraDeAlmuerzo(): boolean {
  if (typeof window === 'undefined') return false
  const ahora = new Date()
  const hora = ahora.getHours()
  const minutos = ahora.getMinutes()
  const horaDecimal = hora + minutos / 60
  return horaDecimal >= 11.5 && horaDecimal <= 15.0
}

// Obtener la categoría favorita basada en el perfil y contexto horario
export function obtenerCategoriaFavorita(): string | null {
  // Si es hora de almuerzo, se prioriza comida / almuerzos automáticamente
  if (esHoraDeAlmuerzo()) {
    return 'Alimentos' // Nombre exacto de tu pasillo de alimentos/comida
  }

  const perfil = getPerfilIntereses()
  let maxScore = 0
  let topCat: string | null = null

  Object.entries(perfil.categorias).forEach(([cat, score]) => {
    if (score > maxScore) {
      maxScore = score
      topCat = cat
    }
  })

  return topCat
}

// Obtener los productos recomendados llamando a Supabase
export async function obtenerProductosRecomendados(tiendaId?: string, limit: number = 6): Promise<Producto[]> {
  const catFavorita = obtenerCategoriaFavorita()
  
  let query = supabase
    .from('ol_productos')
    .select('codigo,descripcion,categoria,subcategoria,marca,stock,stock_minimo,precio_publico,precio_con_iva,tienda_id,imagen_url,detalles')
    .gt('stock', 0)
    .limit(limit)

  if (catFavorita) {
    query = query.eq('categoria', catFavorita)
  }

  if (tiendaId) {
    query = query.eq('tienda_id', tiendaId)
  }

  const { data } = await query
  return (data as Producto[]) || []
}

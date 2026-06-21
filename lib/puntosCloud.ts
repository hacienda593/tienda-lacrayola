// Puntos de fidelización en Supabase — solo para usuarios registrados
import { supabase } from './supabase'

export interface EstadoPuntosCloud {
  total:       number
  disponibles: number
  canjeados:   number
  nivel:       'Bronce' | 'Plata' | 'Oro' | 'Platino'
}

function calcularNivel(total: number): EstadoPuntosCloud['nivel'] {
  if (total >= 2000) return 'Platino'
  if (total >= 800)  return 'Oro'
  if (total >= 300)  return 'Plata'
  return 'Bronce'
}

export async function getPuntosCloud(userId: string): Promise<EstadoPuntosCloud> {
  const { data } = await supabase
    .from('ol_puntos')
    .select('*')
    .eq('user_id', userId)
    .single()

  if (!data) return { total: 0, disponibles: 0, canjeados: 0, nivel: 'Bronce' }
  return { ...data, nivel: calcularNivel(data.total) }
}

export async function sumarPuntosCloud(userId: string, totalCompra: number): Promise<number> {
  const ganados = Math.floor(totalCompra)
  const actual  = await getPuntosCloud(userId)

  await supabase.from('ol_puntos').upsert({
    user_id:     userId,
    total:       actual.total + ganados,
    disponibles: actual.disponibles + ganados,
    canjeados:   actual.canjeados,
    updated_at:  new Date().toISOString(),
  })

  return ganados
}

export async function sincronizarPuntosLocales(userId: string, totalPuntosLocales: number): Promise<void> {
  if (totalPuntosLocales <= 0) return
  const actual = await getPuntosCloud(userId)
  await supabase.from('ol_puntos').upsert({
    user_id:     userId,
    total:       actual.total + totalPuntosLocales,
    disponibles: actual.disponibles + totalPuntosLocales,
    canjeados:   actual.canjeados,
    updated_at:  new Date().toISOString(),
  })
}

export async function agregarPuntosFijosCloud(userId: string, cantidad: number): Promise<number> {
  const actual = await getPuntosCloud(userId)
  await supabase.from('ol_puntos').upsert({
    user_id:     userId,
    total:       actual.total + cantidad,
    disponibles: actual.disponibles + cantidad,
    canjeados:   actual.canjeados,
    updated_at:  new Date().toISOString(),
  })
  return cantidad
}



export function progresoNivel(total: number) {
  if (total < 300)  return { siguiente: 'Plata',   faltan: 300  - total, porcentaje: (total / 300)  * 100 }
  if (total < 800)  return { siguiente: 'Oro',     faltan: 800  - total, porcentaje: ((total - 300) / 500) * 100 }
  if (total < 2000) return { siguiente: 'Platino', faltan: 2000 - total, porcentaje: ((total - 800) / 1200) * 100 }
  return { siguiente: '—', faltan: 0, porcentaje: 100 }
}

export const BADGE_NIVEL: Record<EstadoPuntosCloud['nivel'], string> = {
  Bronce:  'bg-amber-100 text-amber-800',
  Plata:   'bg-gray-100 text-gray-600',
  Oro:     'bg-yellow-100 text-yellow-800',
  Platino: 'bg-cyan-100 text-cyan-800',
}

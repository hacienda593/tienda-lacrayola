'use client'
// Sistema de puntos de fidelización — 1 punto por cada $1 gastado
// 100 puntos = $1 de descuento (solo informativo por ahora, sin login)

const KEY = 'lc_puntos'

export interface EstadoPuntos {
  total: number        // Puntos acumulados históricos
  disponibles: number  // Puntos sin canjear
  canjeados: number    // Puntos ya usados
  nivel: 'Bronce' | 'Plata' | 'Oro' | 'Platino'
}

function calcularNivel(total: number): EstadoPuntos['nivel'] {
  if (total >= 2000) return 'Platino'
  if (total >= 800)  return 'Oro'
  if (total >= 300)  return 'Plata'
  return 'Bronce'
}

export function getPuntos(): EstadoPuntos {
  if (typeof window === 'undefined') {
    return { total: 0, disponibles: 0, canjeados: 0, nivel: 'Bronce' }
  }
  try {
    const raw = JSON.parse(localStorage.getItem(KEY) || 'null')
    if (!raw) return { total: 0, disponibles: 0, canjeados: 0, nivel: 'Bronce' }
    return { ...raw, nivel: calcularNivel(raw.total) }
  } catch {
    return { total: 0, disponibles: 0, canjeados: 0, nivel: 'Bronce' }
  }
}

export function sumarPuntos(totalCompra: number) {
  const ganados = Math.floor(totalCompra) // 1 punto por $1
  const actual  = getPuntos()
  const nuevo: EstadoPuntos = {
    total:       actual.total + ganados,
    disponibles: actual.disponibles + ganados,
    canjeados:   actual.canjeados,
    nivel:       calcularNivel(actual.total + ganados),
  }
  localStorage.setItem(KEY, JSON.stringify(nuevo))
  window.dispatchEvent(new Event('puntos-update'))
  return ganados
}

// Próximo nivel y cuántos puntos faltan
export function progresoNivel(total: number): { siguiente: string; faltan: number; porcentaje: number } {
  if (total < 300)  return { siguiente: 'Plata',   faltan: 300  - total, porcentaje: (total / 300)  * 100 }
  if (total < 800)  return { siguiente: 'Oro',     faltan: 800  - total, porcentaje: ((total - 300) / 500) * 100 }
  if (total < 2000) return { siguiente: 'Platino', faltan: 2000 - total, porcentaje: ((total - 800) / 1200) * 100 }
  return { siguiente: '—', faltan: 0, porcentaje: 100 }
}

export const COLORES_NIVEL: Record<EstadoPuntos['nivel'], string> = {
  Bronce:  'text-amber-700',
  Plata:   'text-gray-400',
  Oro:     'text-yellow-400',
  Platino: 'text-cyan-300',
}

export const BG_NIVEL: Record<EstadoPuntos['nivel'], string> = {
  Bronce:  'bg-amber-100 text-amber-800',
  Plata:   'bg-gray-100 text-gray-600',
  Oro:     'bg-yellow-100 text-yellow-800',
  Platino: 'bg-cyan-100 text-cyan-800',
}

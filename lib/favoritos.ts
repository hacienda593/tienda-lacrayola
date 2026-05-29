'use client'

export interface ItemFavorito {
  codigo: string
  descripcion: string
  categoria: string
  precio_unitario: number
  agregadoEn: string // ISO date
}

const KEY = 'lc_favoritos'

export function getFavoritos(): ItemFavorito[] {
  if (typeof window === 'undefined') return []
  try { return JSON.parse(localStorage.getItem(KEY) || '[]') } catch { return [] }
}

function setFavoritos(items: ItemFavorito[]) {
  localStorage.setItem(KEY, JSON.stringify(items))
  window.dispatchEvent(new Event('favoritos-update'))
}

export function esFavorito(codigo: string): boolean {
  return getFavoritos().some(f => f.codigo === codigo)
}

export function toggleFavorito(prod: { codigo: string; descripcion: string; categoria: string; precio_publico: number }): boolean {
  const lista = getFavoritos()
  const idx   = lista.findIndex(f => f.codigo === prod.codigo)
  if (idx >= 0) {
    setFavoritos(lista.filter(f => f.codigo !== prod.codigo))
    return false // removido
  } else {
    setFavoritos([{ codigo: prod.codigo, descripcion: prod.descripcion, categoria: prod.categoria, precio_unitario: prod.precio_publico, agregadoEn: new Date().toISOString() }, ...lista])
    return true // agregado
  }
}

// Serializa IDs para compartir por URL
export function serializarFavoritos(): string {
  return getFavoritos().map(f => f.codigo).join(',')
}

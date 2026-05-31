'use client'
// Carrito 100% client-side en localStorage — sin servidor, sin auth requerida
// Al hacer checkout se persiste en Supabase ol_pedidos

import { ItemCarrito } from './types'

const KEY = 'lc_carrito'

export function getCarrito(): ItemCarrito[] {
  if (typeof window === 'undefined') return []
  try { return JSON.parse(localStorage.getItem(KEY) || '[]') } catch { return [] }
}

export function setCarrito(items: ItemCarrito[]) {
  localStorage.setItem(KEY, JSON.stringify(items))
  window.dispatchEvent(new Event('carrito-update'))
}

export function agregarItem(
  prod: { 
    codigo: string; 
    descripcion: string; 
    categoria: string; 
    precio_publico: number; 
    tienda_id?: string | null; 
    tienda_nombre?: string | null 
  }, 
  cant = 1
) {
  const items = getCarrito()
  const idx = items.findIndex(i => i.codigo === prod.codigo)
  if (idx >= 0) {
    items[idx].cantidad += cant
  } else {
    items.push({ 
      codigo: prod.codigo, 
      descripcion: prod.descripcion, 
      categoria: prod.categoria, 
      precio_unitario: prod.precio_publico, 
      cantidad: cant,
      tienda_id: prod.tienda_id ?? null,
      tienda_nombre: prod.tienda_nombre ?? null
    })
  }
  setCarrito(items)
}

export function cambiarCantidad(codigo: string, cantidad: number) {
  const items = getCarrito()
  if (cantidad <= 0) {
    setCarrito(items.filter(i => i.codigo !== codigo))
  } else {
    const idx = items.findIndex(i => i.codigo === codigo)
    if (idx >= 0) { items[idx].cantidad = cantidad; setCarrito(items) }
  }
}

export function vaciarCarrito() { setCarrito([]) }

export function totalCarrito(items: ItemCarrito[]) {
  return items.reduce((s, i) => s + i.precio_unitario * i.cantidad, 0)
}

export function obtenerTiendasUnicas(items: ItemCarrito[]): string[] {
  const set = new Set<string>()
  items.forEach(i => {
    if (i.tienda_id) set.add(i.tienda_id)
  })
  return Array.from(set)
}

export function calcularEnvioConsolidado(items: ItemCarrito[]): number {
  if (items.length === 0) return 0
  const tiendas = obtenerTiendasUnicas(items)
  const nTiendas = tiendas.length || 1 // Si no hay tienda_id, asumimos 1 (inventario propio)
  return 1.50 + (nTiendas - 1) * 0.75
}

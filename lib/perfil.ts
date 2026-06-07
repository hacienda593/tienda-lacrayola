'use client'
// Datos del cliente guardados localmente para pre-rellenar el checkout

export interface PerfilCliente {
  nombre: string
  email: string
  telefono: string
  direccion: string
  ciudad: string
  referencias: string
  identificacion?: string
  razonSocial?: string
  correoFactura?: string
}

export interface PedidoLocal {
  id: string          // UUID de Supabase
  numero: number
  fecha: string       // ISO string
  total: number
  estado: string
  items: { codigo: string; descripcion: string; cantidad: number; precio_unitario: number }[]
}

const KEY_PERFIL   = 'lc_perfil'
const KEY_PEDIDOS  = 'lc_pedidos_local'

export function getPerfil(): PerfilCliente | null {
  if (typeof window === 'undefined') return null
  try { return JSON.parse(localStorage.getItem(KEY_PERFIL) || 'null') } catch { return null }
}

export function guardarPerfil(p: PerfilCliente) {
  localStorage.setItem(KEY_PERFIL, JSON.stringify(p))
}

export function getPedidosLocales(): PedidoLocal[] {
  if (typeof window === 'undefined') return []
  try { return JSON.parse(localStorage.getItem(KEY_PEDIDOS) || '[]') } catch { return [] }
}

export function guardarPedidoLocal(p: PedidoLocal) {
  const lista = getPedidosLocales()
  // Reemplazar si ya existe, sino agregar al inicio
  const idx = lista.findIndex(x => x.id === p.id)
  if (idx >= 0) lista[idx] = p
  else lista.unshift(p)
  // Guardar máximo 50 pedidos
  localStorage.setItem(KEY_PEDIDOS, JSON.stringify(lista.slice(0, 50)))
}

export function actualizarEstadoPedidoLocal(id: string, estado: string) {
  const lista = getPedidosLocales()
  const idx = lista.findIndex(x => x.id === id)
  if (idx >= 0) {
    lista[idx].estado = estado
    localStorage.setItem(KEY_PEDIDOS, JSON.stringify(lista))
  }
}

export interface Producto {
  codigo: string
  descripcion: string
  categoria: string
  subcategoria: string
  marca: string
  stock: number
  stock_minimo: number
  precio_publico: number
  precio_con_iva: number
}

export interface ItemCarrito {
  codigo: string
  descripcion: string
  categoria: string
  precio_unitario: number
  cantidad: number
}

export interface Pedido {
  id: string
  numero: number
  nombre_cliente: string
  email_cliente: string
  telefono: string
  direccion: string
  ciudad: string
  referencias: string
  notas: string
  estado: string
  total: number
  total_items: number
  created_at: string
}

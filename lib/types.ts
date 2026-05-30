export interface Producto {
  codigo:        string
  descripcion:   string
  categoria:     string
  subcategoria:  string
  marca:         string
  stock:         number
  stock_minimo:  number
  precio_publico: number
  precio_con_iva: number
  tienda_id?:    string | null
  tienda?:       OlTienda
}

export interface OlTienda {
  id:          string
  nombre:      string
  descripcion: string | null
  logo_url:    string | null
  categoria:   string | null  // 'supermercado' | 'farmacia' | 'libreria' | 'abarrotes'
  direccion:   string | null
  activa:      boolean
  orden:       number
}

export interface ItemCarrito {
  codigo:          string
  descripcion:     string
  categoria:       string
  precio_unitario: number
  cantidad:        number
  tienda_id?:      string | null
  tienda_nombre?:  string | null
}

export interface Pedido {
  id:             string
  numero:         number
  nombre_cliente: string
  email_cliente:  string
  telefono:       string
  direccion:      string
  ciudad:         string
  referencias:    string
  notas:          string
  estado:         string
  total:          number
  total_items:    number
  created_at:     string
}

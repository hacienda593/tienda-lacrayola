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
  imagen_url?:   string | null
  detalles?:     string | null
  en_oferta?:    boolean
  precio_oferta?: number | null
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

export const CAT_EMOJI: Record<string, string> = {
  'Escolar': '📚',
  'Arte': '🎨',
  'Oficina': '🖊️',
  'Tecnologia': '💻',
  'Juguetes': '🧸',
  'Manualidades': '✂️',
  'Libros': '📖',
  'Pintura': '🖌️',
  'Papeleria': '📄',
  'Alimentos': '🥦',
  'Bebidas': '🥤',
  'Limpieza': '🧹',
  'Higiene': '🧴',
  'Farmacia': '💊',
  'Electronicos': '💡',
  'Ropa': '👕',
  'Abarrotes': '🥬',
  'Bebidas y Licores': '🥤',
  'Congelados y Refrigerados': '❄️',
  'Golosinas y Snacks': '🍪',
  'Panadería': '🍞',
  'Cuidado Personal': '🧴',
  'Hogar y Limpieza': '🧹',
  'Mascotas': '🐶',
  'Huevos Lácteos y Leches': '🥛',
  
  // Variaciones de nombres de categorías en base de datos de Supermercados
  'Lácteos': '🥛',
  'Aguas y bebidas': '🥤',
  'Snacks y golosinas': '🍪',
  'Snacks y Golosinas': '🍪',
  'Cuidado corporal': '🧴',
  'Cuidado corporal y facial': '🧴',
  'Cuidado capilar': '🧴',
  'Limpieza para el hogar': '🧹',
  'Limpieza para el Hogar': '🧹',
  'Carnes y embutidos': '🥩',
  'Carnes': '🥩',
  'Frutas y verduras': '🍎',
  'Panadería y pastelería': '🍞',
  'Desayunos': '🍳',
  'Congelados': '❄️',
}

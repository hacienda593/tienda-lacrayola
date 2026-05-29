'use server'
import { createClient } from '@supabase/supabase-js'

const supabaseServer = createClient(
  process.env.NEXT_PUBLIC_SUPABASE_URL!,
  process.env.SUPABASE_SERVICE_ROLE_KEY ?? process.env.NEXT_PUBLIC_SUPABASE_ANON_KEY!
)

export interface LineaCarrito {
  codigo: string
  cantidad: number
}

export interface DatosCliente {
  nombre: string
  email: string
  telefono: string
  direccion: string
  ciudad: string
  referencias: string
  notas: string
  geo_lat?: number | null
  geo_lng?: number | null
}

export interface ResultadoPedido {
  ok: boolean
  pedidoId?: string
  numeroPedido?: number
  error?: string
}

export async function crearPedido(
  cliente: DatosCliente,
  lineas: LineaCarrito[]
): Promise<ResultadoPedido> {
  if (!cliente.nombre.trim() || !cliente.telefono.trim()) {
    return { ok: false, error: 'Nombre y teléfono son obligatorios' }
  }
  if (lineas.length === 0) {
    return { ok: false, error: 'El carrito está vacío' }
  }

  // Consultar precios reales desde la base de datos
  const codigos = lineas.map(l => l.codigo)
  const { data: productos, error: errP } = await supabaseServer
    .from('ol_productos')
    .select('codigo, precio_con_iva, stock')
    .in('codigo', codigos)

  if (errP || !productos) {
    return { ok: false, error: 'Error al verificar productos' }
  }

  // Verificar que todos los productos existen y tienen stock
  const mapaProductos = new Map(productos.map(p => [p.codigo, p]))
  for (const linea of lineas) {
    const prod = mapaProductos.get(linea.codigo)
    if (!prod) return { ok: false, error: `Producto ${linea.codigo} no encontrado` }
    if (prod.stock < linea.cantidad) {
      return { ok: false, error: `Stock insuficiente para el producto ${linea.codigo}` }
    }
  }

  // Calcular total con precios del servidor
  const items = lineas.map(linea => {
    const prod = mapaProductos.get(linea.codigo)!
    return {
      codigo: linea.codigo,
      cantidad: linea.cantidad,
      precio_unitario: prod.precio_con_iva,
    }
  })
  const total = items.reduce((s, i) => s + i.precio_unitario * i.cantidad, 0)
  const total_items = items.reduce((s, i) => s + i.cantidad, 0)

  // Insertar pedido
  const { data: pedido, error: errPed } = await supabaseServer
    .from('ol_pedidos')
    .insert({
      nombre_cliente: cliente.nombre.trim(),
      email_cliente:  cliente.email.trim() || null,
      telefono:       cliente.telefono.trim(),
      direccion:      cliente.direccion.trim() || null,
      ciudad:         cliente.ciudad.trim(),
      referencias:    cliente.referencias.trim() || null,
      notas:          cliente.notas.trim() || null,
      geo_lat:        cliente.geo_lat ?? null,
      geo_lng:        cliente.geo_lng ?? null,
      total,
      total_items,
      estado: 'pendiente',
    })
    .select('id, numero')
    .single()

  if (errPed || !pedido) {
    return { ok: false, error: errPed?.message || 'Error al crear pedido' }
  }

  // Insertar items con descripcion y categoria para historial
  const { data: productosDetalle } = await supabaseServer
    .from('ol_productos')
    .select('codigo, descripcion, categoria')
    .in('codigo', codigos)

  const mapaDetalle = new Map((productosDetalle ?? []).map(p => [p.codigo, p]))

  const { error: errItems } = await supabaseServer.from('ol_pedido_items').insert(
    items.map(i => ({
      pedido_id:       pedido.id,
      codigo:          i.codigo,
      descripcion:     mapaDetalle.get(i.codigo)?.descripcion ?? i.codigo,
      categoria:       mapaDetalle.get(i.codigo)?.categoria ?? '',
      precio_unitario: i.precio_unitario,
      cantidad:        i.cantidad,
    }))
  )

  if (errItems) {
    return { ok: false, error: errItems.message }
  }

  return { ok: true, pedidoId: pedido.id, numeroPedido: pedido.numero }
}

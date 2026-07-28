'use server'
import { createClient } from '@supabase/supabase-js'

const supabaseServer = createClient(
  process.env.NEXT_PUBLIC_SUPABASE_URL!,
  process.env.SUPABASE_SERVICE_ROLE_KEY ?? process.env.NEXT_PUBLIC_SUPABASE_ANON_KEY!
)

export interface LineaCarrito {
  codigo: string
  cantidad: number
  precio_unitario?: number
  descripcion?: string
  categoria?: string
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
  user_id?: string | null
  referencia_transferencia?: string | null
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

  // Consultar precios reales desde la base de datos (excluyendo items de impresión)
  const codigos = lineas.map(l => l.codigo)
  const codigosFiltrados = codigos.filter(c => !c.startsWith('IMP-'))
  
  let productos: any[] = []
  if (codigosFiltrados.length > 0) {
    const { data: prods, error: errP } = await supabaseServer
      .from('ol_productos')
      .select('codigo, precio_con_iva, stock, iva_codigo, iva_porcentaje')
      .in('codigo', codigosFiltrados)

    if (errP || !prods) {
      return { ok: false, error: 'Error al verificar productos' }
    }
    productos = prods
  }

  // Verificar que todos los productos existen y tienen stock
  const mapaProductos = new Map(productos.map(p => [p.codigo, p]))
  for (const linea of lineas) {
    if (linea.codigo.startsWith('IMP-')) {
      continue // Bypass para items de impresión
    }
    const prod = mapaProductos.get(linea.codigo)
    if (!prod) return { ok: false, error: `Producto ${linea.codigo} no encontrado` }
    if (prod.stock < linea.cantidad) {
      return { ok: false, error: `Stock insuficiente para el producto ${linea.codigo}` }
    }
  }

  // Calcular total con precios del servidor
  const items = lineas.map(linea => {
    if (linea.codigo.startsWith('IMP-')) {
      return {
        codigo: linea.codigo,
        cantidad: linea.cantidad,
        precio_unitario: linea.precio_unitario ?? 0.25,
        iva_codigo: null as string | null,
        iva_porcentaje: null as number | null,
      }
    }
    const prod = mapaProductos.get(linea.codigo)!
    return {
      codigo: linea.codigo,
      cantidad: linea.cantidad,
      precio_unitario: prod.precio_con_iva,
      iva_codigo: prod.iva_codigo ?? null,
      iva_porcentaje: prod.iva_porcentaje ?? null,
    }
  })
  const total = items.reduce((s, i) => s + i.precio_unitario * i.cantidad, 0)
  const total_items = items.reduce((s, i) => s + i.cantidad, 0)

  // Prevenir fraudes: Validar si el comprobante ya existe en otro pedido activo/creado
  if (cliente.referencia_transferencia) {
    const refLimpia = cliente.referencia_transferencia.trim()
    const { data: dup } = await supabaseServer
      .from('ol_pedidos')
      .select('numero')
      .eq('referencia_transferencia', refLimpia)
      .limit(1)
    
    if (dup && dup.length > 0) {
      return { ok: false, error: `El comprobante de transferencia ya fue registrado en el pedido #${dup[0].numero}. Ingresa la referencia correcta.` }
    }
  }

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
      user_id:        cliente.user_id ?? null,
      total,
      total_items,
      estado: 'pendiente',
      referencia_transferencia: cliente.referencia_transferencia ? cliente.referencia_transferencia.trim() : null
    })
    .select('id, numero')
    .single()

  if (errPed || !pedido) {
    return { ok: false, error: errPed?.message || 'Error al crear pedido' }
  }

  // Sincronizar dirección y coordenadas con el directorio rep_clientes_direcciones
  if (cliente.geo_lat && cliente.geo_lng && cliente.telefono) {
    try {
      const cleanAddress = (s: string) => s.toLowerCase().replace(/[^a-z0-9]/g, '')
      const sonDireccionesSimilaresAction = (dir1: string, dir2: string) => {
        if (!dir1 || !dir2) return false
        const c1 = cleanAddress(dir1)
        const c2 = cleanAddress(dir2)
        if (c1 === c2) return true
        if (c1.length > 8 && c2.length > 8 && (c1.includes(c2) || c2.includes(c1))) return true
        
        const palabras1 = dir1.toLowerCase().replace(/[^a-z0-9\s]/g, '').split(/\s+/).filter(w => w.length > 3)
        const palabras2 = dir2.toLowerCase().replace(/[^a-z0-9\s]/g, '').split(/\s+/).filter(w => w.length > 3)
        if (palabras1.length === 0 || palabras2.length === 0) return false
        const coincidentes = palabras1.filter(p => palabras2.includes(p))
        const ratio = coincidentes.length / Math.min(palabras1.length, palabras2.length)
        return ratio >= 0.5
      }

      const tel = cliente.telefono.trim()
      const { data: extDir } = await supabaseServer
        .from('rep_clientes_direcciones')
        .select('id, direccion')
        .eq('telefono', tel)

      const matchDir = (extDir ?? []).find((d: any) => sonDireccionesSimilaresAction(d.direccion, cliente.direccion))

      if (matchDir) {
        await supabaseServer.from('rep_clientes_direcciones')
          .update({
            geo_lat: cliente.geo_lat,
            geo_lng: cliente.geo_lng,
            verificada: true,
            updated_at: new Date().toISOString()
          })
          .eq('id', matchDir.id)
      } else {
        await supabaseServer.from('rep_clientes_direcciones')
          .insert({
            telefono: tel,
            nombre_direccion: cliente.direccion ? cliente.direccion.trim().slice(0, 15) : 'Nueva Dirección',
            direccion: cliente.direccion.trim(),
            ciudad: cliente.ciudad.trim(),
            referencias: cliente.referencias.trim() || '',
            geo_lat: cliente.geo_lat,
            geo_lng: cliente.geo_lng,
            verificada: true
          })
      }
    } catch (e) {
      console.error('Error al sincronizar rep_clientes_direcciones en checkout:', e)
    }
  }

  // Insertar items con descripcion, categoria y tienda para historial
  const { data: productosDetalle } = await supabaseServer
    .from('ol_productos')
    .select('codigo, descripcion, categoria, tienda_id, tienda_nombre')
    .in('codigo', codigos)

  const mapaDetalle = new Map((productosDetalle ?? []).map(p => [p.codigo, p]))

  const { error: errItems } = await supabaseServer.from('ol_pedido_items').insert(
    items.map(i => {
      const orig = lineas.find(l => l.codigo === i.codigo)
      return {
        pedido_id:       pedido.id,
        codigo:          i.codigo,
        descripcion:     orig?.descripcion || mapaDetalle.get(i.codigo)?.descripcion || i.codigo,
        categoria:       orig?.categoria || mapaDetalle.get(i.codigo)?.categoria || '',
        precio_unitario: i.precio_unitario,
        cantidad:        i.cantidad,
        iva_codigo:      i.iva_codigo,
        iva_porcentaje:  i.iva_porcentaje,
      }
    })
  )

  if (errItems) {
    return { ok: false, error: errItems.message }
  }

  // Crear lista de picking agrupada por tienda
  const pickingItems = items
    .map(i => {
      const det = mapaDetalle.get(i.codigo)
      return {
        pedido_id:    pedido.id,
        tienda_id:    det?.tienda_id ?? null,
        descripcion:  det?.descripcion ?? i.codigo,
        cantidad:     i.cantidad,
        precio_ref:   i.precio_unitario,
        estado:       'pendiente',
      }
    })
    .filter(i => i.tienda_id) // solo items con tienda asignada

  if (pickingItems.length > 0) {
    await supabaseServer.from('rep_picking').insert(pickingItems)
  }

  // Registrar/Actualizar productos frecuentes
  try {
    const userId = cliente.user_id ?? null
    const telefono = cliente.telefono.trim()

    let queryFrecuentes = supabaseServer
      .from('ol_productos_frecuentes')
      .select('id, producto_codigo, veces_comprado')

    if (userId) {
      queryFrecuentes = queryFrecuentes.or(`user_id.eq.${userId},telefono.eq.${telefono}`)
    } else {
      queryFrecuentes = queryFrecuentes.eq('telefono', telefono)
    }

    const { data: existentes } = await queryFrecuentes.in('producto_codigo', codigos)
    const mapExistentes = new Map((existentes ?? []).map(r => [r.producto_codigo, r]))

    const upsertPayload = items.map(item => {
      const exist = mapExistentes.get(item.codigo)
      return {
        ...(exist ? { id: exist.id } : {}),
        user_id: userId,
        telefono: telefono,
        producto_codigo: item.codigo,
        veces_comprado: (exist?.veces_comprado ?? 0) + 1,
        ultimo_pedido: new Date().toISOString(),
      }
    })

    if (upsertPayload.length > 0) {
      await supabaseServer.from('ol_productos_frecuentes').upsert(upsertPayload)
    }
  } catch (err) {
    console.error('Error al registrar productos frecuentes:', err)
  }

  return { ok: true, pedidoId: pedido.id, numeroPedido: pedido.numero }
}

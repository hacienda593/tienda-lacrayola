'use server'
import { createClient } from '@supabase/supabase-js'

const serviceKey = process.env.SUPABASE_SERVICE_ROLE_KEY
if (!serviceKey) {
  throw new Error('SUPABASE_SERVICE_ROLE_KEY no está configurada en el entorno del servidor.')
}

const supabaseServer = createClient(
  process.env.NEXT_PUBLIC_SUPABASE_URL!,
  serviceKey
)

export interface DetallesImpresion {
  tipoArchivo: 'imagen' | 'documento'
  paginasTotales: number
  docColorMode?: 'color' | 'bn'
  modoMixtoDoc?: boolean
  paginasColorManual?: string
  coberturaColorDoc?: 'bajo' | 'medio' | 'alto'
  tipoPapel?: string
  dobleFaz?: boolean
  imagenesEdicionCount?: number
}

export async function calcularPrecioImpresionServidor(detalles?: DetallesImpresion): Promise<number | null> {
  if (!detalles || typeof detalles.paginasTotales !== 'number' || detalles.paginasTotales <= 0) {
    return null
  }

  const paginas = detalles.paginasTotales
  const tipoPapel = detalles.tipoPapel || 'bond_75g'
  const recargoPapel = (tipoPapel === 'fotografico_200g' || tipoPapel === 'couche') ? 0.35 : (tipoPapel === 'bond_90g' ? 0.05 : 0)

  if (detalles.tipoArchivo === 'imagen') {
    const costoBasePag = 0.50
    const costoHojas = paginas * (costoBasePag + recargoPapel)
    const costoEdicion = (detalles.imagenesEdicionCount || 0) * 0.25
    return Number((costoHojas + costoEdicion).toFixed(2))
  }

  if (detalles.tipoArchivo === 'documento') {
    const colorVal = detalles.coberturaColorDoc === 'bajo' ? 0.25 : (detalles.coberturaColorDoc === 'medio' ? 0.50 : 1.00)
    const bnVal = 0.05
    let costoHojasDoc = 0

    if (detalles.docColorMode === 'bn') {
      costoHojasDoc = paginas * bnVal
    } else if (detalles.modoMixtoDoc) {
      let pagsColor = 0
      if (detalles.paginasColorManual) {
        try {
          const arr = detalles.paginasColorManual.split(',').map(x => parseInt(x.trim())).filter(x => !isNaN(x))
          pagsColor = Array.from(new Set(arr)).length
        } catch {}
      }
      pagsColor = Math.min(pagsColor, paginas)
      const pagsBN = Math.max(0, paginas - pagsColor)
      costoHojasDoc = (pagsColor * colorVal) + (pagsBN * bnVal)
    } else {
      costoHojasDoc = paginas * colorVal
    }

    const totalHojasFisicas = detalles.dobleFaz ? Math.ceil(paginas / 2) : paginas
    const total = costoHojasDoc + (totalHojasFisicas * recargoPapel)
    return Number(total.toFixed(2))
  }

  return null
}

export interface LineaCarrito {
  codigo: string
  cantidad: number
  precio_unitario?: number
  descripcion?: string
  categoria?: string
  detallesImpresion?: DetallesImpresion
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
  metodo_pago?: string | null
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

  // 1. Consultar precios reales desde la base de datos (excluyendo items de impresión)
  const codigos = lineas.map(l => l.codigo)
  const codigosFiltrados = codigos.filter(c => !c.startsWith('IMP-'))
  
  let productos: any[] = []
  if (codigosFiltrados.length > 0) {
    const { data: prods, error: errP } = await supabaseServer
      .from('ol_productos')
      .select('codigo, precio_con_iva, stock, iva_codigo, iva_porcentaje')
      .in('codigo', codigosFiltrados)

    if (errP || !prods) {
      console.error('[CHECKOUT_ERROR] Error al verificar productos:', errP)
      return { ok: false, error: 'Error al verificar productos en el servidor' }
    }
    productos = prods
  }

  // 2. Verificar que todos los productos existen y tienen stock suficiente
  const mapaProductos = new Map(productos.map(p => [p.codigo, p]))
  for (const linea of lineas) {
    if (linea.codigo.startsWith('IMP-')) {
      const precioCalculadoServidor = await calcularPrecioImpresionServidor(linea.detallesImpresion)
      if (precioCalculadoServidor === null) {
        return { ok: false, error: `Parámetros de impresión incompletos o inválidos para el ítem ${linea.codigo}` }
      }
      continue
    }
    const prod = mapaProductos.get(linea.codigo)
    if (!prod) return { ok: false, error: `Producto ${linea.codigo} no encontrado` }
    if (prod.stock < linea.cantidad) {
      return { ok: false, error: `Stock insuficiente para el producto ${linea.codigo}` }
    }
  }

  // 3. Calcular total con precios verificados en el Servidor (ignorando precios enviados por el cliente)
  const items = await Promise.all(lineas.map(async linea => {
    if (linea.codigo.startsWith('IMP-')) {
      const precioServidor = (await calcularPrecioImpresionServidor(linea.detallesImpresion)) ?? (linea.precio_unitario ?? 0.25)
      return {
        codigo: linea.codigo,
        cantidad: linea.cantidad,
        precio_unitario: precioServidor,
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
  }))

  const total = items.reduce((s, i) => s + i.precio_unitario * i.cantidad, 0)
  const total_items = items.reduce((s, i) => s + i.cantidad, 0)

  // 3.5. Prevenir fraudes: cliente sin historial de compras entregadas debe
  // pagar por transferencia. Un pedido COD falso ("de broma") no le cuesta
  // nada a quien lo hace -- exigir transferencia en la primera compra
  // elimina ese vector, porque nadie transfiere dinero real solo para
  // molestar. Esta es la validacion que de verdad importa (la del
  // navegador es solo UX); aqui no se puede saltar sin tocar el servidor.
  if (cliente.metodo_pago !== 'transferencia') {
    const { data: tieneHistorial, error: errHist } = await supabaseServer
      .rpc('cliente_tiene_historial', { p_telefono: cliente.telefono.trim() })
    if (errHist) {
      console.error('[CHECKOUT_ERROR] Error al verificar historial de cliente:', errHist)
      return { ok: false, error: 'Error al verificar tu historial de compras. Intenta de nuevo.' }
    }
    if (!tieneHistorial) {
      return { ok: false, error: 'Por seguridad, tu primer pedido debe pagarse por transferencia bancaria. Luego de tu primera compra entregada, podrás elegir pago contra-entrega.' }
    }
  }

  // 4. Prevenir fraudes: Validar comprobante duplicado
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

  // 5. Descuento atómico de stock (Prevención de condición de carrera / sobreventa)
  for (const linea of lineas) {
    if (linea.codigo.startsWith('IMP-')) continue
    const prod = mapaProductos.get(linea.codigo)!
    const nuevoStock = prod.stock - linea.cantidad

    const { data: stockUpdated, error: errStock } = await supabaseServer
      .from('ol_productos')
      .update({ stock: nuevoStock })
      .eq('codigo', linea.codigo)
      .gte('stock', linea.cantidad)
      .select('codigo')

    if (errStock || !stockUpdated || stockUpdated.length === 0) {
      console.error('[CHECKOUT_ERROR] Sobreventa detectada para el producto:', linea.codigo, errStock)
      return { ok: false, error: `El producto ${linea.codigo} ya no cuenta con stock suficiente. Intenta de nuevo.` }
    }
  }

  // 6. Insertar pedido principal
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
      referencia_transferencia: cliente.referencia_transferencia ? cliente.referencia_transferencia.trim() : null,
      metodo_pago: cliente.metodo_pago || 'contra_entrega'
    })
    .select('id, numero')
    .single()

  if (errPed || !pedido) {
    console.error('[CHECKOUT_ERROR] Error al crear pedido principal:', errPed)
    return { ok: false, error: 'No se pudo procesar tu pedido. Por favor intenta de nuevo.' }
  }

  // 7. Insertar ítems del pedido (Con lógica de Rollback automático si falla)
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
    console.error('[CHECKOUT_ERROR] Falló inserción de ítems. Ejecutando rollback...', errItems)
    // Rollback: Eliminar pedido principal creado
    await supabaseServer.from('ol_pedidos').delete().eq('id', pedido.id)
    return { ok: false, error: 'No se pudieron registrar los ítems de tu pedido. Por favor intenta de nuevo.' }
  }

  // 8. Crear lista de picking agrupada por tienda
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
    .filter(i => i.tienda_id)

  if (pickingItems.length > 0) {
    const { error: errPick } = await supabaseServer.from('rep_picking').insert(pickingItems)
    if (errPick) {
      console.error('[CHECKOUT_ERROR] Error no bloqueante en rep_picking:', errPick)
    }
  }

  // 9. Sincronizar directorio de direcciones de clientes
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
      console.error('[CHECKOUT_ERROR] Error al sincronizar rep_clientes_direcciones:', e)
    }
  }

  // 10. Registrar / actualizar productos frecuentes
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
    console.error('[CHECKOUT_ERROR] Error al registrar productos frecuentes:', err)
  }

  return { ok: true, pedidoId: pedido.id, numeroPedido: pedido.numero }
}


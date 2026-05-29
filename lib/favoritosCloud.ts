// Favoritos en Supabase — solo para usuarios registrados
import { supabase } from './supabase'
import { ItemFavorito } from './favoritos'

export async function getFavoritosCloud(userId: string): Promise<ItemFavorito[]> {
  const { data } = await supabase
    .from('ol_favoritos')
    .select('*')
    .eq('user_id', userId)
    .order('created_at', { ascending: false })

  return (data ?? []).map(r => ({
    codigo:          r.codigo,
    descripcion:     r.descripcion,
    categoria:       r.categoria,
    precio_unitario: r.precio_unitario,
    agregadoEn:      r.created_at,
  }))
}

export async function toggleFavoritoCloud(
  userId: string,
  prod: { codigo: string; descripcion: string; categoria: string; precio_publico: number }
): Promise<boolean> {
  const { data: existe } = await supabase
    .from('ol_favoritos')
    .select('id')
    .eq('user_id', userId)
    .eq('codigo', prod.codigo)
    .single()

  if (existe) {
    await supabase.from('ol_favoritos').delete().eq('user_id', userId).eq('codigo', prod.codigo)
    return false
  } else {
    await supabase.from('ol_favoritos').insert({
      user_id:         userId,
      codigo:          prod.codigo,
      descripcion:     prod.descripcion,
      categoria:       prod.categoria,
      precio_unitario: prod.precio_publico,
    })
    return true
  }
}

export async function esFavoritoCloud(userId: string, codigo: string): Promise<boolean> {
  const { data } = await supabase
    .from('ol_favoritos')
    .select('id')
    .eq('user_id', userId)
    .eq('codigo', codigo)
    .single()
  return !!data
}

// Sincronizar favoritos locales → nube al registrarse
export async function sincronizarFavoritosLocales(
  userId: string,
  favoritosLocales: ItemFavorito[]
) {
  if (!favoritosLocales.length) return
  const rows = favoritosLocales.map(f => ({
    user_id:         userId,
    codigo:          f.codigo,
    descripcion:     f.descripcion,
    categoria:       f.categoria,
    precio_unitario: f.precio_unitario,
  }))
  await supabase.from('ol_favoritos').upsert(rows, { onConflict: 'user_id,codigo' })
}

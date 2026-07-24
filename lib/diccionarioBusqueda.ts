import { supabase } from './supabase'

function normalizar(s: string): string {
  return (s || '')
    .normalize('NFD').replace(/[̀-ͯ]/g, '')
    .toLowerCase().trim()
}

let cache: Map<string, string> | null = null
let cargando: Promise<Map<string, string>> | null = null

async function obtenerDiccionario(): Promise<Map<string, string>> {
  const { data } = await supabase
    .from('ol_productos_terminos_busqueda')
    .select('variante,termino_correcto')

  const map = new Map<string, string>()
  ;(data || []).forEach((r: { variante: string; termino_correcto: string }) => {
    map.set(normalizar(r.variante), normalizar(r.termino_correcto))
  })
  cache = map
  return map
}

function cargarDiccionario(): Promise<Map<string, string>> {
  if (cache) return Promise.resolve(cache)
  if (!cargando) cargando = obtenerDiccionario()
  return cargando
}

// Corrige palabra por palabra usando el diccionario de variantes (faltas
// ortográficas frecuentes en la zona). Si una palabra no está en el
// diccionario, se deja igual — customSearch ya tiene tolerancia a errores
// (Levenshtein) como respaldo para lo que aún no está catalogado.
export async function corregirTermino(term: string): Promise<string> {
  const dic = await cargarDiccionario()
  if (dic.size === 0) return term

  return term
    .split(/\s+/)
    .map(palabra => dic.get(normalizar(palabra)) || palabra)
    .join(' ')
}

// Registra una búsqueda que no encontró ningún producto, para revisión
// manual en Supabase (tabla ol_productos_busquedas_sin_resultado).
export async function registrarBusquedaFallida(term: string): Promise<void> {
  const termino = normalizar(term)
  if (!termino) return
  try {
    await supabase.rpc('registrar_busqueda_fallida', { termino })
  } catch {
    // No es crítico si falla — no debe romper la búsqueda del usuario.
  }
}

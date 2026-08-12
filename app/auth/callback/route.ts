import { NextRequest, NextResponse } from 'next/server'
import { createClient } from '@supabase/supabase-js'

export async function GET(req: NextRequest) {
  const { searchParams, origin } = new URL(req.url)
  const code = searchParams.get('code')

  if (code) {
    const supabase = createClient(
      process.env.NEXT_PUBLIC_SUPABASE_URL!,
      process.env.NEXT_PUBLIC_SUPABASE_ANON_KEY!
    )
    await supabase.auth.exchangeCodeForSession(code)
  }

  // 'next' es opcional: si loginGoogle() se llamo sin destino (como en
  // /cuenta y /impresion, sin cambios), esto cae al mismo /cuenta de
  // siempre. Solo se usa una ruta interna propia -- nunca una URL externa
  // que venga del parametro, para no abrir una redireccion abierta.
  const next = searchParams.get('next')
  const destino = next && next.startsWith('/') && !next.startsWith('//') ? next : '/cuenta'

  return NextResponse.redirect(`${origin}${destino}`)
}

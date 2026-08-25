import { createSupabaseServerClient } from '@/lib/supabase-server'
import { NextResponse, type NextRequest } from 'next/server'

export async function GET(request: NextRequest) {
  const { searchParams, origin } = new URL(request.url)
  const code = searchParams.get('code')

  if (code) {
    const supabase = await createSupabaseServerClient()
    const { error } = await supabase.auth.exchangeCodeForSession(code)
    if (!error) {
      return NextResponse.redirect(`${origin}/profesor`)
    }
    // El canje puede fallar por link ya usado, vencido, o porque la cookie con el
    // code verifier no esta en este navegador. El usuario solo ve el redirect al
    // login, asi que sin este log el error real no queda registrado en ningun lado.
    console.error(
      '[auth/callback] exchangeCodeForSession fallo',
      error.message,
      error.status,
      error
    )
  } else {
    console.error('[auth/callback] llego sin parametro code')
  }

  return NextResponse.redirect(`${origin}/profesor/login`)
}

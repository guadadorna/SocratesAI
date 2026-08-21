import { createServerClient } from '@supabase/ssr'
import { cookies } from 'next/headers'

const supabaseUrl = process.env.SUPABASE_URL || process.env.NEXT_PUBLIC_SUPABASE_URL
const supabaseKey = process.env.SUPABASE_ANON_KEY || process.env.NEXT_PUBLIC_SUPABASE_ANON_KEY

if (!supabaseUrl || !supabaseKey) {
  throw new Error('Faltan variables de entorno de Supabase (SUPABASE_URL / SUPABASE_ANON_KEY)')
}

// Cliente con sesion (cookies) para usar en Server Components, Route Handlers y Server Actions.
// A diferencia de src/lib/supabase.ts (anon key sin sesion), este cliente lleva el JWT
// del usuario logueado, necesario para que las policies de RLS basadas en auth.uid() funcionen.
export async function createSupabaseServerClient() {
  const cookieStore = await cookies()

  return createServerClient(supabaseUrl!, supabaseKey!, {
    cookies: {
      getAll() {
        return cookieStore.getAll()
      },
      setAll(cookiesToSet) {
        try {
          cookiesToSet.forEach(({ name, value, options }) =>
            cookieStore.set(name, value, options)
          )
        } catch {
          // setAll fue llamado desde un Server Component sin permiso de escritura;
          // se ignora porque src/proxy.ts ya refresca la sesion en cada request.
        }
      },
    },
  })
}

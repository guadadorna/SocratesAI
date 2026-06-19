'use server'

import { createSupabaseServerClient } from '@/lib/supabase-server'

function getSiteUrl(): string {
  if (process.env.NEXT_PUBLIC_SITE_URL) return process.env.NEXT_PUBLIC_SITE_URL
  if (process.env.VERCEL_URL) return `https://${process.env.VERCEL_URL}`
  return 'http://localhost:3000'
}

export type MagicLinkState = { error?: string; sent?: boolean }

export async function signInWithMagicLink(
  _prevState: MagicLinkState | undefined,
  formData: FormData
): Promise<MagicLinkState> {
  const email = formData.get('email')

  if (typeof email !== 'string' || !email.includes('@')) {
    return { error: 'Ingresá un email válido.' }
  }

  const supabase = await createSupabaseServerClient()
  const { error } = await supabase.auth.signInWithOtp({
    email,
    options: {
      emailRedirectTo: `${getSiteUrl()}/auth/callback`,
    },
  })

  if (error) {
    return { error: 'No se pudo enviar el link. Intentá de nuevo.' }
  }

  return { sent: true }
}

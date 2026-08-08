import { createClient } from '@/lib/supabase/server'
import { createServiceClient } from '@/lib/supabase/service'
import { NextRequest } from 'next/server'

export async function POST(request: NextRequest) {
  const { email } = await request.json()

  if (!email || typeof email !== 'string') {
    return Response.json({ error: 'Email requis' }, { status: 400 })
  }

  const supabase = await createClient()
  const { origin } = request.nextUrl

  const { error } = await supabase.auth.signInWithOtp({
    email,
    options: {
      shouldCreateUser: true,
      emailRedirectTo: `${origin}/api/auth/callback`,
    },
  })

  if (error) {
    return Response.json({ error: error.message }, { status: 400 })
  }

  // Lire la préférence auth de l'utilisateur (null si nouveau compte)
  const service = createServiceClient()
  const { data: profile } = await service
    .from('users')
    .select('preferences')
    .eq('email', email)
    .maybeSingle()

  const preferredMode =
    (profile?.preferences as { auth_mode?: string } | null)?.auth_mode ?? null

  return Response.json({ message: 'Email envoyé', preferredMode })
}

import { createClient } from '@/lib/supabase/server'
import { createServiceClient } from '@/lib/supabase/service'
import { DEFAULT_MEAL_CONFIGS } from '@/lib/constants/meal-type'
import { NextRequest } from 'next/server'

export async function POST(request: NextRequest) {
  const { email, token, authMode } = await request.json()

  if (!email || !token) {
    return Response.json({ error: 'Email et code requis' }, { status: 400 })
  }

  const supabase = await createClient()

  const { data: { user }, error } = await supabase.auth.verifyOtp({
    email,
    token,
    type: 'email',
  })

  if (error || !user) {
    return Response.json({ error: error?.message ?? 'Code invalide' }, { status: 400 })
  }

  // SELECT via client anon (session établie après verifyOtp)
  const { data: existing } = await supabase
    .from('users')
    .select('id')
    .eq('id', user.id)
    .maybeSingle()

  const service = createServiceClient()

  if (!existing) {
    const { error: insertError } = await service.from('users').insert({
      id: user.id,
      email: user.email!,
      display_name: user.email!.split('@')[0],
      preferences: authMode ? { auth_mode: authMode } : {},
    })

    if (insertError) {
      return Response.json({ error: 'Erreur création profil' }, { status: 500 })
    }

    await service.from('user_meal_config').insert(
      DEFAULT_MEAL_CONFIGS.map((c) => ({ ...c, user_id: user.id }))
    )

    return Response.json({ redirect: '/onboarding' })
  }

  if (authMode) {
    await service.from('users')
      .update({ preferences: { auth_mode: authMode } })
      .eq('id', user.id)
  }

  return Response.json({ redirect: '/' })
}

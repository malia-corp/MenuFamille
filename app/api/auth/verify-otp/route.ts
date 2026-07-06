import { createClient } from '@/lib/supabase/server'
import { createServiceClient } from '@/lib/supabase/service'
import { NextRequest } from 'next/server'

export async function POST(request: NextRequest) {
  const { email, token } = await request.json()

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

  if (!existing) {
    // INSERT via service role — contourne le problème JWT/RLS côté serveur
    const service = createServiceClient()

    const { error: insertError } = await service.from('users').insert({
      id: user.id,
      email: user.email!,
      display_name: user.email!.split('@')[0],
    })

    if (insertError) {
      return Response.json({ error: 'Erreur création profil' }, { status: 500 })
    }

    await service.from('user_meal_config').insert([
      { user_id: user.id, meal_type: 'dejeuner',       is_active: true,  mode: 'daily',    display_order: 1, default_time: '12:00' },
      { user_id: user.id, meal_type: 'diner',          is_active: true,  mode: 'daily',    display_order: 2, default_time: '19:00' },
      { user_id: user.id, meal_type: 'petit_dejeuner', is_active: false, mode: 'template', display_order: 3, default_time: '07:00' },
      { user_id: user.id, meal_type: 'gouter',         is_active: false, mode: 'template', display_order: 4, default_time: '16:00' },
    ])

    return Response.json({ redirect: '/onboarding' })
  }

  return Response.json({ redirect: '/' })
}

import { createClient } from '@/lib/supabase/server'
import { createServiceClient } from '@/lib/supabase/service'
import { NextRequest, NextResponse } from 'next/server'

const DEFAULT_MEAL_CONFIGS = [
  { meal_type: 'dejeuner',       is_active: true,  mode: 'daily',    display_order: 1, default_time: '12:00' },
  { meal_type: 'diner',          is_active: true,  mode: 'daily',    display_order: 2, default_time: '19:00' },
  { meal_type: 'petit_dejeuner', is_active: false, mode: 'template', display_order: 3, default_time: '07:00' },
  { meal_type: 'gouter',         is_active: false, mode: 'template', display_order: 4, default_time: '16:00' },
]

export async function GET(request: NextRequest) {
  const { searchParams, origin } = request.nextUrl
  const code = searchParams.get('code')

  if (!code) {
    return NextResponse.redirect(new URL('/login?error=missing_code', origin))
  }

  const supabase = await createClient()
  const { error } = await supabase.auth.exchangeCodeForSession(code)

  if (error) {
    return NextResponse.redirect(new URL('/login?error=auth_failed', origin))
  }

  const { data: { user } } = await supabase.auth.getUser()

  if (user) {
    const service = createServiceClient()
    const { data: existing } = await service
      .from('users')
      .select('id')
      .eq('id', user.id)
      .maybeSingle()

    if (!existing) {
      await service.from('users').insert({
        id: user.id,
        email: user.email!,
        display_name: user.email!.split('@')[0],
        preferences: { auth_mode: 'link' },
      })
      await service.from('user_meal_config').insert(
        DEFAULT_MEAL_CONFIGS.map((c) => ({ ...c, user_id: user.id }))
      )
      return NextResponse.redirect(new URL('/onboarding', origin))
    }

    await service.from('users')
      .update({ preferences: { auth_mode: 'link' } })
      .eq('id', user.id)
  }

  return NextResponse.redirect(new URL('/', origin))
}

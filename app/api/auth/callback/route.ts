import { createClient } from '@/lib/supabase/server'
import { createServiceClient } from '@/lib/supabase/service'
import { DEFAULT_MEAL_CONFIGS } from '@/lib/constants/meal-type'
import { NextRequest, NextResponse } from 'next/server'
import { publicOrigin } from '@/lib/utils/public-origin'

export async function GET(request: NextRequest) {
  const { searchParams } = request.nextUrl
  const origin = publicOrigin(request)
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

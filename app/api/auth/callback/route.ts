import { createClient } from '@/lib/supabase/server'
import { NextRequest, NextResponse } from 'next/server'

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

  if (!user) {
    return NextResponse.redirect(new URL('/login', origin))
  }

  const { data: existing } = await supabase
    .from('users')
    .select('id')
    .eq('id', user.id)
    .maybeSingle()

  if (!existing) {
    const { error: insertError } = await supabase.from('users').insert({
      id: user.id,
      email: user.email!,
      display_name: user.email!.split('@')[0],
    })

    if (insertError) {
      return NextResponse.redirect(new URL('/login?error=profile_creation_failed', origin))
    }

    await supabase.from('user_meal_config').insert([
      { user_id: user.id, meal_type: 'dejeuner', is_active: true, mode: 'daily', display_order: 1, default_time: '12:00' },
      { user_id: user.id, meal_type: 'diner', is_active: true, mode: 'daily', display_order: 2, default_time: '19:00' },
      { user_id: user.id, meal_type: 'petit_dejeuner', is_active: false, mode: 'template', display_order: 3, default_time: '07:00' },
      { user_id: user.id, meal_type: 'gouter', is_active: false, mode: 'template', display_order: 4, default_time: '16:00' },
    ])

    return NextResponse.redirect(new URL('/onboarding', origin))
  }

  return NextResponse.redirect(new URL('/', origin))
}

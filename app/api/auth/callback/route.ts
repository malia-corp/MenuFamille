import { createClient } from '@/lib/supabase/server'
import { NextRequest, NextResponse } from 'next/server'

// Stub pour futur OAuth (Google, Facebook).
// La création du profil users est gérée par POST /api/auth/verify-otp (flux OTP email).
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

  return NextResponse.redirect(new URL('/', origin))
}

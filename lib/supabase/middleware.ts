import { createServerClient } from '@supabase/ssr'
import { NextResponse, type NextRequest } from 'next/server'
import { publicOrigin } from '@/lib/utils/public-origin'

export async function updateSession(request: NextRequest) {
  let response = NextResponse.next({ request })

  const supabase = createServerClient(
    process.env.NEXT_PUBLIC_SUPABASE_URL!,
    process.env.NEXT_PUBLIC_SUPABASE_ANON_KEY!,
    {
      cookies: {
        getAll() {
          return request.cookies.getAll()
        },
        setAll(cookiesToSet) {
          cookiesToSet.forEach(({ name, value }) => request.cookies.set(name, value))
          response = NextResponse.next({ request })
          cookiesToSet.forEach(({ name, value, options }) =>
            response.cookies.set(name, value, options)
          )
        },
      },
    }
  )

  // Rafraîchit la session si besoin — nécessaire pour que les Server Components
  // disposent toujours d'un token d'accès valide.
  const { data: { user } } = await supabase.auth.getUser()

  const pathname = request.nextUrl.pathname
  const isPublicPath =
    pathname.startsWith('/login') ||
    pathname.startsWith('/api/auth') ||
    pathname.startsWith('/s/') ||
    pathname.startsWith('/api/surveys') ||
    // Tâches planifiées (cron) : protégées par l'en-tête x-cron-secret,
    // appelées sans session.
    pathname.startsWith('/api/jobs/')

  if (!user && !isPublicPath) {
    return NextResponse.redirect(new URL('/login', publicOrigin(request)))
  }

  return response
}

import { createServerClient } from '@supabase/ssr'
import { createClient as createSupabaseClient } from '@supabase/supabase-js'
import { cookies, headers } from 'next/headers'
import type { Database } from './database.types'

// Jeton d'accès envoyé par l'application mobile (en-tête Authorization), qui
// n'a pas de cookie de session.
export function bearerToken(authorization: string | null): string | null {
  const match = authorization?.match(/^Bearer\s+(.+)$/i)
  return match ? match[1].trim() : null
}

export async function createClient() {
  // Application mobile : client authentifié par le jeton, soumis à la RLS
  // comme le client de session. getUser() sans argument vérifie ce jeton.
  const token = bearerToken((await headers()).get('authorization'))
  if (token) {
    const client = createSupabaseClient<Database>(
      process.env.NEXT_PUBLIC_SUPABASE_URL!,
      process.env.NEXT_PUBLIC_SUPABASE_ANON_KEY!,
      {
        global: { headers: { Authorization: `Bearer ${token}` } },
        auth:   { persistSession: false, autoRefreshToken: false, detectSessionInUrl: false },
      },
    )
    const getUser = client.auth.getUser.bind(client.auth)
    client.auth.getUser = (jwt?: string) => getUser(jwt ?? token)
    return client as unknown as ReturnType<typeof createServerClient<Database>>
  }

  const cookieStore = await cookies()

  return createServerClient<Database>(
    process.env.NEXT_PUBLIC_SUPABASE_URL!,
    process.env.NEXT_PUBLIC_SUPABASE_ANON_KEY!,
    {
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
            // setAll appelé depuis un Server Component : ignoré si un middleware
            // gère déjà le rafraîchissement de session.
          }
        },
      },
    }
  )
}

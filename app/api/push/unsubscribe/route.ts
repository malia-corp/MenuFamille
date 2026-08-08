import { createClient } from '@/lib/supabase/server'
import { NextRequest } from 'next/server'

export async function POST(request: NextRequest) {
  const supabase = await createClient()
  const { data: { user } } = await supabase.auth.getUser()
  if (!user) return Response.json({ error: 'Non authentifié' }, { status: 401 })

  const { endpoint } = await request.json() as { endpoint?: string }

  if (endpoint) {
    await supabase
      .from('push_subscriptions')
      .delete()
      .eq('user_id', user.id)
      .eq('endpoint', endpoint)
  } else {
    // Supprimer tous les abonnements de l'utilisateur
    await supabase
      .from('push_subscriptions')
      .delete()
      .eq('user_id', user.id)
  }

  return Response.json({ ok: true })
}

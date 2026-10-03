import { createClient } from '@/lib/supabase/server'

// Choisit le cercle affiché dans l'app (users.active_circle_id).
export async function PUT(request: Request) {
  const supabase = await createClient()
  const { data: { user } } = await supabase.auth.getUser()
  if (!user) return Response.json({ error: 'Non authentifié' }, { status: 401 })

  const { circle_id } = await request.json().catch(() => ({}))
  if (!circle_id || typeof circle_id !== 'string') {
    return Response.json({ error: 'circle_id requis' }, { status: 400 })
  }

  const { data: membership } = await supabase
    .from('family_circle_members')
    .select('id, is_active')
    .eq('circle_id', circle_id)
    .eq('user_id', user.id)
    .maybeSingle()
  if (!membership) return Response.json({ error: 'Tu n\'es pas membre de ce cercle' }, { status: 403 })
  if (!membership.is_active) {
    return Response.json({ error: 'Ton accès à ce cercle est désactivé' }, { status: 403 })
  }

  const { error } = await supabase
    .from('users')
    .update({ active_circle_id: circle_id })
    .eq('id', user.id)
  if (error) return Response.json({ error: error.message }, { status: 500 })

  return Response.json({ active_circle_id: circle_id })
}

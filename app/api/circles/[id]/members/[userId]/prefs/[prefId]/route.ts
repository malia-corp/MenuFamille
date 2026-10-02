import { createClient } from '@/lib/supabase/server'

export async function DELETE(
  _request: Request,
  { params }: { params: { id: string; userId: string; prefId: string } }
) {
  const supabase = await createClient()
  const { data: { user } } = await supabase.auth.getUser()
  if (!user) return Response.json({ error: 'Non authentifié' }, { status: 401 })

  const { data: myMembership } = await supabase
    .from('family_circle_members')
    .select('role')
    .eq('circle_id', params.id)
    .eq('user_id', user.id)
    .maybeSingle()

  if (!myMembership) return Response.json({ error: 'Tu n\'es pas membre de ce cercle' }, { status: 403 })
  if (params.userId !== user.id && myMembership.role !== 'planificatrice') {
    return Response.json({ error: 'Seule la planificatrice peut modifier les préférences d\'un autre membre' }, { status: 403 })
  }

  const { error, count } = await supabase
    .from('member_dietary_prefs')
    .delete({ count: 'exact' })
    .eq('id', params.prefId)
    .eq('user_id', params.userId)

  if (error) return Response.json({ error: error.message }, { status: 500 })
  if (!count) return Response.json({ error: 'Préférence introuvable' }, { status: 404 })

  return new Response(null, { status: 204 })
}

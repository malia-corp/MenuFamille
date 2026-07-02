import { createClient } from '@/lib/supabase/server'

export async function DELETE(
  _request: Request,
  { params }: { params: { id: string; userId: string } }
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
  if (myMembership.role !== 'planificatrice') {
    return Response.json({ error: 'Seule la planificatrice peut retirer des membres' }, { status: 403 })
  }

  if (params.userId === user.id) {
    return Response.json({ error: 'La planificatrice ne peut pas se retirer elle-même' }, { status: 400 })
  }

  const { error } = await supabase
    .from('family_circle_members')
    .delete()
    .eq('circle_id', params.id)
    .eq('user_id', params.userId)

  if (error) return Response.json({ error: error.message }, { status: 500 })

  return new Response(null, { status: 204 })
}

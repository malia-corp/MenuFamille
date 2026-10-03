import { createClient } from '@/lib/supabase/server'

export async function DELETE(
  _request: Request,
  { params }: { params: { prefId: string } }
) {
  const supabase = await createClient()
  const { data: { user } } = await supabase.auth.getUser()
  if (!user) return Response.json({ error: 'Non authentifié' }, { status: 401 })

  const { error, count } = await supabase
    .from('member_dietary_prefs')
    .delete({ count: 'exact' })
    .eq('id', params.prefId)
    .eq('user_id', user.id)

  if (error) return Response.json({ error: error.message }, { status: 500 })
  if (!count) return Response.json({ error: 'Préférence introuvable' }, { status: 404 })

  return new Response(null, { status: 204 })
}

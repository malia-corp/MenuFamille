import { createClient } from '@/lib/supabase/server'

export async function GET(
  _request: Request,
  { params }: { params: { id: string } }
) {
  const supabase = await createClient()

  const { data: { user } } = await supabase.auth.getUser()
  if (!user) return Response.json({ error: 'Non authentifié' }, { status: 401 })

  const { data: circle, error } = await supabase
    .from('family_circles')
    .select(`
      id, name, invite_code, created_by, created_at,
      family_circle_members (
        id, role, joined_at,
        users ( id, display_name, email )
      )
    `)
    .eq('id', params.id)
    .single()

  if (error) return Response.json({ error: error.message }, { status: error.code === 'PGRST116' ? 404 : 500 })

  return Response.json(circle)
}

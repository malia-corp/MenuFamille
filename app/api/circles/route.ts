import { createClient } from '@/lib/supabase/server'

export async function GET() {
  const supabase = await createClient()

  const { data: { user } } = await supabase.auth.getUser()
  if (!user) return Response.json({ error: 'Non authentifié' }, { status: 401 })

  const { data, error } = await supabase
    .from('family_circle_members')
    .select(`
      role,
      family_circles (
        id, name, invite_code, created_by, created_at,
        family_circle_members (
          id, role, joined_at,
          users ( id, display_name, email )
        )
      )
    `)
    .eq('user_id', user.id)

  if (error) return Response.json({ error: error.message }, { status: 500 })

  const circles = (data ?? []).map((m) => ({
    ...(m.family_circles as object),
    my_role: m.role,
  }))

  return Response.json(circles)
}

function makeInviteCode(displayName: string): string {
  const firstName = (displayName || 'FAM').split(' ')[0].toUpperCase().replace(/[^A-Z]/g, '') || 'FAM'
  const digits = String(Math.floor(Math.random() * 90 + 10))
  return `${firstName}-${digits}`
}

export async function POST(request: Request) {
  const supabase = await createClient()

  const { data: { user } } = await supabase.auth.getUser()
  if (!user) return Response.json({ error: 'Non authentifié' }, { status: 401 })

  const { name } = await request.json()
  if (!name || typeof name !== 'string' || name.trim() === '') {
    return Response.json({ error: 'Le nom du cercle est requis' }, { status: 400 })
  }

  const { data: creator } = await supabase.from('users').select('display_name').eq('id', user.id).single()

  let circle = null
  for (let attempt = 0; attempt < 3; attempt++) {
    const invite_code = makeInviteCode(creator?.display_name ?? '')
    const { data, error } = await supabase
      .from('family_circles')
      .insert({ name: name.trim(), created_by: user.id, invite_code })
      .select()
      .single()

    if (!error) {
      circle = data
      break
    }
    if (error.code !== '23505') {
      return Response.json({ error: error.message }, { status: 500 })
    }
  }

  if (!circle) {
    return Response.json({ error: 'Impossible de générer un code unique, réessaie' }, { status: 500 })
  }

  await supabase.from('family_circle_members').insert({
    circle_id: circle.id,
    user_id: user.id,
    role: 'planificatrice',
  })

  return Response.json({ circle }, { status: 201 })
}

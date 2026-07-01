import { createClient } from '@/lib/supabase/server'

function generateInviteCode(): string {
  return 'FAM-' + Math.random().toString(36).slice(2, 6).toUpperCase()
}

export async function POST(request: Request) {
  const supabase = await createClient()

  const { data: { user } } = await supabase.auth.getUser()
  if (!user) return Response.json({ error: 'Non authentifié' }, { status: 401 })

  const { name } = await request.json()
  if (!name || typeof name !== 'string' || name.trim() === '') {
    return Response.json({ error: 'Le nom du cercle est requis' }, { status: 400 })
  }

  let circle = null
  for (let attempt = 0; attempt < 3; attempt++) {
    const invite_code = generateInviteCode()
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

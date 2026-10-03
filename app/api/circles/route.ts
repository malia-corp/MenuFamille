import { createClient } from '@/lib/supabase/server'
import { createServiceClient } from '@/lib/supabase/service'
import { resolveActiveCircleId } from '@/lib/utils/active-circle'

export async function GET() {
  const supabase = await createClient()

  const { data: { user } } = await supabase.auth.getUser()
  if (!user) return Response.json({ error: 'Non authentifié' }, { status: 401 })

  // Uniquement les cercles dont l'utilisateur est membre (créateur compris :
  // il y est inscrit comme planificatrice). Trié par date d'adhésion.
  const { data, error } = await supabase
    .from('family_circle_members')
    .select(`
      role, joined_at, is_active,
      family_circles (
        id, name, invite_code, created_by, created_at,
        family_circle_members (
          id, role, joined_at, is_active,
          users ( id, display_name, email, member_dietary_prefs ( id, pref_type, value, severity ) )
        )
      )
    `)
    .eq('user_id', user.id)
    .order('joined_at')

  if (error) return Response.json({ error: error.message }, { status: 500 })

  type RawCircle = { invite_code: string; family_circle_members: { users: { id: string } | null }[] }
  const circles = (data ?? []).map((m) => {
    const circle = m.family_circles as unknown as RawCircle
    // Membre désactivé : ni code d'invitation, ni autres membres (la RLS ne
    // renvoie déjà que sa propre ligne ; on ne compte pas dessus seule).
    if (!m.is_active) {
      return {
        ...circle,
        invite_code: null,
        family_circle_members: circle.family_circle_members.filter((fm) => fm.users?.id === user.id),
        my_role: m.role,
        my_is_active: false,
      }
    }
    return { ...circle, my_role: m.role, my_is_active: true }
  })

  const active_circle_id = await resolveActiveCircleId(supabase, user.id)

  return Response.json({ data: circles, viewer_id: user.id, active_circle_id })
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

  const { data: creator } = await supabase
    .from('users').select('display_name').eq('id', user.id).single()

  const service = createServiceClient()

  let circle = null
  for (let attempt = 0; attempt < 3; attempt++) {
    const invite_code = makeInviteCode(creator?.display_name ?? '')
    const { data, error } = await service
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

  await service.from('family_circle_members').insert({
    circle_id: circle.id,
    user_id: user.id,
    role: 'planificatrice',
  })

  // Le cercle créé devient le cercle affiché.
  await supabase.from('users').update({ active_circle_id: circle.id }).eq('id', user.id)

  return Response.json({ circle }, { status: 201 })
}

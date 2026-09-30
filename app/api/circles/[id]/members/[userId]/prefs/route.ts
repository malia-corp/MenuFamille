import { createClient } from '@/lib/supabase/server'

type PrefType = 'allergy' | 'dislike' | 'preference' | 'favorite'
type Severity = 'strict' | 'light'

async function checkAccess(
  supabase: Awaited<ReturnType<typeof createClient>>,
  circleId: string,
  targetUserId: string,
  callerId: string,
) {
  const { data: myMembership } = await supabase
    .from('family_circle_members')
    .select('role')
    .eq('circle_id', circleId)
    .eq('user_id', callerId)
    .maybeSingle()

  if (!myMembership) return { ok: false as const, status: 403, error: 'Tu n\'es pas membre de ce cercle' }

  if (targetUserId !== callerId && myMembership.role !== 'planificatrice') {
    return { ok: false as const, status: 403, error: 'Seule la planificatrice peut modifier les préférences d\'un autre membre' }
  }

  return { ok: true as const }
}

export async function GET(
  _request: Request,
  { params }: { params: { id: string; userId: string } }
) {
  const supabase = await createClient()
  const { data: { user } } = await supabase.auth.getUser()
  if (!user) return Response.json({ error: 'Non authentifié' }, { status: 401 })

  const access = await checkAccess(supabase, params.id, params.userId, user.id)
  if (!access.ok) return Response.json({ error: access.error }, { status: access.status })

  // eslint-disable-next-line @typescript-eslint/no-explicit-any
  const { data, error } = await (supabase as any)
    .from('member_dietary_prefs')
    .select('id, pref_type, value, severity, created_at')
    .eq('user_id', params.userId)
    .order('created_at')

  if (error) return Response.json({ error: error.message }, { status: 500 })
  return Response.json({ data: data ?? [] })
}

export async function POST(
  request: Request,
  { params }: { params: { id: string; userId: string } }
) {
  const supabase = await createClient()
  const { data: { user } } = await supabase.auth.getUser()
  if (!user) return Response.json({ error: 'Non authentifié' }, { status: 401 })

  const access = await checkAccess(supabase, params.id, params.userId, user.id)
  if (!access.ok) return Response.json({ error: access.error }, { status: access.status })

  const body = await request.json()
  const pref_type = body.pref_type as PrefType
  const value      = (body.value as string | undefined)?.trim()
  const severity   = body.severity as Severity | undefined

  const VALID_TYPES: PrefType[] = ['allergy', 'dislike', 'preference', 'favorite']
  if (!value) return Response.json({ error: 'value est requis' }, { status: 400 })
  if (!VALID_TYPES.includes(pref_type)) return Response.json({ error: 'pref_type invalide' }, { status: 400 })
  if (pref_type === 'allergy' && severity !== 'strict' && severity !== 'light') {
    return Response.json({ error: 'severity (strict ou light) est requis pour une allergie' }, { status: 400 })
  }

  // eslint-disable-next-line @typescript-eslint/no-explicit-any
  const { data, error } = await (supabase as any)
    .from('member_dietary_prefs')
    .upsert(
      {
        user_id:   params.userId,
        pref_type,
        value,
        severity: pref_type === 'allergy' ? severity : null,
      },
      { onConflict: 'user_id,pref_type,value' }
    )
    .select('id, pref_type, value, severity, created_at')
    .single()

  if (error) return Response.json({ error: error.message }, { status: 500 })
  return Response.json(data, { status: 201 })
}

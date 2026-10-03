import { createClient } from '@/lib/supabase/server'

export async function GET() {
  const supabase = await createClient()
  const { data: { user } } = await supabase.auth.getUser()
  if (!user) return Response.json({ error: 'Non authentifié' }, { status: 401 })

  const { data, error } = await supabase
    .from('member_dietary_prefs')
    .select('id, pref_type, value, severity, created_at')
    .eq('user_id', user.id)
    .order('created_at')

  if (error) return Response.json({ error: error.message }, { status: 500 })
  return Response.json({ data: data ?? [] })
}

const VALID_TYPES = ['allergy', 'dislike', 'preference', 'favorite'] as const
type PrefType = (typeof VALID_TYPES)[number]

// Ajout d'une préférence sur son propre profil (écran Paramètres) — même
// règles que la route du cercle, sans exiger d'appartenir à un cercle.
export async function POST(request: Request) {
  const supabase = await createClient()
  const { data: { user } } = await supabase.auth.getUser()
  if (!user) return Response.json({ error: 'Non authentifié' }, { status: 401 })

  const body      = await request.json()
  const pref_type = body.pref_type as PrefType
  const value     = (body.value as string | undefined)?.trim()
  const severity  = body.severity as 'strict' | 'light' | undefined

  if (!value) return Response.json({ error: 'value est requis' }, { status: 400 })
  if (!VALID_TYPES.includes(pref_type)) return Response.json({ error: 'pref_type invalide' }, { status: 400 })
  if (pref_type === 'allergy' && severity !== 'strict' && severity !== 'light') {
    return Response.json({ error: 'severity (strict ou light) est requis pour une allergie' }, { status: 400 })
  }

  // Insert simple (pas d'UPDATE autorise par la RLS) : un doublon renvoie la
  // ligne deja presente.
  const { data, error } = await supabase
    .from('member_dietary_prefs')
    .insert({ user_id: user.id, pref_type, value, severity: pref_type === 'allergy' ? severity : null })
    .select('id, pref_type, value, severity, created_at')
    .single()

  if (error?.code === '23505') {
    const { data: existing } = await supabase
      .from('member_dietary_prefs')
      .select('id, pref_type, value, severity, created_at')
      .eq('user_id', user.id)
      .eq('pref_type', pref_type)
      .eq('value', value)
      .maybeSingle()
    if (existing) return Response.json(existing)
  }
  if (error) return Response.json({ error: error.message }, { status: 500 })
  return Response.json(data, { status: 201 })
}

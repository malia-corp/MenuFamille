import { createClient } from '@/lib/supabase/server'

export async function GET() {
  const supabase = await createClient()
  const { data: { user } } = await supabase.auth.getUser()
  if (!user) return Response.json({ error: 'Non authentifié' }, { status: 401 })

  // `as any` : member_dietary_prefs n'existe pas encore dans database.types.ts
  // (a regenerer une fois la migration 20260930000019_s appliquee).
  // eslint-disable-next-line @typescript-eslint/no-explicit-any
  const { data, error } = await (supabase as any)
    .from('member_dietary_prefs')
    .select('id, pref_type, value, severity, created_at')
    .eq('user_id', user.id)
    .order('created_at')

  if (error) return Response.json({ error: error.message }, { status: 500 })
  return Response.json({ data: data ?? [] })
}

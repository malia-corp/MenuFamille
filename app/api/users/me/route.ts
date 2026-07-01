import { createClient } from '@/lib/supabase/server'
import type { Database } from '@/lib/supabase/database.types'

type UserUpdate = Database['public']['Tables']['users']['Update']

export async function GET() {
  const supabase = await createClient()

  const { data: { user } } = await supabase.auth.getUser()
  if (!user) return Response.json({ error: 'Non authentifié' }, { status: 401 })

  const { data, error } = await supabase
    .from('users')
    .select('*')
    .eq('id', user.id)
    .single()

  if (error) return Response.json({ error: error.message }, { status: 500 })

  return Response.json(data)
}

export async function PUT(request: Request) {
  const supabase = await createClient()

  const { data: { user } } = await supabase.auth.getUser()
  if (!user) return Response.json({ error: 'Non authentifié' }, { status: 401 })

  const body = await request.json()
  const { display_name, family_size, dietary_prefs } = body

  const updates: Pick<UserUpdate, 'display_name' | 'family_size' | 'dietary_prefs'> = {}
  if (display_name !== undefined) updates.display_name = display_name
  if (family_size !== undefined) updates.family_size = Number(family_size)
  if (dietary_prefs !== undefined) updates.dietary_prefs = dietary_prefs

  const { data, error } = await supabase
    .from('users')
    .update(updates)
    .eq('id', user.id)
    .select()
    .single()

  if (error) return Response.json({ error: error.message }, { status: 500 })

  return Response.json(data)
}

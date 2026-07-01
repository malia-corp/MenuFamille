import { createClient } from '@/lib/supabase/server'

const DEFAULT_CONFIGS = [
  { meal_type: 'dejeuner' as const, is_active: true, mode: 'daily' as const, display_order: 1, default_time: '12:00' },
  { meal_type: 'diner' as const, is_active: true, mode: 'daily' as const, display_order: 2, default_time: '19:00' },
  { meal_type: 'petit_dejeuner' as const, is_active: false, mode: 'template' as const, display_order: 3, default_time: '07:00' },
  { meal_type: 'gouter' as const, is_active: false, mode: 'template' as const, display_order: 4, default_time: '16:00' },
]

export async function GET() {
  const supabase = await createClient()

  const { data: { user } } = await supabase.auth.getUser()
  if (!user) return Response.json({ error: 'Non authentifié' }, { status: 401 })

  const { data, error } = await supabase
    .from('user_meal_config')
    .select('*')
    .eq('user_id', user.id)
    .order('display_order')

  if (error) return Response.json({ error: error.message }, { status: 500 })

  if (!data || data.length === 0) {
    const { data: inserted, error: insertError } = await supabase
      .from('user_meal_config')
      .insert(DEFAULT_CONFIGS.map((c) => ({ ...c, user_id: user.id })))
      .select()
      .order('display_order')

    if (insertError) return Response.json({ error: insertError.message }, { status: 500 })
    return Response.json(inserted)
  }

  return Response.json(data)
}

export async function PUT(request: Request) {
  const supabase = await createClient()

  const { data: { user } } = await supabase.auth.getUser()
  if (!user) return Response.json({ error: 'Non authentifié' }, { status: 401 })

  const { meal_type, is_active, mode } = await request.json()

  if (!meal_type) return Response.json({ error: 'meal_type requis' }, { status: 400 })

  if (meal_type === 'dejeuner' && is_active === false) {
    return Response.json(
      { error: 'Le déjeuner ne peut pas être désactivé' },
      { status: 422 }
    )
  }

  const updates: { is_active?: boolean; mode?: 'daily' | 'template' } = {}
  if (is_active !== undefined) updates.is_active = is_active
  if (mode !== undefined) updates.mode = mode

  const { data, error } = await supabase
    .from('user_meal_config')
    .update(updates)
    .eq('user_id', user.id)
    .eq('meal_type', meal_type)
    .select()
    .single()

  if (error) return Response.json({ error: error.message }, { status: 500 })

  return Response.json(data)
}

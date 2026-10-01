import { createClient } from '@/lib/supabase/server'

import { DEFAULT_MEAL_CONFIGS } from '@/lib/constants/meal-type'


export async function GET() {
  const supabase = await createClient()

  const { data: { user } } = await supabase.auth.getUser()
  if (!user) return Response.json({ error: 'Non authentifié' }, { status: 401 })

  const { data, error } = await supabase
    .from('user_meal_config')
    .select('*')
    .eq('user_id', user.id)

  if (error) return Response.json({ error: error.message }, { status: 500 })

  if (!data || data.length === 0) {
    const { data: inserted, error: insertError } = await supabase
      .from('user_meal_config')
      .insert(DEFAULT_MEAL_CONFIGS.map((c) => ({ ...c, user_id: user.id })))
      .select()

    if (insertError) return Response.json({ error: insertError.message }, { status: 500 })
    return Response.json(sortByMealType(inserted ?? []))
  }

  return Response.json(sortByMealType(data))
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

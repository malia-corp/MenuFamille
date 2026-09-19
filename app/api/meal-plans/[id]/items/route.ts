import { createClient } from '@/lib/supabase/server'
import { NextRequest } from 'next/server'

export async function POST(
  request: NextRequest,
  { params }: { params: { id: string } }
) {
  const supabase = await createClient()
  const { data: { user } } = await supabase.auth.getUser()
  if (!user) return Response.json({ error: 'Non authentifié' }, { status: 401 })

  const { data: plan } = await supabase
    .from('meal_plans')
    .select('id')
    .eq('id', params.id)
    .eq('user_id', user.id)
    .maybeSingle()

  if (!plan) return Response.json({ error: 'Plan introuvable ou accès refusé' }, { status: 404 })

  const { day_of_week, meal_type, recipe_id, servings, applies_all_days } = await request.json()
  if (!day_of_week || !meal_type) {
    return Response.json({ error: 'day_of_week et meal_type sont requis' }, { status: 400 })
  }

  const ITEM_SELECT = `
    id, day_of_week, meal_type, applies_all_days, servings, is_locked, sort_order,
    recipes ( id, name, photo_url, prep_time_min, cook_time_min, categories ( icon ) ),
    meal_compositions ( id, role, sort_order, recipe_id, recipes ( id, name ) )
  `

  const { data: existing } = await supabase
    .from('meal_plan_items')
    .select('id')
    .eq('meal_plan_id', params.id)
    .eq('day_of_week', day_of_week)
    .eq('meal_type', meal_type)
    .eq('applies_all_days', applies_all_days ?? false)
    .maybeSingle()

  if (existing) {
    const { data, error } = await supabase
      .from('meal_plan_items')
      .update({ recipe_id: recipe_id ?? null, servings: servings ?? 4 })
      .eq('id', existing.id)
      .select(ITEM_SELECT)
      .single()

    if (error) return Response.json({ error: error.message }, { status: 500 })
    return Response.json(data)
  }

  const { data, error } = await supabase
    .from('meal_plan_items')
    .insert({
      meal_plan_id:    params.id,
      day_of_week,
      meal_type,
      applies_all_days: applies_all_days ?? false,
      recipe_id:       recipe_id ?? null,
      servings:        servings ?? 4,
    })
    .select(ITEM_SELECT)
    .single()

  if (error) return Response.json({ error: error.message }, { status: 500 })
  return Response.json(data, { status: 201 })
}

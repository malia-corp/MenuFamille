import { createClient } from '@/lib/supabase/server'
import { NextRequest } from 'next/server'

export async function PATCH(
  request: NextRequest,
  { params }: { params: { id: string; itemId: string } }
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

  const { recipe_id } = await request.json()
  if (!recipe_id) return Response.json({ error: 'recipe_id requis' }, { status: 400 })

  const { data, error } = await supabase
    .from('meal_plan_items')
    .update({ recipe_id })
    .eq('id', params.itemId)
    .eq('meal_plan_id', params.id)
    .select(`
      id, day_of_week, meal_type, applies_all_days, servings, is_locked, sort_order,
      recipes ( id, name, photo_url, prep_time_min, cook_time_min, categories ( icon ) ),
      meal_compositions ( id, role, sort_order, recipe_id )
    `)
    .single()

  if (error) return Response.json({ error: error.message }, { status: 500 })
  return Response.json(data)
}

export async function DELETE(
  _request: NextRequest,
  { params }: { params: { id: string; itemId: string } }
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

  const { error } = await supabase
    .from('meal_plan_items')
    .delete()
    .eq('id', params.itemId)
    .eq('meal_plan_id', params.id)

  if (error) return Response.json({ error: error.message }, { status: 500 })
  return new Response(null, { status: 204 })
}

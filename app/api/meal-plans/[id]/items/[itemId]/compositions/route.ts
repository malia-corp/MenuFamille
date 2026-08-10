import { createClient } from '@/lib/supabase/server'
import { NextRequest } from 'next/server'

const ITEM_SELECT = `
  id, day_of_week, meal_type, applies_all_days, servings, is_locked, sort_order,
  recipes ( id, name, photo_url, prep_time_min, cook_time_min, categories ( icon ) ),
  meal_compositions ( id, role, sort_order, recipe_id, recipes ( id, name ) )
`

export async function POST(
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

  const { recipe_id, role } = await request.json()
  if (!recipe_id || !['side', 'drink'].includes(role)) {
    return Response.json({ error: 'recipe_id et role (side|drink) requis' }, { status: 400 })
  }

  // Calcul sort_order : max existant + 1
  const { data: existing } = await supabase
    .from('meal_compositions')
    .select('sort_order')
    .eq('meal_plan_item_id', params.itemId)
    .order('sort_order', { ascending: false })
    .limit(1)

  const sort_order = existing?.[0]?.sort_order != null ? existing[0].sort_order + 1 : 0

  const { error: insertErr } = await supabase
    .from('meal_compositions')
    .insert({ meal_plan_item_id: params.itemId, recipe_id, role, sort_order })

  if (insertErr) return Response.json({ error: insertErr.message }, { status: 500 })

  const { data, error } = await supabase
    .from('meal_plan_items')
    .select(ITEM_SELECT)
    .eq('id', params.itemId)
    .single()

  if (error) return Response.json({ error: error.message }, { status: 500 })
  return Response.json(data, { status: 201 })
}

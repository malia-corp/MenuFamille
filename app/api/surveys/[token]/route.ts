import { createServiceClient } from '@/lib/supabase/service'
import { composedName } from '@/lib/utils/composed-name'

export async function GET(
  _: Request,
  { params }: { params: { token: string } }
) {
  const supabase = createServiceClient()

  const { data: plan } = await supabase
    .from('meal_plans')
    .select(`
      id, week_start,
      meal_plan_items (
        id, meal_type, day_of_week, applies_all_days,
        recipes ( name ),
        meal_compositions ( role, sort_order, recipes ( name ) )
      )
    `)
    .eq('share_token', params.token)
    .gt('token_expires_at', new Date().toISOString())
    .maybeSingle()

  if (!plan) {
    return Response.json({ error: 'Sondage introuvable ou expiré' }, { status: 404 })
  }

  type RawComposition = { role: string; sort_order: number; recipes: { name: string } | null }
  type RawItem = {
    id: string
    meal_type: string
    day_of_week: string
    applies_all_days: boolean
    recipes: { name: string } | null
    meal_compositions: RawComposition[]
  }

  const items = (plan.meal_plan_items as unknown as RawItem[]).map(i => ({
    id:               i.id,
    meal_type:        i.meal_type,
    day_of_week:      i.day_of_week,
    applies_all_days: i.applies_all_days,
    recipe_name:      composedName(i.recipes?.name, i.meal_compositions),
  }))

  return Response.json({ plan_id: plan.id, week_start: plan.week_start, items })
}

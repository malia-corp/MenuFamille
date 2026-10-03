import { NextRequest } from 'next/server'
import { createClient } from '@/lib/supabase/server'
import { createServiceClient } from '@/lib/supabase/service'

// Historique de MES avis post-repas (tous menus confondus, du plus récent au
// plus ancien) — accessible même à un membre désactivé : ce sont ses propres
// données. ?plan=<id> : limité aux repas de ce menu.
export async function GET(request: NextRequest) {
  const supabase = await createClient()
  const { data: { user } } = await supabase.auth.getUser()
  if (!user) return Response.json({ error: 'Non authentifié' }, { status: 401 })

  const planId = request.nextUrl.searchParams.get('plan')
  const limit  = Math.min(Number(request.nextUrl.searchParams.get('limit')) || 50, 100)

  // Client service filtré sur user_id = soi : les repas du menu de la
  // planificatrice ne sont pas lisibles par la session d'un membre.
  const service = createServiceClient()
  let query = service
    .from('meal_feedback')
    .select(`
      id, rating, custom_message, created_at, meal_plan_item_id,
      feedback_templates ( message ),
      meal_plan_items!inner (
        id, day_of_week, meal_type, applies_all_days, meal_plan_id,
        recipes ( name, photo_url ),
        meal_compositions ( role, sort_order, recipes ( name ) ),
        meal_plans ( week_start )
      )
    `)
    .eq('user_id', user.id)
    .order('created_at', { ascending: false })
    .limit(limit)
  if (planId) query = query.eq('meal_plan_items.meal_plan_id', planId)

  const { data, error } = await query
  if (error) return Response.json({ error: error.message }, { status: 500 })

  type RawItem = {
    id: string; day_of_week: string; meal_type: string; applies_all_days: boolean; meal_plan_id: string
    recipes: { name: string; photo_url: string | null } | null
    meal_compositions: { role: string; sort_order: number; recipes: { name: string } | null }[]
    meal_plans: { week_start: string } | null
  }

  return Response.json((data ?? []).map((f) => {
    const item     = f.meal_plan_items as unknown as RawItem
    const template = (f.feedback_templates as unknown as { message: string } | null)?.message ?? null
    return {
      id:                f.id,
      meal_plan_item_id: f.meal_plan_item_id,
      rating:            f.rating,
      template_message:  template,
      custom_message:    f.custom_message,
      message:           f.custom_message ?? template,
      created_at:        f.created_at,
      week_start:        item.meal_plans?.week_start ?? null,
      item: {
        id:                item.id,
        day_of_week:       item.day_of_week,
        meal_type:         item.meal_type,
        applies_all_days:  item.applies_all_days,
        recipes:           item.recipes,
        meal_compositions: item.meal_compositions ?? [],
      },
    }
  }))
}

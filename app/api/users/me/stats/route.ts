import { createClient } from '@/lib/supabase/server'
import { agreementPct, type ReactionCounts } from '@/lib/utils/survey-score'

// "Mon impact" du profil : recettes partagées (visibles hors de soi), repas
// planifiés et approbation de la tablée (part de votes "d'accord" sur tous
// les sondages de ses menus), tous plans confondus. Pour le cercle : repas
// notés ce mois-ci et plats favoris.
export async function GET() {
  const supabase = await createClient()
  const { data: { user } } = await supabase.auth.getUser()
  if (!user) return Response.json({ error: 'Non authentifié' }, { status: 401 })

  const now        = new Date()
  const monthStart = new Date(now.getFullYear(), now.getMonth(), 1).toISOString()

  const [shared, planned, answers, rated, favorites] = await Promise.all([
    supabase
      .from('recipes')
      .select('id', { count: 'exact', head: true })
      .eq('user_id', user.id)
      .neq('visibility', 'private'),
    supabase
      .from('meal_plan_items')
      .select('id, meal_plans!inner(user_id)', { count: 'exact', head: true })
      .eq('meal_plans.user_id', user.id),
    supabase
      .from('survey_answers')
      .select('reaction, survey_responses!inner(meal_plans!inner(user_id))')
      .eq('survey_responses.meal_plans.user_id', user.id),
    supabase
      .from('meal_feedback')
      .select('id', { count: 'exact', head: true })
      .eq('user_id', user.id)
      .gte('created_at', monthStart),
    supabase
      .from('recipe_favorites')
      .select('id', { count: 'exact', head: true })
      .eq('user_id', user.id),
  ])

  for (const r of [shared, planned, answers, rated, favorites]) {
    if (r.error) return Response.json({ error: r.error.message }, { status: 500 })
  }

  const counts: ReactionCounts = { aime: 0, bof: 0, naime_pas: 0 }
  for (const a of answers.data ?? []) {
    if (a.reaction in counts) counts[a.reaction as keyof ReactionCounts]++
  }

  return Response.json({
    recipes_shared: shared.count ?? 0,
    meals_planned:  planned.count ?? 0,
    approval_pct:   agreementPct(counts),
    meals_rated_month: rated.count ?? 0,
    favorites_count:   favorites.count ?? 0,
  })
}

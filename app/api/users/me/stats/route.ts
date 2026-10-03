import { createClient } from '@/lib/supabase/server'
import { agreementPct, type ReactionCounts } from '@/lib/utils/survey-score'

// "Mon impact" du profil : recettes partagées (visibles hors de soi), repas
// planifiés et approbation de la tablée (part de votes "d'accord" sur tous
// les sondages de ses menus), tous plans confondus.
export async function GET() {
  const supabase = await createClient()
  const { data: { user } } = await supabase.auth.getUser()
  if (!user) return Response.json({ error: 'Non authentifié' }, { status: 401 })

  const [shared, planned, answers] = await Promise.all([
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
  ])

  if (shared.error)  return Response.json({ error: shared.error.message }, { status: 500 })
  if (planned.error) return Response.json({ error: planned.error.message }, { status: 500 })
  if (answers.error) return Response.json({ error: answers.error.message }, { status: 500 })

  const counts: ReactionCounts = { aime: 0, bof: 0, naime_pas: 0 }
  for (const a of answers.data ?? []) {
    if (a.reaction in counts) counts[a.reaction as keyof ReactionCounts]++
  }

  return Response.json({
    recipes_shared: shared.count ?? 0,
    meals_planned:  planned.count ?? 0,
    approval_pct:   agreementPct(counts),
  })
}

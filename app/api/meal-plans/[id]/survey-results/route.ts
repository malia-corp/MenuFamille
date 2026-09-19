import { createClient } from '@/lib/supabase/server'
import { NextRequest } from 'next/server'
import { composedName } from '@/lib/utils/composed-name'

export async function GET(
  _: NextRequest,
  { params }: { params: { id: string } }
) {
  const supabase = await createClient()
  const { data: { user } } = await supabase.auth.getUser()
  if (!user) return Response.json({ error: 'Non authentifié' }, { status: 401 })

  // Vérifier ownership du plan
  const { data: plan } = await supabase
    .from('meal_plans')
    .select('id, share_token')
    .eq('id', params.id)
    .eq('user_id', user.id)
    .maybeSingle()

  if (!plan) return Response.json({ error: 'Plan introuvable' }, { status: 404 })

  // Récupérer les réponses avec leurs answers
  const { data: responses } = await supabase
    .from('survey_responses')
    .select(`
      id, respondent_name, created_at,
      survey_answers ( meal_plan_item_id, reaction, comment )
    `)
    .eq('meal_plan_id', params.id)

  const responseList = responses ?? []

  // Récupérer les items du plan pour le contexte
  const { data: items } = await supabase
    .from('meal_plan_items')
    .select('id, meal_type, day_of_week, applies_all_days, recipes ( name ), meal_compositions ( role, sort_order, recipes ( name ) )')
    .eq('meal_plan_id', params.id)

  const itemList = items ?? []

  // Agréger par item
  type Reaction = 'aime' | 'bof' | 'naime_pas'
  type Comment  = { respondent_name: string; comment: string; created_at: string }

  const byItem = new Map<string, { aime: number; bof: number; naime_pas: number; comments: Comment[] }>()

  for (const item of itemList) {
    byItem.set(item.id, { aime: 0, bof: 0, naime_pas: 0, comments: [] })
  }

  let commentCount = 0
  const ratedItemIds = new Set<string>()

  for (const resp of responseList) {
    type RawAnswer = { meal_plan_item_id: string; reaction: Reaction; comment: string | null }
    for (const answer of (resp.survey_answers as unknown as RawAnswer[])) {
      const agg = byItem.get(answer.meal_plan_item_id)
      if (!agg) continue

      agg[answer.reaction]++
      ratedItemIds.add(answer.meal_plan_item_id)

      if (answer.comment?.trim()) {
        agg.comments.push({
          respondent_name: resp.respondent_name,
          comment:         answer.comment.trim(),
          created_at:      resp.created_at,
        })
        commentCount++
      }
    }
  }

  const itemResults = itemList.map(item => {
    const agg = byItem.get(item.id) ?? { aime: 0, bof: 0, naime_pas: 0, comments: [] }
    type RawRecipe = { name: string } | null
    type RawComp = { role: string; sort_order: number; recipes: { name: string } | null }
    return {
      id:               item.id,
      meal_type:        item.meal_type,
      day_of_week:      item.day_of_week,
      applies_all_days: item.applies_all_days,
      recipe_name:      composedName(
        (item.recipes as unknown as RawRecipe)?.name,
        item.meal_compositions as unknown as RawComp[]
      ),
      aime:             agg.aime,
      bof:              agg.bof,
      naime_pas:        agg.naime_pas,
      comments:         agg.comments,
    }
  })

  return Response.json({
    share_token:         plan.share_token,
    respondent_count:    responseList.length,
    rated_items_count:   ratedItemIds.size,
    comment_count:       commentCount,
    items:               itemResults,
  })
}

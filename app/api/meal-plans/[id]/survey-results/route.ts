import { createClient } from '@/lib/supabase/server'
import { NextRequest } from 'next/server'
import { composedName } from '@/lib/utils/composed-name'
import { agreementPct, sumCounts, type ReactionCounts } from '@/lib/utils/survey-score'

type Reaction = 'aime' | 'bof' | 'naime_pas'
type RawAnswer = { meal_plan_item_id: string; reaction: Reaction; comment: string | null }
type RawRecipe = { name: string; photo_url: string | null; description: string | null } | null
type RawComp   = { role: string; sort_order: number; recipes: { name: string } | null }

export async function GET(
  _: NextRequest,
  { params }: { params: { id: string } }
) {
  const supabase = await createClient()
  const { data: { user } } = await supabase.auth.getUser()
  if (!user) return Response.json({ error: 'Non authentifié' }, { status: 401 })

  const { data: plan } = await supabase
    .from('meal_plans')
    .select('id, share_token, week_start')
    .eq('id', params.id)
    .eq('user_id', user.id)
    .maybeSingle()

  if (!plan) return Response.json({ error: 'Plan introuvable' }, { status: 404 })

  const [{ data: responses }, { data: items }, { data: membership }] = await Promise.all([
    supabase
      .from('survey_responses')
      .select('id, respondent_name, created_at, survey_answers ( meal_plan_item_id, reaction, comment )')
      .eq('meal_plan_id', params.id),
    supabase
      .from('meal_plan_items')
      .select('id, meal_type, day_of_week, applies_all_days, recipes ( name, photo_url, description ), meal_compositions ( role, sort_order, recipes ( name ) )')
      .eq('meal_plan_id', params.id),
    // Premier cercle de la planificatrice (meme pattern que getViewer / page d'accueil)
    supabase
      .from('family_circle_members')
      .select('family_circles ( family_circle_members ( id ) )')
      .eq('user_id', user.id)
      .order('joined_at')
      .limit(1)
      .maybeSingle(),
  ])

  const responseList = responses ?? []
  const itemList     = items ?? []
  const circle       = membership?.family_circles as { family_circle_members: { id: string }[] } | null
  const memberCount  = circle?.family_circle_members?.length ?? 1

  type Comment = { respondent_name: string; comment: string; created_at: string }
  const byItem = new Map<string, ReactionCounts & { comments: Comment[] }>()
  for (const item of itemList) byItem.set(item.id, { aime: 0, bof: 0, naime_pas: 0, comments: [] })

  let commentCount = 0
  const ratedItemIds = new Set<string>()

  for (const resp of responseList) {
    for (const answer of (resp.survey_answers as unknown as RawAnswer[])) {
      const agg = byItem.get(answer.meal_plan_item_id)
      if (!agg) continue
      agg[answer.reaction]++
      ratedItemIds.add(answer.meal_plan_item_id)
      if (answer.comment?.trim()) {
        agg.comments.push({ respondent_name: resp.respondent_name, comment: answer.comment.trim(), created_at: resp.created_at })
        commentCount++
      }
    }
  }

  const itemResults = itemList.map(item => {
    const agg    = byItem.get(item.id) ?? { aime: 0, bof: 0, naime_pas: 0, comments: [] }
    const recipe = item.recipes as unknown as RawRecipe
    const comps  = (item.meal_compositions as unknown as RawComp[]) ?? []
    const sorted = [...comps].sort((a, b) => a.sort_order - b.sort_order)
    return {
      id:               item.id,
      meal_type:        item.meal_type,
      day_of_week:      item.day_of_week,
      applies_all_days: item.applies_all_days,
      recipe_name:      composedName(recipe?.name, comps),
      photo_url:        recipe?.photo_url ?? null,
      description:      recipe?.description ?? null,
      side_names:       sorted.filter(c => c.role === 'side' && c.recipes).map(c => c.recipes!.name),
      drink_name:       sorted.find(c => c.role === 'drink' && c.recipes)?.recipes?.name ?? null,
      aime:             agg.aime,
      bof:              agg.bof,
      naime_pas:        agg.naime_pas,
      comments:         agg.comments,
    }
  })

  const respondents = responseList
    .map(r => ({ name: r.respondent_name, voted_at: r.created_at }))
    .sort((a, b) => b.voted_at.localeCompare(a.voted_at))

  return Response.json({
    // Contrat de la vue Planificatrice
    global_score:      agreementPct(sumCounts(itemResults)),
    total_respondents: responseList.length,
    per_item: itemResults.map(i => ({
      meal_plan_item_id: i.id,
      reaction_counts:   { aime: i.aime, bof: i.bof, naime_pas: i.naime_pas },
      comments:          i.comments.map(c => ({ name: c.respondent_name, text: c.comment })),
    })),
    // Contexte d'affichage
    week_start:        plan.week_start,
    member_count:      memberCount,
    respondents,
    // Champs historiques (accueil, /plan/validate)
    share_token:       plan.share_token,
    respondent_count:  responseList.length,
    rated_items_count: ratedItemIds.size,
    comment_count:     commentCount,
    items:             itemResults,
  })
}

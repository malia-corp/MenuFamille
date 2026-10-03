import { createClient } from '@/lib/supabase/server'
import { NextRequest } from 'next/server'
import {
  aggregateSurvey, RESULT_ITEMS_SELECT, RESULT_RESPONSES_SELECT,
  type RawResultItem, type RawResultResponse,
} from '@/lib/utils/survey-results'

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
    supabase.from('survey_responses').select(RESULT_RESPONSES_SELECT).eq('meal_plan_id', params.id),
    supabase.from('meal_plan_items').select(RESULT_ITEMS_SELECT).eq('meal_plan_id', params.id),
    // Premier cercle de la planificatrice (meme pattern que getViewer / page d'accueil)
    supabase
      .from('family_circle_members')
      .select('family_circles ( family_circle_members ( id ) )')
      .eq('user_id', user.id)
      .order('joined_at')
      .limit(1)
      .maybeSingle(),
  ])

  const responseList = (responses ?? []) as unknown as RawResultResponse[]
  const circle       = membership?.family_circles as { family_circle_members: { id: string }[] } | null
  const agg          = aggregateSurvey((items ?? []) as unknown as RawResultItem[], responseList)

  return Response.json({
    // Contrat de la vue Planificatrice
    global_score:      agg.globalScore,
    total_respondents: responseList.length,
    per_item: agg.itemResults.map(i => ({
      meal_plan_item_id: i.id,
      reaction_counts:   { aime: i.aime, bof: i.bof, naime_pas: i.naime_pas },
      comments:          i.comments.map(c => ({ name: c.respondent_name, text: c.comment })),
    })),
    // Contexte d'affichage
    week_start:        plan.week_start,
    member_count:      circle?.family_circle_members?.length ?? 1,
    respondents:       agg.respondents,
    // Champs historiques (accueil, /plan/validate)
    share_token:       plan.share_token,
    respondent_count:  responseList.length,
    rated_items_count: agg.ratedItemsCount,
    comment_count:     agg.commentCount,
    items:             agg.itemResults,
  })
}

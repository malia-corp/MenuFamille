import { createClient } from '@/lib/supabase/server'
import { createServiceClient } from '@/lib/supabase/service'
import { NextRequest } from 'next/server'
import { sharedCircleId } from '@/lib/utils/circle-access'
import {
  aggregateSurvey, RESULT_ITEMS_SELECT, RESULT_RESPONSES_SELECT,
  type RawResultItem, type RawResultResponse, type Reaction,
} from '@/lib/utils/survey-results'

// Vue Membre : agrégats uniquement, aucun commentaire ni réaction nominative
// des autres. La seule réaction individuelle renvoyée est celle du demandeur.
export async function GET(
  _: NextRequest,
  { params }: { params: { id: string } }
) {
  const { data: { user } } = await (await createClient()).auth.getUser()
  if (!user) return Response.json({ error: 'Non authentifié' }, { status: 401 })

  // Les membres n'ont pas accès au plan via RLS : lecture service après
  // contrôle explicite d'appartenance au même cercle que la planificatrice.
  const service = createServiceClient()
  const { data: plan } = await service
    .from('meal_plans')
    .select('id, user_id, week_start, share_token')
    .eq('id', params.id)
    .maybeSingle()

  if (!plan || !plan.share_token) return Response.json({ error: 'Sondage introuvable' }, { status: 404 })

  const circleId = await sharedCircleId(service, user.id, plan.user_id)
  if (!circleId) return Response.json({ error: 'Sondage introuvable' }, { status: 404 })

  const [{ data: responses }, { data: items }, { count: memberCount }] = await Promise.all([
    service.from('survey_responses').select(RESULT_RESPONSES_SELECT).eq('meal_plan_id', plan.id),
    service.from('meal_plan_items').select(RESULT_ITEMS_SELECT).eq('meal_plan_id', plan.id),
    service.from('family_circle_members').select('id', { count: 'exact', head: true }).eq('circle_id', circleId),
  ])

  const responseList = (responses ?? []) as unknown as RawResultResponse[]
  const agg          = aggregateSurvey((items ?? []) as unknown as RawResultItem[], responseList)

  const myReactions = new Map<string, Reaction>()
  for (const r of responseList.filter(r => r.user_id === user.id)) {
    for (const a of (r.survey_answers as { meal_plan_item_id: string; reaction: Reaction }[]) ?? []) {
      myReactions.set(a.meal_plan_item_id, a.reaction)
    }
  }

  const voterNames = Array.from(new Set(responseList.map(r => r.respondent_name.trim()).filter(Boolean)))

  return Response.json({
    // Contrat de la vue Membre
    global_score:      agg.globalScore,
    total_respondents: responseList.length,
    per_item: agg.itemResults.map(i => ({
      meal_plan_item_id: i.id,
      reaction_counts:   { aime: i.aime, bof: i.bof, naime_pas: i.naime_pas },
      my_reaction:       myReactions.get(i.id) ?? null,
    })),
    // Contexte d'affichage (sans commentaires)
    week_start:   plan.week_start,
    member_count: memberCount ?? 1,
    voter_names:  voterNames,
    has_voted:    myReactions.size > 0,
    share_token:  plan.share_token,
    items:        agg.itemResults.map(i => ({ ...i, comments: [] })),
  })
}

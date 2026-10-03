import { createServiceClient } from '@/lib/supabase/service'
import { createClient } from '@/lib/supabase/server'
import { resolveSurveyPlan } from '@/lib/utils/survey-token'

interface RawComposition {
  id:         string
  role:       'side' | 'drink'
  sort_order: number
  recipes:    { name: string } | null
}

interface RawItem {
  id:                string
  day_of_week:       string
  meal_type:          string
  applies_all_days:  boolean
  servings:          number
  recipes: {
    id:            string
    name:          string
    photo_url:     string | null
    description:   string | null
    prep_time_min: number | null
    categories:    { icon: string | null; name: string } | null
  } | null
  meal_compositions: RawComposition[]
}

export async function GET(
  request: Request,
  { params }: { params: { token: string } }
) {
  const resolved = await resolveSurveyPlan(params.token)

  if (resolved.status === 'not_found') {
    return Response.json({ error: 'Sondage introuvable' }, { status: 404 })
  }
  if (resolved.status === 'expired') {
    return Response.json({ error: 'Ce lien a expiré' }, { status: 410 })
  }

  const { plan } = resolved
  const supabase = createServiceClient()

  const { data: planData, error } = await supabase
    .from('meal_plans')
    .select(`
      id, week_start, circle_id,
      meal_plan_items (
        id, day_of_week, meal_type, applies_all_days, servings,
        recipes ( id, name, photo_url, description, prep_time_min, categories ( icon, name ) ),
        meal_compositions ( id, role, sort_order, recipes ( name ) )
      )
    `)
    .eq('id', plan.id)
    .single()

  if (error || !planData) {
    return Response.json({ error: 'Sondage introuvable' }, { status: 404 })
  }

  // Nom de la planificatrice + nom du cercle du menu (meal_plans.circle_id,
  // renseigné depuis la migration w) ; à défaut, le premier cercle de
  // l'auteur du menu.
  const [{ data: owner }, { data: circle }, { data: membership }] = await Promise.all([
    supabase.from('users').select('display_name').eq('id', plan.user_id).maybeSingle(),
    planData.circle_id
      ? supabase.from('family_circles').select('name').eq('id', planData.circle_id).maybeSingle()
      : Promise.resolve({ data: null }),
    supabase
      .from('family_circle_members')
      .select('family_circles ( name )')
      .eq('user_id', plan.user_id)
      .order('joined_at')
      .limit(1)
      .maybeSingle(),
  ])

  const planner_name = owner?.display_name ?? null
  const family_name  = circle?.name ?? (membership?.family_circles as { name: string } | null)?.name ?? null

  const items = ((planData.meal_plan_items ?? []) as unknown as RawItem[]).map(i => ({
    id:                i.id,
    day_of_week:       i.day_of_week,
    meal_type:         i.meal_type,
    applies_all_days:  i.applies_all_days,
    servings:          i.servings,
    recipe: i.recipes ? {
      id:            i.recipes.id,
      name:          i.recipes.name,
      photo_url:     i.recipes.photo_url,
      description:   i.recipes.description,
      prep_time_min: i.recipes.prep_time_min,
      category: i.recipes.categories ? {
        icon: i.recipes.categories.icon,
        name: i.recipes.categories.name,
      } : null,
    } : null,
    compositions: i.meal_compositions.map(c => ({
      id:   c.id,
      role: c.role,
      name: c.recipes?.name ?? null,
    })),
  }))

  // Reponse existante : via le response_id connu du navigateur (localStorage),
  // sinon, si le visiteur est connecte, via sa reponse rattachee a son compte
  // (meme membre sur un autre appareil).
  let existing_response: {
    id:             string
    respondent_name: string
    answers:        { item_id: string; reaction: string; comment: string | null }[]
  } | null = null

  const RESPONSE_SELECT = 'id, respondent_name, survey_answers ( meal_plan_item_id, reaction, comment )'
  const responseId = new URL(request.url).searchParams.get('response_id')
  let response = responseId
    ? (await supabase.from('survey_responses').select(RESPONSE_SELECT).eq('id', responseId).eq('meal_plan_id', plan.id).maybeSingle()).data
    : null

  if (!response) {
    const { data: { user } } = await (await createClient()).auth.getUser()
    if (user) {
      response = (await supabase
        .from('survey_responses')
        .select(RESPONSE_SELECT)
        .eq('meal_plan_id', plan.id)
        .eq('user_id', user.id)
        .order('created_at')
        .limit(1)
        .maybeSingle()).data
    }
  }

  if (response) {
    type RawAnswer = { meal_plan_item_id: string; reaction: string; comment: string | null }
    existing_response = {
      id:              response.id,
      respondent_name: response.respondent_name,
      answers: ((response.survey_answers ?? []) as unknown as RawAnswer[]).map(a => ({
        item_id:  a.meal_plan_item_id,
        reaction: a.reaction,
        comment:  a.comment,
      })),
    }
  }

  return Response.json({
    plan: { id: planData.id, week_start: planData.week_start, planner_name, family_name },
    items,
    existing_response,
  })
}

import { createServiceClient } from '@/lib/supabase/service'
import { createClient } from '@/lib/supabase/server'
import { resolveSurveyPlan } from '@/lib/utils/survey-token'
import { isDeactivatedForPlanner } from '@/lib/utils/circle-access'
import { NextRequest } from 'next/server'

export async function POST(
  request: NextRequest,
  { params }: { params: { token: string; itemId: string } }
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

  // L'item doit appartenir au plan designe par ce token — sans ca, un
  // itemId d'un autre plan ne serait bloque que par la contrainte FK, pas
  // par une verification applicative explicite.
  const { data: item } = await supabase
    .from('meal_plan_items')
    .select('id')
    .eq('id', params.itemId)
    .eq('meal_plan_id', plan.id)
    .maybeSingle()

  if (!item) {
    return Response.json({ error: 'Repas introuvable pour ce sondage' }, { status: 404 })
  }

  const ip =
    request.headers.get('x-forwarded-for')?.split(',')[0]?.trim() ??
    request.headers.get('x-real-ip') ??
    'unknown'

  // Rate limiting : 10 réponses par IP par heure
  const oneHourAgo = new Date(Date.now() - 60 * 60 * 1000).toISOString()
  const { count } = await supabase
    .from('survey_responses')
    .select('id', { count: 'exact', head: true })
    .eq('ip_address', ip)
    .gte('created_at', oneHourAgo)

  if ((count ?? 0) >= 10) {
    return Response.json(
      { error: 'Trop de réponses envoyées. Réessayez dans une heure.' },
      { status: 429 }
    )
  }

  const body = await request.json()
  const { respondent_name, reaction, comment, response_id } = body as {
    respondent_name: string
    reaction: 'aime' | 'bof' | 'naime_pas'
    comment?: string
    response_id?: string
  }

  if (!respondent_name?.trim() || !reaction) {
    return Response.json({ error: 'respondent_name et reaction sont requis' }, { status: 400 })
  }

  // Lien public : le répondant peut être anonyme. S'il est connecté (membre
  // du cercle), sa réponse est rattachée à son compte pour la vue Membre.
  const { data: { user } } = await (await createClient()).auth.getUser()

  // Membre désactivé par la planificatrice : ne vote plus sur ses menus.
  if (user && await isDeactivatedForPlanner(supabase, user.id, plan.user_id)) {
    return Response.json(
      { error: 'Ton accès à ce cercle est désactivé : tu ne peux plus voter.' },
      { status: 403 }
    )
  }

  // Votant connecté : le nom affiché est celui de son profil, quel que soit
  // ce qu'envoie le client (le champ est verrouillé côté page).
  let displayName = respondent_name.trim()
  if (user) {
    const { data: profile } = await supabase.from('users').select('display_name').eq('id', user.id).maybeSingle()
    if (profile?.display_name?.trim()) displayName = profile.display_name.trim()
  }

  let responseId: string | undefined

  if (response_id) {
    const { data: existing } = await supabase
      .from('survey_responses')
      .select('id, user_id')
      .eq('id', response_id)
      .eq('meal_plan_id', plan.id)
      .maybeSingle()
    // Réponse d'un autre compte : on ne la réutilise pas.
    if (existing && (!existing.user_id || !user || existing.user_id === user.id)) {
      responseId = existing.id
      if (user && !existing.user_id) {
        await supabase.from('survey_responses').update({ user_id: user.id }).eq('id', existing.id)
      }
    }
  }

  if (!responseId && user) {
    const { data: mine } = await supabase
      .from('survey_responses')
      .select('id')
      .eq('meal_plan_id', plan.id)
      .eq('user_id', user.id)
      .order('created_at')
      .limit(1)
      .maybeSingle()
    responseId = mine?.id
  }

  if (!responseId) {
    const { data: created, error: e } = await supabase
      .from('survey_responses')
      .insert({
        meal_plan_id:    plan.id,
        respondent_name: displayName,
        ip_address:      ip,
        user_id:         user?.id ?? null,
      })
      .select('id')
      .single()

    if (e || !created) {
      return Response.json({ error: 'Erreur création réponse' }, { status: 500 })
    }
    responseId = created.id
  }

  // Upsert survey_answer (contrainte unique response_id + meal_plan_item_id)
  const { error: answerErr } = await supabase
    .from('survey_answers')
    .upsert(
      {
        response_id:        responseId,
        meal_plan_item_id:  params.itemId,
        reaction,
        comment:            comment?.trim() || null,
      },
      { onConflict: 'response_id,meal_plan_item_id' }
    )

  if (answerErr) {
    return Response.json({ error: answerErr.message }, { status: 500 })
  }

  return Response.json({ response_id: responseId })
}

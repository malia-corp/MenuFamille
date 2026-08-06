import { createServiceClient } from '@/lib/supabase/service'
import { NextRequest } from 'next/server'

export async function POST(
  request: NextRequest,
  { params }: { params: { token: string; itemId: string } }
) {
  const supabase = createServiceClient()

  // Valider le token
  const { data: plan } = await supabase
    .from('meal_plans')
    .select('id')
    .eq('share_token', params.token)
    .gt('token_expires_at', new Date().toISOString())
    .maybeSingle()

  if (!plan) {
    return Response.json({ error: 'Sondage introuvable ou expiré' }, { status: 404 })
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

  let responseId = response_id

  // Créer une survey_response si elle n'existe pas encore
  if (!responseId) {
    const { data: created, error: e } = await supabase
      .from('survey_responses')
      .insert({
        meal_plan_id:    plan.id,
        respondent_name: respondent_name.trim(),
        ip_address:      ip,
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

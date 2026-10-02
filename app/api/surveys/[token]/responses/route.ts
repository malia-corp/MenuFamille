import { createServiceClient } from '@/lib/supabase/service'
import { resolveSurveyPlan } from '@/lib/utils/survey-token'
import { NextRequest } from 'next/server'

export async function POST(
  request: NextRequest,
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

  const { response_id } = await request.json() as { response_id: string }
  if (!response_id) {
    return Response.json({ error: 'response_id requis' }, { status: 400 })
  }

  // Vérifier que la réponse appartient bien à ce plan
  const { data: response } = await supabase
    .from('survey_responses')
    .select('id')
    .eq('id', response_id)
    .eq('meal_plan_id', plan.id)
    .maybeSingle()

  if (!response) {
    return Response.json({ error: 'Réponse introuvable' }, { status: 404 })
  }

  // La réponse est considérée complète dès qu'elle a ≥1 answer (pas de colonne completed_at).
  // Aucune infrastructure de notification in-app n'existe dans ce projet (pas de table
  // notifications) — le seul signal disponible reste /api/surveys/unread-count, deja
  // utilise cote planificatrice connectee.
  return Response.json({ ok: true })
}

import { createServiceClient } from '@/lib/supabase/service'
import { NextRequest } from 'next/server'

export async function POST(
  request: NextRequest,
  { params }: { params: { token: string } }
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

  // La réponse est considérée complète dès qu'elle a ≥1 answer (pas de colonne completed_at)
  // On retourne simplement OK — le badge in-app se rafraîchit via /api/surveys/unread-count
  return Response.json({ ok: true })
}

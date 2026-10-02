import { createServiceClient } from '@/lib/supabase/service'

export interface SurveyPlan {
  id:         string
  week_start: string
  user_id:    string
}

export type ResolveSurveyPlanResult =
  | { status: 'ok'; plan: SurveyPlan }
  | { status: 'not_found' }
  | { status: 'expired' }

// Source unique de validation d'un token de sondage public — un
// token_expires_at NULL signifie "n'expire jamais" (pas de date fixee a la
// creation du lien) ; avant ce fichier, page.tsx traitait NULL comme valide
// tandis que les 3 routes API filtraient `.gt('token_expires_at', now())`,
// qui exclut silencieusement une ligne dont la colonne est NULL (Postgres :
// `null > x` est toujours faux) — d'ou un 404 incoherent avec le rendu de
// la page. Toute route sondage doit passer par ici plutot que refaire sa
// propre requete + comparaison de date.
export async function resolveSurveyPlan(token: string): Promise<ResolveSurveyPlanResult> {
  const supabase = createServiceClient()

  const { data: plan } = await supabase
    .from('meal_plans')
    .select('id, week_start, user_id, token_expires_at')
    .eq('share_token', token)
    .maybeSingle()

  if (!plan) return { status: 'not_found' }

  if (plan.token_expires_at && new Date(plan.token_expires_at) <= new Date()) {
    return { status: 'expired' }
  }

  return { status: 'ok', plan: { id: plan.id, week_start: plan.week_start, user_id: plan.user_id } }
}

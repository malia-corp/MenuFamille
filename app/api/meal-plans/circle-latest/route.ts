import { createClient } from '@/lib/supabase/server'
import { createServiceClient } from '@/lib/supabase/service'
import { plannerIdsForUser } from '@/lib/utils/circle-access'
import { resolveActiveCircleId } from '@/lib/utils/active-circle'

// Dernier menu partagé (sondage ouvert) du cercle actif de l'utilisateur —
// point d'entrée de la vue Membre des résultats.
export async function GET() {
  const supabase = await createClient()
  const { data: { user } } = await supabase.auth.getUser()
  if (!user) return Response.json({ error: 'Non authentifié' }, { status: 401 })

  const service    = createServiceClient()
  const plannerIds = await plannerIdsForUser(service, user.id)
  if (plannerIds.length === 0) return Response.json({ id: null })

  const circleId = await resolveActiveCircleId(supabase, user.id)
  let query = service
    .from('meal_plans')
    .select('id')
    .in('user_id', plannerIds)
    .not('share_token', 'is', null)
  if (circleId) query = query.eq('circle_id', circleId)
  const { data: plan } = await query
    .order('week_start', { ascending: false })
    .limit(1)
    .maybeSingle()

  return Response.json({ id: plan?.id ?? null })
}

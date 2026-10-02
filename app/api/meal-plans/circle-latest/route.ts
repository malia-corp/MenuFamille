import { createClient } from '@/lib/supabase/server'
import { createServiceClient } from '@/lib/supabase/service'
import { plannerIdsForUser } from '@/lib/utils/circle-access'

// Dernier menu partagé (sondage ouvert) par une planificatrice du cercle de
// l'utilisateur — point d'entrée de la vue Membre des résultats.
export async function GET() {
  const { data: { user } } = await (await createClient()).auth.getUser()
  if (!user) return Response.json({ error: 'Non authentifié' }, { status: 401 })

  const service    = createServiceClient()
  const plannerIds = await plannerIdsForUser(service, user.id)
  if (plannerIds.length === 0) return Response.json({ id: null })

  const { data: plan } = await service
    .from('meal_plans')
    .select('id')
    .in('user_id', plannerIds)
    .not('share_token', 'is', null)
    .order('week_start', { ascending: false })
    .limit(1)
    .maybeSingle()

  return Response.json({ id: plan?.id ?? null })
}

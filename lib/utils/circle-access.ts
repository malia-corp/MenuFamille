import type { createServiceClient } from '@/lib/supabase/service'

type ServiceClient = ReturnType<typeof createServiceClient>

// Cercles où l'utilisateur est membre ACTIF : un membre désactivé par la
// planificatrice n'accède plus au menu, aux résultats ni aux votes du cercle.
async function circleIdsOf(service: ServiceClient, userId: string): Promise<string[]> {
  const { data } = await service
    .from('family_circle_members')
    .select('circle_id')
    .eq('user_id', userId)
    .eq('is_active', true)
    .order('joined_at')
  return (data ?? []).map(m => m.circle_id as string)
}

// Premier cercle commun aux deux comptes (ordre d'adhésion de userA), ou null.
export async function sharedCircleId(service: ServiceClient, userA: string, userB: string): Promise<string | null> {
  const [a, b] = await Promise.all([circleIdsOf(service, userA), circleIdsOf(service, userB)])
  return a.find(id => b.includes(id)) ?? null
}

// Planificatrices des cercles de l'utilisateur (lui compris s'il l'est).
export async function plannerIdsForUser(service: ServiceClient, userId: string): Promise<string[]> {
  const circleIds = await circleIdsOf(service, userId)
  if (circleIds.length === 0) return []
  const { data } = await service
    .from('family_circle_members')
    .select('user_id')
    .in('circle_id', circleIds)
    .eq('role', 'planificatrice')
  return Array.from(new Set((data ?? []).map(m => m.user_id as string)))
}

// Vote / avis d'un utilisateur connecté sur un menu de cette planificatrice :
// refusé s'il partage des cercles avec elle mais y est désactivé partout.
// Un votant extérieur (lien public, aucun cercle commun) reste autorisé.
export async function isDeactivatedForPlanner(service: ServiceClient, userId: string, plannerId: string): Promise<boolean> {
  if (userId === plannerId) return false
  const { data: plannerCircles } = await service
    .from('family_circle_members')
    .select('circle_id')
    .eq('user_id', plannerId)
    .eq('role', 'planificatrice')
  const ids = (plannerCircles ?? []).map(m => m.circle_id as string)
  if (ids.length === 0) return false
  const { data: mine } = await service
    .from('family_circle_members')
    .select('is_active')
    .eq('user_id', userId)
    .in('circle_id', ids)
  return (mine ?? []).length > 0 && !(mine ?? []).some(m => m.is_active)
}

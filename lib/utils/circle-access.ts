import type { createServiceClient } from '@/lib/supabase/service'

type ServiceClient = ReturnType<typeof createServiceClient>

async function circleIdsOf(service: ServiceClient, userId: string): Promise<string[]> {
  const { data } = await service
    .from('family_circle_members')
    .select('circle_id')
    .eq('user_id', userId)
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

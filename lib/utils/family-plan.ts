import type { SupabaseClient } from '@supabase/supabase-js'
import type { Database } from '@/lib/supabase/database.types'
import type { createServiceClient } from '@/lib/supabase/service'
import { resolveActiveCircleId } from '@/lib/utils/active-circle'

type SessionClient = SupabaseClient<Database>
type ServiceClient = ReturnType<typeof createServiceClient>

export interface FamilyContext {
  circleId:    string | null
  circleName:  string | null
  role:        'planificatrice' | 'membre' | null
  isActive:    boolean
  plannerId:   string | null
  plannerName: string | null   // prénom
}

// Contexte familial de l'utilisateur dans son cercle actif : son rôle, son
// statut, et la planificatrice dont il consulte les menus.
export async function familyContext(supabase: SessionClient, service: ServiceClient, userId: string): Promise<FamilyContext> {
  const empty: FamilyContext = { circleId: null, circleName: null, role: null, isActive: false, plannerId: null, plannerName: null }
  const circleId = await resolveActiveCircleId(supabase, userId)
  if (!circleId) return empty

  const [{ data: mine }, { data: planner }] = await Promise.all([
    service
      .from('family_circle_members')
      .select('role, is_active, family_circles ( name )')
      .eq('circle_id', circleId)
      .eq('user_id', userId)
      .maybeSingle(),
    service
      .from('family_circle_members')
      .select('user_id, users ( display_name )')
      .eq('circle_id', circleId)
      .eq('role', 'planificatrice')
      .order('joined_at')
      .limit(1)
      .maybeSingle(),
  ])
  if (!mine) return empty

  const role = mine.role as 'planificatrice' | 'membre'
  const plannerId = role === 'planificatrice' ? userId : (planner?.user_id ?? null)
  const fullName  = (planner?.users as { display_name: string } | null)?.display_name ?? null

  return {
    circleId,
    circleName:  (mine.family_circles as { name: string } | null)?.name ?? null,
    role,
    isActive:    mine.is_active !== false,
    plannerId,
    plannerName: fullName?.trim().split(/\s+/)[0] ?? null,
  }
}

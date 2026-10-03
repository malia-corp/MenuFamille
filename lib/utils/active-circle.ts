import type { SupabaseClient } from '@supabase/supabase-js'
import type { Database } from '@/lib/supabase/database.types'

type Client = SupabaseClient<Database>

// Cercle actif d'une utilisatrice : celui choisi (users.active_circle_id) s'il
// en est toujours membre, sinon le premier rejoint (comportement historique,
// cf. docs/ecarts-implementation.md #1). null = aucun cercle.
//
// Pilote toute l'app : page cercle, en-tête, accueil, profil, et les menus
// (meal_plans.circle_id, migration w) — menu de la semaine, menu du jour,
// planification, génération et allergènes pris en compte.
export async function resolveActiveCircleId(supabase: Client, userId: string): Promise<string | null> {
  const [{ data: profile }, { data: memberships }] = await Promise.all([
    supabase.from('users').select('active_circle_id').eq('id', userId).maybeSingle(),
    supabase.from('family_circle_members').select('circle_id').eq('user_id', userId).order('joined_at'),
  ])
  const ids = (memberships ?? []).map((m) => m.circle_id)
  const chosen = profile?.active_circle_id
  if (chosen && ids.includes(chosen)) return chosen
  return ids[0] ?? null
}

// Côté client : le cercle actif dans la réponse de GET /api/circles.
export function pickActiveCircle<T extends { id: string }>(
  res: { data?: T[]; active_circle_id?: string | null } | null | undefined,
): T | null {
  const list = res?.data ?? []
  return list.find((c) => c.id === res?.active_circle_id) ?? list[0] ?? null
}

import type { SupabaseClient } from '@supabase/supabase-js'
import type { Database } from '@/lib/supabase/database.types'

type Client = SupabaseClient<Database>

// Cercle actif d'une utilisatrice : celui choisi (users.active_circle_id) s'il
// en est toujours membre, sinon le premier rejoint (comportement historique,
// cf. docs/ecarts-implementation.md #1). null = aucun cercle.
//
// Le cercle actif se choisit explicitement (PUT /api/circles/active) ;
// sélectionner un cercle dans /circle ne fait que l'afficher.
// Ne concerne que l'affichage (page cercle, en-tête, accueil, profil) : la
// génération et les allergènes agrègent toujours tous les cercles.
export async function resolveActiveCircleId(supabase: Client, userId: string): Promise<string | null> {
  const [{ data: profile }, { data: memberships }] = await Promise.all([
    supabase.from('users').select('active_circle_id').eq('id', userId).maybeSingle(),
    supabase.from('family_circle_members').select('circle_id, is_active').eq('user_id', userId).order('joined_at'),
  ])
  const all    = memberships ?? []
  const active = all.filter((m) => m.is_active).map((m) => m.circle_id)
  const chosen = profile?.active_circle_id
  // Un cercle où l'on a été désactivé ne reste pas le cercle actif.
  if (chosen && active.includes(chosen)) return chosen
  return active[0] ?? all[0]?.circle_id ?? null
}

// Côté client : le cercle actif dans la réponse de GET /api/circles.
export function pickActiveCircle<T extends { id: string }>(
  res: { data?: T[]; active_circle_id?: string | null } | null | undefined,
): T | null {
  const list = res?.data ?? []
  return list.find((c) => c.id === res?.active_circle_id) ?? list[0] ?? null
}

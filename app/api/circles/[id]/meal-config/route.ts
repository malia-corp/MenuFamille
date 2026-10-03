import { createClient } from '@/lib/supabase/server'
import { createServiceClient } from '@/lib/supabase/service'
import { sortByMealType } from '@/lib/utils/sort-meal-configs'

// Moments de repas du cercle (lecture seule) : la configuration de la
// planificatrice, visible par tous les membres. La RLS de user_meal_config ne
// laisse lire que sa propre ligne : on vérifie l'appartenance au cercle, puis
// on lit via le client service.
export async function GET(
  _request: Request,
  { params }: { params: { id: string } }
) {
  const supabase = await createClient()
  const { data: { user } } = await supabase.auth.getUser()
  if (!user) return Response.json({ error: 'Non authentifié' }, { status: 401 })

  const { data: membership } = await supabase
    .from('family_circle_members')
    .select('id')
    .eq('circle_id', params.id)
    .eq('user_id', user.id)
    .maybeSingle()
  if (!membership) return Response.json({ error: 'Tu n\'es pas membre de ce cercle' }, { status: 403 })

  const service = createServiceClient()
  const { data: planner } = await service
    .from('family_circle_members')
    .select('user_id, users ( display_name )')
    .eq('circle_id', params.id)
    .eq('role', 'planificatrice')
    .order('joined_at')
    .limit(1)
    .maybeSingle()

  if (!planner) return Response.json({ planner_name: null, configs: [] })

  const { data: configs, error } = await service
    .from('user_meal_config')
    .select('meal_type, is_active, mode, default_time')
    .eq('user_id', planner.user_id)

  if (error) return Response.json({ error: error.message }, { status: 500 })

  const name = (planner.users as { display_name: string } | null)?.display_name ?? null
  return Response.json({
    planner_name: name?.trim().split(/\s+/)[0] ?? null,
    configs:      sortByMealType(configs ?? []),
  })
}

import { NextRequest } from 'next/server'
import { createClient } from '@/lib/supabase/server'
import { createServiceClient } from '@/lib/supabase/service'
import { familyContext } from '@/lib/utils/family-plan'

function mondayISO(d: Date = new Date()): string {
  const day = d.getDay()
  const monday = new Date(d)
  monday.setDate(d.getDate() + (day === 0 ? -6 : 1 - day))
  return `${monday.getFullYear()}-${String(monday.getMonth() + 1).padStart(2, '0')}-${String(monday.getDate()).padStart(2, '0')}`
}

const FAMILY_PLAN_SELECT = `
  id, week_start, status, share_token,
  meal_plan_items (
    id, day_of_week, meal_type, applies_all_days, servings, sort_order,
    recipes ( id, name, photo_url, description, prep_time_min, cook_time_min ),
    meal_compositions ( id, role, sort_order, recipes ( id, name ) )
  )
`

// Menu de la famille pour la semaine (lecture seule) : celui de la
// planificatrice du cercle actif. Ne crée jamais de menu.
// Membre désactivé : pas de menu (accès retiré), seulement le contexte.
export async function GET(request: NextRequest) {
  const supabase = await createClient()
  const { data: { user } } = await supabase.auth.getUser()
  if (!user) return Response.json({ error: 'Non authentifié' }, { status: 401 })

  const service = createServiceClient()
  const ctx     = await familyContext(supabase, service, user.id)
  const base = {
    role:        ctx.role,
    is_active:   ctx.isActive,
    circle_name: ctx.circleName,
    planner_name: ctx.plannerName,
    plan:        null,
    meal_times:  {} as Record<string, string>,
  }
  if (!ctx.plannerId || !ctx.isActive) return Response.json(base)

  const week = request.nextUrl.searchParams.get('week') ?? mondayISO()
  const [{ data: plans, error }, { data: configs }] = await Promise.all([
    service
      .from('meal_plans')
      .select(FAMILY_PLAN_SELECT)
      .eq('user_id', ctx.plannerId)
      .eq('circle_id', ctx.circleId!)
      .eq('week_start', week)
      .order('created_at', { ascending: false })
      .limit(1),
    service
      .from('user_meal_config')
      .select('meal_type, default_time')
      .eq('user_id', ctx.plannerId),
  ])
  if (error) return Response.json({ error: error.message }, { status: 500 })

  const meal_times: Record<string, string> = {}
  for (const c of configs ?? []) {
    if (c.default_time) meal_times[c.meal_type] = c.default_time.slice(0, 5)
  }

  return Response.json({ ...base, plan: plans?.[0] ?? null, meal_times })
}

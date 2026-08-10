import { createClient } from '@/lib/supabase/server'
import { NextRequest } from 'next/server'

function getMondayISO(d: Date = new Date()): string {
  const day = d.getDay()
  const diff = day === 0 ? -6 : 1 - day
  const monday = new Date(d)
  monday.setDate(d.getDate() + diff)
  const y  = monday.getFullYear()
  const m  = String(monday.getMonth() + 1).padStart(2, '0')
  const dd = String(monday.getDate()).padStart(2, '0')
  return `${y}-${m}-${dd}`
}

const PLAN_SELECT = `
  id, week_start, status, share_token,
  meal_plan_items (
    id, day_of_week, meal_type, applies_all_days, servings, is_locked, sort_order,
    recipes ( id, name, photo_url, prep_time_min, cook_time_min, categories ( icon ) ),
    meal_compositions ( id, role, sort_order, recipe_id )
  )
`

export async function GET(request: NextRequest) {
  const supabase = await createClient()
  const { data: { user } } = await supabase.auth.getUser()
  if (!user) return Response.json({ error: 'Non authentifié' }, { status: 401 })

  // Retourne le plan le plus récent (toutes semaines confondues), sans créer de plan vide
  if (request.nextUrl.searchParams.get('latest') === 'true') {
    const { data, error } = await supabase
      .from('meal_plans')
      .select(PLAN_SELECT)
      .eq('user_id', user.id)
      .order('week_start', { ascending: false })
      .limit(1)
      .maybeSingle()
    if (error) return Response.json({ error: error.message }, { status: 500 })
    return Response.json(data)
  }

  const week = request.nextUrl.searchParams.get('week') ?? getMondayISO()

  const { data: existing, error: selectError } = await supabase
    .from('meal_plans')
    .select(PLAN_SELECT)
    .eq('user_id', user.id)
    .eq('week_start', week)
    .maybeSingle()

  if (selectError) return Response.json({ error: selectError.message }, { status: 500 })
  if (existing) return Response.json(existing)

  const { data: created, error } = await supabase
    .from('meal_plans')
    .insert({ user_id: user.id, week_start: week })
    .select('id, week_start, status')
    .single()

  if (error) return Response.json({ error: error.message }, { status: 500 })

  return Response.json({ ...created, meal_plan_items: [] })
}

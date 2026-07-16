import { createClient } from '@/lib/supabase/server'
import { NextRequest } from 'next/server'

function getMondayISO(d: Date = new Date()): string {
  const day = d.getDay()
  const diff = day === 0 ? -6 : 1 - day
  const monday = new Date(d)
  monday.setDate(d.getDate() + diff)
  return monday.toISOString().split('T')[0]
}

export async function GET(request: NextRequest) {
  const supabase = await createClient()
  const { data: { user } } = await supabase.auth.getUser()
  if (!user) return Response.json({ error: 'Non authentifié' }, { status: 401 })

  const week = request.nextUrl.searchParams.get('week') ?? getMondayISO()

  const { data: existing } = await supabase
    .from('meal_plans')
    .select(`
      id, week_start, status,
      meal_plan_items (
        id, day_of_week, meal_type, applies_all_days, servings, is_locked, sort_order,
        recipes ( id, name, photo_url, prep_time_min, cook_time_min, categories ( icon ) )
      )
    `)
    .eq('user_id', user.id)
    .eq('week_start', week)
    .maybeSingle()

  if (existing) return Response.json(existing)

  const { data: created, error } = await supabase
    .from('meal_plans')
    .insert({ user_id: user.id, week_start: week })
    .select('id, week_start, status')
    .single()

  if (error) return Response.json({ error: error.message }, { status: 500 })

  return Response.json({ ...created, meal_plan_items: [] })
}

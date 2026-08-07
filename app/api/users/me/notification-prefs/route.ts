import { createClient } from '@/lib/supabase/server'
import { NextRequest } from 'next/server'

export async function GET() {
  const supabase = await createClient()
  const { data: { user } } = await supabase.auth.getUser()
  if (!user) return Response.json({ error: 'Non authentifié' }, { status: 401 })

  const { data, error } = await supabase
    .from('notification_prefs')
    .select('*')
    .eq('user_id', user.id)
    .order('meal_type')

  if (error) return Response.json({ error: error.message }, { status: 500 })
  return Response.json(data ?? [])
}

export async function PUT(request: NextRequest) {
  const supabase = await createClient()
  const { data: { user } } = await supabase.auth.getUser()
  if (!user) return Response.json({ error: 'Non authentifié' }, { status: 401 })

  type PrefInput = {
    meal_type:          string
    reminder_enabled:   boolean
    reminder_time?:     string | null
    days_of_week?:      number[]
    feedback_enabled:   boolean
    feedback_delay_min?: number
  }

  const prefs = await request.json() as PrefInput[]

  if (!Array.isArray(prefs) || prefs.length === 0) {
    return Response.json({ error: 'Tableau de préférences requis' }, { status: 400 })
  }

  type MealTypeEnum = 'petit_dejeuner' | 'dejeuner' | 'gouter' | 'diner'

  const rows = prefs.map(p => ({
    user_id:            user.id,
    meal_type:          p.meal_type as MealTypeEnum,
    reminder_enabled:   p.reminder_enabled,
    reminder_time:      p.reminder_time ?? null,
    days_of_week:       p.days_of_week ?? [1, 2, 3, 4, 5, 6, 7],
    feedback_enabled:   p.feedback_enabled,
    feedback_delay_min: p.feedback_delay_min ?? 120,
  }))

  const { data, error } = await supabase
    .from('notification_prefs')
    .upsert(rows, { onConflict: 'user_id,meal_type' })
    .select()

  if (error) return Response.json({ error: error.message }, { status: 500 })
  return Response.json(data)
}

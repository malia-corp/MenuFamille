import { createClient } from '@/lib/supabase/server'
import { createServiceClient } from '@/lib/supabase/service'
import { NextRequest } from 'next/server'

const DAY_ORDER = ['lundi', 'mardi', 'mercredi', 'jeudi', 'vendredi', 'samedi', 'dimanche']

export async function POST(
  request: NextRequest,
  { params }: { params: { id: string } }
) {
  // Auth optionnelle — feedback peut être anonyme (user_id nullable)
  const supabase = await createClient()
  const { data: { user } } = await supabase.auth.getUser()

  const service = createServiceClient()

  // Récupérer l'item avec son plan pour valider la date
  const { data: item } = await service
    .from('meal_plan_items')
    .select(`
      id, day_of_week, applies_all_days,
      meal_plans ( week_start )
    `)
    .eq('id', params.id)
    .maybeSingle()

  if (!item) return Response.json({ error: 'Item introuvable' }, { status: 404 })

  type RawPlan = { week_start: string } | null
  const weekStart = (item.meal_plans as unknown as RawPlan)?.week_start
  if (!weekStart) return Response.json({ error: 'Plan introuvable' }, { status: 404 })

  // Validation : le repas doit être passé ou aujourd'hui
  const dayIndex = DAY_ORDER.indexOf(item.day_of_week)
  const mealDate = new Date(`${weekStart}T00:00:00`)
  mealDate.setDate(mealDate.getDate() + (dayIndex >= 0 ? dayIndex : 0))

  const today = new Date()
  today.setHours(0, 0, 0, 0)
  mealDate.setHours(0, 0, 0, 0)

  if (mealDate > today) {
    return Response.json(
      { error: 'Ce repas n\'est pas encore passé.' },
      { status: 403 }
    )
  }

  const body = await request.json() as {
    rating:           'excellent' | 'correct' | 'decevant'
    template_id?:     string
    custom_message?:  string
    respondent_name?: string
  }

  const { rating, template_id, custom_message } = body
  let respondent_name = body.respondent_name?.trim() ?? ''

  if (!rating) {
    return Response.json({ error: 'rating est requis' }, { status: 400 })
  }

  // Si l'utilisateur est connecté, résoudre le nom depuis son profil si absent du body
  if (user?.id) {
    if (!respondent_name) {
      const { data: profile } = await service
        .from('users')
        .select('display_name')
        .eq('id', user.id)
        .maybeSingle()
      respondent_name = profile?.display_name ?? ''
    }

    const { data: existing } = await service
      .from('meal_feedback')
      .select('id')
      .eq('meal_plan_item_id', params.id)
      .eq('user_id', user.id)
      .maybeSingle()

    if (existing) {
      const { data, error } = await service
        .from('meal_feedback')
        .update({ rating, template_id: template_id ?? null, custom_message: custom_message?.trim() || null })
        .eq('id', existing.id)
        .select('id, rating, template_id, custom_message, respondent_name, created_at')
        .single()
      if (error) return Response.json({ error: error.message }, { status: 500 })
      return Response.json(data)
    }
  }

  if (!respondent_name) {
    return Response.json({ error: 'respondent_name est requis pour les réponses anonymes' }, { status: 400 })
  }

  const { data, error } = await service
    .from('meal_feedback')
    .insert({
      meal_plan_item_id: params.id,
      user_id:           user?.id ?? null,
      respondent_name,
      rating,
      template_id:       template_id ?? null,
      custom_message:    custom_message?.trim() || null,
    })
    .select('id, rating, template_id, custom_message, respondent_name, created_at')
    .single()

  if (error) return Response.json({ error: error.message }, { status: 500 })
  return Response.json(data, { status: 201 })
}

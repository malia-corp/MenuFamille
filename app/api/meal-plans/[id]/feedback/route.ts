import { createClient } from '@/lib/supabase/server'
import { NextRequest } from 'next/server'

export async function GET(
  _: NextRequest,
  { params }: { params: { id: string } }
) {
  const supabase = await createClient()
  const { data: { user } } = await supabase.auth.getUser()
  if (!user) return Response.json({ error: 'Non authentifié' }, { status: 401 })

  // Vérifier ownership
  const { data: plan } = await supabase
    .from('meal_plans')
    .select('id')
    .eq('id', params.id)
    .eq('user_id', user.id)
    .maybeSingle()

  if (!plan) return Response.json({ error: 'Plan introuvable' }, { status: 404 })

  const { data, error } = await supabase
    .from('meal_feedback')
    .select(`
      id, rating, custom_message, respondent_name, created_at,
      meal_plan_item_id,
      feedback_templates ( message )
    `)
    .in(
      'meal_plan_item_id',
      (
        await supabase
          .from('meal_plan_items')
          .select('id')
          .eq('meal_plan_id', params.id)
      ).data?.map(i => i.id) ?? []
    )
    .order('created_at', { ascending: false })

  if (error) return Response.json({ error: error.message }, { status: 500 })

  type RawTemplate = { message: string } | null
  const feedbacks = (data ?? []).map(f => ({
    id:                f.id,
    meal_plan_item_id: f.meal_plan_item_id,
    rating:            f.rating,
    message:           f.custom_message ?? (f.feedback_templates as unknown as RawTemplate)?.message ?? null,
    respondent_name:   f.respondent_name,
    created_at:        f.created_at,
  }))

  return Response.json(feedbacks)
}

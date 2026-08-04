import { createClient } from '@/lib/supabase/server'
import { NextRequest } from 'next/server'

export async function PATCH(
  request: NextRequest,
  { params }: { params: { id: string } }
) {
  const supabase = await createClient()
  const { data: { user } } = await supabase.auth.getUser()
  if (!user) return Response.json({ error: 'Non authentifié' }, { status: 401 })

  const { data: plan } = await supabase
    .from('meal_plans')
    .select('id')
    .eq('id', params.id)
    .eq('user_id', user.id)
    .maybeSingle()

  if (!plan) return Response.json({ error: 'Plan introuvable' }, { status: 404 })

  const body = await request.json() as { servings?: number }
  const servings = Number(body.servings)
  if (!Number.isInteger(servings) || servings < 1 || servings > 20) {
    return Response.json({ error: 'Valeur invalide (1–20)' }, { status: 400 })
  }

  const { error } = await supabase
    .from('meal_plan_items')
    .update({ servings })
    .eq('meal_plan_id', params.id)

  if (error) return Response.json({ error: error.message }, { status: 500 })
  return Response.json({ servings })
}

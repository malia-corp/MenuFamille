import { createClient } from '@/lib/supabase/server'
import { NextRequest } from 'next/server'

export async function POST(
  _request: NextRequest,
  { params }: { params: { id: string; itemId: string } }
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

  if (!plan) return Response.json({ error: 'Plan introuvable ou accès refusé' }, { status: 404 })

  const { data: item } = await supabase
    .from('meal_plan_items')
    .select('id, is_locked')
    .eq('id', params.itemId)
    .eq('meal_plan_id', params.id)
    .maybeSingle()

  if (!item) return Response.json({ error: 'Item introuvable' }, { status: 404 })

  const { data, error } = await supabase
    .from('meal_plan_items')
    .update({ is_locked: !item.is_locked })
    .eq('id', params.itemId)
    .select('id, is_locked')
    .single()

  if (error) return Response.json({ error: error.message }, { status: 500 })
  return Response.json({ is_locked: data.is_locked })
}

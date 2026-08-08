import { createClient } from '@/lib/supabase/server'
import { NextRequest } from 'next/server'

export async function DELETE(
  _: NextRequest,
  { params }: { params: { id: string; itemId: string; compositionId: string } }
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

  const { error } = await supabase
    .from('meal_compositions')
    .delete()
    .eq('id', params.compositionId)
    .eq('meal_plan_item_id', params.itemId)

  if (error) return Response.json({ error: error.message }, { status: 500 })
  return new Response(null, { status: 204 })
}

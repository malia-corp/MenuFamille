import { createClient } from '@/lib/supabase/server'

export async function POST(_: Request, { params }: { params: { id: string } }) {
  const supabase = await createClient()
  const { data: { user } } = await supabase.auth.getUser()
  if (!user) return Response.json({ error: 'Non authentifié' }, { status: 401 })

  const { data: plan } = await supabase
    .from('meal_plans')
    .select('id')
    .eq('id', params.id)
    .eq('user_id', user.id)
    .single()

  if (!plan) return Response.json({ error: 'Plan introuvable' }, { status: 404 })

  const { error } = await supabase
    .from('meal_plans')
    .update({ status: 'finalized' })
    .eq('id', params.id)

  if (error) return Response.json({ error: error.message }, { status: 500 })

  return Response.json({ status: 'finalized' })
}

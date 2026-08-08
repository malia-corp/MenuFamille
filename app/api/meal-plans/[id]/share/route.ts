import { createClient } from '@/lib/supabase/server'

export async function POST(_: Request, { params }: { params: { id: string } }) {
  const supabase = await createClient()
  const { data: { user } } = await supabase.auth.getUser()
  if (!user) return Response.json({ error: 'Non authentifié' }, { status: 401 })

  const { data: plan } = await supabase
    .from('meal_plans')
    .select('id, share_token')
    .eq('id', params.id)
    .eq('user_id', user.id)
    .single()

  if (!plan) return Response.json({ error: 'Plan introuvable' }, { status: 404 })

  if (plan.share_token) return Response.json({ share_token: plan.share_token })

  const token   = crypto.randomUUID().replace(/-/g, '')
  const expires = new Date(Date.now() + 30 * 24 * 60 * 60 * 1000)

  const { error } = await supabase
    .from('meal_plans')
    .update({
      share_token:      token,
      token_expires_at: expires.toISOString(),
      status:           'shared',
    })
    .eq('id', params.id)

  if (error) return Response.json({ error: error.message }, { status: 500 })

  return Response.json({ share_token: token })
}

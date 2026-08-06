import { createClient } from '@/lib/supabase/server'

export async function GET() {
  const supabase = await createClient()
  const { data: { user } } = await supabase.auth.getUser()
  if (!user) return Response.json({ count: 0 })

  const sevenDaysAgo = new Date(Date.now() - 7 * 24 * 60 * 60 * 1000).toISOString()

  // Compte les nouvelles réponses sur les plans de l'utilisateur (7 derniers jours)
  const { count } = await supabase
    .from('survey_responses')
    .select('id', { count: 'exact', head: true })
    .gte('created_at', sevenDaysAgo)
    .in(
      'meal_plan_id',
      (
        await supabase
          .from('meal_plans')
          .select('id')
          .eq('user_id', user.id)
      ).data?.map(p => p.id) ?? []
    )

  return Response.json({ count: count ?? 0 })
}

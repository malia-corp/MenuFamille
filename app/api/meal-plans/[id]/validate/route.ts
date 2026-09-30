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

  // Apprentissage : uniquement à la validation, pas à chaque génération —
  // un plan peut être régénéré plusieurs fois avant d'être confirmé, seul
  // l'état final validé doit renforcer les suggestions futures. Best-effort
  // (une erreur ici ne doit jamais faire échouer la validation elle-même),
  // mais on l'attend avant de répondre pour garantir qu'elle s'exécute.
  await learnFromValidatedPlan(supabase, params.id, user.id)

  return Response.json({ status: 'finalized' })
}

async function learnFromValidatedPlan(
  supabase: Awaited<ReturnType<typeof createClient>>,
  planId: string,
  userId: string
) {
  try {
    const { data: items } = await supabase
      .from('meal_plan_items')
      .select('recipe_id, meal_compositions(recipe_id, role)')
      .eq('meal_plan_id', planId)

    const calls: PromiseLike<unknown>[] = []
    for (const item of items ?? []) {
      if (!item.recipe_id) continue
      for (const comp of item.meal_compositions ?? []) {
        calls.push(
          supabase.rpc('upsert_recipe_association', {
            p_recipe_id: item.recipe_id,
            p_associated_recipe_id: comp.recipe_id,
            p_role: comp.role,
            p_user_id: userId,
            p_source: 'planning',
          })
        )
      }
    }
    await Promise.all(calls)
  } catch {
    /* apprentissage best-effort, ne doit jamais faire échouer la validation */
  }
}

import { createServiceClient } from '@/lib/supabase/service'

// Associations déclarées manuellement à la création/édition d'une recette
// (section "Accompagnements & boissons suggérés" du formulaire) — best-effort,
// ne doit jamais faire échouer la création/mise à jour de la recette.
export async function upsertSuggestedAssociations(
  service: ReturnType<typeof createServiceClient>,
  recipeId: string,
  userId: string,
  suggestedSides: unknown,
  suggestedDrinks: unknown,
) {
  try {
    const calls: PromiseLike<unknown>[] = []
    for (const id of Array.isArray(suggestedSides) ? suggestedSides : []) {
      calls.push(service.rpc('upsert_recipe_association', {
        p_recipe_id: recipeId, p_associated_recipe_id: id, p_role: 'side', p_user_id: userId, p_source: 'recipe_form',
      }))
    }
    for (const id of Array.isArray(suggestedDrinks) ? suggestedDrinks : []) {
      calls.push(service.rpc('upsert_recipe_association', {
        p_recipe_id: recipeId, p_associated_recipe_id: id, p_role: 'drink', p_user_id: userId, p_source: 'recipe_form',
      }))
    }
    await Promise.all(calls)
  } catch {
    /* best-effort */
  }
}

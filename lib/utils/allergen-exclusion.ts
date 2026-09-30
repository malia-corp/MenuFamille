import type { SupabaseClient } from '@supabase/supabase-js'
import type { Database } from '@/lib/supabase/database.types'

export type StrictAllergen = { userId: string; displayName: string; value: string }

// Allergies strictes des personnes donnees (self + co-membres de cercle) —
// un seul aller-retour DB. Appelable avec le client service role
// (generate/route.ts) comme avec le client session (meal-plans GET).
export async function loadStrictAllergens(
  // eslint-disable-next-line @typescript-eslint/no-explicit-any
  client: SupabaseClient<Database> | any,
  userIds: string[],
): Promise<StrictAllergen[]> {
  if (userIds.length === 0) return []

  const { data } = await client
    .from('member_dietary_prefs')
    .select('user_id, value, users(display_name)')
    .eq('pref_type', 'allergy')
    .eq('severity', 'strict')
    .in('user_id', userIds)

  return ((data ?? []) as {
    user_id: string
    value: string
    users: { display_name: string } | null
  }[]).map(row => ({
    userId:      row.user_id,
    displayName: row.users?.display_name ?? 'Un membre',
    value:       row.value,
  }))
}

// Retire un "s" final de chaque mot — tolérance minimale au pluriel français.
// "croupions de dinde" et "croupion de dinde" ne partagent aucune sous-chaîne
// continue à cause du "s" au milieu de la phrase ; une fois chaque mot mis au
// singulier, les deux deviennent identiques.
function singularize(s: string): string {
  return s.split(/\s+/).map(w => w.replace(/s$/i, '')).join(' ')
}

function containsAllergen(haystack: string, allergenValue: string): boolean {
  const h = haystack.toLowerCase()
  const a = allergenValue.toLowerCase()
  if (h.includes(a)) return true
  return singularize(h).includes(singularize(a))
}

// Pour un pool de recettes candidates, quels allergenes stricts matchent —
// soit un ingredient de la recette, soit le nom de la recette elle-meme
// (beaucoup de plats/boissons sont nommes directement d'apres leur
// ingredient principal, ex. "Jus de gingembre" : compter uniquement sur
// recipe_ingredients raterait ce cas si la liste d'ingredients est
// incomplete ou absente). Deux requetes en parallele sur tout le pool,
// jamais une par recette.
export async function findAllergenMatches(
  // eslint-disable-next-line @typescript-eslint/no-explicit-any
  client: SupabaseClient<Database> | any,
  recipeIds: string[],
  allergens: StrictAllergen[],
): Promise<Map<string, StrictAllergen[]>> {
  const matches = new Map<string, StrictAllergen[]>()
  if (recipeIds.length === 0 || allergens.length === 0) return matches

  const [{ data: ingredients }, { data: recipes }] = await Promise.all([
    client.from('recipe_ingredients').select('recipe_id, name').in('recipe_id', recipeIds),
    client.from('recipes').select('id, name').in('id', recipeIds),
  ])

  function record(recipeId: string, text: string) {
    for (const allergen of allergens) {
      if (containsAllergen(text, allergen.value)) {
        const existing = matches.get(recipeId) ?? []
        if (!existing.some(a => a.userId === allergen.userId && a.value === allergen.value)) {
          existing.push(allergen)
        }
        matches.set(recipeId, existing)
      }
    }
  }

  for (const ing of (ingredients ?? []) as { recipe_id: string; name: string }[]) {
    record(ing.recipe_id, ing.name)
  }
  for (const r of (recipes ?? []) as { id: string; name: string }[]) {
    record(r.id, r.name)
  }

  return matches
}

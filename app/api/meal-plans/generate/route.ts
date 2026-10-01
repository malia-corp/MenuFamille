import { createClient } from '@/lib/supabase/server'
import { createServiceClient } from '@/lib/supabase/service'
import { loadStrictAllergens, findAllergenMatches } from '@/lib/utils/allergen-exclusion'
import { sortByMealType } from '@/lib/utils/sort-meal-configs'
import { NextRequest } from 'next/server'

const DAYS = ['lundi', 'mardi', 'mercredi', 'jeudi', 'vendredi', 'samedi', 'dimanche'] as const

function getMondayISO(d: Date = new Date()): string {
  const day = d.getDay()
  const diff = day === 0 ? -6 : 1 - day
  const monday = new Date(d)
  monday.setDate(d.getDate() + diff)
  const y  = monday.getFullYear()
  const m  = String(monday.getMonth() + 1).padStart(2, '0')
  const dd = String(monday.getDate()).padStart(2, '0')
  return `${y}-${m}-${dd}`
}

function pickRandom(pool: string[], exclude: Set<string>): string | null {
  const available = pool.filter(id => !exclude.has(id))
  const source = available.length > 0 ? available : pool
  if (!source.length) return null
  return source[Math.floor(Math.random() * source.length)]
}

export async function POST(request: NextRequest) {
  const totalStart = performance.now()
  const lap = (label: string, from: number) => {
    console.log(`[generate] ${label}: ${(performance.now() - from).toFixed(1)}ms`)
    return performance.now()
  }

  const supabase = await createClient()
  const { data: { user } } = await supabase.auth.getUser()
  if (!user) return Response.json({ error: 'Non authentifié' }, { status: 401 })

  const service = createServiceClient()
  let mark = performance.now()

  // 1. Configs actives
  const { data: rawConfigs } = await service
    .from('user_meal_config')
    .select('meal_type, mode, display_order')
    .eq('user_id', user.id)
    .eq('is_active', true)
  const configs = sortByMealType(rawConfigs ?? [])
  mark = lap('1-configs', mark)

  if (!configs?.length) {
    return Response.json(
      { error: 'Aucun type de repas actif. Configurez d\'abord vos repas.' },
      { status: 422 }
    )
  }

  // 2. Récupérer ou créer le plan de la semaine demandée par le client
  //    (celle qu'il a sous les yeux, pas forcément "aujourd'hui" côté serveur —
  //    sans ça, générer en ayant navigué sur une autre semaine crée le plan
  //    pour la mauvaise semaine et l'interface ne montre jamais rien)
  const requestedWeek = request.nextUrl.searchParams.get('week')
  const weekStart = requestedWeek && /^\d{4}-\d{2}-\d{2}$/.test(requestedWeek)
    ? requestedWeek
    : getMondayISO()

  const { data: existingPlan } = await service
    .from('meal_plans')
    .select('id, status')
    .eq('user_id', user.id)
    .eq('week_start', weekStart)
    .maybeSingle()

  let planId: string

  if (existingPlan?.status === 'finalized') {
    const { data: newPlan, error: e } = await service
      .from('meal_plans')
      .insert({ user_id: user.id, week_start: weekStart, status: 'draft' })
      .select('id')
      .single()
    if (e || !newPlan) return Response.json({ error: 'Erreur création plan' }, { status: 500 })
    planId = newPlan.id
  } else if (existingPlan) {
    planId = existingPlan.id
  } else {
    const { data: newPlan, error: e } = await service
      .from('meal_plans')
      .insert({ user_id: user.id, week_start: weekStart, status: 'draft' })
      .select('id')
      .single()
    if (e || !newPlan) return Response.json({ error: 'Erreur création plan' }, { status: 500 })
    planId = newPlan.id
  }
  mark = lap('2-existingPlan+insert', mark)

  // 3. Sauvegarder les recipe_id des items verrouillés
  const { data: lockedItems } = await service
    .from('meal_plan_items')
    .select('recipe_id, meal_type, day_of_week, applies_all_days')
    .eq('meal_plan_id', planId)
    .eq('is_locked', true)
  mark = lap('3-lockedItems', mark)

  const lockedRecipeIds = (lockedItems ?? [])
    .map(i => i.recipe_id)
    .filter((id): id is string => id !== null)

  const lockedSlots = new Set<string>(
    (lockedItems ?? []).map(i =>
      i.applies_all_days ? `${i.meal_type}|template` : `${i.meal_type}|${i.day_of_week}`
    )
  )

  // 4. Supprimer les items non verrouillés (cascade supprime aussi leurs compositions)
  await service
    .from('meal_plan_items')
    .delete()
    .eq('meal_plan_id', planId)
    .eq('is_locked', false)
  mark = lap('4-delete', mark)

  // 5. Récupérer les recettes accessibles avec leur type
  const { data: circles } = await service
    .from('family_circle_members')
    .select('circle_id')
    .eq('user_id', user.id)

  const circleIds = (circles ?? []).map(c => c.circle_id)

  const orFilter = circleIds.length > 0
    ? `user_id.eq.${user.id},visibility.eq.community,and(visibility.eq.circle,circle_id.in.(${circleIds.join(',')}))`
    : `user_id.eq.${user.id},visibility.eq.community`

  const { data: accessibleRecipes } = await service
    .from('recipes')
    .select('id, categories(slug)')
    .or(orFilter)
  mark = lap('5-circles+accessibleRecipes', mark)

  if (!accessibleRecipes?.length) {
    return Response.json(
      { error: 'Aucune recette disponible. Ajoutez des recettes à votre carnet d\'abord.' },
      { status: 422 }
    )
  }

  // Répartir par catégorie : une boisson ne peut pas être un plat principal,
  // tout le reste peut l'être (recipe_type est supprimé — l'accompagnement
  // n'est plus une propriété de la recette mais une relation apprise,
  // voir recipe_associations ci-dessous)
  const mainPool: string[]  = []
  const drinkPool: string[] = []

  for (const r of accessibleRecipes) {
    if (r.categories?.slug === 'boisson') drinkPool.push(r.id)
    else mainPool.push(r.id)
  }

  if (mainPool.length === 0) {
    return Response.json(
      { error: 'Aucun plat principal disponible. Ajoutez des recettes à votre carnet d\'abord.' },
      { status: 422 }
    )
  }

  // Associations apprises (side/drink) pour les plats du mainPool — une seule
  // requête groupée plutôt qu'une par plat choisi. Le score combine fréquence
  // personnelle (x2) et communautaire, calculé ici en JS avec le vrai user.id
  // du côté serveur — pas via recipe_association_suggestions() qui repose sur
  // auth.uid(), non résolu quand on appelle en service role.
  const { data: assocRows } = await service
    .from('recipe_associations')
    .select('recipe_id, associated_recipe_id, role, frequency, user_id')
    .in('recipe_id', mainPool)
  mark = lap('5b-recipeAssociations', mark)

  const sideScoresByMain  = new Map<string, Map<string, number>>()
  const drinkScoresByMain = new Map<string, Map<string, number>>()

  for (const row of assocRows ?? []) {
    const byMain = row.role === 'side' ? sideScoresByMain : drinkScoresByMain
    if (!byMain.has(row.recipe_id)) byMain.set(row.recipe_id, new Map())
    const scores = byMain.get(row.recipe_id)!
    const weight = row.user_id === user.id ? row.frequency * 2 : row.frequency
    scores.set(row.associated_recipe_id, (scores.get(row.associated_recipe_id) ?? 0) + weight)
  }

  function topCandidates(scores: Map<string, number> | undefined, limit = 5): string[] {
    if (!scores?.size) return []
    return Array.from(scores.entries()).sort((a, b) => b[1] - a[1]).slice(0, limit).map(([id]) => id)
  }

  // 5c. Allergènes stricts des membres du/des cercle(s) du planificateur.
  // Simplification documentée : meal_plans.circle_id n'est jamais renseigné
  // aujourd'hui (pas de notion de "cercle actif"), donc on agrège tous les
  // cercles de l'utilisateur qui génère plutôt qu'un cercle précis — correct
  // dans le cas courant (un seul cercle), sur-inclusif si plusieurs.
  let memberUserIds = [user.id]
  if (circleIds.length > 0) {
    const { data: circleMembers } = await service
      .from('family_circle_members')
      .select('user_id')
      .in('circle_id', circleIds)
    memberUserIds = Array.from(new Set([user.id, ...(circleMembers ?? []).map(m => m.user_id)]))
  }
  const strictAllergens = await loadStrictAllergens(service, memberUserIds)

  const candidateIds = Array.from(new Set([
    ...mainPool,
    ...drinkPool,
    ...(assocRows ?? []).map(r => r.associated_recipe_id),
  ]))
  const allergenMatches = strictAllergens.length > 0
    ? await findAllergenMatches(service, candidateIds, strictAllergens)
    : new Map<string, never[]>()
  const excludedIds = new Set(allergenMatches.keys())

  // Retire les recettes contenant un allergène strict connu. Pour un pool
  // obligatoire (plat principal, boisson globale) : si l'exclusion le vide
  // complètement, on sélectionne quand même (log + repli) plutôt que de ne
  // pas remplir le créneau — la Planificatrice décidera via le badge de
  // synthèse. Pour un pool optionnel (accompagnement/boisson suggérés — ne
  // pas en avoir est déjà un état normal), pas de repli : on n'attache
  // simplement rien plutôt que de proposer un candidat allergène.
  function safePool(pool: string[], label: string, fallbackIfEmpty = true): string[] {
    if (excludedIds.size === 0) return pool
    const filtered = pool.filter(id => !excludedIds.has(id))
    if (filtered.length === 0 && pool.length > 0 && fallbackIfEmpty) {
      console.warn(`[generate] exclusion allergènes a vidé ${label} (${pool.length} candidats) — repli sans filtre`)
      return pool
    }
    return filtered
  }
  const safeDrinkPool = safePool(drinkPool, 'drinkPool')
  mark = lap('5c-allergenExclusion', mark)

  const usedIds      = new Set<string>(lockedRecipeIds)
  const usedSideIds  = new Set<string>()
  const usedDrinkIds = new Set<string>()

  // 6. Générer les items + planifier les compositions
  type DayOfWeek = typeof DAYS[number]
  type MealType  = 'petit_dejeuner' | 'dejeuner' | 'gouter' | 'diner'
  type ItemRow = {
    meal_plan_id:     string
    meal_type:        MealType
    day_of_week:      DayOfWeek
    applies_all_days: boolean
    recipe_id:        string
    servings:         number
    is_locked:        boolean
    sort_order:       number
  }

  type CompositionPlan = {
    item_idx:   number
    role:       'side' | 'drink'
    recipe_id:  string
    sort_order: number
  }

  const itemsToInsert: ItemRow[] = []
  const compositionPlans: CompositionPlan[] = []
  const mealsDrink = new Set(['dejeuner', 'diner'])

  function planCompositions(itemIdx: number, mainRecipeId: string, mealType: string) {
    // Accompagnement : uniquement si des associations existent déjà pour ce
    // plat précis — pas de repli sur une pioche générique. Un plat neuf sans
    // historique reste seul ce jour-là plutôt que de recevoir une suggestion
    // sans signal ; ça se corrige dès la première association réelle.
    const sideCandidates = safePool(topCandidates(sideScoresByMain.get(mainRecipeId)), 'sideCandidates', false)
    if (sideCandidates.length > 0) {
      const sideId = pickRandom(sideCandidates, usedSideIds)
      if (sideId) {
        usedSideIds.add(sideId)
        compositionPlans.push({ item_idx: itemIdx, role: 'side', recipe_id: sideId, sort_order: 0 })
      }
    }

    if (mealsDrink.has(mealType) && Math.random() < 0.6) {
      // Boisson : personnalisée si on a du signal pour ce plat, sinon repli
      // sur la pioche aléatoire par catégorie (comportement historique).
      const drinkCandidates = safePool(topCandidates(drinkScoresByMain.get(mainRecipeId)), 'drinkCandidates', false)
      const pool = drinkCandidates.length > 0 ? drinkCandidates : safeDrinkPool
      if (pool.length > 0) {
        const drinkId = pickRandom(pool, usedDrinkIds)
        if (drinkId) {
          usedDrinkIds.add(drinkId)
          compositionPlans.push({ item_idx: itemIdx, role: 'drink', recipe_id: drinkId, sort_order: 1 })
        }
      }
    }
  }

  const safeMainPool = safePool(mainPool, 'mainPool')

  for (const config of configs) {
    if (config.mode === 'template') {
      if (lockedSlots.has(`${config.meal_type}|template`)) continue
      const recipeId = pickRandom(safeMainPool, usedIds)
      if (recipeId) {
        const idx = itemsToInsert.length
        planCompositions(idx, recipeId, config.meal_type)
        usedIds.add(recipeId)
        itemsToInsert.push({
          meal_plan_id:     planId,
          meal_type:        config.meal_type as MealType,
          day_of_week:      'lundi',
          applies_all_days: true,
          recipe_id:        recipeId,
          servings:         4,
          is_locked:        false,
          sort_order:       config.display_order,
        })
      }
    } else {
      for (const day of DAYS) {
        if (lockedSlots.has(`${config.meal_type}|${day}`)) continue
        const recipeId = pickRandom(safeMainPool, usedIds)
        if (recipeId) {
          const idx = itemsToInsert.length
          planCompositions(idx, recipeId, config.meal_type)
          usedIds.add(recipeId)
          itemsToInsert.push({
            meal_plan_id:     planId,
            meal_type:        config.meal_type as MealType,
            day_of_week:      day,
            applies_all_days: false,
            recipe_id:        recipeId,
            servings:         4,
            is_locked:        false,
            sort_order:       config.display_order,
          })
        }
      }
    }
  }
  mark = lap('6-buildItemsInMemory', mark)

  if (itemsToInsert.length > 0) {
    // eslint-disable-next-line @typescript-eslint/no-explicit-any
    const { data: insertedItems, error: insertErr } = await service
      .from('meal_plan_items')
      .insert(itemsToInsert)
      .select('id, recipe_id, meal_type')

    if (insertErr) return Response.json({ error: insertErr.message }, { status: 500 })

    if (insertedItems && compositionPlans.length > 0) {
      const compositionsToInsert = compositionPlans
        .map(cp => {
          const item = insertedItems[cp.item_idx]
          if (!item) return null
          return { meal_plan_item_id: item.id, recipe_id: cp.recipe_id, role: cp.role, sort_order: cp.sort_order }
        })
        .filter((c) => c !== null)

      if (compositionsToInsert.length > 0) {
        // eslint-disable-next-line @typescript-eslint/no-explicit-any
        await service.from('meal_compositions').insert(compositionsToInsert as any)
      }
      // Apprentissage : volontairement pas ici. Un plan peut être régénéré
      // plusieurs fois avant validation — apprendre à chaque génération
      // compterait des paires jamais confirmées par l'utilisatrice. Voir
      // app/api/meal-plans/[id]/validate/route.ts, qui apprend depuis
      // l'état final au moment de la validation du menu.
    }
  }
  lap('7-insertItems+compositions', mark)
  lap('TOTAL', totalStart)

  return Response.json({ plan_id: planId, generated: itemsToInsert.length })
}

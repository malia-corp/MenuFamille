import { createClient } from '@/lib/supabase/server'
import { createServiceClient } from '@/lib/supabase/service'
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
  const { data: configs } = await service
    .from('user_meal_config')
    .select('meal_type, mode, display_order')
    .eq('user_id', user.id)
    .eq('is_active', true)
    .order('display_order')
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
    .select('id, recipe_type')
    .or(orFilter)
  mark = lap('5-circles+accessibleRecipes', mark)

  if (!accessibleRecipes?.length) {
    return Response.json(
      { error: 'Aucune recette disponible. Ajoutez des recettes à votre carnet d\'abord.' },
      { status: 422 }
    )
  }

  // Répartir par type
  const recipeTypeMap = new Map<string, string>()
  const mainPool: string[] = []    // plat_principal | sauce
  const sidePool: string[] = []    // accompagnement
  const drinkPool: string[] = []   // boisson

  for (const r of accessibleRecipes) {
    const t = r.recipe_type ?? 'plat_principal'
    recipeTypeMap.set(r.id, t)
    if (t === 'plat_principal' || t === 'sauce') mainPool.push(r.id)
    else if (t === 'accompagnement') sidePool.push(r.id)
    else if (t === 'boisson') drinkPool.push(r.id)
  }

  if (mainPool.length === 0) {
    return Response.json(
      { error: 'Aucun plat principal disponible. Ajoutez des recettes de type "Plat principal" ou "Sauce".' },
      { status: 422 }
    )
  }

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
    item_idx:  number
    role:      'side' | 'drink'
    recipe_id: string
    sort_order: number
  }

  const itemsToInsert: ItemRow[] = []
  const compositionPlans: CompositionPlan[] = []
  const mealsDrink = new Set(['dejeuner', 'diner'])

  function planCompositions(itemIdx: number, mainRecipeId: string, mealType: string) {
    const rt = recipeTypeMap.get(mainRecipeId) ?? 'plat_principal'

    if (rt === 'sauce' && sidePool.length > 0) {
      const sideId = pickRandom(sidePool, usedSideIds)
      if (sideId) {
        usedSideIds.add(sideId)
        compositionPlans.push({ item_idx: itemIdx, role: 'side', recipe_id: sideId, sort_order: 0 })
      }
    }

    if (mealsDrink.has(mealType) && drinkPool.length > 0 && Math.random() < 0.6) {
      const drinkId = pickRandom(drinkPool, usedDrinkIds)
      if (drinkId) {
        usedDrinkIds.add(drinkId)
        compositionPlans.push({ item_idx: itemIdx, role: 'drink', recipe_id: drinkId, sort_order: 1 })
      }
    }
  }

  for (const config of configs) {
    if (config.mode === 'template') {
      if (lockedSlots.has(`${config.meal_type}|template`)) continue
      const recipeId = pickRandom(mainPool, usedIds)
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
        const recipeId = pickRandom(mainPool, usedIds)
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
    }
  }
  lap('7-insertItems+compositions', mark)
  lap('TOTAL', totalStart)

  return Response.json({ plan_id: planId, generated: itemsToInsert.length })
}

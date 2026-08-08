import { createClient } from '@/lib/supabase/server'
import { createServiceClient } from '@/lib/supabase/service'

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

export async function POST() {
  const supabase = await createClient()
  const { data: { user } } = await supabase.auth.getUser()
  if (!user) return Response.json({ error: 'Non authentifié' }, { status: 401 })

  const service = createServiceClient()

  // 1. Configs actives
  const { data: configs } = await service
    .from('user_meal_config')
    .select('meal_type, mode, display_order')
    .eq('user_id', user.id)
    .eq('is_active', true)
    .order('display_order')

  if (!configs?.length) {
    return Response.json(
      { error: 'Aucun type de repas actif. Configurez d\'abord vos repas.' },
      { status: 422 }
    )
  }

  // 2. Récupérer ou créer le plan de la semaine courante
  const weekStart = getMondayISO()

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

  // 3. Sauvegarder les recipe_id des items verrouillés
  const { data: lockedItems } = await service
    .from('meal_plan_items')
    .select('recipe_id, meal_type, day_of_week, applies_all_days')
    .eq('meal_plan_id', planId)
    .eq('is_locked', true)

  const lockedRecipeIds = (lockedItems ?? [])
    .map(i => i.recipe_id)
    .filter((id): id is string => id !== null)

  const lockedSlots = new Set<string>(
    (lockedItems ?? []).map(i =>
      i.applies_all_days ? `${i.meal_type}|template` : `${i.meal_type}|${i.day_of_week}`
    )
  )

  // 4. Supprimer les items non verrouillés
  await service
    .from('meal_plan_items')
    .delete()
    .eq('meal_plan_id', planId)
    .eq('is_locked', false)

  // 5. Récupérer les recettes accessibles
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
    .select('id')
    .or(orFilter)

  if (!accessibleRecipes?.length) {
    return Response.json(
      { error: 'Aucune recette disponible. Ajoutez des recettes à votre carnet d\'abord.' },
      { status: 422 }
    )
  }

  const recipePool = accessibleRecipes.map(r => r.id)
  const usedIds = new Set<string>(lockedRecipeIds)

  // 6. Générer les items
  type ItemRow = {
    meal_plan_id: string
    meal_type: string
    day_of_week: string
    applies_all_days: boolean
    recipe_id: string
    servings: number
    is_locked: boolean
    sort_order: number
  }

  const itemsToInsert: ItemRow[] = []

  for (const config of configs) {
    if (config.mode === 'template') {
      if (lockedSlots.has(`${config.meal_type}|template`)) continue
      const recipeId = pickRandom(recipePool, usedIds)
      if (recipeId) {
        usedIds.add(recipeId)
        itemsToInsert.push({
          meal_plan_id:     planId,
          meal_type:        config.meal_type,
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
        const recipeId = pickRandom(recipePool, usedIds)
        if (recipeId) {
          usedIds.add(recipeId)
          itemsToInsert.push({
            meal_plan_id:     planId,
            meal_type:        config.meal_type,
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

  if (itemsToInsert.length > 0) {
    // eslint-disable-next-line @typescript-eslint/no-explicit-any
    const { error: insertErr } = await service.from('meal_plan_items').insert(itemsToInsert as any)
    if (insertErr) return Response.json({ error: insertErr.message }, { status: 500 })
  }

  return Response.json({ plan_id: planId, generated: itemsToInsert.length })
}

import { createClient } from '@/lib/supabase/server'
import { loadStrictAllergens, findAllergenMatches } from '@/lib/utils/allergen-exclusion'
import { NextRequest } from 'next/server'

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

const PLAN_SELECT = `
  id, week_start, status, share_token,
  meal_plan_items (
    id, day_of_week, meal_type, applies_all_days, servings, is_locked, sort_order,
    recipes ( id, name, photo_url, prep_time_min, cook_time_min, difficulty, categories ( icon ) ),
    meal_compositions ( id, role, sort_order, recipe_id, recipes ( id, name, categories ( icon ) ) )
  )
`

type RawPlanItem = {
  recipes: { id: string } | null
  meal_compositions: { recipes: { id: string } | null }[] | null
}

// Ajoute allergy_warnings a chaque item — non bloquant, purement informatif
// pour le badge de synthese sur /plan/validate. Meme helper que le
// generateur (lib/utils/allergen-exclusion.ts), jamais duplique.
// eslint-disable-next-line @typescript-eslint/no-explicit-any
async function withAllergyWarnings(supabase: any, userId: string, plan: any) {
  const items = (plan?.meal_plan_items ?? []) as RawPlanItem[]
  if (!plan || items.length === 0) return plan

  const { data: circles } = await supabase.from('family_circle_members').select('circle_id').eq('user_id', userId)
  const circleIds = (circles ?? []).map((c: { circle_id: string }) => c.circle_id)

  let memberUserIds = [userId]
  if (circleIds.length > 0) {
    const { data: circleMembers } = await supabase.from('family_circle_members').select('user_id').in('circle_id', circleIds)
    memberUserIds = Array.from(new Set([userId, ...(circleMembers ?? []).map((m: { user_id: string }) => m.user_id)]))
  }

  const strictAllergens = await loadStrictAllergens(supabase, memberUserIds)
  if (strictAllergens.length === 0) {
    return { ...plan, meal_plan_items: items.map(i => ({ ...i, allergy_warnings: [] })) }
  }

  const allRecipeIds = new Set<string>()
  for (const item of items) {
    if (item.recipes?.id) allRecipeIds.add(item.recipes.id)
    for (const c of item.meal_compositions ?? []) if (c.recipes?.id) allRecipeIds.add(c.recipes.id)
  }
  const matches = await findAllergenMatches(supabase, Array.from(allRecipeIds), strictAllergens)

  const itemsWithWarnings = items.map(item => {
    const ids = [item.recipes?.id, ...(item.meal_compositions ?? []).map(c => c.recipes?.id)].filter((id): id is string => !!id)
    const seen = new Set<string>()
    const warnings: { member_display_name: string; allergen: string }[] = []
    for (const id of ids) {
      for (const a of matches.get(id) ?? []) {
        const key = `${a.displayName}|${a.value}`
        if (!seen.has(key)) {
          seen.add(key)
          warnings.push({ member_display_name: a.displayName, allergen: a.value })
        }
      }
    }
    return { ...item, allergy_warnings: warnings }
  })

  return { ...plan, meal_plan_items: itemsWithWarnings }
}

export async function GET(request: NextRequest) {
  const start = performance.now()
  const supabase = await createClient()
  const { data: { user } } = await supabase.auth.getUser()
  if (!user) return Response.json({ error: 'Non authentifié' }, { status: 401 })

  // Retourne le plan le plus récent (toutes semaines confondues), sans créer de plan vide
  if (request.nextUrl.searchParams.get('latest') === 'true') {
    const { data, error } = await supabase
      .from('meal_plans')
      .select(PLAN_SELECT)
      .eq('user_id', user.id)
      .order('week_start', { ascending: false })
      .limit(1)
      .maybeSingle()
    console.log(`[meal-plans:GET latest] ${(performance.now() - start).toFixed(1)}ms`)
    if (error) return Response.json({ error: error.message }, { status: 500 })
    return Response.json(await withAllergyWarnings(supabase, user.id, data))
  }

  const week = request.nextUrl.searchParams.get('week') ?? getMondayISO()

  // .limit(1) plutot que .maybeSingle() : s'il existe par accident plus
  // d'une ligne pour ce (user_id, week_start) — ne devrait plus arriver
  // depuis la contrainte unique posee en migration 0020, mais .maybeSingle()
  // aurait renvoye une erreur Postgrest (PGRST116) et 500 au client.
  const { data: existingRows, error: selectError } = await supabase
    .from('meal_plans')
    .select(PLAN_SELECT)
    .eq('user_id', user.id)
    .eq('week_start', week)
    .order('created_at', { ascending: false })
    .limit(1)

  if (selectError) return Response.json({ error: selectError.message }, { status: 500 })
  const existing = existingRows?.[0] ?? null
  if (existing) {
    console.log(`[meal-plans:GET existing] ${(performance.now() - start).toFixed(1)}ms`)
    return Response.json(await withAllergyWarnings(supabase, user.id, existing))
  }

  const { data: created, error } = await supabase
    .from('meal_plans')
    .insert({ user_id: user.id, week_start: week })
    .select('id, week_start, status')
    .single()

  if (error) return Response.json({ error: error.message }, { status: 500 })

  console.log(`[meal-plans:GET created] ${(performance.now() - start).toFixed(1)}ms`)
  return Response.json({ ...created, meal_plan_items: [] })
}

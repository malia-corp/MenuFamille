import { createClient } from '@/lib/supabase/server'
import { createServiceClient } from '@/lib/supabase/service'
import { upsertSuggestedAssociations } from '@/lib/utils/recipe-associations'
import { findSimilarRecipe } from '@/lib/utils/recipe-similarity'
import { NextRequest } from 'next/server'

const DIACRITICS_RE = /[̀-ͯ]/g

function makeFingerprint(name: string): string {
  return name.normalize('NFD').replace(DIACRITICS_RE, '').toLowerCase().replace(/\s+/g, ' ').trim()
}

function makeSlug(name: string): string {
  return name
    .normalize('NFD')
    .replace(DIACRITICS_RE, '')
    .toLowerCase()
    .replace(/[^a-z0-9\s]/g, '')
    .replace(/\s+/g, '-')
    .replace(/-+/g, '-')
    .trim()
}

export async function POST(request: NextRequest) {
  const supabase = await createClient()
  const { data: { user } } = await supabase.auth.getUser()
  if (!user) return Response.json({ error: 'Non authentifié' }, { status: 401 })

  const body = await request.json()
  const {
    name,
    description,
    tip,
    category_id,
    prep_time_min,
    cook_time_min,
    servings = 4,
    difficulty,
    visibility = 'private',
    circle_id,
    ingredients = [],
    steps = [],
    parent_recipe_id,
    variant_label,
    force = false,
    photo_url,
    source_url,
    raw_html_hash,
    suggested_sides = [],
    suggested_drinks = [],
  } = body

  if (!name || typeof name !== 'string' || name.trim().length < 2) {
    return Response.json({ error: 'Nom trop court (2 caractères minimum)' }, { status: 400 })
  }
  if (visibility === 'circle' && !circle_id) {
    return Response.json({ error: 'Sélectionne un cercle familial' }, { status: 400 })
  }

  const service = createServiceClient()
  const fingerprint = makeFingerprint(name)

  // Doublon : uniquement pour une recette partagée (cercle / communauté) — le
  // client fait normalement ce contrôle avant via /api/recipes/check-duplicate.
  if (!force && !parent_recipe_id && visibility !== 'private') {
    const similar = await findSimilarRecipe(service, {
      name: name.trim(),
      userId: user.id,
      circleId: visibility === 'circle' ? circle_id : null,
    })
    if (similar) return Response.json({ conflict: true, existing: similar }, { status: 409 })
  }

  let slug = makeSlug(name.trim()) || 'recette'
  const { data: slugExists } = await service.from('recipes').select('id').eq('slug', slug).maybeSingle()
  if (slugExists) slug = `${slug}-${Date.now()}`

  const { data: recipe, error: insertError } = await service
    .from('recipes')
    .insert({
      user_id: user.id,
      category_id: category_id || null,
      circle_id: visibility === 'circle' ? circle_id : null,
      parent_recipe_id: parent_recipe_id || null,
      variant_label: (variant_label as string | undefined)?.trim() || null,
      name: name.trim(),
      slug,
      name_fingerprint: fingerprint,
      description: (description as string | undefined)?.trim() || null,
      tip: (tip as string | undefined)?.trim() || null,
      prep_time_min: prep_time_min ? Number(prep_time_min) : null,
      cook_time_min: cook_time_min ? Number(cook_time_min) : null,
      servings: Math.max(1, Number(servings) || 4),
      difficulty: difficulty || null,
      visibility,
      photo_url: (photo_url as string | undefined) || null,
    })
    .select('id')
    .single()

  if (insertError || !recipe) {
    return Response.json({ error: insertError?.message ?? 'Erreur insertion' }, { status: 500 })
  }

  type IngRow = { name?: string; quantity?: string | number; unit?: string }
  const validIngredients = (ingredients as IngRow[])
    .filter((i) => i.name?.trim())
    .map((i, idx) => ({
      recipe_id: recipe.id,
      name: i.name!.trim(),
      quantity: i.quantity ? Number(i.quantity) : null,
      unit: (i.unit as string | undefined)?.trim() || null,
      sort_order: idx + 1,
    }))
  if (validIngredients.length > 0) {
    const { error: ingErr } = await service.from('recipe_ingredients').insert(validIngredients)
    if (ingErr) return Response.json({ error: ingErr.message }, { status: 500 })
  }

  type StepRow = { title?: string; description?: string; duration_min?: string | number }
  const validSteps = (steps as StepRow[])
    .filter((s) => s.description?.trim())
    .map((s, idx) => ({
      recipe_id: recipe.id,
      step_number: idx + 1,
      title: s.title?.trim() || null,
      description: s.description!.trim(),
      duration_min: s.duration_min ? Number(s.duration_min) : null,
    }))
  if (validSteps.length > 0) {
    const { error: stepsErr } = await service.from('recipe_steps').insert(validSteps)
    if (stepsErr) return Response.json({ error: stepsErr.message }, { status: 500 })
  }

  if (source_url) {
    await service.from('recipe_imports').insert({
      recipe_id: recipe.id,
      source_url,
      parser_version: '1.0',
      raw_html_hash: (raw_html_hash as string | undefined) ?? null,
    })
  }

  await upsertSuggestedAssociations(service, recipe.id, user.id, suggested_sides, suggested_drinks)

  return Response.json({ id: recipe.id }, { status: 201 })
}

export async function GET(request: NextRequest) {
  const supabase = await createClient()
  const { data: { user } } = await supabase.auth.getUser()
  if (!user) return Response.json({ error: 'Non authentifié' }, { status: 401 })

  const { searchParams } = request.nextUrl
  const scope = searchParams.get('scope') ?? 'all'
  const search = searchParams.get('search') ?? ''
  const category_id = searchParams.get('category_id') ?? ''

  const service = createServiceClient()

  // Cercles de l'utilisateur
  const { data: circles } = await service
    .from('family_circle_members')
    .select('circle_id')
    .eq('user_id', user.id)
  const circleIds = (circles ?? []).map((c) => c.circle_id as string)

  // Favoris de l'utilisateur
  const { data: favs } = await service
    .from('recipe_favorites')
    .select('recipe_id')
    .eq('user_id', user.id)
  const favSet = new Set((favs ?? []).map((f) => f.recipe_id as string))

  if (searchParams.has('page')) {
    return paginatedList(service, user.id, circleIds, favSet, searchParams)
  }

  const exclude_category_id = searchParams.get('exclude_category_id') ?? ''

  let query = service
    .from('recipes')
    .select('id, name, slug, description, prep_time_min, cook_time_min, servings, difficulty, photo_url, visibility, user_id, circle_id, categories(id, name, slug, icon, color)')

  // Filtre de visibilité selon le scope
  if (scope === 'mes') {
    query = query.eq('user_id', user.id)
  } else if (scope === 'famille') {
    if (circleIds.length === 0) return Response.json([])
    query = query.eq('visibility', 'circle').in('circle_id', circleIds)
  } else if (scope === 'communaute') {
    query = query.eq('visibility', 'community')
  } else {
    // all : communautaire + perso + cercles
    const circleClause = circleIds.length > 0
      ? `,and(visibility.eq.circle,circle_id.in.(${circleIds.join(',')}))`
      : ''
    query = query.or(`visibility.eq.community,user_id.eq.${user.id}${circleClause}`)
  }

  if (search) query = query.ilike('name', `%${search}%`)
  if (category_id) query = query.eq('category_id', category_id)
  if (exclude_category_id) query = query.neq('category_id', exclude_category_id)

  query = query.order('created_at', { ascending: false }).limit(100)

  const { data, error } = await query
  if (error) return Response.json({ error: error.message }, { status: 500 })

  return Response.json(
    (data ?? []).map((r) => ({ ...r, is_favorited: favSet.has(r.id) }))
  )
}

// ─── Liste paginée du carnet (/recipes) ──────────────────────────────────────
// Filtres, tri et pagination en mémoire : le volume de recettes accessibles
// reste modeste (MVP), et cela permet la recherche dans les ingrédients et le
// tri par temps total, non exprimables simplement en PostgREST.

const MAX_RECIPES = 1000
const DEFAULT_PAGE_SIZE = 12

type Origin = 'all' | 'famille' | 'communaute' | 'mes' | 'favoris'
type Sort = 'recent' | 'planned' | 'fastest' | 'alpha'

interface ListRecipe {
  id: string
  name: string
  description: string | null
  prep_time_min: number | null
  cook_time_min: number | null
  servings: number
  difficulty: string | null
  photo_url: string | null
  visibility: string
  user_id: string | null
  circle_id: string | null
  created_at: string
  categories: { id: string; name: string; slug: string; icon: string | null; color: string | null } | null
}

async function paginatedList(
  service: ReturnType<typeof createServiceClient>,
  userId: string,
  circleIds: string[],
  favSet: Set<string>,
  params: URLSearchParams,
) {
  const origin      = (params.get('scope') ?? 'all') as Origin
  const search      = (params.get('search') ?? '').trim()
  const categoryIds = (params.get('category_ids') ?? '').split(',').filter(Boolean)
  const under30     = params.get('under30') === '1'
  const sort        = (params.get('sort') ?? 'recent') as Sort
  const page        = Math.max(1, Number(params.get('page')) || 1)
  const pageSize    = Math.min(48, Math.max(1, Number(params.get('page_size')) || DEFAULT_PAGE_SIZE))

  const circleClause = circleIds.length > 0
    ? `,and(visibility.eq.circle,circle_id.in.(${circleIds.join(',')}))`
    : ''
  const { data, error } = await service
    .from('recipes')
    .select('id, name, description, prep_time_min, cook_time_min, servings, difficulty, photo_url, visibility, user_id, circle_id, created_at, categories(id, name, slug, icon, color)')
    .or(`visibility.eq.community,user_id.eq.${userId}${circleClause}`)
    .order('created_at', { ascending: false })
    .limit(MAX_RECIPES)
  if (error) return Response.json({ error: error.message }, { status: 500 })

  const all = (data ?? []) as unknown as ListRecipe[]
  const isMine      = (r: ListRecipe) => r.user_id === userId
  const isFamily    = (r: ListRecipe) => r.visibility === 'circle' && !!r.circle_id && circleIds.includes(r.circle_id)
  const isCommunity = (r: ListRecipe) => r.visibility === 'community'
  const totalTime   = (r: ListRecipe) => (r.prep_time_min ?? 0) + (r.cook_time_min ?? 0)

  // Recherche : nom de la recette ou d'un de ses ingrédients
  let searchIds: Set<string> | null = null
  if (search) {
    const needle = search.toLowerCase()
    // Pas de .in(ids) ici (URL trop longue) : l'intersection avec les
    // recettes accessibles se fait via `base` ci-dessous.
    const { data: ings } = await service
      .from('recipe_ingredients')
      .select('recipe_id')
      .ilike('name', `%${search.replace(/[%_]/g, '')}%`)
      .limit(5000)
    searchIds = new Set((ings ?? []).map(i => i.recipe_id as string))
    for (const r of all) if (r.name.toLowerCase().includes(needle)) searchIds.add(r.id)
  }

  // Filtres hors origine : servent aussi aux compteurs par origine
  const base = all.filter(r =>
    (!searchIds || searchIds.has(r.id)) &&
    (categoryIds.length === 0 || (r.categories && categoryIds.includes(r.categories.id))) &&
    (!under30 || (totalTime(r) > 0 && totalTime(r) <= 30))
  )

  const byOrigin: Record<Origin, (r: ListRecipe) => boolean> = {
    all:        () => true,
    famille:    isFamily,
    communaute: isCommunity,
    mes:        isMine,
    favoris:    r => favSet.has(r.id),
  }
  const counts = Object.fromEntries(
    (Object.keys(byOrigin) as Origin[]).map(o => [o, base.filter(byOrigin[o]).length])
  ) as Record<Origin, number>

  let filtered = base.filter(byOrigin[origin] ?? byOrigin.all)

  if (sort === 'alpha') {
    filtered = [...filtered].sort((a, b) => a.name.localeCompare(b.name, 'fr'))
  } else if (sort === 'fastest') {
    // Temps inconnu (0) en dernier
    filtered = [...filtered].sort((a, b) => (totalTime(a) || Infinity) - (totalTime(b) || Infinity))
  } else if (sort === 'planned') {
    const { data: myPlans } = await service.from('meal_plans').select('id').eq('user_id', userId)
    const planIds = (myPlans ?? []).map(p => p.id as string)
    const usage = new Map<string, number>()
    if (planIds.length > 0) {
      const { data: planned } = await service.from('meal_plan_items').select('recipe_id').in('meal_plan_id', planIds)
      for (const p of planned ?? []) if (p.recipe_id) usage.set(p.recipe_id, (usage.get(p.recipe_id) ?? 0) + 1)
    }
    filtered = [...filtered].sort((a, b) => (usage.get(b.id) ?? 0) - (usage.get(a.id) ?? 0))
  }

  const total     = filtered.length
  const pageItems = filtered.slice((page - 1) * pageSize, page * pageSize)

  // Favoris du foyer (membres de mes cercles, moi compris) pour la page affichée
  const foyerFavs = new Map<string, number>()
  if (pageItems.length > 0) {
    let mateIds = [userId]
    if (circleIds.length > 0) {
      const { data: mates } = await service.from('family_circle_members').select('user_id').in('circle_id', circleIds)
      mateIds = Array.from(new Set([userId, ...(mates ?? []).map(m => m.user_id as string)]))
    }
    const { data: favRows } = await service
      .from('recipe_favorites')
      .select('recipe_id')
      .in('user_id', mateIds)
      .in('recipe_id', pageItems.map(r => r.id))
    for (const f of favRows ?? []) foyerFavs.set(f.recipe_id, (foyerFavs.get(f.recipe_id) ?? 0) + 1)
  }

  return Response.json({
    items: pageItems.map(r => ({
      ...r,
      is_favorited:    favSet.has(r.id),
      foyer_favorites: foyerFavs.get(r.id) ?? 0,
      total_time_min:  totalTime(r) || null,
      origin:          isMine(r) ? 'mes' : isFamily(r) ? 'famille' : 'communaute',
    })),
    total,
    page,
    page_size: pageSize,
    page_count: Math.max(1, Math.ceil(total / pageSize)),
    counts,
  })
}

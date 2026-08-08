import { createClient } from '@/lib/supabase/server'
import { createServiceClient } from '@/lib/supabase/service'
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
  } = body

  if (!name || typeof name !== 'string' || name.trim().length < 2) {
    return Response.json({ error: 'Nom trop court (2 caractères minimum)' }, { status: 400 })
  }
  if (visibility === 'circle' && !circle_id) {
    return Response.json({ error: 'Sélectionne un cercle familial' }, { status: 400 })
  }

  const service = createServiceClient()
  const fingerprint = makeFingerprint(name)

  if (!force && !parent_recipe_id) {
    const { data: similars } = await service
      .from('recipes')
      .select('id, name')
      .eq('name_fingerprint', fingerprint)
      .or(`user_id.eq.${user.id},visibility.eq.community`)
      .limit(1)
    const similar = similars?.[0] ?? null
    if (similar) {
      return Response.json({ conflict: true, existing: { id: similar.id, name: similar.name } }, { status: 409 })
    }
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

  type StepRow = { description?: string; duration_min?: string | number }
  const validSteps = (steps as StepRow[])
    .filter((s) => s.description?.trim())
    .map((s, idx) => ({
      recipe_id: recipe.id,
      step_number: idx + 1,
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

  query = query.order('created_at', { ascending: false })

  const { data, error } = await query
  if (error) return Response.json({ error: error.message }, { status: 500 })

  return Response.json(
    (data ?? []).map((r) => ({ ...r, is_favorited: favSet.has(r.id) }))
  )
}

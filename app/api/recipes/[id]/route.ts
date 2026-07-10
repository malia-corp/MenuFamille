import { createClient } from '@/lib/supabase/server'
import { createServiceClient } from '@/lib/supabase/service'
import { NextRequest } from 'next/server'

const DIACRITICS_RE = /[̀-ͯ]/g

function makeFingerprint(name: string): string {
  return name.normalize('NFD').replace(DIACRITICS_RE, '').toLowerCase().replace(/\s+/g, ' ').trim()
}

function makeSlug(name: string): string {
  return name.normalize('NFD').replace(DIACRITICS_RE, '').toLowerCase()
    .replace(/[^a-z0-9\s]/g, '').replace(/\s+/g, '-').replace(/-+/g, '-').trim()
}

export async function GET(
  _request: NextRequest,
  { params }: { params: { id: string } }
) {
  const supabase = await createClient()
  const { data: { user } } = await supabase.auth.getUser()
  if (!user) return Response.json({ error: 'Non authentifié' }, { status: 401 })

  const service = createServiceClient()

  const { data: recipe, error } = await service
    .from('recipes')
    .select(`
      *,
      categories(*),
      recipe_ingredients(id, name, quantity, unit, sort_order),
      recipe_steps(id, step_number, description, duration_min)
    `)
    .eq('id', params.id)
    .single()

  if (error || !recipe) {
    return Response.json({ error: 'Recette introuvable' }, { status: 404 })
  }

  // Vérification accès
  if (recipe.visibility === 'private' && recipe.user_id !== user.id) {
    return Response.json({ error: 'Accès refusé' }, { status: 403 })
  }

  if (recipe.visibility === 'circle' && recipe.user_id !== user.id) {
    const { data: membership } = await service
      .from('family_circle_members')
      .select('id')
      .eq('circle_id', recipe.circle_id!)
      .eq('user_id', user.id)
      .maybeSingle()
    if (!membership) return Response.json({ error: 'Accès refusé' }, { status: 403 })
  }

  const ingredients = [...(recipe.recipe_ingredients ?? [])].sort(
    (a, b) => (a.sort_order ?? 0) - (b.sort_order ?? 0)
  )
  const steps = [...(recipe.recipe_steps ?? [])].sort(
    (a, b) => (a.step_number ?? 0) - (b.step_number ?? 0)
  )

  const { data: fav } = await service
    .from('recipe_favorites')
    .select('id')
    .eq('recipe_id', recipe.id)
    .eq('user_id', user.id)
    .maybeSingle()

  return Response.json({
    ...recipe,
    recipe_ingredients: ingredients,
    recipe_steps: steps,
    is_favorited: !!fav,
    is_owner: recipe.user_id === user.id,
  })
}

export async function PATCH(
  request: NextRequest,
  { params }: { params: { id: string } }
) {
  const supabase = await createClient()
  const { data: { user } } = await supabase.auth.getUser()
  if (!user) return Response.json({ error: 'Non authentifié' }, { status: 401 })

  const service = createServiceClient()
  const { data: existing } = await service
    .from('recipes')
    .select('id, user_id, slug')
    .eq('id', params.id)
    .maybeSingle()

  if (!existing) return Response.json({ error: 'Recette introuvable' }, { status: 404 })
  if (existing.user_id !== user.id) return Response.json({ error: 'Accès refusé' }, { status: 403 })

  const body = await request.json()
  const {
    name, description, category_id, prep_time_min, cook_time_min,
    servings, difficulty, visibility, circle_id, ingredients, steps,
    photo_url,
  } = body

  const updates: Record<string, unknown> = {}
  if (name !== undefined) {
    const trimmed = String(name).trim()
    updates.name             = trimmed
    updates.name_fingerprint = makeFingerprint(trimmed)
    // Recompute slug only if name changed
    const newSlug = makeSlug(trimmed) || 'recette'
    if (newSlug !== existing.slug) {
      const { data: collision } = await service.from('recipes').select('id').eq('slug', newSlug).neq('id', params.id).maybeSingle()
      updates.slug = collision ? `${newSlug}-${Date.now()}` : newSlug
    }
  }
  if (description !== undefined) updates.description   = description || null
  if (category_id !== undefined) updates.category_id   = category_id || null
  if (prep_time_min !== undefined) updates.prep_time_min = prep_time_min ? Number(prep_time_min) : null
  if (cook_time_min !== undefined) updates.cook_time_min = cook_time_min ? Number(cook_time_min) : null
  if (servings !== undefined)  updates.servings  = Math.max(1, Number(servings) || 4)
  if (difficulty !== undefined) updates.difficulty = difficulty || null
  if (visibility !== undefined) {
    updates.visibility = visibility
    updates.circle_id  = visibility === 'circle' ? (circle_id || null) : null
  }
  if (photo_url !== undefined) updates.photo_url = photo_url ?? null

  if (Object.keys(updates).length > 0) {
    // eslint-disable-next-line @typescript-eslint/no-explicit-any
    const { error: updateErr } = await service.from('recipes').update(updates as any).eq('id', params.id)
    if (updateErr) return Response.json({ error: updateErr.message }, { status: 500 })
  }

  type IngRow = { name?: string; quantity?: string | number; unit?: string }
  if (Array.isArray(ingredients)) {
    await service.from('recipe_ingredients').delete().eq('recipe_id', params.id)
    const rows = (ingredients as IngRow[])
      .filter(i => i.name?.trim())
      .map((i, idx) => ({ recipe_id: params.id, name: i.name!.trim(), quantity: i.quantity ? Number(i.quantity) : null, unit: (i.unit as string | undefined)?.trim() || null, sort_order: idx + 1 }))
    if (rows.length > 0) await service.from('recipe_ingredients').insert(rows)
  }

  type StepRow = { description?: string; duration_min?: string | number }
  if (Array.isArray(steps)) {
    await service.from('recipe_steps').delete().eq('recipe_id', params.id)
    const rows = (steps as StepRow[])
      .filter(s => s.description?.trim())
      .map((s, idx) => ({ recipe_id: params.id, step_number: idx + 1, description: s.description!.trim(), duration_min: s.duration_min ? Number(s.duration_min) : null }))
    if (rows.length > 0) await service.from('recipe_steps').insert(rows)
  }

  return Response.json({ id: params.id })
}

export async function DELETE(
  _request: NextRequest,
  { params }: { params: { id: string } }
) {
  const supabase = await createClient()
  const { data: { user } } = await supabase.auth.getUser()
  if (!user) return Response.json({ error: 'Non authentifié' }, { status: 401 })

  const service = createServiceClient()
  const { data: recipe } = await service
    .from('recipes')
    .select('id, user_id')
    .eq('id', params.id)
    .maybeSingle()

  if (!recipe) return Response.json({ error: 'Recette introuvable' }, { status: 404 })
  if (recipe.user_id !== user.id) return Response.json({ error: 'Accès refusé' }, { status: 403 })

  await service.from('recipes').delete().eq('id', params.id)
  return new Response(null, { status: 204 })
}

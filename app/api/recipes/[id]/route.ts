import { createClient } from '@/lib/supabase/server'
import { createServiceClient } from '@/lib/supabase/service'
import { NextRequest } from 'next/server'

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
      .eq('circle_id', recipe.circle_id)
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
  })
}

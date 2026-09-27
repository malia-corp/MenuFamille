import { createClient } from '@/lib/supabase/server'
import { createServiceClient } from '@/lib/supabase/service'
import { NextRequest } from 'next/server'

export async function GET(
  request: NextRequest,
  { params }: { params: { id: string } }
) {
  const supabase = await createClient()
  const { data: { user } } = await supabase.auth.getUser()
  if (!user) return Response.json({ error: 'Non authentifié' }, { status: 401 })

  const role = request.nextUrl.searchParams.get('role')
  if (role !== 'side' && role !== 'drink') {
    return Response.json({ error: 'role doit être "side" ou "drink"' }, { status: 400 })
  }
  const limit = Math.min(Number(request.nextUrl.searchParams.get('limit')) || 4, 10)

  const { id } = params
  const service = createServiceClient()

  // Vérification de visibilité en défense en profondeur — même si la
  // fonction recipe_association_suggestions revérifie déjà tout côté SQL,
  // ne pas dépendre uniquement d'elle pour rejeter tôt les cas invalides.
  const { data: recipe } = await service
    .from('recipes')
    .select('id, visibility, user_id, circle_id')
    .eq('id', id)
    .maybeSingle()

  if (!recipe) return Response.json({ error: 'Recette introuvable' }, { status: 404 })

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

  // La fonction est SECURITY DEFINER et repose sur auth.uid() pour la
  // pondération personnelle x2 — appelée via le client utilisateur (pas
  // service role), contrairement au générateur qui calcule ça lui-même en JS.
  const { data: suggestions, error } = await supabase.rpc('recipe_association_suggestions', {
    p_recipe_id: id,
    p_role: role,
    p_limit: limit,
  })

  if (error) return Response.json({ error: error.message }, { status: 500 })
  if (!suggestions?.length) return Response.json([])

  const ids = suggestions.map(s => s.associated_recipe_id)
  const { data: recipes } = await service
    .from('recipes')
    .select('id, name, photo_url, categories(name, icon)')
    .in('id', ids)

  const recipesById = new Map((recipes ?? []).map(r => [r.id, r]))

  const result = suggestions
    .map(s => {
      const r = recipesById.get(s.associated_recipe_id)
      if (!r) return null
      return { id: r.id, name: r.name, photo_url: r.photo_url, category: r.categories, score: s.score }
    })
    .filter((r) => r !== null)

  return Response.json(result)
}

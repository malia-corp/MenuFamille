import { createClient } from '@/lib/supabase/server'
import { createServiceClient } from '@/lib/supabase/service'
import { NextRequest } from 'next/server'

export async function POST(
  _request: NextRequest,
  { params }: { params: { id: string } }
) {
  const supabase = await createClient()
  const { data: { user } } = await supabase.auth.getUser()
  if (!user) return Response.json({ error: 'Non authentifié' }, { status: 401 })

  const { id } = params
  const service = createServiceClient()

  // Vérifier que la recette existe et est accessible
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

  // Toggle
  const { data: existing } = await service
    .from('recipe_favorites')
    .select('id')
    .eq('recipe_id', id)
    .eq('user_id', user.id)
    .maybeSingle()

  if (existing) {
    const { error: delErr } = await service.from('recipe_favorites').delete().eq('id', existing.id)
    if (delErr) return Response.json({ error: delErr.message }, { status: 500 })
    return Response.json({ is_favorited: false })
  }

  const { error: insErr } = await service.from('recipe_favorites').insert({ recipe_id: id, user_id: user.id })
  if (insErr) return Response.json({ error: insErr.message }, { status: 500 })
  return Response.json({ is_favorited: true })
}

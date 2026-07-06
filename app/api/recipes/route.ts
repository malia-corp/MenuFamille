import { createClient } from '@/lib/supabase/server'
import { createServiceClient } from '@/lib/supabase/service'
import { NextRequest } from 'next/server'

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

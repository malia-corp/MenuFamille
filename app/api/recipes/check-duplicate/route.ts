import { createClient } from '@/lib/supabase/server'
import { createServiceClient } from '@/lib/supabase/service'
import { findSimilarRecipe } from '@/lib/utils/recipe-similarity'
import { NextRequest } from 'next/server'

// Contrôle de doublon avant enregistrement : seulement pour une recette
// partagée (cercle ou communauté) — une recette privée n'est jamais comparée.
export async function POST(request: NextRequest) {
  const supabase = await createClient()
  const { data: { user } } = await supabase.auth.getUser()
  if (!user) return Response.json({ error: 'Non authentifié' }, { status: 401 })

  const { name, visibility, circle_id, exclude_id } = await request.json() as {
    name?: string; visibility?: string; circle_id?: string | null; exclude_id?: string | null
  }

  if (!name?.trim() || name.trim().length < 2) return Response.json({ error: 'Nom trop court' }, { status: 400 })
  if (visibility === 'private' || !visibility) return Response.json({ duplicate: null })

  const duplicate = await findSimilarRecipe(createServiceClient(), {
    name: name.trim(),
    userId: user.id,
    circleId: visibility === 'circle' ? circle_id : null,
    excludeId: exclude_id,
  })

  return Response.json({ duplicate })
}

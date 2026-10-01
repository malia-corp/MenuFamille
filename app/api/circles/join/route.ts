import { createClient } from '@/lib/supabase/server'
import { createServiceClient } from '@/lib/supabase/service'

export async function POST(request: Request) {
  const supabase = await createClient()

  const { data: { user } } = await supabase.auth.getUser()
  if (!user) return Response.json({ error: 'Non authentifié' }, { status: 401 })

  const { invite_code } = await request.json()
  if (!invite_code || typeof invite_code !== 'string') {
    return Response.json({ error: 'Code d\'invitation requis' }, { status: 400 })
  }

  // Service role : la policy RLS circles_select_member exige deja d'etre
  // membre du cercle pour le lire — ce qui est exactement ce que cette
  // route sert a faire pour la premiere fois. Avec le client session, la
  // recherche par code ne trouvait jamais rien pour un non-membre, meme
  // avec un code correct ("Code invalide" trompeur).
  const service = createServiceClient()
  const { data: circle, error: circleError } = await service
    .from('family_circles')
    .select('*')
    .eq('invite_code', invite_code.trim().toUpperCase())
    .maybeSingle()

  if (circleError) return Response.json({ error: circleError.message }, { status: 500 })
  if (!circle) return Response.json({ error: 'Code invalide, vérifie l\'invitation' }, { status: 404 })

  const { data: existing } = await supabase
    .from('family_circle_members')
    .select('id')
    .eq('circle_id', circle.id)
    .eq('user_id', user.id)
    .maybeSingle()

  if (existing) {
    return Response.json({ error: 'Tu es déjà membre de ce cercle' }, { status: 409 })
  }

  const { error: insertError } = await supabase.from('family_circle_members').insert({
    circle_id: circle.id,
    user_id: user.id,
    role: 'membre',
  })

  if (insertError) return Response.json({ error: insertError.message }, { status: 500 })

  return Response.json({ circle })
}

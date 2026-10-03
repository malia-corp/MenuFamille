import { createClient } from '@/lib/supabase/server'
import { createServiceClient } from '@/lib/supabase/service'

export async function DELETE(
  _request: Request,
  { params }: { params: { id: string; userId: string } }
) {
  const supabase = await createClient()

  const { data: { user } } = await supabase.auth.getUser()
  if (!user) return Response.json({ error: 'Non authentifié' }, { status: 401 })

  const { data: myMembership } = await supabase
    .from('family_circle_members')
    .select('role')
    .eq('circle_id', params.id)
    .eq('user_id', user.id)
    .maybeSingle()

  if (!myMembership) return Response.json({ error: 'Tu n\'es pas membre de ce cercle' }, { status: 403 })

  const leaving = params.userId === user.id
  if (leaving && myMembership.role === 'planificatrice') {
    return Response.json({ error: 'La planificatrice ne peut pas se retirer elle-même' }, { status: 400 })
  }
  // Un membre peut quitter le cercle ; seule la planificatrice retire les autres.
  if (!leaving && myMembership.role !== 'planificatrice') {
    return Response.json({ error: 'Seule la planificatrice peut retirer des membres' }, { status: 403 })
  }

  const { error } = await supabase
    .from('family_circle_members')
    .delete()
    .eq('circle_id', params.id)
    .eq('user_id', params.userId)

  if (error) return Response.json({ error: error.message }, { status: 500 })

  return new Response(null, { status: 204 })
}

// Activer / désactiver un membre (planificatrice uniquement, membres
// uniquement — pas une autre planificatrice ni soi-même). Un membre désactivé
// garde son historique mais n'accède plus au menu, aux votes ni aux autres
// membres (cf. migration v_circle_member_status).
export async function PATCH(
  request: Request,
  { params }: { params: { id: string; userId: string } }
) {
  const supabase = await createClient()

  const { data: { user } } = await supabase.auth.getUser()
  if (!user) return Response.json({ error: 'Non authentifié' }, { status: 401 })

  const { is_active } = await request.json().catch(() => ({}))
  if (typeof is_active !== 'boolean') {
    return Response.json({ error: 'is_active (booléen) requis' }, { status: 400 })
  }

  const { data: myMembership } = await supabase
    .from('family_circle_members')
    .select('role, is_active')
    .eq('circle_id', params.id)
    .eq('user_id', user.id)
    .maybeSingle()

  if (!myMembership?.is_active || myMembership.role !== 'planificatrice') {
    return Response.json({ error: 'Seule la planificatrice peut changer le statut d\'un membre' }, { status: 403 })
  }
  if (params.userId === user.id) {
    return Response.json({ error: 'Tu ne peux pas changer ton propre statut' }, { status: 400 })
  }

  // Pas de policy UPDATE sur family_circle_members : écriture via le client
  // service, après le contrôle ci-dessus.
  const service = createServiceClient()
  const { data, error } = await service
    .from('family_circle_members')
    .update({ is_active })
    .eq('circle_id', params.id)
    .eq('user_id', params.userId)
    .eq('role', 'membre')
    .select('id, is_active')
    .maybeSingle()

  if (error) return Response.json({ error: error.message }, { status: 500 })
  if (!data) return Response.json({ error: 'Membre introuvable' }, { status: 404 })

  return Response.json(data)
}

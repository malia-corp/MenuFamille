import { createClient } from '@/lib/supabase/server'
import { DEFAULT_MEAL_CONFIGS, type MealType } from '@/lib/constants/meal-type'
import { sortByMealType } from '@/lib/utils/sort-meal-configs'

export async function GET() {
  const supabase = await createClient()

  const { data: { user } } = await supabase.auth.getUser()
  if (!user) return Response.json({ error: 'Non authentifié' }, { status: 401 })

  const { data, error } = await supabase
    .from('user_meal_config')
    .select('*')
    .eq('user_id', user.id)

  if (error) return Response.json({ error: error.message }, { status: 500 })

  if (!data || data.length === 0) {
    const { data: inserted, error: insertError } = await supabase
      .from('user_meal_config')
      .insert(DEFAULT_MEAL_CONFIGS.map((c) => ({ ...c, user_id: user.id })))
      .select()

    if (insertError) return Response.json({ error: insertError.message }, { status: 500 })
    return Response.json(sortByMealType(inserted ?? []))
  }

  return Response.json(sortByMealType(data))
}

interface MealConfigPatch {
  meal_type:     MealType
  is_active?:    boolean
  mode?:         'daily' | 'template'
  default_time?: string | null
}

const MEAL_TYPES: MealType[] = ['petit_dejeuner', 'dejeuner', 'gouter', 'diner']
const TIME_RE = /^([01]\d|2[0-3]):[0-5]\d(:[0-5]\d)?$/

// Accepte un objet (mise a jour d'un seul repas) ou un tableau (ecran
// "Rythme des repas" : tout le rythme enregistre d'un coup, valide en entier
// avant la moindre ecriture).
export async function PUT(request: Request) {
  const supabase = await createClient()

  const { data: { user } } = await supabase.auth.getUser()
  if (!user) return Response.json({ error: 'Non authentifié' }, { status: 401 })

  const body = await request.json()
  const patches: MealConfigPatch[] = Array.isArray(body) ? body : [body]

  for (const p of patches) {
    if (!p?.meal_type || !MEAL_TYPES.includes(p.meal_type)) {
      return Response.json({ error: 'meal_type requis' }, { status: 400 })
    }
    if (p.meal_type === 'dejeuner' && p.is_active === false) {
      return Response.json(
        { error: 'Le déjeuner ne peut pas être désactivé' },
        { status: 422 }
      )
    }
    if (p.mode !== undefined && p.mode !== 'daily' && p.mode !== 'template') {
      return Response.json({ error: 'mode invalide' }, { status: 400 })
    }
    if (p.default_time != null && !TIME_RE.test(p.default_time)) {
      return Response.json({ error: 'default_time invalide (HH:MM)' }, { status: 400 })
    }
  }

  const updated = []
  for (const p of patches) {
    const updates: { is_active?: boolean; mode?: 'daily' | 'template'; default_time?: string | null } = {}
    if (p.is_active !== undefined) updates.is_active = p.is_active
    if (p.mode !== undefined) updates.mode = p.mode
    if (p.default_time !== undefined) updates.default_time = p.default_time

    const { data, error } = await supabase
      .from('user_meal_config')
      .update(updates)
      .eq('user_id', user.id)
      .eq('meal_type', p.meal_type)
      .select()
      .single()

    if (error) return Response.json({ error: error.message }, { status: 500 })
    updated.push(data)
  }

  return Response.json(Array.isArray(body) ? sortByMealType(updated) : updated[0])
}

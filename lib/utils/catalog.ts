// Catalogue KeskonBouf : recettes officielles publiées par un compte admin
// (cf. docs/catalogue-recettes.md). Le rôle est toujours relu en base : un
// indicateur envoyé par le navigateur ne suffit jamais.

import type { createServiceClient } from '@/lib/supabase/service'

type Service = ReturnType<typeof createServiceClient>

export async function isAdmin(service: Service, userId: string): Promise<boolean> {
  const { data } = await service.from('users').select('app_role').eq('id', userId).maybeSingle()
  return data?.app_role === 'admin'
}

export const RIGHTS_ORIGINS = ['maison', 'licence_libre', 'accord_auteur'] as const
export type RightsOrigin = typeof RIGHTS_ORIGINS[number]

export interface RecipeRights {
  origin: RightsOrigin
  author: string
  license: string | null      // obligatoire pour une licence libre (« CC BY-SA 4.0 »…)
  inspired_by: string | null  // simple crédit d'inspiration, jamais une copie
  photo_credit: string | null // obligatoire dès qu'il y a une photo
  checked_by: string
  checked_at: string
}

const text = (v: unknown, max: number) => (typeof v === 'string' ? v.trim().slice(0, max) : '')

// Valide la provenance envoyée par le formulaire. Renvoie un message en
// français si elle ne permet pas de publier.
export function validateRights(
  raw: unknown,
  ctx: { photoUrl: string | null; checkedBy: string },
): { rights: RecipeRights } | { error: string } {
  const r = (raw && typeof raw === 'object' ? raw : {}) as Record<string, unknown>
  const origin = RIGHTS_ORIGINS.find(o => o === r.origin)
  if (!origin) return { error: 'Indique la provenance de la recette.' }
  const author = text(r.author, 80)
  if (author.length < 2) return { error: 'Indique l’auteur de la recette.' }
  const license = text(r.license, 80) || null
  if (origin === 'licence_libre' && !license) return { error: 'Indique la licence de la recette (ex. CC BY-SA 4.0).' }
  if (origin === 'accord_auteur' && !text(r.inspired_by, 500)) return { error: 'Indique le lien vers l’auteur qui a donné son accord.' }
  let inspired_by: string | null = text(r.inspired_by, 500) || null
  if (inspired_by) {
    try {
      const u = new URL(inspired_by)
      if (u.protocol !== 'https:' && u.protocol !== 'http:') throw new Error()
      inspired_by = u.toString()
    } catch {
      return { error: 'Le lien d’inspiration n’est pas une adresse web valide.' }
    }
  }
  const photo_credit = text(r.photo_credit, 120) || null
  if (ctx.photoUrl && !photo_credit) return { error: 'Indique le crédit de la photo, ou retire-la.' }
  return {
    rights: { origin, author, license, inspired_by, photo_credit: ctx.photoUrl ? photo_credit : null, checked_by: ctx.checkedBy, checked_at: new Date().toISOString() },
  }
}

// Toutes les règles d'entrée au catalogue, communes à la création et à la
// modification : compte admin, pas de recette importée d'un site, photo
// hébergée chez nous et créditée, provenance complète.
export async function catalogEntry(
  service: Service,
  input: { userId: string; rights: unknown; photoUrl: string | null; sourceUrl: string | null },
): Promise<{ rights: RecipeRights } | { error: string; status: number }> {
  if (!(await isAdmin(service, input.userId))) {
    return { error: 'Le catalogue KeskonBouf est réservé aux administrateurs.', status: 403 }
  }
  if (input.sourceUrl) {
    return { error: 'Une recette importée d’un site ne peut pas entrer au catalogue : réécris-la avec tes mots et cite le site en inspiration.', status: 400 }
  }
  if (!isOwnStoragePhoto(input.photoUrl)) {
    return { error: 'La photo du catalogue doit être envoyée depuis ton appareil, pas reprise d’un autre site.', status: 400 }
  }
  const v = validateRights(input.rights, { photoUrl: input.photoUrl, checkedBy: input.userId })
  return 'error' in v ? { error: v.error, status: 400 } : v
}

// Une photo du catalogue est hébergée chez nous (bucket recipe-photos), jamais
// un lien vers une image d'un autre site.
export function isOwnStoragePhoto(url: string | null): boolean {
  if (!url) return true
  const base = process.env.NEXT_PUBLIC_SUPABASE_URL
  return !!base && url.startsWith(`${base.replace(/\/$/, '')}/storage/v1/object/public/recipe-photos/`)
}

import type { createServiceClient } from '@/lib/supabase/service'

type ServiceClient = ReturnType<typeof createServiceClient>

const DIACRITICS_RE = /[̀-ͯ]/g

// Nom normalisé (minuscules, sans accents, espaces compressés) — même règle
// que recipes.name_fingerprint.
export function nameFingerprint(name: string): string {
  return name.normalize('NFD').replace(DIACRITICS_RE, '').toLowerCase().replace(/\s+/g, ' ').trim()
}

// Trigrammes à la manière de pg_trgm : chaque mot est entouré de deux espaces
// devant et un derrière, puis découpé en séquences de 3 caractères.
function trigrams(text: string): Set<string> {
  const out = new Set<string>()
  for (const word of nameFingerprint(text).split(/[^a-z0-9]+/).filter(Boolean)) {
    const padded = `  ${word} `
    for (let i = 0; i <= padded.length - 3; i++) out.add(padded.slice(i, i + 3))
  }
  return out
}

export function nameSimilarity(a: string, b: string): number {
  const ta = trigrams(a)
  const tb = trigrams(b)
  if (ta.size === 0 || tb.size === 0) return 0
  let common = 0
  ta.forEach(t => { if (tb.has(t)) common++ })
  return common / (ta.size + tb.size - common)
}

// Au-delà de ce seuil, deux noms sont considérés comme la même recette.
export const SIMILARITY_THRESHOLD = 0.55

export interface SimilarRecipe {
  id:          string
  name:        string
  photo_url:   string | null
  created_at:  string
  author_name: string | null
  similarity:  number // 0-100
}

// Recette la plus proche parmi celles que la nouvelle recette côtoierait une
// fois partagée : communauté, cercle visé, et recettes de l'auteur. Jamais une
// recette privée d'un autre utilisateur (CDC 5.3.2).
export async function findSimilarRecipe(
  service: ServiceClient,
  opts: { name: string; userId: string; circleId?: string | null; excludeId?: string | null },
): Promise<SimilarRecipe | null> {
  const scope = [`visibility.eq.community`, `user_id.eq.${opts.userId}`]
  if (opts.circleId) scope.push(`and(visibility.eq.circle,circle_id.eq.${opts.circleId})`)

  const { data } = await service
    .from('recipes')
    .select('id, name, photo_url, created_at, user_id')
    .or(scope.join(','))
    .limit(2000)

  let best: { row: NonNullable<typeof data>[number]; score: number } | null = null
  for (const row of data ?? []) {
    if (row.id === opts.excludeId) continue
    const score = nameSimilarity(opts.name, row.name)
    if (score >= SIMILARITY_THRESHOLD && (!best || score > best.score)) best = { row, score }
  }
  if (!best) return null

  let authorName: string | null = null
  if (best.row.user_id) {
    const { data: author } = await service.from('users').select('display_name').eq('id', best.row.user_id).maybeSingle()
    authorName = author?.display_name ?? null
  }

  return {
    id:          best.row.id,
    name:        best.row.name,
    photo_url:   best.row.photo_url,
    created_at:  best.row.created_at,
    author_name: authorName,
    similarity:  Math.round(best.score * 100),
  }
}

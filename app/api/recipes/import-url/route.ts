import { createHash } from 'crypto'
import { createClient } from '@/lib/supabase/server'
import { fetchPage } from '@/lib/import/fetch-page'
import { importFromHtml } from '@/lib/import/pipeline'
import type { ImportedIngredient } from '@/lib/import/types'

// Import d'une recette depuis un lien (pipeline v2, cf. docs/import-recettes.md).
// Ne crée rien : renvoie une fiche proposée, relue par l'utilisatrice.
//
// Réponse : la forme v2 (status, page_type, source_type, recipe, warnings,
// raw_notes) + le champ historique `partial`, gardé à l'identique pour
// l'application mobile tant qu'elle n'est pas mise à jour (décision du 28/10).

const PARSER_VERSION = 'v2'

function ingredientLine(i: ImportedIngredient): string {
  return [i.quantity, i.unit, i.name].filter(v => v !== null && v !== '').join(' ')
}

export async function POST(request: Request) {
  const supabase = await createClient()
  const { data: { user } } = await supabase.auth.getUser()
  if (!user) return Response.json({ error: 'Non authentifié' }, { status: 401 })

  const body = await request.json().catch(() => null) as { url?: unknown } | null
  const url = typeof body?.url === 'string' ? body.url.trim() : ''
  if (!url) return Response.json({ error: 'URL invalide', code: 'invalid_url' }, { status: 400 })

  const page = await fetchPage(url)
  if (!page.ok) {
    return Response.json({ error: page.message, code: page.error }, { status: page.error === 'invalid_url' ? 400 : 422 })
  }

  const result = importFromHtml(page.html, page.finalUrl)
  const raw_html_hash = createHash('sha256').update(page.html).digest('hex').slice(0, 16)
  const r = result.recipe

  // Forme historique (application mobile) : chaînes, comme la v1.
  const partial = {
    name: r.name,
    description: r.tip ?? '',
    prep_time_min: r.prep_min,
    cook_time_min: r.cook_min,
    servings: r.servings ?? 4,
    ingredients: r.ingredients.map(ingredientLine),
    steps: r.steps.map(s => s.text),
    photo_url: r.photo_url,
  }

  return Response.json({
    success: result.status !== 'failed',
    partial,
    raw_html_hash,
    source_url: url,
    parser_version: PARSER_VERSION,
    ...result,
  })
}

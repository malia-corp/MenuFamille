import { createHash } from 'crypto'
import { createClient } from '@/lib/supabase/server'

function parseDuration(iso: string): number {
  const h = parseInt(iso.match(/(\d+)H/)?.[1] ?? '0')
  const m = parseInt(iso.match(/(\d+)M/)?.[1] ?? '0')
  return h * 60 + m
}

function extractRecipeLD(html: string): Record<string, unknown> | null {
  const blocks = [...html.matchAll(/<script[^>]+type="application\/ld\+json"[^>]*>([\s\S]*?)<\/script>/gi)]
  for (const [, raw] of blocks) {
    try {
      const obj = JSON.parse(raw.trim())
      const nodes = Array.isArray(obj['@graph']) ? obj['@graph'] : [obj]
      const r = nodes.find((n: Record<string, unknown>) =>
        String(n['@type']).toLowerCase().includes('recipe'))
      if (r) return r as Record<string, unknown>
    } catch { /* skip */ }
  }
  return null
}

function extractMeta(html: string, prop: string): string {
  return html.match(new RegExp(`<meta[^>]+(?:property|name)="${prop}"[^>]+content="([^"]+)"`, 'i'))?.[1] ?? ''
}

export async function POST(request: Request) {
  const supabase = await createClient()
  const { data: { user } } = await supabase.auth.getUser()
  if (!user) return Response.json({ error: 'Non authentifié' }, { status: 401 })

  const { url } = await request.json()
  try { new URL(url) } catch {
    return Response.json({ error: 'URL invalide' }, { status: 400 })
  }

  let html: string
  try {
    const res = await fetch(url, {
      signal: AbortSignal.timeout(8000),
      headers: { 'User-Agent': 'MenuFamille-Bot/1.0' },
    })
    html = await res.text()
  } catch {
    return Response.json({ error: 'Impossible de récupérer la page' }, { status: 422 })
  }

  const raw_html_hash = createHash('sha256').update(html).digest('hex').slice(0, 16)
  const recipe = extractRecipeLD(html)
  let partial: Record<string, unknown> = {}

  if (recipe) {
    const instructions: string[] = (Array.isArray(recipe.recipeInstructions)
      ? recipe.recipeInstructions as unknown[]
      : [])
      .map((s: unknown) => (typeof s === 'object' && s !== null
        ? (s as Record<string, string>).text
        : String(s)))
      .filter(Boolean)

    partial = {
      name:          recipe.name ?? '',
      description:   recipe.description ?? '',
      prep_time_min: recipe.prepTime ? parseDuration(String(recipe.prepTime)) : null,
      cook_time_min: recipe.cookTime ? parseDuration(String(recipe.cookTime)) : null,
      servings:      parseInt(String(recipe.recipeYield ?? '4')) || 4,
      ingredients:   Array.isArray(recipe.recipeIngredient) ? recipe.recipeIngredient : [],
      steps:         instructions,
      photo_url:     Array.isArray(recipe.image) ? recipe.image[0] : (recipe.image ?? null),
    }
  } else {
    partial = {
      name:        extractMeta(html, 'og:title') || html.match(/<title>([^<]+)<\/title>/i)?.[1] || '',
      description: extractMeta(html, 'og:description') || '',
      photo_url:   extractMeta(html, 'og:image') || null,
    }
  }

  return Response.json({ success: !!recipe, partial, raw_html_hash, source_url: url })
}

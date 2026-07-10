import { createHash } from 'crypto'
import { createClient } from '@/lib/supabase/server'

// ── Durée ISO 8601 → minutes ──────────────────────────────────
function parseDuration(iso: string): number {
  const h = parseInt(iso.match(/(\d+)H/)?.[1] ?? '0')
  const m = parseInt(iso.match(/(\d+)M/)?.[1] ?? '0')
  return h * 60 + m
}

// ── Stratégie 1 : JSON-LD Schema.org Recipe ──────────────────
function extractRecipeLD(html: string): Record<string, unknown> | null {
  const blocks = Array.from(html.matchAll(/<script[^>]+type="application\/ld\+json"[^>]*>([\s\S]*?)<\/script>/gi))
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

// ── Stratégie 2 : Microdata HTML (itemtype + itemprop) ────────
function extractRecipeMicrodata(html: string): Record<string, unknown> | null {
  const cMatch = html.match(
    /<[^>]+itemtype="[^"]*[Rr]ecipe[^"]*"[^>]*>([\s\S]*?)(?=<[^>]+itemtype=|$)/i
  )
  if (!cMatch) return null
  const c = cMatch[1]

  function getOne(prop: string): string {
    return (
      c.match(new RegExp(`itemprop="${prop}"[^>]*content="([^"]+)"`, 'i'))?.[1] ||
      c.match(new RegExp(`itemprop="${prop}"[^>]*>\\s*([^<]+)`, 'i'))?.[1] ||
      ''
    ).trim()
  }

  function getAll(prop: string): string[] {
    const re = new RegExp(
      `itemprop="${prop}"[^>]*(?:content="([^"]+)"|>\\s*([^<]+))`,
      'gi'
    )
    const out: string[] = []
    let m
    while ((m = re.exec(c))) {
      const v = (m[1] || m[2] || '').trim()
      if (v) out.push(v)
    }
    return out
  }

  const name = getOne('name')
  if (!name) return null

  return {
    name,
    description:        getOne('description'),
    prepTime:           getOne('prepTime'),
    cookTime:           getOne('cookTime'),
    recipeYield:        getOne('recipeYield'),
    recipeIngredient:   [...getAll('recipeIngredient'), ...getAll('ingredients')],
    recipeInstructions: [...getAll('recipeInstructions'), ...getAll('step')],
    image:              getOne('image'),
  }
}

// ── Stratégie 3 : heuristique texte brut français ─────────────
function stripHtml(html: string): string {
  return html
    .replace(/<script[\s\S]*?<\/script>/gi, '')
    .replace(/<style[\s\S]*?<\/style>/gi, '')
    .replace(/<[^>]+>/g, '\n')
    .replace(/&amp;/g, '&')
    .replace(/&lt;/g, '<')
    .replace(/&gt;/g, '>')
    .replace(/&[a-z]+;/gi, ' ')
    .replace(/[ \t]+/g, ' ')
    .replace(/\n{3,}/g, '\n\n')
    .trim()
}

function extractRecipePlainText(html: string): Record<string, unknown> | null {
  const text = stripHtml(html)
  const lines = text.split('\n').map(l => l.trim()).filter(Boolean)

  const startIdx = lines.findIndex(l =>
    /^(pour\s+\d+|préparation\s*[:\-]|ingrédients\s*[:\-]|cuisson\s*[:\-])/i.test(l)
  )
  if (startIdx === -1) return null

  const rl = lines.slice(startIdx)
  const joined = rl.join('\n')

  const prepMatch = joined.match(/préparation\s*[:\-]?\s*(\d+)\s*min/i)
  const cookMatch = joined.match(/cuisson\s*[:\-]?\s*(\d+)\s*min/i)
  const servMatch = joined.match(/pour\s+(\d+)\s+personne/i)

  const ingredients = rl
    .filter(l => /^[-•*–]\s+\S/.test(l))
    .map(l => l.replace(/^[-•*–]\s+/, '').trim())
    .filter(Boolean)

  const steps = rl
    .filter(l => /^\d+[)\.]\s+\S/.test(l))
    .map(l => l.replace(/^\d+[)\.]\s+/, '').trim())
    .filter(Boolean)

  if (!ingredients.length && !steps.length) return null

  return {
    prep_time_min: prepMatch ? parseInt(prepMatch[1]) : null,
    cook_time_min: cookMatch ? parseInt(cookMatch[1]) : null,
    servings:      servMatch ? parseInt(servMatch[1]) : null,
    ingredients,
    steps,
  }
}

// ── Balises og: ───────────────────────────────────────────────
function extractMeta(html: string, prop: string): string {
  return html.match(new RegExp(`<meta[^>]+(?:property|name)="${prop}"[^>]+content="([^"]+)"`, 'i'))?.[1] ?? ''
}

// ── Mapping JSON-LD / Microdata → partial ─────────────────────
function mapLdToPartial(r: Record<string, unknown>): Record<string, unknown> {
  const instructions: string[] = (Array.isArray(r.recipeInstructions)
    ? r.recipeInstructions as unknown[]
    : [])
    .map((s: unknown) => (typeof s === 'object' && s !== null
      ? (s as Record<string, string>).text
      : String(s)))
    .filter(Boolean)

  return {
    name:          r.name ?? '',
    description:   r.description ?? '',
    prep_time_min: r.prepTime ? parseDuration(String(r.prepTime)) : null,
    cook_time_min: r.cookTime ? parseDuration(String(r.cookTime)) : null,
    servings:      parseInt(String(r.recipeYield ?? '4')) || 4,
    ingredients:   Array.isArray(r.recipeIngredient) ? r.recipeIngredient : [],
    steps:         instructions,
    photo_url:     Array.isArray(r.image) ? r.image[0] : (r.image ?? null),
  }
}

// ── Handler ───────────────────────────────────────────────────
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
    if (!res.ok) {
      return Response.json({ error: `Site inaccessible (HTTP ${res.status})` }, { status: 422 })
    }
    html = await res.text()
  } catch {
    return Response.json({ error: 'Impossible de récupérer la page' }, { status: 422 })
  }

  const raw_html_hash = createHash('sha256').update(html).digest('hex').slice(0, 16)

  const ogName  = extractMeta(html, 'og:title') || html.match(/<title>([^<]+)<\/title>/i)?.[1] || ''
  const ogDesc  = extractMeta(html, 'og:description')
  const ogPhoto = extractMeta(html, 'og:image') || null

  let partial: Record<string, unknown> = {}
  let success = false

  // 1. JSON-LD
  const ld = extractRecipeLD(html)
  if (ld) {
    partial = mapLdToPartial(ld)
    success = true
  } else {
    // 2. Microdata
    const md = extractRecipeMicrodata(html)
    if (md) {
      partial = mapLdToPartial(md)
      success = true
    } else {
      // 3. Heuristique texte brut
      const pt = extractRecipePlainText(html)
      if (pt) {
        partial = { name: ogName, description: ogDesc, photo_url: ogPhoto, ...pt }
        success = true
      } else {
        // Fallback og: uniquement
        partial = { name: ogName, description: ogDesc, photo_url: ogPhoto }
      }
    }
  }

  return Response.json({ success, partial, raw_html_hash, source_url: url })
}

// Ce que la page déclare d'elle-même, avant toute extraction : données
// structurées schema.org et extensions de recettes connues. Sert au
// diagnostic (scripts/import-eval.ts) et servira au choix de l'extracteur.

export interface PageSignals {
  bytes: number
  jsonLdBlocks: number
  jsonLdTypes: string[]
  jsonLdRecipe: boolean
  jsonLdInvalid: number
  microdataRecipe: boolean
  plugins: string[]
}

// Préfixes de classes CSS des extensions WordPress de recettes les plus courantes.
const PLUGIN_MARKERS: Record<string, RegExp> = {
  wprm:          /class=["'][^"']*\bwprm-/i,
  'tasty-recipes': /class=["'][^"']*\btasty-recipes/i,
  'mv-create':   /class=["'][^"']*\bmv-create/i,
  'wpzoom':      /class=["'][^"']*\bwp-block-wpzoom-recipe/i,
  'zip-recipes': /class=["'][^"']*\bzip-recipe/i,
  'cooked':      /class=["'][^"']*\bcooked-recipe/i,
  'recipe-card': /class=["'][^"']*\brecipe-card\b/i,
}

function typesOf(node: unknown): string[] {
  if (!node || typeof node !== 'object') return []
  const t = (node as Record<string, unknown>)['@type']
  return (Array.isArray(t) ? t : [t]).filter((x): x is string => typeof x === 'string')
}

// Nœuds d'un bloc JSON-LD : objet, tableau, ou @graph (éventuellement imbriqués).
export function jsonLdNodes(value: unknown): Record<string, unknown>[] {
  if (Array.isArray(value)) return value.flatMap(jsonLdNodes)
  if (!value || typeof value !== 'object') return []
  const obj = value as Record<string, unknown>
  return [obj, ...(obj['@graph'] ? jsonLdNodes(obj['@graph']) : [])]
}

export function jsonLdBlocks(html: string): string[] {
  return Array.from(html.matchAll(/<script[^>]*type=["']application\/ld\+json["'][^>]*>([\s\S]*?)<\/script>/gi), m => m[1])
}

export function pageSignals(html: string): PageSignals {
  const blocks = jsonLdBlocks(html)
  const types = new Set<string>()
  let recipe = false
  let invalid = 0
  for (const raw of blocks) {
    try {
      for (const node of jsonLdNodes(JSON.parse(raw.trim()))) {
        for (const t of typesOf(node)) {
          types.add(t)
          if (t.toLowerCase() === 'recipe') recipe = true
        }
      }
    } catch {
      invalid++
    }
  }
  return {
    bytes: Buffer.byteLength(html),
    jsonLdBlocks: blocks.length,
    jsonLdTypes: Array.from(types),
    jsonLdRecipe: recipe,
    jsonLdInvalid: invalid,
    microdataRecipe: /itemtype=["'][^"']*schema\.org\/Recipe["']/i.test(html),
    plugins: Object.entries(PLUGIN_MARKERS).filter(([, re]) => re.test(html)).map(([k]) => k),
  }
}

// Extracteurs structurés : JSON-LD schema.org/Recipe, puis microdonnées.
// Ils lisent ce que la page déclare ; les valeurs restent brutes (chaînes),
// la normalisation se fait ensuite (normalize.ts). La description de la page
// n'est jamais reprise : elle contient souvent la préparation (cas 07, 08)
// ou un texte promotionnel (cas 04).

import { jsonLdBlocks, jsonLdNodes } from './signals'
import { cleanText } from './normalize'

export interface StructuredRecipe {
  source: 'json_ld' | 'microdata'
  name: string | null
  yield: unknown
  prepTime: unknown
  cookTime: unknown
  totalTime: unknown
  ingredients: string[]
  steps: string[]          // une sous-recette (HowToSection) est préfixée « Nom : »
  category: string[]
  image: string | null
  recipeCount: number      // nombre de nœuds Recipe dans la page (article multi-recettes)
}

const stripTags = (s: string) => cleanText(s.replace(/<br\s*\/?>/gi, '\n').replace(/<[^>]+>/g, ' '))

function asStrings(v: unknown): string[] {
  if (v === null || v === undefined) return []
  if (Array.isArray(v)) return v.flatMap(asStrings)
  if (typeof v === 'string') return [v]
  if (typeof v === 'object') {
    const o = v as Record<string, unknown>
    if (typeof o.name === 'string') return [o.name]
    if (typeof o.text === 'string') return [o.text]
  }
  return []
}

function imageUrl(v: unknown): string | null {
  if (!v) return null
  if (typeof v === 'string') return v
  if (Array.isArray(v)) { for (const x of v) { const u = imageUrl(x); if (u) return u } return null }
  if (typeof v === 'object') {
    const o = v as Record<string, unknown>
    return typeof o.url === 'string' ? o.url : typeof o.contentUrl === 'string' ? o.contentUrl : null
  }
  return null
}

function isRecipe(n: Record<string, unknown>): boolean {
  const t = n['@type']
  return (Array.isArray(t) ? t : [t]).some(x => typeof x === 'string' && x.toLowerCase() === 'recipe')
}

// recipeInstructions : chaîne, liste de chaînes, HowToStep, HowToSection
// (itemListElement), ItemList… Le texte d'un HowToStep est dans `text` ; son
// `name` est souvent une légende de photo (cas 08) et n'est pas repris.
function instructions(v: unknown, section: string | null = null): string[] {
  if (v === null || v === undefined) return []
  if (typeof v === 'string') {
    // Une seule chaîne : une étape par paragraphe ou par ligne, sinon par numéro (« 1. … 2. … »).
    let parts = v.replace(/<\/(?:p|li|div)>|<br\s*\/?>/gi, '\n').split(/\n+/)
    if (parts.filter(p => p.trim()).length === 1) parts = parts.join(' ').split(/\s(?=\d+[.)]\s+[A-ZÀ-Ý])/)
    return parts.map(stripTags).filter(Boolean).map((t, i) => (section && i === 0 ? `${section} : ${t}` : t))
  }
  if (Array.isArray(v)) {
    const out: string[] = []
    for (const x of v) {
      const sec = out.length === 0 ? section : null
      // Élément de liste en chaîne : une étape, même sur plusieurs lignes (cas 02).
      if (typeof x === 'string') { const t = stripTags(x); if (t) out.push(sec ? `${sec} : ${t}` : t) }
      else out.push(...instructions(x, sec))
    }
    return out
  }
  if (typeof v === 'object') {
    const o = v as Record<string, unknown>
    const type = String(o['@type'] ?? '')
    if (/HowToSection|ItemList/i.test(type) || Array.isArray(o.itemListElement)) {
      const name = typeof o.name === 'string' ? cleanText(o.name) : null
      return instructions(o.itemListElement, name || section)
    }
    // Une étape déclarée par le site reste une étape, même sur plusieurs lignes.
    const text = typeof o.text === 'string' ? o.text : typeof o.name === 'string' ? o.name : ''
    const t = stripTags(text)
    if (t) return [section ? `${section} : ${t}` : t]
  }
  return []
}

export function extractJsonLd(html: string): StructuredRecipe | null {
  const recipes: Record<string, unknown>[] = []
  for (const raw of jsonLdBlocks(html)) {
    try {
      // Certains sites échappent mal : retours à la ligne bruts dans les chaînes.
      let parsed: unknown
      try { parsed = JSON.parse(raw.trim()) } catch { parsed = JSON.parse(raw.trim().replace(/[\u0000-\u001f]+/g, ' ')) }
      for (const n of jsonLdNodes(parsed)) {
        if (isRecipe(n)) recipes.push(n)
        else if (n.mainEntity && typeof n.mainEntity === 'object') {
          for (const m of jsonLdNodes(n.mainEntity)) if (isRecipe(m)) recipes.push(m)
        }
      }
    } catch { /* bloc illisible : ignoré */ }
  }
  if (!recipes.length) return null
  // La plus complète (nombre d'ingrédients + d'étapes) si plusieurs.
  const r = recipes
    .map(n => ({ n, size: asStrings(n.recipeIngredient ?? n.ingredients).length + instructions(n.recipeInstructions).length }))
    .sort((a, b) => b.size - a.size)[0].n
  return {
    source: 'json_ld',
    name: typeof r.name === 'string' ? cleanText(r.name) : null,
    yield: r.recipeYield ?? r.yield ?? null,
    prepTime: r.prepTime ?? null,
    cookTime: r.cookTime ?? null,
    totalTime: r.totalTime ?? null,
    ingredients: asStrings(r.recipeIngredient ?? r.ingredients).map(stripTags).filter(Boolean),
    steps: instructions(r.recipeInstructions),
    category: [...asStrings(r.recipeCategory), ...asStrings(r.recipeCuisine)].map(cleanText),
    image: imageUrl(r.image),
    recipeCount: recipes.length,
  }
}

// Microdonnées : éléments itemprop à l'intérieur d'un itemtype Recipe.
export function extractMicrodata(html: string): StructuredRecipe | null {
  const start = html.search(/itemtype=["'][^"']*schema\.org\/Recipe["']/i)
  if (start < 0) return null
  const scope = html.slice(start, start + 300_000)
  const props: Record<string, string[]> = {}
  const re = /<(\w+)\b([^>]*\bitemprop=["']([^"']+)["'][^>]*)>(?:([\s\S]*?)<\/\1>)?/gi
  let m: RegExpExecArray | null
  while ((m = re.exec(scope))) {
    const attrs = m[2]
    const value = attrs.match(/\bcontent=["']([^"']*)["']/i)?.[1]
      ?? attrs.match(/\b(?:src|href)=["']([^"']*)["']/i)?.[1]
      ?? stripTags(m[4] ?? '')
    for (const prop of m[3].split(/\s+/)) (props[prop] ??= []).push(cleanText(value))
  }
  const name = props.name?.[0] ?? null
  if (!name && !props.recipeIngredient && !props.ingredients) return null
  return {
    source: 'microdata',
    name,
    yield: props.recipeYield?.[0] ?? null,
    prepTime: props.prepTime?.[0] ?? null,
    cookTime: props.cookTime?.[0] ?? null,
    totalTime: props.totalTime?.[0] ?? null,
    ingredients: (props.recipeIngredient ?? props.ingredients ?? []).filter(Boolean),
    steps: (props.recipeInstructions ?? props.step ?? []).flatMap(s => s.split(/\n+/)).filter(Boolean),
    category: props.recipeCategory ?? [],
    image: props.image?.[0] ?? null,
    recipeCount: 1,
  }
}

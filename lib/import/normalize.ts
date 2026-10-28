// Normalisation des valeurs extraites d'une page de recette : ingrédients
// (quantité / unité / nom), durées, portions, difficulté, catégorie, titre,
// étapes. Fonctions pures, sans dépendance au format de la page.
// Règles décidées : docs/import-recettes.md.

import type { Difficulty, ImportedIngredient } from './types'

// ── Texte ────────────────────────────────────────────────────

const NAMED_ENTITIES: Record<string, string> = {
  amp: '&', lt: '<', gt: '>', quot: '"', apos: '’', nbsp: ' ', rsquo: '’', lsquo: '‘',
  laquo: '«', raquo: '»', hellip: '…', ndash: '–', mdash: '—', deg: '°', eacute: 'é',
  egrave: 'è', agrave: 'à', ccedil: 'ç', ecirc: 'ê', ocirc: 'ô', icirc: 'î', ucirc: 'û',
  oelig: 'œ', frac12: '½', frac14: '¼', frac34: '¾', trade: '™', reg: '®', copy: '©',
}

export function decodeEntities(s: string): string {
  return s
    .replace(/&#x([0-9a-f]+);/gi, (_, h) => String.fromCodePoint(parseInt(h, 16)))
    .replace(/&#(\d+);/g, (_, d) => String.fromCodePoint(Number(d)))
    .replace(/&([a-z]+);/gi, (m, n) => NAMED_ENTITIES[n.toLowerCase()] ?? m)
}

export function cleanText(s: string): string {
  return decodeEntities(s).replace(/[  \t\r\n]+/g, ' ').replace(/ {2,}/g, ' ').trim()
}

// ── Nombres ──────────────────────────────────────────────────

const UNICODE_FRACTIONS: Record<string, number> = { '½': 0.5, '¼': 0.25, '¾': 0.75, '⅓': 1 / 3, '⅔': 2 / 3, '⅛': 0.125 }
const NUMBER_WORDS: Record<string, number> = {
  un: 1, une: 1, deux: 2, trois: 3, quatre: 4, cinq: 5, six: 6, sept: 7, huit: 8, neuf: 9, dix: 10,
  onze: 11, douze: 12, demi: 0.5, 'demie': 0.5,
}

const NUM = String.raw`(?:\d+[.,]\d+|\d+\s+\d+\/\d+|\d+\/\d+|\d+\s*[½¼¾⅓⅔⅛]|[½¼¾⅓⅔⅛]|\d+)`

// « 1,5 », « 1/2 », « 1 1/2 », « 2½ », « ½ » → nombre (arrondi au centième).
export function parseNumber(raw: string): number | null {
  const s = raw.trim().toLowerCase()
  if (s in NUMBER_WORDS) return NUMBER_WORDS[s]
  let m = s.match(/^(\d+)\s*([½¼¾⅓⅔⅛])$/)
  if (m) return round(Number(m[1]) + UNICODE_FRACTIONS[m[2]])
  if (s in UNICODE_FRACTIONS) return round(UNICODE_FRACTIONS[s])
  m = s.match(/^(\d+)\s+(\d+)\/(\d+)$/)
  if (m) return round(Number(m[1]) + Number(m[2]) / Number(m[3]))
  m = s.match(/^(\d+)\/(\d+)$/)
  if (m) return Number(m[2]) ? round(Number(m[1]) / Number(m[2])) : null
  const n = Number(s.replace(',', '.'))
  return Number.isFinite(n) ? round(n) : null
}

const round = (n: number) => Math.round(n * 100) / 100

// ── Unités ───────────────────────────────────────────────────
// Unité canonique ← variantes rencontrées (ordre : les plus longues d'abord).

const UNIT_PATTERNS: [string, RegExp][] = [
  ['c. à soupe', /^(?:cuill(?:è|e)res?|cuil\.?|c\.?)\s*(?:à|a)\s*s(?:oupe)?\.?(?=\s|$)|^c\.?\s?à\.?\s?s\.?(?=\s|$)|^càs\b|^cas\b|^cs\b|^tbsp\b|^tablespoons?\b/i],
  ['c. à café', /^(?:cuill(?:è|e)res?|cuil\.?|c\.?)\s*(?:à|a)\s*c(?:afé|afe)?\.?(?=\s|$)|^c\.?\s?à\.?\s?c\.?(?=\s|$)|^càc\b|^cac\b|^cc\b|^tsp\b|^teaspoons?\b/i],
  ['kg', /^(?:kg|kilos?|kilogrammes?)\b/i],
  ['g', /^(?:g|gr|grs|grammes?)\b/i],
  ['mg', /^mg\b/i],
  ['ml', /^(?:ml|millilitres?)\b/i],
  ['cl', /^(?:cl|centilitres?)\b/i],
  ['dl', /^(?:dl|décilitres?)\b/i],
  ['l', /^(?:l|litres?|liters?)\b/i],
  ['pincée', /^pinc(?:é|e)es?\b/i],
  ['gousse', /^gousses?\b/i],
  ['branche', /^(?:branches?|brins?)\b/i],
  ['botte', /^bottes?\b/i],
  ['tranche', /^tranches?\b/i],
  ['morceau', /^morceaux?\b/i],
  ['poignée', /^poign(?:é|e)es?\b/i],
  ['feuille', /^feuilles?\b/i],
  ['verre', /^verres?\b/i],
  ['tasse', /^tasses?\b/i],
  ['bol', /^bols?\b/i],
  ['sachet', /^sachets?\b/i],
  ['boîte', /^bo(?:î|i)tes?\b/i],
  ['cube', /^cubes?\b/i],
  ['cm', /^cm\b/i],
]

function matchUnit(s: string): { unit: string; rest: string } | null {
  for (const [unit, re] of UNIT_PATTERNS) {
    const m = s.match(re)
    if (m) return { unit, rest: s.slice(m[0].length).trim() }
  }
  return null
}

// « de », « d' » entre l'unité (ou la quantité) et le nom.
const stripPreposition = (s: string) => s.replace(/^(?:de\s+|d['’]\s*|of\s+)/i, '').trim()

// Pluriel inutile après « 1 » (« 1 langues de veau », « 1 bouquets garnis ») :
// singularise les mots avant la première préposition.
const INVARIABLE = /^(riz|pois|ananas|jus|maïs|mais|radis|cassis|anis|gras|frais|noix|choux-fleurs?)$/i
function singularize(name: string): string {
  const words = name.split(' ')
  for (let i = 0; i < words.length; i++) {
    const w = words[i]
    if (/^(de|d['’].*|du|des|à|au|aux|en|et|ou|pour)$/i.test(w) || w.includes('’') || w.includes("'")) break
    if (INVARIABLE.test(w)) continue
    if (/^choux$/i.test(w)) words[i] = w.slice(0, -1)
    else if (w.length > 3 && /[^s]s$/i.test(w)) words[i] = w.slice(0, -1)
  }
  return words.join(' ')
}

const OPTIONAL_RE = /\s*[(\[]?\s*\b(?:optionnel(?:le)?s?|facultati(?:f|ve)s?|en option)\b\s*[)\]]?\s*/i
const TO_TASTE_RE = /\s*[,(]?\s*\b(?:q\.?\s?s\.?|au go[uû]t|selon (?:votre |le )?go[uû]t|à convenance)\b\s*\)?\s*/i

// Une ligne d'ingrédient → quantité, unité, nom.
export function parseIngredient(raw: string): ImportedIngredient | null {
  let s = cleanText(raw).replace(/^[-•*–·▪◦]\s*/, '')
  if (!s) return null
  let optional = false
  if (OPTIONAL_RE.test(s)) { optional = true; s = s.replace(OPTIONAL_RE, ' ').trim() }
  s = s.replace(TO_TASTE_RE, ' ').trim()
  // « Quelques feuilles de moringa », « Un peu de sel » : pas de quantité chiffrée.
  s = s.replace(/^(?:quelques|un peu d['’]|un peu de|un filet d['’]|un filet de)\s*/i, '')

  // « Semoule de blé dure fine: 500g », « Oignons: 2 » → quantité en tête.
  const colon = s.match(new RegExp(String.raw`^(.+?)\s*:\s*(${NUM}.*)$`))
  if (colon) s = `${colon[2]} ${colon[1]}`

  let quantity: number | null = null
  let unit: string | null = null
  let name = s

  // Quantité en tête, éventuellement fourchette (« 2-3 », « 2 à 3 » → borne basse).
  const lead = s.match(new RegExp(String.raw`^(${NUM}|${Object.keys(NUMBER_WORDS).join('|')})(?:\s*(?:-|–|à|a|ou)\s*${NUM})?(?=\s|[a-zA-Zàâçéèêëîïôûùüÿñœ]|$)\s*(.*)$`, 'i'))
  if (lead && (/\d|[½¼¾⅓⅔⅛]/.test(lead[1]) || lead[2])) {
    quantity = parseNumber(lead[1])
    const rest = lead[2]
    const u = matchUnit(rest)
    if (u && (u.rest || u.unit !== 'l')) { unit = u.unit; name = stripPreposition(u.rest) }
    else name = stripPreposition(rest)
  } else {
    // Quantité en fin de ligne (« Ail 4 gousses », « Moutarde 3 càs »).
    const tail = s.match(new RegExp(String.raw`^(.+?)\s+(${NUM})\s*(.*)$`))
    if (tail) {
      const u = tail[3] ? matchUnit(tail[3]) : null
      if (!tail[3] || (u && !u.rest)) { name = tail[1]; quantity = parseNumber(tail[2]); unit = u?.unit ?? null }
    }
  }

  // Unité en tête du nom (« gousse d'ail hachée » + « 1 », « feuilles de moringa »).
  if (!unit) {
    const u = matchUnit(name)
    if (u && /^(?:de\s|d['’])/i.test(u.rest)) { unit = u.unit; name = stripPreposition(u.rest) }
  }
  name = name.replace(/\s+([,.;:])/g, '$1').replace(/[,;.\s]+$/, '').trim()
  if (quantity === 1) name = singularize(name)
  if (!name) return null
  return { quantity, unit, name, optional }
}

// ── Durées ───────────────────────────────────────────────────

// Durée → minutes. Accepte l'ISO 8601 (y compris mal formé : « P50M » sans
// T, nombre seul) et le texte (« 1h15 », « 2h30 », « 1 hr 10 min », « 2 heures »).
export function parseDuration(raw: unknown): number | null {
  if (raw === null || raw === undefined) return null
  if (typeof raw === 'number') return Number.isFinite(raw) && raw > 0 ? Math.round(raw) : null
  const s = cleanText(String(raw)).toLowerCase()
  if (!s) return null
  if (/^\d+$/.test(s)) return Number(s) || null

  const iso = s.match(/^p(?:(\d+)d)?t?(?:(\d+(?:\.\d+)?)h)?(?:(\d+)m)?(?:(\d+)s)?$/i)
  if (iso && (iso[1] || iso[2] || iso[3])) {
    return Math.round(Number(iso[1] ?? 0) * 1440 + Number(iso[2] ?? 0) * 60 + Number(iso[3] ?? 0)) || null
  }

  let total = 0
  let found = false
  const hm = s.match(/(\d+(?:[.,]\d+)?)\s*(?:h|hr|hrs|heures?|hours?)\s*(\d{1,2})?(?!\s*(?:h|hr|heures?))/)
  if (hm) { total += Number(hm[1].replace(',', '.')) * 60 + Number(hm[2] ?? 0); found = true }
  const m = (hm ? s.slice((hm.index ?? 0) + hm[0].length) : s).match(/(\d+)\s*(?:min|mins|minutes?|mn)\b/)
  if (m) { total += Number(m[1]); found = true }
  const d = s.match(/(\d+)\s*(?:jours?|days?)\b/)
  if (d) { total += Number(d[1]) * 1440; found = true }
  return found && total > 0 ? Math.round(total) : null
}

// ── Portions ─────────────────────────────────────────────────

const PIECES_RE = /\b(pi[eè]ces?|biscuits?|cookies?|bouch[ée]es?|muffins?|cr[eê]pes?|moules?|g[aâ]teaux?|pots?|bocaux|bocal|litres?|tartelettes?|madeleines?|beignets?|boules?|brochettes?)\b/i

export interface ServingsResult {
  value: number | null
  range: [number, number] | null
  pieces: string | null  // rendement en pièces, gardé comme note
}

export function parseServings(raw: unknown): ServingsResult {
  const none = { value: null, range: null, pieces: null }
  if (raw === null || raw === undefined) return none
  if (Array.isArray(raw)) {
    for (const r of raw) { const p = parseServings(r); if (p.value !== null || p.pieces) return p }
    return none
  }
  if (typeof raw === 'number') return Number.isInteger(raw) && raw > 0 && raw < 100 ? { ...none, value: raw } : none
  const s = cleanText(String(raw))
  const range = s.match(/(\d+)\s*(?:à|-|–|ou|to)\s*(\d+)/i)
  if (PIECES_RE.test(s) && !/personnes?|portions?|parts?|serves?|servings?|people/i.test(s)) return { ...none, pieces: s }
  if (range) {
    const a = Number(range[1]), b = Number(range[2])
    if (a > 0 && b >= a && b < 100) return { value: a, range: [a, b], pieces: null }
  }
  const n = s.match(/(\d+)/)
  if (!n) return none
  const v = Number(n[1])
  return v > 0 && v < 100 ? { ...none, value: v } : none
}

// ── Difficulté ───────────────────────────────────────────────

export function parseDifficulty(raw: unknown): Difficulty | null {
  if (typeof raw !== 'string') return null
  const s = cleanText(raw).toLowerCase()
  if (/\b(tr[eè]s facile|facile|easy|simple|d[ée]butant|beginner)\b/.test(s)) return 'facile'
  if (/\b(moyen(?:ne)?|interm[ée]diaire|medium|intermediate|moderate)\b/.test(s)) return 'moyen'
  if (/\b(difficile|difficult|hard|expert|confirm[ée]|avanc[ée]|advanced)\b/.test(s)) return 'difficile'
  return null
}

// ── Catégorie ────────────────────────────────────────────────
// Catégorie de l'app (slug) la plus proche d'un libellé de site.

const CATEGORY_RULES: [string, RegExp][] = [
  ['soupe', /\b(soupes?|potages?|velout[ée]s?|soups?)\b/i],
  ['sauce', /\b(sauces?)\b/i],
  ['boisson', /\b(boissons?|cocktails?|jus|smoothies?|drinks?|beverages?)\b/i],
  ['dessert', /\b(desserts?|g[aâ]teaux?|p[aâ]tisseries?|charlottes?|entremets|tartes? sucr[ée]es?|cakes?|sweets?)\b/i],
  ['entree', /\b(entr[ée]es?|ap[ée]ritifs?|starters?|appetizers?|salades?)\b/i],
  ['bouillie-cereales', /\b(bouillies?|c[ée]r[ée]ales|porridges?|petit[- ]d[ée]jeuner)\b/i],
  ['beignets-snacks', /\b(beignets?|snacks?|en-cas|go[uû]ters?|grignotages?)\b/i],
  ['plat-principal', /\b(plats?(?: principa(?:l|ux)| uniques?)?|main(?: dish(?:es)?| course)?)\b/i],
]

export function categoryHint(...labels: unknown[]): string | null {
  const text = labels.flat().filter(l => typeof l === 'string').join(' · ')
  for (const [slug, re] of CATEGORY_RULES) if (re.test(text)) return slug
  return null
}

// ── Titre ────────────────────────────────────────────────────
// Retire le suffixe SEO (« : la meilleure recette », « | Marmiton ») et le nom du site.

export function cleanTitle(raw: string, hostname?: string): string {
  let s = cleanText(raw)
  const site = hostname?.replace(/^www\./, '').split('.')[0].toLowerCase().replace(/[^a-z0-9]/g, '')
  s = s.replace(/\s*\|.*$/, '')
  const parts = s.split(/\s+[-–—]\s+/)
  if (parts.length > 1 && site && parts[parts.length - 1].toLowerCase().replace(/[^a-z0-9]/g, '').includes(site.slice(0, 8))) parts.pop()
  s = parts.join(' - ')
  s = s.replace(/\s*:\s*(?:la |notre |une )?(?:meilleure recette|recette\b.*|d[ée]couvrez\b.*|.*\b(?:facile et rapide|rapide et facile)\b.*|.*!)\s*$/i, '')
  s = s.replace(/^recette\s+(?:de\s+|du\s+|des\s+)?/i, '')
  return s.charAt(0).toUpperCase() + s.slice(1)
}

// ── Étapes ───────────────────────────────────────────────────

const STEP_NOISE = /^(done|terminé|fait|print|imprimer|partager|share|adjust servings|étape suivante|next)$/i
const STEP_NUMBER = /^(?:(?:étape|step)\s*\d+\s*[:.\-–]?\s*|\d+\s*[/.)\-–]\s+)/i
const FILLER = /^(?:\.\.\.|…)?\s*(?:nous obtenons|vous obtenez|on obtient|voici le résultat|voici ce que|comme ceci|comme cela|et voilà)\b/i
const ANNOUNCE = /(?:commencer par |commencez par )?pr[ée]parer tous les ingr[ée]dients/i
const SECTION = /^([A-ZÀ-Ý][^:.]{2,40})\s*:\s+(.+)$/
const ELLIPSIS_END = /\s*(?:\.\.\.|…)$/
const ELLIPSIS_START = /^(?:\.\.\.|…)\s*/

// Nettoie la liste des étapes (décisions du 28/10) : bruit d'interface et
// numéros retirés, légendes de photo sans action et annonces de sous-recette
// supprimées, phrases coupées en « … » recollées, nom de sous-recette en tête
// de sa première étape.
export function cleanSteps(texts: string[]): string[] {
  const out: string[] = []
  let section: string | null = null
  for (const raw of texts) {
    let t = cleanText(raw).replace(STEP_NUMBER, '').trim()
    if (!t || STEP_NOISE.test(t)) continue
    const sec = t.match(SECTION)
    if (sec && !/^(en parallèle|astuce|conseil|attention|remarque|note)$/i.test(sec[1].trim())) { section = sec[1].trim(); t = sec[2] }
    if (ANNOUNCE.test(t) && t.length < 140) continue
    if (FILLER.test(t) && t.length < 60) continue
    const last = out.length - 1
    if (last >= 0 && ELLIPSIS_END.test(out[last]) && ELLIPSIS_START.test(t)) {
      const rest = t.replace(ELLIPSIS_START, '')
      const joiner = /^(la|le|les|l['’]|un|une|des|il|elle|cette|ce)\b/i.test(rest) ? ', ' : ' '
      out[last] = out[last].replace(ELLIPSIS_END, joiner) + rest
      continue
    }
    if (last >= 0 && out[last] === t) continue
    out.push((section ? `${section} : ` : '') + t)
    section = null
  }
  return out.map(s => s.replace(ELLIPSIS_END, '.'))
}

// Liste affichée deux fois sur la page (cas 02, 09) : si la seconde moitié
// répète exactement la première, on n'en garde qu'une. Un ingrédient répété
// ailleurs (sous-recettes, cas 08) n'est jamais retiré.
export function dedupeRepeatedList<T>(items: T[], key: (t: T) => string): T[] {
  const n = items.length
  if (n >= 2 && n % 2 === 0) {
    const half = n / 2
    if (items.slice(0, half).every((it, i) => key(it) === key(items[i + half]))) return items.slice(0, half)
  }
  return items
}

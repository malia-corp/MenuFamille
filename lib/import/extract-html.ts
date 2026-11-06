// Extracteur « page affichée » : lit le texte visible quand la page n'a pas
// de données structurées, ou pour compléter un JSON-LD incomplet (cas 09).
// Repère le bloc Ingrédients puis le bloc Préparation, et les étiquettes de
// durée, de portions et de difficulté autour (cf. docs/import-recettes.md).

import { htmlToLines, type Line } from './html'
import { cleanText, parseDifficulty, parseDuration } from './normalize'

export interface HtmlExtraction {
  h1: string | null
  ingredients: string[]          // lignes brutes, à passer à parseIngredient
  steps: string[]                // lignes brutes, à passer à cleanSteps
  servingsText: string | null
  prepText: string | null
  cookText: string | null
  totalText: string | null
  restText: string | null
  difficulty: string | null      // libellé lu sur la page (« Très facile », « Medium »)
  tip: string | null
  notes: string[]
  breadcrumb: string | null
}

const SHORT = 70
// Un vrai titre de section : « Ingrédients », « Ingrédients pour 8 personnes : »,
// « Liste des ingrédients : » — pas « Ingrédient clé + quantité » (en-tête de tableau, cas 01).
// Accepte « Ingrédients, pour 2 personnes », « Ingrédients (pour 4) », « Ingrédients – pour 6 » (cas 10).
export const INGR_HEAD = /^(?:liste des |les )?ingr[ée]dients?(?:\s*[,(\-–—]?\s*(?:pour|for)\b[^:]{0,30})?\s*\)?\s*:?\s*$|^ingredients(?:\s*[,(\-–—]?\s*for\b[^:]{0,30})?\s*\)?\s*:?\s*$/i
// « La recette du pepe chicken » (cas 10) annonce aussi les étapes.
export const STEPS_HEAD = /^(?:la )?(?:pr[ée]paration(?: de la recette)?|instructions|directions|[ée]tapes?|steps|m[ée]thode|method|r[ée]alisation|d[ée]roul[ée]|la recette pas à pas|pas à pas)\b|^la recette (?:du|de la|des|de|d['’])/i
const END_HEAD = /^(?:un peu d['’]histoire|histoire|origines?|le saviez-vous|anecdote|caract[ée]ristiques|bon app[ée]tit|tags|mots-cl[ée]s|commentaires?|avis|partager|share|nos recettes similaires|recettes similaires|vous aimerez aussi|autres id[ée]es|pour aller plus loin|sujets associ[ée]s|produits? utilis[ée]s?|plus d['’]infos|faq|questions fr[ée]quentes|ce que j['’]ai appris|les erreurs|variantes?|conservation|ustensiles?|mat[ée]riel)/i
const NOISE = /^(?:done|imprimer(?: la recette)?|print|partager(?: cette recette)?(?: :)?|share|adjust servings:?|ajouter (?:au panier|nos produits au panier)|seuls les produits.*|voir la recette|passer la publicit[ée]|lancer la recette|précédent|suivant|finir|recette terminée.*|check_circle|votes?: ?\d+)$/i
const QTY_ONLY = /^(?:\d+[.,]?\d*|\d+\/\d+|[½¼¾⅓⅔]|\d+\s*[½¼¾])(?:\s*(?:g|kg|mg|ml|cl|dl|l|c\. ?à ?(?:s|c)\.?|c\. ?à (?:soupe|café)|càs|càc|cs|cc|gousses?|branches?|bottes?|tranches?|pinc[ée]es?|poign[ée]es?|feuilles?|cubes?|morceaux?|verres?|sachets?|bo[iî]tes?|cm))?$/i
const DURATION_ONLY = /^(?:\d+\s*(?:h|hr|hrs|heures?|hours?|min|mins|minutes?|mn)\s*)+\d*\s*(?:min|mn)?$/i
const TIP_HEAD = /^(?:[^A-Za-zÀ-ÿœŒ]*\s*)?(?:l['’]astuce(?: de [^:]{1,30})?|astuces?|conseils?(?: du chef)?|le conseil(?: du chef)?|bon à savoir|notre astuce|tip|chef['’]s tip)\s*:?\s*(.*)$/i
const NOTE_HEAD = /^(?:notre )?suggestion(?: d['’]accord)?s?\s*:?\s*(.+)$/i

const isHeadingLike = (l: Line) => l.kind === 'heading' || (l.text.length < 40 && /:\s*$/.test(l.text))
const looksLikeSentence = (t: string) => t.length > SHORT || (/[.!]$/.test(t) && t.split(' ').length >= 3)

function labelValue(lines: Line[], i: number, label: RegExp): string | null {
  const t = lines[i].text
  const m = t.match(label)
  if (!m) return null
  const after = cleanText(t.slice((m.index ?? 0) + m[0].length).replace(/^\s*[:\-–]\s*/, ''))
  if (after && parseDuration(after) !== null) return after
  // Valeur sur la ligne suivante (« Prep time » / « 30 min ») : seulement si c'est une durée.
  const next = lines[i + 1]?.text
  if (!after && next && next.length < 30 && parseDuration(next) !== null) return next
  return null
}

// Indice du bloc Ingrédients le plus probable : titre « Ingrédients » suivi de lignes courtes.
function findIngredientsHead(lines: Line[]): number {
  const candidates = lines
    .map((l, i) => ({ l, i }))
    .filter(({ l }) => l.text.length < 50 && INGR_HEAD.test(l.text.replace(/^[^A-Za-zÀ-ÿœŒ]+/, '')))
  let best = -1
  let bestScore = 0
  for (const { i } of candidates) {
    let score = 0
    for (let k = i + 1; k < Math.min(lines.length, i + 25); k++) {
      const t = lines[k].text
      if (STEPS_HEAD.test(t) && t.length < 50) break
      if (t.length < SHORT && !looksLikeSentence(t)) score++
    }
    if (score > bestScore) { best = i; bestScore = score }
  }
  return best
}

export function extractFromHtml(html: string): HtmlExtraction {
  const lines = htmlToLines(html)
  const out: HtmlExtraction = {
    h1: lines.find(l => l.kind === 'heading' && l.level === 1)?.text ?? null,
    ingredients: [], steps: [], servingsText: null, prepText: null, cookText: null,
    totalText: null, restText: null, difficulty: null, tip: null, notes: [], breadcrumb: null,
  }

  // ── Étiquettes : durées, portions, difficulté (lignes courtes uniquement) ──
  for (let i = 0; i < lines.length; i++) {
    const t = lines[i].text.replace(/^[^A-Za-zÀ-ÿœŒ\d]+/, '')
    if (t.length > 90) continue
    // « 10 minutes de préparation - 15 minutes de cuisson » (une seule ligne)
    const inline = t.match(/(\d[^-–|]*?)\s*de\s*pr[ée]paration.*?(\d[^-–|]*?)\s*de\s*cuisson/i)
    if (inline) { out.prepText ??= inline[1]; out.cookText ??= inline[2]; continue }
    out.prepText ??= labelValue(lines, i, /^(?:temps de )?pr[ée]paration\b|^prep(?:aration)?(?: time)?\b/i)
    out.cookText ??= labelValue(lines, i, /^(?:temps de )?cuisson\b|^cook(?:ing)?(?: time)?\b/i)
    out.totalText ??= labelValue(lines, i, /^(?:temps total|dur[ée]e(?: totale)?|total time|total)\b/i)
    out.restText ??= labelValue(lines, i, /^(?:temps de )?(?:repos|r[ée]frig[ée]ration|marinade|pousse)\b/i)
    const frais = t.match(/\(\s*\+\s*([^)]*?)\s+(?:au frais|de repos|au r[ée]frig[ée]rateur)\s*\)/i)
    if (frais && !out.restText) out.restText = frais[1]
    if (!out.servingsText) {
      const sv = t.match(/^(?:pour\s*:?\s*)?(\d+(?:\s*(?:à|-)\s*\d+)?)\s*(?:personnes?|portions?|parts?|pers\.?)\b/i)
        // « Ingrédients, pour 2 personnes » : dans une ligne courte, après « pour ».
        ?? (t.length < 60 ? t.match(/\bpour\s*:?\s*(\d+(?:\s*(?:à|-)\s*\d+)?)\s*(?:personnes?|portions?|parts?|pers\.?)\b/i) : null)
        ?? t.match(/^(?:portions?|servings?|serves|pour|nombre de personnes)\s*:?\s*(\d+(?:\s*(?:à|-)\s*\d+)?)\b/i)
      // « Attiéké poisson braisé (4 pers.) » : portions entre parenthèses, n'importe où.
      const inTitle = t.match(/\(\s*(\d+(?:\s*(?:à|-)\s*\d+)?)\s*(?:pers\.?|personnes?|portions?)\s*\)/i)
      if (sv) out.servingsText = sv[1]
      else if (inTitle) out.servingsText = inTitle[1]
      else if (/^(?:portions?|servings?|serves|parts?)\s*:?$/i.test(t) && /^\d+(?:\s*(?:personnes?|portions?|parts?))?$/i.test(lines[i + 1]?.text ?? '')) out.servingsText = lines[i + 1].text
    }
    if (!out.difficulty) {
      const lab = t.match(/^(?:difficult[ée]|niveau|difficulty)\s*:?\s*(.*)$/i)
      if (lab) {
        const v = lab[1] || lines[i + 1]?.text || ''
        if (parseDifficulty(v)) out.difficulty = v
      }
    }
  }

  const head = findIngredientsHead(lines)

  // Difficulté sans libellé : une ligne qui n'est QUE le niveau, près de l'en-tête
  // de la recette (jamais « Recettes faciles » d'un menu). La première gagne :
  // celle qui suit est souvent le coût (« Facile · Moyen »).
  if (!out.difficulty) {
    const from = head >= 0 ? Math.max(0, head - 40) : 0
    const to = head >= 0 ? Math.min(lines.length, head + 30) : Math.min(lines.length, 120)
    for (let i = from; i < to; i++) {
      for (const part of lines[i].text.split(/\s*[·•|]\s*|\s{2,}/)) {
        const p = part.trim()
        if (/^(?:tr[eè]s facile|facile|easy|moyen(?:ne)?|medium|interm[ée]diaire|difficile|difficult|hard|expert)$/i.test(p)) { out.difficulty = p; break }
        const last = p.split(' ').pop() ?? ''
        if (p.split(' ').length <= 4 && /^(?:easy|medium|hard)$/i.test(last)) { out.difficulty = last; break }
      }
      if (out.difficulty) break
    }
  }
  // Difficulté en barre (cas 08) : classe « difficult… » et largeur en %.
  if (!out.difficulty) {
    const bar = html.match(/class=["'][^"']*difficult[^"']*["'][\s\S]{0,200}?width:\s*(\d+(?:\.\d+)?)%/i)
    if (bar) { const w = Number(bar[1]); out.difficulty = w <= 34 ? 'facile' : w <= 67 ? 'moyen' : 'difficile' }
  }

  // Fil d'Ariane (catégorie) : première ligne « A / B / C » ou « A > B > C ».
  out.breadcrumb = lines.slice(0, 80).find(l => /\S\s+[/>›»]\s+\S/.test(l.text) && l.text.length < 120)?.text ?? null

  if (head < 0) { findTipAndNotes(lines, 0, endOfRecipe(lines, 0), out); return out }

  // ── Ingrédients : lignes courtes après le titre, jusqu'aux étapes ──
  let i = head + 1
  for (; i < lines.length; i++) {
    const l = lines[i]
    const t = l.text
    if ((STEPS_HEAD.test(t) && t.length < 50) || (END_HEAD.test(t) && t.length < 60)) break
    if (NOISE.test(t) || /^ajouter nos produits/i.test(t)) { if (out.ingredients.length) break; continue }
    if (looksLikeSentence(t) || /^\d+\s*[/.)]\s+\S/.test(t)) break   // première étape sans titre (05, 06)
    if (isHeadingLike(l)) continue                                      // groupe (« Pour la panure : ») ignoré
    if (/^(?:cuisine|origine|cat[ée]gorie|serves?|servings?|portions?|easy|medium|hard)\s*:?\s*\S*$/i.test(t)) continue
    if (QTY_ONLY.test(t) && out.ingredients.length) {
      // Quantité sur la ligne suivant le nom (cas 03) : « Ail » + « 4 gousses ».
      out.ingredients[out.ingredients.length - 1] += ` ${t}`
      continue
    }
    if (QTY_ONLY.test(t) && lines[i + 1] && !QTY_ONLY.test(lines[i + 1].text)) {
      // Quantité avant le nom (« 500g » + « Semoule… ») : réunies.
      out.ingredients.push(`${t} ${lines[i + 1].text}`)
      i++
      continue
    }
    if (/^(?:optionnel|facultatif)$/i.test(t) && out.ingredients.length) { out.ingredients[out.ingredients.length - 1] += ' (optionnel)'; continue }
    out.ingredients.push(t)
  }

  // ── Étapes : phrases après les ingrédients (titre « Préparation » facultatif) ──
  let section: string | null = null
  for (; i < lines.length; i++) {
    const l = lines[i]
    const t = l.text
    if (END_HEAD.test(t) && t.length < 60) { if (out.steps.length) break; continue }
    if (STEPS_HEAD.test(t) && t.length < 50) { if (out.steps.length) break; continue }
    if (NOISE.test(t) || /^\d+\.?$/.test(t) || DURATION_ONLY.test(t)) continue
    if (/^(?:temps total|pr[ée]paration|cuisson|repos)\s*:/i.test(t)) continue
    if (TIP_HEAD.test(t) || NOTE_HEAD.test(t)) continue
    if (l.kind === 'heading' || (t.length < 50 && !/[.!]$/.test(t) && lines[i + 1] && looksLikeSentence(lines[i + 1].text))) {
      // Titre d'étape (« Marinade du poulet », « Étape 1 : Préparer la base ») ou de sous-recette.
      if (out.steps.length && l.kind === 'heading' && (l.level ?? 6) <= 2) break
      section = t.replace(/^(?:[ée]tape|step)\s*\d+\s*[:.\-–]?\s*/i, '').replace(/\s*:$/, '') || null
      continue
    }
    // Seules les phrases sont des étapes : une ligne courte sans ponctuation
    // finale est un libellé d'interface ou un ingrédient répété (cas 09).
    if (!looksLikeSentence(t)) { if (t.split(' ').length < 4 && out.steps.length > 2) break; continue }
    if (l.kind === 'item' && t.length < 60 && !/[.!]$/.test(t)) continue
    out.steps.push(section ? `${section} : ${t}` : t)
    section = null
  }

  // Astuce et notes : dans le bloc de la recette seulement (jamais dans les commentaires).
  findTipAndNotes(lines, Math.max(0, head - 40), Math.min(lines.length, i + 15), out)
  return out
}

// Fin de la recette quand on ne sait pas où elle est : premier titre de fin
// de page (commentaires, recettes similaires…).
function endOfRecipe(lines: Line[], from: number): number {
  const k = lines.findIndex((l, j) => j > from && END_HEAD.test(l.text) && l.text.length < 60)
  return k < 0 ? lines.length : k
}

function findTipAndNotes(lines: Line[], from: number, to: number, out: HtmlExtraction) {
  for (let i = from; i < to; i++) {
    const tm = lines[i].text.match(TIP_HEAD)
    if (tm && !out.tip) {
      const body = tm[1] || (lines[i + 1] && looksLikeSentence(lines[i + 1].text) ? lines[i + 1].text : '')
      if (body && body.length > 15) out.tip = cleanText(body)
    }
    if (NOTE_HEAD.test(lines[i].text)) out.notes.push(cleanText(lines[i].text))
  }
}


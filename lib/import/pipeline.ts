// Import d'une page de recette déjà téléchargée : HTML → ImportResult.
// Ordre : JSON-LD, sinon microdonnées ; la page affichée complète chaque champ
// manquant (un JSON-LD peut être vide, cas 09). Le repli LLM viendra ensuite
// (jour 3) pour les pages où rien n'est reconnu.

import { estimateFromSteps } from './estimate-times'
import { extractFromHtml } from './extract-html'
import { extractJsonLd, extractMicrodata, type StructuredRecipe } from './extract-structured'
import { metaContent, titleTag } from './html'
import {
  categoryHint, cleanSteps, cleanText, cleanTitle, dedupeRepeatedList, parseDifficulty,
  parseDuration, parseIngredient, parseServings,
} from './normalize'
import { safePhotoUrl } from './url-safety'
import type { ImportResult, ImportWarning, ImportedIngredient, PageType, SourceType } from './types'

const fmt = (min: number) => (min >= 60 ? `${Math.floor(min / 60)} h${min % 60 ? ` ${String(min % 60).padStart(2, '0')}` : ''}` : `${min} min`)

export function importFromHtml(html: string, sourceUrl: string): ImportResult {
  const host = (() => { try { return new URL(sourceUrl).hostname } catch { return '' } })()
  const structured: StructuredRecipe | null = extractJsonLd(html) ?? extractMicrodata(html)
  const page = extractFromHtml(html)
  const sources: SourceType[] = []
  const warnings: ImportWarning[] = []
  const notes = [...page.notes]

  // ── Nom ──
  let name = structured?.name ? cleanTitle(structured.name, host) : ''
  if (!name && page.h1) name = cleanTitle(page.h1, host)
  if (!name) {
    const og = metaContent(html, 'og:title') ?? titleTag(html)
    if (og) { name = cleanTitle(og, host); warnings.push({ code: 'name_from_title', message: 'Nom repris du titre de la page : vérifie-le.' }) }
  }
  if (!name) warnings.push({ code: 'name_missing', message: 'Nom de la recette introuvable : à saisir.' })

  // ── Ingrédients ──
  const fromStructured = structured?.ingredients ?? []
  const rawIngredients = fromStructured.length ? fromStructured : page.ingredients
  // « 1 oignon, 2 tomates » : deux ingrédients sur une ligne (la virgule doit
  // être suivie d'une quantité, « Sel, poivre » reste entier).
  const splitLines = rawIngredients.flatMap(l => l.split(/\s*,\s+(?=\d+[.,]?\d*\s+\S)|\s+et\s+(?=\d+\s+\S)/))
  const ingredients = dedupeRepeatedList(
    splitLines.map(parseIngredient).filter((i): i is ImportedIngredient => !!i),
    i => `${i.quantity}|${i.unit}|${i.name.toLowerCase()}`,
  )
  if (structured && fromStructured.length) sources.push(structured.source)
  else if (page.ingredients.length) sources.push('html')

  // ── Étapes ──
  const rawSteps = structured?.steps.length ? structured.steps : page.steps
  const steps = cleanSteps(dedupeRepeatedList(rawSteps, s => cleanText(s)))
  if (!structured?.steps.length && page.steps.length && !sources.includes('html')) sources.push('html')
  if (structured && structured.steps.length && !sources.includes(structured.source)) sources.push(structured.source)

  // ── Portions ──
  const sv = parseServings(structured?.yield)
  const servingsParsed = sv.value !== null || sv.pieces ? sv : parseServings(page.servingsText)
  let servings = servingsParsed.value
  if (servingsParsed.range) warnings.push({ code: 'servings_range', message: `La page indique ${servingsParsed.range[0]} à ${servingsParsed.range[1]} personnes : ${servingsParsed.range[0]} retenues.` })
  if (servingsParsed.pieces) { notes.push(`Rendement : ${servingsParsed.pieces}`); servings = null; warnings.push({ code: 'servings_pieces', message: `La page indique « ${servingsParsed.pieces} » : saisis le nombre de portions.` }) }
  else if (servings === null) warnings.push({ code: 'servings_missing', message: 'Nombre de portions introuvable : à saisir.' })

  // ── Temps ── (JSON-LD d'abord, la page complète ; repos ajouté à la préparation)
  let prep = parseDuration(structured?.prepTime) ?? parseDuration(page.prepText)
  let cook = parseDuration(structured?.cookTime) ?? parseDuration(page.cookText)
  const total = parseDuration(structured?.totalTime) ?? parseDuration(page.totalText)
  let rest = parseDuration(page.restText)
  let estimated = false

  // La page ne donne ni la préparation ni la cuisson : estimation d'après les
  // étapes (cuisson lue dans les étapes, préparation = total − cuisson).
  if (prep === null && cook === null) {
    const est = estimateFromSteps(steps)
    rest ??= est.rest_min
    if (est.cook_min && (total === null || est.cook_min < total)) {
      cook = est.cook_min
      prep = total !== null ? total - est.cook_min : null
      estimated = true
    }
  }
  if (rest && prep !== null) {
    prep += rest
    if (!estimated) warnings.push({ code: 'rest_added_to_prep', message: `Dont ${fmt(rest)} de repos, compris dans la préparation.` })
  }
  if (estimated) {
    warnings.push({
      code: 'times_estimated',
      message: total !== null
        ? `Temps estimés : la page indique ${fmt(total)} au total${rest ? ` (+ ${fmt(rest)} de repos, ajoutés à la préparation)` : ''}, la cuisson (${fmt(cook!)}) est lue dans les étapes. Vérifie-les.`
        : `Cuisson estimée d'après les étapes (${fmt(cook!)}). Vérifie-la et indique la préparation${rest ? `, en comptant ${fmt(rest)} de repos (marinade, frais)` : ''}.`,
    })
  }
  const totalOnly = prep === null && cook === null && total !== null
  if (totalOnly) warnings.push({ code: 'times_total_only', message: `La page indique ${fmt(total!)} au total${rest ? ` (+ ${fmt(rest)} de repos)` : ''} : à répartir entre préparation et cuisson.` })

  // ── Difficulté, catégorie, astuce, photo ──
  const difficulty = parseDifficulty(page.difficulty)
  if (!difficulty) warnings.push({ code: 'difficulty_missing', message: 'Niveau de difficulté introuvable : à choisir.' })
  const category_hint = categoryHint(structured?.category ?? [], page.breadcrumb)
  const photo_url = safePhotoUrl(structured?.image) ?? safePhotoUrl(metaContent(html, 'og:image'))

  if (!ingredients.length) warnings.push({ code: 'ingredients_missing', message: 'Aucun ingrédient reconnu.' })
  if (!steps.length) warnings.push({ code: 'steps_missing', message: 'Aucune étape reconnue.' })

  // ── Type de page et statut ──
  let page_type: PageType = 'single_recipe'
  const title = metaContent(html, 'og:title') ?? titleTag(html) ?? ''
  if (!ingredients.length && !steps.length) page_type = 'not_a_recipe'
  else if ((structured?.recipeCount ?? 0) > 1 || /^\s*\d+\s+(?:recettes|recipes|id[ée]es)\b/i.test(title)) {
    page_type = 'multi_recipe_roundup'
    warnings.push({ code: 'roundup_main_recipe', message: 'Cette page présente plusieurs recettes : seule la principale est importée.' })
  }
  const status = !ingredients.length && !steps.length ? 'failed'
    : ingredients.length && steps.length && name && servings !== null ? 'complete' : 'partial'

  return {
    status,
    page_type,
    source_type: sources,
    recipe: {
      name,
      servings,
      prep_min: prep,
      cook_min: cook,
      rest_min: rest,
      total_min: total,
      difficulty,
      category_hint,
      ingredients,
      steps: steps.map(text => ({ text })),
      tip: page.tip,
      photo_url,
    },
    warnings,
    raw_notes: notes,
  }
}

// Orchestration d'un import (lien ou texte collé) :
// cache → extracteurs sans IA → repli IA si rien n'est reconnu, dans la
// limite du quota de l'utilisatrice et du plafond mensuel → journal.

import { createServiceClient } from '@/lib/supabase/service'
import { findCached, hashContent, llmAllowance, recordAttempt, type LlmAllowance } from './attempts'
import { htmlToLines } from './html'
import { LLM_PROMPT_VERSION, llmAvailable, structureWithLlm, type LlmRecipe } from './llm'
import { canonicalUnit, cleanSteps, cleanText, parseIngredient } from './normalize'
import { importFromHtml } from './pipeline'
import { textToHtml } from './text'
import type { ImportResult, ImportWarning } from './types'

export const PARSER_VERSION = 'v2'

// Le repli IA ne sert que si l'essentiel manque : ingrédients ou étapes.
// Le repli IA sert aussi quand la lecture de la page affichée (sans données
// structurées) donne un résultat douteux : ingrédients presque tous sans
// quantité, ou moins de deux étapes (cas 01 : un tableau de variantes pris
// pour des ingrédients). Une fiche fausse est pire qu'une fiche vide.
export function lowQuality(r: ImportResult): boolean {
  if (r.source_type.includes('json_ld') || r.source_type.includes('microdata')) return false
  const ing = r.recipe.ingredients
  const withQty = ing.filter(i => i.quantity !== null || i.unit !== null).length
  return ing.length > 0 && (withQty / ing.length < 0.35 || r.recipe.steps.length < 2)
}

export const needsLlm = (r: ImportResult) => !r.recipe.ingredients.length || !r.recipe.steps.length || lowQuality(r)

// Transcription orale (vidéo YouTube, message vocal) : pas de listes ni de
// titres, phrases coupées en fin de ligne, formules de vidéo. Les règles sans
// IA n'y trouvent que des morceaux de phrases : seule l'IA sait la ranger.
const TALK_MARKERS = /\b(?:bienvenue|salut à tous|cette (?:nouvelle )?vidéo|abonne[rz]|liker|la cloche|en commentaire|les amis|prenez soin de vous|à bientôt)\b|\[(?:musique|music|applaudissements)\]/gi
export function isTranscript(text: string): boolean {
  const markers = new Set((text.match(TALK_MARKERS) ?? []).map(m => m.toLowerCase())).size
  const lines = text.split('\n').map(l => l.trim()).filter(Boolean)
  const cut = lines.filter((l, i) => i < lines.length - 1 && !/[.!?:;»)\]]$/.test(l) && /^[a-zà-ÿ]/.test(lines[i + 1])).length
  return markers >= 2 || (lines.length >= 15 && cut / lines.length > 0.5)
}

// Une lecture douteuse est vidée plutôt qu'affichée : une fiche fausse est
// pire qu'une fiche vide. Aussi avant l'IA, qui ne remplit que les champs vides.
function discardUnreliable(r: ImportResult, dropName: boolean): ImportResult {
  return {
    ...r,
    status: 'failed',
    recipe: { ...r.recipe, ingredients: [], steps: [], name: dropName ? '' : r.recipe.name, servings: dropName ? null : r.recipe.servings },
    warnings: [
      ...r.warnings.filter(w => !['ingredients_missing', 'steps_missing', 'name_missing', 'servings_missing'].includes(w.code)),
      ...(dropName ? [{ code: 'name_missing' as const, message: 'Nom de la recette introuvable : à saisir.' }, { code: 'servings_missing' as const, message: 'Nombre de portions introuvable : à saisir.' }] : []),
      { code: 'ingredients_missing', message: 'Aucun ingrédient reconnu de façon fiable.' },
      { code: 'steps_missing', message: 'Aucune étape reconnue de façon fiable.' },
    ],
  }
}

// Texte principal d'une page pour l'IA : lignes visibles, sans les
// commentaires ni les recettes associées (le coût dépend de la longueur).
function mainText(html: string): string {
  const lines = htmlToLines(html).map(l => l.text)
  const end = lines.findIndex(t => t.length < 60 && /^(?:\d+\s+)?(?:commentaires?|avis|nos recettes similaires|recettes similaires|vous aimerez aussi|pour aller plus loin|sujets associ[ée]s)/i.test(t))
  return (end > 20 ? lines.slice(0, end) : lines).join('\n')
}

// Complète le résultat sans IA avec la réponse de l'IA : seuls les champs
// vides sont remplis (ce que la page déclare reste prioritaire).
export function mergeLlm(base: ImportResult, llm: LlmRecipe): ImportResult {
  const r = { ...base.recipe }
  const warnings: ImportWarning[] = base.warnings.filter(w => !['ingredients_missing', 'steps_missing'].includes(w.code))
  if (!r.name && llm.name) r.name = cleanText(llm.name)
  if (!r.ingredients.length) {
    r.ingredients = llm.ingredients
      .map(i => {
        // L'IA a déjà séparé quantité, unité et nom ; on repasse le nom seul
        // par le parseur pour les cas où elle aurait laissé la quantité dedans.
        const name = cleanText(i.name)
        const reparsed = i.quantity === null && i.unit === null ? parseIngredient(name) : null
        return reparsed ?? { quantity: i.quantity, unit: canonicalUnit(i.unit), name, optional: i.optional }
      })
      .filter(i => i.name)
  }
  if (!r.steps.length) r.steps = cleanSteps(llm.steps).map(text => ({ text }))
  if (r.servings === null && llm.servings) {
    r.servings = Math.round(llm.servings)
    const i = warnings.findIndex(w => w.code === 'servings_missing')
    if (i >= 0) warnings.splice(i, 1)
  }
  if (r.prep_min === null && r.cook_min === null && r.total_min === null) {
    const rest = llm.rest_min ?? null
    r.prep_min = llm.prep_min !== null ? llm.prep_min + (rest ?? 0) : null
    r.cook_min = llm.cook_min
    r.rest_min = rest
    r.total_min = llm.total_min
    if (rest && r.prep_min !== null) warnings.push({ code: 'rest_added_to_prep', message: `Dont ${rest} min de repos, compris dans la préparation.` })
  }
  if (!r.difficulty && llm.difficulty) {
    r.difficulty = llm.difficulty
    const i = warnings.findIndex(w => w.code === 'difficulty_missing')
    if (i >= 0) warnings.splice(i, 1)
  }
  if (!r.tip && llm.tip) r.tip = cleanText(llm.tip)
  if (!r.ingredients.length) warnings.push({ code: 'ingredients_missing', message: 'Aucun ingrédient reconnu.' })
  if (!r.steps.length) warnings.push({ code: 'steps_missing', message: 'Aucune étape reconnue.' })
  warnings.push({ code: 'llm_used', message: 'Fiche structurée par l’IA : relis chaque champ avec attention.' })
  for (const [field, level] of Object.entries(llm.confidence)) {
    if (level === 'low') warnings.push({ code: 'llm_low_confidence', message: `Champ incertain : ${({ name: 'nom', ingredients: 'ingrédients', steps: 'étapes', servings: 'portions', times: 'temps' } as Record<string, string>)[field] ?? field}.` })
  }

  const status = !r.ingredients.length && !r.steps.length ? 'failed'
    : r.ingredients.length && r.steps.length && r.name && r.servings !== null ? 'complete' : 'partial'
  return {
    ...base,
    status,
    page_type: !llm.is_recipe && !r.ingredients.length ? 'not_a_recipe' : llm.multiple_recipes ? 'multi_recipe_roundup' : base.page_type,
    source_type: [...base.source_type, 'llm'],
    recipe: r,
    warnings,
    raw_notes: [...base.raw_notes, ...llm.raw_notes.map(cleanText).filter(Boolean)],
  }
}

export interface RunOutcome {
  result: ImportResult
  from_cache: boolean
  llm: { used: boolean; allowance: LlmAllowance | null; failure: string | null }
}

export async function runImport(input: { kind: 'url' | 'text'; content: string; sourceUrl: string | null; userId: string }): Promise<RunOutcome> {
  const service = createServiceClient()
  const html = input.kind === 'url' ? input.content : textToHtml(input.content)
  const label = input.sourceUrl ?? 'texte collé'
  const version = `${PARSER_VERSION}+${LLM_PROMPT_VERSION}`
  const content_hash = hashContent(input.kind === 'url' ? input.content : cleanText(input.content))

  const cached = await findCached(service, content_hash, version)
  if (cached && !(needsLlm(cached) && llmAvailable())) {
    await recordAttempt(service, { user_id: input.userId, input_kind: input.kind, source_url: input.sourceUrl, content_hash, parser_version: version, status: cached.status, source_type: cached.source_type })
    return { result: cached, from_cache: true, llm: { used: false, allowance: null, failure: null } }
  }

  let result = importFromHtml(html, input.sourceUrl ?? 'https://texte.local/')
  if (input.kind === 'text') result.warnings = result.warnings.filter(w => w.code !== 'name_from_title')
  const transcript = input.kind === 'text' && isTranscript(input.content)
  if (transcript) result = discardUnreliable(result, true)
  else if (lowQuality(result)) result = discardUnreliable(result, false)

  let used = false
  let allowance: LlmAllowance | null = null
  let failure: string | null = null
  let usage = { llm_model: null as string | null, input_tokens: 0, output_tokens: 0, cost_usd: 0 }

  if (needsLlm(result)) {
    if (!llmAvailable()) {
      failure = 'unavailable'
    } else {
      allowance = await llmAllowance(service, input.userId)
      if (allowance.allowed) {
        const out = await structureWithLlm(input.kind === 'url' ? mainText(html) : input.content, label)
        used = out.input_tokens > 0
        usage = { llm_model: out.model, input_tokens: out.input_tokens, output_tokens: out.output_tokens, cost_usd: out.cost_usd }
        if (out.recipe) result = mergeLlm(result, out.recipe)
        else failure = out.failure
      } else {
        failure = allowance.reason
      }
    }
    if (needsLlm(result)) {
      const why = failure === 'quota' ? ` Tu as utilisé tes ${allowance?.quota} imports assistés du jour.`
        : failure === 'budget' ? ' L’import assisté est en pause jusqu’au mois prochain.'
        : failure === 'unavailable' ? ' L’import assisté par IA n’est pas activé.' : ''
      if (transcript) {
        result.warnings.push({ code: 'transcript_detected', message: `Ce texte ressemble à une transcription de vidéo : il est rédigé à l’oral, sans liste d’ingrédients ni étapes. Seul l’import assisté par IA sait le ranger.${why} Tu peux aussi remplir la fiche à la main.` })
      } else if (input.kind === 'text') {
        result.warnings.push({ code: 'text_unstructured', message: `Ce texte n’a pas pu être rangé.${why} Ajoute les titres « Ingrédients » et « Préparation », un ingrédient par ligne, ou remplis la fiche à la main.` })
      } else {
        result.warnings.push({ code: 'paste_suggested', message: `Cette page n’a pas pu être lue entièrement.${why} Colle le texte de la recette ou complète la fiche à la main.` })
      }
    }
  }

  await recordAttempt(service, {
    user_id: input.userId, input_kind: input.kind, source_url: input.sourceUrl, content_hash, parser_version: version,
    status: result.status, source_type: result.source_type, used_llm: used, ...usage, result,
  })
  return { result, from_cache: false, llm: { used, allowance, failure } }
}

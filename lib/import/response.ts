// Réponse commune des routes d'import (lien et texte collé).
// Nouvelle forme (ImportResult) + champ historique `partial`, gardé à
// l'identique pour l'application mobile tant qu'elle n'est pas mise à jour.

import type { RunOutcome } from './run'
import { PARSER_VERSION } from './run'
import type { ImportedIngredient } from './types'

function ingredientLine(i: ImportedIngredient): string {
  return [i.quantity, i.unit, i.name].filter(v => v !== null && v !== '').join(' ')
}

export function importResponse(outcome: RunOutcome, extra: { source_url: string | null; raw_html_hash: string | null }) {
  const { result, from_cache, llm } = outcome
  const r = result.recipe
  return {
    success: result.status !== 'failed',
    partial: {
      name: r.name,
      description: r.tip ?? '',
      prep_time_min: r.prep_min,
      cook_time_min: r.cook_min,
      servings: r.servings ?? 4,
      ingredients: r.ingredients.map(ingredientLine),
      steps: r.steps.map(s => s.text),
      photo_url: r.photo_url,
    },
    ...extra,
    parser_version: PARSER_VERSION,
    from_cache,
    llm_used: llm.used,
    ...result,
  }
}

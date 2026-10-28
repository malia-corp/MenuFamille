// Repli IA de l'import (jour 3) : structure une recette quand les extracteurs
// sans IA n'ont rien trouvé. Désactivé tant qu'aucune clé n'est configurée
// (ANTHROPIC_API_KEY) : coût nul par défaut (décision du 28/10).
//
// Variables d'environnement :
//   ANTHROPIC_API_KEY             clé de l'API Claude (absente = repli désactivé)
//   IMPORT_LLM_MODEL              modèle (défaut : claude-haiku-5-5, le plus économique)
//   IMPORT_LLM_DISABLED=1         coupe le repli sans retirer la clé
//   IMPORT_LLM_DAILY_QUOTA        imports avec IA par utilisatrice et par jour (défaut 20)
//   IMPORT_LLM_MONTHLY_BUDGET_USD plafond global du mois (défaut 5)

import Anthropic from '@anthropic-ai/sdk'
import { zodOutputFormat } from '@anthropic-ai/sdk/helpers/zod'
import * as z from 'zod/v4'
import { LLM_PROMPT_VERSION, LLM_SYSTEM_PROMPT } from './llm-prompt'

export const LLM_MODEL = process.env.IMPORT_LLM_MODEL || 'claude-haiku-5-5'
export const LLM_DAILY_QUOTA = Number(process.env.IMPORT_LLM_DAILY_QUOTA ?? 20)
export const LLM_MONTHLY_BUDGET_USD = Number(process.env.IMPORT_LLM_MONTHLY_BUDGET_USD ?? 5)
export { LLM_PROMPT_VERSION }

// Prix publics en dollars par million de tokens (entrée, sortie), pour
// l'estimation journalisée. Modèle inconnu : tarif Opus, par prudence.
const PRICES: Record<string, [number, number]> = {
  'claude-haiku-5-5': [0.10, 0.50],
  'claude-sonnet-5-5': [2, 10],
  'claude-opus-5-5': [4, 20],
}

export function llmAvailable(): boolean {
  return !!process.env.ANTHROPIC_API_KEY && process.env.IMPORT_LLM_DISABLED !== '1'
}

// Quota par utilisatrice et plafond mensuel global (cf. attempts.ts).
// eslint-disable-next-line @typescript-eslint/no-unused-vars
export function quotaFor(_user: { id: string }): number {
  // Aujourd'hui une seule valeur pour toutes ; demain, selon la formule de l'utilisatrice.
  return LLM_DAILY_QUOTA
}

const Confidence = z.enum(['high', 'medium', 'low'])

export const LlmRecipeSchema = z.object({
  is_recipe: z.boolean(),
  multiple_recipes: z.boolean(),
  name: z.string().nullable(),
  servings: z.number().nullable(),
  prep_min: z.number().nullable(),
  cook_min: z.number().nullable(),
  rest_min: z.number().nullable(),
  total_min: z.number().nullable(),
  difficulty: z.enum(['facile', 'moyen', 'difficile']).nullable(),
  ingredients: z.array(z.object({
    quantity: z.number().nullable(),
    unit: z.string().nullable(),
    name: z.string(),
    optional: z.boolean(),
  })),
  steps: z.array(z.string()),
  tip: z.string().nullable(),
  raw_notes: z.array(z.string()),
  language: z.string(),
  confidence: z.object({
    name: Confidence,
    ingredients: Confidence,
    steps: Confidence,
    servings: Confidence,
    times: Confidence,
  }),
})

export type LlmRecipe = z.infer<typeof LlmRecipeSchema>

export interface LlmOutcome {
  recipe: LlmRecipe | null
  model: string
  input_tokens: number
  output_tokens: number
  cost_usd: number
  failure: 'refusal' | 'max_tokens' | 'parse' | 'api_error' | null
}

// Contenu envoyé : texte principal de la page, borné (le coût en dépend).
const MAX_CHARS = 24_000

export function estimateCost(model: string, inputTokens: number, outputTokens: number): number {
  const [pin, pout] = PRICES[model] ?? PRICES['claude-opus-5-5']
  return Math.round(((inputTokens * pin + outputTokens * pout) / 1_000_000) * 1e6) / 1e6
}

export async function structureWithLlm(content: string, source: string): Promise<LlmOutcome> {
  const model = LLM_MODEL
  const empty = { recipe: null, model, input_tokens: 0, output_tokens: 0, cost_usd: 0 }
  const client = new Anthropic()
  const text = content.length > MAX_CHARS ? content.slice(0, MAX_CHARS) : content
  try {
    const response = await client.messages.parse({
      model,
      max_tokens: 8000,
      system: LLM_SYSTEM_PROMPT,
      messages: [{ role: 'user', content: `Source : ${source}\n<contenu>\n${text}\n</contenu>` }],
      output_config: { effort: 'low', format: zodOutputFormat(LlmRecipeSchema) },
    })
    const input_tokens = response.usage.input_tokens + (response.usage.cache_read_input_tokens ?? 0)
    const output_tokens = response.usage.output_tokens
    const cost_usd = estimateCost(model, input_tokens, output_tokens)
    const usage = { model, input_tokens, output_tokens, cost_usd }
    if (response.stop_reason === 'refusal') return { ...usage, recipe: null, failure: 'refusal' }
    if (response.stop_reason === 'max_tokens') return { ...usage, recipe: null, failure: 'max_tokens' }
    if (!response.parsed_output) return { ...usage, recipe: null, failure: 'parse' }
    return { ...usage, recipe: response.parsed_output, failure: null }
  } catch (e) {
    if (e instanceof Anthropic.APIError) console.error(`[import] IA indisponible (${e.status}) : ${e.message}`)
    else console.error('[import] IA indisponible :', e)
    return { ...empty, failure: 'api_error' }
  }
}

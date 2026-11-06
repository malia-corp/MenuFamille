// Suivi des imports (table recipe_import_attempts, migration y) : cache,
// quota IA par utilisatrice, plafond mensuel global, journal des coûts.
// Côté serveur uniquement (service role). Une table absente (migration pas
// encore appliquée) ne bloque jamais l'import : on continue sans cache ni IA.

import { createHash } from 'node:crypto'
import { createServiceClient } from '@/lib/supabase/service'
import type { Json } from '@/lib/supabase/database.types'
import { LLM_MONTHLY_BUDGET_USD, quotaFor } from './llm'
import type { ImportResult } from './types'

type Service = ReturnType<typeof createServiceClient>

export const hashContent = (s: string) => createHash('sha256').update(s).digest('hex').slice(0, 32)

const CACHE_DAYS = 30

export async function findCached(service: Service, contentHash: string, parserVersion: string): Promise<ImportResult | null> {
  const since = new Date(Date.now() - CACHE_DAYS * 86_400_000).toISOString()
  const { data, error } = await service
    .from('recipe_import_attempts')
    .select('result')
    .eq('content_hash', contentHash)
    .eq('parser_version', parserVersion)
    .neq('status', 'failed')
    .gte('created_at', since)
    .not('result', 'is', null)
    .order('created_at', { ascending: false })
    .limit(1)
    .maybeSingle()
  if (error || !data?.result) return null
  return data.result as unknown as ImportResult
}

function startOfDay(): string { const d = new Date(); d.setHours(0, 0, 0, 0); return d.toISOString() }
function startOfMonth(): string { const d = new Date(); d.setDate(1); d.setHours(0, 0, 0, 0); return d.toISOString() }

export interface LlmAllowance { allowed: boolean; reason: 'quota' | 'budget' | 'unavailable' | null; used_today: number; quota: number }

// L'utilisatrice peut-elle encore utiliser l'IA ? Quota du jour (le sien),
// puis plafond du mois (commun, filet de sécurité).
export async function llmAllowance(service: Service, userId: string): Promise<LlmAllowance> {
  const quota = quotaFor({ id: userId })
  const today = await service
    .from('recipe_import_attempts')
    .select('id', { count: 'exact', head: true })
    .eq('user_id', userId)
    .eq('used_llm', true)
    .gte('created_at', startOfDay())
  if (today.error) return { allowed: false, reason: 'unavailable', used_today: 0, quota }
  const used = today.count ?? 0
  if (used >= quota) return { allowed: false, reason: 'quota', used_today: used, quota }

  const month = await service
    .from('recipe_import_attempts')
    .select('cost_usd')
    .eq('used_llm', true)
    .gte('created_at', startOfMonth())
  if (month.error) return { allowed: false, reason: 'unavailable', used_today: used, quota }
  const spent = (month.data ?? []).reduce((s, r) => s + Number(r.cost_usd ?? 0), 0)
  if (spent >= LLM_MONTHLY_BUDGET_USD) return { allowed: false, reason: 'budget', used_today: used, quota }
  return { allowed: true, reason: null, used_today: used, quota }
}

export interface AttemptRecord {
  user_id: string
  input_kind: 'url' | 'text'
  source_url: string | null
  content_hash: string
  parser_version: string
  status: 'complete' | 'partial' | 'failed'
  error_code?: string | null
  source_type?: string[]
  used_llm?: boolean
  llm_model?: string | null
  input_tokens?: number
  output_tokens?: number
  cost_usd?: number
  result?: ImportResult | null
}

export async function recordAttempt(service: Service, a: AttemptRecord): Promise<void> {
  const { error } = await service.from('recipe_import_attempts').insert({
    ...a,
    result: (a.result ?? null) as unknown as Json,
  })
  if (error) console.error('[import] journal indisponible :', error.message)
  if (a.used_llm) {
    console.info(`[import] IA ${a.llm_model} · ${a.input_tokens} + ${a.output_tokens} tokens · ${a.cost_usd?.toFixed(5)} $`)
  }
}

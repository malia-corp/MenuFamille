import { createClient } from '@/lib/supabase/server'
import { runImport } from '@/lib/import/run'
import { importResponse } from '@/lib/import/response'

// Import d'une recette depuis un texte collé (message WhatsApp, légende,
// notes). Même chaîne et même réponse que l'import par lien ; aucune source
// externe n'est contactée, sauf l'IA en repli si elle est activée.

const MAX_CHARS = 20_000

export const maxDuration = 30

export async function POST(request: Request) {
  const supabase = await createClient()
  const { data: { user } } = await supabase.auth.getUser()
  if (!user) return Response.json({ error: 'Non authentifié' }, { status: 401 })

  const body = await request.json().catch(() => null) as { text?: unknown } | null
  const text = typeof body?.text === 'string' ? body.text.trim() : ''
  if (text.length < 20) return Response.json({ error: 'Colle le texte complet de la recette.', code: 'too_short' }, { status: 400 })
  if (text.length > MAX_CHARS) return Response.json({ error: 'Ce texte est trop long pour une seule recette.', code: 'too_large' }, { status: 400 })

  const outcome = await runImport({ kind: 'text', content: text, sourceUrl: null, userId: user.id })
  return Response.json(importResponse(outcome, { source_url: null, raw_html_hash: null }))
}

import { createHash } from 'crypto'
import { createClient } from '@/lib/supabase/server'
import { fetchPage } from '@/lib/import/fetch-page'
import { runImport } from '@/lib/import/run'
import { importResponse } from '@/lib/import/response'

// Import d'une recette depuis un lien (cf. docs/import-recettes.md).
// Ne crée rien : renvoie une fiche proposée, relue par l'utilisatrice.
// Une page illisible renvoie un message humain (code typé) et la proposition
// de coller le texte de la recette.

// Récupération (8 s) + repli IA éventuel.
export const maxDuration = 30

export async function POST(request: Request) {
  const supabase = await createClient()
  const { data: { user } } = await supabase.auth.getUser()
  if (!user) return Response.json({ error: 'Non authentifié' }, { status: 401 })

  const body = await request.json().catch(() => null) as { url?: unknown } | null
  const url = typeof body?.url === 'string' ? body.url.trim() : ''
  if (!url) return Response.json({ error: 'Adresse manquante.', code: 'invalid_url' }, { status: 400 })

  const page = await fetchPage(url)
  if (!page.ok) {
    return Response.json(
      { error: page.message, code: page.error, paste_suggested: page.error !== 'invalid_url' },
      { status: page.error === 'invalid_url' ? 400 : 422 },
    )
  }

  const outcome = await runImport({ kind: 'url', content: page.html, sourceUrl: page.finalUrl, userId: user.id })
  const raw_html_hash = createHash('sha256').update(page.html).digest('hex').slice(0, 16)
  return Response.json(importResponse(outcome, { source_url: url, raw_html_hash }))
}

import { createHash } from 'crypto'
import { createClient } from '@/lib/supabase/server'
import { parseLegacy } from '@/lib/import/legacy'

// ── Handler ───────────────────────────────────────────────────
export async function POST(request: Request) {
  const supabase = await createClient()
  const { data: { user } } = await supabase.auth.getUser()
  if (!user) return Response.json({ error: 'Non authentifié' }, { status: 401 })

  const { url } = await request.json()
  try { new URL(url) } catch {
    return Response.json({ error: 'URL invalide' }, { status: 400 })
  }

  let html: string
  try {
    const res = await fetch(url, {
      signal: AbortSignal.timeout(8000),
      headers: { 'User-Agent': 'KeskonBouf-Bot/1.0' },
    })
    if (!res.ok) {
      return Response.json({ error: `Site inaccessible (HTTP ${res.status})` }, { status: 422 })
    }
    html = await res.text()
  } catch {
    return Response.json({ error: 'Impossible de récupérer la page' }, { status: 422 })
  }

  const raw_html_hash = createHash('sha256').update(html).digest('hex').slice(0, 16)

  const { success, partial } = parseLegacy(html)

  return Response.json({ success, partial, raw_html_hash, source_url: url })
}

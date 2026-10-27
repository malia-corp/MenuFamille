// Télécharge le HTML brut de chaque cas du jeu de test d'import, dans les
// mêmes conditions que la route actuelle (fetch Node, User-Agent
// « KeskonBouf-Bot/1.0 », délai de 8 s), et note ce qui s'est passé.
//
//   npm run import:fetch            → tous les cas
//   npm run import:fetch -- 02      → seulement les dossiers commençant par 02
//
// Entrée : tests/import-fixtures/<cas>/url.txt
// Sortie : page.html (ignoré par Git) et fetch.json (versionné)

import { readdirSync, readFileSync, writeFileSync, existsSync } from 'node:fs'
import { join } from 'node:path'

const ROOT = 'tests/import-fixtures'
const UA = 'KeskonBouf-Bot/1.0'
const TIMEOUT_MS = 8000

interface FetchReport {
  url: string
  fetched_at: string
  ok: boolean
  status: number | null
  content_type: string | null
  bytes: number
  final_url: string | null
  redirected: boolean
  ms: number
  error: string | null
}

async function fetchCase(dir: string): Promise<FetchReport> {
  const url = readFileSync(join(dir, 'url.txt'), 'utf8').trim()
  const started = Date.now()
  const report: FetchReport = {
    url, fetched_at: new Date().toISOString(), ok: false, status: null, content_type: null,
    bytes: 0, final_url: null, redirected: false, ms: 0, error: null,
  }
  try {
    const res = await fetch(url, { signal: AbortSignal.timeout(TIMEOUT_MS), headers: { 'User-Agent': UA } })
    const html = await res.text()
    Object.assign(report, {
      ok: res.ok, status: res.status, content_type: res.headers.get('content-type'),
      bytes: Buffer.byteLength(html), final_url: res.url, redirected: res.redirected,
    })
    writeFileSync(join(dir, 'page.html'), html)
  } catch (e) {
    const err = e as Error & { cause?: { code?: string } }
    report.error = err.name === 'TimeoutError' ? 'timeout' : `${err.name}: ${err.cause?.code ?? err.message}`
  }
  report.ms = Date.now() - started
  writeFileSync(join(dir, 'fetch.json'), JSON.stringify(report, null, 2) + '\n')
  return report
}

async function main() {
  const filter = process.argv[2]
  const cases = readdirSync(ROOT, { withFileTypes: true })
    .filter(d => d.isDirectory() && (!filter || d.name.startsWith(filter)))
    .map(d => join(ROOT, d.name))
    .filter(d => existsSync(join(d, 'url.txt')))

  for (const dir of cases) {
    const r = await fetchCase(dir)
    const what = r.error ?? `HTTP ${r.status} · ${r.content_type ?? '?'} · ${Math.round(r.bytes / 1024)} Ko`
    console.log(`${dir.split(/[\\/]/).pop()}  ${what}  (${r.ms} ms)`)
  }
}

void main()

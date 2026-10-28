// Récupération d'une page de recette, côté serveur.
// - SSRF : hôte public uniquement, adresse IP vérifiée au moment même de la
//   connexion (lookup personnalisé : pas de « DNS rebinding » entre le contrôle
//   et la connexion), revérifiée à chaque redirection (3 au plus).
// - Délai de 8 s, 2 Mo au plus, HTML ou texte uniquement.
// - User-Agent identifiable ; robots.txt respecté (décision du 28/10).
// Jamais d'exception : toutes les erreurs sont typées.

import http from 'node:http'
import https from 'node:https'
import { lookup as dnsLookup, type LookupAddress } from 'node:dns'
import zlib from 'node:zlib'
import { checkPublicUrl, isPrivateAddress } from './url-safety'

export const IMPORT_USER_AGENT = 'KeskonBouf-Importer/2.0 (+https://keskonbouf.app)'
const TIMEOUT_MS = 8000
const MAX_BYTES = 2 * 1024 * 1024
const MAX_REDIRECTS = 3

export type FetchErrorCode =
  | 'invalid_url' | 'blocked' | 'robots_disallowed' | 'timeout' | 'too_large'
  | 'not_html' | 'unreachable' | 'http_error'

export type FetchPageResult =
  | { ok: true; html: string; finalUrl: string; status: number; contentType: string }
  | { ok: false; error: FetchErrorCode; status?: number; message: string }

const MESSAGES: Record<FetchErrorCode, string> = {
  invalid_url: 'Cette adresse n’est pas valide.',
  blocked: 'Ce site refuse l’import automatique de ses pages.',
  robots_disallowed: 'Ce site demande à ne pas être lu par les robots.',
  timeout: 'Le site met trop de temps à répondre.',
  too_large: 'Cette page est trop lourde pour être importée.',
  not_html: 'Cette adresse ne mène pas à une page de recette.',
  unreachable: 'Impossible de joindre ce site.',
  http_error: 'Le site a renvoyé une erreur.',
}

const fail = (error: FetchErrorCode, status?: number): FetchPageResult => ({ ok: false, error, status, message: MESSAGES[error] })

// Résolution DNS filtrée : refuse toute adresse privée au moment de la connexion.
function safeLookup(hostname: string, options: object, callback: (err: NodeJS.ErrnoException | null, address: string | LookupAddress[], family?: number) => void) {
  dnsLookup(hostname, { all: true }, (err, addresses) => {
    if (err) return callback(err, '', 4)
    const list = addresses as LookupAddress[]
    const bad = list.find(a => isPrivateAddress(a.address))
    if (bad || !list.length) {
      const e = new Error('blocked_address') as NodeJS.ErrnoException
      e.code = 'EBLOCKED'
      return callback(e, '', 4)
    }
    if ((options as { all?: boolean }).all) return callback(null, list)
    callback(null, list[0].address, list[0].family)
  })
}

interface RawResponse { status: number; headers: http.IncomingHttpHeaders; body: Buffer; tooLarge: boolean }

function request(url: URL, deadline: number): Promise<RawResponse> {
  return new Promise((resolve, reject) => {
    const lib = url.protocol === 'https:' ? https : http
    const req = lib.request(url, {
      method: 'GET',
      lookup: safeLookup as never,
      headers: {
        'User-Agent': IMPORT_USER_AGENT,
        Accept: 'text/html,application/xhtml+xml,text/plain;q=0.9,*/*;q=0.1',
        'Accept-Encoding': 'gzip, deflate, br',
        'Accept-Language': 'fr,en;q=0.8',
      },
      timeout: Math.max(1, deadline - Date.now()),
    }, res => {
      const chunks: Buffer[] = []
      let size = 0
      let tooLarge = false
      const declared = Number(res.headers['content-length'] ?? 0)
      if (declared > MAX_BYTES) { tooLarge = true; res.destroy(); return resolve({ status: res.statusCode ?? 0, headers: res.headers, body: Buffer.alloc(0), tooLarge }) }
      res.on('data', (c: Buffer) => {
        size += c.length
        if (size > MAX_BYTES * 4) { tooLarge = true; res.destroy() } else chunks.push(c)
      })
      res.on('end', () => resolve({ status: res.statusCode ?? 0, headers: res.headers, body: Buffer.concat(chunks), tooLarge }))
      res.on('close', () => resolve({ status: res.statusCode ?? 0, headers: res.headers, body: Buffer.concat(chunks), tooLarge }))
      res.on('error', reject)
    })
    req.on('timeout', () => req.destroy(Object.assign(new Error('timeout'), { code: 'ETIMEDOUT' })))
    req.on('error', reject)
    req.end()
  })
}

function decompress(body: Buffer, encoding: string | undefined): Buffer {
  try {
    if (encoding === 'gzip') return zlib.gunzipSync(body)
    if (encoding === 'deflate') return zlib.inflateSync(body)
    if (encoding === 'br') return zlib.brotliDecompressSync(body)
  } catch { /* corps tel quel */ }
  return body
}

function decodeBody(body: Buffer, contentType: string): string {
  const charset = contentType.match(/charset=["']?([\w-]+)/i)?.[1]?.toLowerCase()
  try {
    return new TextDecoder(charset && charset !== 'utf8' ? charset : 'utf-8').decode(body)
  } catch {
    return new TextDecoder('utf-8').decode(body)
  }
}

// ── robots.txt ───────────────────────────────────────────────
// Groupes « User-agent: * » et « KeskonBouf » ; la règle la plus longue gagne
// (Allow l'emporte à longueur égale). Fichier absent ou illisible = autorisé.

export function robotsAllows(robots: string, path: string): boolean {
  const groups: { agents: string[]; rules: { allow: boolean; path: string }[] }[] = []
  let current: (typeof groups)[number] | null = null
  let lastWasAgent = false
  for (const line of robots.split(/\r?\n/)) {
    const m = line.replace(/#.*$/, '').trim().match(/^([a-z-]+)\s*:\s*(.*)$/i)
    if (!m) continue
    const key = m[1].toLowerCase()
    const value = m[2].trim()
    if (key === 'user-agent') {
      if (!current || !lastWasAgent) { current = { agents: [], rules: [] }; groups.push(current) }
      current.agents.push(value.toLowerCase())
      lastWasAgent = true
    } else {
      lastWasAgent = false
      if (current && (key === 'allow' || key === 'disallow')) current.rules.push({ allow: key === 'allow', path: value })
    }
  }
  const mine = groups.filter(g => g.agents.some(a => a.includes('keskonbouf')))
  const applicable = mine.length ? mine : groups.filter(g => g.agents.includes('*'))
  let best: { allow: boolean; len: number } | null = null
  for (const rule of applicable.flatMap(g => g.rules)) {
    if (!rule.path) continue
    const pattern = new RegExp('^' + rule.path.replace(/[.+?^${}()|[\]\\]/g, '\\$&').replace(/\*/g, '.*').replace(/\\\$$/, '$'))
    if (pattern.test(path) && (!best || rule.path.length > best.len || (rule.path.length === best.len && rule.allow))) {
      best = { allow: rule.allow, len: rule.path.length }
    }
  }
  return best ? best.allow : true
}

async function robotsCheck(url: URL, deadline: number): Promise<boolean> {
  try {
    const res = await request(new URL('/robots.txt', url), Math.min(deadline, Date.now() + 3000))
    if (res.status < 200 || res.status >= 300) return true
    const text = decodeBody(decompress(res.body, res.headers['content-encoding'] as string | undefined), String(res.headers['content-type'] ?? ''))
    return robotsAllows(text, url.pathname + url.search)
  } catch {
    return true
  }
}

// ── Récupération ─────────────────────────────────────────────

export async function fetchPage(rawUrl: string): Promise<FetchPageResult> {
  let url = checkPublicUrl(rawUrl)
  if (!url) return fail('invalid_url')
  const deadline = Date.now() + TIMEOUT_MS

  if (!(await robotsCheck(url, deadline))) return fail('robots_disallowed')

  for (let hop = 0; hop <= MAX_REDIRECTS; hop++) {
    let res: RawResponse
    try {
      res = await request(url, deadline)
    } catch (e) {
      const code = (e as NodeJS.ErrnoException).code
      if (code === 'EBLOCKED') return fail('invalid_url')
      if (code === 'ETIMEDOUT' || Date.now() >= deadline) return fail('timeout')
      return fail('unreachable')
    }

    if (res.status >= 300 && res.status < 400 && res.headers.location) {
      const next = checkPublicUrl(new URL(String(res.headers.location), url).toString())
      if (!next) return fail('invalid_url')
      url = next
      continue
    }
    if (res.tooLarge) return fail('too_large')
    if (res.status === 401 || res.status === 403 || res.status === 429 || res.status === 451) return fail('blocked', res.status)
    if (res.status < 200 || res.status >= 300) return fail('http_error', res.status)

    const contentType = String(res.headers['content-type'] ?? '')
    if (contentType && !/text\/html|application\/xhtml|text\/plain/i.test(contentType)) return fail('not_html', res.status)
    const body = decompress(res.body, res.headers['content-encoding'] as string | undefined)
    if (body.length > MAX_BYTES) return fail('too_large')
    return { ok: true, html: decodeBody(body, contentType), finalUrl: url.toString(), status: res.status, contentType }
  }
  return fail('unreachable')
}

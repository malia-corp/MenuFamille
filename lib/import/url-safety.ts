// Adresses autorisées pour l'import et pour les photos : http(s) vers un hôte
// public uniquement. Bloque localhost, réseaux privés, lien local, CGNAT,
// métadonnées cloud et leurs équivalents IPv6 (protection SSRF).

import { isIP } from 'node:net'

function ipv4ToInt(ip: string): number {
  return ip.split('.').reduce((acc, p) => (acc << 8) + Number(p), 0) >>> 0
}

const V4_BLOCKED: [string, number][] = [
  ['0.0.0.0', 8], ['10.0.0.0', 8], ['100.64.0.0', 10], ['127.0.0.0', 8], ['169.254.0.0', 16],
  ['172.16.0.0', 12], ['192.0.0.0', 24], ['192.0.2.0', 24], ['192.168.0.0', 16], ['198.18.0.0', 15],
  ['198.51.100.0', 24], ['203.0.113.0', 24], ['224.0.0.0', 4], ['240.0.0.0', 4],
]

export function isPrivateAddress(ip: string): boolean {
  const kind = isIP(ip)
  if (kind === 4) {
    const n = ipv4ToInt(ip)
    return V4_BLOCKED.some(([base, bits]) => (n >>> (32 - bits)) === (ipv4ToInt(base) >>> (32 - bits)))
  }
  if (kind === 6) {
    const s = ip.toLowerCase()
    const mapped = s.match(/^::ffff:(\d+\.\d+\.\d+\.\d+)$/)
    if (mapped) return isPrivateAddress(mapped[1])
    return s === '::' || s === '::1' || /^f[cd]/.test(s) || /^fe[89ab]/.test(s) || /^ff/.test(s) || s.startsWith('64:ff9b:') || s.startsWith('2001:db8')
  }
  return true
}

const BLOCKED_HOSTS = /^(localhost|.*\.localhost|.*\.local|.*\.internal|metadata\.google\.internal)$/i

// Vérification syntaxique (sans résolution DNS) : schéma, hôte, IP littérale.
// La résolution DNS est revérifiée au moment de la connexion (fetch-page.ts).
export function checkPublicUrl(raw: string, { httpsOnly = false } = {}): URL | null {
  let url: URL
  try { url = new URL(raw) } catch { return null }
  if (url.protocol !== 'https:' && (httpsOnly || url.protocol !== 'http:')) return null
  if (url.username || url.password) return null
  const host = url.hostname.replace(/^\[|\]$/g, '')
  if (!host || BLOCKED_HOSTS.test(host)) return null
  if (isIP(host) && isPrivateAddress(host)) return null
  if (!isIP(host) && !host.includes('.')) return null
  return url
}

// Photo d'une recette : https public, sinon rien (cf. décision du 28/10).
export function safePhotoUrl(raw: unknown): string | null {
  if (typeof raw !== 'string' || !raw.trim()) return null
  return checkPublicUrl(raw.trim(), { httpsOnly: true })?.toString() ?? null
}

// Photo enregistrée sur une recette : le stockage Supabase du projet (y compris
// une instance locale en développement), sinon une adresse https publique.
export function acceptablePhotoUrl(raw: unknown): string | null {
  if (typeof raw !== 'string' || !raw.trim()) return null
  const own = process.env.NEXT_PUBLIC_SUPABASE_URL
  if (own && raw.startsWith(`${own.replace(/\/$/, '')}/storage/`)) return raw
  return safePhotoUrl(raw)
}

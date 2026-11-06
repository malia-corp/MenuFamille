// HTML → lignes de texte lisibles, pour les extracteurs qui lisent la page
// telle qu'elle s'affiche. Chaque élément de liste devient une ligne (ses
// morceaux réunis : « moutarde 1 c. à soupe »), les titres sont marqués,
// et aucune ligne n'est jetée pour sa longueur (« 2 » est une quantité).

import { cleanText, decodeEntities } from './normalize'

export interface Line {
  text: string
  kind: 'heading' | 'item' | 'text'
  level?: number   // niveau de titre (1 à 6)
}

const DROP_BLOCKS = /<(script|style|noscript|svg|template|iframe|nav|footer|form|button|select)\b[\s\S]*?<\/\1>/gi
const BLOCK_TAGS = /<\/?(?:p|div|section|article|main|header|aside|tr|td|th|table|tbody|thead|dd|dt|dl|ul|ol|figure|figcaption|blockquote|br|hr)\b[^>]*>/gi

function inner(html: string): string {
  return cleanText(html.replace(/<[^>]+>/g, ' '))
}

export function htmlToLines(html: string): Line[] {
  let s = html.replace(/<!--[\s\S]*?-->/g, '').replace(DROP_BLOCKS, ' ')
  // Le corps seul (la balise <head> n'a pas de contenu affiché).
  const body = s.match(/<body\b[^>]*>([\s\S]*)<\/body>/i)
  if (body) s = body[1]
  s = s
    // Élément de liste d'abord : s'il contient un titre (« Pour la vinaigrette »), c'en est un.
    .replace(/<li\b[^>]*>([\s\S]*?)<\/li>/gi, (_, txt: string) => {
      const h = txt.match(/<h([1-6])\b/i)
      return h ? `\n\u0001H${h[1]}${inner(txt)}\n` : `\n\u0001LI${inner(txt)}\n`
    })
    .replace(/<h([1-6])\b[^>]*>([\s\S]*?)<\/h\1>/gi, (_, lvl, txt) => `\n\u0001H${lvl}${inner(txt)}\n`)
    .replace(BLOCK_TAGS, '\n')
    .replace(/<[^>]+>/g, ' ')
  const lines: Line[] = []
  for (const raw of decodeEntities(s).split('\n')) {
    const h = raw.match(/^\s*\u0001H([1-6])(.*)$/)
    const li = raw.match(/^\s*\u0001LI(.*)$/)
    const text = cleanText((h ? h[2] : li ? li[1] : raw))
    if (!text) continue
    // Restes de code d'un HTML mal fermé (« modal#close click->recipe… class="… »).
    if (/click->|\w+#\w+\s+click|\bclass=["']|\bdata-[a-z-]+=|^[{[]/.test(text)) continue
    lines.push(h ? { text, kind: 'heading', level: Number(h[1]) } : li ? { text, kind: 'item' } : { text, kind: 'text' })
  }
  return lines
}

export function metaContent(html: string, prop: string): string | null {
  const re = new RegExp(`<meta[^>]+(?:property|name)=["']${prop}["'][^>]*>`, 'i')
  const tag = html.match(re)?.[0]
  const v = tag?.match(/content=["']([^"']*)["']/i)?.[1]
  return v ? cleanText(v) : null
}

export function titleTag(html: string): string | null {
  const t = html.match(/<title[^>]*>([\s\S]*?)<\/title>/i)?.[1]
  return t ? cleanText(t) : null
}

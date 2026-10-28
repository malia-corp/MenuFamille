// Texte collé (message WhatsApp, légende, notes) → HTML minimal, pour que la
// même chaîne que les pages web le lise sans IA : la première ligne devient
// le titre, et les blocs Ingrédients / Préparation sont repérés ou déduits.

const INGR_HEAD = /^[^A-Za-zÀ-ÿœŒ\d]*(?:liste des |les )?ingr[ée]dients?\b|^[^A-Za-zÀ-ÿœŒ\d]*ingredients\b/i
const STEPS_HEAD = /^[^A-Za-zÀ-ÿœŒ\d]*(?:la )?(?:pr[ée]paration|instructions|[ée]tapes?|steps|m[ée]thode|r[ée]alisation)\b/i
const QTY_START = /^[-•*–·]\s*\S|^(?:\d+[.,/]?\d*|[½¼¾⅓⅔]|une?|deux|trois|quatre|cinq|quelques|un peu)\s+\S/i

const esc = (s: string) => s.replace(/&/g, '&amp;').replace(/</g, '&lt;').replace(/>/g, '&gt;')
const isSentence = (t: string) => t.length > 70 || (/[.!]$/.test(t) && t.split(' ').length >= 3)
// Puces en émoji (« 👉 2 poissons ») : on regarde le texte qui suit.
const core = (t: string) => t.replace(/^[^A-Za-zÀ-ÿœŒ\d½¼¾⅓⅔-]+/, '')
const isIngredientLike = (t: string) => t.length < 80 && !isSentence(t) && (QTY_START.test(t) || QTY_START.test(core(t)) || /:\s*\d/.test(t))

export function textToHtml(text: string): string {
  const lines = text.replace(/\r/g, '').split('\n').map(l => l.trim()).filter(Boolean)
  if (!lines.length) return '<html><body></body></html>'
  const hasIngr = lines.some(l => l.length < 50 && INGR_HEAD.test(l))
  const hasSteps = lines.some(l => l.length < 50 && STEPS_HEAD.test(l))
  const out: string[] = []
  let titleDone = false
  let ingrStarted = hasIngr
  let stepsStarted = hasSteps
  lines.forEach((l, i) => {
    if (!titleDone && !INGR_HEAD.test(l) && !isIngredientLike(l) && l.length < 100) {
      out.push(`<h1>${esc(l.replace(/^[^A-Za-zÀ-ÿœŒ\d]+/, ''))}</h1>`); titleDone = true; return
    }
    titleDone = true
    if (l.length < 50 && (INGR_HEAD.test(l) || STEPS_HEAD.test(l))) { out.push(`<h2>${esc(l.replace(/^[^A-Za-zÀ-ÿœŒ\d]+/, ''))}</h2>`); return }
    if (!ingrStarted && isIngredientLike(l)) { out.push('<h2>Ingrédients</h2>'); ingrStarted = true }
    else if (ingrStarted && !stepsStarted && isSentence(l) && i > 0) { out.push('<h2>Préparation</h2>'); stepsStarted = true }
    out.push(`<p>${esc(l)}</p>`)
  })
  return `<html><body>${out.join('\n')}</body></html>`
}

// Texte collé (message WhatsApp, légende, notes) → HTML minimal, pour que la
// même chaîne que les pages web le lise sans IA : la première ligne devient
// le titre, et les blocs Ingrédients / Préparation sont repérés ou déduits.

import { INGR_HEAD as PAGE_INGR_HEAD, STEPS_HEAD as PAGE_STEPS_HEAD } from './extract-html'

// Même règle que pour les pages (une seule définition), après les émojis de tête.
const INGR_HEAD = { test: (l: string) => PAGE_INGR_HEAD.test(l.replace(/^[^A-Za-zÀ-ÿœŒ\d]+/, '').trim()) }
// Texte sans titre : « La recette du pepe chicken » donne le nom.
const RECIPE_OF = /^la recette (?:du |de la |des |de l['’]|de |d['’])(.{3,60})$/i
const STEPS_HEAD = { test: (l: string) => PAGE_STEPS_HEAD.test(l.replace(/^[^A-Za-zÀ-ÿœŒ\d]+/, '').trim()) }
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
  // Pas de titre en tête (le texte commence par les ingrédients) : nom cherché
  // dans une ligne « La recette du … ».
  let titleDone = false
  if (INGR_HEAD.test(lines[0]) || isIngredientLike(lines[0])) {
    const named = lines.map(l => l.match(RECIPE_OF)?.[1]).find(Boolean)
    if (named) out.push(`<h1>${esc(named.charAt(0).toUpperCase() + named.slice(1))}</h1>`)
    titleDone = true
  }
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

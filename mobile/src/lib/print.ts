import { Platform } from 'react-native'
import * as Print from 'expo-print'
import { MEAL_LABEL, MEAL_TYPE_ORDER, type MealType } from '@/shared/meal-type'
import { agreementPct, isRejected } from '@/shared/survey-score'
import { DAY_OPTIONS, formatWeekRange } from '@/shared/week'
import type { ResultItem, SurveyResultsData } from '@/components/votes/VoteBits'

// Fiches à imprimer (équivalents de components/recipes/recipe-print-sheet.tsx et
// components/votes/fridge-print-sheet.tsx) : une page HTML confiée à la boîte
// d'impression du système, qui propose aussi l'enregistrement en PDF.

const CORAL = '#E66B43'
const BASE_CSS = `
* { box-sizing: border-box; -webkit-print-color-adjust: exact; print-color-adjust: exact; }
body { margin: 0; font-family: -apple-system, 'Segoe UI', Roboto, sans-serif; color: #1F3A2E; font-size: 10.5pt; }
h1, h2 { font-family: 'Montserrat', -apple-system, sans-serif; margin: 0; }
.eyebrow { font-size: 8.5pt; font-weight: 700; text-transform: uppercase; letter-spacing: .08em; color: ${CORAL}; margin: 0 0 4px; }
.muted { color: #5A6B60; }
.foot { margin-top: 18px; padding-top: 6px; border-top: 1px solid #E7D9C6; font-size: 8pt; color: #5A6B60; }
`
const STAR = `<svg width="11" height="11" viewBox="0 0 24 24" style="vertical-align:-1px;margin-right:2px"><polygon points="12 2 15.09 8.26 22 9.27 17 14.14 18.18 21.02 12 17.77 5.82 21.02 7 14.14 2 9.27 8.91 8.26 12 2" fill="#F7C24A" stroke="#C99520" stroke-width="1.5"/></svg>`
const dot = (c: string) => `<span style="display:inline-block;width:7px;height:7px;border-radius:50%;background:${c};margin-right:4px;vertical-align:1px"></span>`

const esc = (s: string) => s.replace(/&/g, '&amp;').replace(/</g, '&lt;').replace(/>/g, '&gt;').replace(/"/g, '&quot;')

function duration(min: number | null | undefined): string | null {
  if (!min) return null
  if (min < 60) return `${min} min`
  const h = Math.floor(min / 60), m = min % 60
  return m ? `${h} h ${String(m).padStart(2, '0')}` : `${h} h`
}

async function printHtml(html: string, orientation: 'portrait' | 'landscape') {
  // Web : expo-print imprimerait la page courante ; la fiche s'ouvre dans sa propre fenêtre.
  if (Platform.OS === 'web') {
    const w = window.open('', '_blank')
    if (!w) throw new Error('Fenêtre bloquée')
    w.document.write(html)
    w.document.close()
    w.onload = () => w.print()
    return
  }
  await Print.printAsync({ html, orientation: orientation === 'landscape' ? Print.Orientation.landscape : Print.Orientation.portrait })
}

export interface RecipeSheet {
  name: string; categoryName: string | null; difficulty: string | null; prepTime: number | null; cookTime: number | null
  servings: number; photoUrl: string | null; description: string | null
  ingredients: { id: string; name: string; qty: string }[]
  steps: { id: string; step_number: number; description: string }[]
  sides: string[]; drinks: string[]
}

const DIFFICULTY: Record<string, string> = { facile: 'Facile', moyen: 'Intermédiaire', difficile: 'Difficile' }

export async function printRecipe(p: RecipeSheet) {
  const total = (p.prepTime ?? 0) + (p.cookTime ?? 0)
  const metas = [
    p.prepTime ? ['Préparation', duration(p.prepTime)] : null,
    p.cookTime ? ['Cuisson', duration(p.cookTime)] : null,
    total ? ['Total', duration(total)] : null,
    ['Portions', `${p.servings} pers.`],
    p.difficulty ? ['Niveau', DIFFICULTY[p.difficulty] ?? p.difficulty] : null,
  ].filter((m): m is [string, string] => !!m)

  const html = `<!doctype html><html lang="fr"><head><meta charset="utf-8"><style>${BASE_CSS}
@page { size: A4 portrait; margin: 14mm; }
header { display: flex; justify-content: space-between; gap: 24px; border-bottom: 2px solid ${CORAL}; padding-bottom: 10px; margin-bottom: 18px; }
header h1 { font-size: 22pt; line-height: 1.15; }
.metas { display: flex; flex-wrap: wrap; gap: 4px 18px; margin-top: 6px; font-size: 9.5pt; }
.metas b { margin-left: 4px; }
header img { width: 46mm; height: 34mm; object-fit: cover; border-radius: 8px; flex-shrink: 0; }
.cols { display: grid; grid-template-columns: 36% 1fr; gap: 28px; }
h2 { font-size: 13pt; margin-bottom: 8px; }
ul { list-style: none; margin: 0; padding: 0; }
li.ing { display: flex; align-items: baseline; gap: 8px; border-bottom: 1px solid #E7D9C6; padding: 5px 0; }
.box { width: 11px; height: 11px; border: 1.5px solid #5A6B60; border-radius: 2px; flex-shrink: 0; position: relative; top: 2px; }
.qty { margin-left: auto; font-weight: 700; color: ${CORAL}; white-space: nowrap; }
ol { list-style: none; margin: 0; padding: 0; }
li.step { display: flex; gap: 10px; margin-bottom: 10px; break-inside: avoid; }
.num { width: 22px; height: 22px; border-radius: 50%; background: ${CORAL}; color: #fff; font-weight: 700; font-size: 10pt; display: flex; align-items: center; justify-content: center; flex-shrink: 0; }
.step p { margin: 2px 0 0; line-height: 1.5; }
.tip { margin-top: 22px; border: 1px solid #F7C24A; background: #FEF6E1; border-radius: 8px; padding: 10px 14px; break-inside: avoid; }
.tip p { margin: 0; font-style: italic; line-height: 1.5; color: #5A6B60; }
.pair { margin-top: 14px; font-size: 9.5pt; break-inside: avoid; }
.pair p { margin: 3px 0; }
</style></head><body>
<header><div>
  <p class="eyebrow">KeskonBouf · Carnet culinaire${p.categoryName ? ` · ${esc(p.categoryName)}` : ''}</p>
  <h1>${esc(p.name)}</h1>
  <div class="metas">${metas.map(([l, v]) => `<span><span class="muted">${l}</span><b>${esc(v)}</b></span>`).join('')}</div>
</div>${p.photoUrl ? `<img src="${esc(p.photoUrl)}" alt="">` : ''}</header>
<div class="cols">
  <section><h2>Ingrédients <span class="muted" style="font-size:9pt;font-weight:400">pour ${p.servings} pers.</span></h2>
    <ul>${p.ingredients.map(i => `<li class="ing"><span class="box"></span><span>${esc(i.name)}</span><span class="qty">${esc(i.qty)}</span></li>`).join('')}</ul></section>
  <section><h2>Préparation</h2>
    <ol>${p.steps.map(s => `<li class="step"><span class="num">${s.step_number}</span><p>${esc(s.description)}</p></li>`).join('')}</ol></section>
</div>
${p.description ? `<section class="tip"><p class="eyebrow" style="color:#7A5A0E">Astuces de Maman</p><p>« ${esc(p.description)} »</p></section>` : ''}
${p.sides.length || p.drinks.length ? `<section class="pair"><h2 style="font-size:11pt;margin-bottom:4px">Se marie bien avec</h2>
  ${p.sides.length ? `<p>${dot(CORAL)}${esc(p.sides.join(', '))}</p>` : ''}${p.drinks.length ? `<p>${dot('#4C7A5E')}${esc(p.drinks.join(', '))}</p>` : ''}</section>` : ''}
<p class="foot">Fiche imprimée depuis KeskonBouf</p>
</body></html>`
  await printHtml(html, 'portrait')
}

const MAX_COMMENTS = 6

function mealCell(item: ResultItem, favorite: boolean): string {
  const counts = { aime: item.aime, bof: item.bof, naime_pas: item.naime_pas }
  const pct = agreementPct(counts)
  const rejected = isRejected(counts)
  return `<div class="dish">${favorite ? STAR : ''}${esc(item.main_name ?? 'Repas non défini')}</div>`
    + (item.side_names.length ? `<div class="extra">${dot(CORAL)}${esc(item.side_names.join(', '))}</div>` : '')
    + (item.drink_name ? `<div class="extra">${dot('#4C7A5E')}${esc(item.drink_name)}</div>` : '')
    + (pct !== null ? `<div class="pct" style="color:${rejected ? '#C0392B' : '#4C7A5E'}">${rejected ? `À revoir · ${pct}% d'accord` : `${pct}% d'accord`}</div>` : '')
}

// Feuille « frigo » : le menu de la semaine avec l'avis de la famille, en A4 paysage.
export async function printFridgeSheet(data: SurveyResultsData, favoriteIds: string[]) {
  const monday = new Date(data.week_start + 'T00:00:00')
  const days = DAY_OPTIONS.map((d, idx) => { const dt = new Date(monday); dt.setDate(monday.getDate() + idx); return { ...d, date: dt.getDate() } })
    .filter(d => data.items.some(i => !i.applies_all_days && i.day_of_week === d.val))
  const types = (Object.keys(MEAL_TYPE_ORDER) as MealType[]).sort((a, b) => MEAL_TYPE_ORDER[a] - MEAL_TYPE_ORDER[b]).filter(t => data.items.some(i => i.meal_type === t))
  const comments = data.items.flatMap(i => i.comments.map(c => ({ ...c, recipe: i.main_name }))).slice(0, MAX_COMMENTS)
  const voters = Array.from(new Set(data.respondents.map(r => r.name.trim()).filter(Boolean)))

  const rows = types.map(type => {
    const template = data.items.find(i => i.meal_type === type && i.applies_all_days)
    const cells = template
      ? `<td colspan="${Math.max(days.length, 1)}"><span class="every">Tous les jours</span>${mealCell(template, favoriteIds.includes(template.id))}</td>`
      : days.map(d => {
        const item = data.items.find(i => i.meal_type === type && !i.applies_all_days && i.day_of_week === d.val)
        return `<td>${item ? mealCell(item, favoriteIds.includes(item.id)) : '<span class="muted">—</span>'}</td>`
      }).join('')
    return `<tr><th class="type">${MEAL_LABEL[type]}</th>${cells}</tr>`
  }).join('')

  const html = `<!doctype html><html lang="fr"><head><meta charset="utf-8"><style>${BASE_CSS}
@page { size: A4 landscape; margin: 10mm; }
header { display: flex; justify-content: space-between; align-items: flex-end; gap: 24px; border-bottom: 2px solid ${CORAL}; padding-bottom: 6px; margin-bottom: 10px; }
header h1 { font-size: 22pt; line-height: 1; }
.right { text-align: right; font-size: 9pt; line-height: 1.4; }
table { width: 100%; table-layout: fixed; border-collapse: collapse; font-size: 10pt; }
th, td { border: 1px solid #E7D9C6; padding: 5px 6px; vertical-align: top; }
thead th { background: #FDEEE8; font-family: 'Montserrat', sans-serif; font-size: 11pt; }
thead th:first-child { background: none; border: none; width: 28mm; }
th.type { background: #FFF7EE; text-align: left; font-family: 'Montserrat', sans-serif; font-size: 10.5pt; white-space: nowrap; }
tr { break-inside: avoid; }
.dish { font-weight: 700; line-height: 1.2; }
.extra { font-size: 8.5pt; color: #5A6B60; margin-top: 2px; }
.pct { font-size: 8.5pt; font-weight: 700; margin-top: 3px; }
.every { font-size: 8pt; font-weight: 700; text-transform: uppercase; color: #5A6B60; margin-right: 6px; }
.words { margin-top: 10px; border: 1px solid #E7D9C6; border-radius: 8px; padding: 6px 10px; break-inside: avoid; }
.words ul { margin: 0; padding: 0; list-style: none; display: grid; grid-template-columns: 1fr 1fr; gap: 3px 22px; font-size: 8.5pt; }
.legend { margin-top: 6px; font-size: 7.5pt; color: #5A6B60; }
</style></head><body>
<header><div><p class="eyebrow">KeskonBouf · Le menu de la famille</p><h1>Semaine du ${formatWeekRange(data.week_start)}</h1></div>
<div class="right">${data.global_score !== null ? `<p style="margin:0"><b style="color:${CORAL}">${data.global_score}% d'accord</b> · ${data.total_respondents} vote${data.total_respondents > 1 ? 's' : ''}</p>` : ''}
${voters.length ? `<p class="muted" style="margin:0">Ont voté : ${esc(voters.join(', '))}</p>` : ''}</div></header>
<table><thead><tr><th></th>${days.map(d => `<th>${d.full} <span class="muted" style="font-weight:400">${d.date}</span></th>`).join('')}</tr></thead><tbody>${rows}</tbody></table>
${comments.length ? `<section class="words"><h2 style="font-size:11pt;margin-bottom:4px">Les mots de la famille</h2><ul>${comments.map(c =>
    `<li><b>${esc(c.respondent_name)}</b>${c.recipe ? ` <span class="muted">(${esc(c.recipe)})</span>` : ''} : <i class="muted">« ${esc(c.comment)} »</i></li>`).join('')}</ul></section>` : ''}
<p class="legend">${STAR} plat favori &nbsp; ${dot(CORAL)}accompagnement &nbsp; ${dot('#4C7A5E')}boisson &nbsp;· % = part des avis J'adore + Ça passe</p>
</body></html>`
  await printHtml(html, 'landscape')
}

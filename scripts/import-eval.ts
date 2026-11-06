// Évaluation de l'import de recettes sur le jeu de test
// (tests/import-fixtures/*). Pour chaque cas : signaux de la page, sortie de
// l'import, comparaison champ par champ avec expected.json.
//
//   npm run import:eval                    → version actuelle (legacy)
//   npm run import:eval -- --version v2    → une autre version, quand elle existera
//   npm run import:eval -- --case 02       → un seul cas
//
// Écrit out-<version>.json dans chaque cas et tests/import-fixtures/RESULTS-<version>.md.
// Les cas sans page.html (pas encore téléchargés) sont signalés et ignorés.

import { existsSync, readdirSync, readFileSync, writeFileSync } from 'node:fs'
import { join } from 'node:path'
import { parseLegacy } from '../lib/import/legacy'
import { importFromHtml } from '../lib/import/pipeline'
import { pageSignals, type PageSignals } from '../lib/import/signals'

const ROOT = 'tests/import-fixtures'

// ── Forme commune des sorties ─────────────────────────────────
// Ce que l'utilisatrice verrait dans le formulaire de relecture.
interface OutIngredient { quantity: number | null; unit: string | null; name: string; optional: boolean }
interface OutStep { title: string | null; text: string }
interface ImportOutput {
  name: string
  servings: number | null
  prep_min: number | null
  cook_min: number | null
  difficulty: string | null
  ingredients: OutIngredient[]
  steps: OutStep[]
  tip: string | null
  description: string | null
}

interface Expected {
  statut: string
  page_type: string
  name: string
  servings: number | null
  prep_min: number | null
  cook_min: number | null
  difficulty: string | null
  ingredients: OutIngredient[]
  steps: { title: string | null; starts_with: string }[]
  tip: string | null
}

// ── Versions de l'import ──────────────────────────────────────
// legacy : la route actuelle + ce que font les formulaires web et mobile de sa
// réponse (ingrédient entier dans `name`, quantité et unité vides, une chaîne
// par étape). Le formulaire n'a qu'un champ `description`, affiché comme
// l'astuce de la recette : on le compte donc aussi comme astuce.
const VERSIONS: Record<string, (html: string, url: string) => ImportOutput> = {
  legacy(html) {
    const p = parseLegacy(html).partial as Record<string, unknown>
    const num = (v: unknown) => (typeof v === 'number' && Number.isFinite(v) ? v : null)
    const description = typeof p.description === 'string' && p.description.trim() ? p.description : null
    return {
      name: String(p.name ?? ''),
      servings: num(p.servings),
      prep_min: num(p.prep_time_min),
      cook_min: num(p.cook_time_min),
      difficulty: null,
      ingredients: ((p.ingredients as unknown[]) ?? []).map(i => ({ quantity: null, unit: null, name: String(i), optional: false })),
      steps: ((p.steps as unknown[]) ?? []).map(s => ({ title: null, text: String(s) })),
      tip: description,
      description,
    }
  },
  // v2 : pipeline lib/import (jour 2). Le champ description de l'app ne reçoit
  // que l'astuce explicite de l'auteur.
  v2(html, url) {
    const r = importFromHtml(html, url).recipe
    return {
      name: r.name,
      servings: r.servings,
      prep_min: r.prep_min,
      cook_min: r.cook_min,
      difficulty: r.difficulty,
      ingredients: r.ingredients,
      steps: r.steps.map(s => ({ title: null, text: s.text })),
      tip: r.tip,
      description: r.tip,
    }
  },
}

// ── Notation ──────────────────────────────────────────────────
const fold = (s: string) => s
  .toLowerCase()
  .normalize('NFD').replace(/[̀-ͯ]/g, '')
  .replace(/&#0?39;|&#x27;|[’']/g, "'")
  .replace(/œ/g, 'oe')
  .replace(/\s+/g, ' ')
  .trim()

const countScore = (got: number, want: number) => (want === 0 ? (got === 0 ? 1 : 0) : Math.max(0, 1 - Math.abs(got - want) / want))
const same = <T>(a: T, b: T) => (a === b ? 1 : 0)

// Ingrédient attendu retrouvé si l'un des noms contient l'autre.
function findIngredient(out: OutIngredient[], want: OutIngredient): OutIngredient | null {
  const w = fold(want.name)
  return out.find(o => { const n = fold(o.name); return n === w }) ??
    out.find(o => { const n = fold(o.name); return n.includes(w) || w.includes(n) }) ?? null
}

interface FieldScores {
  nom: number
  portions: number
  preparation: number
  cuisson: number
  difficulte: number
  nb_ingredients: number
  qte_unites: number
  nb_etapes: number
  etapes: number
  astuce: number
  description_propre: number
}

function score(out: ImportOutput, exp: Expected): FieldScores {
  const bare = (s: string) => fold(s).replace(/[,;:!?.()]/g, ' ').replace(/\s+/g, ' ').trim()
  const on = bare(out.name), en = bare(exp.name)
  const nom = on === en ? 1 : on && (on.includes(en) || en.includes(on)) ? 0.5 : 0

  const perIng = exp.ingredients.map(w => {
    const o = findIngredient(out.ingredients, w)
    if (!o) return 0
    // Nom retrouvé tel quel (pas noyé dans une chaîne « 500 g de … ») + quantité + unité.
    const cleanName = fold(o.name) === fold(w.name) ? 1 : 0
    return (cleanName + same(o.quantity, w.quantity) + same(o.unit ?? null, w.unit)) / 3
  })

  // Le nom d'une sous-recette peut précéder le texte (« Marinade du poulet : Une fois… »).
  const outSteps = out.steps.flatMap(s => { const t = fold(s.text); const m = t.match(/^[^:]{2,45} : (.+)$/); return m ? [t, m[1]] : [t] })
  const perStep = exp.steps.map(w => (outSteps.some(t => t.startsWith(fold(w.starts_with))) ? 1 : 0))

  const tipOut = out.tip ? fold(out.tip) : ''
  const astuce = exp.tip === null
    ? (tipOut ? 0 : 1)
    : (tipOut.includes(fold(exp.tip).slice(0, 40)) ? 1 : 0)

  // Fuite : la description reçoit des ingrédients, des étapes ou un bloc de texte brut.
  const desc = out.description ? fold(out.description) : ''
  const leakedIngredients = exp.ingredients.filter(i => fold(i.name).length > 3 && desc.includes(fold(i.name))).length
  const leakedSteps = exp.steps.filter(s => desc.includes(fold(s.starts_with))).length
  const description_propre = desc.length > 600 || leakedIngredients >= 2 || leakedSteps > 0 ? 0 : 1

  const mean = (xs: number[]) => (xs.length ? xs.reduce((a, b) => a + b, 0) / xs.length : 1)
  return {
    nom,
    portions: same(out.servings, exp.servings),
    preparation: same(out.prep_min, exp.prep_min),
    cuisson: same(out.cook_min, exp.cook_min),
    difficulte: same(out.difficulty, exp.difficulty),
    nb_ingredients: countScore(out.ingredients.length, exp.ingredients.length),
    qte_unites: mean(perIng),
    nb_etapes: countScore(out.steps.length, exp.steps.length),
    etapes: mean(perStep),
    astuce,
    description_propre,
  }
}

// ── Exécution ─────────────────────────────────────────────────
function arg(name: string): string | undefined {
  const i = process.argv.indexOf(`--${name}`)
  return i >= 0 ? process.argv[i + 1] : undefined
}

const pct = (x: number) => `${Math.round(x * 100)} %`

function signalsLabel(s: PageSignals): string {
  const bits = [
    s.jsonLdRecipe ? 'JSON-LD Recipe' : s.jsonLdBlocks ? `JSON-LD (${s.jsonLdTypes.slice(0, 3).join(', ')})` : 'aucun JSON-LD',
    s.microdataRecipe ? 'microdonnées' : '',
    s.plugins.length ? `extension : ${s.plugins.join(', ')}` : '',
  ]
  return bits.filter(Boolean).join(' · ')
}

function main() {
  const version = arg('version') ?? 'legacy'
  const only = arg('case')
  const run = VERSIONS[version]
  if (!run) {
    console.error(`Version inconnue : ${version} (disponibles : ${Object.keys(VERSIONS).join(', ')})`)
    process.exit(1)
  }

  const rows: string[] = []
  const totals: number[] = []
  const cases = readdirSync(ROOT, { withFileTypes: true })
    .filter(d => d.isDirectory() && (!only || d.name.startsWith(only)))
    .map(d => d.name)
    .sort()

  for (const name of cases) {
    const dir = join(ROOT, name)
    const pagePath = join(dir, 'page.html')
    const expPath = join(dir, 'expected.json')
    const fetchInfo = existsSync(join(dir, 'fetch.json')) ? JSON.parse(readFileSync(join(dir, 'fetch.json'), 'utf8')) : null
    const http = fetchInfo ? (fetchInfo.error ?? String(fetchInfo.status)) : '?'
    if (!existsSync(pagePath)) {
      console.log(`${name} : pas de page.html (npm run import:fetch -- ${name.slice(0, 2)})`)
      rows.push(`| ${name} | ${http} | — | — | page non téléchargée |`)
      continue
    }

    const html = readFileSync(pagePath, 'utf8')
    const signals = pageSignals(html)
    const url = readFileSync(join(dir, 'url.txt'), 'utf8').trim()
    const out = run(html, url)
    writeFileSync(join(dir, `out-${version}.json`), JSON.stringify(out, null, 2) + '\n')

    if (!existsSync(expPath)) {
      rows.push(`| ${name} | ${http} | ${signalsLabel(signals)} | — | pas d'expected.json |`)
      continue
    }
    const exp = JSON.parse(readFileSync(expPath, 'utf8')) as Expected
    const s = score(out, exp)
    const values = Object.values(s)
    const total = values.reduce((a, b) => a + b, 0) / values.length
    totals.push(total)
    const weak = Object.entries(s).filter(([, v]) => v < 1).map(([k, v]) => `${k} ${pct(v)}`).join(', ')
    rows.push(`| ${name} | ${http} | ${signalsLabel(signals)} | **${pct(total)}** | ${weak || '—'} |`)

    console.log(`\n${name} — ${pct(total)}${exp.statut === 'brouillon' ? '  (expected.json non validé)' : ''}`)
    for (const [k, v] of Object.entries(s)) console.log(`  ${k.padEnd(20)} ${pct(v)}`)
  }

  const mean = totals.length ? totals.reduce((a, b) => a + b, 0) / totals.length : 0
  const md = [
    `# Résultats de l'import — version \`${version}\``,
    '',
    `Généré par \`npm run import:eval -- --version ${version}\` le ${new Date().toISOString().slice(0, 10)}.`,
    '',
    '| Cas | HTTP | Données de la page | Score | Champs en défaut |',
    '|---|---|---|---|---|',
    ...rows,
    '',
    `**Score moyen : ${pct(mean)}** sur ${totals.length} cas notés.`,
    '',
  ].join('\n')
  if (!only) writeFileSync(join(ROOT, `RESULTS-${version}.md`), md)
  console.log(`\nScore moyen (${version}) : ${pct(mean)} sur ${totals.length} cas`)
}

main()

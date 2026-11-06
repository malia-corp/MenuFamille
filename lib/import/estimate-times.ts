// Estimation des temps à partir des étapes, quand la page ne donne pas la
// préparation et la cuisson séparément (cas 08 : « Durée : 2 heures (+ 2 heures
// au frais) »). Les durées d'une étape de cuisson s'additionnent en cuisson,
// celles d'une étape de repos en repos. La préparation se déduit de la durée
// totale quand elle est connue. Toujours présenté comme une ESTIMATION à
// vérifier sur l'écran de relecture.

// Durée dans une phrase : « 12 minutes », « 10 à 15 minutes », « 1h15 », « 2 à 3 heures ».
const DURATION = /(\d+(?:[.,]\d+)?)\s*(?:(?:à|-|–|ou)\s*\d+(?:[.,]\d+)?\s*)?(h(?:eures?)?|hrs?|min(?:utes?)?|mn)\b(?:\s*(\d{1,2})\b)?/gi

const REST = /\b(r[ée]frig[ée]rateur|frigo|au frais|repos(?:er)?|laisser reposer|mariner|marinade|mac[ée]rer|pousser|lever|congélateur|prendre)\b/i
const COOK = /\b(cui(?:re|sson|t|ts|te|tes|sez)|enfourn\w*|four\b|mijot\w*|fr[ée]miss\w*|bouill\w*|[ée]bullition|fri(?:re|ture|ts)|griller|grill[ée]\w*|r[ôo]tir|dorer|braiser|caram[ée]lis\w*|r[ée]duire|vapeur|po[êe]l\w*|saisir|rissoler|confire|sauter)\b/i

function minutesOf(m: RegExpExecArray): number {
  const n = Number(m[1].replace(',', '.'))
  const unit = m[2].toLowerCase()
  if (unit.startsWith('h')) return Math.round(n * 60 + Number(m[3] ?? 0))
  return Math.round(n)
}

export interface TimeEstimate {
  cook_min: number | null
  rest_min: number | null
}

export function estimateFromSteps(steps: string[]): TimeEstimate {
  let cook = 0
  let rest = 0
  for (const step of steps) {
    // Une phrase à la fois : « Enfourner… 12 minutes. Laisser refroidir 1 h » ne mélange pas les deux.
    for (const sentence of step.split(/(?<=[.!?;])\s+/)) {
      const isRest = REST.test(sentence)
      const isCook = !isRest && COOK.test(sentence)
      if (!isRest && !isCook) continue
      DURATION.lastIndex = 0
      let m: RegExpExecArray | null
      let found = 0
      while ((m = DURATION.exec(sentence))) found += minutesOf(m)
      // « 5 min de chaque côté » : on ne double pas (estimation basse, à vérifier).
      if (isRest) rest += found
      else cook += found
    }
  }
  return { cook_min: cook || null, rest_min: rest || null }
}

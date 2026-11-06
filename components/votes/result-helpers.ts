import { MEAL_TYPE_ORDER } from '@/lib/constants/meal-type'
import { DAY_OPTIONS, type DayOfWeek } from '@/lib/utils/week'
import type { ResultItem } from './types'

export const TEMPLATE_KEY = 'semaine'
export const DAY_INDEX = Object.fromEntries(DAY_OPTIONS.map((d, i) => [d.val, i])) as Record<DayOfWeek, number>

export function dayLabelOf(item: ResultItem): string {
  return item.applies_all_days ? 'Toute la semaine' : (DAY_OPTIONS[DAY_INDEX[item.day_of_week]]?.full ?? item.day_of_week)
}

// Ordre chronologique : "toute la semaine" d'abord, puis jour, puis type de repas.
export function chronoCompare(a: ResultItem, b: ResultItem): number {
  if (a.applies_all_days !== b.applies_all_days) return a.applies_all_days ? -1 : 1
  return (DAY_INDEX[a.day_of_week] - DAY_INDEX[b.day_of_week]) || (MEAL_TYPE_ORDER[a.meal_type] - MEAL_TYPE_ORDER[b.meal_type])
}

export function countsOf(i: ResultItem) {
  return { aime: i.aime, bof: i.bof, naime_pas: i.naime_pas }
}

export function harmonyOf(score: number | null): { label: string; color: string } {
  if (score === null) return { label: 'En attente des votes', color: 'var(--kkb-text-tertiary)' }
  if (score >= 80)    return { label: 'Excellente harmonie', color: 'var(--kkb-success)' }
  if (score >= 60)    return { label: 'Bonne entente', color: 'var(--kkb-teal)' }
  return { label: 'Avis partagés', color: 'var(--kkb-warning)' }
}

// Pastille d'accord d'un repas : vert au-delà de 80 %, jaune au-delà de 50 %,
// orange en dessous (couleurs de texte de la matrice WCAG).
export function agreementTone(pct: number | null): { bg: string; text: string } {
  if (pct === null) return { bg: 'var(--kkb-lin)', text: 'var(--kkb-texte-2)' }
  if (pct >= 80)    return { bg: 'var(--kkb-sauge-50)', text: 'var(--kkb-foret-500)' }
  if (pct >= 50)    return { bg: 'var(--kkb-jaune-50)', text: 'var(--kkb-jaune-text)' }
  return { bg: 'var(--kkb-orange-50)', text: 'var(--kkb-orange-text)' }
}

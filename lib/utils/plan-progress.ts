import { DAY_OPTIONS, type DayOfWeek } from '@/lib/utils/week'
import type { MealType } from '@/lib/constants/meal-type'

export interface ProgressConfig {
  meal_type: MealType
  mode:      'daily' | 'template'
}

export interface ProgressItem {
  meal_type:        MealType
  day_of_week:      DayOfWeek
  applies_all_days: boolean
}

// Un type "modele semaine" compte 1 seule fois dans le total (meme recette
// tous les jours), un type "quotidien" compte une fois par jour (7) — meme
// convention que le compteur global deja utilise sur /plan/validate.
export function countFilledSlots(configs: ProgressConfig[], items: ProgressItem[]): { filled: number; total: number } {
  let filled = 0
  let total = 0
  for (const config of configs) {
    if (config.mode === 'template') {
      total += 1
      if (items.some(i => i.meal_type === config.meal_type && i.applies_all_days)) filled += 1
    } else {
      total += 7
      for (const d of DAY_OPTIONS) {
        if (items.some(i => i.meal_type === config.meal_type && i.day_of_week === d.val && !i.applies_all_days)) filled += 1
      }
    }
  }
  return { filled, total }
}

// Un jour est "complet" si chaque type de repas actif y a une recette —
// un type "modele semaine" compte pour tous les jours des qu'il a sa seule
// recette (meme repas chaque jour).
export function isDayComplete(configs: ProgressConfig[], items: ProgressItem[], day: DayOfWeek): boolean {
  if (configs.length === 0) return false
  return configs.every(config =>
    config.mode === 'template'
      ? items.some(i => i.meal_type === config.meal_type && i.applies_all_days)
      : items.some(i => i.meal_type === config.meal_type && i.day_of_week === day && !i.applies_all_days)
  )
}

// Nombre de types de repas actifs qui ont une recette pour ce jour (pour
// l'affichage "2/4" sur un tab jour partiellement rempli).
export function dayFilledCount(configs: ProgressConfig[], items: ProgressItem[], day: DayOfWeek): number {
  return configs.filter(config =>
    config.mode === 'template'
      ? items.some(i => i.meal_type === config.meal_type && i.applies_all_days)
      : items.some(i => i.meal_type === config.meal_type && i.day_of_week === day && !i.applies_all_days)
  ).length
}

// Meme calcul que countFilledSlots mais groupe par type de repas plutot
// qu'agrege — pour la sidebar "Statut par service" (desktop vue-jour), qui
// affiche une barre par type de repas sur toute la semaine.
export function countFilledByMealType(
  configs: ProgressConfig[], items: ProgressItem[]
): Record<MealType, { filled: number; total: number }> {
  const result = {} as Record<MealType, { filled: number; total: number }>
  for (const config of configs) {
    if (config.mode === 'template') {
      result[config.meal_type] = {
        total: 1,
        filled: items.some(i => i.meal_type === config.meal_type && i.applies_all_days) ? 1 : 0,
      }
    } else {
      const filled = DAY_OPTIONS.filter(d =>
        items.some(i => i.meal_type === config.meal_type && i.day_of_week === d.val && !i.applies_all_days)
      ).length
      result[config.meal_type] = { total: 7, filled }
    }
  }
  return result
}

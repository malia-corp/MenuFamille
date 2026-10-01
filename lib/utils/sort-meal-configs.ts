import { MEAL_TYPE_ORDER, type MealType } from '@/lib/constants/meal-type'

// Trie par ordre chronologique de repas (petit-dej, dej, gouter, diner),
// jamais par le display_order de user_meal_config (cf. meal-type.ts).
export function sortByMealType<T extends { meal_type: MealType }>(items: T[]): T[] {
  return [...items].sort((a, b) => MEAL_TYPE_ORDER[a.meal_type] - MEAL_TYPE_ORDER[b.meal_type])
}

import type { MealType } from '@/lib/constants/meal-type'
import { MEAL_ICON } from '@/lib/constants/meal-type-icon'

export function MealTypeIcon({ type, className }: { type: MealType; className?: string }) {
  const Icon = MEAL_ICON[type]
  return <Icon className={className} />
}

import { Coffee, Cookie, Moon, UtensilsCrossed, type LucideIcon } from 'lucide-react'
import type { MealType } from './meal-type'

export const MEAL_ICON: Record<MealType, LucideIcon> = {
  petit_dejeuner: Coffee,
  dejeuner:       UtensilsCrossed,
  gouter:         Cookie,
  diner:          Moon,
}

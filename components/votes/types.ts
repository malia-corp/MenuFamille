import type { MealType } from '@/lib/constants/meal-type'
import type { DayOfWeek } from '@/lib/utils/week'

export interface ResultComment {
  respondent_name: string
  comment:         string
  created_at:      string
}

export interface ResultItem {
  id:               string
  meal_type:        MealType
  day_of_week:      DayOfWeek
  applies_all_days: boolean
  recipe_name:      string | null
  photo_url:        string | null
  description:      string | null
  side_names:       string[]
  drink_name:       string | null
  aime:             number
  bof:              number
  naime_pas:        number
  comments:         ResultComment[]
}

export interface SurveyResultsData {
  global_score:      number | null
  total_respondents: number
  week_start:        string
  member_count:      number
  respondents:       { name: string; voted_at: string }[]
  share_token:       string | null
  items:             ResultItem[]
}

export interface RecipeCategory {
  id:    string
  name:  string
  slug:  string
  icon:  string | null
  color: string | null
}

export interface RecipeListItem {
  id:              string
  name:            string
  description:     string | null
  prep_time_min:   number | null
  cook_time_min:   number | null
  servings:        number
  difficulty:      'facile' | 'moyen' | 'difficile' | null
  photo_url:       string | null
  visibility:      string
  is_favorited:    boolean
  foyer_favorites: number
  total_time_min:  number | null
  origin:          'mes' | 'famille' | 'communaute'
  categories:      RecipeCategory | null
}

export type RecipeOrigin = 'all' | 'famille' | 'communaute' | 'mes' | 'favoris'
export type RecipeSort = 'recent' | 'planned' | 'fastest' | 'alpha'

export interface RecipePage {
  items:      RecipeListItem[]
  total:      number
  page:       number
  page_size:  number
  page_count: number
  counts:     Record<RecipeOrigin, number>
}

export function formatDuration(min: number | null | undefined): string | null {
  if (!min) return null
  if (min < 60) return `${min} min`
  const h = Math.floor(min / 60)
  const m = min % 60
  return m ? `${h} h ${String(m).padStart(2, '0')}` : `${h} h`
}

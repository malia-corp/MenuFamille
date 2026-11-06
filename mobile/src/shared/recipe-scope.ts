export type RecipeScope = 'all' | 'mes' | 'famille' | 'communaute'

export const SCOPE_OPTIONS: { val: RecipeScope; label: string }[] = [
  { val: 'all',        label: 'Tout'         },
  { val: 'mes',        label: 'Mes recettes' },
  { val: 'famille',    label: 'Famille'      },
  { val: 'communaute', label: 'Communauté'   },
]

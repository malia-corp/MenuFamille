// Contrat de l'import de recettes v2 (cf. docs/import-recettes.md).
// Un import ne crée rien : il propose une fiche que l'utilisatrice relit.

export type Difficulty = 'facile' | 'moyen' | 'difficile'

export interface ImportedIngredient {
  quantity: number | null   // null : « au goût », « Q.S. » ou absent
  unit: string | null       // unité canonique (cf. normalize.ts), null si l'ingrédient se compte
  name: string              // sans quantité ni unité ; précisions gardées (« ail (haché) »)
  optional: boolean
}

export interface ImportedStep {
  text: string              // le nom d'une sous-recette passe en tête (« Poires pochées : … »)
}

export interface ImportedRecipe {
  name: string
  servings: number | null   // null = à saisir à la relecture, jamais de valeur par défaut
  prep_min: number | null   // repos compris (décision du 28/10)
  cook_min: number | null
  rest_min: number | null   // repos seul, gardé pour les futurs rappels « la veille »
  total_min: number | null  // durée totale annoncée par la page, quand elle seule est connue
  difficulty: Difficulty | null
  category_hint: string | null  // slug de catégorie de l'app proposé (plat-principal, dessert…)
  ingredients: ImportedIngredient[]
  steps: ImportedStep[]
  tip: string | null        // seulement un conseil explicite de l'auteur → champ description de l'app
  photo_url: string | null  // https public uniquement
}

export type ImportStatus = 'complete' | 'partial' | 'failed'

// D'où vient chaque champ, pour l'écran de relecture et le diagnostic.
export type SourceType = 'json_ld' | 'microdata' | 'html' | 'llm' | 'text'

export type PageType = 'single_recipe' | 'multi_recipe_roundup' | 'not_a_recipe'

export type WarningCode =
  | 'servings_missing' | 'servings_range' | 'servings_pieces'
  | 'times_total_only' | 'times_estimated' | 'rest_added_to_prep'
  | 'difficulty_missing'
  | 'ingredients_missing' | 'steps_missing'
  | 'roundup_main_recipe'
  | 'name_from_title' | 'name_missing'
  | 'llm_used' | 'llm_low_confidence'
  | 'paste_suggested' | 'transcript_detected' | 'text_unstructured'

export interface ImportWarning {
  code: WarningCode
  message: string           // en français, prêt à afficher
}

export interface ImportResult {
  status: ImportStatus
  page_type: PageType
  source_type: SourceType[] // dans l'ordre où les sources ont contribué
  recipe: ImportedRecipe
  warnings: ImportWarning[]
  raw_notes: string[]       // texte non classé (suggestions de service, accords, variantes…)
}

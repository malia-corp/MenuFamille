export type MealType = 'petit_dejeuner' | 'dejeuner' | 'gouter' | 'diner'

// Ordre chronologique canonique — a utiliser pour tout tri/affichage de
// repas, plutot que le champ display_order de user_meal_config (reglable en
// base mais sans UI de reordonnancement ; ses valeurs par defaut ne sont pas
// chronologiques). Voir lib/utils/sort-meal-configs.ts.
export const MEAL_TYPE_ORDER: Record<MealType, number> = {
  petit_dejeuner: 0,
  dejeuner:       1,
  gouter:         2,
  diner:          3,
}

export const MEAL_LABEL: Record<MealType, string> = {
  petit_dejeuner: 'Petit-déj.',
  dejeuner:       'Déjeuner',
  gouter:         'Goûter',
  diner:          'Dîner',
}

// Emojis en echappements unicode : les caracteres emoji litteraux ne sont pas
// acceptes par la plateforme de deploiement.
export const MEAL_EMOJI: Record<MealType, string> = {
  petit_dejeuner: '\u2615',     // tasse
  dejeuner:       '\u{1F37D}',  // assiette et couverts
  gouter:         '\u{1F34E}',  // pomme
  diner:          '\u{1F319}',  // croissant de lune
}

// Couleurs badge type de repas — palette KeskonBouf (hex litteral partout,
// pas de var() : certains appelants composent une bordure en derivant une
// transparence de la couleur, ex. `${color}30`, qui ne fonctionne qu'avec
// un hex).
export const MEAL_COLOR: Record<MealType, { text: string; bg: string }> = {
  petit_dejeuner: { text: '#B07A12', bg: '#FEF3E0' },
  dejeuner:       { text: '#F2664A', bg: '#FBE9E3' },
  gouter:         { text: '#2A7D4F', bg: '#EAF5EE' },
  diner:          { text: '#3A2E28', bg: '#F3ECE2' },
}

// Config de repas par defaut pour un nouveau compte — ordre chronologique
// (petit-dej, dej, gouter, diner), pas l'ordre d'activation. Utilise par
// les 3 points de creation de compte (email OTP, lien magique, premier
// GET sans config existante) pour eviter 3 copies divergentes.
export const DEFAULT_MEAL_CONFIGS = [
  { meal_type: 'petit_dejeuner' as const, is_active: false, mode: 'template' as const, display_order: 1, default_time: '07:00' },
  { meal_type: 'dejeuner'       as const, is_active: true,  mode: 'daily'    as const, display_order: 2, default_time: '12:00' },
  { meal_type: 'gouter'         as const, is_active: false, mode: 'template' as const, display_order: 3, default_time: '16:00' },
  { meal_type: 'diner'          as const, is_active: true,  mode: 'daily'    as const, display_order: 4, default_time: '19:00' },
]

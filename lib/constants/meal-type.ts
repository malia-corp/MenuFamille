export type MealType = 'petit_dejeuner' | 'dejeuner' | 'gouter' | 'diner'

export const MEAL_LABEL: Record<MealType, string> = {
  petit_dejeuner: 'Petit-déj.',
  dejeuner:       'Déjeuner',
  gouter:         'Goûter',
  diner:          'Dîner',
}

export const MEAL_EMOJI: Record<MealType, string> = {
  petit_dejeuner: '☕',
  dejeuner:       '🍽',
  gouter:         '🍎',
  diner:          '🌙',
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

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

// Couleurs badge type de repas — palette KeskonBouf.
export const MEAL_COLOR: Record<MealType, { text: string; bg: string }> = {
  petit_dejeuner: { text: '#B07A12',              bg: '#FEF3E0' },
  dejeuner:       { text: 'var(--kkb-coral)',      bg: 'var(--kkb-coral-light)' },
  gouter:         { text: 'var(--kkb-success)',    bg: 'var(--kkb-success-light)' },
  diner:          { text: '#3A2E28',              bg: '#F3ECE2' },
}

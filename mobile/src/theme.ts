// Jetons du guide de marque v1.0, repris de app/globals.css (version web).

export const C = {
  foret:     '#294E3B', // maîtresse : titres, liens, fonds de marque
  profond:   '#1F3A2E', // encre : texte courant
  orange:    '#E66B43', // action : un bouton orange par vue
  orange700: '#B84A27',
  jaune:     '#F7C24A',
  sauge:     '#8CBF96',
  creme:     '#FFF7EE', // fond par défaut
  carte:     '#FFFFFF',
  texte2:    '#5A6B60',
  filet:     '#E7D9C6',
  lin:       '#F5EADB',

  foret50:  '#EEF3EF', foret100: '#D6E3D9', foret300: '#8FAE98', foret500: '#4C7A5E', foret900: '#1F3A2E',
  orange50: '#FDEEE8', orange100: '#FAD5C6', orange300: '#F09A7A', orange900: '#7E3018',
  jaune50:  '#FEF6E1', jaune100: '#FCEBBF', jaune300: '#FADB8F', jaune700: '#C99520', jaune900: '#7A5A0E',
  sauge50:  '#EFF6F0', sauge300: '#B8D9BE',

  jauneText:  '#7A5A0E',
  orangeText: '#B84A27',
  danger:      '#C0392B',
  dangerLight: '#FCEBEB',

  // Transparences de blanc sur le vert forêt
  white10: 'rgba(255,255,255,0.10)',
  white15: 'rgba(255,255,255,0.15)',
  white20: 'rgba(255,255,255,0.20)',
  white25: 'rgba(255,255,255,0.25)',
} as const

export const R = { sm: 8, md: 14, lg: 20, xl: 24, pill: 999 } as const

// Polices chargées dans app/_layout.tsx (titres Montserrat, texte Quicksand,
// accent Bricolage Grotesque une fois par écran).
export const F = {
  title:      'Montserrat_800ExtraBold',
  titleBold:  'Montserrat_700Bold',
  titleBlack: 'Montserrat_900Black',
  body:       'Quicksand_400Regular',
  bodyMedium: 'Quicksand_500Medium',
  bodySemi:   'Quicksand_600SemiBold',
  bodyBold:   'Quicksand_700Bold',
  signature:  'BricolageGrotesque_600SemiBold',
} as const

export const SHADOW = {
  sheet: { shadowColor: '#1F3A2E', shadowOpacity: 0.14, shadowRadius: 16, shadowOffset: { width: 0, height: -6 }, elevation: 12 },
  float: { shadowColor: '#1F3A2E', shadowOpacity: 0.18, shadowRadius: 16, shadowOffset: { width: 0, height: 8 }, elevation: 10 },
  fab:   { shadowColor: '#E66B43', shadowOpacity: 0.35, shadowRadius: 12, shadowOffset: { width: 0, height: 4 }, elevation: 8 },
} as const

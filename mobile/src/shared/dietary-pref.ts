import { AlertTriangle, Heart, ThumbsDown, type LucideIcon } from 'lucide-react-native'

// Préférences alimentaires d'un membre (table member_dietary_prefs) —
// partagé entre le cercle familial et les paramètres.
export type PrefType = 'allergy' | 'dislike' | 'preference' | 'favorite'
export type Severity = 'strict' | 'light'

export interface Pref {
  id:        string
  pref_type: PrefType
  value:     string
  severity:  Severity | null
}

export const PREF_TYPE_OPTIONS: { value: PrefType; label: string }[] = [
  { value: 'allergy',    label: 'Allergie'    },
  { value: 'dislike',    label: 'N\'aime pas' },
  { value: 'preference', label: 'Préfère'     },
  { value: 'favorite',   label: 'Coup de cœur' },
]

// Couleurs d'une puce de préférence (fond, texte, bordure), comme sur le web.
export function prefChipStyle(pref: Pref): { bg: string; fg: string; border: string; Icon: LucideIcon | null } {
  if (pref.pref_type === 'allergy') {
    return pref.severity === 'strict'
      ? { bg: '#FCEBEB', fg: '#C0392B', border: '#C0392B', Icon: AlertTriangle }
      : { bg: '#FEF6E1', fg: '#5A6B60', border: '#F7C24A', Icon: AlertTriangle }
  }
  if (pref.pref_type === 'dislike')  return { bg: '#FFF7EE', fg: '#5A6B60', border: '#E7D9C6', Icon: ThumbsDown }
  if (pref.pref_type === 'favorite') return { bg: '#EFF6F0', fg: '#4C7A5E', border: '#4C7A5E', Icon: Heart }
  return { bg: '#FFF7EE', fg: '#5A6B60', border: '#E7D9C6', Icon: null }
}

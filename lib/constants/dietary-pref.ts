import { AlertTriangle, Heart, ThumbsDown, type LucideIcon } from 'lucide-react'

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

export function prefChipStyle(pref: Pref): { className: string; Icon: LucideIcon | null } {
  if (pref.pref_type === 'allergy') {
    return pref.severity === 'strict'
      ? { className: 'bg-red-50 text-red-700 border-red-200', Icon: AlertTriangle }
      : { className: 'bg-orange-50 text-orange-700 border-orange-200', Icon: AlertTriangle }
  }
  if (pref.pref_type === 'dislike')  return { className: 'bg-gray-100 text-gray-600 border-gray-200', Icon: ThumbsDown }
  if (pref.pref_type === 'favorite') return { className: 'bg-emerald-50 text-emerald-700 border-emerald-200', Icon: Heart }
  return { className: 'bg-[var(--kkb-bg)] text-[var(--kkb-text-secondary)] border-[var(--kkb-border)]', Icon: null }
}

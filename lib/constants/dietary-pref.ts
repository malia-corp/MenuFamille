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
      ? { className: 'bg-[var(--kkb-danger-light)] text-[var(--kkb-danger)] border-[var(--kkb-danger)]', Icon: AlertTriangle }
      : { className: 'bg-[var(--kkb-warning-light)] text-[var(--kkb-text-secondary)] border-[var(--kkb-warning)]', Icon: AlertTriangle }
  }
  if (pref.pref_type === 'dislike')  return { className: 'bg-[var(--kkb-bg)] text-[var(--kkb-text-secondary)] border-[var(--kkb-border)]', Icon: ThumbsDown }
  if (pref.pref_type === 'favorite') return { className: 'bg-[var(--kkb-success-light)] text-[var(--kkb-success)] border-[var(--kkb-success)]', Icon: Heart }
  return { className: 'bg-[var(--kkb-bg)] text-[var(--kkb-text-secondary)] border-[var(--kkb-border)]', Icon: null }
}

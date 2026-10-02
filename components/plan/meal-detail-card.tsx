'use client'

import { Clock, Loader2, Lock, LockOpen, Pencil, Plus } from 'lucide-react'
import { CompositionChipsRow } from '@/components/plan/composition-chips-row'

export interface CompositionChip {
  id:        string
  recipeId:  string
  name:      string
}

interface PlanRecipeLike {
  id:            string
  name:          string
  photo_url:     string | null
  prep_time_min: number | null
}

interface MealDetailCardProps {
  eyebrow:      string // "☕ PETIT-DÉJEUNER · 07H00"
  emptyLabel:   string // "petit-déjeuner" — pour "+ Ajouter un petit-déjeuner"
  recipe:       PlanRecipeLike | null
  sideChips:    CompositionChip[]
  drinkChip:    CompositionChip | null
  servings:     number
  isLocked:     boolean
  locking:      boolean
  onToggleLock: () => void
  onEdit:       () => void
  dimmed?:      boolean
  expanded?:    React.ReactNode
}

export function MealDetailCard({
  eyebrow, emptyLabel, recipe, sideChips, drinkChip, servings,
  isLocked, locking, onToggleLock, onEdit, dimmed, expanded,
}: MealDetailCardProps) {
  if (expanded) {
    return <div className="mx-4">{expanded}</div>
  }

  return (
    <div className={`mx-4 bg-white border border-[var(--kkb-border)] rounded-[var(--kkb-radius-card)] overflow-hidden transition-opacity ${dimmed ? 'opacity-40' : ''}`}>
      {recipe ? (
        <div className="flex items-stretch">
          <div className="relative w-1/3 shrink-0 min-h-[116px] bg-[var(--kkb-coral-light)]">
            {recipe.photo_url ? (
              // eslint-disable-next-line @next/next/no-img-element
              <img src={recipe.photo_url} alt={recipe.name} className="absolute inset-0 h-full w-full object-cover" />
            ) : (
              <div className="absolute inset-0 flex items-center justify-center text-3xl">🍴</div>
            )}
          </div>

          <div className="min-w-0 flex-1 p-3 flex flex-col justify-between">
            <div>
              <p className="text-[10px] font-quicksand font-bold uppercase text-[var(--kkb-coral)] tracking-wide truncate">
                {eyebrow}
              </p>
              <p className="font-dosis font-bold text-[15px] text-[var(--kkb-text-primary)] leading-tight truncate">
                {recipe.name}
              </p>

              {(sideChips.length > 0 || drinkChip) && (
                <div className="mt-1">
                  <CompositionChipsRow sides={sideChips} drink={drinkChip} />
                </div>
              )}
            </div>

            <div className="flex items-center justify-between gap-2 mt-1.5">
              <div className="flex items-center gap-2 min-w-0">
                {recipe.prep_time_min && (
                  <span className="flex items-center gap-0.5 text-[11px] font-quicksand text-[var(--kkb-text-secondary)] shrink-0">
                    <Clock className="h-3 w-3" /> {recipe.prep_time_min} min
                  </span>
                )}
                <span className="text-[11px] font-quicksand text-[var(--kkb-text-secondary)] shrink-0">
                  · {servings} pers.
                </span>
              </div>

              <div className="flex items-center gap-1.5 shrink-0">
                <button
                  type="button"
                  onClick={onToggleLock}
                  disabled={locking}
                  aria-label={isLocked ? 'Déverrouiller ce repas' : 'Verrouiller ce repas'}
                  title={isLocked ? 'Déverrouiller ce repas' : 'Verrouiller ce repas'}
                  className={`h-7 w-7 rounded-lg flex items-center justify-center border transition-colors disabled:opacity-40 ${
                    isLocked
                      ? 'bg-[var(--kkb-teal)] border-[var(--kkb-teal)] text-white'
                      : 'bg-[var(--kkb-bg)] border-[var(--kkb-border)] text-[var(--kkb-text-tertiary)] hover:text-[var(--kkb-teal)]'
                  }`}
                >
                  {locking ? <Loader2 className="h-3.5 w-3.5 animate-spin" /> : isLocked ? <Lock className="h-3.5 w-3.5" /> : <LockOpen className="h-3.5 w-3.5" />}
                </button>
                <button
                  type="button"
                  onClick={onEdit}
                  aria-label="Modifier le repas"
                  title="Modifier le repas"
                  className="h-7 w-7 rounded-lg flex items-center justify-center border border-[var(--kkb-border)] bg-[var(--kkb-bg)] text-[var(--kkb-text-tertiary)] hover:text-[var(--kkb-coral)] transition-colors"
                >
                  <Pencil className="h-3.5 w-3.5" />
                </button>
              </div>
            </div>
          </div>
        </div>
      ) : (
        <button
          type="button"
          onClick={onEdit}
          className="w-full flex flex-col items-center justify-center gap-2 p-4 text-center border-2 border-dashed border-[var(--kkb-border)] rounded-[var(--kkb-radius-card)]"
        >
          <p className="text-[10px] font-quicksand font-bold uppercase text-[var(--kkb-text-tertiary)] tracking-wide">
            {eyebrow}
          </p>
          <span className="inline-block bg-[var(--kkb-bg)] text-[var(--kkb-text-tertiary)] rounded-full px-2 py-0.5 text-[10px] font-quicksand font-semibold">
            Non planifié
          </span>
          <span className="flex items-center gap-1 text-sm font-quicksand font-semibold text-[var(--kkb-coral)]">
            <Plus className="h-4 w-4" /> Ajouter un {emptyLabel}
          </span>
        </button>
      )}
    </div>
  )
}

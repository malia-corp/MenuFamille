'use client'

import { Clock, Loader2, Lock, LockOpen, Pencil, Plus } from 'lucide-react'
import { FramedPhoto } from '@/components/home/framed-photo'

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
    <div className={`mx-4 bg-white border border-[var(--kkb-border)] rounded-[var(--kkb-radius-card)] transition-opacity ${dimmed ? 'opacity-40' : ''}`}>
      {recipe ? (
        <div className="flex items-center gap-3 p-3">
          <div className="relative h-20 w-20 rounded-[var(--kkb-radius-sm)] overflow-hidden shrink-0 bg-[var(--kkb-coral-light)]">
            {recipe.photo_url
              ? <FramedPhoto src={recipe.photo_url} alt={recipe.name} />
              : <div className="h-full w-full flex items-center justify-center text-2xl">🍴</div>}
          </div>

          <div className="min-w-0 flex-1">
            <p className="text-[10px] font-quicksand font-bold uppercase text-[var(--kkb-coral)] tracking-wide truncate">
              {eyebrow}
            </p>
            <p className="font-dosis font-bold text-[15px] text-[var(--kkb-text-primary)] leading-tight truncate">
              {recipe.name}
            </p>

            {(sideChips.length > 0 || drinkChip) && (
              <div className="flex flex-wrap gap-1 mt-1">
                {sideChips.map(chip => (
                  <span key={chip.id} className="inline-block bg-[var(--kkb-coral-light)] text-[var(--kkb-coral)] rounded-full px-2 py-0.5 text-[10px] font-quicksand font-medium">
                    {chip.name}
                  </span>
                ))}
                {drinkChip && (
                  <span className="inline-block bg-[var(--kkb-teal-light)] text-[var(--kkb-teal)] rounded-full px-2 py-0.5 text-[10px] font-quicksand font-medium">
                    {drinkChip.name}
                  </span>
                )}
              </div>
            )}

            <div className="flex items-center gap-2 mt-1">
              {recipe.prep_time_min && (
                <span className="flex items-center gap-0.5 text-[11px] font-quicksand text-[var(--kkb-text-secondary)]">
                  <Clock className="h-3 w-3" /> {recipe.prep_time_min} min
                </span>
              )}
              <span className="text-[11px] font-quicksand text-[var(--kkb-text-secondary)]">
                · {servings} pers.
              </span>
            </div>
          </div>

          <div className="flex flex-col gap-1.5 shrink-0">
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

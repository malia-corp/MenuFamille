'use client'

import { Clock, Loader2, Lock, LockOpen, Pencil, Plus, UtensilsCrossed } from 'lucide-react'
import { MEAL_COLOR, type MealType } from '@/lib/constants/meal-type'
import { MealTypeIcon } from '@/components/ui/meal-type-icon'
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
  eyebrow:      string // "Petit-déj. · 07h00"
  mealType?:    MealType // icône affichée devant l'eyebrow
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
  eyebrow, mealType, emptyLabel, recipe, sideChips, drinkChip, servings,
  isLocked, locking, onToggleLock, onEdit, dimmed, expanded,
}: MealDetailCardProps) {
  if (expanded) {
    return <div className="mx-4 flex max-h-[80vh] flex-col overflow-hidden rounded-[var(--kkb-r-xl)] bg-[var(--kkb-creme)] ring-1 ring-[var(--kkb-filet)]">{expanded}</div>
  }

  return (
    <div className={`mx-4 rounded-[var(--kkb-r-xl)] transition-opacity ${recipe ? 'bg-white p-2' : ''} ${dimmed ? 'opacity-40' : ''}`}>
      {recipe ? (
        <div className="flex items-stretch gap-3">
          {/* Photo, ou aplat aux couleurs du type de repas */}
          <div className="relative w-[96px] shrink-0 min-h-[112px] overflow-hidden rounded-[var(--kkb-r-lg)]" style={{ backgroundColor: mealType ? MEAL_COLOR[mealType].bg : 'var(--kkb-creme)' }}>
            {recipe.photo_url ? (
              // eslint-disable-next-line @next/next/no-img-element
              <img src={recipe.photo_url} alt={recipe.name} className="absolute inset-0 h-full w-full object-cover" />
            ) : (
              <div className="absolute inset-0 flex items-center justify-center" style={{ color: mealType ? MEAL_COLOR[mealType].text : 'var(--kkb-foret)' }}>
                {mealType ? <MealTypeIcon type={mealType} className="h-7 w-7 opacity-70" /> : <UtensilsCrossed className="h-7 w-7 opacity-70" />}
              </div>
            )}
          </div>

          <div className="min-w-0 flex-1 py-1 pr-1 flex flex-col justify-between">
            <div>
              <p className="flex items-center gap-1.5 text-xs font-quicksand font-bold text-[var(--kkb-texte-2)]">
                {mealType && <MealTypeIcon type={mealType} className="h-3.5 w-3.5 shrink-0 text-[var(--kkb-foret)]" />}
                <span className="truncate">{eyebrow}</span>
              </p>
              <p className="mt-0.5 font-dosis font-bold text-[16px] text-[var(--kkb-profond)] leading-tight line-clamp-2">
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
                  <span className="flex items-center gap-1 text-xs font-quicksand tabular-nums text-[var(--kkb-texte-2)] shrink-0">
                    <Clock className="h-3 w-3" /> {recipe.prep_time_min} min
                  </span>
                )}
                <span className="text-xs font-quicksand text-[var(--kkb-texte-2)] shrink-0">
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
                  aria-pressed={isLocked}
                  className={`h-10 w-10 rounded-full flex items-center justify-center transition-colors disabled:opacity-40 ${
                    isLocked
                      ? 'bg-[var(--kkb-foret)] text-[var(--kkb-creme)]'
                      : 'bg-[var(--kkb-creme)] text-[var(--kkb-foret)]'
                  }`}
                >
                  {locking ? <Loader2 className="h-4 w-4 animate-spin" /> : isLocked ? <Lock className="h-4 w-4" /> : <LockOpen className="h-4 w-4" />}
                </button>
                <button
                  type="button"
                  onClick={onEdit}
                  aria-label="Modifier le repas"
                  title="Modifier le repas"
                  className="h-10 w-10 rounded-full flex items-center justify-center bg-[var(--kkb-creme)] text-[var(--kkb-foret)] transition-colors"
                >
                  <Pencil className="h-4 w-4" />
                </button>
              </div>
            </div>
          </div>
        </div>
      ) : (
        <button
          type="button"
          onClick={onEdit}
          className="group w-full flex items-center gap-3 p-2 text-left border-[1.5px] border-dashed border-[var(--kkb-filet)] rounded-[var(--kkb-r-xl)] transition-colors hover:border-[var(--kkb-foret-300)] hover:bg-[var(--kkb-foret-50)] active:scale-[0.99]"
        >
          <span className="flex h-[72px] w-[72px] shrink-0 items-center justify-center rounded-[var(--kkb-r-lg)]" style={{ backgroundColor: mealType ? MEAL_COLOR[mealType].bg : 'white', color: mealType ? MEAL_COLOR[mealType].text : 'var(--kkb-foret)' }}>
            {mealType ? <MealTypeIcon type={mealType} className="h-6 w-6" /> : <UtensilsCrossed className="h-6 w-6" />}
          </span>
          <span className="min-w-0 flex-1">
            <span className="block truncate text-xs font-quicksand font-bold text-[var(--kkb-texte-2)]">{eyebrow}</span>
            <span className="block font-dosis text-[15px] font-bold text-[var(--kkb-profond)]">Ajouter un {emptyLabel}</span>
          </span>
          <span className="mr-1 flex h-10 w-10 shrink-0 items-center justify-center rounded-full bg-[var(--kkb-foret)] text-[var(--kkb-creme)]" aria-hidden="true">
            <Plus className="h-5 w-5" />
          </span>
        </button>
      )}
    </div>
  )
}

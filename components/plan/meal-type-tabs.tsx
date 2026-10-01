'use client'

import { MEAL_EMOJI, MEAL_LABEL, type MealType } from '@/lib/constants/meal-type'

interface MealTypeTabsProps {
  mealTypes:        MealType[]
  selected:         MealType
  onSelect:         (mealType: MealType) => void
  isFilled:         (mealType: MealType) => boolean
}

export function MealTypeTabs({ mealTypes, selected, onSelect, isFilled }: MealTypeTabsProps) {
  return (
    <div className="grid gap-1.5 px-4" style={{ gridTemplateColumns: `repeat(${mealTypes.length}, minmax(0, 1fr))` }}>
      {mealTypes.map(mealType => {
        const active = mealType === selected
        const filled = isFilled(mealType)
        const status = filled ? 'PRÊT' : active ? 'EN COURS' : 'À CHOISIR'
        const statusColor = filled
          ? 'text-[var(--kkb-success)]'
          : active ? 'text-[var(--kkb-coral)]' : 'text-[var(--kkb-text-tertiary)]'

        return (
          <button
            key={mealType}
            type="button"
            onClick={() => onSelect(mealType)}
            className={`flex flex-col items-center gap-0.5 pb-2 border-b-2 transition-colors ${
              active ? 'border-[var(--kkb-coral)]' : 'border-transparent'
            }`}
          >
            <span className="text-lg">{MEAL_EMOJI[mealType]}</span>
            <span className={`text-xs font-quicksand font-semibold ${active ? 'text-[var(--kkb-coral)]' : 'text-[var(--kkb-text-secondary)]'}`}>
              {MEAL_LABEL[mealType]}
            </span>
            <span className={`text-[9px] font-quicksand font-bold uppercase tracking-wide ${statusColor}`}>
              {status}
            </span>
          </button>
        )
      })}
    </div>
  )
}

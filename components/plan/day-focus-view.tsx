'use client'

import { Check } from 'lucide-react'
import { DAY_OPTIONS, type DayOfWeek } from '@/lib/utils/week'
import { MEAL_EMOJI, MEAL_LABEL, type MealType } from '@/lib/constants/meal-type'
import { DayTabs } from '@/components/plan/day-tabs'
import { MealTypeTabs } from '@/components/plan/meal-type-tabs'
import type { ProgressConfig, ProgressItem } from '@/lib/utils/plan-progress'

interface DayFocusViewProps {
  weekStart:        string
  selectedDay:       DayOfWeek
  onSelectDay:       (day: DayOfWeek) => void
  configs:           ProgressConfig[]
  items:             ProgressItem[]
  selectedMealType:  MealType
  onSelectMealType:  (mealType: MealType) => void
  isFilled:          (mealType: MealType) => boolean
  card:              React.ReactNode
}

export function DayFocusView({
  weekStart, selectedDay, onSelectDay, configs, items,
  selectedMealType, onSelectMealType, isFilled, card,
}: DayFocusViewProps) {
  const dayOpt = DAY_OPTIONS.find(d => d.val === selectedDay)

  return (
    <div className="grid grid-cols-[200px_1fr_220px] gap-6 items-start">
      <DayTabs
        weekStart={weekStart}
        selectedDay={selectedDay}
        onSelect={onSelectDay}
        configs={configs}
        items={items}
        orientation="vertical"
      />

      <div className="space-y-4">
        <h2 className="text-h1 text-[var(--kkb-text-primary)]">Les repas du {dayOpt?.full}</h2>
        <MealTypeTabs
          mealTypes={configs.map(c => c.meal_type)}
          selected={selectedMealType}
          onSelect={onSelectMealType}
          isFilled={isFilled}
        />
        {card}
      </div>

      <div className="bg-white border border-[var(--kkb-border)] rounded-[var(--kkb-radius-card)] p-4 space-y-2 sticky top-28">
        <p className="text-xs font-quicksand font-bold uppercase tracking-wide text-[var(--kkb-text-tertiary)] mb-1">
          {dayOpt?.full}
        </p>
        {configs.map(c => {
          const done = isFilled(c.meal_type)
          const active = c.meal_type === selectedMealType
          return (
            <button
              key={c.meal_type}
              type="button"
              onClick={() => onSelectMealType(c.meal_type)}
              className={`w-full flex items-center gap-2 rounded-[var(--kkb-radius-sm)] px-2 py-1.5 text-left transition-colors ${
                active ? 'bg-[var(--kkb-coral-light)]' : 'hover:bg-[var(--kkb-coral-light)]/50'
              }`}
            >
              <span className="text-sm">{MEAL_EMOJI[c.meal_type]}</span>
              <span className="flex-1 text-xs font-quicksand font-medium text-[var(--kkb-text-primary)]">
                {MEAL_LABEL[c.meal_type]}
              </span>
              {done
                ? <Check className="h-3.5 w-3.5 text-[var(--kkb-success)]" />
                : <span className="h-3.5 w-3.5 rounded-full border border-[var(--kkb-border)]" />}
            </button>
          )
        })}
      </div>
    </div>
  )
}

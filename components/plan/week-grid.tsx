'use client'

import { Fragment } from 'react'
import { DAY_OPTIONS, type DayOfWeek } from '@/lib/utils/week'
import { MEAL_EMOJI, MEAL_LABEL, type MealType } from '@/lib/constants/meal-type'

export interface WeekGridConfig {
  meal_type: MealType
  mode:      'daily' | 'template'
}

export interface WeekGridItem {
  id:        string
  meal_type: MealType
  day_of_week: DayOfWeek
  applies_all_days: boolean
  recipes: { name: string; photo_url: string | null } | null
}

interface WeekGridProps {
  weekStart: string
  configs:   WeekGridConfig[]
  items:     WeekGridItem[]
  onCellClick: (mealType: MealType, day: DayOfWeek, isTemplate: boolean) => void
}

export function WeekGrid({ weekStart, configs, items, onCellClick }: WeekGridProps) {
  const monday = new Date(weekStart + 'T00:00:00')

  function itemFor(mealType: MealType, day: DayOfWeek, isTemplate: boolean) {
    return isTemplate
      ? items.find(i => i.meal_type === mealType && i.applies_all_days)
      : items.find(i => i.meal_type === mealType && i.day_of_week === day && !i.applies_all_days)
  }

  return (
    <div className="grid grid-cols-[100px_repeat(7,1fr)] gap-2">
      <div />
      {DAY_OPTIONS.map((d, i) => {
        const date = new Date(monday)
        date.setDate(monday.getDate() + i)
        return (
          <div key={d.val} className="text-center">
            <p className="text-[11px] font-quicksand font-bold uppercase tracking-wide text-[var(--kkb-text-tertiary)]">
              {d.label}
            </p>
            <p className="text-sm font-dosis font-semibold text-[var(--kkb-text-primary)]">{date.getDate()}</p>
          </div>
        )
      })}

      {configs.map(config => (
        <Fragment key={config.meal_type}>
          <div key={`${config.meal_type}-label`} className="flex items-center gap-1.5 py-1">
            <span className="text-base">{MEAL_EMOJI[config.meal_type]}</span>
            <span className="text-xs font-quicksand font-semibold text-[var(--kkb-text-secondary)]">
              {MEAL_LABEL[config.meal_type]}
            </span>
          </div>
          {config.mode === 'template' ? (
            <button
              key={`${config.meal_type}-template`}
              type="button"
              onClick={() => onCellClick(config.meal_type, DAY_OPTIONS[0].val, true)}
              className="col-span-7 flex items-center gap-2 rounded-[var(--kkb-radius-sm)] border border-[var(--kkb-border)] bg-white px-3 py-2 text-left hover:border-[var(--kkb-coral)] transition-colors"
            >
              {itemFor(config.meal_type, DAY_OPTIONS[0].val, true)?.recipes ? (
                <span className="text-sm font-quicksand font-medium text-[var(--kkb-text-primary)] truncate">
                  {itemFor(config.meal_type, DAY_OPTIONS[0].val, true)?.recipes?.name}
                </span>
              ) : (
                <span className="text-sm font-quicksand text-[var(--kkb-text-tertiary)]">À choisir — toute la semaine</span>
              )}
            </button>
          ) : (
            DAY_OPTIONS.map(d => {
              const item = itemFor(config.meal_type, d.val, false)
              return (
                <button
                  key={`${config.meal_type}-${d.val}`}
                  type="button"
                  onClick={() => onCellClick(config.meal_type, d.val, false)}
                  className={`flex flex-col items-center justify-center gap-1 rounded-[var(--kkb-radius-sm)] border px-1.5 py-2 min-h-[64px] transition-colors ${
                    item?.recipes
                      ? 'border-[var(--kkb-border)] bg-white hover:border-[var(--kkb-coral)]'
                      : 'border-dashed border-[var(--kkb-border)] bg-[var(--kkb-coral-light)]/40 hover:border-[var(--kkb-coral)]'
                  }`}
                >
                  {item?.recipes ? (
                    <span className="text-[11px] font-quicksand font-medium text-[var(--kkb-text-primary)] text-center leading-tight line-clamp-2">
                      {item.recipes.name}
                    </span>
                  ) : (
                    <span className="text-[11px] font-quicksand text-[var(--kkb-text-tertiary)]">+</span>
                  )}
                </button>
              )
            })
          )}
        </Fragment>
      ))}
    </div>
  )
}

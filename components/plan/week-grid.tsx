'use client'

import { Fragment } from 'react'
import { AlertTriangle, Check, Lock, UtensilsCrossed } from 'lucide-react'
import { DAY_OPTIONS, type DayOfWeek } from '@/lib/utils/week'
import { MEAL_LABEL, type MealType } from '@/lib/constants/meal-type'
import { MealTypeIcon } from '@/components/ui/meal-type-icon'
import { dayFilledCount, type ProgressConfig, type ProgressItem } from '@/lib/utils/plan-progress'

export interface WeekGridConfig extends ProgressConfig {
  meal_type: MealType
  mode:      'daily' | 'template'
}

export interface WeekGridItem extends ProgressItem {
  id:         string
  meal_type:  MealType
  day_of_week: DayOfWeek
  applies_all_days: boolean
  is_locked:  boolean
  recipes:    { name: string; photo_url: string | null } | null
  meal_compositions: { role: 'side' | 'drink'; recipes: { name: string } | null }[]
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

  function sideDrinkChip(item: WeekGridItem) {
    const side  = item.meal_compositions.find(c => c.role === 'side')
    const drink = item.meal_compositions.find(c => c.role === 'drink')
    return side?.recipes?.name ?? drink?.recipes?.name ?? null
  }

  return (
    <div className="grid grid-cols-[100px_repeat(7,1fr)] gap-2">
      <div />
      {DAY_OPTIONS.map((d, i) => {
        const date = new Date(monday)
        date.setDate(monday.getDate() + i)
        const filled = dayFilledCount(configs, items, d.val)
        const complete = filled === configs.length
        return (
          <div key={d.val} className="text-center">
            <p className="text-[11px] font-quicksand font-bold uppercase tracking-wide text-[var(--kkb-text-tertiary)]">
              {d.label} {date.getDate()}
            </p>
            <p className={`flex items-center justify-center gap-0.5 text-[11px] font-quicksand font-bold ${complete ? 'text-[var(--kkb-success)]' : 'text-[var(--kkb-warning)]'}`}>
              {filled}/{configs.length} {complete ? <Check className="h-3 w-3" /> : <AlertTriangle className="h-3 w-3" />}
            </p>
          </div>
        )
      })}

      {configs.map(config => (
        <Fragment key={config.meal_type}>
          <div className="flex items-center gap-1.5 pt-2">
            <MealTypeIcon type={config.meal_type} className="h-4 w-4 text-[var(--kkb-coral)]" />
            <span className="text-xs font-quicksand font-semibold text-[var(--kkb-text-secondary)]">
              {MEAL_LABEL[config.meal_type]}
            </span>
          </div>
          {config.mode === 'template' ? (
            (() => {
              const item = itemFor(config.meal_type, DAY_OPTIONS[0].val, true)
              return (
                <button
                  type="button"
                  onClick={() => onCellClick(config.meal_type, DAY_OPTIONS[0].val, true)}
                  className="col-span-7 relative overflow-hidden rounded-[var(--kkb-radius-sm)] border border-[var(--kkb-border)] min-h-[60px] text-left hover:border-[var(--kkb-coral)] transition-colors"
                >
                  {item?.recipes ? (
                    <>
                      {item.recipes.photo_url ? (
                        // eslint-disable-next-line @next/next/no-img-element
                        <img src={item.recipes.photo_url} alt="" className="absolute inset-0 h-full w-full object-cover" />
                      ) : (
                        <div className="absolute inset-0 bg-[var(--kkb-coral-light)]" />
                      )}
                      <div className="absolute inset-0 bg-gradient-to-r from-black/75 via-black/35 to-transparent flex items-center px-3">
                        <span className="text-sm font-quicksand font-semibold text-white drop-shadow truncate">
                          {item.recipes.name}
                        </span>
                      </div>
                    </>
                  ) : (
                    <div className="h-full min-h-[60px] flex items-center bg-white px-3">
                      <span className="text-sm font-quicksand text-[var(--kkb-text-tertiary)]">À choisir — toute la semaine</span>
                    </div>
                  )}
                </button>
              )
            })()
          ) : (
            DAY_OPTIONS.map(d => {
              const item = itemFor(config.meal_type, d.val, false)
              const sideDrink = item ? sideDrinkChip(item) : null
              return (
                <button
                  key={`${config.meal_type}-${d.val}`}
                  type="button"
                  onClick={() => onCellClick(config.meal_type, d.val, false)}
                  className={`relative overflow-hidden rounded-[var(--kkb-radius-sm)] border min-h-[104px] transition-colors ${
                    item?.recipes
                      ? 'border-[var(--kkb-border)] hover:border-[var(--kkb-coral)]'
                      : 'border-dashed border-[var(--kkb-border)] bg-[var(--kkb-coral-light)]/40 hover:border-[var(--kkb-coral)] flex items-center justify-center'
                  }`}
                >
                  {item?.is_locked && (
                    <Lock className="absolute top-1.5 right-1.5 h-3.5 w-3.5 text-white drop-shadow z-20" />
                  )}
                  {item?.recipes ? (
                    <>
                      {item.recipes.photo_url ? (
                        // eslint-disable-next-line @next/next/no-img-element
                        <img src={item.recipes.photo_url} alt="" className="absolute inset-0 h-full w-full object-cover" />
                      ) : (
                        <div className="absolute inset-0 bg-[var(--kkb-coral-light)] flex items-center justify-center"><UtensilsCrossed className="h-6 w-6 text-[var(--kkb-coral)]" /></div>
                      )}
                      <div className="absolute inset-x-0 bottom-0 bg-gradient-to-t from-black/85 via-black/45 to-transparent pt-5 pb-1.5 px-1.5">
                        <p className="text-[10px] font-quicksand font-semibold text-white leading-tight line-clamp-2 drop-shadow text-center">
                          {item.recipes.name}
                        </p>
                        {sideDrink && (
                          <p className="text-[8px] font-quicksand text-white/85 truncate text-center mt-0.5">
                            {sideDrink}
                          </p>
                        )}
                      </div>
                    </>
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

'use client'

import { Fragment } from 'react'
import { CalendarRange, Check, Lock, Plus } from 'lucide-react'
import { DAY_OPTIONS, type DayOfWeek } from '@/lib/utils/week'
import { MEAL_COLOR, MEAL_LABEL, type MealType } from '@/lib/constants/meal-type'
import { MealTypeIcon } from '@/components/ui/meal-type-icon'
import { dayFilledCount, type ProgressConfig, type ProgressItem } from '@/lib/utils/plan-progress'

export interface WeekGridConfig extends ProgressConfig {
  meal_type:     MealType
  mode:          'daily' | 'template'
  default_time?: string
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
  // Case en cours d'édition (mise en évidence)
  activeCell?: { mealType: MealType; day: DayOfWeek; isTemplate: boolean } | null
}

// Vignette d'un repas : photo, ou aplat aux couleurs du type de repas.
function Thumb({ mealType, photo, className }: { mealType: MealType; photo: string | null; className: string }) {
  const color = MEAL_COLOR[mealType]
  return (
    <div className={`relative shrink-0 overflow-hidden ${className}`} style={{ backgroundColor: color.bg }}>
      {photo ? (
        // eslint-disable-next-line @next/next/no-img-element
        <img src={photo} alt="" className="absolute inset-0 h-full w-full object-cover" />
      ) : (
        <span className="absolute inset-0 flex items-center justify-center" style={{ color: color.text }}>
          <MealTypeIcon type={mealType} className="h-5 w-5 opacity-70" />
        </span>
      )}
    </div>
  )
}

export function WeekGrid({ weekStart, configs, items, onCellClick, activeCell }: WeekGridProps) {
  const monday   = new Date(weekStart + 'T00:00:00')
  const todayKey = new Date().toDateString()

  function itemFor(mealType: MealType, day: DayOfWeek, isTemplate: boolean) {
    return isTemplate
      ? items.find(i => i.meal_type === mealType && i.applies_all_days)
      : items.find(i => i.meal_type === mealType && i.day_of_week === day && !i.applies_all_days)
  }

  const isActive = (mealType: MealType, day: DayOfWeek, isTemplate: boolean) =>
    !!activeCell && activeCell.mealType === mealType && activeCell.isTemplate === isTemplate && (isTemplate || activeCell.day === day)

  const ring = (active: boolean) => active ? 'ring-2 ring-[var(--kkb-foret)] ring-offset-2 ring-offset-white' : ''

  return (
    <div className="rounded-[var(--kkb-r-xl)] bg-white p-4 xl:p-5">
      <div className="grid grid-cols-[112px_repeat(7,minmax(0,1fr))] gap-2 xl:grid-cols-[132px_repeat(7,minmax(0,1fr))]">
        <div />
        {DAY_OPTIONS.map((d, i) => {
          const date = new Date(monday)
          date.setDate(monday.getDate() + i)
          const filled   = dayFilledCount(configs, items, d.val)
          const complete = filled === configs.length
          const today    = date.toDateString() === todayKey
          return (
            <div key={d.val} className={`flex flex-col items-center gap-0.5 rounded-[var(--kkb-r-md)] py-2 ${today ? 'bg-[var(--kkb-jaune-50)]' : ''}`}>
              <p className="font-quicksand text-xs font-semibold text-[var(--kkb-texte-2)]">{d.label}{today && ' · auj.'}</p>
              <p className="font-dosis text-lg font-extrabold leading-none tabular-nums text-[var(--kkb-profond)]">{date.getDate()}</p>
              <p className={`flex items-center gap-1 font-quicksand text-[11px] font-bold tabular-nums ${complete ? 'text-[var(--kkb-foret-500)]' : 'text-[var(--kkb-texte-2)]'}`}>
                {complete ? <Check className="h-3 w-3" /> : null}{filled}/{configs.length}
              </p>
            </div>
          )
        })}

        {configs.map(config => {
          const color = MEAL_COLOR[config.meal_type]
          return (
            <Fragment key={config.meal_type}>
              <div className="flex items-center gap-2 pr-1">
                <span className="flex h-8 w-8 shrink-0 items-center justify-center rounded-full" style={{ backgroundColor: color.bg, color: color.text }}>
                  <MealTypeIcon type={config.meal_type} className="h-4 w-4" />
                </span>
                <span className="min-w-0">
                  <span className="block truncate font-quicksand text-sm font-bold text-[var(--kkb-profond)]">{MEAL_LABEL[config.meal_type]}</span>
                  {config.default_time && (
                    <span className="block font-quicksand text-[11px] tabular-nums text-[var(--kkb-texte-2)]">{config.default_time.slice(0, 5).replace(':', 'h')}</span>
                  )}
                </span>
              </div>

              {config.mode === 'template' ? (() => {
                const item   = itemFor(config.meal_type, DAY_OPTIONS[0].val, true)
                const active = isActive(config.meal_type, DAY_OPTIONS[0].val, true)
                return (
                  <button
                    type="button"
                    onClick={() => onCellClick(config.meal_type, DAY_OPTIONS[0].val, true)}
                    className={`col-span-7 flex min-h-[64px] items-center gap-3 rounded-[var(--kkb-r-lg)] p-2 text-left transition-colors ${
                      item?.recipes ? 'bg-[var(--kkb-creme)] hover:bg-[var(--kkb-foret-50)]' : 'border-[1.5px] border-dashed border-[var(--kkb-filet)] hover:border-[var(--kkb-foret-300)] hover:bg-[var(--kkb-foret-50)]'
                    } ${ring(active)}`}
                  >
                    {item?.recipes ? (
                      <>
                        <Thumb mealType={config.meal_type} photo={item.recipes.photo_url} className="h-12 w-16 rounded-[var(--kkb-r-md)]" />
                        <span className="min-w-0 flex-1 truncate font-quicksand text-sm font-bold text-[var(--kkb-profond)]">{item.recipes.name}</span>
                      </>
                    ) : (
                      <>
                        <span className="flex h-12 w-16 shrink-0 items-center justify-center rounded-[var(--kkb-r-md)] bg-[var(--kkb-creme)] text-[var(--kkb-foret)]"><Plus className="h-5 w-5" /></span>
                        <span className="flex-1 font-quicksand text-sm font-semibold text-[var(--kkb-texte-2)]">Choisir le {MEAL_LABEL[config.meal_type].toLowerCase()} de la semaine</span>
                      </>
                    )}
                    <span className="mr-1 inline-flex shrink-0 items-center gap-1 rounded-full bg-white px-2.5 py-1 font-quicksand text-[11px] font-bold text-[var(--kkb-foret)]">
                      <CalendarRange className="h-3.5 w-3.5" /> Toute la semaine
                    </span>
                  </button>
                )
              })() : (
                DAY_OPTIONS.map(d => {
                  const item   = itemFor(config.meal_type, d.val, false)
                  const active = isActive(config.meal_type, d.val, false)
                  const side   = item?.meal_compositions.find(c => c.role === 'side')?.recipes?.name
                    ?? item?.meal_compositions.find(c => c.role === 'drink')?.recipes?.name
                  return item?.recipes ? (
                    <button
                      key={`${config.meal_type}-${d.val}`}
                      type="button"
                      onClick={() => onCellClick(config.meal_type, d.val, false)}
                      aria-label={`${MEAL_LABEL[config.meal_type]} ${d.full} : ${item.recipes.name}`}
                      className={`group relative flex flex-col gap-1.5 rounded-[var(--kkb-r-lg)] bg-[var(--kkb-creme)] p-1.5 text-left transition-colors hover:bg-[var(--kkb-foret-50)] ${ring(active)}`}
                    >
                      <Thumb mealType={config.meal_type} photo={item.recipes.photo_url} className="aspect-[4/3] w-full rounded-[var(--kkb-r-md)]" />
                      {item.is_locked && (
                        <span className="absolute right-2.5 top-2.5 flex h-6 w-6 items-center justify-center rounded-full bg-white/90 text-[var(--kkb-foret)]" title="Repas verrouillé">
                          <Lock className="h-3 w-3" />
                        </span>
                      )}
                      <span className="line-clamp-2 px-1 font-quicksand text-[12px] font-bold leading-tight text-[var(--kkb-profond)]">{item.recipes.name}</span>
                      {side && <span className="truncate px-1 pb-0.5 font-quicksand text-[11px] text-[var(--kkb-texte-2)]">+ {side}</span>}
                    </button>
                  ) : (
                    <button
                      key={`${config.meal_type}-${d.val}`}
                      type="button"
                      onClick={() => onCellClick(config.meal_type, d.val, false)}
                      aria-label={`Ajouter un ${MEAL_LABEL[config.meal_type].toLowerCase()} le ${d.full.toLowerCase()}`}
                      className={`group flex min-h-[108px] flex-col items-center justify-center gap-1.5 rounded-[var(--kkb-r-lg)] border-[1.5px] border-dashed border-[var(--kkb-filet)] text-[var(--kkb-texte-2)] transition-colors hover:border-[var(--kkb-foret-300)] hover:bg-[var(--kkb-foret-50)] hover:text-[var(--kkb-foret)] ${ring(active)}`}
                    >
                      <span className="flex h-8 w-8 items-center justify-center rounded-full bg-[var(--kkb-creme)] transition-colors group-hover:bg-white">
                        <Plus className="h-4 w-4" />
                      </span>
                      <span className="font-quicksand text-[11px] font-semibold">Ajouter</span>
                    </button>
                  )
                })
              )}
            </Fragment>
          )
        })}
      </div>
    </div>
  )
}

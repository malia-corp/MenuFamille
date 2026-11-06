'use client'

import { ChevronRight, Clock, Plus, Users, type LucideIcon } from 'lucide-react'
import { MEAL_COLOR, MEAL_FULL_LABEL, MEAL_LABEL, type MealType } from '@/lib/constants/meal-type'
import { MealTypeIcon } from '@/components/ui/meal-type-icon'
import { FramedPhoto } from './framed-photo'

export interface TimelineChip {
  icon: LucideIcon
  name: string
}

export interface TimelineEntry {
  mealType: MealType
  time: string | null // « 12h30 »
  isNext: boolean
  meal: {
    title: string
    photoUrl: string | null
    prepTimeMin: number | null
    servings: number | null
    chips: TimelineChip[]
  } | null
}

interface DayTimelineProps {
  entries: TimelineEntry[]
  onOpen: () => void
}

// Les repas du jour sur une ligne de temps : pastille de la couleur du repas
// sur le fil, carte du plat (moment et heure en tête). Toute la carte ouvre
// le menu ; un repas sans plat devient une invitation pointillée.
export function DayTimeline({ entries, onOpen }: DayTimelineProps) {
  return (
    <ol>
      {entries.map((entry, i) => {
        const color = MEAL_COLOR[entry.mealType]
        const label = MEAL_LABEL[entry.mealType]
        const badge = entry.time ? `${label} · ${entry.time}` : label
        const last = i === entries.length - 1
        return (
          <li key={entry.mealType} className="flex gap-2.5">
            {/* Fil */}
            <div className="flex w-3 shrink-0 flex-col items-center pt-5" aria-hidden="true">
              <span className="h-3 w-3 shrink-0 rounded-full ring-4 ring-[var(--kkb-creme)]" style={{ backgroundColor: color.text }} />
              {!last && <span className="mt-1 w-px flex-1 bg-[var(--kkb-filet)]" />}
            </div>

            <div className={`min-w-0 flex-1 ${last ? '' : 'pb-3'}`}>
              {entry.meal ? (
                <button
                  type="button"
                  onClick={onOpen}
                  className="block w-full rounded-[var(--kkb-r-lg)] bg-white p-2.5 text-left transition-transform active:scale-[0.99]"
                >
                  <span className="flex items-center gap-3">
                    <span
                      className="relative h-14 w-14 shrink-0 overflow-hidden rounded-[var(--kkb-r-md)]"
                      style={{ backgroundColor: color.bg }}
                    >
                      {entry.meal.photoUrl ? (
                        <FramedPhoto src={entry.meal.photoUrl} alt={entry.meal.title} />
                      ) : (
                        <span className="flex h-full w-full items-center justify-center" style={{ color: color.text }}>
                          <MealTypeIcon type={entry.mealType} className="h-6 w-6" />
                        </span>
                      )}
                    </span>

                    <span className="min-w-0 flex-1">
                      <span className="flex flex-wrap items-center gap-1.5">
                        <span
                          className="inline-flex items-center gap-1 whitespace-nowrap rounded-full px-2 py-0.5 font-quicksand text-[11px] font-bold"
                          style={{ backgroundColor: color.bg, color: color.text }}
                        >
                          <MealTypeIcon type={entry.mealType} className="h-3 w-3" /> {badge}
                        </span>
                        {entry.isNext && (
                          <span className="rounded-full bg-[var(--kkb-jaune-50)] px-2 py-0.5 font-quicksand text-[11px] font-bold text-[var(--kkb-jaune-text)]">
                            Prochain
                          </span>
                        )}
                      </span>
                      <span className="mt-1 line-clamp-2 block font-dosis text-[16px] font-bold leading-[20px] text-[var(--kkb-profond)]">
                        {entry.meal.title}
                      </span>
                      {(entry.meal.prepTimeMin || entry.meal.servings) && (
                        <span className="mt-0.5 flex items-center gap-3 whitespace-nowrap font-quicksand text-xs text-[var(--kkb-texte-2)]">
                          {entry.meal.prepTimeMin ? (
                            <span className="inline-flex items-center gap-1">
                              <Clock className="h-3 w-3" /> {entry.meal.prepTimeMin} min
                            </span>
                          ) : null}
                          {entry.meal.servings ? (
                            <span className="inline-flex items-center gap-1">
                              <Users className="h-3 w-3" /> {entry.meal.servings} pers.
                            </span>
                          ) : null}
                        </span>
                      )}
                    </span>

                    <ChevronRight className="h-5 w-5 shrink-0 text-[var(--kkb-foret-300)]" aria-hidden="true" />
                  </span>

                  {entry.meal.chips.length > 0 && (
                    <span className="mt-2 flex flex-wrap gap-1.5 border-t border-[var(--kkb-lin)] pt-2">
                      {entry.meal.chips.map((c, j) => (
                        <span
                          key={j}
                          className="inline-flex h-7 max-w-[160px] items-center gap-1 rounded-full bg-[var(--kkb-lin)] px-2.5 font-quicksand text-xs font-semibold text-[var(--kkb-profond)]"
                        >
                          <c.icon className="h-3 w-3 shrink-0 text-[var(--kkb-foret)]" />
                          <span className="truncate">{c.name}</span>
                        </span>
                      ))}
                    </span>
                  )}
                </button>
              ) : (
                <button
                  type="button"
                  onClick={onOpen}
                  className="flex min-h-[64px] w-full items-center gap-3 rounded-[var(--kkb-r-lg)] border-[1.5px] border-dashed border-[var(--kkb-filet)] px-3 py-2.5 text-left transition-transform active:scale-[0.99]"
                >
                  <span
                    className="flex h-10 w-10 shrink-0 items-center justify-center rounded-full"
                    style={{ backgroundColor: color.bg, color: color.text }}
                  >
                    <MealTypeIcon type={entry.mealType} className="h-5 w-5" />
                  </span>
                  <span className="min-w-0 flex-1">
                    <span className="block font-dosis text-[15px] font-bold text-[var(--kkb-profond)]">{badge}</span>
                    <span className="block font-quicksand text-xs text-[var(--kkb-texte-2)]">
                      Planifier le {MEAL_FULL_LABEL[entry.mealType]}
                    </span>
                  </span>
                  <span className="flex h-9 w-9 shrink-0 items-center justify-center rounded-full bg-white text-[var(--kkb-foret)]" aria-hidden="true">
                    <Plus className="h-4 w-4" />
                  </span>
                </button>
              )}
            </div>
          </li>
        )
      })}
    </ol>
  )
}

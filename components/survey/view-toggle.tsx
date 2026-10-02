'use client'

import { CalendarDays, Utensils } from 'lucide-react'
import type { MealType } from '@/lib/constants/meal-type'
import type { DayOfWeek } from '@/lib/utils/week'

export type SurveyViewMode = 'type' | 'day'

interface TypeChip {
  value: MealType
  label: string
  emoji: string
  count: number
}

interface DayChip {
  value: DayOfWeek
  label: string
  count: number
}

interface ViewToggleProps {
  viewMode:           SurveyViewMode
  onViewModeChange:   (m: SurveyViewMode) => void
  activeFilter:       string | null
  onFilterChange:     (f: string | null) => void
  totalCount:         number
  typeChips:          TypeChip[]
  dayChips:           DayChip[]
  daysAvailableCount: number
  categoriesCount:    number
}

export function ViewToggle({
  viewMode, onViewModeChange, activeFilter, onFilterChange,
  totalCount, typeChips, dayChips, daysAvailableCount, categoriesCount,
}: ViewToggleProps) {
  const chips = viewMode === 'type'
    ? typeChips.map(c => ({ value: c.value as string, label: `${c.emoji} ${c.label}`, count: c.count }))
    : dayChips.map(c => ({ value: c.value as string, label: c.label, count: c.count }))

  return (
    <section className="mb-4">
      <div className="flex items-center gap-2">
        <button
          type="button"
          onClick={() => onViewModeChange('type')}
          className={`flex items-center gap-1.5 rounded-[var(--kkb-radius-pill)] px-3.5 py-2 text-[13px] font-quicksand font-bold transition-colors ${
            viewMode === 'type' ? 'bg-[var(--kkb-coral)] text-white' : 'bg-white border border-[var(--kkb-border)] text-[var(--kkb-text-secondary)]'
          }`}
        >
          <Utensils className="h-3.5 w-3.5" /> Par Type de repas
        </button>
        <button
          type="button"
          onClick={() => onViewModeChange('day')}
          className={`flex items-center gap-1.5 rounded-[var(--kkb-radius-pill)] px-3.5 py-2 text-[13px] font-quicksand font-bold transition-colors ${
            viewMode === 'day' ? 'bg-[var(--kkb-coral)] text-white' : 'bg-white border border-[var(--kkb-border)] text-[var(--kkb-text-secondary)]'
          }`}
        >
          <CalendarDays className="h-3.5 w-3.5" /> Par Jour<span className="hidden lg:inline"> (Semainier)</span>
        </button>
      </div>

      <div className="flex gap-1.5 overflow-x-auto hide-scrollbar mt-2.5">
        <button
          type="button"
          onClick={() => onFilterChange(null)}
          className={`flex-shrink-0 px-3 py-1 rounded-full text-[11px] font-quicksand font-bold transition-colors ${
            activeFilter === null ? 'bg-[var(--kkb-teal)] text-white' : 'bg-white border border-[var(--kkb-border)] text-[var(--kkb-text-secondary)]'
          }`}
        >
          Tous ({totalCount})
        </button>
        {chips.map(c => (
          <button
            key={c.value}
            type="button"
            onClick={() => onFilterChange(c.value)}
            className={`flex-shrink-0 px-3 py-1 rounded-full text-[11px] font-quicksand font-bold whitespace-nowrap transition-colors ${
              activeFilter === c.value ? 'bg-[var(--kkb-teal)] text-white' : 'bg-white border border-[var(--kkb-border)] text-[var(--kkb-text-secondary)]'
            }`}
          >
            {c.label} ({c.count})
          </button>
        ))}
      </div>

      <div className="flex items-center justify-between mt-2">
        <p className="text-[11px] font-quicksand text-[var(--kkb-text-tertiary)]">
          {viewMode === 'type' ? 'Vue groupée par moment de dégustation' : 'Vue groupée par jour de la semaine'}
        </p>
        <div className="hidden sm:flex items-center gap-1.5">
          <span className="text-[10px] font-quicksand font-bold uppercase px-2 py-0.5 rounded-full bg-[var(--kkb-success-light)] text-[var(--kkb-success)]">
            {daysAvailableCount} jours disponibles
          </span>
          <span className="text-[10px] font-quicksand font-bold uppercase px-2 py-0.5 rounded-full bg-[var(--kkb-teal-light)] text-[var(--kkb-teal)]">
            {categoriesCount} catégories
          </span>
        </div>
      </div>
    </section>
  )
}

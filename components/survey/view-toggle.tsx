'use client'

import { CalendarDays, Utensils, type LucideIcon } from 'lucide-react'
import type { MealType } from '@/lib/constants/meal-type'
import type { DayOfWeek } from '@/lib/utils/week'

export type SurveyViewMode = 'type' | 'day'

interface TypeChip {
  value: MealType
  label: string
  icon:  LucideIcon
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
    ? typeChips.map(c => ({ value: c.value as string, label: c.label, icon: c.icon as LucideIcon | null, count: c.count }))
    : dayChips.map(c => ({ value: c.value as string, label: c.label, icon: null, count: c.count }))

  return (
    <section className="mb-4">
      {/* Contrôle segmenté : vert forêt, l'orange reste au bouton d'envoi (C-02). */}
      <div className="grid grid-cols-2 rounded-full bg-white p-1 sm:inline-grid" role="tablist" aria-label="Regrouper les repas">
        <button
          type="button"
          role="tab"
          aria-selected={viewMode === 'type'}
          onClick={() => onViewModeChange('type')}
          className={`flex h-11 items-center justify-center gap-1.5 rounded-full px-4 text-sm font-quicksand font-bold transition-colors ${
            viewMode === 'type' ? 'bg-[var(--kkb-foret)] text-[var(--kkb-creme)]' : 'text-[var(--kkb-texte-2)]'
          }`}
        >
          <Utensils className="h-4 w-4" /> Par repas
        </button>
        <button
          type="button"
          role="tab"
          aria-selected={viewMode === 'day'}
          onClick={() => onViewModeChange('day')}
          className={`flex h-11 items-center justify-center gap-1.5 rounded-full px-4 text-sm font-quicksand font-bold transition-colors ${
            viewMode === 'day' ? 'bg-[var(--kkb-foret)] text-[var(--kkb-creme)]' : 'text-[var(--kkb-texte-2)]'
          }`}
        >
          <CalendarDays className="h-4 w-4" /> Par jour
        </button>
      </div>

      <div className="-mx-4 flex gap-2 overflow-x-auto px-4 hide-scrollbar mt-3 lg:mx-0 lg:px-0">
        <button
          type="button"
          onClick={() => onFilterChange(null)}
          className={`flex h-9 flex-shrink-0 items-center px-3.5 rounded-full text-[13px] font-quicksand font-bold transition-colors ${
            activeFilter === null ? 'bg-[var(--kkb-sauge-50)] text-[var(--kkb-foret)] ring-1 ring-[var(--kkb-foret-300)]' : 'bg-white text-[var(--kkb-texte-2)]'
          }`}
        >
          Tous <span className="ml-1 tabular-nums opacity-70">{totalCount}</span>
        </button>
        {chips.map(c => (
          <button
            key={c.value}
            type="button"
            onClick={() => onFilterChange(c.value)}
            className={`flex h-9 flex-shrink-0 items-center gap-1.5 px-3.5 rounded-full text-[13px] font-quicksand font-bold whitespace-nowrap transition-colors ${
              activeFilter === c.value ? 'bg-[var(--kkb-sauge-50)] text-[var(--kkb-foret)] ring-1 ring-[var(--kkb-foret-300)]' : 'bg-white text-[var(--kkb-texte-2)]'
            }`}
          >
            {c.icon && <c.icon className="h-3.5 w-3.5" />}
            {c.label} <span className="tabular-nums opacity-70">{c.count}</span>
          </button>
        ))}
      </div>

      <div className="flex items-center justify-between mt-2">
        <p className="sr-only">
          {viewMode === 'type' ? 'Repas groupés par moment de la journée' : 'Repas groupés par jour'}
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

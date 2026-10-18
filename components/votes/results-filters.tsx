'use client'

import { CalendarDays, UtensilsCrossed } from 'lucide-react'
import { Select } from '@/components/ui/select'

export type ResultsViewMode = 'day' | 'type'
export type ResultsSort = 'chrono' | 'best' | 'worst'

interface Chip {
  value: string
  label: string
}

interface ResultsFiltersProps {
  viewMode:         ResultsViewMode
  onViewModeChange: (m: ResultsViewMode) => void
  chips:            Chip[]
  activeChip:       string | null
  onChipChange:     (v: string | null) => void
  sort:             ResultsSort
  onSortChange:     (s: ResultsSort) => void
}

const SORTS: { value: ResultsSort; label: string }[] = [
  { value: 'chrono', label: 'Ordre de la semaine' },
  { value: 'best',   label: 'Les plus appréciés d’abord' },
  { value: 'worst',  label: 'Les moins appréciés d’abord' },
]

const MODES = [
  { value: 'day',  label: 'Par jour',  icon: CalendarDays },
  { value: 'type', label: 'Par repas', icon: UtensilsCrossed },
] as const

export function ResultsFilters({
  viewMode, onViewModeChange, chips, activeChip, onChipChange, sort, onSortChange,
}: ResultsFiltersProps) {
  const chip = (active: boolean) =>
    `shrink-0 whitespace-nowrap rounded-full px-3.5 py-1.5 font-quicksand text-[13px] font-bold transition-colors ${
      active ? 'bg-[var(--kkb-foret)] text-[var(--kkb-creme)]' : 'bg-white text-[var(--kkb-texte-2)] hover:text-[var(--kkb-foret)]'
    }`

  return (
    <div className="space-y-3 print:hidden">
      <div className="flex flex-wrap items-center justify-between gap-3">
        {/* Bascule jour / type de repas : la pastille glisse sous l'option choisie. */}
        <div role="radiogroup" aria-label="Regrouper les repas" className="relative grid grid-cols-2 rounded-full bg-white p-1">
          <span
            aria-hidden="true"
            className="pointer-events-none absolute bottom-1 left-1 top-1 w-[calc(50%-4px)] rounded-full bg-[var(--kkb-foret)] transition-transform duration-300 ease-[cubic-bezier(0.34,1.35,0.64,1)] motion-reduce:transition-none"
            style={{ transform: viewMode === 'type' ? 'translateX(100%)' : 'none' }}
          />
          {MODES.map(m => {
            const active = viewMode === m.value
            return (
              <button
                key={m.value}
                type="button"
                role="radio"
                aria-checked={active}
                onClick={() => onViewModeChange(m.value)}
                className={`relative z-10 flex h-9 items-center justify-center gap-1.5 rounded-full px-4 font-quicksand text-[13px] font-bold transition-colors duration-200 ${
                  active ? 'text-[var(--kkb-creme)]' : 'text-[var(--kkb-texte-2)] hover:text-[var(--kkb-foret)]'
                }`}
              >
                <m.icon className="h-4 w-4" /> {m.label}
              </button>
            )
          })}
        </div>

        <div className="flex items-center gap-2 font-quicksand text-xs text-[var(--kkb-texte-2)]">
          <span className="hidden sm:inline" aria-hidden="true">Trier</span>
          <Select
            value={sort}
            onChange={onSortChange}
            options={SORTS}
            ariaLabel="Trier les repas"
            size="sm"
            className="w-56"
          />
        </div>
      </div>

      <div className="-mx-4 flex gap-1.5 overflow-x-auto px-4 hide-scrollbar lg:mx-0 lg:flex-wrap lg:px-0">
        <button type="button" onClick={() => onChipChange(null)} className={chip(activeChip === null)}>Tous</button>
        {chips.map(c => (
          <button key={c.value} type="button" onClick={() => onChipChange(c.value)} className={chip(activeChip === c.value)}>
            {c.label}
          </button>
        ))}
      </div>
    </div>
  )
}

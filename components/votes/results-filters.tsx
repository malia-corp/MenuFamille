'use client'

import { CalendarDays, ChevronDown, UtensilsCrossed } from 'lucide-react'

export type ResultsViewMode = 'day' | 'type'
export type ResultsSort = 'approval' | 'chrono'

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
  votedCount:       number
  sort:             ResultsSort
  onSortChange:     (s: ResultsSort) => void
}

export function ResultsFilters({
  viewMode, onViewModeChange, chips, activeChip, onChipChange, votedCount, sort, onSortChange,
}: ResultsFiltersProps) {
  const pill = (active: boolean) =>
    `flex items-center gap-1.5 rounded-[var(--kkb-radius-pill)] px-3.5 py-2 text-[13px] font-quicksand font-bold transition-colors ${
      active ? 'bg-[var(--kkb-coral)] text-white' : 'bg-white border border-[var(--kkb-border)] text-[var(--kkb-text-secondary)]'
    }`
  const chip = (active: boolean) =>
    `shrink-0 whitespace-nowrap rounded-[var(--kkb-radius-pill)] px-3 py-1 text-[12px] font-quicksand font-bold transition-colors ${
      active ? 'bg-[var(--kkb-coral)] text-white' : 'bg-white border border-[var(--kkb-border)] text-[var(--kkb-text-secondary)]'
    }`

  return (
    <section className="space-y-2.5 print:hidden lg:bg-white lg:border lg:border-[var(--kkb-border)] lg:rounded-[var(--kkb-radius-card)] lg:p-4">
      <div className="flex flex-col gap-2.5 lg:flex-row lg:items-center lg:justify-between">
        <div className="flex items-center gap-2">
          <button type="button" onClick={() => onViewModeChange('day')} className={pill(viewMode === 'day')}>
            <CalendarDays className="h-4 w-4" /> Par Jour
          </button>
          <button type="button" onClick={() => onViewModeChange('type')} className={pill(viewMode === 'type')}>
            <UtensilsCrossed className="h-4 w-4" /> Par Type de repas
          </button>
        </div>

        <label className="hidden lg:flex items-center gap-2 text-xs font-quicksand text-[var(--kkb-text-tertiary)]">
          Trier par :
          <span className="relative">
            <select
              value={sort}
              onChange={e => onSortChange(e.target.value as ResultsSort)}
              className="appearance-none rounded-[var(--kkb-radius-sm)] border border-[var(--kkb-border)] bg-white py-1.5 pl-3 pr-8 text-xs font-quicksand font-semibold text-[var(--kkb-text-primary)] outline-none focus:border-[var(--kkb-coral)]"
            >
              <option value="approval">Taux d&apos;approbation (décroissant)</option>
              <option value="chrono">Ordre de la semaine</option>
            </select>
            <ChevronDown className="pointer-events-none absolute right-2 top-1/2 h-3.5 w-3.5 -translate-y-1/2 text-[var(--kkb-text-tertiary)]" />
          </span>
        </label>
      </div>

      <div className="-mx-4 flex gap-1.5 overflow-x-auto px-4 hide-scrollbar lg:mx-0 lg:px-0 lg:flex-wrap">
        <button type="button" onClick={() => onChipChange(null)} className={chip(activeChip === null)}>Tous</button>
        {chips.map(c => (
          <button key={c.value} type="button" onClick={() => onChipChange(c.value)} className={chip(activeChip === c.value)}>
            {c.label}
          </button>
        ))}
      </div>

      <div className="flex items-center justify-between gap-2">
        <p className="flex items-center gap-1.5 text-[11px] font-quicksand text-[var(--kkb-text-tertiary)]">
          <span className="h-1.5 w-1.5 rounded-full bg-[var(--kkb-coral)]" />
          {viewMode === 'day' ? 'Vue chronologique par journée' : 'Vue groupée par type de repas'}
        </p>
        <span className="shrink-0 rounded-[var(--kkb-radius-pill)] bg-[var(--kkb-teal-light)] px-2 py-0.5 text-[10px] font-quicksand font-bold uppercase tracking-wide text-[var(--kkb-teal)]">
          {votedCount} {votedCount > 1 ? 'repas votés' : 'repas voté'}
        </span>
      </div>
    </section>
  )
}

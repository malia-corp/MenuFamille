'use client'

import type { ReactNode } from 'react'
import { DAY_OPTIONS, type DayOfWeek } from '@/lib/utils/week'
import { DayTabs } from '@/components/plan/day-tabs'
import { dayFilledCount, type ProgressConfig, type ProgressItem } from '@/lib/utils/plan-progress'

interface DayFocusViewProps {
  weekStart:   string
  selectedDay: DayOfWeek
  onSelectDay: (day: DayOfWeek) => void
  configs:     ProgressConfig[]
  items:       ProgressItem[]
  cards:       ReactNode
}

// Desktop, jour par jour : la liste des jours à gauche, les repas du jour à droite.
export function DayFocusView({ weekStart, selectedDay, onSelectDay, configs, items, cards }: DayFocusViewProps) {
  const idx    = DAY_OPTIONS.findIndex(d => d.val === selectedDay)
  const dayOpt = DAY_OPTIONS[idx]
  const date   = new Date(weekStart + 'T00:00:00')
  date.setDate(date.getDate() + Math.max(0, idx))
  const filled = dayFilledCount(configs, items, selectedDay)

  return (
    <div className="grid grid-cols-[260px_minmax(0,1fr)] items-start gap-5">
      <div className="sticky top-24">
        <DayTabs weekStart={weekStart} selectedDay={selectedDay} onSelect={onSelectDay} configs={configs} items={items} orientation="vertical" />
      </div>

      {/* Pas de carte autour : les repas sont eux-mêmes des cartes blanches */}
      <section className="space-y-3" aria-labelledby="focus-day-title">
        <div className="flex items-baseline justify-between gap-3 px-1 pt-1">
          <h2 id="focus-day-title" className="text-h2 text-[var(--kkb-foret)]">
            {dayOpt?.full} {date.getDate()}
          </h2>
          <span className="font-quicksand text-sm text-[var(--kkb-texte-2)]">
            <span className="font-bold tabular-nums text-[var(--kkb-profond)]">{filled}/{configs.length}</span> repas choisis
          </span>
        </div>
        {/* Les cartes portent une marge latérale mobile : neutralisée ici */}
        <div className="-mx-4 space-y-3">{cards}</div>
      </section>
    </div>
  )
}

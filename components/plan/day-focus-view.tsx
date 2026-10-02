'use client'

import type { ReactNode } from 'react'
import { DAY_OPTIONS, type DayOfWeek } from '@/lib/utils/week'
import { MEAL_LABEL, type MealType } from '@/lib/constants/meal-type'
import { MealTypeIcon } from '@/components/ui/meal-type-icon'
import { DayTabs } from '@/components/plan/day-tabs'
import type { ProgressConfig, ProgressItem } from '@/lib/utils/plan-progress'

interface ServiceStat {
  mealType: MealType
  filled:   number
  total:    number
}

interface DayFocusViewProps {
  weekStart:      string
  selectedDay:    DayOfWeek
  onSelectDay:    (day: DayOfWeek) => void
  configs:        ProgressConfig[]
  items:          ProgressItem[]
  cards:          ReactNode
  weekFilled:     number
  weekTotal:      number
  serviceStats:   ServiceStat[]
}

export function DayFocusView({
  weekStart, selectedDay, onSelectDay, configs, items, cards, weekFilled, weekTotal, serviceStats,
}: DayFocusViewProps) {
  const dayOpt = DAY_OPTIONS.find(d => d.val === selectedDay)
  const percent = weekTotal > 0 ? Math.round((weekFilled / weekTotal) * 100) : 0

  return (
    <div className="grid grid-cols-[200px_1fr_240px] gap-6 items-start">
      <DayTabs
        weekStart={weekStart}
        selectedDay={selectedDay}
        onSelect={onSelectDay}
        configs={configs}
        items={items}
        orientation="vertical"
      />

      <div className="space-y-3">
        <h2 className="text-h1 text-[var(--kkb-text-primary)]">Les repas du {dayOpt?.full}</h2>
        {cards}
      </div>

      <div className="bg-white border border-[var(--kkb-border)] rounded-[var(--kkb-radius-card)] p-4 space-y-4 sticky top-28">
        <div className="space-y-1.5">
          <p className="text-[10px] font-quicksand font-bold uppercase tracking-wide text-[var(--kkb-text-tertiary)]">
            Progression semaine
          </p>
          <div className="flex items-baseline justify-between">
            <span className="font-dosis font-bold text-2xl text-[var(--kkb-coral)]">{percent}%</span>
            <span className="text-xs font-quicksand text-[var(--kkb-text-tertiary)]">{weekFilled}/{weekTotal}</span>
          </div>
          <div className="h-1.5 w-full rounded-full bg-[var(--kkb-border)] overflow-hidden">
            <div className="h-full rounded-full bg-[var(--kkb-coral)] transition-all duration-300" style={{ width: `${percent}%` }} />
          </div>
        </div>

        <div className="space-y-2">
          <p className="text-[10px] font-quicksand font-bold uppercase tracking-wide text-[var(--kkb-text-tertiary)]">
            Statut par service
          </p>
          {serviceStats.map(stat => {
            const statPercent = stat.total > 0 ? Math.round((stat.filled / stat.total) * 100) : 0
            const complete = stat.filled === stat.total
            return (
              <div key={stat.mealType} className="space-y-0.5">
                <div className="flex items-center justify-between">
                  <span className="flex items-center gap-1 text-[11px] font-quicksand font-medium text-[var(--kkb-text-secondary)]">
                    <MealTypeIcon type={stat.mealType} className="h-3 w-3 text-[var(--kkb-coral)]" /> {MEAL_LABEL[stat.mealType]}
                  </span>
                  <span className="text-[11px] font-quicksand font-bold text-[var(--kkb-text-tertiary)]">
                    {stat.filled}/{stat.total}
                  </span>
                </div>
                <div className="h-1 w-full rounded-full bg-[var(--kkb-border)] overflow-hidden">
                  <div
                    className={`h-full rounded-full transition-all duration-300 ${complete ? 'bg-[var(--kkb-teal)]' : 'bg-[var(--kkb-warning)]'}`}
                    style={{ width: `${statPercent}%` }}
                  />
                </div>
              </div>
            )
          })}
        </div>
      </div>
    </div>
  )
}

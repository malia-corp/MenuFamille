'use client'

import { Check } from 'lucide-react'
import { DAY_OPTIONS, type DayOfWeek } from '@/lib/utils/week'
import { isDayComplete, type ProgressConfig, type ProgressItem } from '@/lib/utils/plan-progress'

interface DayTabsProps {
  weekStart:   string
  selectedDay: DayOfWeek
  onSelect:    (day: DayOfWeek) => void
  configs:     ProgressConfig[]
  items:       ProgressItem[]
  orientation?: 'horizontal' | 'vertical'
}

export function DayTabs({ weekStart, selectedDay, onSelect, configs, items, orientation = 'horizontal' }: DayTabsProps) {
  const monday = new Date(weekStart + 'T00:00:00')

  return (
    <div className={orientation === 'horizontal'
      ? 'flex gap-2 overflow-x-auto hide-scrollbar px-4 py-1'
      : 'flex flex-col gap-1.5'
    }>
      {DAY_OPTIONS.map((d, i) => {
        const date = new Date(monday)
        date.setDate(monday.getDate() + i)
        const complete = isDayComplete(configs, items, d.val)
        const active = d.val === selectedDay

        if (orientation === 'vertical') {
          return (
            <button
              key={d.val}
              type="button"
              onClick={() => onSelect(d.val)}
              className={`flex items-center justify-between gap-2 px-3 py-2.5 rounded-[var(--kkb-radius-sm)] text-left transition-colors border-l-[3px] ${
                active
                  ? 'bg-white border-[var(--kkb-coral)] text-[var(--kkb-coral)]'
                  : 'bg-transparent border-transparent text-[var(--kkb-text-secondary)] hover:bg-white/60'
              }`}
            >
              <span className="font-quicksand font-semibold text-[13px]">
                {d.full} {date.getDate()}
              </span>
              {complete ? (
                <Check className="h-4 w-4 text-[var(--kkb-success)] shrink-0" />
              ) : (
                <span className="text-[11px] font-quicksand text-[var(--kkb-text-tertiary)] shrink-0">
                  {date.getDate()}
                </span>
              )}
            </button>
          )
        }

        return (
          <button
            key={d.val}
            type="button"
            onClick={() => onSelect(d.val)}
            className={`shrink-0 w-11 h-[52px] rounded-[var(--kkb-radius-sm)] flex flex-col items-center justify-center gap-0.5 font-quicksand font-semibold text-xs transition-colors ${
              active
                ? 'bg-[var(--kkb-coral)] text-white'
                : complete
                  ? 'bg-[var(--kkb-success-light)] text-[var(--kkb-success)]'
                  : 'bg-white border border-[var(--kkb-border)] text-[var(--kkb-text-tertiary)]'
            }`}
          >
            {complete && !active
              ? <Check className="h-4 w-4" />
              : <span className="text-[10px] uppercase">{d.label}</span>}
            <span className="text-sm">{date.getDate()}</span>
          </button>
        )
      })}
    </div>
  )
}

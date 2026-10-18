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
      ? 'mx-4 grid grid-cols-7 gap-1 rounded-[var(--kkb-r-xl)] bg-white p-1.5'
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
              className={`flex items-center justify-between gap-2 px-3 py-2.5 rounded-[var(--kkb-r-md)] text-left transition-colors ${
                active
                  ? 'bg-[var(--kkb-foret)] text-[var(--kkb-creme)]'
                  : 'bg-transparent text-[var(--kkb-texte-2)] hover:bg-white'
              }`}
            >
              <span className="font-quicksand font-semibold text-[13px]">
                {d.full} {date.getDate()}
              </span>
              {complete ? (
                <Check className={`h-4 w-4 shrink-0 ${active ? 'text-[var(--kkb-jaune)]' : 'text-[var(--kkb-success)]'}`} />
              ) : (
                <span className="text-[11px] font-quicksand opacity-70 shrink-0">
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
            aria-pressed={active}
            aria-label={`${d.full} ${date.getDate()}${complete ? ', complet' : ''}`}
            className={`h-[60px] rounded-[var(--kkb-r-md)] flex flex-col items-center justify-center gap-0.5 font-quicksand transition-colors ${
              active
                ? 'bg-[var(--kkb-foret)] text-[var(--kkb-creme)]'
                : complete
                  ? 'bg-[var(--kkb-sauge-50)] text-[var(--kkb-foret)]'
                  : 'text-[var(--kkb-texte-2)]'
            }`}
          >
            {complete && !active
              ? <Check className="h-3.5 w-3.5" />
              : <span className="text-[11px] font-semibold leading-none">{d.label}</span>}
            <span className={`font-dosis text-[17px] font-extrabold leading-none tabular-nums ${active ? '' : 'text-[var(--kkb-profond)]'}`}>{date.getDate()}</span>
          </button>
        )
      })}
    </div>
  )
}

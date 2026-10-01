'use client'

import { DAY_OPTIONS, type DayOfWeek } from '@/lib/utils/week'

interface WeekDayPickerProps {
  weekStart: string
  selectedDay: DayOfWeek
  onSelect: (day: DayOfWeek) => void
}

export function WeekDayPicker({ weekStart, selectedDay, onSelect }: WeekDayPickerProps) {
  const monday = new Date(weekStart + 'T00:00:00')

  return (
    <div className="flex gap-2 overflow-x-auto hide-scrollbar -mx-4 px-4 py-1">
      {DAY_OPTIONS.map((d, i) => {
        const date = new Date(monday)
        date.setDate(monday.getDate() + i)
        const isActive = d.val === selectedDay
        return (
          <button
            key={d.val}
            type="button"
            onClick={() => onSelect(d.val)}
            className={`shrink-0 flex flex-col items-center justify-center w-14 h-20 rounded-[10px] border transition-colors ${
              isActive
                ? 'bg-[var(--kkb-coral)] border-[var(--kkb-coral)] text-white'
                : 'bg-transparent border-[var(--kkb-border)] text-[var(--kkb-text-secondary)]'
            }`}
          >
            <span className="text-[10px] font-quicksand font-bold uppercase opacity-80">{d.label}</span>
            <span className="font-dosis font-bold text-xl">{date.getDate()}</span>
          </button>
        )
      })}
    </div>
  )
}

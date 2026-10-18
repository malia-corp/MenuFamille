'use client'

import { DAY_OPTIONS, dayOfWeekFromDate, type DayOfWeek } from '@/lib/utils/week'

interface WeekDayPickerProps {
  weekStart: string
  selectedDay: DayOfWeek
  onSelect: (day: DayOfWeek) => void
  // onDark : posé sur un fond vert forêt (bandeau de l'accueil).
  tone?: 'light' | 'onDark'
}

// Les sept jours tiennent sur une ligne (pas de défilement horizontal : le
// jour voulu est toujours visible). Jour choisi en pastille vert forêt (crème
// sur fond forêt), aujourd'hui repéré par un point orange (jaune sur forêt).
export function WeekDayPicker({ weekStart, selectedDay, onSelect, tone = 'light' }: WeekDayPickerProps) {
  const monday = new Date(weekStart + 'T00:00:00')
  const today = dayOfWeekFromDate(new Date())
  const onDark = tone === 'onDark'

  return (
    <div
      className={`grid grid-cols-7 gap-1 rounded-[var(--kkb-r-xl)] p-1.5 ${onDark ? 'bg-white/10' : 'bg-white'}`}
      role="tablist"
      aria-label="Jours de la semaine"
    >
      {DAY_OPTIONS.map((d, i) => {
        const date = new Date(monday)
        date.setDate(monday.getDate() + i)
        const isActive = d.val === selectedDay
        const isToday = d.val === today
        return (
          <button
            key={d.val}
            type="button"
            role="tab"
            aria-selected={isActive}
            aria-label={`${d.full} ${date.getDate()}${isToday ? ", aujourd'hui" : ''}`}
            onClick={() => onSelect(d.val)}
            className={`relative flex h-[60px] flex-col items-center justify-center gap-0.5 rounded-[var(--kkb-r-md)] transition-colors duration-200 ${
              onDark
                ? isActive
                  ? 'bg-[var(--kkb-creme)] text-[var(--kkb-foret)]'
                  : 'text-[var(--kkb-foret-100)] active:bg-white/10'
                : isActive
                  ? 'bg-[var(--kkb-foret)] text-[var(--kkb-creme)]'
                  : 'text-[var(--kkb-texte-2)] active:bg-[var(--kkb-lin)]'
            }`}
          >
            <span className="font-quicksand text-[11px] font-semibold leading-none">{d.label}</span>
            <span
              className={`font-dosis text-[17px] font-extrabold leading-none tabular-nums ${
                isActive ? '' : onDark ? 'text-[var(--kkb-creme)]' : 'text-[var(--kkb-profond)]'
              }`}
            >
              {date.getDate()}
            </span>
            {isToday && (
              <span
                className={`absolute bottom-1.5 h-1 w-1 rounded-full ${
                  isActive !== onDark ? 'bg-[var(--kkb-jaune)]' : 'bg-[var(--kkb-orange)]'
                }`}
              />
            )}
          </button>
        )
      })}
    </div>
  )
}

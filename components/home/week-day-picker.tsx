'use client'

import { useRef } from 'react'
import { DAY_OPTIONS, dayOfWeekFromDate, type DayOfWeek } from '@/lib/utils/week'

interface WeekDayPickerProps {
  weekStart: string
  selectedDay: DayOfWeek
  onSelect: (day: DayOfWeek) => void
  // onDark : posé sur un fond vert forêt (bandeau de l'accueil).
  tone?: 'light' | 'onDark'
}

// Géométrie partagée par la grille et la pastille mobile : marge intérieure
// p-1.5 (6 px de chaque côté) et gap-1 (4 px entre les 7 cases).
const PAD = 6
const GAP = 4

// Les sept jours tiennent sur une ligne (pas de défilement horizontal : le
// jour voulu est toujours visible). Le jour choisi est marqué par une pastille
// qui glisse d'une case à l'autre, comme un interrupteur (vert forêt, crème
// sur fond forêt) ; aujourd'hui est repéré par un point orange (jaune sur
// forêt). Flèches gauche/droite pour changer de jour au clavier.
export function WeekDayPicker({ weekStart, selectedDay, onSelect, tone = 'light' }: WeekDayPickerProps) {
  const monday = new Date(weekStart + 'T00:00:00')
  const today = dayOfWeekFromDate(new Date())
  const onDark = tone === 'onDark'
  const selectedIdx = Math.max(0, DAY_OPTIONS.findIndex((d) => d.val === selectedDay))
  const buttonRefs = useRef<(HTMLButtonElement | null)[]>([])

  function handleKeyDown(e: React.KeyboardEvent) {
    const step = e.key === 'ArrowRight' ? 1 : e.key === 'ArrowLeft' ? -1 : 0
    if (!step) return
    e.preventDefault()
    const next = (selectedIdx + step + 7) % 7
    onSelect(DAY_OPTIONS[next].val)
    buttonRefs.current[next]?.focus()
  }

  return (
    <div
      className={`relative grid grid-cols-7 gap-1 rounded-[var(--kkb-r-xl)] p-1.5 ${onDark ? 'bg-white/10' : 'bg-white'}`}
      role="tablist"
      aria-label="Jours de la semaine"
      onKeyDown={handleKeyDown}
    >
      {/* Pastille du jour choisi : largeur d'une case, translation d'autant de
          cases (sa propre largeur + un gap) que l'index du jour. */}
      <span
        aria-hidden="true"
        className={`pointer-events-none absolute rounded-[var(--kkb-r-md)] transition-transform duration-300 ease-[cubic-bezier(0.34,1.35,0.64,1)] motion-reduce:transition-none ${
          onDark ? 'bg-[var(--kkb-creme)]' : 'bg-[var(--kkb-foret)]'
        }`}
        style={{
          top: PAD,
          bottom: PAD,
          left: PAD,
          width: `calc((100% - ${PAD * 2}px - ${GAP * 6}px) / 7)`,
          transform: `translateX(calc(${selectedIdx} * (100% + ${GAP}px)))`,
        }}
      />

      {DAY_OPTIONS.map((d, i) => {
        const date = new Date(monday)
        date.setDate(monday.getDate() + i)
        const isActive = d.val === selectedDay
        const isToday = d.val === today
        return (
          <button
            key={d.val}
            ref={(el) => { buttonRefs.current[i] = el }}
            type="button"
            role="tab"
            aria-selected={isActive}
            tabIndex={isActive ? 0 : -1}
            aria-label={`${d.full} ${date.getDate()}${isToday ? ", aujourd'hui" : ''}`}
            onClick={() => onSelect(d.val)}
            className={`relative z-10 flex h-[60px] flex-col items-center justify-center gap-0.5 rounded-[var(--kkb-r-md)] transition-[color,transform] duration-200 active:scale-95 motion-reduce:transition-none ${
              onDark
                ? isActive
                  ? 'text-[var(--kkb-foret)]'
                  : 'text-[var(--kkb-foret-100)] hover:bg-white/5'
                : isActive
                  ? 'text-[var(--kkb-creme)]'
                  : 'text-[var(--kkb-texte-2)] hover:bg-[var(--kkb-lin)]'
            }`}
          >
            <span className="font-quicksand text-[11px] font-semibold leading-none">{d.label}</span>
            <span
              className={`font-dosis text-[17px] font-extrabold leading-none tabular-nums transition-colors duration-200 ${
                isActive ? '' : onDark ? 'text-[var(--kkb-creme)]' : 'text-[var(--kkb-profond)]'
              }`}
            >
              {date.getDate()}
            </span>
            {isToday && (
              <span
                className={`absolute bottom-1.5 h-1 w-1 rounded-full transition-colors duration-200 ${
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

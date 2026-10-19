'use client'

import { Check } from 'lucide-react'
import { DAY_OPTIONS, type DayOfWeek } from '@/lib/utils/week'
import { dayFilledCount, isDayComplete, type ProgressConfig, type ProgressItem } from '@/lib/utils/plan-progress'

interface DayTabsProps {
  weekStart:   string
  selectedDay: DayOfWeek
  onSelect:    (day: DayOfWeek) => void
  configs:     ProgressConfig[]
  items:       ProgressItem[]
  orientation?: 'horizontal' | 'vertical'
}

const PAD = 6
const GAP = 4

export function DayTabs({ weekStart, selectedDay, onSelect, configs, items, orientation = 'horizontal' }: DayTabsProps) {
  const monday   = new Date(weekStart + 'T00:00:00')
  const todayKey = new Date().toDateString()
  const dateOf = (i: number) => { const d = new Date(monday); d.setDate(monday.getDate() + i); return d }

  // Desktop : liste des jours avec l'avancement de chacun.
  if (orientation === 'vertical') {
    return (
      <nav aria-label="Jours de la semaine" className="space-y-1 rounded-[var(--kkb-r-xl)] bg-white p-2">
        {DAY_OPTIONS.map((d, i) => {
          const date     = dateOf(i)
          const filled   = dayFilledCount(configs, items, d.val)
          const complete = isDayComplete(configs, items, d.val)
          const active   = d.val === selectedDay
          return (
            <button
              key={d.val}
              type="button"
              onClick={() => onSelect(d.val)}
              aria-current={active ? 'date' : undefined}
              className={`flex w-full items-center gap-3 rounded-[var(--kkb-r-lg)] px-2.5 py-2 text-left transition-colors ${
                active ? 'bg-[var(--kkb-foret)] text-[var(--kkb-creme)]' : 'text-[var(--kkb-profond)] hover:bg-[var(--kkb-creme)]'
              }`}
            >
              <span className={`flex h-10 w-10 shrink-0 flex-col items-center justify-center rounded-[var(--kkb-r-md)] leading-none ${
                active ? 'bg-white/10' : date.toDateString() === todayKey ? 'bg-[var(--kkb-jaune-50)]' : 'bg-[var(--kkb-creme)]'
              }`}>
                <span className={`font-quicksand text-[10px] font-semibold ${active ? 'text-[var(--kkb-foret-100)]' : 'text-[var(--kkb-texte-2)]'}`}>{d.label}</span>
                <span className="font-dosis text-base font-extrabold tabular-nums">{date.getDate()}</span>
              </span>
              <span className="min-w-0 flex-1 font-quicksand text-sm font-bold">{d.full}</span>
              {complete ? (
                <span className={`flex h-6 w-6 items-center justify-center rounded-full ${active ? 'bg-[var(--kkb-sauge)] text-[var(--kkb-profond)]' : 'bg-[var(--kkb-sauge-50)] text-[var(--kkb-foret-500)]'}`}>
                  <Check className="h-3.5 w-3.5" />
                  <span className="sr-only">complet</span>
                </span>
              ) : (
                <span className={`font-quicksand text-xs font-bold tabular-nums ${active ? 'text-[var(--kkb-foret-100)]' : 'text-[var(--kkb-texte-2)]'}`}>
                  {filled}/{configs.length}
                </span>
              )}
            </button>
          )
        })}
      </nav>
    )
  }

  // Mobile : bande des 7 jours, la pastille glisse sous le jour choisi.
  const idx = Math.max(0, DAY_OPTIONS.findIndex(d => d.val === selectedDay))

  return (
    <div className="relative mx-4 grid grid-cols-7 gap-1 rounded-[var(--kkb-r-xl)] bg-white p-1.5">
      <span
        aria-hidden="true"
        className="pointer-events-none absolute rounded-[var(--kkb-r-md)] bg-[var(--kkb-foret)] transition-transform duration-300 ease-[cubic-bezier(0.34,1.35,0.64,1)] motion-reduce:transition-none"
        style={{
          top: PAD, bottom: PAD, left: PAD,
          width: `calc((100% - ${PAD * 2}px - ${GAP * 6}px) / 7)`,
          transform: `translateX(calc(${idx} * (100% + ${GAP}px)))`,
        }}
      />
      {DAY_OPTIONS.map((d, i) => {
        const date     = dateOf(i)
        const complete = isDayComplete(configs, items, d.val)
        const active   = d.val === selectedDay
        return (
          <button
            key={d.val}
            type="button"
            onClick={() => onSelect(d.val)}
            aria-pressed={active}
            aria-label={`${d.full} ${date.getDate()}${complete ? ', complet' : ''}`}
            className={`relative z-10 flex h-[60px] flex-col items-center justify-center gap-0.5 rounded-[var(--kkb-r-md)] font-quicksand transition-colors duration-200 ${
              active ? 'text-[var(--kkb-creme)]' : complete ? 'text-[var(--kkb-foret)]' : 'text-[var(--kkb-texte-2)]'
            }`}
          >
            <span className="text-[11px] font-semibold leading-none">{d.label}</span>
            <span className={`font-dosis text-[17px] font-extrabold leading-none tabular-nums ${active ? '' : 'text-[var(--kkb-profond)]'}`}>{date.getDate()}</span>
            <span aria-hidden="true" className={`h-1.5 w-1.5 rounded-full ${complete ? (active ? 'bg-[var(--kkb-sauge)]' : 'bg-[var(--kkb-foret-500)]') : 'bg-transparent'}`} />
          </button>
        )
      })}
    </div>
  )
}

'use client'

import { MessageCircleHeart, UtensilsCrossed } from 'lucide-react'
import type { DayOfWeek } from '@/lib/utils/week'
import { WeekDayPicker } from './week-day-picker'

interface HomeHeroProps {
  firstName: string
  title: React.ReactNode
  weekLabel: string
  weekStart: string
  selectedDay: DayOfWeek
  onSelectDay: (day: DayOfWeek) => void
  plannedCount: number
  slotCount: number
  respondentCount: number | null // null : sondage pas encore partagé
  memberCount: number
  actions?: React.ReactNode // en haut à droite (desktop)
}

// Bandeau d'accueil (mobile) : salutation, question du jour, semaine et deux
// repères chiffrés. Vert forêt, comme le bandeau de la connexion.
export function HomeHero({
  firstName,
  title,
  weekLabel,
  weekStart,
  selectedDay,
  onSelectDay,
  plannedCount,
  slotCount,
  respondentCount,
  memberCount,
  actions,
}: HomeHeroProps) {
  return (
    <section className="rounded-[var(--kkb-r-xl)] bg-[var(--kkb-foret)] p-4 pt-5 lg:p-6">
      <div className="px-1">
        <p className="font-quicksand text-[15px] font-medium text-[var(--kkb-foret-100)]">
          Bonjour{firstName ? `, ${firstName}` : ''}
        </p>
        <h1 className="mt-0.5 text-h1 text-[var(--kkb-creme)]">{title}</h1>
      </div>

      <div className="mt-3 flex flex-wrap items-end justify-between gap-x-4 gap-y-3 px-1 lg:mt-4">
        <p className="font-quicksand text-sm font-semibold text-[var(--kkb-foret-100)] lg:whitespace-nowrap">Semaine du {weekLabel}</p>
        {actions}
      </div>

      <div className="mt-2 lg:grid lg:grid-cols-[minmax(0,1fr)_minmax(0,300px)] lg:gap-3">
        <WeekDayPicker weekStart={weekStart} selectedDay={selectedDay} onSelect={onSelectDay} tone="onDark" />

      <dl className="mt-3 grid grid-cols-2 gap-2 lg:mt-0">
        <div className="rounded-[var(--kkb-r-md)] bg-white/10 px-3 py-2.5">
          <dt className="flex items-center gap-1.5 font-quicksand text-xs text-[var(--kkb-foret-100)]">
            <UtensilsCrossed className="h-3.5 w-3.5 text-[var(--kkb-sauge)]" /> Repas planifiés
          </dt>
          <dd className="mt-0.5 font-dosis text-[20px] font-extrabold leading-tight text-[var(--kkb-creme)] tabular-nums">
            {plannedCount}
            <span className="text-sm font-bold text-[var(--kkb-foret-100)]">/{slotCount}</span>
          </dd>
        </div>
        <div className="rounded-[var(--kkb-r-md)] bg-white/10 px-3 py-2.5">
          <dt className="flex items-center gap-1.5 font-quicksand text-xs text-[var(--kkb-foret-100)]">
            <MessageCircleHeart className="h-3.5 w-3.5 text-[var(--kkb-jaune)]" /> Avis de la famille
          </dt>
          <dd className="mt-0.5 font-dosis text-[20px] font-extrabold leading-tight text-[var(--kkb-creme)] tabular-nums">
            {respondentCount === null ? (
              <span className="font-quicksand text-[15px] font-semibold text-[var(--kkb-foret-100)]">À demander</span>
            ) : (
              <>
                {respondentCount}
                <span className="text-sm font-bold text-[var(--kkb-foret-100)]">/{memberCount}</span>
              </>
            )}
          </dd>
        </div>
      </dl>
      </div>
    </section>
  )
}

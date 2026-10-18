'use client'

import { Clock, type LucideIcon } from 'lucide-react'
import { FramedPhoto } from './framed-photo'

export interface UpcomingDay {
  key: string
  dayLabel: string
  mealLabel: string
  title: string
  photoUrl: string | null
  icon: LucideIcon
  prepTimeMin: number | null
}

// Jours suivants : cartes photo qui défilent, le jour en pastille.
export function UpcomingCarousel({ days }: { days: UpcomingDay[] }) {
  if (days.length === 0) return null

  return (
    <div className="-mx-4 flex snap-x snap-mandatory gap-3 overflow-x-auto px-4 py-1 hide-scrollbar">
      {days.map(d => (
        <div key={d.key} className="w-[168px] shrink-0 snap-start overflow-hidden rounded-[var(--kkb-r-xl)] bg-white p-1.5">
          <div className="relative aspect-square w-full overflow-hidden rounded-[var(--kkb-r-lg)] bg-[var(--kkb-orange-50)]">
            {d.photoUrl ? (
              <FramedPhoto src={d.photoUrl} alt={d.title} />
            ) : (
              <div className="flex h-full w-full items-center justify-center">
                <d.icon className="h-8 w-8 text-[var(--kkb-orange-300)]" />
              </div>
            )}
            <span className="absolute left-2 top-2 rounded-full bg-white/90 px-2.5 py-1 font-quicksand text-[11px] font-bold text-[var(--kkb-foret)] backdrop-blur-sm">
              {d.dayLabel}
            </span>
          </div>
          <div className="px-1.5 pb-1.5 pt-2">
            <p className="line-clamp-2 font-dosis text-[15px] font-bold leading-5 text-[var(--kkb-profond)]">{d.title}</p>
            <p className="mt-1 flex items-center gap-1 font-quicksand text-xs text-[var(--kkb-texte-2)]">
              {d.mealLabel}
              {d.prepTimeMin !== null && (
                <><span aria-hidden="true">·</span><Clock className="h-3 w-3" /> <span className="tabular-nums">{d.prepTimeMin} min</span></>
              )}
            </p>
          </div>
        </div>
      ))}
    </div>
  )
}

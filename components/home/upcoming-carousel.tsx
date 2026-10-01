'use client'

import { Clock } from 'lucide-react'
import { FramedPhoto } from './framed-photo'

export interface UpcomingDay {
  key: string
  dayLabel: string
  mealLabel: string
  title: string
  photoUrl: string | null
  emoji: string
  prepTimeMin: number | null
}

export function UpcomingCarousel({ days }: { days: UpcomingDay[] }) {
  if (days.length === 0) return null

  return (
    <div className="flex gap-3 overflow-x-auto hide-scrollbar -mx-4 px-4 py-1">
      {days.map(d => (
        <div
          key={d.key}
          className="shrink-0 w-44 bg-white rounded-xl border-[0.5px] border-[var(--kkb-border)] overflow-hidden shadow-sm"
        >
          <div className="aspect-[4/3] w-full relative">
            {d.photoUrl ? (
              <FramedPhoto src={d.photoUrl} alt={d.title} />
            ) : (
              <div className="h-full w-full flex items-center justify-center text-3xl bg-[var(--kkb-coral)]">
                {d.emoji}
              </div>
            )}
            <span className="absolute top-1.5 left-1.5 bg-[var(--kkb-coral)] text-white text-[8px] font-quicksand font-bold uppercase px-2 py-0.5 rounded-full">
              {d.mealLabel}
            </span>
          </div>
          <div className="p-2.5">
            <p className="text-[9px] font-quicksand font-semibold uppercase text-[var(--kkb-coral)] mb-0.5">
              {d.dayLabel}
            </p>
            <p className="font-quicksand font-bold text-sm text-[var(--kkb-text-primary)] truncate">{d.title}</p>
            {d.prepTimeMin !== null && (
              <p className="flex items-center gap-1 text-[11px] text-[var(--kkb-text-tertiary)] mt-1">
                <Clock className="h-3 w-3" /> {d.prepTimeMin} min
              </p>
            )}
          </div>
        </div>
      ))}
    </div>
  )
}

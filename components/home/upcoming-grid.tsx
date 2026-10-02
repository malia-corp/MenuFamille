'use client'

import { HelpCircle, ThumbsUp, UtensilsCrossed } from 'lucide-react'
import { FramedPhoto } from './framed-photo'

export interface UpcomingGridDay {
  key: string
  dateLabel: string
  lunchTitle: string | null
  lunchPhoto: string | null
  dinnerTitle: string | null
  agreementPct: number | null
}

export function UpcomingGrid({ days }: { days: UpcomingGridDay[] }) {
  if (days.length === 0) return null

  return (
    <div className="grid grid-cols-1 sm:grid-cols-3 gap-4">
      {days.map(d => (
        <div key={d.key} className="bg-white rounded-xl overflow-hidden shadow-sm hover:shadow-md transition-all flex flex-col">
          <div className="relative aspect-[4/3] w-full shrink-0">
            {d.lunchPhoto ? (
              <FramedPhoto src={d.lunchPhoto} alt={d.lunchTitle ?? ''} />
            ) : (
              <div className="h-full w-full bg-[var(--kkb-coral-light)] flex items-center justify-center">
                <UtensilsCrossed className="h-8 w-8 text-[var(--kkb-coral)]" />
              </div>
            )}
            <span className="absolute top-2 right-2 px-2 py-0.5 rounded-full bg-white/90 text-[var(--kkb-text-secondary)] text-[10px] font-quicksand font-semibold uppercase">
              {d.dateLabel}
            </span>
          </div>
          <div className="p-4 flex flex-col gap-2 flex-1 justify-between">
            <div className="flex flex-col gap-2">
              <div>
                <span className="text-kkb-label text-[var(--kkb-coral)]">Midi</span>
                <h4 className="font-quicksand font-bold text-sm text-[var(--kkb-text-primary)] leading-snug">
                  {d.lunchTitle ?? 'Pas encore planifié'}
                </h4>
              </div>
              <div>
                <span className="text-kkb-label text-[var(--kkb-text-tertiary)]">Soir</span>
                <p className="font-quicksand text-sm text-[var(--kkb-text-secondary)] truncate">
                  {d.dinnerTitle ?? 'Pas encore planifié'}
                </p>
              </div>
            </div>
            <div className="pt-3 border-t border-[var(--kkb-border-light)]">
              {d.agreementPct === null ? (
                <span className="flex items-center gap-1 text-xs font-quicksand text-[var(--kkb-text-tertiary)]">
                  <HelpCircle className="h-3.5 w-3.5" /> Pas encore de retours
                </span>
              ) : (
                <span className="flex items-center gap-1 text-xs font-quicksand text-[var(--kkb-success)]">
                  <ThumbsUp className="h-3.5 w-3.5" /> {d.agreementPct}% d&apos;accord
                </span>
              )}
            </div>
          </div>
        </div>
      ))}
    </div>
  )
}

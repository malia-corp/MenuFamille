'use client'

import { Moon, ThumbsUp, UtensilsCrossed } from 'lucide-react'

export interface UpcomingListDay {
  key: string
  dayShort: string // « Lun »
  dayNum: number
  lunchTitle: string | null
  dinnerTitle: string | null
  agreementPct: number | null
}

// Les prochains jours en lignes compactes : date, midi, soir, et l'avis de
// la famille quand il existe. Toute la ligne ouvre le menu.
export function UpcomingList({ days, onOpen }: { days: UpcomingListDay[]; onOpen: () => void }) {
  if (days.length === 0) return null

  return (
    <ul className="divide-y divide-[var(--kkb-lin)] overflow-hidden rounded-[var(--kkb-r-xl)] bg-white">
      {days.map((d) => (
        <li key={d.key}>
          <button
            type="button"
            onClick={onOpen}
            className="flex w-full items-center gap-3 p-3 text-left transition-colors hover:bg-[var(--kkb-creme)]"
          >
            <span className="flex h-14 w-12 shrink-0 flex-col items-center justify-center rounded-[var(--kkb-r-md)] bg-[var(--kkb-foret-50)]">
              <span className="font-quicksand text-[11px] font-semibold leading-none text-[var(--kkb-texte-2)]">{d.dayShort}</span>
              <span className="mt-1 font-dosis text-[18px] font-extrabold leading-none text-[var(--kkb-foret)] tabular-nums">{d.dayNum}</span>
            </span>

            <span className="min-w-0 flex-1 space-y-1">
              <span className="flex items-center gap-1.5 font-quicksand text-sm">
                <UtensilsCrossed className="h-3.5 w-3.5 shrink-0 text-[var(--kkb-orange-text)]" aria-label="Midi" />
                <span className={`truncate ${d.lunchTitle ? 'font-semibold text-[var(--kkb-profond)]' : 'text-[var(--kkb-texte-2)]'}`}>
                  {d.lunchTitle ?? 'Midi à planifier'}
                </span>
              </span>
              <span className="flex items-center gap-1.5 font-quicksand text-sm">
                <Moon className="h-3.5 w-3.5 shrink-0 text-[var(--kkb-foret)]" aria-label="Soir" />
                <span className={`truncate ${d.dinnerTitle ? 'text-[var(--kkb-profond)]' : 'text-[var(--kkb-texte-2)]'}`}>
                  {d.dinnerTitle ?? 'Soir à planifier'}
                </span>
              </span>
            </span>

            {d.agreementPct !== null && (
              <span className="inline-flex shrink-0 items-center gap-1 rounded-full bg-[var(--kkb-sauge-50)] px-2 py-1 font-quicksand text-xs font-bold text-[var(--kkb-foret-500)] tabular-nums">
                <ThumbsUp className="h-3 w-3" /> {d.agreementPct}%
              </span>
            )}
          </button>
        </li>
      ))}
    </ul>
  )
}

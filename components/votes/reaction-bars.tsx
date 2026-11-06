'use client'

import { useEffect, useState } from 'react'
import type { ReactionCounts } from '@/lib/utils/survey-score'

const ROWS = [
  { key: 'aime',      emoji: '\u{1F60A}', label: "J'adore",  color: 'var(--kkb-foret-500)' },
  { key: 'bof',       emoji: '\u{1F610}', label: 'Ça passe', color: 'var(--kkb-jaune)'     },
  { key: 'naime_pas', emoji: '\u{1F615}', label: 'Pas trop', color: 'var(--kkb-orange)'    },
] as const

// Répartition des avis d'un repas : une barre en trois segments (qui
// s'étirent à l'arrivée) et, dessous, le nombre d'avis par réaction.
export function ReactionBars({ counts }: { counts: ReactionCounts }) {
  const [mounted, setMounted] = useState(false)
  useEffect(() => {
    const id = requestAnimationFrame(() => setMounted(true))
    return () => cancelAnimationFrame(id)
  }, [])

  const total = counts.aime + counts.bof + counts.naime_pas

  return (
    <div className="space-y-2">
      <div className="flex h-2 gap-0.5 overflow-hidden rounded-full bg-[var(--kkb-lin)]" aria-hidden="true">
        {ROWS.map(r => {
          const pct = total > 0 ? (counts[r.key] / total) * 100 : 0
          return pct > 0 ? (
            <span
              key={r.key}
              className="h-full rounded-full transition-[width] duration-500 ease-out motion-reduce:transition-none"
              style={{ width: mounted ? `${pct}%` : '0%', backgroundColor: r.color }}
            />
          ) : null
        })}
      </div>
      <ul className="flex flex-wrap gap-x-3 gap-y-1">
        {ROWS.map(r => (
          <li key={r.key} className="flex items-center gap-1 font-quicksand text-xs text-[var(--kkb-texte-2)]">
            <span className="text-sm leading-none" aria-hidden="true">{r.emoji}</span>
            <span className={`font-bold tabular-nums ${counts[r.key] > 0 ? 'text-[var(--kkb-profond)]' : ''}`}>{counts[r.key]}</span>
            {r.label}
          </li>
        ))}
      </ul>
    </div>
  )
}

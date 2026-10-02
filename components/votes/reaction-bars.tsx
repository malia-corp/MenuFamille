'use client'

import { useEffect, useState } from 'react'
import type { ReactionCounts } from '@/lib/utils/survey-score'

const ROWS = [
  { key: 'aime',      emoji: '\u{1F60A}', label: "J'adore",  color: 'var(--kkb-success)' },
  { key: 'bof',       emoji: '\u{1F610}', label: 'Ça passe', color: 'var(--kkb-warning)' },
  { key: 'naime_pas', emoji: '\u{1F615}', label: 'Pas trop', color: 'var(--kkb-danger)'  },
] as const

export function ReactionBars({ counts }: { counts: ReactionCounts }) {
  // Les barres partent de 0 puis s'étirent jusqu'à leur valeur (animation d'entrée).
  const [mounted, setMounted] = useState(false)
  useEffect(() => {
    const id = requestAnimationFrame(() => setMounted(true))
    return () => cancelAnimationFrame(id)
  }, [])

  const total = counts.aime + counts.bof + counts.naime_pas

  return (
    <div className="space-y-1.5">
      {ROWS.map(r => {
        const n   = counts[r.key]
        const pct = total > 0 ? Math.round((n / total) * 100) : 0
        return (
          <div key={r.key} className="flex items-center gap-2" title={`${r.label} : ${pct}% (${n}/${total})`}>
            <span className="w-5 shrink-0 text-center text-sm leading-none" aria-hidden="true">{r.emoji}</span>
            <div className="flex-1 h-1.5 rounded-[var(--kkb-radius-pill)] bg-[var(--kkb-border-light)] overflow-hidden">
              <div
                className="h-full rounded-[var(--kkb-radius-pill)] transition-[width] duration-[400ms] ease-[ease]"
                style={{ width: mounted ? `${pct}%` : '0%', backgroundColor: r.color }}
              />
            </div>
            <span className="w-[74px] shrink-0 text-right whitespace-nowrap">
              <span className="text-[13px] font-quicksand font-bold" style={{ color: pct > 0 ? r.color : 'var(--kkb-text-tertiary)' }}>
                {pct}%
              </span>
              <span className="text-[11px] font-quicksand text-[var(--kkb-text-tertiary)]"> ({n}/{total})</span>
            </span>
            <span className="sr-only">{r.label}</span>
          </div>
        )
      })}
    </div>
  )
}

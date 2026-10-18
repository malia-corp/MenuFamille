'use client'

import { useEffect, useState } from 'react'

// Rayon choisi pour que la circonférence vaille 100 : stroke-dasharray = pourcentage.
const R = 15.9155

// Jauge d'accord de la famille. « onDark » : posée sur le vert forêt.
export function ConsensusGauge({ pct, label, size = 112, tone = 'light' }: {
  pct: number | null; label: string; size?: number; tone?: 'light' | 'onDark'
}) {
  const [mounted, setMounted] = useState(false)
  useEffect(() => {
    const id = requestAnimationFrame(() => setMounted(true))
    return () => cancelAnimationFrame(id)
  }, [])

  const value = pct ?? 0
  const dark  = tone === 'onDark'

  return (
    <div className="relative shrink-0" style={{ width: size, height: size }}>
      <svg viewBox="0 0 36 36" className="h-full w-full -rotate-90" aria-hidden="true">
        <circle cx="18" cy="18" r={R} fill="none" stroke={dark ? 'rgb(255 255 255 / 0.14)' : 'var(--kkb-sauge-50)'} strokeWidth="3.2" />
        <circle
          cx="18" cy="18" r={R} fill="none"
          stroke={dark ? 'var(--kkb-sauge)' : 'var(--kkb-foret-500)'} strokeWidth="3.2" strokeLinecap="round"
          strokeDasharray={`${mounted ? value : 0} 100`}
          className="transition-[stroke-dasharray] duration-700 ease-out motion-reduce:transition-none"
        />
      </svg>
      <div className="absolute inset-0 flex flex-col items-center justify-center">
        <span
          className={`font-dosis font-extrabold leading-none tabular-nums ${dark ? 'text-[var(--kkb-creme)]' : 'text-[var(--kkb-foret)]'}`}
          style={{ fontSize: Math.round(size * 0.22) }}
        >
          {pct === null ? '—' : `${pct}%`}
        </span>
        <span className={`mt-0.5 text-xs font-quicksand font-bold ${dark ? 'text-[var(--kkb-foret-100)]' : 'text-[var(--kkb-texte-2)]'}`}>
          {label}
        </span>
      </div>
    </div>
  )
}

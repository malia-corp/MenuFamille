'use client'

import { useEffect, useState } from 'react'

// Rayon choisi pour que la circonférence vaille 100 : stroke-dasharray = pourcentage.
const R = 15.9155

export function ConsensusGauge({ pct, label, size = 112 }: { pct: number | null; label: string; size?: number }) {
  const [mounted, setMounted] = useState(false)
  useEffect(() => {
    const id = requestAnimationFrame(() => setMounted(true))
    return () => cancelAnimationFrame(id)
  }, [])

  const value = pct ?? 0

  return (
    <div className="relative shrink-0" style={{ width: size, height: size }}>
      <svg viewBox="0 0 36 36" className="h-full w-full -rotate-90" aria-hidden="true">
        <circle cx="18" cy="18" r={R} fill="none" stroke="var(--kkb-coral-light)" strokeWidth="3.2" />
        <circle
          cx="18" cy="18" r={R} fill="none"
          stroke="var(--kkb-coral)" strokeWidth="3.2" strokeLinecap="round"
          strokeDasharray={`${mounted ? value : 0} 100`}
          className="transition-[stroke-dasharray] duration-700 ease-out"
        />
      </svg>
      <div className="absolute inset-0 flex flex-col items-center justify-center">
        <span className="font-dosis font-extrabold text-[var(--kkb-coral)] leading-none" style={{ fontSize: Math.round(size * 0.22) }}>
          {pct === null ? '—' : `${pct}%`}
        </span>
        <span className="mt-0.5 text-[10px] font-quicksand font-bold uppercase tracking-wide text-[var(--kkb-text-tertiary)]">
          {label}
        </span>
      </div>
    </div>
  )
}

'use client'

import { Minus, Plus } from 'lucide-react'

export function ServingsControl({ value, onChange, suffix }: { value: number; onChange: (v: number) => void; suffix?: string }) {
  return (
    <div className="inline-flex items-center gap-2.5 rounded-[var(--kkb-radius-pill)] border border-[var(--kkb-border)] bg-white px-1.5 py-1">
      <button type="button" onClick={() => onChange(Math.max(1, value - 1))} disabled={value <= 1} aria-label="Moins de portions"
        className="flex h-7 w-7 items-center justify-center rounded-full border border-[var(--kkb-border)] text-[var(--kkb-text-secondary)] disabled:opacity-40">
        <Minus className="h-3.5 w-3.5" />
      </button>
      <span className="min-w-[2ch] text-center font-dosis font-bold text-lg text-[var(--kkb-coral)]" aria-live="polite">
        {value}{suffix && <span className="ml-1 text-sm">{suffix}</span>}
      </span>
      <button type="button" onClick={() => onChange(value + 1)} aria-label="Plus de portions"
        className="flex h-7 w-7 items-center justify-center rounded-full bg-[var(--kkb-coral)] text-white">
        <Plus className="h-3.5 w-3.5" />
      </button>
    </div>
  )
}

// Quantité recalculée pour le nombre de portions choisi (calcul client uniquement).
export function scaleQuantity(qty: number | null, servings: number, baseServings: number): string {
  if (!qty) return ''
  const scaled  = qty * (servings / Math.max(1, baseServings))
  const rounded = Math.round(scaled * 10) / 10
  return Number.isInteger(rounded) ? String(rounded) : rounded.toFixed(1).replace('.', ',')
}

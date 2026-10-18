'use client'

import { Minus, Plus } from 'lucide-react'

export function ServingsControl({ value, onChange, suffix }: { value: number; onChange: (v: number) => void; suffix?: string }) {
  return (
    <div className="inline-flex items-center gap-2 rounded-full bg-white p-1">
      <button type="button" onClick={() => onChange(Math.max(1, value - 1))} disabled={value <= 1} aria-label="Moins de portions"
        className="flex h-9 w-9 items-center justify-center rounded-full bg-[var(--kkb-creme)] text-[var(--kkb-foret)] disabled:opacity-40">
        <Minus className="h-3.5 w-3.5" />
      </button>
      <span className="min-w-[2ch] text-center font-dosis font-extrabold text-lg tabular-nums text-[var(--kkb-foret)]" aria-live="polite">
        {value}{suffix && <span className="ml-1 text-sm">{suffix}</span>}
      </span>
      <button type="button" onClick={() => onChange(value + 1)} aria-label="Plus de portions"
        className="flex h-9 w-9 items-center justify-center rounded-full bg-[var(--kkb-foret)] text-[var(--kkb-creme)]">
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

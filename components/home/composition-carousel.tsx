'use client'

import { PlusCircle, type LucideIcon } from 'lucide-react'

export interface ChipItem {
  icon: LucideIcon
  name: string
  subtitle?: string
}

interface CompositionCarouselProps {
  title: string
  hint?: string
  items: ChipItem[]
  onAdd?: () => void
  addLabel?: string
}

export function CompositionCarousel({ title, hint = 'Glisser →', items, onAdd, addLabel = 'Ajouter' }: CompositionCarouselProps) {
  if (items.length === 0 && !onAdd) return null

  return (
    <div className="p-3 bg-[var(--kkb-bg)] border-t border-[var(--kkb-border)]">
      <div className="flex items-center justify-between mb-1.5">
        <span className="text-[9px] font-quicksand font-semibold uppercase tracking-wide text-[var(--kkb-text-tertiary)]">
          {title}
        </span>
        <span className="text-[10px] font-quicksand text-[var(--kkb-teal)]">{hint}</span>
      </div>
      <div className="flex gap-2 overflow-x-auto hide-scrollbar py-1">
        {items.map((item, i) => (
          <div
            key={i}
            className="shrink-0 bg-white border border-[var(--kkb-border)] rounded-lg p-2 w-36 shadow-sm flex items-center gap-2"
          >
            <span className="h-8 w-8 rounded-full bg-[var(--kkb-bg)] flex items-center justify-center shrink-0">
              <item.icon className="h-4 w-4 text-[var(--kkb-coral)]" />
            </span>
            <span className="min-w-0">
              <span className="block text-[11px] font-quicksand font-semibold text-[var(--kkb-text-primary)] truncate">
                {item.name}
              </span>
              {item.subtitle && (
                <span className="block text-[9px] text-[var(--kkb-text-tertiary)] truncate">{item.subtitle}</span>
              )}
            </span>
          </div>
        ))}
        {onAdd && (
          <button
            type="button"
            onClick={onAdd}
            className="shrink-0 border border-dashed border-[var(--kkb-border)] bg-white/60 hover:bg-white rounded-lg p-2 w-24 flex flex-col items-center justify-center gap-0.5 text-[var(--kkb-coral)] active:scale-95 transition-transform"
          >
            <PlusCircle className="h-4 w-4" />
            <span className="text-[11px] font-quicksand">{addLabel}</span>
          </button>
        )}
      </div>
    </div>
  )
}

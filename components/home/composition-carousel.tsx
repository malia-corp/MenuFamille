'use client'

import { Plus, type LucideIcon } from 'lucide-react'

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

// Accompagnements et boissons d'un repas : puces en pilule sur une ligne
// qui défile, terminées par « Ajouter ». Cibles de 36 px dans 44 (I-01).
export function CompositionCarousel({ title, items, onAdd, addLabel = 'Ajouter' }: CompositionCarouselProps) {
  if (items.length === 0 && !onAdd) return null

  return (
    <div className="px-4 pb-4">
      <p className="mb-2 font-quicksand text-xs font-semibold text-[var(--kkb-texte-2)]">{title}</p>
      <div className="-mx-4 flex gap-2 overflow-x-auto px-4 py-1 hide-scrollbar">
        {items.map((item, i) => (
          <span
            key={i}
            className="inline-flex h-9 max-w-[180px] shrink-0 items-center gap-1.5 rounded-full bg-[var(--kkb-lin)] pl-1.5 pr-3.5"
            title={item.subtitle ? `${item.name} · ${item.subtitle}` : item.name}
          >
            <span className="flex h-6 w-6 shrink-0 items-center justify-center rounded-full bg-white">
              <item.icon className="h-3.5 w-3.5 text-[var(--kkb-foret)]" />
            </span>
            <span className="truncate font-quicksand text-[13px] font-semibold text-[var(--kkb-profond)]">{item.name}</span>
          </span>
        ))}
        {onAdd && (
          <button
            type="button"
            onClick={onAdd}
            className="inline-flex h-9 shrink-0 items-center gap-1 rounded-full border border-dashed border-[var(--kkb-foret-300)] px-3.5 font-quicksand text-[13px] font-semibold text-[var(--kkb-foret)] transition-transform active:scale-95"
          >
            <Plus className="h-4 w-4" /> {addLabel}
          </button>
        )}
      </div>
    </div>
  )
}

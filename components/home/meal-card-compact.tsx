'use client'

import { Pencil, type LucideIcon } from 'lucide-react'
import { CompositionCarousel, type ChipItem } from './composition-carousel'
import { FramedPhoto } from './framed-photo'

interface MealCardCompactProps {
  icon: LucideIcon
  badgeLabel: string
  badgeBg: string
  badgeText: string
  photoUrl: string | null
  title: string
  subtitle: string
  compositionTitle: string
  compositions: ChipItem[]
  onEdit: () => void
  onAddComposition: () => void
}

export function MealCardCompact({
  icon: Icon,
  badgeLabel,
  badgeBg,
  badgeText,
  photoUrl,
  title,
  subtitle,
  compositionTitle,
  compositions,
  onEdit,
  onAddComposition,
}: MealCardCompactProps) {
  return (
    <div className="bg-white rounded-xl border-[0.5px] border-[var(--kkb-border)] shadow-sm overflow-hidden">
      <div className="relative aspect-[4/3] w-full">
        {photoUrl ? (
          <FramedPhoto src={photoUrl} alt={title} />
        ) : (
          <div className="h-full w-full flex items-center justify-center bg-[var(--kkb-coral)]">
            <Icon className="h-12 w-12 text-white" />
          </div>
        )}
        <div className="absolute inset-x-0 bottom-0 h-20 bg-gradient-to-t from-black/75 to-transparent" />
        <div className="absolute top-1.5 left-1.5">
          <span
            className="inline-flex items-center gap-1 px-2 py-0.5 rounded-full text-[9px] font-quicksand font-bold border border-[var(--kkb-border)]"
            style={{ backgroundColor: badgeBg, color: badgeText }}
          >
            <Icon className="h-3 w-3" /> {badgeLabel}
          </span>
        </div>
        <button
          type="button"
          onClick={onEdit}
          aria-label="Modifier"
          className="absolute top-1.5 right-1.5 h-7 w-7 rounded-full bg-white/90 hover:bg-white flex items-center justify-center text-[var(--kkb-text-secondary)] active:scale-95 transition-transform"
        >
          <Pencil className="h-3.5 w-3.5" />
        </button>
        <div className="absolute bottom-1.5 left-2.5 right-2.5 text-white">
          <h4 className="font-dosis font-bold text-lg leading-tight">{title}</h4>
          <p className="text-[11px] font-quicksand text-white/90">{subtitle}</p>
        </div>
      </div>
      <CompositionCarousel title={compositionTitle} items={compositions} onAdd={onAddComposition} addLabel="Extra" />
    </div>
  )
}

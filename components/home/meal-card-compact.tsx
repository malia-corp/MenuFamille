'use client'

import { Pencil, Plus, type LucideIcon } from 'lucide-react'
import type { ChipItem } from './composition-carousel'
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

// Repas secondaire du jour : une ligne compacte (vignette, moment, plat),
// les extras en petites puces dessous. Toute la ligne reste lisible d'un
// coup d'œil, le repas principal garde la grande photo.
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
    <article className="rounded-[var(--kkb-r-xl)] bg-white p-2.5">
      <div className="flex items-center gap-3">
        <div className="relative h-[72px] w-[72px] shrink-0 overflow-hidden rounded-[var(--kkb-r-lg)]" style={{ backgroundColor: badgeBg }}>
          {photoUrl ? (
            <FramedPhoto src={photoUrl} alt={title} />
          ) : (
            <div className="flex h-full w-full items-center justify-center" style={{ color: badgeText }}>
              <Icon className="h-7 w-7" />
            </div>
          )}
        </div>

        <div className="min-w-0 flex-1">
          <span
            className="inline-flex items-center gap-1 rounded-full px-2 py-0.5 font-quicksand text-[11px] font-bold"
            style={{ backgroundColor: badgeBg, color: badgeText }}
          >
            <Icon className="h-3 w-3" /> {badgeLabel}
          </span>
          <h4 className="mt-1 truncate font-dosis text-[17px] font-bold leading-[22px] text-[var(--kkb-profond)]">{title}</h4>
          {subtitle && <p className="font-quicksand text-xs text-[var(--kkb-texte-2)]">{subtitle}</p>}
        </div>

        <button
          type="button"
          onClick={onEdit}
          aria-label={`Modifier ${title}`}
          className="flex h-11 w-11 shrink-0 items-center justify-center rounded-full bg-[var(--kkb-creme)] text-[var(--kkb-foret)] transition-transform active:scale-95"
        >
          <Pencil className="h-4 w-4" />
        </button>
      </div>

      <div className="mt-2.5 flex flex-wrap items-center gap-1.5 border-t border-[var(--kkb-lin)] px-1 pt-2.5" aria-label={compositionTitle}>
        {compositions.map((c, i) => (
          <span key={i} className="inline-flex h-7 max-w-[160px] items-center gap-1 rounded-full bg-[var(--kkb-lin)] px-2.5 font-quicksand text-xs font-semibold text-[var(--kkb-profond)]">
            <c.icon className="h-3 w-3 shrink-0 text-[var(--kkb-foret)]" />
            <span className="truncate">{c.name}</span>
          </span>
        ))}
        <button
          type="button"
          onClick={onAddComposition}
          className="inline-flex h-9 items-center gap-1 rounded-full px-2.5 font-quicksand text-xs font-semibold text-[var(--kkb-foret)] active:scale-95"
        >
          <Plus className="h-3.5 w-3.5" /> {compositions.length ? 'Extra' : 'Ajouter un extra'}
        </button>
      </div>
    </article>
  )
}

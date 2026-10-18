'use client'

import { useState } from 'react'
import { Clock, Heart, type LucideIcon } from 'lucide-react'
import { CompositionCarousel, type ChipItem } from './composition-carousel'
import { FramedPhoto } from './framed-photo'

const DIFFICULTY_LABEL: Record<string, string> = {
  facile: 'Facile',
  moyen: 'Intermédiaire',
  difficile: 'Difficile',
}

interface MealCardHeroProps {
  icon: LucideIcon
  timeLabel: string
  photoUrl: string | null
  recipeId: string | null
  title: string
  prepTimeMin: number | null
  difficulty: string | null
  respondentCount: number
  memberCount: number
  agreementPct: number | null
  compositionTitle: string
  compositions: ChipItem[]
  onAddComposition: () => void
}

// Repas principal du jour : grande photo arrondie, titre posé sur un voile
// sombre (lisible quelle que soit la photo), puis l'avis de la table en
// jauge et les accompagnements en puces.
export function MealCardHero({
  icon: Icon,
  timeLabel,
  photoUrl,
  recipeId,
  title,
  prepTimeMin,
  difficulty,
  respondentCount,
  memberCount,
  agreementPct,
  compositionTitle,
  compositions,
  onAddComposition,
}: MealCardHeroProps) {
  const [favorited, setFavorited] = useState(false)

  async function toggleFavorite() {
    if (!recipeId) return
    setFavorited(f => !f)
    try {
      const res = await fetch(`/api/recipes/${recipeId}/favorite`, { method: 'POST' })
      if (res.ok) {
        const data = await res.json()
        setFavorited(!!data.is_favorited)
      }
    } catch {
      setFavorited(f => !f)
    }
  }

  const meta = [
    prepTimeMin ? `${prepTimeMin} min` : null,
    difficulty ? DIFFICULTY_LABEL[difficulty] ?? difficulty : null,
  ].filter(Boolean).join(' · ')

  return (
    <article className="overflow-hidden rounded-[var(--kkb-r-xl)] bg-white">
      <div className="relative m-1.5 aspect-[5/4] lg:aspect-[16/7] overflow-hidden rounded-[var(--kkb-r-lg)]">
        {photoUrl ? (
          <FramedPhoto src={photoUrl} alt={title} />
        ) : (
          <div className="flex h-full w-full items-center justify-center bg-[var(--kkb-orange-50)]">
            <Icon className="h-14 w-14 text-[var(--kkb-orange-300)]" />
          </div>
        )}
        <div className="absolute inset-x-0 bottom-0 h-2/3 bg-gradient-to-t from-[rgba(31,58,46,0.85)] via-[rgba(31,58,46,0.35)] to-transparent" />

        <span className="absolute left-3 top-3 inline-flex items-center gap-1.5 rounded-full bg-white/90 px-3 py-1.5 font-quicksand text-xs font-bold text-[var(--kkb-foret)] backdrop-blur-sm">
          <Icon className="h-3.5 w-3.5" /> {timeLabel}
        </span>
        {recipeId && (
          <button
            type="button"
            onClick={() => void toggleFavorite()}
            aria-label={favorited ? 'Retirer des favoris' : 'Ajouter aux favoris'}
            aria-pressed={favorited}
            className="absolute right-3 top-3 flex h-10 w-10 items-center justify-center rounded-full bg-white/90 backdrop-blur-sm transition-transform active:scale-90"
          >
            <Heart
              className="h-5 w-5 text-[var(--kkb-orange)]"
              fill={favorited ? 'var(--kkb-orange)' : 'none'}
            />
          </button>
        )}

        <div className="absolute inset-x-4 bottom-4 text-[var(--kkb-creme)]">
          <h3 className="font-dosis text-[22px] font-extrabold leading-[26px]">{title}</h3>
          {meta && (
            <p className="mt-1 flex items-center gap-1.5 font-quicksand text-sm font-medium text-white/90">
              <Clock className="h-3.5 w-3.5" /> {meta}
            </p>
          )}
        </div>
      </div>

      <div className="px-4 pb-4 pt-2.5">
        {agreementPct === null ? (
          <p className="font-quicksand text-sm text-[var(--kkb-texte-2)]">
            La table n&apos;a pas encore donné son avis.
          </p>
        ) : (
          <div className="space-y-2">
            <div className="flex items-baseline justify-between gap-2 font-quicksand text-sm">
              <span className="text-[var(--kkb-texte-2)]">
                <span className="font-bold tabular-nums text-[var(--kkb-profond)]">{respondentCount}/{memberCount}</span> ont répondu
              </span>
              <span className="font-bold tabular-nums text-[var(--kkb-success)]">{agreementPct} % d&apos;accord</span>
            </div>
            <div className="h-2 overflow-hidden rounded-full bg-[var(--kkb-sauge-50)]" aria-hidden="true">
              <div className="h-full rounded-full bg-[var(--kkb-sauge)]" style={{ width: `${agreementPct}%` }} />
            </div>
          </div>
        )}
      </div>

      <CompositionCarousel title={compositionTitle} items={compositions} onAdd={onAddComposition} />
    </article>
  )
}

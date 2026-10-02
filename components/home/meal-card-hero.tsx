'use client'

import { useState } from 'react'
import { Clock, Heart, UtensilsCrossed, type LucideIcon } from 'lucide-react'
import { CompositionCarousel, type ChipItem } from './composition-carousel'
import { FramedPhoto } from './framed-photo'

const DIFFICULTY_LABEL: Record<string, string> = {
  facile: 'Niveau facile',
  moyen: 'Niveau intermédiaire',
  difficile: 'Niveau difficile',
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

  return (
    <div className="relative rounded-xl overflow-hidden bg-white border-[0.5px] border-[var(--kkb-border)] shadow-md">
      <div className="aspect-[4/3] w-full relative">
        {photoUrl ? (
          <FramedPhoto src={photoUrl} alt={title} />
        ) : (
          <div className="h-full w-full flex items-center justify-center bg-[var(--kkb-coral)]">
            <Icon className="h-14 w-14 text-white" />
          </div>
        )}
        <div className="absolute top-3 left-3 flex gap-1.5">
          <span className="inline-flex items-center gap-1 bg-[var(--kkb-coral)] text-white px-2.5 py-0.5 rounded-full text-[10px] font-quicksand font-bold uppercase">
            <Icon className="h-3 w-3" /> {timeLabel}
          </span>
          <span className="bg-[var(--kkb-teal)] text-white px-2.5 py-0.5 rounded-full text-[10px] font-quicksand font-bold uppercase">
            Aujourd&apos;hui
          </span>
        </div>
        {recipeId && (
          <button
            type="button"
            onClick={() => void toggleFavorite()}
            aria-label="Favori"
            className="absolute top-3 right-3 h-9 w-9 rounded-full bg-white/90 backdrop-blur-sm border border-[var(--kkb-border)] flex items-center justify-center active:scale-95 transition-transform shadow-sm"
          >
            <Heart
              className="h-5 w-5"
              style={{ color: 'var(--kkb-coral)' }}
              fill={favorited ? 'var(--kkb-coral)' : 'none'}
            />
          </button>
        )}
      </div>

      <div className="p-4 space-y-2 border-b-2 border-[var(--kkb-teal)]">
        <div className="flex items-center gap-1 text-[var(--kkb-coral)]">
          <UtensilsCrossed className="h-4 w-4" />
          <span className="text-[10px] font-quicksand font-bold uppercase tracking-wide">Plat principal</span>
        </div>
        <h3 className="font-dosis font-bold text-xl text-[var(--kkb-text-primary)] leading-tight">{title}</h3>
        <div className="flex items-center gap-1 text-[var(--kkb-text-secondary)]">
          <Clock className="h-3.5 w-3.5" />
          <span className="text-sm font-quicksand">
            {prepTimeMin ? `${prepTimeMin} min` : 'Durée non précisée'}
            {difficulty && ` • ${DIFFICULTY_LABEL[difficulty] ?? difficulty}`}
          </span>
        </div>

        <div className="flex items-center justify-between bg-[var(--kkb-success-light)] p-2.5 rounded-lg">
          {agreementPct === null ? (
            <span className="text-sm font-quicksand text-[var(--kkb-success)]">Pas encore de retours</span>
          ) : (
            <>
              <span className="text-sm font-quicksand font-semibold text-[var(--kkb-success)]">
                {respondentCount}/{memberCount} ont répondu
              </span>
              <span className="text-sm font-quicksand text-[var(--kkb-success)]">{agreementPct}% d&apos;accord</span>
            </>
          )}
        </div>
      </div>

      <CompositionCarousel
        title={compositionTitle}
        hint="Défiler →"
        items={compositions}
        onAdd={onAddComposition}
      />
    </div>
  )
}

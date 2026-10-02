'use client'

import { useState } from 'react'
import { Check, CupSoda, Loader2, MessageCircle, Salad, Tag } from 'lucide-react'
import { FramedPhoto } from '@/components/home/framed-photo'
import type { MealType } from '@/lib/constants/meal-type'
import { MEAL_ICON } from '@/lib/constants/meal-type-icon'

export type Reaction = 'aime' | 'bof' | 'naime_pas'

const REACTION_CONFIG: { value: Reaction; emoji: string; label: string }[] = [
  { value: 'aime',      emoji: '\u{1F60A}', label: "J'adore"  },
  { value: 'bof',       emoji: '\u{1F610}', label: 'Ça passe' },
  { value: 'naime_pas', emoji: '\u{1F615}', label: 'Pas trop'  },
]

const REACTION_ACTIVE_CLASS: Record<Reaction, string> = {
  aime:      'bg-[var(--kkb-success-light)] border-[var(--kkb-success)] text-[var(--kkb-success)]',
  bof:       'bg-[var(--kkb-warning-light)] border-[var(--kkb-warning)] text-[#B07A12]',
  naime_pas: 'bg-[var(--kkb-danger-light)] border-[var(--kkb-danger)] text-[var(--kkb-danger)]',
}

interface MealRecipe {
  id:            string
  name:          string
  photo_url:     string | null
  description:   string | null
  prep_time_min: number | null
  category:      { icon: string | null; name: string } | null
}

interface MealComposition {
  id:   string
  role: string
  name: string | null
}

interface MealVoteCardProps {
  dayLabel:        string // "Lundi 14 · Midi", type de repas en vue "Par Jour", ou "Toute la semaine"
  withMealIcon?:   boolean // icône du type de repas devant dayLabel
  mealType:        MealType
  recipe:          MealRecipe | null
  compositions:    MealComposition[]
  reaction:        Reaction | null
  comment:         string
  onSelectReaction: (r: Reaction) => void
  onCommentChange: (v: string) => void
  onSaveComment:   () => void
  savingComment:   boolean
  justSaved:       boolean
  disabled:        boolean // vrai tant qu'aucun prénom n'est saisi
}

export function MealVoteCard({
  dayLabel, withMealIcon, mealType, recipe, compositions, reaction, comment,
  onSelectReaction, onCommentChange, onSaveComment, savingComment, justSaved, disabled,
}: MealVoteCardProps) {
  const [commentOpen, setCommentOpen] = useState(false)
  const MealIcon = MEAL_ICON[mealType]

  const sides = compositions.filter(c => c.role === 'side' && c.name).map(c => ({ id: c.id, name: c.name! }))
  const drinkComp = compositions.find(c => c.role === 'drink' && c.name)
  const drink = drinkComp ? { id: drinkComp.id, name: drinkComp.name! } : null

  return (
    <div className="bg-white border border-[var(--kkb-border)] rounded-[var(--kkb-radius-card)] overflow-hidden h-full flex flex-col">
      {/* Header carte */}
      <div className="flex items-center justify-between gap-2 px-3 pt-3">
        <p className="min-w-0 flex items-center gap-1 font-quicksand font-bold text-xs text-[var(--kkb-text-secondary)]">
          {withMealIcon && <MealIcon className="h-3.5 w-3.5 shrink-0 text-[var(--kkb-coral)]" />}
          <span className="truncate">{dayLabel}</span>
        </p>
        {recipe?.category && (
          <span className="inline-flex items-center gap-1 text-[10px] font-quicksand font-bold uppercase tracking-wide px-2 py-0.5 rounded-full bg-[var(--kkb-teal-light)] text-[var(--kkb-teal)] shrink-0">
            <Tag className="h-3 w-3" /> {recipe.category.name}
          </span>
        )}
      </div>

      {/* Photo */}
      <div className="relative aspect-[16/9] lg:aspect-[4/3] mt-2">
        {recipe?.photo_url ? (
          <FramedPhoto src={recipe.photo_url} alt={recipe.name} />
        ) : (
          <div className="absolute inset-0 bg-[var(--kkb-coral)] flex items-center justify-center">
            <MealIcon className="h-12 w-12 text-white" />
          </div>
        )}
      </div>

      {/* Infos plat */}
      <div className="px-3 pt-2.5">
        <p className="font-dosis font-bold text-[17px] text-[var(--kkb-text-primary)] leading-tight">
          {recipe?.name ?? 'Repas non défini'}
        </p>
        {(sides.length > 0 || drink) && (
          <div className="flex flex-wrap gap-1.5 mt-1.5">
            {sides.map(s => (
              <span key={s.id} className="inline-flex items-center gap-1 bg-[var(--kkb-coral-light)] text-[var(--kkb-coral)] rounded-full px-2.5 py-1 text-[11px] font-quicksand font-bold">
                <Salad className="h-3.5 w-3.5" /> {s.name}
              </span>
            ))}
            {drink && (
              <span className="inline-flex items-center gap-1 bg-[var(--kkb-teal-light)] text-[var(--kkb-teal)] rounded-full px-2.5 py-1 text-[11px] font-quicksand font-bold">
                <CupSoda className="h-3.5 w-3.5" /> {drink.name}
              </span>
            )}
          </div>
        )}
        {recipe?.description && (
          <p className="text-[13px] font-quicksand text-[var(--kkb-text-secondary)] mt-1.5">
            {recipe.description}
          </p>
        )}
      </div>

      {/* Boutons réaction */}
      <div className="flex items-stretch gap-2 px-3 pt-3">
        {REACTION_CONFIG.map(r => (
          <button
            key={r.value}
            type="button"
            disabled={disabled}
            onClick={() => onSelectReaction(r.value)}
            aria-label={r.label}
            className={`group relative flex-1 flex flex-col items-center gap-0.5 py-2.5 rounded-[var(--kkb-radius-pill)] border-[1.5px] font-quicksand font-bold text-[13px] transition-all duration-150 disabled:opacity-40 disabled:cursor-not-allowed ${
              reaction === r.value
                ? `${REACTION_ACTIVE_CLASS[r.value]} scale-105`
                : 'bg-white border-[var(--kkb-border)] text-[var(--kkb-text-secondary)]'
            }`}
          >
            <span className="text-lg leading-none transition-transform duration-200 md:group-hover:scale-125 md:group-hover:-rotate-12">
              {r.emoji}
            </span>
            {/* Mobile : libellé toujours visible (pas de survol au tactile) */}
            <span className="md:hidden">{r.label}</span>
            {/* Desktop : libellé en bulle au survol, sans décaler la carte */}
            <span className="hidden md:block pointer-events-none absolute -top-7 left-1/2 -translate-x-1/2 whitespace-nowrap rounded-full bg-[var(--kkb-text-primary)] text-white text-[11px] px-2 py-0.5 opacity-0 translate-y-1 transition-all duration-200 group-hover:opacity-100 group-hover:translate-y-0">
              {r.label}
            </span>
          </button>
        ))}
        <button
          type="button"
          disabled={disabled}
          onClick={() => setCommentOpen(o => !o)}
          aria-label="Ajouter une note"
          className="w-12 shrink-0 flex items-center justify-center rounded-[var(--kkb-radius-pill)] border-[1.5px] border-dashed border-[var(--kkb-border)] text-[var(--kkb-text-tertiary)] disabled:opacity-40 disabled:cursor-not-allowed"
        >
          <MessageCircle className="h-4 w-4" />
        </button>
      </div>

      {/* Champ commentaire */}
      <div
        className="px-3 overflow-hidden transition-[max-height,padding] duration-300 ease-out"
        style={{ maxHeight: commentOpen ? 140 : 0, paddingTop: commentOpen ? 10 : 0, paddingBottom: commentOpen ? 12 : 0 }}
      >
        <textarea
          value={comment}
          onChange={e => onCommentChange(e.target.value)}
          placeholder="Ajouter une note..."
          rows={2}
          className="w-full text-sm font-quicksand text-[var(--kkb-text-primary)] bg-[var(--kkb-bg)] border border-[var(--kkb-border)] rounded-[var(--kkb-radius-sm)] px-3.5 py-2.5 outline-none placeholder:text-[var(--kkb-text-tertiary)] resize-none"
        />
        <button
          type="button"
          onClick={onSaveComment}
          disabled={!reaction || savingComment}
          className="mt-1.5 flex items-center gap-1.5 text-xs font-quicksand font-bold text-[var(--kkb-coral)] disabled:opacity-40 disabled:cursor-not-allowed"
        >
          {savingComment && <Loader2 className="h-3 w-3 animate-spin" />}
          Enregistrer
        </button>
        {!reaction && (
          <p className="text-[11px] font-quicksand text-[var(--kkb-text-tertiary)] mt-1">
            Choisis d&apos;abord une réaction pour enregistrer ta note.
          </p>
        )}
      </div>

      {/* Indicateur de sauvegarde */}
      <div className="px-3 pb-2.5">
        <p className={`flex items-center gap-1 text-[11px] font-quicksand font-semibold text-[var(--kkb-success)] transition-opacity duration-200 ${justSaved ? 'opacity-100' : 'opacity-0'}`}>
          <Check className="h-3 w-3" /> Sauvegardé
        </p>
      </div>
    </div>
  )
}

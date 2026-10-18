'use client'

import { useEffect, useRef, useState } from 'react'
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

// Réaction choisie : aplat clair et contour de la même famille, libellé dans
// la teinte texte associée (paires de la matrice, C-13). Pas de rouge : le
// « pas trop » reste dans les oranges de la palette.
const REACTION_ACTIVE_CLASS: Record<Reaction, string> = {
  aime:      'bg-[var(--kkb-sauge-50)] border-[var(--kkb-foret-500)] text-[var(--kkb-foret)]',
  bof:       'bg-[var(--kkb-jaune-50)] border-[var(--kkb-jaune)] text-[var(--kkb-jaune-text)]',
  naime_pas: 'bg-[var(--kkb-orange-50)] border-[var(--kkb-orange-300)] text-[var(--kkb-orange-700)]',
}

const POP_DURATION_MS = 600

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

  // id change à chaque clic : remonte l'emoji pour relancer le pop
  const [pop, setPop] = useState<{ value: Reaction; id: number } | null>(null)
  const popTimer = useRef<ReturnType<typeof setTimeout> | null>(null)
  useEffect(() => () => { if (popTimer.current) clearTimeout(popTimer.current) }, [])

  function handleReaction(value: Reaction) {
    setPop({ value, id: Date.now() })
    if (popTimer.current) clearTimeout(popTimer.current)
    popTimer.current = setTimeout(() => setPop(null), POP_DURATION_MS)
    onSelectReaction(value)
  }

  const sides = compositions.filter(c => c.role === 'side' && c.name).map(c => ({ id: c.id, name: c.name! }))
  const drinkComp = compositions.find(c => c.role === 'drink' && c.name)
  const drink = drinkComp ? { id: drinkComp.id, name: drinkComp.name! } : null

  return (
    <div className="bg-white rounded-[var(--kkb-r-xl)] overflow-hidden h-full flex flex-col p-1.5">
      {/* Photo, jour et catégorie en pastilles */}
      <div className="relative aspect-[16/10] lg:aspect-[4/3] overflow-hidden rounded-[var(--kkb-r-lg)] bg-[var(--kkb-orange-50)]">
        {recipe?.photo_url ? (
          <FramedPhoto src={recipe.photo_url} alt={recipe.name} />
        ) : (
          <div className="absolute inset-0 flex items-center justify-center">
            <MealIcon className="h-12 w-12 text-[var(--kkb-orange-300)]" />
          </div>
        )}
        <p className="absolute left-2.5 top-2.5 max-w-[60%] inline-flex items-center gap-1.5 rounded-full bg-white/90 px-3 py-1.5 font-quicksand text-xs font-bold text-[var(--kkb-foret)] backdrop-blur-sm">
          {withMealIcon && <MealIcon className="h-3.5 w-3.5 shrink-0" />}
          <span className="truncate">{dayLabel}</span>
        </p>
        {recipe?.category && (
          <span className="absolute right-2.5 top-2.5 max-w-[40%] inline-flex items-center gap-1 rounded-full bg-white/90 px-2.5 py-1.5 font-quicksand text-[11px] font-bold text-[var(--kkb-texte-2)] backdrop-blur-sm">
            <Tag className="h-3 w-3 shrink-0" /> <span className="truncate">{recipe.category.name}</span>
          </span>
        )}
      </div>

      {/* Infos plat */}
      <div className="px-2.5 pt-3">
        <p className="font-dosis font-bold text-[18px] text-[var(--kkb-profond)] leading-tight">
          {recipe?.name ?? 'Repas non défini'}
        </p>
        {(sides.length > 0 || drink) && (
          <div className="flex flex-wrap gap-1.5 mt-1.5">
            {sides.map(s => (
              <span key={s.id} className="inline-flex items-center gap-1 bg-[var(--kkb-lin)] text-[var(--kkb-profond)] rounded-full px-2.5 py-1 text-xs font-quicksand font-semibold">
                <Salad className="h-3.5 w-3.5" /> {s.name}
              </span>
            ))}
            {drink && (
              <span className="inline-flex items-center gap-1 bg-[var(--kkb-lin)] text-[var(--kkb-profond)] rounded-full px-2.5 py-1 text-xs font-quicksand font-semibold">
                <CupSoda className="h-3.5 w-3.5" /> {drink.name}
              </span>
            )}
          </div>
        )}
        {recipe?.description && (
          <p className="text-[13px] font-quicksand text-[var(--kkb-texte-2)] mt-1.5 line-clamp-3">
            {recipe.description}
          </p>
        )}
      </div>

      {/* Bloc vote poussé en bas : boutons alignés d'une carte à l'autre sur une même rangée */}
      <div className="mt-auto">
        {/* Boutons réaction */}
        <div className="flex items-stretch gap-2 px-1 pt-3">
          {REACTION_CONFIG.map(r => {
            const popping = pop?.value === r.value
            return (
              <button
                key={r.value}
                type="button"
                disabled={disabled}
                onClick={() => handleReaction(r.value)}
                aria-label={r.label}
                aria-pressed={reaction === r.value}
                className={`group relative flex-1 flex h-16 flex-col items-center justify-center gap-1 rounded-[var(--kkb-r-lg)] border-2 font-quicksand font-bold text-[13px] transition-all duration-150 disabled:opacity-40 disabled:cursor-not-allowed ${
                  reaction === r.value
                    ? REACTION_ACTIVE_CLASS[r.value]
                    : 'bg-[var(--kkb-creme)] border-transparent text-[var(--kkb-texte-2)]'
                }`}
              >
                {/* Deux couches : pop au clic (externe, remontée à chaque clic) + zoom au survol (interne), pour ne pas se neutraliser */}
                <span key={popping ? pop.id : 'idle'} className={`inline-block ${popping ? 'motion-safe:animate-kkb-react-pop' : ''}`}>
                  <span className="inline-block text-[22px] leading-none transition-transform duration-200 md:group-hover:scale-125 md:group-hover:-rotate-12">
                    {r.emoji}
                  </span>
                </span>

                {/* Mobile : libellé toujours visible (pas de survol au tactile) */}
                <span className="md:hidden">{r.label}</span>
                {/* Desktop : libellé en bulle au survol, sans décaler la carte */}
                <span className="hidden md:block pointer-events-none absolute -top-7 left-1/2 -translate-x-1/2 whitespace-nowrap rounded-full bg-[var(--kkb-text-primary)] text-white text-[11px] px-2 py-0.5 opacity-0 translate-y-1 transition-all duration-200 group-hover:opacity-100 group-hover:translate-y-0">
                  {r.label}
                </span>
              </button>
            )
          })}
          <button
            type="button"
            disabled={disabled}
            onClick={() => setCommentOpen(o => !o)}
            aria-label="Ajouter une note"
            aria-expanded={commentOpen}
            className={`w-12 shrink-0 flex items-center justify-center rounded-[var(--kkb-r-lg)] transition-colors disabled:opacity-40 disabled:cursor-not-allowed ${
              commentOpen || comment ? 'bg-[var(--kkb-foret)] text-[var(--kkb-creme)]' : 'bg-[var(--kkb-creme)] text-[var(--kkb-foret)]'
            }`}
          >
            <MessageCircle className="h-4 w-4" />
          </button>
        </div>

        {/* Champ commentaire */}
        <div
          className="px-1 overflow-hidden transition-[max-height,padding] duration-300 ease-out"
          style={{ maxHeight: commentOpen ? 140 : 0, paddingTop: commentOpen ? 10 : 0, paddingBottom: commentOpen ? 12 : 0 }}
        >
          <textarea
            value={comment}
            onChange={e => onCommentChange(e.target.value)}
            placeholder="Un mot pour la cuisine…"
            rows={2}
            className="w-full text-[15px] font-quicksand text-[var(--kkb-profond)] bg-[var(--kkb-creme)] rounded-[var(--kkb-r-md)] px-4 py-3 outline-none ring-[var(--kkb-foret-300)] focus:ring-2 placeholder:text-[var(--kkb-texte-2)] resize-none"
          />
          <button
            type="button"
            onClick={onSaveComment}
            disabled={!reaction || savingComment}
            className="mt-2 flex h-10 items-center gap-1.5 rounded-full bg-[var(--kkb-foret)] px-4 text-sm font-quicksand font-bold text-[var(--kkb-creme)] disabled:opacity-40 disabled:cursor-not-allowed"
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
        <div className="px-2.5 pb-2 pt-1">
          <p className={`flex items-center gap-1 text-[11px] font-quicksand font-semibold text-[var(--kkb-success)] transition-opacity duration-200 ${justSaved ? 'opacity-100' : 'opacity-0'}`}>
            <Check className="h-3 w-3" /> Sauvegardé
          </p>
        </div>
      </div>
    </div>
  )
}

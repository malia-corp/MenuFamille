'use client'

import { CupSoda, Inbox, Lock, Pencil, Salad } from 'lucide-react'
import { MEAL_COLOR, MEAL_LABEL } from '@/lib/constants/meal-type'
import { MealTypeIcon } from '@/components/ui/meal-type-icon'
import { agreementPct, totalReactions } from '@/lib/utils/survey-score'
import { ReactionBars } from './reaction-bars'
import { NameAvatar } from './name-avatar'
import { agreementTone } from './result-helpers'
import type { ResultItem } from './types'

type Reaction = 'aime' | 'bof' | 'naime_pas'

const MY_REACTION_LABEL: Record<Reaction, { emoji: string; label: string }> = {
  aime:      { emoji: '\u{1F60A}', label: "J'adore"  },
  bof:       { emoji: '\u{1F610}', label: 'Ça passe' },
  naime_pas: { emoji: '\u{1F615}', label: 'Pas trop' },
}

interface ResultCardProps {
  item:      ResultItem
  dayLabel:  string // "Lundi" ou "Toute la semaine"
  onEdit?:   () => void // absent = pas d'édition (vue Membre)
  // Vue Membre : sa propre réaction, visible de lui seul (undefined = non affiché)
  myReaction?: Reaction | null
}

export function ResultCard({ item, dayLabel, onEdit, myReaction }: ResultCardProps) {
  const counts   = { aime: item.aime, bof: item.bof, naime_pas: item.naime_pas }
  const total    = totalReactions(counts)
  const adhesion = agreementPct(counts)
  const color    = MEAL_COLOR[item.meal_type]
  const tone     = agreementTone(adhesion)

  return (
    <article className="flex h-full flex-col gap-3 rounded-[var(--kkb-r-lg)] bg-white p-4">
      {/* Vignette | nom et moment | accord | édition */}
      <div className="flex items-start gap-3">
        <div className="relative h-12 w-12 shrink-0 overflow-hidden rounded-[var(--kkb-r-md)]" style={{ backgroundColor: color.bg }}>
          {item.photo_url ? (
            // eslint-disable-next-line @next/next/no-img-element
            <img src={item.photo_url} alt="" className="absolute inset-0 h-full w-full object-cover" />
          ) : (
            <span className="absolute inset-0 flex items-center justify-center" style={{ color: color.text }}>
              <MealTypeIcon type={item.meal_type} className="h-5 w-5" />
            </span>
          )}
        </div>

        <div className="min-w-0 flex-1">
          <p className="font-quicksand text-xs font-semibold" style={{ color: color.text }}>
            {MEAL_LABEL[item.meal_type]} · {dayLabel}
            {/* Petit écran : l'accord rejoint cette ligne pour laisser la place au nom. */}
            {adhesion !== null && (
              <span className="font-bold sm:hidden" style={{ color: tone.text }}> · {adhesion}% d&apos;accord</span>
            )}
          </p>
          <h3 className="text-h3 text-[var(--kkb-profond)]">{item.main_name ?? 'Repas non défini'}</h3>
        </div>

        {adhesion !== null && (
          <span
            className="hidden shrink-0 rounded-full px-2.5 py-1 font-dosis sm:inline-block text-[15px] font-extrabold leading-none tabular-nums"
            style={{ backgroundColor: tone.bg, color: tone.text }}
            title="Part d'avis favorables (J'adore et Ça passe)"
          >
            {adhesion}%
          </span>
        )}
        {onEdit && (
          <button
            type="button"
            onClick={onEdit}
            aria-label={`Modifier ${item.main_name ?? 'ce repas'}`}
            className="-mr-1.5 -mt-1 flex h-9 w-9 shrink-0 items-center justify-center rounded-full text-[var(--kkb-texte-2)] transition-colors hover:bg-[var(--kkb-foret-50)] hover:text-[var(--kkb-foret)] print:hidden"
          >
            <Pencil className="h-4 w-4" />
          </button>
        )}
      </div>

      {(item.side_names.length > 0 || item.drink_name || item.description) && (
        <div className="space-y-1.5">
          {(item.side_names.length > 0 || item.drink_name) && (
            <div className="flex flex-wrap gap-1">
              {item.side_names.map(name => (
                <span key={name} className="inline-flex items-center gap-1 rounded-full bg-[var(--kkb-creme)] px-2 py-0.5 font-quicksand text-[11px] font-semibold text-[var(--kkb-texte-2)]">
                  <Salad className="h-3 w-3" /> {name}
                </span>
              ))}
              {item.drink_name && (
                <span className="inline-flex items-center gap-1 rounded-full bg-[var(--kkb-creme)] px-2 py-0.5 font-quicksand text-[11px] font-semibold text-[var(--kkb-texte-2)]">
                  <CupSoda className="h-3 w-3" /> {item.drink_name}
                </span>
              )}
            </div>
          )}
          {item.description && (
            <p className="line-clamp-2 font-quicksand text-[13px] text-[var(--kkb-texte-2)]">{item.description}</p>
          )}
        </div>
      )}

      {total === 0 ? (
        <p className="flex items-center gap-1.5 font-quicksand text-xs text-[var(--kkb-texte-2)]">
          <Inbox className="h-3.5 w-3.5" /> Aucun avis pour ce repas
        </p>
      ) : (
        <ReactionBars counts={counts} />
      )}

      {/* Repère personnel (vue Membre) */}
      {myReaction !== undefined && (
        <p className="mt-auto flex items-center gap-1.5 rounded-[var(--kkb-r-md)] bg-[var(--kkb-creme)] px-3 py-2 font-quicksand text-xs font-semibold text-[var(--kkb-texte-2)]">
          {myReaction ? (
            <>
              Ton repère :
              <span className="text-sm leading-none" aria-hidden="true">{MY_REACTION_LABEL[myReaction].emoji}</span>
              <span className="text-[var(--kkb-profond)]">{MY_REACTION_LABEL[myReaction].label}</span>
            </>
          ) : (
            'Tu n’as pas donné ton avis sur ce repas'
          )}
          <span className="ml-auto inline-flex items-center gap-1 rounded-full bg-white px-2 py-0.5 text-xs font-bold">
            <Lock className="h-3 w-3" /> Privé
          </span>
        </p>
      )}

      {/* Commentaires nommés (vue Planificatrice) */}
      {item.comments.length > 0 && (
        <ul className="mt-auto space-y-2 border-t border-dashed border-[var(--kkb-filet)] pt-3">
          {item.comments.map((c, i) => (
            <li key={i} className="flex items-start gap-2">
              <NameAvatar name={c.respondent_name} size={26} />
              <p className="min-w-0 rounded-[var(--kkb-r-md)] rounded-tl-[4px] bg-[var(--kkb-creme)] px-3 py-1.5 font-quicksand text-[13px] leading-snug text-[var(--kkb-texte-2)]">
                <span className="block text-xs font-bold text-[var(--kkb-profond)]">{c.respondent_name}</span>
                {c.comment}
              </p>
            </li>
          ))}
        </ul>
      )}
    </article>
  )
}

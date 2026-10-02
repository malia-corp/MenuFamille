'use client'

import { CupSoda, Inbox, Pencil, Salad, ThumbsUp } from 'lucide-react'
import { MEAL_COLOR, MEAL_LABEL } from '@/lib/constants/meal-type'
import { MealTypeIcon } from '@/components/ui/meal-type-icon'
import { agreementPct, totalReactions } from '@/lib/utils/survey-score'
import { ReactionBars } from './reaction-bars'
import { NameAvatar } from './name-avatar'
import type { ResultItem } from './types'

interface ResultCardProps {
  item:     ResultItem
  dayLabel: string // "Lundi" ou "Toute la semaine"
  onEdit:   () => void
}

export function ResultCard({ item, dayLabel, onEdit }: ResultCardProps) {
  const counts   = { aime: item.aime, bof: item.bof, naime_pas: item.naime_pas }
  const total    = totalReactions(counts)
  const adhesion = agreementPct(counts)
  const color    = MEAL_COLOR[item.meal_type]

  return (
    <article className="bg-white border border-[var(--kkb-border)] rounded-[var(--kkb-radius-card)] p-4 flex flex-col gap-3 h-full">
      {/* En-tête : type (+ jour sur desktop), adhésion (desktop), édition */}
      <div className="flex items-center gap-2">
        <span
          className="inline-flex items-center px-2 py-0.5 rounded-[var(--kkb-radius-pill)] text-[10px] font-quicksand font-bold uppercase tracking-wide"
          style={{ backgroundColor: color.bg, color: color.text }}
        >
          {MEAL_LABEL[item.meal_type]}
          <span className="hidden lg:inline">&nbsp;· {dayLabel}</span>
        </span>
        {adhesion !== null && (
          <span className="hidden lg:inline-flex items-center gap-1 px-2 py-0.5 rounded-[var(--kkb-radius-pill)] bg-[var(--kkb-success-light)] text-[var(--kkb-success)] text-[10px] font-quicksand font-bold">
            <ThumbsUp className="h-3 w-3" /> {adhesion}% Adhésion
          </span>
        )}
        <button
          type="button"
          onClick={onEdit}
          aria-label={`Modifier ${item.main_name ?? 'ce repas'}`}
          className="ml-auto p-1.5 -mr-1.5 rounded-full text-[var(--kkb-text-tertiary)] hover:text-[var(--kkb-coral)] hover:bg-[var(--kkb-coral-light)] transition-colors print:hidden"
        >
          <Pencil className="h-4 w-4" />
        </button>
      </div>

      {/* Photo | nom (+ barres à droite sur desktop) */}
      <div className="grid grid-cols-[80px_1fr] lg:grid-cols-[120px_1fr] gap-x-3 gap-y-3 items-start">
        <div className="relative h-20 w-20 lg:h-[90px] lg:w-[120px] rounded-[var(--kkb-radius-sm)] overflow-hidden bg-[var(--kkb-coral)] lg:row-span-2">
          {item.photo_url ? (
            // eslint-disable-next-line @next/next/no-img-element
            <img src={item.photo_url} alt={item.main_name ?? ''} className="absolute inset-0 h-full w-full object-cover" />
          ) : (
            <div className="absolute inset-0 flex items-center justify-center">
              <MealTypeIcon type={item.meal_type} className="h-8 w-8 text-white" />
            </div>
          )}
        </div>

        <div className="min-w-0">
          <h3 className="font-dosis font-bold text-base lg:text-lg leading-tight text-[var(--kkb-text-primary)]">
            {item.main_name ?? 'Repas non défini'}
          </h3>
          {(item.side_names.length > 0 || item.drink_name) && (
            <div className="mt-1.5 flex flex-wrap gap-1">
              {item.side_names.map(name => (
                <span key={name} className="inline-flex items-center gap-1 rounded-[var(--kkb-radius-pill)] bg-[var(--kkb-coral-light)] px-2 py-0.5 text-[11px] font-quicksand font-bold text-[var(--kkb-coral)]">
                  <Salad className="h-3 w-3" /> {name}
                </span>
              ))}
              {item.drink_name && (
                <span className="inline-flex items-center gap-1 rounded-[var(--kkb-radius-pill)] bg-[var(--kkb-teal-light)] px-2 py-0.5 text-[11px] font-quicksand font-bold text-[var(--kkb-teal)]">
                  <CupSoda className="h-3 w-3" /> {item.drink_name}
                </span>
              )}
            </div>
          )}
          {item.description && (
            <p className="mt-1 text-[13px] font-quicksand text-[var(--kkb-text-secondary)] line-clamp-2">{item.description}</p>
          )}
        </div>

        <div className="col-span-2 lg:col-span-1 lg:col-start-2">
          {total === 0 ? (
            <p className="flex items-center gap-1.5 text-xs font-quicksand text-[var(--kkb-text-tertiary)]">
              <Inbox className="h-3.5 w-3.5" /> Aucun vote pour ce repas
            </p>
          ) : (
            <ReactionBars counts={counts} />
          )}
        </div>
      </div>

      {/* Commentaires nommés (vue Planificatrice) */}
      {item.comments.length > 0 && (
        <ul className="mt-auto space-y-2 rounded-[var(--kkb-radius-sm)] bg-[var(--kkb-bg)] p-3">
          {item.comments.map((c, i) => (
            <li key={i} className="flex items-start gap-2">
              <NameAvatar name={c.respondent_name} />
              <p className="min-w-0 pt-1 text-[13px] font-quicksand leading-snug text-[var(--kkb-text-secondary)]">
                <span className="font-bold not-italic text-[var(--kkb-text-primary)]">{c.respondent_name}</span>
                {' : '}
                <span className="italic">« {c.comment} »</span>
              </p>
            </li>
          ))}
        </ul>
      )}
    </article>
  )
}

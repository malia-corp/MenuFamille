'use client'

import { Clock, Loader2, Plus, RefreshCw, X } from 'lucide-react'
import { FramedPhoto } from '@/components/home/framed-photo'

export interface CompositionChip {
  id:        string
  recipeId:  string
  name:      string
}

export interface SuggestionChip {
  id:   string
  name: string
  icon: string
}

interface PlanRecipeLike {
  id:            string
  name:          string
  photo_url:     string | null
  prep_time_min: number | null
  categories:    { icon: string | null } | null
}

interface MealDetailCardProps {
  emoji:          string
  title:          string // "Déjeuner du Jeudi"
  recipe:         PlanRecipeLike | null
  sideChips:      CompositionChip[]
  drinkChip:      CompositionChip | null
  sideSuggestions:  SuggestionChip[]
  drinkSuggestions: SuggestionChip[]
  mainSuggestions:  { id: string; name: string; icon: string; prepTimeMin: number | null }[]
  onEditMain:          () => void
  onRegenerateMain:    () => void
  onAddSide:           () => void
  onRemoveSide:        (compId: string) => void
  onQuickAddSide:      (recipeId: string) => void
  onChangeDrink:       () => void
  onQuickReplaceDrink: (recipeId: string) => void
  onPickMainSuggestion: (recipeId: string) => void
  removingCompId: string | null
  busy: boolean
}

export function MealDetailCard({
  emoji, title, recipe, sideChips, drinkChip, sideSuggestions, drinkSuggestions, mainSuggestions,
  onEditMain, onRegenerateMain, onAddSide, onRemoveSide, onQuickAddSide,
  onChangeDrink, onQuickReplaceDrink, onPickMainSuggestion, removingCompId, busy,
}: MealDetailCardProps) {
  return (
    <div className="space-y-4">
      <div className="mx-4 bg-white border border-[var(--kkb-border)] rounded-[var(--kkb-radius-card)] overflow-hidden">
        {/* Header */}
        <div className="flex items-start justify-between gap-2 px-4 pt-4">
          <div>
            <p className="font-dosis font-semibold text-base text-[var(--kkb-text-primary)]">
              {emoji} {title}
            </p>
          </div>
          <div className="flex items-center gap-2 shrink-0">
            {recipe && (
              <span className="text-[10px] font-quicksand font-bold uppercase tracking-wide px-2 py-0.5 rounded-full bg-[var(--kkb-success-light)] text-[var(--kkb-success)]">
                Validé &amp; prêt
              </span>
            )}
            <button
              type="button"
              onClick={onRegenerateMain}
              disabled={busy}
              aria-label="Régénérer ce repas"
              className="p-1 text-[var(--kkb-text-tertiary)] hover:text-[var(--kkb-coral)] transition-colors disabled:opacity-40"
            >
              <RefreshCw className="h-4 w-4" />
            </button>
          </div>
        </div>

        {/* Plat principal */}
        <button type="button" onClick={onEditMain} className="w-full text-left px-4 py-3 flex gap-3">
          <div className="relative h-20 w-20 rounded-[var(--kkb-radius-sm)] overflow-hidden shrink-0 bg-[var(--kkb-coral-light)]">
            {recipe?.photo_url ? (
              <FramedPhoto src={recipe.photo_url} alt={recipe.name} />
            ) : (
              <div className="h-full w-full flex items-center justify-center text-3xl">{emoji}</div>
            )}
          </div>
          <div className="min-w-0 flex-1">
            <p className="text-[10px] font-quicksand font-bold uppercase text-[var(--kkb-coral)] tracking-wide">
              Plat principal
            </p>
            <p className="font-dosis font-bold text-[17px] text-[var(--kkb-text-primary)] leading-tight truncate">
              {recipe?.name ?? 'À choisir'}
            </p>
            {recipe?.prep_time_min && (
              <p className="flex items-center gap-1 text-[13px] font-quicksand text-[var(--kkb-text-secondary)] mt-0.5">
                <Clock className="h-3 w-3" /> {recipe.prep_time_min} min
              </p>
            )}
          </div>
        </button>

        {/* Accompagnements */}
        {recipe && (
          <div className="px-4 py-3 border-t border-[var(--kkb-border-light)]">
            <div className="flex items-center justify-between mb-2">
              <span className="text-[10px] font-quicksand font-bold uppercase text-[var(--kkb-text-tertiary)] tracking-wide">
                Accompagnements {sideChips.length > 0 && `· ${sideChips.length} sélectionné${sideChips.length > 1 ? 's' : ''}`}
              </span>
              <button type="button" onClick={onAddSide} className="flex items-center gap-1 text-xs font-quicksand font-semibold text-[var(--kkb-coral)]">
                <Plus className="h-3.5 w-3.5" /> Ajouter
              </button>
            </div>
            <div className="flex flex-wrap gap-1.5">
              {sideChips.map(chip => (
                <span key={chip.id} className="inline-flex items-center gap-1 bg-[var(--kkb-coral-light)] text-[var(--kkb-coral)] rounded-full pl-2.5 pr-1.5 py-1 text-xs font-quicksand font-medium">
                  {chip.name}
                  <button type="button" onClick={() => onRemoveSide(chip.id)} disabled={removingCompId === chip.id} aria-label={`Retirer ${chip.name}`}>
                    {removingCompId === chip.id ? <Loader2 className="h-3 w-3 animate-spin" /> : <X className="h-3 w-3" />}
                  </button>
                </span>
              ))}
              {sideSuggestions.filter(s => !sideChips.some(c => c.recipeId === s.id)).slice(0, 3).map(s => (
                <button
                  key={s.id}
                  type="button"
                  onClick={() => onQuickAddSide(s.id)}
                  className="inline-flex items-center gap-1 bg-white border border-dashed border-[var(--kkb-border)] text-[var(--kkb-text-secondary)] rounded-full px-2.5 py-1 text-xs font-quicksand"
                >
                  <Plus className="h-3 w-3" /> {s.icon} {s.name}
                </button>
              ))}
            </div>
          </div>
        )}

        {/* Boisson */}
        {recipe && (
          <div className="px-4 py-3 border-t border-[var(--kkb-border-light)]">
            <div className="flex items-center justify-between mb-2">
              <span className="text-[10px] font-quicksand font-bold uppercase text-[var(--kkb-text-tertiary)] tracking-wide">
                Boisson choisie
              </span>
              <button type="button" onClick={onChangeDrink} className="flex items-center gap-1 text-xs font-quicksand font-semibold text-[var(--kkb-coral)]">
                <RefreshCw className="h-3 w-3" /> Changer
              </button>
            </div>
            {drinkChip ? (
              <p className="text-sm font-quicksand font-medium text-[var(--kkb-text-primary)]">{drinkChip.name}</p>
            ) : (
              <p className="text-sm font-quicksand text-[var(--kkb-text-tertiary)]">Aucune boisson choisie</p>
            )}
            {drinkSuggestions.length > 0 && (
              <div className="flex flex-wrap gap-1.5 mt-2">
                {drinkSuggestions.filter(s => s.id !== drinkChip?.recipeId).slice(0, 3).map(s => (
                  <button
                    key={s.id}
                    type="button"
                    onClick={() => onQuickReplaceDrink(s.id)}
                    className="inline-flex items-center gap-1 bg-white border border-[var(--kkb-border)] text-[var(--kkb-text-secondary)] rounded-full px-2.5 py-1 text-xs font-quicksand"
                  >
                    {s.icon} {s.name}
                  </button>
                ))}
              </div>
            )}
          </div>
        )}
      </div>

      {/* Suggestions rapides (changer le plat principal) */}
      {mainSuggestions.length > 0 && (
        <div className="px-4 space-y-2">
          <p className="font-dosis font-semibold text-sm text-[var(--kkb-text-primary)]">
            ✨ Suggestions rapides
          </p>
          <div className="flex gap-2 overflow-x-auto hide-scrollbar pb-1">
            {mainSuggestions.map(s => (
              <button
                key={s.id}
                type="button"
                onClick={() => onPickMainSuggestion(s.id)}
                className="shrink-0 w-32 bg-white border border-[var(--kkb-border)] rounded-[var(--kkb-radius-sm)] p-2 text-left"
              >
                <div className="h-14 w-full rounded-[6px] bg-[var(--kkb-coral-light)] flex items-center justify-center text-2xl mb-1.5">
                  {s.icon}
                </div>
                <p className="font-dosis font-semibold text-xs text-[var(--kkb-text-primary)] truncate">{s.name}</p>
                {s.prepTimeMin && (
                  <p className="text-[10px] font-quicksand text-[var(--kkb-text-tertiary)]">{s.prepTimeMin} min</p>
                )}
                <span className="text-[11px] font-quicksand font-semibold text-[var(--kkb-coral)]">+ Choisir</span>
              </button>
            ))}
          </div>
        </div>
      )}
    </div>
  )
}

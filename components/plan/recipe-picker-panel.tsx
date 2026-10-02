'use client'

import { Clock, Loader2, PlusCircle, Search, Utensils, Wine, X } from 'lucide-react'
import { SCOPE_OPTIONS, type RecipeScope } from '@/lib/constants/recipe-scope'
import { CompositionMultiSelect, type CompositionChip } from '@/components/plan/composition-multiselect'

interface PickerRecipe {
  id:            string
  name:          string
  visibility:    string
  prep_time_min: number | null
  categories:    { icon: string | null } | null
}

interface Category {
  id:   string
  name: string
  icon: string | null
}

interface MultiSelectBundle {
  chips:          CompositionChip[]
  removingId:     string | null
  onRemove:       (compId: string) => void
  open:           boolean
  onToggleOpen:   () => void
  search:         string
  onSearchChange: (v: string) => void
  scope:          RecipeScope
  onScopeChange:  (s: RecipeScope) => void
  categories:     Category[]
  categoryId:     string | null
  onCategoryChange: (id: string | null) => void
  recipes:        PickerRecipe[]
  loading:        boolean
  togglingId:     string | null
  onToggleRecipe: (recipe: PickerRecipe) => void
}

interface RecipePickerPanelProps {
  title:    string
  subtitle: string
  onClose:  () => void

  search:          string
  onSearchChange:  (v: string) => void
  scope:           RecipeScope
  onScopeChange:   (s: RecipeScope) => void
  categories:      Category[]
  categoryId:      string | null
  onCategoryChange: (id: string | null) => void
  recipes:         PickerRecipe[]
  loading:         boolean
  picking:         boolean
  onPick:          (recipe: PickerRecipe) => void

  showCompositions: boolean
  side?:  MultiSelectBundle
  drink?: MultiSelectBundle

  onCreateCustom: () => void
}

export function RecipePickerPanel({
  title, subtitle, onClose,
  search, onSearchChange, scope, onScopeChange, categories, categoryId, onCategoryChange,
  recipes, loading, picking, onPick,
  showCompositions, side, drink, onCreateCustom,
}: RecipePickerPanelProps) {
  return (
    <div className="flex flex-col max-h-full">
      <div className="flex items-start justify-between px-4 pt-4 pb-2 flex-shrink-0">
        <div>
          <p className="font-dosis font-bold text-base text-[var(--kkb-text-primary)]">{title}</p>
          <p className="text-xs font-quicksand text-[var(--kkb-text-secondary)] mt-0.5">{subtitle}</p>
        </div>
        <button type="button" onClick={onClose} aria-label="Fermer le panneau" className="p-1.5 -mr-1 text-[var(--kkb-text-tertiary)] hover:text-[var(--kkb-text-primary)] transition-colors">
          <X className="h-5 w-5" />
        </button>
      </div>

      <div className="px-4 pb-2 flex-shrink-0">
        <div className="flex items-center gap-2 bg-[var(--kkb-coral-light)] border border-[var(--kkb-border)] rounded-xl px-3 py-2">
          <Search className="h-4 w-4 text-[var(--kkb-text-tertiary)] flex-shrink-0" />
          <input
            type="search"
            placeholder="Rechercher une recette…"
            aria-label="Chercher une recette"
            value={search}
            onChange={e => onSearchChange(e.target.value)}
            className="flex-1 bg-transparent text-sm font-quicksand text-[var(--kkb-text-primary)] placeholder:text-[var(--kkb-text-tertiary)] outline-none"
          />
        </div>
      </div>

      <div className="flex gap-1.5 px-4 pb-2 overflow-x-auto hide-scrollbar flex-shrink-0">
        {SCOPE_OPTIONS.map(opt => (
          <button
            key={opt.val}
            type="button"
            onClick={() => onScopeChange(opt.val)}
            className={`flex-shrink-0 px-3 py-1 rounded-full text-[11px] font-quicksand font-bold transition-colors ${
              scope === opt.val ? 'bg-[var(--kkb-coral)] text-white' : 'bg-[var(--kkb-coral-light)] text-[var(--kkb-text-secondary)] border border-[var(--kkb-border)]'
            }`}
          >
            {opt.label}
          </button>
        ))}
      </div>

      {categories.length > 0 && (
        <div className="flex gap-1.5 px-4 pb-2 overflow-x-auto hide-scrollbar flex-shrink-0">
          <button
            type="button"
            onClick={() => onCategoryChange(null)}
            className={`flex-shrink-0 px-3 py-1 rounded-full text-[11px] font-quicksand font-bold transition-colors ${
              categoryId === null ? 'bg-[var(--kkb-coral)] text-white' : 'bg-[var(--kkb-coral-light)] text-[var(--kkb-text-secondary)] border border-[var(--kkb-border)]'
            }`}
          >
            Tous
          </button>
          {categories.map(cat => (
            <button
              key={cat.id}
              type="button"
              onClick={() => onCategoryChange(cat.id)}
              className={`flex-shrink-0 px-3 py-1 rounded-full text-[11px] font-quicksand font-bold transition-colors ${
                categoryId === cat.id ? 'bg-[var(--kkb-coral)] text-white' : 'bg-[var(--kkb-coral-light)] text-[var(--kkb-text-secondary)] border border-[var(--kkb-border)]'
              }`}
            >
              {cat.icon} {cat.name}
            </button>
          ))}
        </div>
      )}

      <div className="border-t border-[var(--kkb-border)] flex-shrink-0" />

      <div className="overflow-y-auto flex-1">
        {loading ? (
          <div className="flex justify-center py-8">
            <Loader2 className="h-5 w-5 text-[var(--kkb-coral)] animate-spin" />
          </div>
        ) : recipes.length === 0 ? (
          <p className="text-sm font-quicksand text-[var(--kkb-text-tertiary)] text-center py-8">
            {search ? 'Aucune recette trouvée' : 'Aucune recette disponible'}
          </p>
        ) : (
          recipes.map(recipe => (
            <button
              key={recipe.id}
              type="button"
              disabled={picking}
              onClick={() => onPick(recipe)}
              className="w-full flex items-center gap-3 px-4 py-3 border-b border-[var(--kkb-border)]/40 last:border-0 hover:bg-[var(--kkb-coral-light)] transition-colors disabled:opacity-50"
            >
              <span className="text-xl flex-shrink-0">{recipe.categories?.icon ?? '🍴'}</span>
              <div className="flex-1 min-w-0 text-left">
                <p className="text-sm font-quicksand font-medium text-[var(--kkb-text-primary)] truncate">{recipe.name}</p>
                {recipe.prep_time_min && (
                  <div className="flex items-center gap-1 mt-0.5">
                    <Clock className="h-3 w-3 text-[var(--kkb-text-tertiary)]" />
                    <span className="text-[11px] font-quicksand text-[var(--kkb-text-secondary)]">{recipe.prep_time_min} min</span>
                  </div>
                )}
              </div>
              {recipe.visibility !== 'private' && (
                <span className={`text-[10px] font-quicksand font-bold uppercase tracking-wider px-1.5 py-0.5 rounded-full flex-shrink-0 ${
                  recipe.visibility === 'circle' ? 'bg-[var(--kkb-warning-light)] text-[var(--kkb-warning)]' : 'bg-emerald-50 text-emerald-600'
                }`}>
                  {recipe.visibility === 'circle' ? 'Cercle' : 'Commun.'}
                </span>
              )}
            </button>
          ))
        )}

        {showCompositions && side && (
          <CompositionMultiSelect icon={<Utensils className="h-3.5 w-3.5" />} label="ACCOMPAGNEMENT(S)" {...side} />
        )}
        {showCompositions && drink && (
          <CompositionMultiSelect icon={<Wine className="h-3.5 w-3.5" />} label="BOISSON(S) MAISON" {...drink} />
        )}

        <div className="px-4 py-3 pb-6">
          <button
            type="button"
            onClick={onCreateCustom}
            className="w-full flex items-center gap-3 px-4 py-3 border-2 border-dashed border-[var(--kkb-coral)]/40 rounded-xl hover:bg-[var(--kkb-coral-light)] transition-colors group"
          >
            <PlusCircle className="h-5 w-5 text-[var(--kkb-text-tertiary)] group-hover:text-[var(--kkb-coral)] transition-colors" />
            <span className="text-sm font-quicksand text-[var(--kkb-text-tertiary)] group-hover:text-[var(--kkb-coral)] transition-colors">
              Créer un repas personnalisé…
            </span>
          </button>
        </div>
      </div>

      <div className="flex items-center gap-2 px-4 py-3 border-t border-[var(--kkb-border)] flex-shrink-0">
        <button type="button" onClick={onClose} className="flex-1 rounded-xl border border-[var(--kkb-border)] text-[var(--kkb-text-secondary)] font-quicksand font-semibold text-sm py-2.5">
          Annuler
        </button>
        <button type="button" onClick={onClose} className="flex-1 rounded-xl bg-[var(--kkb-coral)] text-white font-quicksand font-bold text-sm py-2.5">
          Valider
        </button>
      </div>
    </div>
  )
}

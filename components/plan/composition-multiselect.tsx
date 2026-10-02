'use client'

import { Loader2, Search, UtensilsCrossed, X } from 'lucide-react'
import { SCOPE_OPTIONS, type RecipeScope } from '@/lib/constants/recipe-scope'
import { FramedPhoto } from '@/components/home/framed-photo'

export interface CompositionChip {
  id:       string
  recipeId: string
  name:     string
}

interface MultiSelectRecipe {
  id:            string
  name:          string
  visibility:    string
  photo_url:     string | null
  prep_time_min: number | null
  categories:    { icon: string | null } | null
}

interface Category {
  id:   string
  name: string
  icon: string | null
}

// Contenu d'une section accompagnement/boisson — pas de collapsible propre,
// la section englobante (PickerSection, recipe-picker-panel.tsx) gère déjà
// l'ouverture/fermeture ; ce composant affiche directement puces + recherche
// + filtres + liste à cocher dès que la section parente est ouverte.
interface CompositionMultiSelectProps {
  chips:         CompositionChip[]
  onRemove:      (compId: string) => void
  removingId:    string | null
  search:        string
  onSearchChange: (v: string) => void
  scope:         RecipeScope
  onScopeChange: (s: RecipeScope) => void
  categories:    Category[]
  categoryId:    string | null
  onCategoryChange: (id: string | null) => void
  recipes:       MultiSelectRecipe[]
  loading:       boolean
  onToggleRecipe: (recipe: MultiSelectRecipe) => void
  togglingId?:   string | null
}

export function CompositionMultiSelect({
  chips, onRemove, removingId,
  search, onSearchChange, scope, onScopeChange, categories, categoryId, onCategoryChange,
  recipes, loading, onToggleRecipe, togglingId,
}: CompositionMultiSelectProps) {
  const selectedIds = chips.map(c => c.recipeId)

  return (
    <div className="space-y-2">
      {chips.length > 0 && (
        <div className="flex flex-wrap gap-1.5">
          {chips.map(chip => (
            <span key={chip.id} className="inline-flex items-center gap-1 bg-[var(--kkb-coral-light)] text-[var(--kkb-coral)] rounded-full pl-2.5 pr-1.5 py-1 text-xs font-quicksand font-medium">
              {chip.name}
              <button type="button" onClick={() => onRemove(chip.id)} disabled={removingId === chip.id} aria-label={`Retirer ${chip.name}`}>
                {removingId === chip.id ? <Loader2 className="h-3 w-3 animate-spin" /> : <X className="h-3 w-3" />}
              </button>
            </span>
          ))}
        </div>
      )}

      <div className="flex items-center gap-2 bg-white border border-[var(--kkb-border)] rounded-lg px-2.5 py-1.5">
        <Search className="h-3.5 w-3.5 text-[var(--kkb-text-tertiary)] shrink-0" />
        <input
          type="search"
          value={search}
          onChange={e => onSearchChange(e.target.value)}
          placeholder="Rechercher…"
          className="flex-1 bg-transparent text-xs font-quicksand text-[var(--kkb-text-primary)] placeholder:text-[var(--kkb-text-tertiary)] outline-none"
        />
      </div>

      <div className="flex gap-1.5 overflow-x-auto hide-scrollbar">
        {SCOPE_OPTIONS.map(opt => (
          <button
            key={opt.val}
            type="button"
            onClick={() => onScopeChange(opt.val)}
            className={`flex-shrink-0 px-2.5 py-1 rounded-full text-[10px] font-quicksand font-bold transition-colors ${
              scope === opt.val ? 'bg-[var(--kkb-coral)] text-white' : 'bg-[var(--kkb-bg)] text-[var(--kkb-text-secondary)] border border-[var(--kkb-border)]'
            }`}
          >
            {opt.label}
          </button>
        ))}
      </div>

      {categories.length > 0 && (
        <div className="flex gap-1.5 overflow-x-auto hide-scrollbar">
          <button
            type="button"
            onClick={() => onCategoryChange(null)}
            className={`flex-shrink-0 px-2.5 py-1 rounded-full text-[10px] font-quicksand font-bold transition-colors ${
              categoryId === null ? 'bg-[var(--kkb-coral)] text-white' : 'bg-[var(--kkb-bg)] text-[var(--kkb-text-secondary)] border border-[var(--kkb-border)]'
            }`}
          >
            Toutes
          </button>
          {categories.map(cat => (
            <button
              key={cat.id}
              type="button"
              onClick={() => onCategoryChange(cat.id)}
              className={`flex-shrink-0 px-2.5 py-1 rounded-full text-[10px] font-quicksand font-bold transition-colors ${
                categoryId === cat.id ? 'bg-[var(--kkb-coral)] text-white' : 'bg-[var(--kkb-bg)] text-[var(--kkb-text-secondary)] border border-[var(--kkb-border)]'
              }`}
            >
              {cat.icon} {cat.name}
            </button>
          ))}
        </div>
      )}

      <div className="max-h-48 overflow-y-auto space-y-1 bg-[var(--kkb-bg)] rounded-xl p-1.5">
        {loading ? (
          <div className="flex justify-center py-3">
            <Loader2 className="h-4 w-4 text-[var(--kkb-coral)] animate-spin" />
          </div>
        ) : recipes.length === 0 ? (
          <p className="text-xs font-quicksand text-[var(--kkb-text-tertiary)] text-center py-2">Aucune recette</p>
        ) : (
          recipes.map(recipe => {
            const checked = selectedIds.includes(recipe.id)
            return (
              <button
                key={recipe.id}
                type="button"
                disabled={togglingId === recipe.id}
                onClick={() => onToggleRecipe(recipe)}
                className="w-full flex items-center gap-2 px-2 py-1.5 rounded-lg hover:bg-white transition-colors disabled:opacity-50"
              >
                <span className={`h-4 w-4 rounded border flex items-center justify-center shrink-0 ${
                  checked ? 'bg-[var(--kkb-coral)] border-[var(--kkb-coral)]' : 'border-[var(--kkb-border)] bg-white'
                }`}>
                  {checked && <span className="h-1.5 w-1.5 rounded-sm bg-white" />}
                </span>
                <div className="relative h-7 w-7 rounded-md overflow-hidden shrink-0 bg-white">
                  {recipe.photo_url
                    ? <FramedPhoto src={recipe.photo_url} alt={recipe.name} />
                    : <div className="h-full w-full flex items-center justify-center"><UtensilsCrossed className="h-3.5 w-3.5 text-[var(--kkb-coral)]" /></div>}
                </div>
                <span className="flex-1 min-w-0 text-left text-xs font-quicksand font-medium text-[var(--kkb-text-primary)] truncate">
                  {recipe.name}
                </span>
                {togglingId === recipe.id && <Loader2 className="h-3.5 w-3.5 text-[var(--kkb-coral)] animate-spin shrink-0" />}
              </button>
            )
          })
        )}
      </div>
    </div>
  )
}

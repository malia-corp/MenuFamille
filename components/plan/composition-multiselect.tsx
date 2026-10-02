'use client'

import type { ReactNode } from 'react'
import { ChevronDown, ChevronUp, Loader2, Plus, Search, X } from 'lucide-react'
import { SCOPE_OPTIONS, type RecipeScope } from '@/lib/constants/recipe-scope'

export interface CompositionChip {
  id:       string
  recipeId: string
  name:     string
}

interface MultiSelectRecipe {
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

interface CompositionMultiSelectProps {
  icon:          ReactNode
  label:         string // "ACCOMPAGNEMENT(S)"
  chips:         CompositionChip[]
  onRemove:      (compId: string) => void
  removingId:    string | null
  open:          boolean
  onToggleOpen:  () => void
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
  icon, label, chips, onRemove, removingId, open, onToggleOpen,
  search, onSearchChange, scope, onScopeChange, categories, categoryId, onCategoryChange,
  recipes, loading, onToggleRecipe, togglingId,
}: CompositionMultiSelectProps) {
  const selectedIds = chips.map(c => c.recipeId)

  return (
    <div className="px-4 py-3 border-t border-[var(--kkb-border)]/50">
      <div className="flex items-center justify-between mb-2">
        <span className="flex items-center gap-1.5 text-[10px] font-quicksand font-bold uppercase tracking-wide text-[var(--kkb-text-secondary)]">
          {icon} {label}
        </span>
        <span className="text-[10px] font-quicksand text-[var(--kkb-text-tertiary)]">Choix multiples</span>
      </div>

      <div className="flex flex-wrap gap-1.5 mb-2">
        {chips.map(chip => (
          <span key={chip.id} className="inline-flex items-center gap-1 bg-[var(--kkb-coral-light)] text-[var(--kkb-coral)] rounded-full pl-2.5 pr-1.5 py-1 text-xs font-quicksand font-medium">
            {chip.name}
            <button type="button" onClick={() => onRemove(chip.id)} disabled={removingId === chip.id} aria-label={`Retirer ${chip.name}`}>
              {removingId === chip.id ? <Loader2 className="h-3 w-3 animate-spin" /> : <X className="h-3 w-3" />}
            </button>
          </span>
        ))}

        <button
          type="button"
          onClick={onToggleOpen}
          className="flex items-center gap-1 text-xs font-quicksand font-semibold text-[var(--kkb-coral)] rounded-full border border-dashed border-[var(--kkb-coral)]/40 px-2.5 py-1"
        >
          <Plus className="h-3 w-3" /> Ajouter
          {open ? <ChevronUp className="h-3 w-3" /> : <ChevronDown className="h-3 w-3" />}
        </button>
      </div>

      {open && (
        <div className="bg-[var(--kkb-bg)] rounded-xl p-2.5 space-y-2">
          <div className="flex items-center gap-2 bg-white border border-[var(--kkb-border)] rounded-lg px-2.5 py-1.5">
            <Search className="h-3.5 w-3.5 text-[var(--kkb-text-tertiary)] shrink-0" />
            <input
              type="search"
              value={search}
              onChange={e => onSearchChange(e.target.value)}
              placeholder={`Rechercher...`}
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
                  scope === opt.val ? 'bg-[var(--kkb-coral)] text-white' : 'bg-white text-[var(--kkb-text-secondary)] border border-[var(--kkb-border)]'
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
                  categoryId === null ? 'bg-[var(--kkb-coral)] text-white' : 'bg-white text-[var(--kkb-text-secondary)] border border-[var(--kkb-border)]'
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
                    categoryId === cat.id ? 'bg-[var(--kkb-coral)] text-white' : 'bg-white text-[var(--kkb-text-secondary)] border border-[var(--kkb-border)]'
                  }`}
                >
                  {cat.icon} {cat.name}
                </button>
              ))}
            </div>
          )}

          <div className="max-h-48 overflow-y-auto space-y-1">
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
                    <span className="text-sm shrink-0">{recipe.categories?.icon ?? '🍴'}</span>
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
      )}
    </div>
  )
}

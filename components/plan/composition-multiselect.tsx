'use client'

import { Check, Loader2, Search, UtensilsCrossed, X } from 'lucide-react'
import { SCOPE_OPTIONS, type RecipeScope } from '@/lib/constants/recipe-scope'
import { categoryIcon } from '@/lib/constants/category-icon'
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
  id:    string
  name:  string
  slug?: string
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

const pill = (active: boolean) =>
  `flex h-8 shrink-0 items-center gap-1 whitespace-nowrap rounded-full px-3 font-quicksand text-xs font-bold transition-colors ${
    active ? 'bg-[var(--kkb-foret)] text-[var(--kkb-creme)]' : 'bg-white text-[var(--kkb-texte-2)] hover:text-[var(--kkb-foret)]'
  }`

export function CompositionMultiSelect({
  chips, onRemove, removingId,
  search, onSearchChange, scope, onScopeChange, categories, categoryId, onCategoryChange,
  recipes, loading, onToggleRecipe, togglingId,
}: CompositionMultiSelectProps) {
  const selectedIds = chips.map(c => c.recipeId)

  return (
    <div className="space-y-2.5">
      {chips.length > 0 && (
        <div className="flex flex-wrap gap-1.5">
          {chips.map(chip => (
            <span key={chip.id} className="inline-flex items-center gap-1 rounded-full bg-[var(--kkb-foret-50)] py-1 pl-3 pr-1.5 font-quicksand text-xs font-bold text-[var(--kkb-foret)]">
              {chip.name}
              <button type="button" onClick={() => onRemove(chip.id)} disabled={removingId === chip.id} aria-label={`Retirer ${chip.name}`}
                className="flex h-5 w-5 items-center justify-center rounded-full hover:bg-white">
                {removingId === chip.id ? <Loader2 className="h-3 w-3 animate-spin" /> : <X className="h-3 w-3" />}
              </button>
            </span>
          ))}
        </div>
      )}

      <div className="flex h-10 items-center gap-2 rounded-full bg-white px-3.5 ring-[var(--kkb-foret-300)] focus-within:ring-2">
        <Search className="h-4 w-4 shrink-0 text-[var(--kkb-texte-2)]" />
        <input
          type="search"
          value={search}
          onChange={e => onSearchChange(e.target.value)}
          placeholder="Rechercher…"
          aria-label="Rechercher une recette"
          className="flex-1 bg-transparent font-quicksand text-sm text-[var(--kkb-profond)] outline-none placeholder:text-[var(--kkb-texte-2)]"
        />
      </div>

      <div className="flex gap-1.5 overflow-x-auto hide-scrollbar">
        {SCOPE_OPTIONS.map(opt => (
          <button key={opt.val} type="button" onClick={() => onScopeChange(opt.val)} className={pill(scope === opt.val)}>
            {opt.label}
          </button>
        ))}
      </div>

      {categories.length > 0 && (
        <div className="flex gap-1.5 overflow-x-auto hide-scrollbar">
          <button type="button" onClick={() => onCategoryChange(null)} className={pill(categoryId === null)}>Toutes</button>
          {categories.map(cat => {
            const Icon = categoryIcon(cat.slug)
            return (
              <button key={cat.id} type="button" onClick={() => onCategoryChange(cat.id)} className={pill(categoryId === cat.id)}>
                <Icon className="h-3.5 w-3.5" /> {cat.name}
              </button>
            )
          })}
        </div>
      )}

      <div className="max-h-52 space-y-0.5 overflow-y-auto rounded-[var(--kkb-r-lg)] bg-white p-1.5">
        {loading ? (
          <div className="flex justify-center py-4">
            <Loader2 className="h-4 w-4 animate-spin text-[var(--kkb-foret)]" />
          </div>
        ) : recipes.length === 0 ? (
          <p className="py-3 text-center font-quicksand text-xs text-[var(--kkb-texte-2)]">Aucune recette</p>
        ) : (
          recipes.map(recipe => {
            const checked = selectedIds.includes(recipe.id)
            return (
              <button
                key={recipe.id}
                type="button"
                disabled={togglingId === recipe.id}
                onClick={() => onToggleRecipe(recipe)}
                aria-pressed={checked}
                className={`flex w-full items-center gap-2.5 rounded-[var(--kkb-r-md)] px-2 py-1.5 transition-colors disabled:opacity-50 ${checked ? 'bg-[var(--kkb-foret-50)]' : 'hover:bg-[var(--kkb-creme)]'}`}
              >
                <span className={`flex h-5 w-5 shrink-0 items-center justify-center rounded-full border-[1.5px] ${
                  checked ? 'border-[var(--kkb-foret)] bg-[var(--kkb-foret)] text-[var(--kkb-creme)]' : 'border-[var(--kkb-filet)] bg-white'
                }`}>
                  {checked && <Check className="h-3 w-3" />}
                </span>
                <div className="relative h-8 w-8 shrink-0 overflow-hidden rounded-[var(--kkb-r-sm)] bg-[var(--kkb-creme)]">
                  {recipe.photo_url
                    ? <FramedPhoto src={recipe.photo_url} alt={recipe.name} />
                    : <div className="flex h-full w-full items-center justify-center"><UtensilsCrossed className="h-3.5 w-3.5 text-[var(--kkb-foret-500)]" /></div>}
                </div>
                <span className="min-w-0 flex-1 truncate text-left font-quicksand text-sm font-semibold text-[var(--kkb-profond)]">
                  {recipe.name}
                </span>
                {togglingId === recipe.id && <Loader2 className="h-3.5 w-3.5 shrink-0 animate-spin text-[var(--kkb-foret)]" />}
              </button>
            )
          })
        )}
      </div>
    </div>
  )
}

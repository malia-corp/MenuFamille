'use client'

import { useState } from 'react'
import { Check, ChefHat, ChevronDown, Clock, CupSoda, Loader2, PenLine, Salad, Search, UtensilsCrossed, X } from 'lucide-react'
import { MEAL_COLOR, type MealType } from '@/lib/constants/meal-type'
import { MealTypeIcon } from '@/components/ui/meal-type-icon'
import { SCOPE_OPTIONS, type RecipeScope } from '@/lib/constants/recipe-scope'
import { categoryIcon } from '@/lib/constants/category-icon'
import { CompositionMultiSelect, type CompositionChip } from '@/components/plan/composition-multiselect'
import { FramedPhoto } from '@/components/home/framed-photo'

interface PickerRecipe {
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

interface MultiSelectBundle {
  chips:          CompositionChip[]
  removingId:     string | null
  onRemove:       (compId: string) => void
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
  mealType?: MealType // icône affichée devant le sous-titre
  onClose:  () => void

  currentRecipeName: string | null
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

type SectionKey = 'main' | 'side' | 'drink'

const VISIBILITY_TAG: Record<string, string> = { circle: 'Famille', community: 'Communauté' }

const pill = (active: boolean) =>
  `flex h-8 shrink-0 items-center gap-1 whitespace-nowrap rounded-full px-3 font-quicksand text-xs font-bold transition-colors ${
    active ? 'bg-[var(--kkb-foret)] text-[var(--kkb-creme)]' : 'bg-white text-[var(--kkb-texte-2)] hover:text-[var(--kkb-foret)]'
  }`

// Étape du choix : plat principal, accompagnements, boissons. L'en-tête
// résume le choix fait, le contenu s'ouvre à la demande.
function PickerSection({ icon, title, summary, done, disabled, open, onToggle, children }: {
  icon:     React.ReactNode
  title:    string
  summary:  string
  done?:    boolean
  disabled?: boolean
  open:     boolean
  onToggle: () => void
  children: React.ReactNode
}) {
  return (
    <div className={`rounded-[var(--kkb-r-lg)] transition-colors ${open ? 'bg-[var(--kkb-lin)]/50' : ''}`}>
      <button
        type="button"
        onClick={onToggle}
        disabled={disabled}
        aria-expanded={open}
        className="flex w-full items-center gap-3 px-3 py-3 text-left disabled:opacity-50"
      >
        <span className={`flex h-9 w-9 shrink-0 items-center justify-center rounded-full ${done ? 'bg-[var(--kkb-sauge)] text-[var(--kkb-profond)]' : 'bg-white text-[var(--kkb-foret)]'}`}>
          {done ? <Check className="h-4 w-4" /> : icon}
        </span>
        <span className="min-w-0 flex-1">
          <span className="block font-quicksand text-sm font-bold text-[var(--kkb-profond)]">{title}</span>
          <span className="block truncate font-quicksand text-xs text-[var(--kkb-texte-2)]">{summary}</span>
        </span>
        {!disabled && <ChevronDown className={`h-4 w-4 shrink-0 text-[var(--kkb-texte-2)] transition-transform ${open ? 'rotate-180' : ''}`} />}
      </button>
      {open && !disabled && <div className="px-3 pb-3">{children}</div>}
    </div>
  )
}

export function RecipePickerPanel({
  title, subtitle, mealType, onClose, currentRecipeName,
  search, onSearchChange, scope, onScopeChange, categories, categoryId, onCategoryChange,
  recipes, loading, picking, onPick,
  showCompositions, side, drink, onCreateCustom,
}: RecipePickerPanelProps) {
  const [activeSection, setActiveSection] = useState<SectionKey | null>('main')

  function toggle(section: SectionKey) {
    setActiveSection(s => s === section ? null : section)
  }

  function handlePick(recipe: PickerRecipe) {
    onPick(recipe)
    setActiveSection('side')
  }

  const needMain     = 'Choisis d’abord le plat principal'
  const sideSummary  = side  ? (side.chips.length  ? side.chips.map(c => c.name).join(', ')  : 'Aucun pour l’instant') : needMain
  const drinkSummary = drink ? (drink.chips.length ? drink.chips.map(c => c.name).join(', ') : 'Aucune pour l’instant') : needMain
  const color = mealType ? MEAL_COLOR[mealType] : null

  return (
    <div className="flex max-h-full min-h-0 flex-col">
      <div className="flex flex-shrink-0 items-start gap-3 px-4 pb-3 pt-4">
        {mealType && color && (
          <span className="flex h-11 w-11 shrink-0 items-center justify-center rounded-full" style={{ backgroundColor: color.bg, color: color.text }}>
            <MealTypeIcon type={mealType} className="h-5 w-5" />
          </span>
        )}
        <div className="min-w-0 flex-1">
          <p className="text-h3 text-[var(--kkb-profond)]">{title}</p>
          <p className="mt-0.5 font-quicksand text-sm text-[var(--kkb-texte-2)]">{subtitle}</p>
        </div>
        <button type="button" onClick={onClose} aria-label="Fermer le panneau" className="-mr-1 flex h-9 w-9 shrink-0 items-center justify-center rounded-full text-[var(--kkb-texte-2)] transition-colors hover:bg-[var(--kkb-creme)] hover:text-[var(--kkb-profond)]">
          <X className="h-5 w-5" />
        </button>
      </div>

      <div className="min-h-0 flex-1 space-y-1 overflow-y-auto px-2 pb-2">
        <PickerSection
          icon={<ChefHat className="h-4 w-4" />}
          title="Plat principal"
          summary={currentRecipeName ?? 'À choisir'}
          done={!!currentRecipeName}
          open={activeSection === 'main'}
          onToggle={() => toggle('main')}
        >
          <div className="space-y-2.5">
            <div className="flex h-10 items-center gap-2 rounded-full bg-white px-3.5 ring-[var(--kkb-foret-300)] focus-within:ring-2">
              <Search className="h-4 w-4 flex-shrink-0 text-[var(--kkb-texte-2)]" />
              <input
                type="search"
                placeholder="Rechercher une recette…"
                aria-label="Chercher une recette"
                value={search}
                onChange={e => onSearchChange(e.target.value)}
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

            <div className="max-h-72 space-y-0.5 overflow-y-auto rounded-[var(--kkb-r-lg)] bg-white p-1.5">
              {loading ? (
                <div className="flex justify-center py-8">
                  <Loader2 className="h-5 w-5 animate-spin text-[var(--kkb-foret)]" />
                </div>
              ) : recipes.length === 0 ? (
                <p className="py-8 text-center font-quicksand text-sm text-[var(--kkb-texte-2)]">
                  {search ? 'Aucune recette trouvée' : 'Aucune recette disponible'}
                </p>
              ) : (
                recipes.map(recipe => {
                  const current = recipe.name === currentRecipeName
                  return (
                    <button
                      key={recipe.id}
                      type="button"
                      disabled={picking}
                      onClick={() => handlePick(recipe)}
                      aria-pressed={current}
                      className={`flex w-full items-center gap-3 rounded-[var(--kkb-r-md)] px-2 py-2 text-left transition-colors disabled:opacity-50 ${current ? 'bg-[var(--kkb-foret-50)]' : 'hover:bg-[var(--kkb-creme)]'}`}
                    >
                      <div className="relative h-11 w-11 shrink-0 overflow-hidden rounded-[var(--kkb-r-md)] bg-[var(--kkb-creme)]">
                        {recipe.photo_url
                          ? <FramedPhoto src={recipe.photo_url} alt={recipe.name} />
                          : <div className="flex h-full w-full items-center justify-center"><UtensilsCrossed className="h-5 w-5 text-[var(--kkb-foret-500)]" /></div>}
                      </div>
                      <div className="min-w-0 flex-1">
                        <p className="truncate font-quicksand text-sm font-bold text-[var(--kkb-profond)]">{recipe.name}</p>
                        <p className="mt-0.5 flex items-center gap-2 font-quicksand text-xs text-[var(--kkb-texte-2)]">
                          {recipe.prep_time_min && <span className="inline-flex items-center gap-1 tabular-nums"><Clock className="h-3 w-3" />{recipe.prep_time_min} min</span>}
                          {VISIBILITY_TAG[recipe.visibility] && <span>{VISIBILITY_TAG[recipe.visibility]}</span>}
                        </p>
                      </div>
                      {current && <Check className="h-4 w-4 shrink-0 text-[var(--kkb-foret-500)]" />}
                    </button>
                  )
                })
              )}
            </div>
          </div>
        </PickerSection>

        {showCompositions && (
          <PickerSection
            icon={<Salad className="h-4 w-4" />}
            title="Accompagnements"
            summary={sideSummary}
            done={!!side?.chips.length}
            disabled={!side}
            open={activeSection === 'side'}
            onToggle={() => toggle('side')}
          >
            {side && <CompositionMultiSelect {...side} />}
          </PickerSection>
        )}

        {showCompositions && (
          <PickerSection
            icon={<CupSoda className="h-4 w-4" />}
            title="Boissons maison"
            summary={drinkSummary}
            done={!!drink?.chips.length}
            disabled={!drink}
            open={activeSection === 'drink'}
            onToggle={() => toggle('drink')}
          >
            {drink && <CompositionMultiSelect {...drink} />}
          </PickerSection>
        )}

        <button
          type="button"
          onClick={onCreateCustom}
          className="mx-1 mt-2 flex w-[calc(100%-8px)] items-center gap-3 rounded-[var(--kkb-r-lg)] border-[1.5px] border-dashed border-[var(--kkb-foret-300)] px-3 py-3 text-left transition-colors hover:bg-[var(--kkb-foret-50)]"
        >
          <span className="flex h-9 w-9 shrink-0 items-center justify-center rounded-full bg-[var(--kkb-foret-50)] text-[var(--kkb-foret)]"><PenLine className="h-4 w-4" /></span>
          <span>
            <span className="block font-quicksand text-sm font-bold text-[var(--kkb-foret)]">Créer une nouvelle recette</span>
            <span className="block font-quicksand text-xs text-[var(--kkb-texte-2)]">Elle prendra directement sa place ici</span>
          </span>
        </button>
      </div>

      {/* Chaque choix est enregistré aussitôt : un seul bouton pour refermer */}
      <div className="flex flex-shrink-0 items-center gap-3 border-t border-[var(--kkb-lin)] px-4 py-3">
        <p className="min-w-0 flex-1 font-quicksand text-xs text-[var(--kkb-texte-2)]">Tes choix sont enregistrés au fur et à mesure.</p>
        <button type="button" onClick={onClose} className="h-11 shrink-0 rounded-full bg-[var(--kkb-foret)] px-6 font-quicksand text-sm font-bold text-[var(--kkb-creme)] transition-colors hover:bg-[var(--kkb-foret-900)]">
          Terminé
        </button>
      </div>
    </div>
  )
}

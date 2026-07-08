'use client'

import { useEffect, useRef, useState } from 'react'
import { useRouter } from 'next/navigation'
import { ChevronLeft, ChevronRight, Search, Settings, X } from 'lucide-react'

// ─── Types ──────────────────────────────────────────────────────────────────

type MealType = 'petit_dejeuner' | 'dejeuner' | 'gouter' | 'diner'
type DayOfWeek = 'lundi' | 'mardi' | 'mercredi' | 'jeudi' | 'vendredi' | 'samedi' | 'dimanche'

interface MealConfig {
  meal_type: MealType
  is_active: boolean
  mode: 'daily' | 'template'
  display_order: number
}

interface PlanItem {
  id: string
  day_of_week: DayOfWeek
  meal_type: MealType
  applies_all_days: boolean
  recipes: { id: string; name: string; categories: { icon: string | null } | null } | null
}

interface Plan {
  id: string
  week_start: string
  status: string
  meal_plan_items: PlanItem[]
}

interface Recipe {
  id: string
  name: string
  categories: { id: string; icon: string | null } | null
}

interface Category {
  id: string
  name: string
  icon: string | null
}

// ─── Constantes ─────────────────────────────────────────────────────────────

const DAYS: DayOfWeek[] = ['lundi', 'mardi', 'mercredi', 'jeudi', 'vendredi', 'samedi', 'dimanche']
const DAY_SHORT: Record<DayOfWeek, string> = {
  lundi: 'Lun', mardi: 'Mar', mercredi: 'Mer', jeudi: 'Jeu',
  vendredi: 'Ven', samedi: 'Sam', dimanche: 'Dim',
}
const MEAL_LABEL: Record<MealType, string> = {
  petit_dejeuner: 'Matin', dejeuner: 'Déjeuner', gouter: 'Goûter', diner: 'Dîner',
}
const MEAL_EMOJI: Record<MealType, string> = {
  petit_dejeuner: '☕', dejeuner: '🍽', gouter: '🍎', diner: '🌙',
}

// ─── Helpers ─────────────────────────────────────────────────────────────────

function getMondayISO(d: Date = new Date()): string {
  const day = d.getDay()
  const diff = day === 0 ? -6 : 1 - day
  const monday = new Date(d)
  monday.setDate(d.getDate() + diff)
  return monday.toISOString().split('T')[0]
}

function formatWeekLabel(weekStart: string): string {
  const start = new Date(weekStart + 'T00:00:00')
  const end = new Date(start)
  end.setDate(start.getDate() + 6)
  const fmtDay = (d: Date) =>
    d.toLocaleDateString('fr-FR', { day: 'numeric', month: 'short' })
  return `${fmtDay(start)} – ${fmtDay(end)}`
}

function shiftWeekISO(weekStart: string, delta: number): string {
  const d = new Date(weekStart + 'T00:00:00')
  d.setDate(d.getDate() + delta * 7)
  return d.toISOString().split('T')[0]
}

// ─── Composant principal ─────────────────────────────────────────────────────

export default function PlanPage() {
  const router = useRouter()

  const [weekStart, setWeekStart]     = useState(getMondayISO)
  const [plan, setPlan]               = useState<Plan | null>(null)
  const [mealConfig, setMealConfig]   = useState<MealConfig[]>([])
  const [loading, setLoading]         = useState(true)
  const [error, setError]             = useState<string | null>(null)

  // Picker
  const [picker, setPicker]               = useState<{ dayOfWeek: DayOfWeek; mealType: MealType } | null>(null)
  const [recipes, setRecipes]             = useState<Recipe[]>([])
  const [recipesLoaded, setRecipesLoaded] = useState(false)
  const [pickerSearch, setPickerSearch]   = useState('')
  const [pickerCategory, setPickerCategory] = useState<string | null>(null)
  const [assigning, setAssigning]           = useState(false)
  const [categories, setCategories]         = useState<Category[]>([])
  const [categoriesLoaded, setCategoriesLoaded] = useState(false)

  const scrollRef = useRef<HTMLDivElement>(null)

  // ── Chargement plan + config ──────────────────────────────────────────────

  useEffect(() => {
    setLoading(true)
    setError(null)
    Promise.all([
      fetch(`/api/meal-plans?week=${weekStart}`).then(r => r.json()),
      fetch('/api/users/me/meal-config').then(r => r.json()),
    ])
      .then(([planData, configData]) => {
        setPlan(planData?.id ? planData : null)
        if (planData?.id) setPlan(planData)
        if (Array.isArray(configData)) {
          setMealConfig(
            [...configData].sort((a, b) => a.display_order - b.display_order)
          )
        }
        setLoading(false)
      })
      .catch(() => {
        setError('Impossible de charger le planning')
        setLoading(false)
      })
  }, [weekStart])

  // ── Chargement recettes (lazy, une fois) ─────────────────────────────────

  useEffect(() => {
    if (picker && !recipesLoaded) {
      fetch('/api/recipes?scope=all')
        .then(r => r.json())
        .then(data => {
          if (Array.isArray(data)) setRecipes(data)
          setRecipesLoaded(true)
        })
        .catch(() => setRecipesLoaded(true))
    }
    if (picker && !categoriesLoaded) {
      fetch('/api/categories')
        .then(r => r.json())
        .then(data => {
          if (Array.isArray(data)) setCategories(data)
          setCategoriesLoaded(true)
        })
        .catch(() => setCategoriesLoaded(true))
    }
  }, [picker, recipesLoaded, categoriesLoaded])

  // ── Actions ───────────────────────────────────────────────────────────────

  async function assignRecipe(recipe: Recipe) {
    if (!plan || !picker) return
    setAssigning(true)
    const res = await fetch(`/api/meal-plans/${plan.id}/items`, {
      method: 'POST',
      headers: { 'Content-Type': 'application/json' },
      body: JSON.stringify({
        day_of_week: picker.dayOfWeek,
        meal_type:   picker.mealType,
        recipe_id:   recipe.id,
      }),
    })
    if (res.ok) {
      const item: PlanItem = await res.json()
      setPlan(prev => {
        if (!prev) return prev
        const filtered = prev.meal_plan_items.filter(
          i => !(i.day_of_week === picker.dayOfWeek && i.meal_type === picker.mealType)
        )
        return { ...prev, meal_plan_items: [...filtered, item] }
      })
      setPicker(null)
      setPickerSearch('')
      setPickerCategory(null)
    }
    setAssigning(false)
  }

  async function removeItem(itemId: string) {
    if (!plan) return
    const res = await fetch(`/api/meal-plans/${plan.id}/items/${itemId}`, { method: 'DELETE' })
    if (res.ok || res.status === 204) {
      setPlan(prev =>
        prev ? { ...prev, meal_plan_items: prev.meal_plan_items.filter(i => i.id !== itemId) } : prev
      )
    }
  }

  // ── Données dérivées ──────────────────────────────────────────────────────

  const activeRows = mealConfig.filter(c => c.is_active)

  function getItem(dayOfWeek: DayOfWeek, mealType: MealType): PlanItem | undefined {
    return plan?.meal_plan_items.find(
      i => i.meal_type === mealType && (i.applies_all_days || i.day_of_week === dayOfWeek)
    )
  }

  const isPastWeek = weekStart < getMondayISO()

  const filteredRecipes = recipes.filter(r => {
    const matchSearch = r.name.toLowerCase().includes(pickerSearch.toLowerCase())
    const matchCat = !pickerCategory || r.categories?.id === pickerCategory
    return matchSearch && matchCat
  })

  // ── Rendu ─────────────────────────────────────────────────────────────────

  return (
    <>
      {/* Sous-header */}
      <div className="sticky top-14 z-30 bg-[var(--mf-bg-page)] border-b border-[var(--mf-border-warm)] px-3 h-10 flex items-center gap-2">
        <button
          type="button"
          onClick={() => setWeekStart(w => shiftWeekISO(w, -1))}
          className="p-1 text-[var(--mf-text-secondary)] hover:text-[var(--mf-primary)]"
          aria-label="Semaine précédente"
        >
          <ChevronLeft className="h-4 w-4" />
        </button>

        <p className="flex-1 text-center font-quicksand text-xs font-semibold text-[var(--mf-text-primary)]">
          {formatWeekLabel(weekStart)}
        </p>

        <button
          type="button"
          onClick={() => setWeekStart(w => shiftWeekISO(w, 1))}
          className="p-1 text-[var(--mf-text-secondary)] hover:text-[var(--mf-primary)]"
          aria-label="Semaine suivante"
        >
          <ChevronRight className="h-4 w-4" />
        </button>

        <button
          type="button"
          onClick={() => router.push('/plan/configure')}
          className="p-1.5 text-[var(--mf-text-secondary)] hover:text-[var(--mf-primary)]"
          aria-label="Configurer les repas"
        >
          <Settings className="h-4 w-4" />
        </button>
      </div>

      {/* Bannière lecture seule */}
      {isPastWeek && !loading && !error && (
        <div className="bg-[var(--mf-bg-card)] border-b border-[var(--mf-border-warm)] px-4 py-1.5 text-center">
          <p className="text-[11px] font-quicksand text-[var(--mf-text-tertiary)]">
            Semaine passée — lecture seule
          </p>
        </div>
      )}

      {/* États de chargement / erreur */}
      {loading && (
        <div className="flex items-center justify-center min-h-[50vh]">
          <p className="text-sm text-[var(--mf-text-tertiary)] font-quicksand">Chargement…</p>
        </div>
      )}

      {!loading && error && (
        <div className="flex flex-col items-center justify-center min-h-[50vh] gap-3 px-4">
          <p className="text-sm text-red-600 font-quicksand text-center">{error}</p>
          <button
            type="button"
            onClick={() => setWeekStart(getMondayISO())}
            className="text-xs text-[var(--mf-primary)] underline font-quicksand"
          >
            Réessayer
          </button>
        </div>
      )}

      {!loading && !error && activeRows.length === 0 && (
        <div className="flex flex-col items-center justify-center min-h-[50vh] gap-3 px-4 text-center">
          <p className="text-sm text-[var(--mf-text-secondary)] font-quicksand">
            Aucun type de repas actif.
          </p>
          <button
            type="button"
            onClick={() => router.push('/plan/configure')}
            className="text-xs text-[var(--mf-primary)] underline font-quicksand"
          >
            Configurer les repas
          </button>
        </div>
      )}

      {/* Grille */}
      {!loading && !error && activeRows.length > 0 && (
        <div className="overflow-x-auto pb-6" ref={scrollRef}>
          <table className="border-separate border-spacing-1 min-w-max mx-auto px-2 pt-3">
            {/* En-tête jours */}
            <thead>
              <tr>
                <th className="w-16 sticky left-0 bg-[var(--mf-bg-page)] z-10" aria-label="Type de repas" />
                {DAYS.map(day => (
                  <th
                    key={day}
                    className="w-24 text-center text-[10px] font-quicksand font-bold uppercase tracking-wider text-[var(--mf-text-tertiary)] pb-1"
                  >
                    {DAY_SHORT[day]}
                  </th>
                ))}
              </tr>
            </thead>

            {/* Lignes repas */}
            <tbody>
              {activeRows.map(config => (
                <tr key={config.meal_type}>
                  {/* Label repas — sticky left */}
                  <td className="sticky left-0 bg-[var(--mf-bg-page)] z-10 pr-1 py-0.5">
                    <div className="flex flex-col items-center gap-0.5 w-16">
                      <span className="text-lg leading-none">{MEAL_EMOJI[config.meal_type]}</span>
                      <span className="text-[9px] font-quicksand font-semibold text-[var(--mf-text-tertiary)] leading-none">
                        {MEAL_LABEL[config.meal_type]}
                      </span>
                    </div>
                  </td>

                  {/* Cellules jours */}
                  {config.mode === 'template' ? (
                    // Mode modèle : une seule case span 7
                    <td colSpan={7} className="py-0.5">
                      <TemplateCell
                        item={plan?.meal_plan_items.find(i => i.meal_type === config.meal_type) ?? null}
                        onAdd={() => setPicker({ dayOfWeek: 'lundi', mealType: config.meal_type })}
                        onRemove={removeItem}
                        readOnly={isPastWeek}
                      />
                    </td>
                  ) : (
                    // Mode quotidien : 7 cellules
                    DAYS.map(day => {
                      const item = getItem(day, config.meal_type)
                      return (
                        <td key={day} className="py-0.5">
                          <DayCell
                            item={item ?? null}
                            onAdd={() => setPicker({ dayOfWeek: day, mealType: config.meal_type })}
                            onRemove={removeItem}
                            readOnly={isPastWeek}
                          />
                        </td>
                      )
                    })
                  )}
                </tr>
              ))}
            </tbody>
          </table>
        </div>
      )}

      {/* Picker recette — bottom sheet */}
      {picker && (
        <div className="fixed inset-0 z-50 flex flex-col justify-end bg-black/40">
          <div className="bg-white rounded-t-2xl shadow-xl max-h-[80vh] flex flex-col">
            {/* En-tête picker */}
            <div className="flex items-center justify-between px-4 pt-4 pb-3 border-b border-[var(--mf-border-warm)]">
              <p className="font-dosis font-bold text-base text-[var(--mf-text-primary)]">
                {MEAL_EMOJI[picker.mealType]} {MEAL_LABEL[picker.mealType]}
                {' · '}{DAY_SHORT[picker.dayOfWeek]}
              </p>
              <button
                type="button"
                onClick={() => { setPicker(null); setPickerSearch(''); setPickerCategory(null) }}
                className="p-1 text-[var(--mf-text-secondary)] hover:text-[var(--mf-primary)]"
                aria-label="Fermer"
              >
                <X className="h-5 w-5" />
              </button>
            </div>

            {/* Recherche */}
            <div className="px-4 py-2 border-b border-[var(--mf-border-warm)]">
              <div className="relative">
                <Search className="absolute left-3 top-1/2 -translate-y-1/2 h-4 w-4 text-[var(--mf-text-tertiary)]" />
                <input
                  type="search"
                  placeholder="Chercher une recette…"
                  value={pickerSearch}
                  onChange={e => setPickerSearch(e.target.value)}
                  className="w-full pl-9 pr-3 py-2 rounded-xl border border-[var(--mf-border-warm)] bg-[var(--mf-bg-card-alt)] text-sm font-quicksand focus:outline-none focus:border-[var(--mf-primary)]"
                  autoFocus
                />
              </div>
            </div>

            {/* Filtres catégorie */}
            {categories.length > 0 && (
              <div className="flex gap-1.5 overflow-x-auto px-4 py-2 border-b border-[var(--mf-border-warm)]">
                <button
                  type="button"
                  onClick={() => setPickerCategory(null)}
                  className={`flex-shrink-0 px-3 py-1.5 rounded-full text-xs font-quicksand font-medium transition-colors ${
                    !pickerCategory
                      ? 'bg-[var(--mf-primary)] text-white'
                      : 'bg-white border border-[var(--mf-border-warm)] text-[var(--mf-text-secondary)]'
                  }`}
                >
                  Tout
                </button>
                {categories.map(cat => (
                  <button
                    key={cat.id}
                    type="button"
                    onClick={() => setPickerCategory(pickerCategory === cat.id ? null : cat.id)}
                    className={`flex-shrink-0 flex items-center gap-1 px-3 py-1.5 rounded-full text-xs font-quicksand font-medium transition-colors ${
                      pickerCategory === cat.id
                        ? 'bg-[var(--mf-primary)] text-white'
                        : 'bg-white border border-[var(--mf-border-warm)] text-[var(--mf-text-secondary)]'
                    }`}
                  >
                    {cat.icon} {cat.name}
                  </button>
                ))}
              </div>
            )}

            {/* Liste recettes */}
            <div className="overflow-y-auto flex-1 px-4 py-2 space-y-1">
              {!recipesLoaded && (
                <p className="text-sm text-[var(--mf-text-tertiary)] font-quicksand text-center py-4">
                  Chargement…
                </p>
              )}
              {recipesLoaded && filteredRecipes.length === 0 && (
                <p className="text-sm text-[var(--mf-text-tertiary)] font-quicksand text-center py-4">
                  Aucune recette trouvée.
                </p>
              )}
              {filteredRecipes.map(recipe => (
                <button
                  key={recipe.id}
                  type="button"
                  disabled={assigning}
                  onClick={() => assignRecipe(recipe)}
                  className="w-full flex items-center gap-3 px-3 py-2.5 rounded-xl hover:bg-[var(--mf-bg-card)] active:scale-98 transition-colors text-left disabled:opacity-60"
                >
                  <span className="text-xl flex-shrink-0">
                    {recipe.categories?.icon ?? '🍴'}
                  </span>
                  <span className="font-quicksand text-sm text-[var(--mf-text-primary)] line-clamp-2">
                    {recipe.name}
                  </span>
                </button>
              ))}
            </div>
          </div>
        </div>
      )}
    </>
  )
}

// ─── Sous-composants cellule ─────────────────────────────────────────────────

function DayCell({
  item,
  onAdd,
  onRemove,
  readOnly,
}: {
  item: PlanItem | null
  onAdd: () => void
  onRemove: (id: string) => void
  readOnly: boolean
}) {
  if (!item?.recipes) {
    if (readOnly) {
      return (
        <div className="w-24 h-16 rounded-xl border border-dashed border-[var(--mf-border-warm)]/40 bg-[var(--mf-bg-card-alt)]/40" />
      )
    }
    return (
      <button
        type="button"
        onClick={onAdd}
        className="w-24 h-16 rounded-xl border-2 border-dashed border-[var(--mf-border-warm)] flex items-center justify-center text-[var(--mf-text-tertiary)] hover:border-[var(--mf-primary)] hover:text-[var(--mf-primary)] transition-colors"
        aria-label="Ajouter une recette"
      >
        <span className="text-lg font-light">+</span>
      </button>
    )
  }

  return (
    <div className="relative w-24 h-16 rounded-xl bg-[var(--mf-bg-card)] border border-[var(--mf-border-warm)] p-1.5 flex flex-col justify-between overflow-hidden">
      <p className="text-[10px] font-quicksand font-medium text-[var(--mf-text-primary)] line-clamp-3 leading-tight">
        {item.recipes.categories?.icon && (
          <span className="mr-0.5">{item.recipes.categories.icon}</span>
        )}
        {item.recipes.name}
      </p>
      {!readOnly && (
        <button
          type="button"
          onClick={() => onRemove(item.id)}
          className="absolute top-1 right-1 w-4 h-4 rounded-full bg-white/80 flex items-center justify-center text-[var(--mf-text-tertiary)] hover:text-red-500 transition-colors"
          aria-label="Retirer la recette"
        >
          <X className="h-2.5 w-2.5" />
        </button>
      )}
    </div>
  )
}

function TemplateCell({
  item,
  onAdd,
  onRemove,
  readOnly,
}: {
  item: PlanItem | null
  onAdd: () => void
  onRemove: (id: string) => void
  readOnly: boolean
}) {
  if (!item?.recipes) {
    if (readOnly) {
      return (
        <div className="w-full h-12 rounded-xl border border-dashed border-[var(--mf-border-warm)]/40 bg-[var(--mf-bg-card-alt)]/40" />
      )
    }
    return (
      <button
        type="button"
        onClick={onAdd}
        className="w-full h-12 rounded-xl border-2 border-dashed border-[var(--mf-border-warm)] flex items-center justify-center gap-2 text-[var(--mf-text-tertiary)] hover:border-[var(--mf-primary)] hover:text-[var(--mf-primary)] transition-colors"
      >
        <span className="text-base font-light">+</span>
        <span className="text-xs font-quicksand">Même recette toute la semaine</span>
      </button>
    )
  }

  return (
    <div className="relative w-full h-12 rounded-xl bg-[var(--mf-bg-card)] border border-[var(--mf-border-warm)] px-3 flex items-center gap-2 overflow-hidden">
      {item.recipes.categories?.icon && (
        <span className="text-base flex-shrink-0">{item.recipes.categories.icon}</span>
      )}
      <p className="text-xs font-quicksand font-medium text-[var(--mf-text-primary)] truncate flex-1">
        {item.recipes.name}
      </p>
      {!readOnly && (
        <button
          type="button"
          onClick={() => onRemove(item.id)}
          className="flex-shrink-0 w-5 h-5 rounded-full bg-white/80 flex items-center justify-center text-[var(--mf-text-tertiary)] hover:text-red-500 transition-colors"
          aria-label="Retirer la recette"
        >
          <X className="h-3 w-3" />
        </button>
      )}
    </div>
  )
}

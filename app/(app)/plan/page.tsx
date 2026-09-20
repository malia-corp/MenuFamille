'use client'

import { useEffect, useRef, useState } from 'react'
import { useRouter } from 'next/navigation'
import {
  CheckCircle,
  ChevronLeft,
  ChevronRight,
  Clock,
  Loader2,
  Lock,
  LockOpen,
  Minus,
  Pencil,
  Plus,
  PlusCircle,
  Search,
  Settings,
  Timer,
  Users,
  Utensils,
  Wand2,
  Trash2,
  X,
} from 'lucide-react'
import { composedName } from '@/lib/utils/composed-name'

// ─── Types ────────────────────────────────────────────────────────────────────

type MealType  = 'petit_dejeuner' | 'dejeuner' | 'gouter' | 'diner'
type DayOfWeek = 'lundi' | 'mardi' | 'mercredi' | 'jeudi' | 'vendredi' | 'samedi' | 'dimanche'
type ViewState = 'loading' | 'generating' | 'review'
type Scope     = 'all' | 'mes' | 'famille' | 'communaute'

interface MealConfig {
  meal_type:     MealType
  is_active:     boolean
  mode:          'daily' | 'template'
  display_order: number
}

interface PlanRecipe {
  id:            string
  name:          string
  photo_url:     string | null
  prep_time_min: number | null
  cook_time_min: number | null
  categories:    { icon: string | null } | null
}

interface Composition {
  id:         string
  role:       'side' | 'drink'
  sort_order: number
  recipe_id:  string
  recipes:    { id: string; name: string } | null
}

interface PlanItem {
  id:                string
  day_of_week:       DayOfWeek
  meal_type:         MealType
  applies_all_days:  boolean
  servings:          number
  is_locked:         boolean
  sort_order:        number
  recipes:           PlanRecipe | null
  meal_compositions: Composition[]
}

interface SheetDetails {
  recipe_type:       string | null
  meal_compositions: Composition[]
}

interface Plan {
  id:              string
  week_start:      string
  status:          'draft' | 'shared' | 'finalized'
  share_token:     string | null
  meal_plan_items: PlanItem[]
}

interface PickerRecipe {
  id:            string
  name:          string
  visibility:    string
  prep_time_min: number | null
  categories:    { icon: string | null } | null
}

interface Category {
  id:    string
  name:  string
  slug:  string
  icon:  string | null
  color: string | null
}

interface EditTarget {
  itemId:     string | null
  mealType:   MealType
  dayLabel:   string
  dayOfWeek:  DayOfWeek
  isTemplate: boolean
}

// ─── Constantes ───────────────────────────────────────────────────────────────

const GEN_STEPS = [
  'Sélection des recettes…',
  'Vérification de la variété…',
  'Prise en compte des restrictions…',
  'Finalisation…',
]

const DAY_OPTIONS: { val: DayOfWeek; label: string; full: string }[] = [
  { val: 'lundi',    label: 'Lun', full: 'Lundi'    },
  { val: 'mardi',    label: 'Mar', full: 'Mardi'    },
  { val: 'mercredi', label: 'Mer', full: 'Mercredi' },
  { val: 'jeudi',    label: 'Jeu', full: 'Jeudi'    },
  { val: 'vendredi', label: 'Ven', full: 'Vendredi' },
  { val: 'samedi',   label: 'Sam', full: 'Samedi'   },
  { val: 'dimanche', label: 'Dim', full: 'Dimanche' },
]

const MEAL_LABEL: Record<MealType, string> = {
  petit_dejeuner: 'Petit-déj.',
  dejeuner:       'Déjeuner',
  gouter:         'Goûter',
  diner:          'Dîner',
}

const MEAL_EMOJI: Record<MealType, string> = {
  petit_dejeuner: '🌅',
  dejeuner:       '🍽',
  gouter:         '🧁',
  diner:          '🌙',
}

const SCOPE_OPTIONS: { val: Scope; label: string }[] = [
  { val: 'all',        label: 'Tout'         },
  { val: 'mes',        label: 'Mes recettes' },
  { val: 'famille',    label: 'Famille'      },
  { val: 'communaute', label: 'Communauté'   },
]

// ─── Helpers ──────────────────────────────────────────────────────────────────

function getMondayISO(d: Date = new Date()): string {
  const day  = d.getDay()
  const diff = day === 0 ? -6 : 1 - day
  const mon  = new Date(d)
  mon.setDate(d.getDate() + diff)
  const y  = mon.getFullYear()
  const m  = String(mon.getMonth() + 1).padStart(2, '0')
  const dd = String(mon.getDate()).padStart(2, '0')
  return `${y}-${m}-${dd}`
}

function shiftWeek(iso: string, delta: -1 | 1): string {
  const d = new Date(iso + 'T00:00:00')
  d.setDate(d.getDate() + delta * 7)
  const y  = d.getFullYear()
  const m  = String(d.getMonth() + 1).padStart(2, '0')
  const dd = String(d.getDate()).padStart(2, '0')
  return `${y}-${m}-${dd}`
}

function formatWeekRange(weekStart: string): string {
  const start = new Date(weekStart + 'T00:00:00')
  const end   = new Date(start)
  end.setDate(start.getDate() + 6)
  const fmt = (d: Date) => d.toLocaleDateString('fr-FR', { day: 'numeric', month: 'short' })
  return `${fmt(start)} – ${fmt(end)}`
}

function formatTime(s: number): string {
  return `${String(Math.floor(s / 60)).padStart(2, '0')}:${String(s % 60).padStart(2, '0')}`
}

// ─── Composant principal ──────────────────────────────────────────────────────

export default function PlanPage() {
  const router = useRouter()

  const [viewState,    setViewState]    = useState<ViewState>('loading')
  const [plan,         setPlan]         = useState<Plan | null>(null)
  const [configs,      setConfigs]      = useState<MealConfig[]>([])
  const [genStep,      setGenStep]      = useState(0)
  const [genError,     setGenError]     = useState<string | null>(null)
  const [modCount,     setModCount]     = useState(0)
  const [sessionTime,  setSessionTime]  = useState(0)
  const [selectedWeek, setSelectedWeek] = useState(getMondayISO())
  const sessionStartRef = useRef<number | null>(null)

  // ── Edit bottom sheet ─────────────────────────────────────────────────────
  const [editTarget,              setEditTarget]              = useState<EditTarget | null>(null)
  const [editRecipes,             setEditRecipes]             = useState<PickerRecipe[]>([])
  const [editSearch,              setEditSearch]              = useState('')
  const [changingRecipe,          setChangingRecipe]          = useState(false)
  const [servings,                setServings]                = useState(4)
  const [updatingServings,        setUpdatingServings]        = useState(false)
  const [lockingItemId,           setLockingItemId]           = useState<string | null>(null)
  const [pickerLoading,           setPickerLoading]           = useState(false)
  const [pickerCategories,        setPickerCategories]        = useState<Category[]>([])
  const [pickerCategoriesLoaded,  setPickerCategoriesLoaded]  = useState(false)
  const [pickerScope,             setPickerScope]             = useState<Scope>('all')
  const [pickerCategory,          setPickerCategory]          = useState<string | null>(null)
  const pickerSearchTimerRef = useRef<ReturnType<typeof setTimeout> | null>(null)

  // ── Composition bottom sheet ──────────────────────────────────────────────
  const [sheetDetails,      setSheetDetails]      = useState<SheetDetails | null>(null)
  const [compositionMode,   setCompositionMode]   = useState<'side' | 'drink' | null>(null)
  const [addingComposition, setAddingComposition] = useState(false)
  const [deletingCompId,    setDeletingCompId]    = useState<string | null>(null)

  // ── Chargement (se relance quand selectedWeek change) ────────────────────

  useEffect(() => { void loadPlan() }, [selectedWeek]) // eslint-disable-line react-hooks/exhaustive-deps

  async function loadPlan() {
    setViewState('loading')
    setGenError(null)
    try {
      const [planRes, configRes] = await Promise.all([
        fetch(`/api/meal-plans?week=${selectedWeek}`),
        fetch('/api/users/me/meal-config'),
      ])
      const planData: Plan      = await planRes.json()
      const configData: unknown = await configRes.json()

      const active = (Array.isArray(configData) ? configData as MealConfig[] : [])
        .filter(c => c.is_active)
        .sort((a, b) => a.display_order - b.display_order)

      setConfigs(active)
      setPlan(planData?.id ? planData : null)
      setServings(planData?.meal_plan_items?.[0]?.servings ?? 4)

      if ((planData?.meal_plan_items?.length ?? 0) > 0 && !sessionStartRef.current) {
        sessionStartRef.current = Date.now()
      }
      setViewState('review')
    } catch {
      setGenError('Impossible de charger le planning')
      setViewState('review')
    }
  }

  // ── Génération ────────────────────────────────────────────────────────────

  async function generateMenu() {
    setViewState('generating')
    setGenStep(0)
    setGenError(null)

    const start  = Date.now()
    const ticker = setInterval(() => setGenStep(s => Math.min(s + 1, 3)), 450)

    try {
      const res = await fetch(`/api/meal-plans/generate?week=${selectedWeek}`, { method: 'POST' })
      if (!res.ok) {
        const d = await res.json()
        throw new Error(d.error ?? 'Erreur lors de la génération')
      }

      const elapsed = Date.now() - start
      if (elapsed < 1800) await new Promise(r => setTimeout(r, 1800 - elapsed))

      clearInterval(ticker)
      setGenStep(4)
      await new Promise(r => setTimeout(r, 300))

      const planRes  = await fetch(`/api/meal-plans?week=${selectedWeek}`)
      const planData: Plan = await planRes.json()
      setPlan(planData)
      setServings(planData?.meal_plan_items?.[0]?.servings ?? 4)
      sessionStartRef.current = Date.now()
      setModCount(0)
      setSessionTime(0)
      setViewState('review')
    } catch (e) {
      clearInterval(ticker)
      setGenError(e instanceof Error ? e.message : 'Erreur lors de la génération')
      setViewState('review')
    }
  }

  // ── Chrono de session ─────────────────────────────────────────────────────

  useEffect(() => {
    if (viewState !== 'review') return
    const interval = setInterval(() => {
      if (sessionStartRef.current) {
        setSessionTime(Math.floor((Date.now() - sessionStartRef.current) / 1000))
      }
    }, 1000)
    return () => clearInterval(interval)
  }, [viewState])

  // ── Chargement des détails du sheet (recipe_type + compositions) ─────────

  useEffect(() => {
    if (!editTarget?.itemId || !plan) { setSheetDetails(null); return }
    void refreshSheetItem(editTarget.itemId, plan.id)
  }, [editTarget?.itemId, plan?.id]) // eslint-disable-line react-hooks/exhaustive-deps

  // ── Picker : chargement des recettes ─────────────────────────────────────

  async function loadPickerRecipes(scope: Scope, categoryId: string | null, search: string, recipeType = 'plat_principal,sauce') {
    setPickerLoading(true)
    try {
      const params = new URLSearchParams({ scope })
      if (categoryId)     params.set('category_id', categoryId)
      if (search.trim())  params.set('search', search.trim())
      if (recipeType)     params.set('recipe_type', recipeType)
      const res  = await fetch(`/api/recipes?${params}`)
      const data = await res.json()
      setEditRecipes(Array.isArray(data) ? (data as PickerRecipe[]) : [])
    } catch {
      setEditRecipes([])
    } finally {
      setPickerLoading(false)
    }
  }

  async function refreshSheetItem(itemId: string, planId: string) {
    try {
      const res = await fetch(`/api/meal-plans/${planId}/items/${itemId}`)
      if (!res.ok) return
      const data = await res.json()
      type R = { id: string; role: string; sort_order: number; recipe_id: string; recipes: { id: string; name: string } | null }
      const comps: Composition[] = ((data.meal_compositions ?? []) as R[]).map(c => ({
        id: c.id, role: c.role as 'side' | 'drink',
        sort_order: c.sort_order, recipe_id: c.recipe_id, recipes: c.recipes ?? null,
      }))
      setSheetDetails({
        recipe_type:       (data.recipes as { recipe_type?: string } | null)?.recipe_type ?? null,
        meal_compositions: comps,
      })
      setPlan(prev => prev ? {
        ...prev,
        meal_plan_items: prev.meal_plan_items.map(i => i.id === itemId ? { ...i, meal_compositions: comps } : i),
      } : prev)
    } catch { /* silent */ }
  }

  // ── Edit bottom sheet — actions ───────────────────────────────────────────

  async function openEdit(
    item:       PlanItem | null,
    mealType:   MealType,
    dayOfWeek:  DayOfWeek,
    isTemplate: boolean,
  ) {
    const dayOpt   = DAY_OPTIONS.find(d => d.val === dayOfWeek)
    const dayLabel = isTemplate ? 'Toute la semaine' : (dayOpt?.full ?? dayOfWeek)
    setEditTarget({ itemId: item?.id ?? null, mealType, dayLabel, dayOfWeek, isTemplate })
    setEditSearch('')
    setPickerScope('all')
    setPickerCategory(null)

    if (!pickerCategoriesLoaded) {
      try {
        const res  = await fetch('/api/categories')
        const data = await res.json()
        setPickerCategories(Array.isArray(data) ? (data as Category[]) : [])
        setPickerCategoriesLoaded(true)
      } catch { /* silent */ }
    }

    void loadPickerRecipes('all', null, '', 'plat_principal,sauce')
  }

  function closeEdit() {
    if (pickerSearchTimerRef.current) clearTimeout(pickerSearchTimerRef.current)
    setEditTarget(null)
    setEditSearch('')
    setCompositionMode(null)
    setSheetDetails(null)
  }

  function handleScopeChange(scope: Scope) {
    setPickerScope(scope)
    const rt = compositionMode === 'side' ? '' : compositionMode === 'drink' ? 'boisson' : 'plat_principal,sauce'
    void loadPickerRecipes(scope, pickerCategory, editSearch, rt)
  }

  function handleCategoryChange(catId: string | null) {
    setPickerCategory(catId)
    const rt = compositionMode === 'side' ? '' : compositionMode === 'drink' ? 'boisson' : 'plat_principal,sauce'
    void loadPickerRecipes(pickerScope, catId, editSearch, rt)
  }

  function handlePickerSearch(value: string) {
    setEditSearch(value)
    if (pickerSearchTimerRef.current) clearTimeout(pickerSearchTimerRef.current)
    pickerSearchTimerRef.current = setTimeout(() => {
      const rt = compositionMode === 'side' ? '' : compositionMode === 'drink' ? 'boisson' : 'plat_principal,sauce'
      void loadPickerRecipes(pickerScope, pickerCategory, value, rt)
    }, 300)
  }

  async function changeRecipe(recipe: PickerRecipe) {
    if (!plan || !editTarget || changingRecipe) return

    if (compositionMode !== null) {
      if (!editTarget.itemId || addingComposition) return
      setAddingComposition(true)
      try {
        const res = await fetch(`/api/meal-plans/${plan.id}/items/${editTarget.itemId}/compositions`, {
          method:  'POST',
          headers: { 'Content-Type': 'application/json' },
          body:    JSON.stringify({ recipe_id: recipe.id, role: compositionMode }),
        })
        if (!res.ok) throw new Error()
        await refreshSheetItem(editTarget.itemId, plan.id)
        setCompositionMode(null)
        void loadPickerRecipes('all', null, editSearch, 'plat_principal,sauce')
      } catch { /* keep sheet open */ } finally {
        setAddingComposition(false)
      }
      return
    }

    setChangingRecipe(true)
    try {
      if (editTarget.itemId) {
        const res = await fetch(`/api/meal-plans/${plan.id}/items/${editTarget.itemId}`, {
          method:  'PATCH',
          headers: { 'Content-Type': 'application/json' },
          body:    JSON.stringify({ recipe_id: recipe.id }),
        })
        if (!res.ok) throw new Error()
        const updated: PlanItem = await res.json()
        setPlan(prev => prev ? {
          ...prev,
          meal_plan_items: prev.meal_plan_items.map(i => i.id === updated.id ? updated : i),
        } : prev)
      } else {
        const res = await fetch(`/api/meal-plans/${plan.id}/items`, {
          method:  'POST',
          headers: { 'Content-Type': 'application/json' },
          body:    JSON.stringify({
            day_of_week:      editTarget.dayOfWeek,
            meal_type:        editTarget.mealType,
            applies_all_days: editTarget.isTemplate,
            recipe_id:        recipe.id,
          }),
        })
        if (!res.ok) throw new Error()
        const newItem: PlanItem = await res.json()
        if (!sessionStartRef.current) sessionStartRef.current = Date.now()
        setPlan(prev => prev ? {
          ...prev,
          meal_plan_items: [...prev.meal_plan_items, newItem],
        } : prev)
      }
      setModCount(c => c + 1)
      closeEdit()
    } catch {
      /* keep sheet open */
    } finally {
      setChangingRecipe(false)
    }
  }

  async function deleteComposition(compId: string) {
    if (!plan || !editTarget?.itemId || deletingCompId) return
    setDeletingCompId(compId)
    try {
      const res = await fetch(
        `/api/meal-plans/${plan.id}/items/${editTarget.itemId}/compositions/${compId}`,
        { method: 'DELETE' }
      )
      if (!res.ok) throw new Error()
      await refreshSheetItem(editTarget.itemId, plan.id)
    } catch { /* silent */ } finally {
      setDeletingCompId(null)
    }
  }

  async function toggleLock(item: PlanItem) {
    if (!plan || lockingItemId) return
    setLockingItemId(item.id)
    try {
      const res = await fetch(`/api/meal-plans/${plan.id}/items/${item.id}/lock`, { method: 'POST' })
      if (!res.ok) throw new Error()
      const { is_locked } = await res.json() as { is_locked: boolean }
      setPlan(prev => prev ? {
        ...prev,
        meal_plan_items: prev.meal_plan_items.map(i => i.id === item.id ? { ...i, is_locked } : i),
      } : prev)
    } catch {
      /* silent */
    } finally {
      setLockingItemId(null)
    }
  }

  // ── Convives ──────────────────────────────────────────────────────────────

  async function updateServings(newVal: number) {
    if (!plan || updatingServings) return
    setUpdatingServings(true)
    try {
      const res = await fetch(`/api/meal-plans/${plan.id}/servings`, {
        method:  'PATCH',
        headers: { 'Content-Type': 'application/json' },
        body:    JSON.stringify({ servings: newVal }),
      })
      if (res.ok) setServings(newVal)
    } catch { /* silent */ } finally {
      setUpdatingServings(false)
    }
  }

  // ── Navigation semaine ────────────────────────────────────────────────────

  function goToPrevWeek() { setSelectedWeek(w => shiftWeek(w, -1)) }
  function goToNextWeek() { setSelectedWeek(w => shiftWeek(w, 1))  }

  // ── Helpers de données ────────────────────────────────────────────────────

  function getTemplateItem(mealType: MealType): PlanItem | undefined {
    return plan?.meal_plan_items.find(i => i.meal_type === mealType && i.applies_all_days)
  }

  function getDailyItem(mealType: MealType, day: DayOfWeek): PlanItem | undefined {
    return plan?.meal_plan_items.find(
      i => i.meal_type === mealType && i.day_of_week === day && !i.applies_all_days
    )
  }

  const activeConfigs = configs.filter(c => c.is_active)

  // ── Rendu ─────────────────────────────────────────────────────────────────

  return (
    <>
      {/* Sous-header : navigation semaine */}
      <div className="sticky top-14 z-30 bg-[var(--mf-bg-page)] border-b border-[var(--mf-border-warm)] px-4 h-10 flex items-center justify-between">
        <button
          type="button"
          onClick={goToPrevWeek}
          className="p-1.5 text-[var(--mf-text-secondary)] hover:text-[var(--mf-primary)] transition-colors"
          aria-label="Semaine précédente"
        >
          <ChevronLeft className="h-4 w-4" />
        </button>

        <p className="font-quicksand text-xs font-semibold text-[var(--mf-text-secondary)]">
          {formatWeekRange(selectedWeek)}
        </p>

        <div className="flex items-center gap-0.5">
          <button
            type="button"
            onClick={goToNextWeek}
            className="p-1.5 text-[var(--mf-text-secondary)] hover:text-[var(--mf-primary)] transition-colors"
            aria-label="Semaine suivante"
          >
            <ChevronRight className="h-4 w-4" />
          </button>
          <button
            type="button"
            onClick={() => router.push('/plan/configure')}
            className="p-1.5 text-[var(--mf-text-secondary)] hover:text-[var(--mf-primary)] transition-colors"
            aria-label="Configurer les repas"
          >
            <Settings className="h-4 w-4" />
          </button>
        </div>
      </div>

      {/* Stepper */}
      <div className="bg-[var(--mf-bg-page)] border-b border-[var(--mf-border-warm)] px-4 py-2.5">
        <div className="flex items-center justify-center gap-1.5">
          <button
            type="button"
            onClick={() => router.push('/plan/configure')}
            className="flex items-center gap-1.5 group"
          >
            <div className="w-5 h-5 rounded-full bg-[var(--mf-green)] flex items-center justify-center">
              <span className="text-white text-[10px] font-bold">✓</span>
            </div>
            <span className="text-[10px] font-quicksand font-bold uppercase tracking-wider text-[var(--mf-text-tertiary)] group-hover:text-[var(--mf-primary)] transition-colors">
              Configurer
            </span>
          </button>

          <ChevronRight className="h-3 w-3 text-[var(--mf-border-warm)]" />

          <div className="flex items-center gap-1.5">
            <div className="w-5 h-5 rounded-full bg-[var(--mf-primary)] flex items-center justify-center">
              <span className="text-white text-[10px] font-bold">2</span>
            </div>
            <span className="text-[10px] font-quicksand font-bold uppercase tracking-wider text-[var(--mf-primary)]">
              Choisir
            </span>
          </div>

          <ChevronRight className="h-3 w-3 text-[var(--mf-border-warm)]" />

          {plan && plan.meal_plan_items.length > 0 ? (
            <button
              type="button"
              onClick={() => router.push(`/plan/validate?week=${selectedWeek}`)}
              className="flex items-center gap-1.5 group"
            >
              <div className={`w-5 h-5 rounded-full flex items-center justify-center transition-colors ${
                plan.status === 'finalized' || plan.status === 'shared'
                  ? 'bg-[var(--mf-green)]'
                  : 'bg-[var(--mf-border-warm)] group-hover:bg-[var(--mf-primary)]/20'
              }`}>
                <span className={`text-[10px] font-bold ${
                  plan.status === 'finalized' || plan.status === 'shared'
                    ? 'text-white'
                    : 'text-[var(--mf-text-tertiary)] group-hover:text-[var(--mf-primary)]'
                }`}>
                  {plan.status === 'finalized' || plan.status === 'shared' ? '✓' : '3'}
                </span>
              </div>
              <span className="text-[10px] font-quicksand font-bold uppercase tracking-wider text-[var(--mf-text-tertiary)] group-hover:text-[var(--mf-primary)] transition-colors">
                Valider
              </span>
            </button>
          ) : (
            <div className="flex items-center gap-1.5 opacity-40">
              <div className="w-5 h-5 rounded-full bg-[var(--mf-border-warm)] flex items-center justify-center">
                <span className="text-[var(--mf-text-tertiary)] text-[10px] font-bold">3</span>
              </div>
              <span className="text-[10px] font-quicksand font-bold uppercase tracking-wider text-[var(--mf-text-tertiary)]">
                Valider
              </span>
            </div>
          )}
        </div>
      </div>

      {/* ── Chargement ── */}
      {viewState === 'loading' && (
        <div className="flex items-center justify-center min-h-[50vh]">
          <Loader2 className="h-6 w-6 text-[var(--mf-primary)] animate-spin" />
        </div>
      )}

      {/* ── Overlay génération ── */}
      {viewState === 'generating' && (
        <div className="fixed inset-0 z-50 bg-[var(--mf-bg-page)]/95 flex flex-col items-center justify-center gap-8 px-8">
          <Loader2 className="h-12 w-12 text-[var(--mf-primary)] animate-spin" />
          <div className="space-y-4 w-full max-w-xs">
            {GEN_STEPS.map((label, i) => (
              <div key={i} className="flex items-center gap-3">
                {genStep > i ? (
                  <CheckCircle className="h-5 w-5 text-[var(--mf-green)] flex-shrink-0" />
                ) : (
                  <div className="h-5 w-5 rounded-full border-2 border-[var(--mf-border-warm)] flex-shrink-0" />
                )}
                <p className={`text-sm font-quicksand transition-colors ${
                  genStep > i ? 'text-[var(--mf-text-primary)] font-medium' : 'text-[var(--mf-text-tertiary)]'
                }`}>
                  {label}
                </p>
              </div>
            ))}
          </div>
        </div>
      )}

      {/* ── Grille de révision ── */}
      {viewState === 'review' && (
        <div className="space-y-6 py-4 pb-10">

          {genError && (
            <p className="mx-4 text-sm text-red-600 font-quicksand bg-red-50 px-4 py-2 rounded-xl">
              {genError}
            </p>
          )}

          {/* Barre : generate secondaire + convives + stats */}
          <div className="flex items-center justify-between px-4">
            <button
              type="button"
              onClick={() => { void generateMenu() }}
              className="flex items-center gap-1.5 text-[11px] font-quicksand text-[var(--mf-text-secondary)] border border-[var(--mf-border-warm)] rounded-lg px-2.5 py-1.5 hover:border-[var(--mf-primary)] hover:text-[var(--mf-primary)] transition-colors"
            >
              <Wand2 className="h-3 w-3" />
              Propositions aléatoires
            </button>
            <div className="flex items-center gap-3">
              {/* Contrôle convives */}
              {plan && (
                <div className="flex items-center gap-1.5">
                  <Users className="h-3 w-3 text-[var(--mf-text-tertiary)]" />
                  <button type="button"
                    onClick={() => { void updateServings(servings - 1) }}
                    disabled={servings <= 1 || updatingServings}
                    className="w-4 h-4 rounded-full flex items-center justify-center border border-[var(--mf-border-warm)] disabled:opacity-40 hover:border-[var(--mf-primary)] transition-colors">
                    <Minus className="h-2.5 w-2.5 text-[var(--mf-text-secondary)]" />
                  </button>
                  <span className="text-[11px] font-quicksand font-semibold text-[var(--mf-text-primary)] min-w-[1ch] text-center">
                    {updatingServings ? '…' : servings}
                  </span>
                  <button type="button"
                    onClick={() => { void updateServings(servings + 1) }}
                    disabled={servings >= 20 || updatingServings}
                    className="w-4 h-4 rounded-full flex items-center justify-center border border-[var(--mf-border-warm)] disabled:opacity-40 hover:border-[var(--mf-primary)] transition-colors">
                    <Plus className="h-2.5 w-2.5 text-[var(--mf-text-secondary)]" />
                  </button>
                </div>
              )}
              <span className="flex items-center gap-1 text-[11px] font-quicksand text-[var(--mf-text-tertiary)]">
                <Pencil className="h-3 w-3" />
                {modCount}
              </span>
              <span className="flex items-center gap-1 text-[11px] font-quicksand text-[var(--mf-text-tertiary)]">
                <Timer className="h-3 w-3" />
                {formatTime(sessionTime)}
              </span>
            </div>
          </div>

          {activeConfigs.length === 0 && (
            <div className="mx-4 flex flex-col items-center gap-3 py-8 text-center">
              <p className="text-sm font-quicksand text-[var(--mf-text-secondary)]">
                Aucun type de repas actif.
              </p>
              <button
                type="button"
                onClick={() => router.push('/plan/configure')}
                className="text-sm text-[var(--mf-primary)] underline font-quicksand"
              >
                Configurer les repas
              </button>
            </div>
          )}

          {activeConfigs.map(config => (
            <div key={config.meal_type} className="space-y-2.5">
              <div className="flex items-center gap-2 px-4">
                <span className="text-xl">{MEAL_EMOJI[config.meal_type]}</span>
                <span className="font-dosis font-semibold text-sm text-[var(--mf-text-primary)]">
                  {MEAL_LABEL[config.meal_type]}
                </span>
                <span className={`text-[10px] font-quicksand font-bold uppercase tracking-wider px-2 py-0.5 rounded-full ${
                  config.mode === 'template'
                    ? 'bg-[var(--mf-gold-bg)] text-[var(--mf-gold)]'
                    : 'bg-[var(--mf-bg-card)] text-[var(--mf-text-tertiary)]'
                }`}>
                  {config.mode === 'template' ? 'Modèle semaine' : 'Quotidien'}
                </span>
              </div>

              {config.mode === 'template' ? (
                (() => {
                  const item = getTemplateItem(config.meal_type) ?? null
                  if (!item) return (
                    <TemplateEmptyCard
                      onAdd={() => { void openEdit(null, config.meal_type, 'lundi', true) }}
                    />
                  )
                  return (
                    <TemplateCard
                      item={item}
                      locking={lockingItemId === item.id}
                      onEdit={() => { void openEdit(item, item.meal_type, item.day_of_week, item.applies_all_days) }}
                      onLock={() => { void toggleLock(item) }}
                    />
                  )
                })()
              ) : (
                <div className="flex gap-2 overflow-x-auto px-4 pb-1 scrollbar-hide">
                  {DAY_OPTIONS.map(d => {
                    const item = getDailyItem(config.meal_type, d.val) ?? null
                    if (!item) return (
                      <DailyEmptyCard
                        key={d.val}
                        dayLabel={d.label}
                        onAdd={() => { void openEdit(null, config.meal_type, d.val, false) }}
                      />
                    )
                    return (
                      <DailyCard
                        key={d.val}
                        dayLabel={d.label}
                        item={item}
                        locking={lockingItemId === item.id}
                        onEdit={() => { void openEdit(item, item.meal_type, item.day_of_week, item.applies_all_days) }}
                        onLock={() => { void toggleLock(item) }}
                      />
                    )
                  })}
                </div>
              )}
            </div>
          ))}
        </div>
      )}

      {/* ── Bottom sheet : choisir une recette ── */}
      {editTarget && (
        <>
          <div className="fixed inset-0 z-40 bg-black/30" onClick={closeEdit} aria-hidden="true" />
          <div className="fixed bottom-0 left-0 right-0 z-50 bg-[var(--mf-bg-page)] rounded-t-2xl shadow-xl flex flex-col max-h-[85vh]">
            {/* Handle */}
            <div className="flex justify-center pt-2.5 pb-1 flex-shrink-0">
              <div className="w-10 h-1 rounded-full bg-[var(--mf-border-warm)]" />
            </div>

            {/* Header */}
            <div className="flex items-start justify-between px-4 pb-2 flex-shrink-0">
              <div className="flex items-center gap-1">
                {compositionMode !== null && (
                  <button
                    type="button"
                    onClick={() => {
                      setCompositionMode(null)
                      void loadPickerRecipes('all', null, editSearch, 'plat_principal,sauce')
                    }}
                    className="p-1 -ml-1 mr-0.5 text-[var(--mf-text-secondary)] hover:text-[var(--mf-primary)] transition-colors"
                    aria-label="Retour"
                  >
                    <ChevronLeft className="h-5 w-5" />
                  </button>
                )}
                <div>
                  <p className="font-dosis font-bold text-base text-[var(--mf-text-primary)]">
                    {compositionMode === 'side'  ? 'Choisir un accompagnement'
                     : compositionMode === 'drink' ? 'Choisir une boisson'
                     : editTarget.itemId ? 'Changer ce repas' : 'Choisir une recette'}
                  </p>
                  <p className="text-xs font-quicksand text-[var(--mf-text-secondary)] mt-0.5">
                    {MEAL_EMOJI[editTarget.mealType]}&nbsp;
                    {MEAL_LABEL[editTarget.mealType]} — {editTarget.dayLabel}
                  </p>
                </div>
              </div>
              <button
                type="button"
                onClick={closeEdit}
                className="p-1.5 -mr-1 text-[var(--mf-text-tertiary)] hover:text-[var(--mf-text-primary)] transition-colors"
                aria-label="Fermer"
              >
                <X className="h-5 w-5" />
              </button>
            </div>

            {/* Search */}
            <div className="px-4 pb-2 flex-shrink-0">
              <div className="flex items-center gap-2 bg-[var(--mf-bg-card)] border border-[var(--mf-border-warm)] rounded-xl px-3 py-2">
                <Search className="h-4 w-4 text-[var(--mf-text-tertiary)] flex-shrink-0" />
                <input
                  type="search"
                  placeholder="Chercher une recette…"
                  value={editSearch}
                  onChange={e => handlePickerSearch(e.target.value)}
                  className="flex-1 bg-transparent text-sm font-quicksand text-[var(--mf-text-primary)] placeholder:text-[var(--mf-text-tertiary)] outline-none"
                  autoFocus
                />
              </div>
            </div>

            {/* Pills scope */}
            <div className="flex gap-1.5 px-4 pb-2 overflow-x-auto scrollbar-hide flex-shrink-0">
              {SCOPE_OPTIONS.map(opt => (
                <button
                  key={opt.val}
                  type="button"
                  onClick={() => handleScopeChange(opt.val)}
                  className={`flex-shrink-0 px-3 py-1 rounded-full text-[11px] font-quicksand font-bold transition-colors ${
                    pickerScope === opt.val
                      ? 'bg-[var(--mf-primary)] text-white'
                      : 'bg-[var(--mf-bg-card)] text-[var(--mf-text-secondary)] border border-[var(--mf-border-warm)]'
                  }`}
                >
                  {opt.label}
                </button>
              ))}
            </div>

            {/* Pills catégorie */}
            {pickerCategories.length > 0 && (
              <div className="flex gap-1.5 px-4 pb-2 overflow-x-auto scrollbar-hide flex-shrink-0">
                <button
                  type="button"
                  onClick={() => handleCategoryChange(null)}
                  className={`flex-shrink-0 px-3 py-1 rounded-full text-[11px] font-quicksand font-bold transition-colors ${
                    pickerCategory === null
                      ? 'bg-[var(--mf-primary)] text-white'
                      : 'bg-[var(--mf-bg-card)] text-[var(--mf-text-secondary)] border border-[var(--mf-border-warm)]'
                  }`}
                >
                  Tous
                </button>
                {pickerCategories.map(cat => (
                  <button
                    key={cat.id}
                    type="button"
                    onClick={() => handleCategoryChange(cat.id)}
                    className={`flex-shrink-0 px-3 py-1 rounded-full text-[11px] font-quicksand font-bold transition-colors ${
                      pickerCategory === cat.id
                        ? 'bg-[var(--mf-primary)] text-white'
                        : 'bg-[var(--mf-bg-card)] text-[var(--mf-text-secondary)] border border-[var(--mf-border-warm)]'
                    }`}
                  >
                    {cat.icon} {cat.name}
                  </button>
                ))}
              </div>
            )}

            <div className="border-t border-[var(--mf-border-warm)] flex-shrink-0" />

            {/* Liste de recettes */}
            <div className="overflow-y-auto flex-1">
              {pickerLoading ? (
                <div className="flex justify-center py-8">
                  <Loader2 className="h-5 w-5 text-[var(--mf-primary)] animate-spin" />
                </div>
              ) : editRecipes.length === 0 ? (
                <p className="text-sm font-quicksand text-[var(--mf-text-tertiary)] text-center py-8">
                  {editSearch ? 'Aucune recette trouvée' : 'Aucune recette disponible'}
                </p>
              ) : (
                editRecipes.map(recipe => (
                  <button
                    key={recipe.id}
                    type="button"
                    disabled={changingRecipe || addingComposition}
                    onClick={() => { void changeRecipe(recipe) }}
                    className="w-full flex items-center gap-3 px-4 py-3 border-b border-[var(--mf-border-warm)]/40 last:border-0 hover:bg-[var(--mf-bg-card)] transition-colors disabled:opacity-50"
                  >
                    <span className="text-xl flex-shrink-0">
                      {recipe.categories?.icon ?? '🍴'}
                    </span>
                    <div className="flex-1 min-w-0 text-left">
                      <p className="text-sm font-quicksand font-medium text-[var(--mf-text-primary)] truncate">
                        {recipe.name}
                      </p>
                      {recipe.prep_time_min && (
                        <div className="flex items-center gap-1 mt-0.5">
                          <Clock className="h-3 w-3 text-[var(--mf-text-tertiary)]" />
                          <span className="text-[11px] font-quicksand text-[var(--mf-text-secondary)]">
                            {recipe.prep_time_min} min
                          </span>
                        </div>
                      )}
                    </div>
                    {recipe.visibility !== 'private' && (
                      <span className={`text-[10px] font-quicksand font-bold uppercase tracking-wider px-1.5 py-0.5 rounded-full flex-shrink-0 ${
                        recipe.visibility === 'circle'
                          ? 'bg-[var(--mf-gold-bg)] text-[var(--mf-gold)]'
                          : 'bg-emerald-50 text-emerald-600'
                      }`}>
                        {recipe.visibility === 'circle' ? 'Cercle' : 'Commun.'}
                      </span>
                    )}
                    {(changingRecipe || addingComposition) && (
                      <Loader2 className="h-4 w-4 text-[var(--mf-primary)] animate-spin flex-shrink-0" />
                    )}
                  </button>
                ))
              )}

              {/* Section accompagnement — visible si sauce ET item existant ET pas en mode composition */}
              {editTarget.itemId && sheetDetails !== null && compositionMode === null && (
                <div className="px-4 py-3 border-t border-[var(--mf-border-warm)]/60">
                  <p className="text-[10px] font-quicksand font-bold uppercase tracking-wider text-[var(--mf-text-secondary)] mb-2">
                    Accompagnement
                  </p>
                  {sheetDetails.meal_compositions.filter(c => c.role === 'side').map(comp => (
                    <div key={comp.id} className="flex items-center gap-2 py-1.5">
                      <span className="flex-1 text-sm font-quicksand text-[var(--mf-text-primary)] truncate">
                        {comp.recipes?.name ?? '?'}
                      </span>
                      <button
                        type="button"
                        disabled={!!deletingCompId}
                        onClick={() => { void deleteComposition(comp.id) }}
                        className="p-1 text-[var(--mf-text-tertiary)] hover:text-red-500 transition-colors disabled:opacity-40"
                        aria-label="Supprimer l'accompagnement"
                      >
                        {deletingCompId === comp.id
                          ? <Loader2 className="h-3.5 w-3.5 animate-spin" />
                          : <Trash2 className="h-3.5 w-3.5" />}
                      </button>
                    </div>
                  ))}
                  <button
                    type="button"
                    onClick={() => { setCompositionMode('side'); void loadPickerRecipes(pickerScope, pickerCategory, editSearch, '') }}
                    className="mt-1 flex items-center gap-1 text-xs font-quicksand text-[var(--mf-primary)] hover:underline"
                  >
                    <Plus className="h-3 w-3" />
                    Ajouter un accompagnement
                  </button>
                </div>
              )}

              {/* Section boisson — visible si item existant ET détails chargés ET pas en mode composition */}
              {editTarget.itemId && sheetDetails !== null && compositionMode === null && (
                <div className="px-4 py-3 border-t border-[var(--mf-border-warm)]/60">
                  <p className="text-[10px] font-quicksand font-bold uppercase tracking-wider text-[var(--mf-text-secondary)] mb-2">
                    Boisson
                  </p>
                  {sheetDetails.meal_compositions.filter(c => c.role === 'drink').map(comp => (
                    <div key={comp.id} className="flex items-center gap-2 py-1.5">
                      <span className="flex-1 text-sm font-quicksand text-[var(--mf-text-primary)] truncate">
                        {comp.recipes?.name ?? '?'}
                      </span>
                      <button
                        type="button"
                        disabled={!!deletingCompId}
                        onClick={() => { void deleteComposition(comp.id) }}
                        className="p-1 text-[var(--mf-text-tertiary)] hover:text-red-500 transition-colors disabled:opacity-40"
                        aria-label="Supprimer la boisson"
                      >
                        {deletingCompId === comp.id
                          ? <Loader2 className="h-3.5 w-3.5 animate-spin" />
                          : <Trash2 className="h-3.5 w-3.5" />}
                      </button>
                    </div>
                  ))}
                  <button
                    type="button"
                    onClick={() => { setCompositionMode('drink'); void loadPickerRecipes('all', null, '', 'boisson') }}
                    className="mt-1 flex items-center gap-1 text-xs font-quicksand text-[var(--mf-primary)] hover:underline"
                  >
                    <Plus className="h-3 w-3" />
                    Ajouter une boisson
                  </button>
                </div>
              )}

              {/* Créer un repas personnalisé — masqué en mode composition */}
              {compositionMode === null && (
              <div className="px-4 py-3 pb-6">
                <button
                  type="button"
                  onClick={() => {
                    if (!plan?.id || !editTarget) return
                    const params = new URLSearchParams({
                      plan_id:     plan.id,
                      meal_type:   editTarget.mealType,
                      day_of_week: editTarget.dayOfWeek,
                      applies_all: String(editTarget.isTemplate),
                      day_label:   editTarget.dayLabel,
                    })
                    if (editTarget.itemId) params.set('item_id', editTarget.itemId)
                    if (compositionMode === 'side')  params.set('recipe_type', 'accompagnement')
                    if (compositionMode === 'drink') params.set('recipe_type', 'boisson')
                    closeEdit()
                    router.push(`/recipes/add?${params}`)
                  }}
                  className="w-full flex items-center gap-3 px-4 py-3 border-2 border-dashed border-[var(--mf-primary)]/40 rounded-xl hover:bg-[var(--mf-bg-card)] transition-colors group"
                >
                  <PlusCircle className="h-5 w-5 text-[var(--mf-text-tertiary)] group-hover:text-[var(--mf-primary)] transition-colors" />
                  <span className="text-sm font-quicksand text-[var(--mf-text-tertiary)] group-hover:text-[var(--mf-primary)] transition-colors">
                    Créer un repas personnalisé…
                  </span>
                </button>
              </div>
              )}
            </div>
          </div>
        </>
      )}
    </>
  )
}

// ─── Carte template vide ──────────────────────────────────────────────────────

function TemplateEmptyCard({ onAdd }: { onAdd: () => void }) {
  return (
    <button
      type="button"
      onClick={onAdd}
      className="mx-4 border-2 border-dashed border-[var(--mf-border-warm)] rounded-xl p-3.5 flex items-center gap-3 w-[calc(100%-2rem)] hover:border-[var(--mf-primary)]/50 hover:bg-[var(--mf-bg-card)] transition-colors group"
    >
      <PlusCircle className="h-6 w-6 text-[var(--mf-text-tertiary)] group-hover:text-[var(--mf-primary)] transition-colors flex-shrink-0" />
      <div className="text-left">
        <p className="text-sm font-quicksand text-[var(--mf-text-tertiary)] group-hover:text-[var(--mf-primary)] transition-colors">
          Ajouter une recette
        </p>
        <p className="text-[11px] font-quicksand text-[var(--mf-text-tertiary)]">
          Toute la semaine
        </p>
      </div>
    </button>
  )
}

// ─── Carte quotidienne vide ───────────────────────────────────────────────────

function DailyEmptyCard({ dayLabel, onAdd }: { dayLabel: string; onAdd: () => void }) {
  return (
    <button
      type="button"
      onClick={onAdd}
      className="flex-shrink-0 w-28 border-2 border-dashed border-[var(--mf-border-warm)] rounded-xl p-2.5 flex flex-col gap-1 min-h-[100px] hover:border-[var(--mf-primary)]/50 hover:bg-[var(--mf-bg-card)] transition-colors group"
    >
      <p className="text-[10px] font-quicksand font-bold uppercase tracking-wider text-[var(--mf-text-tertiary)] self-start">
        {dayLabel}
      </p>
      <div className="flex-1 flex flex-col items-center justify-center gap-1">
        <PlusCircle className="h-5 w-5 text-[var(--mf-text-tertiary)] group-hover:text-[var(--mf-primary)] transition-colors" />
        <p className="text-[10px] font-quicksand text-[var(--mf-text-tertiary)] group-hover:text-[var(--mf-primary)] transition-colors">
          Ajouter
        </p>
      </div>
    </button>
  )
}

// ─── Carte template remplie ───────────────────────────────────────────────────

interface TemplateCardProps {
  item:    PlanItem
  locking: boolean
  onEdit:  () => void
  onLock:  () => void
}

function TemplateCard({ item, locking, onEdit, onLock }: TemplateCardProps) {
  const recipe = item.recipes
  const locked = item.is_locked

  return (
    <div className={`mx-4 border rounded-xl p-3.5 flex items-center gap-3 transition-colors ${
      locked ? 'bg-orange-50 border-[var(--mf-primary)]/30' : 'bg-[var(--mf-bg-card)] border-[var(--mf-border-warm)]'
    }`}>
      <div className="flex-shrink-0">
        {recipe?.categories?.icon
          ? <span className="text-2xl">{recipe.categories.icon}</span>
          : <Utensils className="h-6 w-6 text-[var(--mf-text-tertiary)]" />}
      </div>
      <div className="flex-1 min-w-0">
        <p className="font-dosis font-semibold text-sm text-[var(--mf-text-primary)] truncate">
          {composedName(recipe?.name, item.meal_compositions)}
        </p>
        <p className="text-[11px] font-quicksand text-[var(--mf-text-tertiary)]">Toute la semaine</p>
        {recipe?.prep_time_min && (
          <div className="flex items-center gap-1 mt-0.5">
            <Clock className="h-3 w-3 text-[var(--mf-text-tertiary)]" />
            <span className="text-[11px] font-quicksand text-[var(--mf-text-secondary)]">
              {recipe.prep_time_min} min
            </span>
          </div>
        )}
      </div>
      <div className="flex items-center gap-1.5 flex-shrink-0">
        <button type="button" onClick={onLock} disabled={locking}
          aria-label={locked ? 'Déverrouiller' : 'Verrouiller'}
          className="p-1.5 transition-colors disabled:opacity-40">
          {locking
            ? <Loader2 className="h-4 w-4 text-[var(--mf-text-tertiary)] animate-spin" />
            : locked
              ? <Lock className="h-4 w-4 text-[var(--mf-primary)]" />
              : <LockOpen className="h-4 w-4 text-[var(--mf-text-tertiary)]" />}
        </button>
        <button type="button" onClick={onEdit}
          aria-label="Changer ce repas"
          className="p-1.5 text-[var(--mf-text-secondary)] hover:text-[var(--mf-primary)] transition-colors">
          <Pencil className="h-4 w-4" />
        </button>
      </div>
    </div>
  )
}

// ─── Carte quotidienne remplie ────────────────────────────────────────────────

interface DailyCardProps {
  dayLabel: string
  item:     PlanItem
  locking:  boolean
  onEdit:   () => void
  onLock:   () => void
}

function DailyCard({ dayLabel, item, locking, onEdit, onLock }: DailyCardProps) {
  const recipe = item.recipes
  const locked = item.is_locked

  return (
    <div className={`flex-shrink-0 w-28 border rounded-xl p-2.5 flex flex-col gap-1.5 transition-colors ${
      locked ? 'bg-orange-50 border-[var(--mf-primary)]/30' : 'bg-[var(--mf-bg-card)] border-[var(--mf-border-warm)]'
    }`}>
      <p className="text-[10px] font-quicksand font-bold uppercase tracking-wider text-[var(--mf-text-tertiary)]">
        {dayLabel}
      </p>
      <div className="flex-1">
        {recipe?.categories?.icon
          ? <span className="text-xl">{recipe.categories.icon}</span>
          : <Utensils className="h-5 w-5 text-[var(--mf-text-tertiary)]" />}
        <p className="text-[11px] font-quicksand font-semibold text-[var(--mf-text-primary)] mt-1 line-clamp-2 leading-tight">
          {composedName(recipe?.name, item.meal_compositions)}
        </p>
        {recipe?.prep_time_min && (
          <div className="flex items-center gap-0.5 mt-1">
            <Clock className="h-2.5 w-2.5 text-[var(--mf-text-tertiary)]" />
            <span className="text-[10px] font-quicksand text-[var(--mf-text-secondary)]">
              {recipe.prep_time_min} min
            </span>
          </div>
        )}
      </div>
      <div className="flex items-center gap-0.5">
        <button type="button" onClick={onLock} disabled={locking}
          aria-label={locked ? 'Déverrouiller' : 'Verrouiller'}
          className="p-1 transition-colors disabled:opacity-40">
          {locking
            ? <Loader2 className="h-3.5 w-3.5 text-[var(--mf-text-tertiary)] animate-spin" />
            : locked
              ? <Lock className="h-3.5 w-3.5 text-[var(--mf-primary)]" />
              : <LockOpen className="h-3.5 w-3.5 text-[var(--mf-text-tertiary)]" />}
        </button>
        <button type="button" onClick={onEdit}
          aria-label="Changer ce repas"
          className="p-1 text-[var(--mf-text-secondary)] hover:text-[var(--mf-primary)] transition-colors">
          <Pencil className="h-3.5 w-3.5" />
        </button>
      </div>
    </div>
  )
}

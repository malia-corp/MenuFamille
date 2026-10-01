'use client'

import { useEffect, useRef, useState } from 'react'
import { useRouter } from 'next/navigation'
import {
  ArrowRight,
  CalendarDays,
  ChevronDown,
  ChevronLeft,
  ChevronRight,
  ChevronUp,
  Clock,
  LayoutGrid,
  Loader2,
  Minus,
  Plus,
  PlusCircle,
  Search,
  Settings,
  Timer,
  Trash2,
  Users,
  X,
  Zap,
} from 'lucide-react'
import { MEAL_EMOJI, MEAL_LABEL, type MealType } from '@/lib/constants/meal-type'
import { DAY_OPTIONS, getMondayISO, shiftWeek, formatWeekRange, dayOfWeekFromDate, type DayOfWeek } from '@/lib/utils/week'
import { sortByMealType } from '@/lib/utils/sort-meal-configs'
import { countFilledSlots, dayFilledCount, isDayComplete } from '@/lib/utils/plan-progress'
import { GeneratingOverlay } from '@/components/plan/generating-overlay'
import { DayTabs } from '@/components/plan/day-tabs'
import { MealTypeTabs } from '@/components/plan/meal-type-tabs'
import { MealDetailCard, type SuggestionChip } from '@/components/plan/meal-detail-card'
import { WeekGrid } from '@/components/plan/week-grid'
import { DayFocusView } from '@/components/plan/day-focus-view'

// ─── Types ────────────────────────────────────────────────────────────────────

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
  mainRecipeId:      string | null
  meal_compositions: Composition[]
}

interface SuggestedRecipe {
  id:       string
  name:     string
  category: { icon: string | null } | null
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

const SCOPE_OPTIONS: { val: Scope; label: string }[] = [
  { val: 'all',        label: 'Tout'         },
  { val: 'mes',        label: 'Mes recettes' },
  { val: 'famille',    label: 'Famille'      },
  { val: 'communaute', label: 'Communauté'   },
]

// ─── Helpers ──────────────────────────────────────────────────────────────────

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
  const sessionStartRef  = useRef<number | null>(null)
  const autoGenTriggered = useRef(false)

  // ── Navigation jour / type de repas actifs ────────────────────────────────
  const [selectedDay,      setSelectedDay]      = useState<DayOfWeek>(() => dayOfWeekFromDate(new Date()))
  const [selectedMealType, setSelectedMealType] = useState<MealType | null>(null)
  const [showCompletedSummary, setShowCompletedSummary] = useState(false)
  const [regeneratingSlot, setRegeneratingSlot] = useState(false)
  const [desktopView, setDesktopView] = useState<'week' | 'day'>('week')

  // Suggestions affichées en permanence sur la carte (pas seulement dans la sheet)
  const [cardSideSuggestions,  setCardSideSuggestions]  = useState<SuggestionChip[]>([])
  const [cardDrinkSuggestions, setCardDrinkSuggestions] = useState<SuggestionChip[]>([])
  const [mainSuggestions,      setMainSuggestions]      = useState<{ id: string; name: string; icon: string; prepTimeMin: number | null }[]>([])

  // ── Edit bottom sheet ─────────────────────────────────────────────────────
  const [editTarget,              setEditTarget]              = useState<EditTarget | null>(null)
  const [editRecipes,             setEditRecipes]             = useState<PickerRecipe[]>([])
  const [editSearch,              setEditSearch]              = useState('')
  const [changingRecipe,          setChangingRecipe]          = useState(false)
  const [servings,                setServings]                = useState(4)
  const [updatingServings,        setUpdatingServings]        = useState(false)
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
  const [suggestedRecipes,  setSuggestedRecipes]  = useState<SuggestedRecipe[]>([])
  const [boissonCategoryId, setBoissonCategoryId]  = useState<string | null>(null)
  const [removingCompId,    setRemovingCompId]    = useState<string | null>(null)

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

      const active = sortByMealType(
        (Array.isArray(configData) ? configData as MealConfig[] : []).filter(c => c.is_active)
      )

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

  // Categories (pour exclure/filtrer la boisson) — chargees des le depart plutot
  // que seulement a la premiere ouverture de la sheet, car les suggestions
  // rapides affichees en permanence sur la carte en ont besoin aussi.
  useEffect(() => {
    if (pickerCategoriesLoaded) return
    void (async () => {
      try {
        const res  = await fetch('/api/categories')
        const data = await res.json()
        const cats = Array.isArray(data) ? (data as Category[]) : []
        setPickerCategories(cats)
        setPickerCategoriesLoaded(true)
        setBoissonCategoryId(cats.find(c => c.slug === 'boisson')?.id ?? null)
      } catch { /* silent */ }
    })()
  }, [pickerCategoriesLoaded])

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

  // ── Déclenchement depuis le FAB (composant global de layout) ─────────────
  // Depuis une autre route : navigation vers /plan?generate=1, consommé ici.
  // Depuis /plan : événement direct, pas de state/contexte partagé.

  useEffect(() => {
    if (autoGenTriggered.current || viewState !== 'review') return
    if (typeof window === 'undefined') return
    if (new URLSearchParams(window.location.search).get('generate') !== '1') return
    autoGenTriggered.current = true
    router.replace('/plan')
    void generateMenu()
  }, [viewState]) // eslint-disable-line react-hooks/exhaustive-deps

  useEffect(() => {
    function onGenerateEvent() { void generateMenu() }
    window.addEventListener('kkb:generate-week', onGenerateEvent)
    return () => window.removeEventListener('kkb:generate-week', onGenerateEvent)
  }) // eslint-disable-line react-hooks/exhaustive-deps

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

  // ── Chargement des détails du sheet (plat principal + compositions) ─────

  useEffect(() => {
    if (!editTarget?.itemId || !plan) { setSheetDetails(null); return }
    void refreshSheetItem(editTarget.itemId, plan.id)
  }, [editTarget?.itemId, plan?.id]) // eslint-disable-line react-hooks/exhaustive-deps

  // ── Type de repas actif par défaut (premier actif une fois les configs chargées) ──

  const activeConfigs = configs.filter(c => c.is_active)

  useEffect(() => {
    if (activeConfigs.length === 0) return
    if (!selectedMealType || !activeConfigs.some(c => c.meal_type === selectedMealType)) {
      setSelectedMealType(activeConfigs[0].meal_type)
    }
  }, [configs]) // eslint-disable-line react-hooks/exhaustive-deps

  // ── Helpers de données ────────────────────────────────────────────────────

  function getTemplateItem(mealType: MealType): PlanItem | undefined {
    return plan?.meal_plan_items.find(i => i.meal_type === mealType && i.applies_all_days)
  }

  function getDailyItem(mealType: MealType, day: DayOfWeek): PlanItem | undefined {
    return plan?.meal_plan_items.find(
      i => i.meal_type === mealType && i.day_of_week === day && !i.applies_all_days
    )
  }

  function getItemFor(mealType: MealType, day: DayOfWeek): PlanItem | undefined {
    const config = activeConfigs.find(c => c.meal_type === mealType)
    if (!config) return undefined
    return config.mode === 'template' ? getTemplateItem(mealType) : getDailyItem(mealType, day)
  }

  const activeConfig = selectedMealType ? activeConfigs.find(c => c.meal_type === selectedMealType) : undefined
  const activeItem   = selectedMealType ? getItemFor(selectedMealType, selectedDay) : undefined

  // ── Suggestions affichées en permanence sur la carte du repas actif ──────

  useEffect(() => {
    const recipeId = activeItem?.recipes?.id
    if (!recipeId) {
      setCardSideSuggestions([])
      setCardDrinkSuggestions([])
    } else {
      void fetchSuggestionChips(recipeId, 'side').then(setCardSideSuggestions)
      void fetchSuggestionChips(recipeId, 'drink').then(setCardDrinkSuggestions)
    }

    void (async () => {
      try {
        const params = new URLSearchParams({ scope: 'all' })
        if (boissonCategoryId) params.set('exclude_category_id', boissonCategoryId)
        const res  = await fetch(`/api/recipes?${params}`)
        const data = await res.json()
        const list = (Array.isArray(data) ? data as PickerRecipe[] : [])
          .filter(r => r.id !== recipeId)
          .slice(0, 4)
          .map(r => ({ id: r.id, name: r.name, icon: r.categories?.icon ?? '🍴', prepTimeMin: r.prep_time_min }))
        setMainSuggestions(list)
      } catch {
        setMainSuggestions([])
      }
    })()
  }, [activeItem?.id, activeItem?.recipes?.id, boissonCategoryId]) // eslint-disable-line react-hooks/exhaustive-deps

  async function fetchSuggestionChips(recipeId: string, role: 'side' | 'drink'): Promise<SuggestionChip[]> {
    try {
      const res  = await fetch(`/api/recipes/${recipeId}/suggestions?role=${role}`)
      const data = await res.json()
      return (Array.isArray(data) ? data : []).map((s: { id: string; name: string; category?: { icon: string | null } | null }) => ({
        id: s.id, name: s.name, icon: s.category?.icon ?? '🍴',
      }))
    } catch {
      return []
    }
  }

  // ── Picker : chargement des recettes ─────────────────────────────────────
  // mode 'main'  : tout sauf les boissons (recipe_type est supprimé — n'importe
  //                quelle recette non-boisson peut être un plat principal)
  // mode 'side'  : aucune restriction, comme avant (l'accompagnement n'est pas
  //                une catégorie, c'est une relation apprise — voir suggestions)
  // mode 'drink' : uniquement la catégorie boisson
  async function loadPickerRecipes(
    scope: Scope, categoryId: string | null, search: string,
    mode: 'main' | 'side' | 'drink', boissonIdOverride?: string | null,
  ) {
    setPickerLoading(true)
    try {
      const params = new URLSearchParams({ scope })
      if (categoryId)     params.set('category_id', categoryId)
      if (search.trim())  params.set('search', search.trim())
      const boissonId = boissonIdOverride !== undefined ? boissonIdOverride : boissonCategoryId
      if (mode === 'drink' && boissonId) params.set('category_id', boissonId)
      if (mode === 'main'  && boissonId) params.set('exclude_category_id', boissonId)
      const res  = await fetch(`/api/recipes?${params}`)
      const data = await res.json()
      setEditRecipes(Array.isArray(data) ? (data as PickerRecipe[]) : [])
    } catch {
      setEditRecipes([])
    } finally {
      setPickerLoading(false)
    }
  }

  async function loadSuggestions(mainRecipeId: string, role: 'side' | 'drink') {
    try {
      const res = await fetch(`/api/recipes/${mainRecipeId}/suggestions?role=${role}`)
      const data = await res.json()
      setSuggestedRecipes(Array.isArray(data) ? data : [])
    } catch {
      setSuggestedRecipes([])
    }
  }

  // Partie commune entre "ouvrir la sheet" et "action rapide depuis la carte" :
  // recharge un item et le fusionne dans `plan`, sans dépendre de la sheet.
  async function syncItem(itemId: string, planId: string): Promise<Composition[]> {
    const res = await fetch(`/api/meal-plans/${planId}/items/${itemId}`)
    if (!res.ok) return []
    const data = await res.json()
    type R = { id: string; role: string; sort_order: number; recipe_id: string; recipes: { id: string; name: string } | null }
    const comps: Composition[] = ((data.meal_compositions ?? []) as R[]).map(c => ({
      id: c.id, role: c.role as 'side' | 'drink',
      sort_order: c.sort_order, recipe_id: c.recipe_id, recipes: c.recipes ?? null,
    }))
    setPlan(prev => prev ? {
      ...prev,
      meal_plan_items: prev.meal_plan_items.map(i => i.id === itemId ? { ...i, meal_compositions: comps } : i),
    } : prev)
    return comps
  }

  async function refreshSheetItem(itemId: string, planId: string) {
    try {
      const comps = await syncItem(itemId, planId)
      const res   = await fetch(`/api/meal-plans/${planId}/items/${itemId}`)
      const data  = res.ok ? await res.json() : null
      setSheetDetails({
        mainRecipeId:      (data?.recipes as { id?: string } | null)?.id ?? null,
        meal_compositions: comps,
      })
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
    void loadPickerRecipes('all', null, '', 'main', boissonCategoryId)
  }

  function closeEdit() {
    if (pickerSearchTimerRef.current) clearTimeout(pickerSearchTimerRef.current)
    setEditTarget(null)
    setEditSearch('')
    setCompositionMode(null)
    setSheetDetails(null)
    setSuggestedRecipes([])
  }

  function pickerModeFor(mode: 'side' | 'drink' | null): 'main' | 'side' | 'drink' {
    return mode ?? 'main'
  }

  function handleScopeChange(scope: Scope) {
    setPickerScope(scope)
    void loadPickerRecipes(scope, pickerCategory, editSearch, pickerModeFor(compositionMode))
  }

  function handleCategoryChange(catId: string | null) {
    setPickerCategory(catId)
    void loadPickerRecipes(pickerScope, catId, editSearch, pickerModeFor(compositionMode))
  }

  function handlePickerSearch(value: string) {
    setEditSearch(value)
    if (pickerSearchTimerRef.current) clearTimeout(pickerSearchTimerRef.current)
    pickerSearchTimerRef.current = setTimeout(() => {
      void loadPickerRecipes(pickerScope, pickerCategory, value, pickerModeFor(compositionMode))
    }, 300)
  }

  async function changeRecipe(recipe: { id: string }) {
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
        setSuggestedRecipes([])
        void loadPickerRecipes('all', null, editSearch, 'main')
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

  // Choix direct d'une suggestion de plat principal (sans ouvrir la sheet)
  async function changeRecipeDirect(item: PlanItem, recipeId: string) {
    if (!plan) return
    try {
      const res = await fetch(`/api/meal-plans/${plan.id}/items/${item.id}`, {
        method: 'PATCH', headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ recipe_id: recipeId }),
      })
      if (!res.ok) return
      const updated: PlanItem = await res.json()
      setPlan(prev => prev ? { ...prev, meal_plan_items: prev.meal_plan_items.map(i => i.id === updated.id ? updated : i) } : prev)
      setModCount(c => c + 1)
    } catch { /* silent */ }
  }

  // Suppression d'une composition — appelable depuis la sheet (compId connu via
  // editTarget) ou directement depuis la carte (chip "x", sans ouvrir la sheet).
  async function removeComposition(itemId: string, compId: string) {
    if (!plan || removingCompId) return
    setRemovingCompId(compId)
    try {
      const res = await fetch(
        `/api/meal-plans/${plan.id}/items/${itemId}/compositions/${compId}`,
        { method: 'DELETE' }
      )
      if (!res.ok) throw new Error()
      await syncItem(itemId, plan.id)
      if (editTarget?.itemId === itemId) await refreshSheetItem(itemId, plan.id)
    } catch { /* silent */ } finally {
      setRemovingCompId(null)
    }
  }

  // Ajout rapide d'un accompagnement depuis une puce de suggestion affichée
  // sur la carte — même endpoint que la sheet, sans l'ouvrir.
  async function quickAddSide(item: PlanItem, recipeId: string) {
    if (!plan) return
    try {
      await fetch(`/api/meal-plans/${plan.id}/items/${item.id}/compositions`, {
        method:  'POST',
        headers: { 'Content-Type': 'application/json' },
        body:    JSON.stringify({ recipe_id: recipeId, role: 'side' }),
      })
      await syncItem(item.id, plan.id)
    } catch { /* silent */ }
  }

  // Remplacement rapide de la boisson — retire l'actuelle puis ajoute la
  // nouvelle (une seule boisson à la fois, contrairement aux accompagnements).
  async function quickReplaceDrink(item: PlanItem, recipeId: string) {
    if (!plan) return
    try {
      const current = item.meal_compositions.filter(c => c.role === 'drink')
      for (const comp of current) {
        await fetch(`/api/meal-plans/${plan.id}/items/${item.id}/compositions/${comp.id}`, { method: 'DELETE' })
      }
      await fetch(`/api/meal-plans/${plan.id}/items/${item.id}/compositions`, {
        method:  'POST',
        headers: { 'Content-Type': 'application/json' },
        body:    JSON.stringify({ recipe_id: recipeId, role: 'drink' }),
      })
      await syncItem(item.id, plan.id)
    } catch { /* silent */ }
  }

  // Re-tirage rapide d'un seul repas (pas une regeneration complete de la
  // semaine) — pioche une autre recette dans le meme pool que la sheet.
  async function regenerateSlot(mealType: MealType, day: DayOfWeek, isTemplate: boolean, item: PlanItem | undefined) {
    if (!plan || regeneratingSlot) return
    setRegeneratingSlot(true)
    try {
      const params = new URLSearchParams({ scope: 'all' })
      if (boissonCategoryId) params.set('exclude_category_id', boissonCategoryId)
      const res  = await fetch(`/api/recipes?${params}`)
      const data = await res.json()
      const pool = (Array.isArray(data) ? data as PickerRecipe[] : []).filter(r => r.id !== item?.recipes?.id)
      if (pool.length === 0) return
      const pick = pool[Math.floor(Math.random() * pool.length)]

      if (item) {
        const r = await fetch(`/api/meal-plans/${plan.id}/items/${item.id}`, {
          method: 'PATCH', headers: { 'Content-Type': 'application/json' },
          body: JSON.stringify({ recipe_id: pick.id }),
        })
        if (r.ok) {
          const updated: PlanItem = await r.json()
          setPlan(prev => prev ? { ...prev, meal_plan_items: prev.meal_plan_items.map(i => i.id === updated.id ? updated : i) } : prev)
        }
      } else {
        const r = await fetch(`/api/meal-plans/${plan.id}/items`, {
          method: 'POST', headers: { 'Content-Type': 'application/json' },
          body: JSON.stringify({ day_of_week: day, meal_type: mealType, applies_all_days: isTemplate, recipe_id: pick.id }),
        })
        if (r.ok) {
          const newItem: PlanItem = await r.json()
          setPlan(prev => prev ? { ...prev, meal_plan_items: [...prev.meal_plan_items, newItem] } : prev)
        }
      }
      setModCount(c => c + 1)
    } catch { /* silent */ } finally {
      setRegeneratingSlot(false)
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

  // ── Navigation semaine / jour ─────────────────────────────────────────────

  function goToPrevWeek() { setSelectedWeek(w => shiftWeek(w, -1)) }
  function goToNextWeek() { setSelectedWeek(w => shiftWeek(w, 1))  }

  function goToNextDay() {
    const idx = DAY_OPTIONS.findIndex(d => d.val === selectedDay)
    if (idx < 6) {
      setSelectedDay(DAY_OPTIONS[idx + 1].val)
    } else {
      router.push(`/plan/validate?week=${selectedWeek}`)
    }
  }

  // ── Rendu ─────────────────────────────────────────────────────────────────

  const selectedDayIdx = DAY_OPTIONS.findIndex(d => d.val === selectedDay)
  const dayOpt         = DAY_OPTIONS[selectedDayIdx]
  const isLastDay      = selectedDayIdx === 6
  const { filled, total } = plan ? countFilledSlots(activeConfigs, plan.meal_plan_items) : { filled: 0, total: 0 }
  const completedDaysBefore = DAY_OPTIONS.slice(0, selectedDayIdx).filter(
    d => plan && isDayComplete(activeConfigs, plan.meal_plan_items, d.val)
  )
  const dayFilled = plan ? dayFilledCount(activeConfigs, plan.meal_plan_items, selectedDay) : 0

  const mealDetailCardEl = selectedMealType && activeConfig && (
    <MealDetailCard
      emoji={MEAL_EMOJI[selectedMealType]}
      title={`${MEAL_LABEL[selectedMealType]} du ${dayOpt.full}`}
      recipe={activeItem?.recipes ?? null}
      sideChips={(activeItem?.meal_compositions ?? [])
        .filter(c => c.role === 'side')
        .map(c => ({ id: c.id, recipeId: c.recipe_id, name: c.recipes?.name ?? '?' }))}
      drinkChip={(() => {
        const d = (activeItem?.meal_compositions ?? []).find(c => c.role === 'drink')
        return d ? { id: d.id, recipeId: d.recipe_id, name: d.recipes?.name ?? '?' } : null
      })()}
      sideSuggestions={cardSideSuggestions}
      drinkSuggestions={cardDrinkSuggestions}
      mainSuggestions={activeItem?.recipes ? mainSuggestions : []}
      onEditMain={() => { void openEdit(activeItem ?? null, selectedMealType, selectedDay, activeConfig.mode === 'template') }}
      onRegenerateMain={() => { void regenerateSlot(selectedMealType, selectedDay, activeConfig.mode === 'template', activeItem) }}
      onAddSide={() => {
        void openEdit(activeItem ?? null, selectedMealType, selectedDay, activeConfig.mode === 'template').then(() => {
          setCompositionMode('side')
          void loadPickerRecipes('all', null, '', 'side')
          if (activeItem?.recipes?.id) void loadSuggestions(activeItem.recipes.id, 'side')
        })
      }}
      onRemoveSide={compId => { if (activeItem) void removeComposition(activeItem.id, compId) }}
      onQuickAddSide={recipeId => { if (activeItem) void quickAddSide(activeItem, recipeId) }}
      onChangeDrink={() => {
        void openEdit(activeItem ?? null, selectedMealType, selectedDay, activeConfig.mode === 'template').then(() => {
          setCompositionMode('drink')
          void loadPickerRecipes('all', null, '', 'drink')
          if (activeItem?.recipes?.id) void loadSuggestions(activeItem.recipes.id, 'drink')
        })
      }}
      onQuickReplaceDrink={recipeId => { if (activeItem) void quickReplaceDrink(activeItem, recipeId) }}
      onPickMainSuggestion={recipeId => { if (activeItem) void changeRecipeDirect(activeItem, recipeId) }}
      removingCompId={removingCompId}
      busy={regeneratingSlot}
    />
  )

  return (
    <>
      {/* Sous-header : navigation semaine */}
      <div className="sticky top-14 z-30 bg-[var(--kkb-bg)] border-b border-[var(--kkb-border)] px-4 h-10 flex items-center justify-between">
        <button
          type="button"
          onClick={goToPrevWeek}
          className="p-1.5 text-[var(--kkb-text-secondary)] hover:text-[var(--kkb-coral)] transition-colors"
          aria-label="Semaine précédente"
        >
          <ChevronLeft className="h-4 w-4" />
        </button>

        <p className="font-quicksand text-xs font-semibold text-[var(--kkb-text-secondary)]">
          {formatWeekRange(selectedWeek)}
        </p>

        <div className="flex items-center gap-0.5">
          <button
            type="button"
            onClick={goToNextWeek}
            className="p-1.5 text-[var(--kkb-text-secondary)] hover:text-[var(--kkb-coral)] transition-colors"
            aria-label="Semaine suivante"
          >
            <ChevronRight className="h-4 w-4" />
          </button>
          <button
            type="button"
            onClick={() => router.push('/plan/configure')}
            className="p-1.5 text-[var(--kkb-text-secondary)] hover:text-[var(--kkb-coral)] transition-colors"
            aria-label="Configurer les repas"
          >
            <Settings className="h-4 w-4" />
          </button>
        </div>
      </div>

      {/* Stepper — 2 étapes réelles (cf. plan) : "Rythme & Convives" vit sur l'Accueil, pas ici */}
      <div className="bg-[var(--kkb-bg)] border-b border-[var(--kkb-border)] px-4 py-2.5">
        <div className="flex items-center justify-center gap-1.5">
          <div className="flex items-center gap-1.5">
            <div className="w-5 h-5 rounded-full bg-[var(--kkb-coral)] flex items-center justify-center">
              <span className="text-white text-[10px] font-bold">1</span>
            </div>
            <span className="text-[10px] font-quicksand font-bold uppercase tracking-wider text-[var(--kkb-coral)]">
              Planifier
            </span>
          </div>

          <ChevronRight className="h-3 w-3 text-[var(--kkb-border)]" />

          {plan && plan.meal_plan_items.length > 0 ? (
            <button
              type="button"
              onClick={() => router.push(`/plan/validate?week=${selectedWeek}`)}
              className="flex items-center gap-1.5 group"
            >
              <div className={`w-5 h-5 rounded-full flex items-center justify-center transition-colors ${
                plan.status === 'finalized' || plan.status === 'shared'
                  ? 'bg-[var(--kkb-success)]'
                  : 'bg-[var(--kkb-border)] group-hover:bg-[var(--kkb-coral)]/20'
              }`}>
                <span className={`text-[10px] font-bold ${
                  plan.status === 'finalized' || plan.status === 'shared'
                    ? 'text-white'
                    : 'text-[var(--kkb-text-tertiary)] group-hover:text-[var(--kkb-coral)]'
                }`}>
                  {plan.status === 'finalized' || plan.status === 'shared' ? '✓' : '2'}
                </span>
              </div>
              <span className="text-[10px] font-quicksand font-bold uppercase tracking-wider text-[var(--kkb-text-tertiary)] group-hover:text-[var(--kkb-coral)] transition-colors">
                Synthèse &amp; Validation
              </span>
            </button>
          ) : (
            <div className="flex items-center gap-1.5 opacity-40">
              <div className="w-5 h-5 rounded-full bg-[var(--kkb-border)] flex items-center justify-center">
                <span className="text-[var(--kkb-text-tertiary)] text-[10px] font-bold">2</span>
              </div>
              <span className="text-[10px] font-quicksand font-bold uppercase tracking-wider text-[var(--kkb-text-tertiary)]">
                Synthèse &amp; Validation
              </span>
            </div>
          )}
        </div>
      </div>

      {/* ── Chargement ── */}
      {viewState === 'loading' && (
        <div className="flex items-center justify-center min-h-[50vh]">
          <Loader2 className="h-6 w-6 text-[var(--kkb-coral)] animate-spin" />
        </div>
      )}

      {/* ── Overlay génération ── */}
      {viewState === 'generating' && <GeneratingOverlay genStep={genStep} />}

      {/* ── Grille de révision ── */}
      {viewState === 'review' && (
        <div className="space-y-5 py-4 pb-40">

          {genError && (
            <p className="mx-4 text-sm text-red-600 font-quicksand bg-red-50 px-4 py-2 rounded-xl">
              {genError}
            </p>
          )}

          {/* Barre : convives + stats de session */}
          <div className="flex items-center justify-end gap-3 px-4">
            {plan && (
              <div className="flex items-center gap-1.5">
                <Users className="h-3 w-3 text-[var(--kkb-text-tertiary)]" />
                <button type="button"
                  onClick={() => { void updateServings(servings - 1) }}
                  disabled={servings <= 1 || updatingServings}
                  className="w-4 h-4 rounded-full flex items-center justify-center border border-[var(--kkb-border)] disabled:opacity-40 hover:border-[var(--kkb-coral)] transition-colors">
                  <Minus className="h-2.5 w-2.5 text-[var(--kkb-text-secondary)]" />
                </button>
                <span className="text-[11px] font-quicksand font-semibold text-[var(--kkb-text-primary)] min-w-[1ch] text-center">
                  {updatingServings ? '…' : servings}
                </span>
                <button type="button"
                  onClick={() => { void updateServings(servings + 1) }}
                  disabled={servings >= 20 || updatingServings}
                  className="w-4 h-4 rounded-full flex items-center justify-center border border-[var(--kkb-border)] disabled:opacity-40 hover:border-[var(--kkb-coral)] transition-colors">
                  <Plus className="h-2.5 w-2.5 text-[var(--kkb-text-secondary)]" />
                </button>
              </div>
            )}
            <span className="flex items-center gap-1 text-[11px] font-quicksand text-[var(--kkb-text-tertiary)]">
              <Timer className="h-3 w-3" />
              {formatTime(sessionTime)} · {modCount} modif.
            </span>
          </div>

          {/* Bannière génération magique */}
          <button
            type="button"
            onClick={() => { void generateMenu() }}
            className="mx-4 flex items-center gap-3 bg-[var(--kkb-warning-light)] rounded-[var(--kkb-radius-sm)] px-4 py-3 text-left"
          >
            <Zap className="h-5 w-5 text-[var(--kkb-warning)] shrink-0" />
            <div className="flex-1 min-w-0">
              <p className="font-quicksand font-bold text-sm text-[var(--kkb-text-primary)]">Génération magique 1-clic</p>
              <p className="text-xs font-quicksand text-[var(--kkb-text-secondary)] truncate">
                Remplir automatiquement le reste de la semaine
              </p>
            </div>
            <ChevronRight className="h-4 w-4 text-[var(--kkb-text-tertiary)] shrink-0" />
          </button>

          {activeConfigs.length === 0 ? (
            <div className="mx-4 flex flex-col items-center gap-3 py-8 text-center">
              <p className="text-sm font-quicksand text-[var(--kkb-text-secondary)]">
                Aucun type de repas actif.
              </p>
              <button
                type="button"
                onClick={() => router.push('/plan/configure')}
                className="text-sm text-[var(--kkb-coral)] underline font-quicksand"
              >
                Configurer les repas
              </button>
            </div>
          ) : (
            <>
              {/* Barre de progression */}
              {plan && (
                <div className="px-4 lg:px-6 space-y-1.5">
                  <div className="flex items-center justify-between">
                    <span className="flex items-center gap-1.5 text-xs font-quicksand font-bold text-[var(--kkb-text-primary)]">
                      <span className="h-1.5 w-1.5 rounded-full bg-[var(--kkb-success)]" />
                      {filled} REPAS PLANIFIÉS SUR {total}
                    </span>
                    <span className="text-xs font-quicksand text-[var(--kkb-text-tertiary)] lg:hidden">
                      Jour {selectedDayIdx + 1} sur 7
                    </span>
                  </div>
                  <div className="h-1 w-full rounded-full bg-[var(--kkb-border)] overflow-hidden">
                    <div
                      className="h-full rounded-full bg-[var(--kkb-coral)] transition-all duration-300"
                      style={{ width: total > 0 ? `${(filled / total) * 100}%` : '0%' }}
                    />
                  </div>
                </div>
              )}

              {/* ── Mobile : jour par jour ── */}
              <div className="lg:hidden space-y-5">
              {/* Tabs jours */}
              {plan && (
                <DayTabs
                  weekStart={selectedWeek}
                  selectedDay={selectedDay}
                  onSelect={setSelectedDay}
                  configs={activeConfigs}
                  items={plan.meal_plan_items}
                />
              )}

              {/* Résumé des jours précédents déjà complets */}
              {completedDaysBefore.length > 0 && (
                <div className="mx-4 bg-white border border-[var(--kkb-border)] rounded-[var(--kkb-radius-sm)] overflow-hidden">
                  <button
                    type="button"
                    onClick={() => setShowCompletedSummary(s => !s)}
                    className="w-full flex items-center justify-between px-4 py-3"
                  >
                    <span className="text-sm font-quicksand font-semibold text-[var(--kkb-text-primary)]">
                      Ce qui est déjà prêt pour la semaine
                    </span>
                    <div className="flex items-center gap-2">
                      <span className="text-[10px] font-quicksand font-bold uppercase px-2 py-0.5 rounded-full bg-[var(--kkb-success-light)] text-[var(--kkb-success)]">
                        {completedDaysBefore.length} validé{completedDaysBefore.length > 1 ? 's' : ''}
                      </span>
                      {showCompletedSummary ? <ChevronUp className="h-4 w-4 text-[var(--kkb-text-tertiary)]" /> : <ChevronDown className="h-4 w-4 text-[var(--kkb-text-tertiary)]" />}
                    </div>
                  </button>
                  {showCompletedSummary && (
                    <div className="px-4 pb-3 space-y-1.5">
                      {completedDaysBefore.map(d => (
                        <button
                          key={d.val}
                          type="button"
                          onClick={() => setSelectedDay(d.val)}
                          className="w-full flex items-center justify-between text-sm font-quicksand text-[var(--kkb-text-secondary)] hover:text-[var(--kkb-coral)]"
                        >
                          {d.full}
                          <span className="text-[var(--kkb-success)]">✓</span>
                        </button>
                      ))}
                    </div>
                  )}
                </div>
              )}

              {/* Header du jour */}
              <div className="px-4 flex items-center justify-between">
                <div>
                  <span className="inline-block mb-1 text-[10px] font-quicksand font-bold uppercase tracking-wide px-2 py-0.5 rounded-full bg-[var(--kkb-coral)] text-white">
                    {dayOpt.full}
                  </span>
                  <h2 className="text-h1 text-[var(--kkb-text-primary)] text-xl">Les repas du jour</h2>
                </div>
                <span className="text-xs font-quicksand text-[var(--kkb-text-tertiary)]">
                  {dayFilled}/{activeConfigs.length}
                </span>
              </div>

              {/* Tabs type de repas */}
              {selectedMealType && (
                <MealTypeTabs
                  mealTypes={activeConfigs.map(c => c.meal_type)}
                  selected={selectedMealType}
                  onSelect={setSelectedMealType}
                  isFilled={mt => !!getItemFor(mt, selectedDay)?.recipes}
                />
              )}

              {/* Carte du repas sélectionné */}
              {mealDetailCardEl}
              </div>

              {/* ── Desktop : vue d'ensemble / vue focus par jour ── */}
              <div className="hidden lg:block space-y-5">
                <div className="flex items-center gap-2">
                  <button
                    type="button"
                    onClick={() => setDesktopView('week')}
                    className={`flex items-center gap-1.5 rounded-full px-3 py-1.5 text-xs font-quicksand font-bold transition-colors ${
                      desktopView === 'week' ? 'bg-[var(--kkb-coral)] text-white' : 'bg-white border border-[var(--kkb-border)] text-[var(--kkb-text-secondary)]'
                    }`}
                  >
                    <LayoutGrid className="h-3.5 w-3.5" /> Vue d&apos;ensemble
                  </button>
                  <button
                    type="button"
                    onClick={() => setDesktopView('day')}
                    className={`flex items-center gap-1.5 rounded-full px-3 py-1.5 text-xs font-quicksand font-bold transition-colors ${
                      desktopView === 'day' ? 'bg-[var(--kkb-coral)] text-white' : 'bg-white border border-[var(--kkb-border)] text-[var(--kkb-text-secondary)]'
                    }`}
                  >
                    <CalendarDays className="h-3.5 w-3.5" /> Vue focus par jour
                  </button>
                </div>

                {plan && desktopView === 'week' && (
                  <WeekGrid
                    weekStart={selectedWeek}
                    configs={activeConfigs}
                    items={plan.meal_plan_items}
                    onCellClick={(mealType, day, isTemplate) => {
                      setSelectedMealType(mealType)
                      if (!isTemplate) setSelectedDay(day)
                      setDesktopView('day')
                    }}
                  />
                )}

                {plan && desktopView === 'day' && selectedMealType && (
                  <DayFocusView
                    weekStart={selectedWeek}
                    selectedDay={selectedDay}
                    onSelectDay={setSelectedDay}
                    configs={activeConfigs}
                    items={plan.meal_plan_items}
                    selectedMealType={selectedMealType}
                    onSelectMealType={setSelectedMealType}
                    isFilled={mt => !!getItemFor(mt, selectedDay)?.recipes}
                    card={mealDetailCardEl}
                  />
                )}
              </div>
            </>
          )}
        </div>
      )}

      {/* ── Bouton de validation du jour (sticky) ── */}
      {viewState === 'review' && plan && activeConfigs.length > 0 && (
        <div className="fixed bottom-[72px] left-0 right-0 z-30 bg-white shadow-[0_-2px_12px_rgba(0,0,0,0.06)] px-4 py-3 space-y-1.5">
          <button
            type="button"
            onClick={goToNextDay}
            className="w-full flex items-center justify-center gap-2 rounded-[var(--kkb-radius-pill)] bg-[var(--kkb-coral)] hover:bg-[var(--kkb-coral-hover)] text-white font-quicksand font-bold text-[15px] py-3.5"
          >
            {isLastDay
              ? 'Terminer et aller à la synthèse'
              : `Valider ${dayOpt.full} (${dayFilled} repas) & passer à ${DAY_OPTIONS[selectedDayIdx + 1].full}`}
            <ArrowRight className="h-4 w-4" />
          </button>
          <p className="text-center text-[11px] font-quicksand text-[var(--kkb-text-tertiary)]">
            Ou terminer plus tard · Vos choix sont sauvegardés automatiquement
          </p>
        </div>
      )}

      {/* ── Bottom sheet : choisir une recette ── */}
      {editTarget && (
        <>
          <div className="fixed inset-0 z-40 bg-black/30" onClick={closeEdit} aria-hidden="true" />
          <div className="fixed bottom-0 left-0 right-0 z-50 bg-[var(--kkb-bg)] rounded-t-2xl shadow-xl flex flex-col max-h-[85vh]">
            {/* Handle */}
            <div className="flex justify-center pt-2.5 pb-1 flex-shrink-0">
              <div className="w-10 h-1 rounded-full bg-[var(--kkb-border)]" />
            </div>

            {/* Header */}
            <div className="flex items-start justify-between px-4 pb-2 flex-shrink-0">
              <div className="flex items-center gap-1">
                {compositionMode !== null && (
                  <button
                    type="button"
                    onClick={() => {
                      setCompositionMode(null)
                      setSuggestedRecipes([])
                      void loadPickerRecipes('all', null, editSearch, 'main')
                    }}
                    className="p-1 -ml-1 mr-0.5 text-[var(--kkb-text-secondary)] hover:text-[var(--kkb-coral)] transition-colors"
                    aria-label="Retour"
                  >
                    <ChevronLeft className="h-5 w-5" />
                  </button>
                )}
                <div>
                  <p className="font-dosis font-bold text-base text-[var(--kkb-text-primary)]">
                    {compositionMode === 'side'  ? 'Choisir un accompagnement'
                     : compositionMode === 'drink' ? 'Choisir une boisson'
                     : editTarget.itemId ? 'Changer ce repas' : 'Choisir une recette'}
                  </p>
                  <p className="text-xs font-quicksand text-[var(--kkb-text-secondary)] mt-0.5">
                    {MEAL_EMOJI[editTarget.mealType]}&nbsp;
                    {MEAL_LABEL[editTarget.mealType]} — {editTarget.dayLabel}
                  </p>
                </div>
              </div>
              <button
                type="button"
                onClick={closeEdit}
                className="p-1.5 -mr-1 text-[var(--kkb-text-tertiary)] hover:text-[var(--kkb-text-primary)] transition-colors"
                aria-label="Fermer"
              >
                <X className="h-5 w-5" />
              </button>
            </div>

            {/* Search */}
            <div className="px-4 pb-2 flex-shrink-0">
              <div className="flex items-center gap-2 bg-[var(--kkb-coral-light)] border border-[var(--kkb-border)] rounded-xl px-3 py-2">
                <Search className="h-4 w-4 text-[var(--kkb-text-tertiary)] flex-shrink-0" />
                <input
                  type="search"
                  placeholder="Chercher une recette…"
                  aria-label="Chercher une recette"
                  value={editSearch}
                  onChange={e => handlePickerSearch(e.target.value)}
                  className="flex-1 bg-transparent text-sm font-quicksand text-[var(--kkb-text-primary)] placeholder:text-[var(--kkb-text-tertiary)] outline-none"
                  autoFocus
                />
              </div>
            </div>

            {/* Pills scope */}
            <div className="flex gap-1.5 px-4 pb-2 overflow-x-auto hide-scrollbar flex-shrink-0">
              {SCOPE_OPTIONS.map(opt => (
                <button
                  key={opt.val}
                  type="button"
                  onClick={() => handleScopeChange(opt.val)}
                  className={`flex-shrink-0 px-3 py-1 rounded-full text-[11px] font-quicksand font-bold transition-colors ${
                    pickerScope === opt.val
                      ? 'bg-[var(--kkb-coral)] text-white'
                      : 'bg-[var(--kkb-coral-light)] text-[var(--kkb-text-secondary)] border border-[var(--kkb-border)]'
                  }`}
                >
                  {opt.label}
                </button>
              ))}
            </div>

            {/* Pills catégorie */}
            {pickerCategories.length > 0 && (
              <div className="flex gap-1.5 px-4 pb-2 overflow-x-auto hide-scrollbar flex-shrink-0">
                <button
                  type="button"
                  onClick={() => handleCategoryChange(null)}
                  className={`flex-shrink-0 px-3 py-1 rounded-full text-[11px] font-quicksand font-bold transition-colors ${
                    pickerCategory === null
                      ? 'bg-[var(--kkb-coral)] text-white'
                      : 'bg-[var(--kkb-coral-light)] text-[var(--kkb-text-secondary)] border border-[var(--kkb-border)]'
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
                        ? 'bg-[var(--kkb-coral)] text-white'
                        : 'bg-[var(--kkb-coral-light)] text-[var(--kkb-text-secondary)] border border-[var(--kkb-border)]'
                    }`}
                  >
                    {cat.icon} {cat.name}
                  </button>
                ))}
              </div>
            )}

            <div className="border-t border-[var(--kkb-border)] flex-shrink-0" />

            {/* Suggestions personnalisées — uniquement en mode accompagnement/boisson */}
            {compositionMode !== null && suggestedRecipes.length > 0 && (
              <div className="px-4 py-3 flex-shrink-0 border-b border-[var(--kkb-border)]/60">
                <p className="text-[10px] font-quicksand font-bold uppercase tracking-wider text-[var(--kkb-text-secondary)] mb-2">
                  Suggéré pour vous
                </p>
                <div className="flex gap-2 overflow-x-auto pb-1 hide-scrollbar">
                  {suggestedRecipes.map(s => (
                    <button key={s.id} type="button" onClick={() => { void changeRecipe(s) }}
                      disabled={changingRecipe || addingComposition}
                      className="flex-shrink-0 flex items-center gap-1.5 bg-[var(--kkb-coral-light)] border border-[var(--kkb-border)] rounded-full px-3 py-1.5 text-xs font-quicksand font-medium text-[var(--kkb-text-primary)] disabled:opacity-50">
                      <span>{s.category?.icon ?? '🍴'}</span>
                      {s.name}
                    </button>
                  ))}
                </div>
              </div>
            )}

            {/* Liste de recettes */}
            <div className="overflow-y-auto flex-1">
              {pickerLoading ? (
                <div className="flex justify-center py-8">
                  <Loader2 className="h-5 w-5 text-[var(--kkb-coral)] animate-spin" />
                </div>
              ) : editRecipes.length === 0 ? (
                <p className="text-sm font-quicksand text-[var(--kkb-text-tertiary)] text-center py-8">
                  {editSearch ? 'Aucune recette trouvée' : 'Aucune recette disponible'}
                </p>
              ) : (
                editRecipes.map(recipe => (
                  <button
                    key={recipe.id}
                    type="button"
                    disabled={changingRecipe || addingComposition}
                    onClick={() => { void changeRecipe(recipe) }}
                    className="w-full flex items-center gap-3 px-4 py-3 border-b border-[var(--kkb-border)]/40 last:border-0 hover:bg-[var(--kkb-coral-light)] transition-colors disabled:opacity-50"
                  >
                    <span className="text-xl flex-shrink-0">
                      {recipe.categories?.icon ?? '🍴'}
                    </span>
                    <div className="flex-1 min-w-0 text-left">
                      <p className="text-sm font-quicksand font-medium text-[var(--kkb-text-primary)] truncate">
                        {recipe.name}
                      </p>
                      {recipe.prep_time_min && (
                        <div className="flex items-center gap-1 mt-0.5">
                          <Clock className="h-3 w-3 text-[var(--kkb-text-tertiary)]" />
                          <span className="text-[11px] font-quicksand text-[var(--kkb-text-secondary)]">
                            {recipe.prep_time_min} min
                          </span>
                        </div>
                      )}
                    </div>
                    {recipe.visibility !== 'private' && (
                      <span className={`text-[10px] font-quicksand font-bold uppercase tracking-wider px-1.5 py-0.5 rounded-full flex-shrink-0 ${
                        recipe.visibility === 'circle'
                          ? 'bg-[var(--kkb-warning-light)] text-[var(--kkb-warning)]'
                          : 'bg-emerald-50 text-emerald-600'
                      }`}>
                        {recipe.visibility === 'circle' ? 'Cercle' : 'Commun.'}
                      </span>
                    )}
                    {(changingRecipe || addingComposition) && (
                      <Loader2 className="h-4 w-4 text-[var(--kkb-coral)] animate-spin flex-shrink-0" />
                    )}
                  </button>
                ))
              )}

              {/* Section accompagnement — visible si sauce ET item existant ET pas en mode composition */}
              {editTarget.itemId && sheetDetails !== null && compositionMode === null && (
                <div className="px-4 py-3 border-t border-[var(--kkb-border)]/60">
                  <p className="text-[10px] font-quicksand font-bold uppercase tracking-wider text-[var(--kkb-text-secondary)] mb-2">
                    Accompagnement
                  </p>
                  {sheetDetails.meal_compositions.filter(c => c.role === 'side').map(comp => (
                    <div key={comp.id} className="flex items-center gap-2 py-1.5">
                      <span className="flex-1 text-sm font-quicksand text-[var(--kkb-text-primary)] truncate">
                        {comp.recipes?.name ?? '?'}
                      </span>
                      <button
                        type="button"
                        disabled={!!removingCompId}
                        onClick={() => { if (editTarget.itemId) void removeComposition(editTarget.itemId, comp.id) }}
                        className="p-1 text-[var(--kkb-text-tertiary)] hover:text-red-500 transition-colors disabled:opacity-40"
                        aria-label="Supprimer l'accompagnement"
                      >
                        {removingCompId === comp.id
                          ? <Loader2 className="h-3.5 w-3.5 animate-spin" />
                          : <Trash2 className="h-3.5 w-3.5" />}
                      </button>
                    </div>
                  ))}
                  <button
                    type="button"
                    onClick={() => {
                      setCompositionMode('side')
                      void loadPickerRecipes(pickerScope, pickerCategory, editSearch, 'side')
                      if (sheetDetails.mainRecipeId) void loadSuggestions(sheetDetails.mainRecipeId, 'side')
                    }}
                    className="mt-1 flex items-center gap-1 text-xs font-quicksand text-[var(--kkb-coral)] hover:underline"
                  >
                    <Plus className="h-3 w-3" />
                    Ajouter un accompagnement
                  </button>
                </div>
              )}

              {/* Section boisson — visible si item existant ET détails chargés ET pas en mode composition */}
              {editTarget.itemId && sheetDetails !== null && compositionMode === null && (
                <div className="px-4 py-3 border-t border-[var(--kkb-border)]/60">
                  <p className="text-[10px] font-quicksand font-bold uppercase tracking-wider text-[var(--kkb-text-secondary)] mb-2">
                    Boisson
                  </p>
                  {sheetDetails.meal_compositions.filter(c => c.role === 'drink').map(comp => (
                    <div key={comp.id} className="flex items-center gap-2 py-1.5">
                      <span className="flex-1 text-sm font-quicksand text-[var(--kkb-text-primary)] truncate">
                        {comp.recipes?.name ?? '?'}
                      </span>
                      <button
                        type="button"
                        disabled={!!removingCompId}
                        onClick={() => { if (editTarget.itemId) void removeComposition(editTarget.itemId, comp.id) }}
                        className="p-1 text-[var(--kkb-text-tertiary)] hover:text-red-500 transition-colors disabled:opacity-40"
                        aria-label="Supprimer la boisson"
                      >
                        {removingCompId === comp.id
                          ? <Loader2 className="h-3.5 w-3.5 animate-spin" />
                          : <Trash2 className="h-3.5 w-3.5" />}
                      </button>
                    </div>
                  ))}
                  <button
                    type="button"
                    onClick={() => {
                      setCompositionMode('drink')
                      void loadPickerRecipes('all', null, '', 'drink')
                      if (sheetDetails.mainRecipeId) void loadSuggestions(sheetDetails.mainRecipeId, 'drink')
                    }}
                    className="mt-1 flex items-center gap-1 text-xs font-quicksand text-[var(--kkb-coral)] hover:underline"
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
                    closeEdit()
                    router.push(`/recipes/add?${params}`)
                  }}
                  className="w-full flex items-center gap-3 px-4 py-3 border-2 border-dashed border-[var(--kkb-coral)]/40 rounded-xl hover:bg-[var(--kkb-coral-light)] transition-colors group"
                >
                  <PlusCircle className="h-5 w-5 text-[var(--kkb-text-tertiary)] group-hover:text-[var(--kkb-coral)] transition-colors" />
                  <span className="text-sm font-quicksand text-[var(--kkb-text-tertiary)] group-hover:text-[var(--kkb-coral)] transition-colors">
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

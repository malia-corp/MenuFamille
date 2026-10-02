'use client'

import { useCallback, useEffect, useRef, useState } from 'react'
import { useRouter } from 'next/navigation'
import {
  ArrowRight,
  CalendarDays,
  Check,
  ChevronDown,
  ChevronLeft,
  ChevronRight,
  ChevronUp,
  LayoutGrid,
  Loader2,
  Minus,
  Plus,
  Settings,
  Timer,
  Users,
} from 'lucide-react'
import { MEAL_FULL_LABEL, MEAL_LABEL, type MealType } from '@/lib/constants/meal-type'
import { DAY_OPTIONS, getMondayISO, shiftWeek, formatWeekRange, dayOfWeekFromDate, type DayOfWeek } from '@/lib/utils/week'
import { sortByMealType } from '@/lib/utils/sort-meal-configs'
import { countFilledSlots, countFilledByMealType, dayFilledCount, isDayComplete } from '@/lib/utils/plan-progress'
import { type RecipeScope } from '@/lib/constants/recipe-scope'
import { GeneratingOverlay } from '@/components/plan/generating-overlay'
import { DayTabs } from '@/components/plan/day-tabs'
import { MealDetailCard, type CompositionChip } from '@/components/plan/meal-detail-card'
import { WeekGrid } from '@/components/plan/week-grid'
import { DayFocusView } from '@/components/plan/day-focus-view'
import { RecipePickerPanel } from '@/components/plan/recipe-picker-panel'

// ─── Types ────────────────────────────────────────────────────────────────────

type ViewState = 'loading' | 'generating' | 'review'

interface MealConfig {
  meal_type:     MealType
  is_active:     boolean
  mode:          'daily' | 'template'
  display_order: number
  default_time?: string
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
  photo_url:     string | null
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

// ─── Helpers ──────────────────────────────────────────────────────────────────

function formatTime(s: number): string {
  return `${String(Math.floor(s / 60)).padStart(2, '0')}:${String(s % 60).padStart(2, '0')}`
}

function toChips(compositions: Composition[], role: 'side' | 'drink'): CompositionChip[] {
  return compositions.filter(c => c.role === role).map(c => ({ id: c.id, recipeId: c.recipe_id, name: c.recipes?.name ?? '?' }))
}

// ─── Hook : état d'un picker de recettes (plat principal / accompagnement / boisson) ──
// Chacune des 3 instances (main/side/drink) a sa propre recherche/scope/catégorie/liste,
// totalement indépendante des deux autres — contrainte (forcer ou exclure une catégorie,
// ex. la boisson) passée à `reset()` plutôt que figée à la création.

interface PickerConstraint {
  forceCategoryId?:   string | null
  excludeCategoryId?: string | null
}

function useRecipePicker() {
  const [scope,      setScopeState]    = useState<RecipeScope>('all')
  const [categoryId, setCategoryIdState] = useState<string | null>(null)
  const [search,     setSearchState]   = useState('')
  const [recipes,    setRecipes]       = useState<PickerRecipe[]>([])
  const [loading,    setLoading]       = useState(false)
  const timerRef      = useRef<ReturnType<typeof setTimeout> | null>(null)
  const constraintRef = useRef<PickerConstraint>({})

  const load = useCallback(async (searchValue: string, scopeValue: RecipeScope, categoryValue: string | null) => {
    setLoading(true)
    try {
      const params = new URLSearchParams({ scope: scopeValue })
      const { forceCategoryId, excludeCategoryId } = constraintRef.current
      const catId = forceCategoryId ?? categoryValue
      if (catId) params.set('category_id', catId)
      else if (excludeCategoryId) params.set('exclude_category_id', excludeCategoryId)
      if (searchValue.trim()) params.set('search', searchValue.trim())
      const res  = await fetch(`/api/recipes?${params}`)
      const data = await res.json()
      setRecipes(Array.isArray(data) ? data : [])
    } catch {
      setRecipes([])
    } finally {
      setLoading(false)
    }
  }, [])

  function setScope(v: RecipeScope) { setScopeState(v); void load(search, v, categoryId) }
  function setCategoryId(v: string | null) { setCategoryIdState(v); void load(search, scope, v) }
  function setSearch(v: string) {
    setSearchState(v)
    if (timerRef.current) clearTimeout(timerRef.current)
    timerRef.current = setTimeout(() => void load(v, scope, categoryId), 300)
  }
  function reset(constraint: PickerConstraint = {}) {
    constraintRef.current = constraint
    setScopeState('all'); setCategoryIdState(null); setSearchState('')
    void load('', 'all', null)
  }

  return { scope, categoryId, search, recipes, loading, setScope, setCategoryId, setSearch, reset }
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

  const [selectedDay, setSelectedDay] = useState<DayOfWeek>(() => dayOfWeekFromDate(new Date()))
  const [showCompletedSummary, setShowCompletedSummary] = useState(false)
  const [desktopView, setDesktopView] = useState<'week' | 'day'>('week')

  // Suit le meme ancrage (#generate-slot) que le FAB global (cf.
  // components/layout/fab.tsx) pour savoir, independamment, quand celui-ci
  // devient flottant — permet au bouton "Passer a ..." de se repositionner
  // en miroir (grand et seul tant que le FAB est ancre en haut, puis
  // compact et pousse a droite des que le FAB repasse flottant a gauche).
  const [generatorFloating, setGeneratorFloating] = useState(false)
  useEffect(() => {
    const el = document.getElementById('generate-slot')
    if (!el) return
    const observer = new IntersectionObserver(
      ([entry]) => setGeneratorFloating(!entry.isIntersecting),
      { rootMargin: '0px 0px -88px 0px' }
    )
    observer.observe(el)
    return () => observer.disconnect()
  }, [viewState])

  const [servings,         setServings]         = useState(4)
  const [updatingServings, setUpdatingServings] = useState(false)
  const [pickerCategories,       setPickerCategories]       = useState<Category[]>([])
  const [pickerCategoriesLoaded, setPickerCategoriesLoaded] = useState(false)
  const [boissonCategoryId, setBoissonCategoryId] = useState<string | null>(null)

  const [editTarget,     setEditTarget]     = useState<EditTarget | null>(null)
  const [changingRecipe, setChangingRecipe] = useState(false)
  const [lockingItemId,  setLockingItemId]  = useState<string | null>(null)
  const [removingCompId, setRemovingCompId] = useState<string | null>(null)
  const [addingCompId,   setAddingCompId]   = useState<string | null>(null)

  const mainPicker  = useRecipePicker()
  const sidePicker  = useRecipePicker()
  const drinkPicker = useRecipePicker()

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
      if (planRes.ok && planData?.id && Array.isArray(planData.meal_plan_items)) {
        setPlan(planData)
        setServings(planData.meal_plan_items[0]?.servings ?? 4)
        if (planData.meal_plan_items.length > 0 && !sessionStartRef.current) {
          sessionStartRef.current = Date.now()
        }
      } else {
        setPlan(null)
        if (!planRes.ok) setGenError('Impossible de charger le planning de cette semaine')
      }
      setViewState('review')
    } catch {
      setGenError('Impossible de charger le planning')
      setViewState('review')
    }
  }

  // Categories (pour exclure/filtrer la boisson) — chargees des le depart.
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
      if (!planRes.ok || !planData?.id || !Array.isArray(planData.meal_plan_items)) {
        throw new Error('Génération terminée mais le menu n\'a pas pu être rechargé')
      }
      setPlan(planData)
      setServings(planData.meal_plan_items[0]?.servings ?? 4)
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

  // ── Helpers de données ────────────────────────────────────────────────────

  const activeConfigs = configs.filter(c => c.is_active)

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

  // Partie commune entre toutes les actions de composition : recharge un item
  // et le fusionne dans `plan`.
  async function syncItem(itemId: string, planId: string) {
    try {
      const res = await fetch(`/api/meal-plans/${planId}/items/${itemId}`)
      if (!res.ok) return
      const data: PlanItem = await res.json()
      setPlan(prev => prev ? {
        ...prev,
        meal_plan_items: prev.meal_plan_items.map(i => i.id === itemId ? data : i),
      } : prev)
    } catch { /* silent */ }
  }

  // ── Édition d'un repas ────────────────────────────────────────────────────

  function openEdit(item: PlanItem | null, mealType: MealType, dayOfWeek: DayOfWeek, isTemplate: boolean) {
    const dayOpt   = DAY_OPTIONS.find(d => d.val === dayOfWeek)
    const dayLabel = isTemplate ? 'Toute la semaine' : (dayOpt?.full ?? dayOfWeek)
    setEditTarget({ itemId: item?.id ?? null, mealType, dayLabel, dayOfWeek, isTemplate })
    mainPicker.reset({ excludeCategoryId: boissonCategoryId })
    sidePicker.reset({})
    drinkPicker.reset({ forceCategoryId: boissonCategoryId })
  }

  function closeEdit() {
    setEditTarget(null)
  }

  async function changeRecipe(recipe: { id: string }) {
    if (!plan || !editTarget || changingRecipe) return
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
        setEditTarget(t => t ? { ...t, itemId: updated.id } : t)
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
        setEditTarget(t => t ? { ...t, itemId: newItem.id } : t)
      }
      setModCount(c => c + 1)
    } catch {
      /* keep panel open */
    } finally {
      setChangingRecipe(false)
    }
  }

  async function removeComposition(itemId: string, compId: string) {
    if (!plan || removingCompId) return
    setRemovingCompId(compId)
    try {
      const res = await fetch(`/api/meal-plans/${plan.id}/items/${itemId}/compositions/${compId}`, { method: 'DELETE' })
      if (!res.ok) throw new Error()
      await syncItem(itemId, plan.id)
    } catch { /* silent */ } finally {
      setRemovingCompId(null)
    }
  }

  async function addComposition(itemId: string, role: 'side' | 'drink', recipeId: string) {
    if (!plan) return
    setAddingCompId(recipeId)
    try {
      await fetch(`/api/meal-plans/${plan.id}/items/${itemId}/compositions`, {
        method:  'POST',
        headers: { 'Content-Type': 'application/json' },
        body:    JSON.stringify({ recipe_id: recipeId, role }),
      })
      await syncItem(itemId, plan.id)
    } catch { /* silent */ } finally {
      setAddingCompId(null)
    }
  }

  function toggleComposition(itemId: string, role: 'side' | 'drink', recipe: PickerRecipe, currentChips: CompositionChip[]) {
    const existing = currentChips.find(c => c.recipeId === recipe.id)
    if (existing) void removeComposition(itemId, existing.id)
    else void addComposition(itemId, role, recipe.id)
  }

  async function toggleLock(item: PlanItem) {
    if (!plan || lockingItemId) return
    setLockingItemId(item.id)
    try {
      const res = await fetch(`/api/meal-plans/${plan.id}/items/${item.id}/lock`, { method: 'POST' })
      if (res.ok) {
        const { is_locked }: { is_locked: boolean } = await res.json()
        setPlan(prev => prev ? {
          ...prev,
          meal_plan_items: prev.meal_plan_items.map(i => i.id === item.id ? { ...i, is_locked } : i),
        } : prev)
      }
    } catch { /* silent */ } finally {
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

  function goToCreateCustom() {
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
  const serviceStats = plan
    ? Object.entries(countFilledByMealType(activeConfigs, plan.meal_plan_items)).map(([mealType, stat]) => ({
        mealType: mealType as MealType, ...stat,
      }))
    : []

  const editingItem = editTarget?.itemId ? plan?.meal_plan_items.find(i => i.id === editTarget.itemId) : undefined

  function renderPickerPanel() {
    if (!editTarget) return null
    const sideChips  = toChips(editingItem?.meal_compositions ?? [], 'side')
    const drinkChips = toChips(editingItem?.meal_compositions ?? [], 'drink')
    const itemId     = editTarget.itemId

    return (
      <RecipePickerPanel
        key={`${editTarget.mealType}-${editTarget.dayOfWeek}-${itemId ?? 'new'}`}
        title={itemId ? 'Changer ce repas' : 'Choisir une recette'}
        subtitle={`${MEAL_LABEL[editTarget.mealType]} — ${editTarget.dayLabel}`}
        mealType={editTarget.mealType}
        onClose={closeEdit}
        currentRecipeName={editingItem?.recipes?.name ?? null}
        search={mainPicker.search}
        onSearchChange={mainPicker.setSearch}
        scope={mainPicker.scope}
        onScopeChange={mainPicker.setScope}
        categories={pickerCategories}
        categoryId={mainPicker.categoryId}
        onCategoryChange={mainPicker.setCategoryId}
        recipes={mainPicker.recipes}
        loading={mainPicker.loading}
        picking={changingRecipe}
        onPick={recipe => { void changeRecipe(recipe) }}
        showCompositions={!!itemId}
        side={itemId ? {
          chips: sideChips, removingId: removingCompId, onRemove: compId => { void removeComposition(itemId, compId) },
          search: sidePicker.search, onSearchChange: sidePicker.setSearch,
          scope: sidePicker.scope, onScopeChange: sidePicker.setScope,
          categories: pickerCategories, categoryId: sidePicker.categoryId, onCategoryChange: sidePicker.setCategoryId,
          recipes: sidePicker.recipes, loading: sidePicker.loading,
          togglingId: addingCompId,
          onToggleRecipe: recipe => toggleComposition(itemId, 'side', recipe, sideChips),
        } : undefined}
        drink={itemId ? {
          chips: drinkChips, removingId: removingCompId, onRemove: compId => { void removeComposition(itemId, compId) },
          search: drinkPicker.search, onSearchChange: drinkPicker.setSearch,
          scope: drinkPicker.scope, onScopeChange: drinkPicker.setScope,
          categories: [], categoryId: drinkPicker.categoryId, onCategoryChange: drinkPicker.setCategoryId,
          recipes: drinkPicker.recipes, loading: drinkPicker.loading,
          togglingId: addingCompId,
          onToggleRecipe: recipe => toggleComposition(itemId, 'drink', recipe, drinkChips),
        } : undefined}
        onCreateCustom={goToCreateCustom}
      />
    )
  }

  function isEditingSlot(config: MealConfig, item: PlanItem | undefined) {
    if (!editTarget || editTarget.mealType !== config.meal_type) return false
    if (editTarget.isTemplate !== (config.mode === 'template')) return false
    if (!editTarget.isTemplate && editTarget.dayOfWeek !== selectedDay) return false
    return editTarget.itemId ? editTarget.itemId === item?.id : !item
  }

  function renderMealCards(allowInline: boolean) {
    return activeConfigs.map(config => {
      const item    = getItemFor(config.meal_type, selectedDay)
      const editing = isEditingSlot(config, item)
      const time    = config.default_time ? ` · ${config.default_time.replace(':', 'H')}` : ''
      const eyebrow = `${MEAL_LABEL[config.meal_type].toUpperCase()}${time}`

      return (
        <MealDetailCard
          key={config.meal_type}
          eyebrow={eyebrow}
          mealType={config.meal_type}
          emptyLabel={MEAL_FULL_LABEL[config.meal_type]}
          recipe={item?.recipes ?? null}
          sideChips={toChips(item?.meal_compositions ?? [], 'side')}
          drinkChip={toChips(item?.meal_compositions ?? [], 'drink')[0] ?? null}
          servings={servings}
          isLocked={item?.is_locked ?? false}
          locking={lockingItemId === item?.id}
          onToggleLock={() => { if (item) void toggleLock(item) }}
          onEdit={() => openEdit(item ?? null, config.meal_type, selectedDay, config.mode === 'template')}
          dimmed={allowInline && editTarget !== null && !editing}
          expanded={allowInline && editing ? renderPickerPanel() : undefined}
        />
      )
    })
  }

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

      {/* Stepper — 2 étapes réelles */}
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
                  {plan.status === 'finalized' || plan.status === 'shared' ? <Check className="h-3 w-3" /> : '2'}
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

          {/* Emplacement d'ancrage du FAB (cf. components/layout/fab.tsx) — un
              seul bouton "Générer ma semaine", pas un deuxième dupliqué ici */}
          <div id="generate-slot" className="mx-4 min-h-[52px]" />

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

              {/* ── Mobile : jour par jour, 4 repas empilés ── */}
              <div className="lg:hidden space-y-4">
                {plan && (
                  <DayTabs
                    weekStart={selectedWeek}
                    selectedDay={selectedDay}
                    onSelect={setSelectedDay}
                    configs={activeConfigs}
                    items={plan.meal_plan_items}
                  />
                )}

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
                            <Check className="h-4 w-4 text-[var(--kkb-success)]" />
                          </button>
                        ))}
                      </div>
                    )}
                  </div>
                )}

                <div className="px-4 flex items-center justify-between">
                  <div>
                    <span className="inline-block mb-1 text-[10px] font-quicksand font-bold uppercase tracking-wide px-2 py-0.5 rounded-full bg-[var(--kkb-coral)] text-white">
                      {dayOpt.full}
                    </span>
                    <h2 className="text-h1 text-[var(--kkb-text-primary)] text-xl">Les {activeConfigs.length} repas du jour</h2>
                  </div>
                  <span className="text-xs font-quicksand text-[var(--kkb-text-tertiary)]">
                    {dayFilled}/{activeConfigs.length} repas choisis
                  </span>
                </div>

                <div className="space-y-3">
                  {renderMealCards(false)}
                </div>
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
                  <div className="flex gap-4">
                    <div className="flex-1">
                      <WeekGrid
                        weekStart={selectedWeek}
                        configs={activeConfigs}
                        items={plan.meal_plan_items}
                        onCellClick={(mealType, day, isTemplate) => {
                          const item = isTemplate ? getTemplateItem(mealType) : getDailyItem(mealType, day)
                          openEdit(item ?? null, mealType, day, isTemplate)
                        }}
                      />
                    </div>
                    {editTarget && (
                      <div className="w-[380px] shrink-0 bg-white border border-[var(--kkb-border)] rounded-[var(--kkb-radius-card)] max-h-[calc(100vh-200px)] sticky top-28">
                        {renderPickerPanel()}
                      </div>
                    )}
                  </div>
                )}

                {plan && desktopView === 'day' && (
                  <DayFocusView
                    weekStart={selectedWeek}
                    selectedDay={selectedDay}
                    onSelectDay={setSelectedDay}
                    configs={activeConfigs}
                    items={plan.meal_plan_items}
                    cards={<div className="space-y-3">{renderMealCards(true)}</div>}
                    weekFilled={filled}
                    weekTotal={total}
                    serviceStats={serviceStats}
                  />
                )}
              </div>
            </>
          )}
        </div>
      )}

      {/* ── Bouton de passage au jour suivant (sticky) ── imposant et seul
          tant que le FAB "Générer" reste ancré en haut de page ; dès qu'il
          repasse flottant (à gauche), ce bouton se contracte et glisse à
          droite pour partager la ligne — transition animée, pas de saut. ── */}
      {viewState === 'review' && plan && activeConfigs.length > 0 && (
        <div className="fixed bottom-[88px] left-4 right-4 z-30 lg:hidden">
          <div className="relative h-[52px]">
            <button
              type="button"
              onClick={goToNextDay}
              className={`absolute bottom-0 flex items-center justify-center rounded-[var(--kkb-radius-pill)] bg-[var(--kkb-coral)] hover:bg-[var(--kkb-coral-hover)] text-white font-quicksand font-bold shadow-[var(--kkb-shadow-fab)] whitespace-nowrap transition-all duration-300 ease-out ${
                generatorFloating
                  ? 'left-[calc(100%-176px)] w-[176px] h-[40px] text-[12px] gap-1'
                  : 'left-0 w-full h-[52px] text-[15px] gap-2'
              }`}
            >
              {isLastDay ? 'Terminer' : `Passer à ${DAY_OPTIONS[selectedDayIdx + 1].full}`}
              <ArrowRight className={`shrink-0 transition-all duration-300 ${generatorFloating ? 'h-3.5 w-3.5' : 'h-4 w-4'}`} />
            </button>
          </div>
          {!generatorFloating && (
            <p className="text-center text-[11px] font-quicksand text-[var(--kkb-text-tertiary)] mt-1.5">
              Ou terminer plus tard · Vos choix sont sauvegardés automatiquement
            </p>
          )}
        </div>
      )}

      {/* ── Bottom sheet mobile : choisir une recette ── */}
      {editTarget && (
        <div className="lg:hidden">
          <div className="fixed inset-0 z-40 bg-black/30" onClick={closeEdit} aria-hidden="true" />
          <div className="fixed bottom-0 left-0 right-0 z-50 bg-[var(--kkb-bg)] rounded-t-2xl shadow-xl flex flex-col max-h-[85vh]">
            <div className="flex justify-center pt-2.5 pb-1 flex-shrink-0">
              <div className="w-10 h-1 rounded-full bg-[var(--kkb-border)]" />
            </div>
            {renderPickerPanel()}
          </div>
        </div>
      )}
    </>
  )
}

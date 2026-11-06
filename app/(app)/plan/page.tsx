'use client'

import { Suspense, useCallback, useEffect, useRef, useState } from 'react'
import { useRouter, useSearchParams } from 'next/navigation'
import { ArrowRight, CalendarDays, Check, ChevronDown, LayoutGrid } from 'lucide-react'
import { MEAL_FULL_LABEL, MEAL_LABEL, type MealType } from '@/lib/constants/meal-type'
import { DAY_OPTIONS, getMondayISO, shiftWeek, formatWeekRange, dayOfWeekFromDate, type DayOfWeek } from '@/lib/utils/week'
import { sortByMealType } from '@/lib/utils/sort-meal-configs'
import { toast } from '@/lib/stores/toast-store'
import { countFilledSlots, countFilledByMealType, dayFilledCount, isDayComplete } from '@/lib/utils/plan-progress'
import { type RecipeScope } from '@/lib/constants/recipe-scope'
import { GeneratingOverlay } from '@/components/plan/generating-overlay'
import { DayTabs } from '@/components/plan/day-tabs'
import { MealDetailCard, type CompositionChip } from '@/components/plan/meal-detail-card'
import { WeekGrid } from '@/components/plan/week-grid'
import { DayFocusView } from '@/components/plan/day-focus-view'
import { RecipePickerPanel } from '@/components/plan/recipe-picker-panel'
import { PlanHero, ServiceProgressCard } from '@/components/plan/plan-hero'
import { PlanSkeleton, PlanBodySkeleton } from '@/components/skeletons/page-skeletons'

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

// Lien profond : /plan?week=AAAA-MM-JJ&day=lundi&meal=dejeuner ouvre la
// semaine, le jour et l'éditeur du repas visé (ex. depuis /votes/results).
function readDeepLink(params: URLSearchParams) {
  const week = params.get('week')
  const day  = params.get('day')
  const meal = params.get('meal')
  return {
    week: week && /^\d{4}-\d{2}-\d{2}$/.test(week) ? week : null,
    day:  DAY_OPTIONS.some(d => d.val === day) ? day as DayOfWeek : null,
    meal: meal && meal in MEAL_LABEL ? meal as MealType : null,
  }
}

export default function PlanPage() {
  return (
    <Suspense fallback={
      <PlanSkeleton />
    }>
      <PlanPageContent />
    </Suspense>
  )
}

function PlanPageContent() {
  const router = useRouter()
  const searchParams = useSearchParams()
  const [deepLink] = useState(() => readDeepLink(searchParams))
  const deepLinkOpened = useRef(false)

  const [viewState,    setViewState]    = useState<ViewState>('loading')
  const [plan,         setPlan]         = useState<Plan | null>(null)
  const [configs,      setConfigs]      = useState<MealConfig[]>([])
  const [genStep,      setGenStep]      = useState(0)
  const [genError,     setGenError]     = useState<string | null>(null)
  const [modCount,     setModCount]     = useState(0)
  const [sessionTime,  setSessionTime]  = useState(0)
  const [selectedWeek, setSelectedWeek] = useState(() => deepLink.week ?? getMondayISO())
  const sessionStartRef  = useRef<number | null>(null)
  const autoGenTriggered = useRef(false)

  const [selectedDay, setSelectedDay] = useState<DayOfWeek>(() => deepLink.day ?? dayOfWeekFromDate(new Date()))
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
      toast.success('Menu généré avec succès !')
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

  useEffect(() => {
    if (deepLinkOpened.current || viewState !== 'review' || !plan || !deepLink.meal || !deepLink.day) return
    const config = activeConfigs.find(c => c.meal_type === deepLink.meal)
    if (!config) return
    deepLinkOpened.current = true
    openEdit(getItemFor(config.meal_type, deepLink.day) ?? null, config.meal_type, deepLink.day, config.mode === 'template')
  }, [viewState, plan]) // eslint-disable-line react-hooks/exhaustive-deps

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
      const time    = config.default_time ? ` · ${config.default_time.slice(0, 5).replace(':', 'h')}` : ''
      const eyebrow = `${MEAL_LABEL[config.meal_type]}${time}`

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

  const hasPlan    = !!plan && plan.meal_plan_items.length > 0
  const validated  = plan?.status === 'finalized' || plan?.status === 'shared'
  const activeCell = editTarget ? { mealType: editTarget.mealType, day: editTarget.dayOfWeek, isTemplate: editTarget.isTemplate } : null
  const showStats  = !!plan && activeConfigs.length > 0

  return (
    <>
      <div className="mx-auto max-w-lg space-y-4 px-4 pb-40 pt-2 lg:max-w-none lg:space-y-5 lg:px-0 lg:pb-8 lg:pt-0">
        <div className="grid grid-cols-1 gap-4 lg:grid-cols-12 lg:gap-5">
          <PlanHero
            className={showStats ? 'lg:col-span-8' : 'lg:col-span-12'}
            loading={viewState === 'loading'}
            weekLabel={formatWeekRange(selectedWeek)}
            onPrevWeek={goToPrevWeek}
            onNextWeek={goToNextWeek}
            onSettings={() => router.push('/settings/meal-config')}
            hasPlan={hasPlan}
            validated={validated}
            onValidate={() => router.push(`/plan/validate?week=${selectedWeek}`)}
            onGenerate={() => void generateMenu()}
            filled={filled}
            total={total}
            servings={servings}
            onServings={n => { void updateServings(n) }}
            updatingServings={updatingServings}
            sessionLabel={hasPlan ? `${formatTime(sessionTime)} · ${modCount} modif.` : null}
            // Emplacement d'ancrage du FAB (cf. components/layout/fab.tsx) — un
            // seul bouton « Générer ma semaine », pas un deuxième dupliqué ici.
            // Posé seulement après le chargement : présent dans le HTML serveur,
            // le FAB s'y insérerait avant l'hydratation (erreur d'hydratation).
            generateSlot={<div id={viewState === 'loading' ? undefined : 'generate-slot'} className="min-h-[32px]" />}
          />
          {showStats && <ServiceProgressCard stats={serviceStats} className="hidden lg:col-span-4 lg:block" />}
        </div>

        {/* ── Chargement ── */}
        {viewState === 'loading' && <PlanBodySkeleton />}

        {/* ── Overlay génération ── */}
        {viewState === 'generating' && <GeneratingOverlay genStep={genStep} />}

        {/* ── Révision ── */}
        {viewState === 'review' && (
          <div className="space-y-4 lg:space-y-5">
            {genError && (
              <p role="alert" className="rounded-[var(--kkb-r-lg)] bg-[var(--kkb-danger-light)] px-4 py-3 font-quicksand text-sm text-[var(--kkb-danger)]">
                {genError}
              </p>
            )}

            {activeConfigs.length === 0 ? (
              <div className="flex flex-col items-center gap-3 rounded-[var(--kkb-r-xl)] bg-white px-6 py-10 text-center">
                <span className="flex h-12 w-12 items-center justify-center rounded-full bg-[var(--kkb-foret-50)] text-[var(--kkb-foret)]"><CalendarDays className="h-6 w-6" /></span>
                <p className="text-h3 text-[var(--kkb-profond)]">Aucun repas à planifier</p>
                <p className="max-w-sm font-quicksand text-sm text-[var(--kkb-texte-2)]">Choisis d’abord les repas que tu prépares (petit-déjeuner, déjeuner, goûter, dîner).</p>
                <button type="button" onClick={() => router.push('/settings/meal-config')}
                  className="mt-1 h-11 rounded-full bg-[var(--kkb-foret)] px-5 font-quicksand text-sm font-bold text-[var(--kkb-creme)]">
                  Régler le rythme des repas
                </button>
              </div>
            ) : (
              <>
                {/* ── Mobile : jour par jour ── */}
                <div className="-mx-4 space-y-4 lg:hidden">
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
                    <div className="mx-4 overflow-hidden rounded-[var(--kkb-r-xl)] bg-white">
                      <button
                        type="button"
                        onClick={() => setShowCompletedSummary(s => !s)}
                        aria-expanded={showCompletedSummary}
                        className="flex min-h-[52px] w-full items-center justify-between px-4 py-3"
                      >
                        <span className="font-quicksand text-sm font-bold text-[var(--kkb-profond)]">Déjà prêt cette semaine</span>
                        <span className="flex items-center gap-2">
                          <span className="rounded-full bg-[var(--kkb-sauge-50)] px-2.5 py-0.5 font-quicksand text-xs font-bold text-[var(--kkb-foret)]">
                            {completedDaysBefore.length} jour{completedDaysBefore.length > 1 ? 's' : ''}
                          </span>
                          <ChevronDown className={`h-4 w-4 text-[var(--kkb-texte-2)] transition-transform ${showCompletedSummary ? 'rotate-180' : ''}`} />
                        </span>
                      </button>
                      {showCompletedSummary && (
                        <div className="space-y-1 px-4 pb-3">
                          {completedDaysBefore.map(d => (
                            <button key={d.val} type="button" onClick={() => setSelectedDay(d.val)}
                              className="flex h-10 w-full items-center justify-between font-quicksand text-sm text-[var(--kkb-texte-2)] hover:text-[var(--kkb-foret)]">
                              {d.full}
                              <Check className="h-4 w-4 text-[var(--kkb-foret-500)]" />
                            </button>
                          ))}
                        </div>
                      )}
                    </div>
                  )}

                  <div className="flex items-baseline justify-between px-5">
                    <h2 className="text-h2 text-[var(--kkb-foret)]">{dayOpt.full}</h2>
                    <span className="font-quicksand text-sm text-[var(--kkb-texte-2)]">
                      <span className="font-bold tabular-nums text-[var(--kkb-profond)]">{dayFilled}/{activeConfigs.length}</span> repas choisis
                    </span>
                  </div>

                  <div className="space-y-3">{renderMealCards(false)}</div>
                </div>

                {/* ── Desktop : semaine entière ou jour par jour ── */}
                <div className="hidden space-y-4 lg:block">
                  <div className="flex items-center justify-between gap-4">
                    <div role="radiogroup" aria-label="Affichage" className="relative grid grid-cols-2 rounded-full bg-white p-1">
                      <span
                        aria-hidden="true"
                        className="pointer-events-none absolute bottom-1 left-1 top-1 w-[calc(50%-4px)] rounded-full bg-[var(--kkb-foret)] transition-transform duration-300 ease-[cubic-bezier(0.34,1.35,0.64,1)] motion-reduce:transition-none"
                        style={{ transform: desktopView === 'day' ? 'translateX(100%)' : 'none' }}
                      />
                      {([['week', LayoutGrid, 'La semaine'], ['day', CalendarDays, 'Jour par jour']] as const).map(([v, Icon, label]) => (
                        <button key={v} type="button" role="radio" aria-checked={desktopView === v} onClick={() => setDesktopView(v)}
                          className={`relative z-10 flex h-9 items-center justify-center gap-1.5 rounded-full px-4 font-quicksand text-[13px] font-bold transition-colors duration-200 ${
                            desktopView === v ? 'text-[var(--kkb-creme)]' : 'text-[var(--kkb-texte-2)] hover:text-[var(--kkb-foret)]'
                          }`}>
                          <Icon className="h-4 w-4" /> {label}
                        </button>
                      ))}
                    </div>
                    <p className="font-quicksand text-sm text-[var(--kkb-texte-2)]">
                      {desktopView === 'week' ? 'Clique sur une case pour choisir ou changer un repas.' : 'Tes choix sont enregistrés au fur et à mesure.'}
                    </p>
                  </div>

                  {plan && desktopView === 'week' && (
                    <div className="flex items-start gap-5">
                      <div className="min-w-0 flex-1">
                        <WeekGrid
                          weekStart={selectedWeek}
                          configs={activeConfigs}
                          items={plan.meal_plan_items}
                          activeCell={activeCell}
                          onCellClick={(mealType, day, isTemplate) => {
                            const item = isTemplate ? getTemplateItem(mealType) : getDailyItem(mealType, day)
                            openEdit(item ?? null, mealType, day, isTemplate)
                          }}
                        />
                      </div>
                      {editTarget && (
                        <div className="sticky top-24 flex max-h-[calc(100vh-120px)] w-[380px] shrink-0 flex-col overflow-hidden rounded-[var(--kkb-r-xl)] bg-[var(--kkb-creme)] shadow-[0_12px_32px_rgba(31,58,46,0.12)] ring-1 ring-[var(--kkb-filet)]">
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
                      cards={renderMealCards(true)}
                    />
                  )}
                </div>
              </>
            )}
          </div>
        )}
      </div>

      {/* ── Bouton de passage au jour suivant (sticky) ── imposant et seul
          tant que le FAB "Générer" reste ancré en haut de page ; dès qu'il
          repasse flottant (à gauche), ce bouton se contracte et glisse à
          droite pour partager la ligne — transition animée, pas de saut. ── */}
      {viewState === 'review' && plan && activeConfigs.length > 0 && (
        <div className="fixed bottom-[var(--kkb-nav-offset)] left-4 right-4 z-30 lg:hidden">
          <div className="relative h-[52px]">
            <button
              type="button"
              onClick={goToNextDay}
              className={`absolute bottom-0 flex items-center justify-center rounded-full bg-[var(--kkb-foret)] hover:bg-[var(--kkb-profond)] text-[var(--kkb-creme)] font-quicksand font-bold shadow-[0_8px_24px_rgba(31,58,46,0.25)] whitespace-nowrap transition-all duration-300 ease-out ${
                generatorFloating
                  ? 'left-[calc(100%-176px)] w-[176px] h-[40px] text-[12px] gap-1'
                  : 'left-0 w-full h-[52px] text-base gap-2'
              }`}
            >
              {isLastDay ? 'Valider le menu' : `Passer à ${DAY_OPTIONS[selectedDayIdx + 1].full}`}
              <ArrowRight className={`shrink-0 transition-all duration-300 ${generatorFloating ? 'h-3.5 w-3.5' : 'h-4 w-4'}`} />
            </button>
          </div>
        </div>
      )}

      {/* ── Feuille mobile : choisir une recette (au-dessus de la barre basse) ── */}
      {editTarget && (
        <div className="lg:hidden">
          <div className="fixed inset-0 z-[75] bg-[rgba(31,58,46,0.35)]" onClick={closeEdit} aria-hidden="true" />
          <div role="dialog" aria-modal="true" aria-label="Choisir une recette" className="fixed bottom-0 left-0 right-0 z-[80] flex max-h-[88vh] flex-col rounded-t-[28px] bg-[var(--kkb-creme)] shadow-[var(--kkb-shadow-sheet)]" style={{ paddingBottom: 'env(safe-area-inset-bottom)' }}>
            <div className="flex flex-shrink-0 justify-center pb-1 pt-3">
              <div className="h-1 w-10 rounded-full bg-[var(--kkb-filet)]" />
            </div>
            {renderPickerPanel()}
          </div>
        </div>
      )}
    </>
  )
}

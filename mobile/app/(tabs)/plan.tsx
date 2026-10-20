import { useCallback, useEffect, useRef, useState } from 'react'
import { Pressable, View } from 'react-native'
import { router, useLocalSearchParams } from 'expo-router'
import { useSafeAreaInsets } from 'react-native-safe-area-context'
import { CalendarDays, Check, ChevronDown } from 'lucide-react-native'
import { Bone, Button, EmptyState, Screen, TAB_BAR_SPACE, Txt } from '@/components/ui'
import { WeekDayPicker } from '@/components/home/HomeBlocks'
import { GeneratingOverlay, MealDetailCard, NextDayButton, PlanHero, type CompositionChip } from '@/components/plan/PlanBlocks'
import { RecipePickerSheet, useRecipePicker, type PickerCategory, type PickerRecipe } from '@/components/plan/RecipePicker'
import { get, request } from '@/lib/api'
import { toast } from '@/lib/toast'
import { MEAL_FULL_LABEL, MEAL_LABEL, type MealType } from '@/shared/meal-type'
import { DAY_OPTIONS, dayOfWeekFromDate, formatWeekRange, getMondayISO, shiftWeek, type DayOfWeek } from '@/shared/week'
import { sortByMealType } from '@/shared/sort-meal-configs'
import { countFilledSlots, dayFilledCount, isDayComplete } from '@/shared/plan-progress'
import { C, F, R } from '@/theme'

interface MealConfig { meal_type: MealType; is_active: boolean; mode: 'daily' | 'template'; display_order: number; default_time?: string }
interface Composition { id: string; role: 'side' | 'drink'; sort_order: number; recipe_id: string; recipes: { id: string; name: string } | null }
interface PlanItem {
  id: string; day_of_week: DayOfWeek; meal_type: MealType; applies_all_days: boolean; servings: number; is_locked: boolean; sort_order: number
  recipes: { id: string; name: string; photo_url: string | null; prep_time_min: number | null; cook_time_min: number | null } | null
  meal_compositions: Composition[]
}
interface Plan { id: string; week_start: string; status: 'draft' | 'shared' | 'finalized'; share_token: string | null; meal_plan_items: PlanItem[] }
interface EditTarget { itemId: string | null; mealType: MealType; dayLabel: string; dayOfWeek: DayOfWeek; isTemplate: boolean }

const clock = (s: number) => `${String(Math.floor(s / 60)).padStart(2, '0')}:${String(s % 60).padStart(2, '0')}`
const toChips = (comps: Composition[], role: 'side' | 'drink'): CompositionChip[] =>
  comps.filter(c => c.role === role).map(c => ({ id: c.id, recipeId: c.recipe_id, name: c.recipes?.name ?? '?' }))
const isPlan = (p: unknown): p is Plan => !!p && typeof p === 'object' && 'id' in p && Array.isArray((p as Plan).meal_plan_items)

// Menu de la semaine (cf. app/(app)/plan/page.tsx, vue mobile jour par jour).
// Liens profonds : ?week=&day=&meal= ouvre l'éditeur visé, ?generate=1 lance la génération.
export default function PlanScreen() {
  const params = useLocalSearchParams<{ week?: string; day?: string; meal?: string; generate?: string }>()
  const insets = useSafeAreaInsets()
  const [loading, setLoading] = useState(true)
  const [generating, setGenerating] = useState(false)
  const [plan, setPlan] = useState<Plan | null>(null)
  const [configs, setConfigs] = useState<MealConfig[]>([])
  const [genStep, setGenStep] = useState(0)
  const [genError, setGenError] = useState<string | null>(null)
  const [modCount, setModCount] = useState(0)
  const [sessionTime, setSessionTime] = useState(0)
  const sessionStart = useRef<number | null>(null)
  const [week, setWeek] = useState(() => (params.week && /^\d{4}-\d{2}-\d{2}$/.test(params.week) ? params.week : getMondayISO()))
  const [day, setDay] = useState<DayOfWeek>(() => (DAY_OPTIONS.some(d => d.val === params.day) ? params.day as DayOfWeek : dayOfWeekFromDate(new Date())))
  const [showDone, setShowDone] = useState(false)
  const [servings, setServings] = useState(4)
  const [updatingServings, setUpdatingServings] = useState(false)
  const [categories, setCategories] = useState<PickerCategory[]>([])
  const [drinkCatId, setDrinkCatId] = useState<string | null>(null)
  const [edit, setEdit] = useState<EditTarget | null>(null)
  const [changing, setChanging] = useState(false)
  const [lockingId, setLockingId] = useState<string | null>(null)
  const [removingId, setRemovingId] = useState<string | null>(null)
  const [togglingId, setTogglingId] = useState<string | null>(null)
  const deepLinkDone = useRef(false)
  const autoGenDone = useRef(false)

  const main = useRecipePicker()
  const side = useRecipePicker()
  const drink = useRecipePicker()

  const loadPlan = useCallback(async () => {
    setLoading(true); setGenError(null)
    try {
      const [p, cfg] = await Promise.all([
        request<Plan>(`/api/meal-plans?week=${week}`),
        get<MealConfig[]>('/api/users/me/meal-config'),
      ])
      setConfigs(sortByMealType((Array.isArray(cfg) ? cfg : []).filter(c => c.is_active)))
      if (p.ok && isPlan(p.data)) {
        setPlan(p.data)
        setServings(p.data.meal_plan_items[0]?.servings ?? 4)
        if (p.data.meal_plan_items.length && !sessionStart.current) sessionStart.current = Date.now()
      } else {
        setPlan(null)
        if (!p.ok) setGenError('Impossible de charger le planning de cette semaine')
      }
    } catch {
      setGenError('Impossible de charger le planning')
    } finally {
      setLoading(false)
    }
  }, [week])

  useEffect(() => { void loadPlan() }, [loadPlan])

  useEffect(() => {
    void get<(PickerCategory & { slug: string })[]>('/api/categories').then(cats => {
      const list = Array.isArray(cats) ? cats : []
      setCategories(list)
      setDrinkCatId(list.find(c => c.slug === 'boisson')?.id ?? null)
    })
  }, [])

  async function generate() {
    setGenerating(true); setGenStep(0); setGenError(null)
    const start = Date.now()
    const ticker = setInterval(() => setGenStep(s => Math.min(s + 1, 3)), 450)
    try {
      const res = await request<{ error?: string }>(`/api/meal-plans/generate?week=${week}`, { method: 'POST' })
      if (!res.ok) throw new Error(res.data?.error ?? 'Erreur lors de la génération')
      const elapsed = Date.now() - start
      if (elapsed < 1800) await new Promise(r => setTimeout(r, 1800 - elapsed))
      clearInterval(ticker)
      setGenStep(4)
      await new Promise(r => setTimeout(r, 300))
      const p = await request<Plan>(`/api/meal-plans?week=${week}`)
      if (!p.ok || !isPlan(p.data)) throw new Error('Génération terminée mais le menu n’a pas pu être rechargé')
      setPlan(p.data)
      setServings(p.data.meal_plan_items[0]?.servings ?? 4)
      toast.success('Menu généré avec succès !')
      sessionStart.current = Date.now(); setModCount(0); setSessionTime(0)
    } catch (e) {
      clearInterval(ticker)
      setGenError(e instanceof Error ? e.message : 'Erreur lors de la génération')
    } finally {
      setGenerating(false)
    }
  }

  // ?generate=1 (bouton de l'accueil) : génération dès le chargement.
  useEffect(() => {
    if (loading || autoGenDone.current || params.generate !== '1') return
    autoGenDone.current = true
    router.setParams({ generate: '' })
    void generate()
  }, [loading, params.generate]) // eslint-disable-line react-hooks/exhaustive-deps

  useEffect(() => {
    if (loading || generating) return
    const t = setInterval(() => { if (sessionStart.current) setSessionTime(Math.floor((Date.now() - sessionStart.current) / 1000)) }, 1000)
    return () => clearInterval(t)
  }, [loading, generating])

  const itemFor = (mealType: MealType, d: DayOfWeek): PlanItem | undefined => {
    const config = configs.find(c => c.meal_type === mealType)
    if (!config || !plan) return undefined
    return config.mode === 'template'
      ? plan.meal_plan_items.find(i => i.meal_type === mealType && i.applies_all_days)
      : plan.meal_plan_items.find(i => i.meal_type === mealType && i.day_of_week === d && !i.applies_all_days)
  }

  async function syncItem(itemId: string, planId: string) {
    const data = await get<PlanItem>(`/api/meal-plans/${planId}/items/${itemId}`)
    if (data) setPlan(prev => (prev ? { ...prev, meal_plan_items: prev.meal_plan_items.map(i => (i.id === itemId ? data : i)) } : prev))
  }

  function openEdit(item: PlanItem | null, mealType: MealType, d: DayOfWeek, isTemplate: boolean) {
    const label = isTemplate ? 'Toute la semaine' : DAY_OPTIONS.find(o => o.val === d)?.full ?? d
    setEdit({ itemId: item?.id ?? null, mealType, dayLabel: label, dayOfWeek: d, isTemplate })
    main.reset({ excludeCategoryId: drinkCatId })
    side.reset({})
    drink.reset({ forceCategoryId: drinkCatId })
  }

  // Onglet déjà monté : un nouveau lien (semaine, jour, repas) est rejoué.
  useEffect(() => {
    if (params.week && /^\d{4}-\d{2}-\d{2}$/.test(params.week)) setWeek(params.week)
    if (params.day && DAY_OPTIONS.some(d => d.val === params.day)) setDay(params.day as DayOfWeek)
    if (params.meal) deepLinkDone.current = false
  }, [params.week, params.day, params.meal])

  // Lien profond : ouvre l'éditeur du repas visé (depuis les résultats du sondage).
  useEffect(() => {
    if (deepLinkDone.current || loading || !plan || !params.meal || !params.day) return
    const config = configs.find(c => c.meal_type === params.meal)
    if (!config) return
    deepLinkDone.current = true
    openEdit(itemFor(config.meal_type, params.day as DayOfWeek) ?? null, config.meal_type, params.day as DayOfWeek, config.mode === 'template')
    router.setParams({ meal: '' })
  }, [loading, plan, params.meal]) // eslint-disable-line react-hooks/exhaustive-deps

  async function changeRecipe(recipe: PickerRecipe) {
    if (!plan || !edit || changing) return
    setChanging(true)
    try {
      if (edit.itemId) {
        const updated = await request<PlanItem>(`/api/meal-plans/${plan.id}/items/${edit.itemId}`, { method: 'PATCH', json: { recipe_id: recipe.id } })
        if (!updated.ok || !updated.data) throw new Error()
        const u = updated.data
        setPlan(prev => (prev ? { ...prev, meal_plan_items: prev.meal_plan_items.map(i => (i.id === u.id ? u : i)) } : prev))
        setEdit(t => (t ? { ...t, itemId: u.id } : t))
      } else {
        const created = await request<PlanItem>(`/api/meal-plans/${plan.id}/items`, {
          method: 'POST', json: { day_of_week: edit.dayOfWeek, meal_type: edit.mealType, applies_all_days: edit.isTemplate, recipe_id: recipe.id },
        })
        if (!created.ok || !created.data) throw new Error()
        const n = created.data
        if (!sessionStart.current) sessionStart.current = Date.now()
        setPlan(prev => (prev ? { ...prev, meal_plan_items: [...prev.meal_plan_items, n] } : prev))
        setEdit(t => (t ? { ...t, itemId: n.id } : t))
      }
      setModCount(c => c + 1)
    } catch {
      toast.error('Impossible de changer ce repas')
    } finally {
      setChanging(false)
    }
  }

  async function removeComposition(itemId: string, compId: string) {
    if (!plan || removingId) return
    setRemovingId(compId)
    const res = await request(`/api/meal-plans/${plan.id}/items/${itemId}/compositions/${compId}`, { method: 'DELETE' }).catch(() => null)
    if (res?.ok) await syncItem(itemId, plan.id)
    setRemovingId(null)
  }

  async function toggleComposition(itemId: string, role: 'side' | 'drink', recipe: PickerRecipe, chips: CompositionChip[]) {
    if (!plan) return
    const existing = chips.find(c => c.recipeId === recipe.id)
    if (existing) { void removeComposition(itemId, existing.id); return }
    setTogglingId(recipe.id)
    await request(`/api/meal-plans/${plan.id}/items/${itemId}/compositions`, { method: 'POST', json: { recipe_id: recipe.id, role } }).catch(() => null)
    await syncItem(itemId, plan.id)
    setTogglingId(null)
  }

  async function toggleLock(item: PlanItem) {
    if (!plan || lockingId) return
    setLockingId(item.id)
    const res = await request<{ is_locked: boolean }>(`/api/meal-plans/${plan.id}/items/${item.id}/lock`, { method: 'POST' }).catch(() => null)
    if (res?.ok && res.data) {
      const locked = res.data.is_locked
      setPlan(prev => (prev ? { ...prev, meal_plan_items: prev.meal_plan_items.map(i => (i.id === item.id ? { ...i, is_locked: locked } : i)) } : prev))
    }
    setLockingId(null)
  }

  async function updateServings(n: number) {
    if (!plan || updatingServings) return
    setUpdatingServings(true)
    const res = await request(`/api/meal-plans/${plan.id}/servings`, { method: 'PATCH', json: { servings: n } }).catch(() => null)
    if (res?.ok) setServings(n)
    setUpdatingServings(false)
  }

  function goToCreateCustom() {
    if (!plan || !edit) return
    const q: Record<string, string> = {
      plan_id: plan.id, meal_type: edit.mealType, day_of_week: edit.dayOfWeek, applies_all: String(edit.isTemplate), day_label: edit.dayLabel,
    }
    if (edit.itemId) q.item_id = edit.itemId
    setEdit(null)
    router.push({ pathname: '/recipes/add', params: q })
  }

  const dayIdx = DAY_OPTIONS.findIndex(d => d.val === day)
  const dayOpt = DAY_OPTIONS[dayIdx]
  const { filled, total } = plan ? countFilledSlots(configs, plan.meal_plan_items) : { filled: 0, total: 0 }
  const doneBefore = DAY_OPTIONS.slice(0, dayIdx).filter(d => plan && isDayComplete(configs, plan.meal_plan_items, d.val))
  const dayFilled = plan ? dayFilledCount(configs, plan.meal_plan_items, day) : 0
  const hasPlan = !!plan && plan.meal_plan_items.length > 0
  const validated = plan?.status === 'finalized' || plan?.status === 'shared'
  const editingItem = edit?.itemId ? plan?.meal_plan_items.find(i => i.id === edit.itemId) : undefined
  const sideChips = toChips(editingItem?.meal_compositions ?? [], 'side')
  const drinkChips = toChips(editingItem?.meal_compositions ?? [], 'drink')
  const showNext = !loading && !!plan && configs.length > 0

  function goNext() {
    if (dayIdx < 6) setDay(DAY_OPTIONS[dayIdx + 1].val)
    else router.push({ pathname: '/plan/validate', params: { week } })
  }

  return (
    <View style={{ flex: 1 }}>
      <Screen onRefresh={loadPlan} contentStyle={{ paddingBottom: TAB_BAR_SPACE + insets.bottom + (showNext ? 68 : 0) }}>
        <PlanHero
          loading={loading}
          weekLabel={formatWeekRange(week)}
          onPrevWeek={() => setWeek(w => shiftWeek(w, -1))}
          onNextWeek={() => setWeek(w => shiftWeek(w, 1))}
          onSettings={() => router.push('/settings/meal-config')}
          hasPlan={hasPlan}
          validated={validated}
          onValidate={() => router.push({ pathname: '/plan/validate', params: { week } })}
          onGenerate={() => void generate()}
          filled={filled}
          total={total}
          servings={servings}
          onServings={n => void updateServings(n)}
          updatingServings={updatingServings}
          sessionLabel={hasPlan ? `${clock(sessionTime)} · ${modCount} modif.` : null}
        />

        {loading ? (
          <View style={{ gap: 12 }}>
            <Bone style={{ height: 72, borderRadius: R.xl }} />
            <Bone style={{ height: 128, borderRadius: R.xl }} />
            <Bone style={{ height: 128, borderRadius: R.xl }} />
          </View>
        ) : (
          <>
            {!!genError && (
              <View accessibilityRole="alert" style={{ borderRadius: R.lg, backgroundColor: C.dangerLight, paddingHorizontal: 16, paddingVertical: 12 }}>
                <Txt variant="small" color={C.danger} style={{ fontSize: 14 }}>{genError}</Txt>
              </View>
            )}
            {configs.length === 0 ? (
              <View style={{ borderRadius: R.xl, backgroundColor: '#FFFFFF' }}>
                <EmptyState icon={CalendarDays} title="Aucun repas à planifier"
                  description="Choisis d’abord les repas que tu prépares (petit-déjeuner, déjeuner, goûter, dîner)."
                  action={<Button label="Régler le rythme des repas" tone="foret" onPress={() => router.push('/settings/meal-config')} />} />
              </View>
            ) : (
              <>
                {plan && (
                  <WeekDayPicker weekStart={week} selected={day} onSelect={setDay}
                    complete={d => isDayComplete(configs, plan.meal_plan_items, d)} />
                )}

                {doneBefore.length > 0 && (
                  <View style={{ borderRadius: R.xl, backgroundColor: '#FFFFFF', overflow: 'hidden' }}>
                    <Pressable onPress={() => setShowDone(s => !s)} accessibilityRole="button" accessibilityState={{ expanded: showDone }}
                      style={{ minHeight: 52, flexDirection: 'row', alignItems: 'center', justifyContent: 'space-between', paddingHorizontal: 16, paddingVertical: 12 }}>
                      <Txt variant="smallBold" style={{ fontSize: 14 }}>Déjà prêt cette semaine</Txt>
                      <View style={{ flexDirection: 'row', alignItems: 'center', gap: 8 }}>
                        <View style={{ borderRadius: R.pill, backgroundColor: C.sauge50, paddingHorizontal: 10, paddingVertical: 2 }}>
                          <Txt style={{ fontFamily: F.bodyBold, fontSize: 12, color: C.foret }}>{doneBefore.length} jour{doneBefore.length > 1 ? 's' : ''}</Txt>
                        </View>
                        <ChevronDown size={16} color={C.texte2} style={{ transform: [{ rotate: showDone ? '180deg' : '0deg' }] }} />
                      </View>
                    </Pressable>
                    {showDone && (
                      <View style={{ paddingHorizontal: 16, paddingBottom: 12 }}>
                        {doneBefore.map(d => (
                          <Pressable key={d.val} onPress={() => setDay(d.val)} style={{ height: 40, flexDirection: 'row', alignItems: 'center', justifyContent: 'space-between' }}>
                            <Txt variant="small" style={{ fontSize: 14 }}>{d.full}</Txt>
                            <Check size={16} color={C.foret500} />
                          </Pressable>
                        ))}
                      </View>
                    )}
                  </View>
                )}

                <View style={{ flexDirection: 'row', alignItems: 'baseline', justifyContent: 'space-between', paddingHorizontal: 4 }}>
                  <Txt variant="h2">{dayOpt.full}</Txt>
                  <Txt variant="small" style={{ fontSize: 14 }}>
                    <Txt variant="smallBold" style={{ fontSize: 14 }}>{dayFilled}/{configs.length}</Txt> repas choisis
                  </Txt>
                </View>

                <View style={{ gap: 12 }}>
                  {configs.map(config => {
                    const item = itemFor(config.meal_type, day)
                    const time = config.default_time ? ` · ${config.default_time.slice(0, 5).replace(':', 'h')}` : ''
                    return (
                      <MealDetailCard
                        key={config.meal_type}
                        eyebrow={`${MEAL_LABEL[config.meal_type]}${time}`}
                        mealType={config.meal_type}
                        emptyLabel={MEAL_FULL_LABEL[config.meal_type]}
                        recipe={item?.recipes ?? null}
                        sideChips={toChips(item?.meal_compositions ?? [], 'side')}
                        drinkChip={toChips(item?.meal_compositions ?? [], 'drink')[0] ?? null}
                        servings={servings}
                        isLocked={item?.is_locked ?? false}
                        locking={lockingId === item?.id}
                        onToggleLock={() => { if (item) void toggleLock(item) }}
                        onEdit={() => openEdit(item ?? null, config.meal_type, day, config.mode === 'template')}
                      />
                    )
                  })}
                </View>
              </>
            )}
          </>
        )}
      </Screen>

      {showNext && (
        <NextDayButton bottom={TAB_BAR_SPACE + insets.bottom - 24}
          label={dayIdx === 6 ? 'Valider le menu' : `Passer à ${DAY_OPTIONS[dayIdx + 1].full}`} onPress={goNext} />
      )}

      <GeneratingOverlay visible={generating} genStep={genStep} />

      {edit && (
        <RecipePickerSheet
          key={`${edit.mealType}-${edit.dayOfWeek}`}
          open
          onClose={() => setEdit(null)}
          title={edit.itemId ? 'Changer ce repas' : 'Choisir une recette'}
          subtitle={`${MEAL_LABEL[edit.mealType]} — ${edit.dayLabel}`}
          mealType={edit.mealType}
          currentRecipeName={editingItem?.recipes?.name ?? null}
          main={main}
          categories={categories}
          picking={changing}
          onPick={r => void changeRecipe(r)}
          side={edit.itemId ? { chips: sideChips, picker: side, categories, onToggle: r => void toggleComposition(edit.itemId!, 'side', r, sideChips) } : undefined}
          drink={edit.itemId ? { chips: drinkChips, picker: drink, categories: [], onToggle: r => void toggleComposition(edit.itemId!, 'drink', r, drinkChips) } : undefined}
          removingId={removingId}
          togglingId={togglingId}
          onRemove={compId => { if (edit.itemId) void removeComposition(edit.itemId, compId) }}
          onCreateCustom={goToCreateCustom}
        />
      )}
    </View>
  )
}

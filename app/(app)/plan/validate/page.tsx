'use client'

import { Suspense, useEffect, useState } from 'react'
import { useRouter, useSearchParams } from 'next/navigation'
import {
  AlertTriangle, ArrowLeft, BarChart3, CalendarDays, Check, CheckCircle2, ChevronDown, Clock,
  Link2, ListChecks, Loader2, Plus, Users, Utensils,
} from 'lucide-react'
import { MEAL_COLOR, MEAL_LABEL, type MealType } from '@/lib/constants/meal-type'
import { MealTypeIcon } from '@/components/ui/meal-type-icon'
import { ShareActions, surveyLinkPayload } from '@/components/ui/share-actions'
import { DAY_OPTIONS, formatWeekRange, type DayOfWeek } from '@/lib/utils/week'
import { sortByMealType } from '@/lib/utils/sort-meal-configs'
import { countFilledSlots, isDayComplete } from '@/lib/utils/plan-progress'
import { CompositionChipsRow } from '@/components/plan/composition-chips-row'
import { ValidateSkeleton } from '@/components/skeletons/page-skeletons'

// ─── Types ────────────────────────────────────────────────────────────────────

interface MealConfig {
  meal_type:     MealType
  is_active:     boolean
  mode:          'daily' | 'template'
  display_order: number
}

interface PlanRecipe {
  name:          string
  photo_url:     string | null
  prep_time_min: number | null
  categories:    { icon: string | null } | null
}

interface Composition {
  role:       'side' | 'drink'
  sort_order: number
  recipes:    { name: string } | null
}

interface AllergyWarning {
  member_display_name: string
  allergen:             string
}

interface PlanItem {
  id:                string
  day_of_week:       DayOfWeek
  meal_type:         MealType
  applies_all_days:  boolean
  servings:          number
  recipes:           PlanRecipe | null
  meal_compositions: Composition[]
  allergy_warnings?: AllergyWarning[]
}

interface Plan {
  id:              string
  week_start:      string
  status:          string
  share_token:     string | null
  meal_plan_items: PlanItem[]
}

// ─── Sous-composants ──────────────────────────────────────────────────────────

function compositionChips(compositions: Composition[] | undefined) {
  const sides = (compositions ?? []).filter(c => c.role === 'side' && c.recipes).map((c, i) => ({ id: `side-${i}`, name: c.recipes!.name }))
  const d = (compositions ?? []).find(c => c.role === 'drink' && c.recipes)
  return { sides, drink: d ? { id: 'drink', name: d.recipes!.name } : null }
}

// Vignette : photo, ou aplat aux couleurs du type de repas.
function Thumb({ mealType, recipe, className }: { mealType: MealType; recipe: PlanRecipe | null; className: string }) {
  const color = MEAL_COLOR[mealType]
  return (
    <div className={`relative shrink-0 overflow-hidden ${className}`} style={{ backgroundColor: recipe ? color.bg : 'var(--kkb-creme)' }}>
      {recipe?.photo_url ? (
        // eslint-disable-next-line @next/next/no-img-element
        <img src={recipe.photo_url} alt="" className="absolute inset-0 h-full w-full object-cover" />
      ) : (
        <span className="absolute inset-0 flex items-center justify-center" style={{ color: recipe ? color.text : 'var(--kkb-texte-2)' }}>
          <MealTypeIcon type={mealType} className="h-5 w-5 opacity-70" />
        </span>
      )}
    </div>
  )
}

function WarningChips({ warnings }: { warnings?: AllergyWarning[] }) {
  if (!warnings?.length) return null
  return (
    <div className="flex flex-wrap gap-1">
      {warnings.map((w, i) => (
        <span key={i} className="inline-flex items-center gap-1 rounded-full bg-[var(--kkb-danger-light)] px-2 py-0.5 font-quicksand text-[11px] font-bold text-[var(--kkb-danger)]">
          <AlertTriangle className="h-3 w-3" /> {w.member_display_name} · {w.allergen}
        </span>
      ))}
    </div>
  )
}

// Tuile d'un repas (vue par jour).
function MealTile({ mealType, item, onEdit }: { mealType: MealType; item: PlanItem | null; onEdit: () => void }) {
  const recipe = item?.recipes ?? null
  const { sides, drink } = compositionChips(item?.meal_compositions)
  return (
    <button
      type="button"
      onClick={onEdit}
      aria-label={`${MEAL_LABEL[mealType]} : ${recipe?.name ?? 'à choisir'}, modifier`}
      className={`group flex flex-col gap-2 rounded-[var(--kkb-r-lg)] p-1.5 text-left transition-colors ${
        recipe ? 'bg-[var(--kkb-creme)] hover:bg-[var(--kkb-foret-50)]' : 'border-[1.5px] border-dashed border-[var(--kkb-filet)] hover:border-[var(--kkb-foret-300)] hover:bg-[var(--kkb-foret-50)]'
      }`}
    >
      <Thumb mealType={mealType} recipe={recipe} className="aspect-[4/3] w-full rounded-[var(--kkb-r-md)]" />
      <span className="space-y-1 px-1 pb-1">
        <span className="flex items-center gap-1 font-quicksand text-[11px] font-bold" style={{ color: MEAL_COLOR[mealType].text }}>
          <MealTypeIcon type={mealType} className="h-3 w-3" /> {MEAL_LABEL[mealType]}
        </span>
        {recipe ? (
          <span className="line-clamp-2 block font-quicksand text-[13px] font-bold leading-tight text-[var(--kkb-profond)]">{recipe.name}</span>
        ) : (
          <span className="flex items-center gap-1 font-quicksand text-[13px] font-semibold text-[var(--kkb-texte-2)] group-hover:text-[var(--kkb-foret)]"><Plus className="h-3.5 w-3.5" /> À choisir</span>
        )}
        {(sides.length > 0 || drink) && <CompositionChipsRow sides={sides} drink={drink} size="xs" />}
        <WarningChips warnings={item?.allergy_warnings} />
      </span>
    </button>
  )
}

// Ligne d'un repas (vue par type de repas).
function RecipeRow({ label, mealType, item, onEdit }: { label: string; mealType: MealType; item: PlanItem | null; onEdit: () => void }) {
  const recipe = item?.recipes ?? null
  const { sides, drink } = compositionChips(item?.meal_compositions)
  return (
    <li>
      <button type="button" onClick={onEdit} className="flex w-full items-center gap-3 rounded-[var(--kkb-r-lg)] px-2 py-2 text-left transition-colors hover:bg-[var(--kkb-creme)]">
        <span className="w-[5.5rem] shrink-0 font-quicksand text-xs font-bold text-[var(--kkb-texte-2)]">{label}</span>
        <Thumb mealType={mealType} recipe={recipe} className="h-12 w-14 rounded-[var(--kkb-r-md)]" />
        <span className="min-w-0 flex-1 space-y-1">
          {recipe ? (
            <span className="block truncate font-quicksand text-sm font-bold text-[var(--kkb-profond)]">{recipe.name}</span>
          ) : (
            <span className="block font-quicksand text-sm text-[var(--kkb-texte-2)]">Pas encore choisi</span>
          )}
          {(sides.length > 0 || drink) && <CompositionChipsRow sides={sides} drink={drink} size="xs" />}
          <WarningChips warnings={item?.allergy_warnings} />
        </span>
        {recipe?.prep_time_min ? (
          <span className="hidden shrink-0 items-center gap-1 font-quicksand text-xs tabular-nums text-[var(--kkb-texte-2)] sm:flex"><Clock className="h-3 w-3" /> {recipe.prep_time_min} min</span>
        ) : null}
      </button>
    </li>
  )
}

// Carte d'un jour : repliable sur mobile, toujours dépliée sur desktop.
function DayCard({ day, dateLabel, configs, plan, open, onToggle, onEdit }: {
  day: DayOfWeek; dateLabel: string; configs: MealConfig[]; plan: Plan
  open: boolean; onToggle: () => void; onEdit: (mealType: MealType, day: DayOfWeek) => void
}) {
  const itemFor = (config: MealConfig) => config.mode === 'template'
    ? plan.meal_plan_items.find(i => i.meal_type === config.meal_type && i.applies_all_days) ?? null
    : plan.meal_plan_items.find(i => i.meal_type === config.meal_type && i.day_of_week === day && !i.applies_all_days) ?? null

  const rows          = configs.map(config => ({ config, item: itemFor(config) }))
  const filledCount   = rows.filter(r => r.item?.recipes).length
  const complete      = filledCount === configs.length
  const warningsCount = rows.reduce((acc, r) => acc + (r.item?.allergy_warnings?.length ?? 0), 0)

  return (
    <section className="rounded-[var(--kkb-r-xl)] bg-white" aria-label={dateLabel}>
      <button type="button" onClick={onToggle} aria-expanded={open} className="flex w-full items-center gap-2 px-4 py-3.5 text-left lg:pointer-events-none lg:pb-2">
        <span className="min-w-0 flex-1 truncate text-h3 text-[var(--kkb-profond)]">{dateLabel}</span>
        {warningsCount > 0 && (
          <span className="flex items-center gap-1 rounded-full bg-[var(--kkb-danger-light)] px-2 py-0.5 font-quicksand text-xs font-bold text-[var(--kkb-danger)]" title="Allergène signalé">
            <AlertTriangle className="h-3 w-3" /> {warningsCount}
          </span>
        )}
        <span className={`flex items-center gap-1 rounded-full px-2.5 py-0.5 font-quicksand text-xs font-bold tabular-nums ${
          complete ? 'bg-[var(--kkb-sauge-50)] text-[var(--kkb-foret-500)]' : 'bg-[var(--kkb-jaune-50)] text-[var(--kkb-jaune-text)]'
        }`}>
          {complete && <Check className="h-3 w-3" />}{filledCount}/{configs.length}
        </span>
        <ChevronDown className={`h-4 w-4 shrink-0 text-[var(--kkb-texte-2)] transition-transform lg:hidden ${open ? 'rotate-180' : ''}`} />
      </button>
      <div className={`${open ? 'grid' : 'hidden'} grid-cols-2 gap-2 px-3 pb-3 sm:grid-cols-4 lg:grid`}>
        {rows.map(({ config, item }) => (
          <MealTile key={config.meal_type} mealType={config.meal_type} item={item} onEdit={() => onEdit(config.meal_type, day)} />
        ))}
      </div>
    </section>
  )
}

// Carte d'un type de repas (vue par repas).
function MealTypeCard({ config, plan, open, onToggle, onEdit }: {
  config: MealConfig; plan: Plan; open: boolean; onToggle: () => void
  onEdit: (mealType: MealType, day: DayOfWeek) => void
}) {
  const color = MEAL_COLOR[config.meal_type]
  const templateItem = config.mode === 'template'
    ? plan.meal_plan_items.find(i => i.meal_type === config.meal_type && i.applies_all_days) ?? null
    : null
  const items = config.mode === 'daily'
    ? DAY_OPTIONS.map(d => plan.meal_plan_items.find(i => i.meal_type === config.meal_type && i.day_of_week === d.val && !i.applies_all_days) ?? null)
    : []
  const filledCount = config.mode === 'template' ? (templateItem?.recipes ? 1 : 0) : items.filter(i => i?.recipes).length
  const totalCount  = config.mode === 'template' ? 1 : 7

  return (
    <section className="rounded-[var(--kkb-r-xl)] bg-white" aria-label={MEAL_LABEL[config.meal_type]}>
      <button type="button" onClick={onToggle} aria-expanded={open} className="flex w-full items-center gap-3 px-4 py-3.5 text-left lg:pointer-events-none lg:pb-2">
        <span className="flex h-9 w-9 shrink-0 items-center justify-center rounded-full" style={{ backgroundColor: color.bg, color: color.text }}>
          <MealTypeIcon type={config.meal_type} className="h-4 w-4" />
        </span>
        <span className="min-w-0 flex-1">
          <span className="block text-h3 text-[var(--kkb-profond)]">{MEAL_LABEL[config.meal_type]}</span>
          <span className="block font-quicksand text-xs text-[var(--kkb-texte-2)]">{config.mode === 'template' ? 'Le même toute la semaine' : 'Un plat par jour'}</span>
        </span>
        <span className={`flex items-center gap-1 rounded-full px-2.5 py-0.5 font-quicksand text-xs font-bold tabular-nums ${
          filledCount === totalCount ? 'bg-[var(--kkb-sauge-50)] text-[var(--kkb-foret-500)]' : 'bg-[var(--kkb-jaune-50)] text-[var(--kkb-jaune-text)]'
        }`}>
          {filledCount === totalCount && <Check className="h-3 w-3" />}{filledCount}/{totalCount}
        </span>
        <ChevronDown className={`h-4 w-4 shrink-0 text-[var(--kkb-texte-2)] transition-transform lg:hidden ${open ? 'rotate-180' : ''}`} />
      </button>
      <ul className={`${open ? 'block' : 'hidden'} space-y-0.5 px-2 pb-2 lg:block`}>
        {config.mode === 'template' ? (
          <RecipeRow label="Toute la semaine" mealType={config.meal_type} item={templateItem} onEdit={() => onEdit(config.meal_type, DAY_OPTIONS[0].val)} />
        ) : (
          DAY_OPTIONS.map((d, i) => (
            <RecipeRow key={d.val} label={d.full} mealType={config.meal_type} item={items[i]} onEdit={() => onEdit(config.meal_type, d.val)} />
          ))
        )}
      </ul>
    </section>
  )
}

// ─── Composant interne (useSearchParams) ─────────────────────────────────────

function ValidateInner() {
  const router      = useRouter()
  const searchParams = useSearchParams()
  const week        = searchParams.get('week')

  const [plan,       setPlan]       = useState<Plan | null>(null)
  const [configs,    setConfigs]    = useState<MealConfig[]>([])
  const [loading,    setLoading]    = useState(true)
  const [apiError,   setApiError]   = useState<string | null>(null)
  const [validating, setValidating] = useState(false)
  const [validated,  setValidated]  = useState(false)
  const [shareToken, setShareToken] = useState<string | null>(null)
  const [surveyCount,  setSurveyCount]  = useState<number | null>(null)
  const [openMealType, setOpenMealType] = useState<MealType | null>(null)
  const [openDay,      setOpenDay]      = useState<DayOfWeek | null>(DAY_OPTIONS[0].val)
  const [viewMode,     setViewMode]     = useState<'day' | 'type'>('day')

  useEffect(() => {
    if (!week) { router.replace('/plan'); return }
    void load()
  }, [week]) // eslint-disable-line react-hooks/exhaustive-deps

  async function load() {
    setLoading(true)
    try {
      const [planRes, configRes] = await Promise.all([
        fetch(`/api/meal-plans?week=${week}`),
        fetch('/api/users/me/meal-config'),
      ])
      const planData:   Plan    = await planRes.json()
      const configData: unknown = await configRes.json()

      const active = sortByMealType(
        (Array.isArray(configData) ? configData as MealConfig[] : []).filter(c => c.is_active)
      )
      setConfigs(active)
      setOpenMealType(active[0]?.meal_type ?? null)

      if (planRes.ok && planData?.id && Array.isArray(planData.meal_plan_items)) {
        setPlan(planData)
        const firstGap = DAY_OPTIONS.find(d => !isDayComplete(active, planData.meal_plan_items, d.val))
        setOpenDay(firstGap?.val ?? DAY_OPTIONS[0].val)
        if (planData.status === 'finalized' || planData.status === 'shared') setValidated(true)
        if (planData.share_token) {
          setShareToken(planData.share_token)
          void fetchSurveyCount(planData.id)
        }
      } else {
        setPlan(null)
        if (!planRes.ok) setApiError('Impossible de charger le planning de cette semaine')
      }
    } catch {
      setApiError('Impossible de charger le planning')
    } finally {
      setLoading(false)
    }
  }

  async function validate() {
    if (!plan || validating) return
    setValidating(true)
    try {
      const res = await fetch(`/api/meal-plans/${plan.id}/validate`, { method: 'POST' })
      if (res.ok) setValidated(true)
      else setApiError('Erreur lors de la validation')
    } catch {
      setApiError('Erreur lors de la validation')
    } finally {
      setValidating(false)
    }
  }

  async function fetchSurveyCount(planId: string) {
    try {
      const res = await fetch(`/api/meal-plans/${planId}/survey-results`)
      if (res.ok) {
        const d = await res.json() as { total_respondents?: number; respondent_count?: number }
        setSurveyCount(d.total_respondents ?? d.respondent_count ?? 0)
      }
    } catch { /* silent */ }
  }

  // Genere le lien de partage a la demande s'il n'existe pas encore — ni
  // Partager ni Copier n'attendent que "Valider" ait ete clique.
  async function ensureShareToken(): Promise<string | null> {
    if (shareToken) return shareToken
    if (!plan) return null
    try {
      const res = await fetch(`/api/meal-plans/${plan.id}/share`, { method: 'POST' })
      if (!res.ok) return null
      const data = await res.json() as { share_token: string }
      setShareToken(data.share_token)
      void fetchSurveyCount(plan.id)
      return data.share_token
    } catch {
      return null
    }
  }

  async function surveySharePayload() {
    const token = await ensureShareToken()
    return token ? surveyLinkPayload(token) : null
  }

  if (loading) return <ValidateSkeleton />

  if (!plan) {
    return (
      <div className="mx-auto max-w-lg px-4 py-8">
        <div className="flex flex-col items-center gap-3 rounded-[var(--kkb-r-xl)] bg-white px-6 py-10 text-center">
          <span className="flex h-12 w-12 items-center justify-center rounded-full bg-[var(--kkb-foret-50)] text-[var(--kkb-foret)]"><CalendarDays className="h-6 w-6" /></span>
          <p className="text-h3 text-[var(--kkb-profond)]">Aucun menu à valider</p>
          <p className="font-quicksand text-sm text-[var(--kkb-texte-2)]">{apiError ?? 'Planifie d’abord les repas de cette semaine.'}</p>
          <button type="button" onClick={() => router.push(week ? `/plan?week=${week}` : '/plan')}
            className="mt-1 h-11 rounded-full bg-[var(--kkb-foret)] px-5 font-quicksand text-sm font-bold text-[var(--kkb-creme)]">
            Aller au menu
          </button>
        </div>
      </div>
    )
  }

  const activeConfigs = configs.filter(c => c.is_active)
  const { filled: filledSlots, total: totalSlots } = countFilledSlots(activeConfigs, plan.meal_plan_items)
  const daysComplete = DAY_OPTIONS.filter(d => isDayComplete(activeConfigs, plan.meal_plan_items, d.val)).length
  const servings     = plan.meal_plan_items[0]?.servings ?? 4
  const missing      = Math.max(0, totalSlots - filledSlots)
  const monday       = new Date(plan.week_start + 'T00:00:00')
  const warnings     = plan.meal_plan_items.flatMap(item => (item.allergy_warnings ?? []).map(w => ({ ...w, item })))
  const shareUrl     = shareToken && typeof window !== 'undefined' ? `${window.location.origin}/s/${shareToken}`.replace(/^https?:\/\//, '') : null

  // Retour au menu, sur le repas à modifier.
  const editMeal = (mealType: MealType, day: DayOfWeek) =>
    router.push(`/plan?week=${plan.week_start}&day=${day}&meal=${mealType}`)

  const dayLabel = (i: number) => {
    const date = new Date(monday)
    date.setDate(monday.getDate() + i)
    return `${DAY_OPTIONS[i].full} ${date.getDate()} ${date.toLocaleDateString('fr-FR', { month: 'long' })}`
  }

  return (
    <div className="mx-auto max-w-lg space-y-4 px-4 pb-10 pt-2 lg:max-w-none lg:space-y-5 lg:px-0 lg:pb-8 lg:pt-0">
      <div className="grid grid-cols-1 items-start gap-4 lg:grid-cols-12 lg:gap-5">
        {/* ── Bandeau ─────────────────────────────────────────────────── */}
        <section className="rounded-[var(--kkb-r-xl)] bg-[var(--kkb-foret)] p-5 lg:col-span-8 lg:p-6">
          <div className="flex items-center justify-between gap-3">
            <ol className="flex items-center gap-2" aria-label="Étapes">
              <li>
                <button type="button" onClick={() => router.push(`/plan?week=${plan.week_start}`)}
                  className="flex items-center gap-1.5 rounded-full bg-white/10 py-1 pl-1 pr-3 transition-colors hover:bg-white/20">
                  <span className="flex h-6 w-6 items-center justify-center rounded-full bg-[var(--kkb-sauge)] text-[var(--kkb-profond)]"><Check className="h-3.5 w-3.5" /></span>
                  <span className="font-quicksand text-xs font-bold text-[var(--kkb-creme)]">Planifier</span>
                </button>
              </li>
              <li aria-hidden="true" className="h-px w-4 bg-white/25" />
              <li className="flex items-center gap-1.5 rounded-full bg-[var(--kkb-creme)] py-1 pl-1 pr-3" aria-current="step">
                <span className="flex h-6 w-6 items-center justify-center rounded-full bg-[var(--kkb-foret)] font-quicksand text-[11px] font-bold text-[var(--kkb-creme)]">
                  {validated ? <Check className="h-3.5 w-3.5" /> : '2'}
                </span>
                <span className="font-quicksand text-xs font-bold text-[var(--kkb-foret)]">Valider</span>
              </li>
            </ol>
            <button type="button" onClick={() => router.push(`/plan?week=${plan.week_start}`)} aria-label="Retour au menu"
              className="flex h-10 w-10 items-center justify-center rounded-full bg-white/10 text-[var(--kkb-creme)] transition-colors hover:bg-white/20">
              <ArrowLeft className="h-5 w-5" />
            </button>
          </div>

          <p className="mt-4 font-quicksand text-sm font-semibold text-[var(--kkb-foret-100)]">Semaine du {formatWeekRange(plan.week_start)}</p>
          <h1 className="mt-0.5 text-h1 text-[var(--kkb-creme)]">{validated ? 'Ton menu est prêt' : 'Prêt à passer à table ?'}</h1>
          <p className="mt-1 max-w-xl font-quicksand text-sm text-[var(--kkb-foret-100)]">
            {validated
              ? 'Il est confirmé pour la semaine. Partage-le pour recueillir l’avis de la famille.'
              : missing === 0
              ? 'Tous les repas sont choisis. Un dernier coup d’œil, puis valide et demande l’avis de la famille.'
              : `${missing} repas ${missing > 1 ? 'restent' : 'reste'} à choisir. Tu peux valider quand même, ou les compléter avant.`}
          </p>

          <dl className="mt-5 grid grid-cols-3 gap-2">
            {[
              { icon: Users,        label: 'Convives',       value: <>{servings}</> },
              { icon: CalendarDays, label: 'Jours prêts', value: <>{daysComplete}<span className="text-sm font-bold text-[var(--kkb-foret-100)]">/7</span></> },
              { icon: Utensils,     label: 'Repas',          value: <>{filledSlots}<span className="text-sm font-bold text-[var(--kkb-foret-100)]">/{totalSlots}</span></> },
            ].map(s => (
              <div key={s.label} className="rounded-[var(--kkb-r-md)] bg-white/10 px-3 py-2.5">
                <dt className="flex items-center gap-1.5 font-quicksand text-xs text-[var(--kkb-foret-100)]">
                  <s.icon className="hidden h-3.5 w-3.5 shrink-0 text-[var(--kkb-sauge)] sm:block" /> <span className="truncate">{s.label}</span>
                </dt>
                <dd className="mt-0.5 font-dosis text-[20px] font-extrabold leading-tight tabular-nums text-[var(--kkb-creme)]">{s.value}</dd>
              </div>
            ))}
          </dl>
        </section>

        {/* ── Valider et partager ─────────────────────────────────────── */}
        <aside className="order-last space-y-4 rounded-[var(--kkb-r-xl)] bg-white p-5 lg:order-none lg:sticky lg:top-24 lg:col-span-4 lg:col-start-9 lg:row-span-3 lg:row-start-1 lg:p-6" aria-label="Valider et partager">
          {apiError && <p role="alert" className="rounded-[var(--kkb-r-md)] bg-[var(--kkb-danger-light)] px-3 py-2 font-quicksand text-sm text-[var(--kkb-danger)]">{apiError}</p>}

          <div className="flex items-start gap-3">
            <span className={`flex h-9 w-9 shrink-0 items-center justify-center rounded-full ${validated ? 'bg-[var(--kkb-sauge)] text-[var(--kkb-profond)]' : 'bg-[var(--kkb-foret-50)] text-[var(--kkb-foret)]'}`}>
              {validated ? <Check className="h-4 w-4" /> : <span className="font-dosis text-sm font-extrabold">1</span>}
            </span>
            <div className="min-w-0 flex-1">
              <h2 className="text-h3 text-[var(--kkb-profond)]">{validated ? 'Menu validé' : 'Valide le menu'}</h2>
              <p className="mt-0.5 font-quicksand text-sm text-[var(--kkb-texte-2)]">
                {validated ? 'Il est confirmé pour la semaine. Tu peux encore le modifier depuis le menu.' : 'Il devient le menu de la semaine et affine les prochaines suggestions.'}
              </p>
            </div>
          </div>
          {!validated && (
            <button type="button" onClick={() => { void validate() }} disabled={validating}
              className="flex h-12 w-full items-center justify-center gap-2 rounded-full bg-[var(--kkb-orange)] font-quicksand text-[15px] font-bold text-white transition-colors hover:bg-[var(--kkb-orange-700)] disabled:opacity-60">
              {validating ? <Loader2 className="h-5 w-5 animate-spin" /> : <CheckCircle2 className="h-5 w-5" />}
              {validating ? 'Validation…' : 'Valider le menu'}
            </button>
          )}

          <div className="flex items-start gap-3 border-t border-dashed border-[var(--kkb-filet)] pt-4">
            <span className="flex h-9 w-9 shrink-0 items-center justify-center rounded-full bg-[var(--kkb-foret-50)] font-dosis text-sm font-extrabold text-[var(--kkb-foret)]">2</span>
            <div className="min-w-0 flex-1">
              <h2 className="text-h3 text-[var(--kkb-profond)]">Demande l’avis de la famille</h2>
              <p className="mt-0.5 font-quicksand text-sm text-[var(--kkb-texte-2)]">Chacun donne son avis sur les repas, sans compte, en un geste.</p>
            </div>
          </div>
          <ShareActions
            getPayload={surveySharePayload}
            className="flex items-center gap-2"
            buttonClassName="flex h-11 flex-1 items-center justify-center gap-1.5 rounded-full border-[1.5px] border-[var(--kkb-filet)] bg-white font-quicksand text-sm font-semibold text-[var(--kkb-foret)] transition-colors hover:border-[var(--kkb-foret-300)] disabled:opacity-60"
            shareButtonClassName="flex h-11 flex-1 items-center justify-center gap-1.5 rounded-full bg-[var(--kkb-foret)] font-quicksand text-sm font-semibold text-[var(--kkb-creme)] transition-colors hover:bg-[var(--kkb-foret-900)] disabled:opacity-60"
          />
          {shareUrl && (
            <p className="flex items-center gap-1.5 rounded-[var(--kkb-r-md)] bg-[var(--kkb-creme)] px-3 py-2 font-quicksand text-xs text-[var(--kkb-texte-2)]">
              <Link2 className="h-3.5 w-3.5 shrink-0" />
              <span className="min-w-0 flex-1 truncate">{shareUrl}</span>
              <span className="shrink-0">· 7 jours</span>
            </p>
          )}

          {surveyCount !== null && surveyCount > 0 && (
            <button type="button" onClick={() => router.push(`/votes/results?plan=${plan.id}`)}
              className="flex h-11 w-full items-center justify-center gap-2 rounded-full bg-[var(--kkb-sauge-50)] font-quicksand text-sm font-bold text-[var(--kkb-foret)] transition-colors hover:bg-[var(--kkb-foret-50)]">
              <BarChart3 className="h-4 w-4" />
              {surveyCount} avis reçu{surveyCount > 1 ? 's' : ''} · voir les résultats
            </button>
          )}
        </aside>

        {/* ── Points de vigilance (allergies) ─────────────────────────── */}
        {warnings.length > 0 && (
          <section className="rounded-[var(--kkb-r-xl)] border-[1.5px] border-[var(--kkb-danger)]/30 bg-[var(--kkb-danger-light)] p-4 lg:col-span-8" aria-labelledby="warn-title">
            <h2 id="warn-title" className="flex items-center gap-2 font-quicksand text-sm font-bold text-[var(--kkb-danger)]">
              <AlertTriangle className="h-4 w-4" /> {warnings.length} point{warnings.length > 1 ? 's' : ''} de vigilance
            </h2>
            <ul className="mt-2 space-y-1">
              {warnings.map((w, i) => (
                <li key={i} className="font-quicksand text-sm text-[var(--kkb-profond)]">
                  <span className="font-bold">{w.item.recipes?.name ?? 'Repas'}</span>
                  {' '}({MEAL_LABEL[w.item.meal_type]}{w.item.applies_all_days ? ', toute la semaine' : `, ${DAY_OPTIONS.find(d => d.val === w.item.day_of_week)?.full.toLowerCase()}`})
                  {' '}contient <span className="font-bold">{w.allergen}</span>, signalé pour {w.member_display_name}.
                </li>
              ))}
            </ul>
          </section>
        )}

      {/* ── Le menu, jour par jour ou repas par repas ─────────────────── */}
      <div className="space-y-3 lg:col-span-8">
        <div className="flex flex-wrap items-center justify-between gap-3">
          <div role="radiogroup" aria-label="Affichage" className="relative grid grid-cols-2 rounded-full bg-white p-1">
            <span aria-hidden="true"
              className="pointer-events-none absolute bottom-1 left-1 top-1 w-[calc(50%-4px)] rounded-full bg-[var(--kkb-foret)] transition-transform duration-300 ease-[cubic-bezier(0.34,1.35,0.64,1)] motion-reduce:transition-none"
              style={{ transform: viewMode === 'type' ? 'translateX(100%)' : 'none' }} />
            {([['day', CalendarDays, 'Par jour'], ['type', ListChecks, 'Par repas']] as const).map(([v, Icon, label]) => (
              <button key={v} type="button" role="radio" aria-checked={viewMode === v} onClick={() => setViewMode(v)}
                className={`relative z-10 flex h-9 items-center justify-center gap-1.5 rounded-full px-4 font-quicksand text-[13px] font-bold transition-colors duration-200 ${
                  viewMode === v ? 'text-[var(--kkb-creme)]' : 'text-[var(--kkb-texte-2)] hover:text-[var(--kkb-foret)]'
                }`}>
                <Icon className="h-4 w-4" /> {label}
              </button>
            ))}
          </div>
          <p className="hidden font-quicksand text-sm text-[var(--kkb-texte-2)] sm:block">Touche un repas pour le changer.</p>
        </div>

        <div className="space-y-3">
          {viewMode === 'day'
            ? DAY_OPTIONS.map((d, i) => (
                <DayCard key={d.val} day={d.val} dateLabel={dayLabel(i)} configs={activeConfigs} plan={plan}
                  open={openDay === d.val} onToggle={() => setOpenDay(prev => prev === d.val ? null : d.val)} onEdit={editMeal} />
              ))
            : activeConfigs.map(config => (
                <MealTypeCard key={config.meal_type} config={config} plan={plan}
                  open={openMealType === config.meal_type} onToggle={() => setOpenMealType(prev => prev === config.meal_type ? null : config.meal_type)} onEdit={editMeal} />
              ))}
        </div>
      </div>
      </div>
    </div>
  )
}

// ─── Export ───────────────────────────────────────────────────────────────────

export default function ValidatePage() {
  return (
    <Suspense fallback={
      <ValidateSkeleton />
    }>
      <ValidateInner />
    </Suspense>
  )
}

'use client'

import { Suspense, useEffect, useState } from 'react'
import { useRouter, useSearchParams } from 'next/navigation'
import {
  AlertTriangle,
  BarChart3,
  CalendarDays,
  Check,
  CheckCircle2,
  ChevronDown,
  ChevronLeft,
  ChevronRight,
  Clock,
  Copy,
  ListChecks,
  Loader2,
  Plus,
  Share2,
  Users,
  Utensils,
  UtensilsCrossed,
} from 'lucide-react'
import { MEAL_LABEL, type MealType } from '@/lib/constants/meal-type'
import { MealTypeIcon } from '@/components/ui/meal-type-icon'
import { DAY_OPTIONS, formatWeekRange, type DayOfWeek } from '@/lib/utils/week'
import { sortByMealType } from '@/lib/utils/sort-meal-configs'
import { countFilledSlots, isDayComplete } from '@/lib/utils/plan-progress'
import { CompositionChipsRow } from '@/components/plan/composition-chips-row'

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

// ─── Sous-composant : ligne recette (accordéon par type de repas) ───────────

function RecipeRow({ recipe, label, compositions, warnings }: {
  recipe:       PlanRecipe | null
  label:        string
  compositions?: Composition[]
  warnings?:    AllergyWarning[]
}) {
  const sides = (compositions ?? [])
    .filter(c => c.role === 'side' && c.recipes)
    .map((c, i) => ({ id: `side-${i}`, name: c.recipes!.name }))
  const drinkComp = (compositions ?? []).find(c => c.role === 'drink' && c.recipes)
  const drink = drinkComp ? { id: 'drink', name: drinkComp.recipes!.name } : null

  return (
    <div className="flex items-center gap-3 px-3 py-2.5 border-b border-[var(--kkb-border)]/30 last:border-0">
      <p className="w-20 text-[10px] font-quicksand font-semibold text-[var(--kkb-text-tertiary)] flex-shrink-0">
        {label}
      </p>
      {recipe ? (
        <>
          <div className="relative h-16 w-16 rounded-lg overflow-hidden shrink-0 bg-[var(--kkb-coral-light)]">
            {recipe.photo_url ? (
              // eslint-disable-next-line @next/next/no-img-element
              <img src={recipe.photo_url} alt={recipe.name} className="absolute inset-0 h-full w-full object-cover" />
            ) : (
              <div className="h-full w-full flex items-center justify-center"><UtensilsCrossed className="h-6 w-6 text-[var(--kkb-coral)]" /></div>
            )}
          </div>
          <div className="flex-1 min-w-0">
            <p className="text-xs font-quicksand font-medium text-[var(--kkb-text-primary)] truncate">
              {recipe.name}
            </p>
            {recipe.prep_time_min && (
              <div className="flex items-center gap-0.5 mt-0.5">
                <Clock className="h-2.5 w-2.5 text-[var(--kkb-text-tertiary)]" />
                <span className="text-[10px] font-quicksand text-[var(--kkb-text-secondary)]">
                  {recipe.prep_time_min} min
                </span>
              </div>
            )}
            {(sides.length > 0 || drink) && (
              <div className="mt-1">
                <CompositionChipsRow sides={sides} drink={drink} size="xs" />
              </div>
            )}
            {warnings && warnings.length > 0 && (
              <div className="flex flex-wrap gap-1 mt-1">
                {warnings.map((w, i) => (
                  <span key={i} className="inline-flex items-center gap-1 text-[10px] font-quicksand font-medium text-red-700 bg-red-50 px-1.5 py-0.5 rounded-full">
                    <AlertTriangle className="h-2.5 w-2.5" />
                    {w.member_display_name} · {w.allergen}
                  </span>
                ))}
              </div>
            )}
          </div>
        </>
      ) : (
        <div className="flex items-center gap-2 flex-1">
          <Utensils className="h-3.5 w-3.5 text-[var(--kkb-text-tertiary)] flex-shrink-0" />
          <p className="text-xs font-quicksand text-[var(--kkb-text-tertiary)] italic">Non planifié</p>
        </div>
      )}
    </div>
  )
}

// ─── Sous-composant : accordéon "Par type de repas" ──────────────────────────

function MealAccordionSection({ config, plan, open, onToggle }: {
  config: MealConfig
  plan:   Plan
  open:   boolean
  onToggle: () => void
}) {
  const templateItem = config.mode === 'template'
    ? (plan.meal_plan_items.find(i => i.meal_type === config.meal_type && i.applies_all_days) ?? null)
    : null

  const items = config.mode === 'daily'
    ? DAY_OPTIONS.map(d => plan.meal_plan_items.find(
        i => i.meal_type === config.meal_type && i.day_of_week === d.val && !i.applies_all_days
      ) ?? null)
    : []

  const filledCount = config.mode === 'template'
    ? (templateItem ? 1 : 0)
    : items.filter(Boolean).length
  const totalCount = config.mode === 'template' ? 1 : 7

  return (
    <div className="mx-4 bg-white border border-[var(--kkb-border)] rounded-[var(--kkb-radius-card)] overflow-hidden">
      <button
        type="button"
        onClick={onToggle}
        className="w-full flex items-center gap-2 px-3 py-3 text-left"
      >
        <MealTypeIcon type={config.meal_type} className="h-4 w-4 text-[var(--kkb-coral)]" />
        <span className="font-dosis font-semibold text-sm text-[var(--kkb-text-primary)]">
          {MEAL_LABEL[config.meal_type]}
        </span>
        <span className={`text-[10px] font-quicksand font-bold uppercase tracking-wider px-1.5 py-0.5 rounded-full ${
          config.mode === 'template'
            ? 'bg-[var(--kkb-warning-light)] text-[var(--kkb-warning)]'
            : 'bg-[var(--kkb-bg)] text-[var(--kkb-text-tertiary)]'
        }`}>
          {config.mode === 'template' ? 'Modèle' : 'Quotidien'}
        </span>
        <span className={`ml-auto text-[11px] font-quicksand font-bold ${
          filledCount === totalCount ? 'text-[var(--kkb-success)]' : 'text-[var(--kkb-text-tertiary)]'
        }`}>
          {filledCount}/{totalCount}
        </span>
        <ChevronDown className={`h-4 w-4 text-[var(--kkb-text-tertiary)] transition-transform ${open ? 'rotate-180' : ''}`} />
      </button>

      {open && (
        <div className="border-t border-[var(--kkb-border)]/50">
          {config.mode === 'template' ? (
            <RecipeRow
              recipe={templateItem?.recipes ?? null}
              label="Toute la semaine"
              compositions={templateItem?.meal_compositions}
              warnings={templateItem?.allergy_warnings}
            />
          ) : (
            DAY_OPTIONS.map((d, i) => {
              const item = items[i]
              return (
                <RecipeRow
                  key={d.val}
                  recipe={item?.recipes ?? null}
                  label={d.full}
                  compositions={item?.meal_compositions}
                  warnings={item?.allergy_warnings}
                />
              )
            })
          )}
        </div>
      )}
    </div>
  )
}

// ─── Sous-composant : accordéon "Par jour" ───────────────────────────────────

function DayAccordionSection({ day, dateLabel, configs, plan, open, onToggle }: {
  day:       DayOfWeek
  dateLabel: string
  configs:   MealConfig[]
  plan:      Plan
  open:      boolean
  onToggle:  () => void
}) {
  function itemFor(config: MealConfig): PlanItem | null {
    return config.mode === 'template'
      ? plan.meal_plan_items.find(i => i.meal_type === config.meal_type && i.applies_all_days) ?? null
      : plan.meal_plan_items.find(i => i.meal_type === config.meal_type && i.day_of_week === day && !i.applies_all_days) ?? null
  }

  const rows = configs.map(config => ({ config, item: itemFor(config) }))
  const filledCount   = rows.filter(r => r.item?.recipes).length
  const complete      = filledCount === configs.length
  const warningsCount = rows.reduce((acc, r) => acc + (r.item?.allergy_warnings?.length ?? 0), 0)

  return (
    <div className={`mx-4 bg-white border rounded-[var(--kkb-radius-card)] overflow-hidden ${complete ? 'border-[var(--kkb-border)]' : 'border-[var(--kkb-warning)]/60'}`}>
      <button
        type="button"
        onClick={onToggle}
        className="w-full flex items-center gap-2 px-3 py-3 text-left"
      >
        <span className="font-dosis font-semibold text-sm text-[var(--kkb-text-primary)] uppercase">
          {dateLabel}
        </span>
        <span className={`text-[10px] font-quicksand font-bold uppercase tracking-wider px-1.5 py-0.5 rounded-full ${
          complete ? 'bg-[var(--kkb-success-light)] text-[var(--kkb-success)]' : 'bg-[var(--kkb-warning-light)] text-[var(--kkb-warning)]'
        }`}>
          {complete
            ? <span className="inline-flex items-center gap-0.5"><Check className="h-3 w-3" /> {filledCount} repas complets</span>
            : `${filledCount}/${configs.length} repas choisis`}
        </span>
        {warningsCount > 0 && (
          <span className="flex items-center gap-0.5 text-[10px] font-quicksand font-bold text-red-600">
            <AlertTriangle className="h-3 w-3" /> {warningsCount}
          </span>
        )}
        <ChevronDown className={`ml-auto h-4 w-4 text-[var(--kkb-text-tertiary)] transition-transform ${open ? 'rotate-180' : ''}`} />
      </button>

      {open && (
        <div className="grid grid-cols-2 sm:grid-cols-4 gap-2 p-3 border-t border-[var(--kkb-border)]/50">
          {rows.map(({ config, item }) => (
            <div key={config.meal_type} className="relative overflow-hidden rounded-xl border border-[var(--kkb-border)]/60 min-h-[132px]">
              {item?.recipes?.photo_url ? (
                // eslint-disable-next-line @next/next/no-img-element
                <img src={item.recipes.photo_url} alt="" className="absolute inset-0 h-full w-full object-cover" />
              ) : (
                <div className="absolute inset-0 bg-[var(--kkb-coral-light)] flex items-center justify-center">
                  {item?.recipes
                    ? <UtensilsCrossed className="h-6 w-6 text-[var(--kkb-coral)]" />
                    : <Plus className="h-6 w-6 text-[var(--kkb-coral)]" />}
                </div>
              )}

              <span className="absolute top-1.5 left-1.5 z-10 inline-flex items-center gap-0.5 text-[8px] font-quicksand font-bold uppercase bg-black/55 text-white px-1.5 py-0.5 rounded">
                <MealTypeIcon type={config.meal_type} className="h-2.5 w-2.5" /> {MEAL_LABEL[config.meal_type]}
              </span>
              {item?.allergy_warnings && item.allergy_warnings.length > 0 && (
                <span className="absolute top-1.5 right-1.5 z-10 flex items-center gap-0.5 text-[8px] font-quicksand font-bold text-white bg-red-600/90 px-1.5 py-0.5 rounded">
                  <AlertTriangle className="h-2.5 w-2.5" /> allergène
                </span>
              )}

              {item?.recipes ? (
                <div className="absolute inset-x-0 bottom-0 bg-gradient-to-t from-black/85 via-black/40 to-transparent px-1.5 pt-6 pb-1.5 space-y-1">
                  <p className="text-[11px] font-quicksand font-semibold text-white leading-tight line-clamp-2 drop-shadow">
                    {item.recipes.name}
                  </p>
                  <CompositionChipsRow
                    sides={item.meal_compositions.filter(c => c.role === 'side' && c.recipes).map((c, i) => ({ id: `side-${i}`, name: c.recipes!.name }))}
                    drink={(() => {
                      const d = item.meal_compositions.find(c => c.role === 'drink' && c.recipes)
                      return d ? { id: 'drink', name: d.recipes!.name } : null
                    })()}
                    size="xs"
                  />
                </div>
              ) : (
                <div className="absolute inset-0 flex items-center justify-center">
                  <span className="text-[10px] font-quicksand font-semibold text-[var(--kkb-text-tertiary)] bg-white/85 px-2 py-1 rounded-full">
                    Non planifié
                  </span>
                </div>
              )}
            </div>
          ))}
        </div>
      )}
    </div>
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
  const [sharing,      setSharing]      = useState(false)
  const [copied,       setCopied]       = useState(false)
  const [surveyCount,  setSurveyCount]  = useState<number | null>(null)
  const [canNativeShare, setCanNativeShare] = useState(false)
  const [openMealType, setOpenMealType] = useState<MealType | null>(null)
  const [openDay,      setOpenDay]      = useState<DayOfWeek | null>(DAY_OPTIONS[0].val)
  const [viewMode,     setViewMode]     = useState<'day' | 'type'>('day')

  useEffect(() => {
    if (!week) { router.replace('/plan'); return }
    void load()
  }, [week]) // eslint-disable-line react-hooks/exhaustive-deps

  useEffect(() => {
    setCanNativeShare(typeof navigator !== 'undefined' && typeof navigator.share === 'function')
  }, [])

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
        const d = await res.json() as { respondent_count: number }
        setSurveyCount(d.respondent_count)
      }
    } catch { /* silent */ }
  }

  // Genere le lien de partage a la demande s'il n'existe pas encore — ni
  // Partager ni Copier n'attendent que "Valider" ait ete clique.
  async function ensureShareToken(): Promise<string | null> {
    if (shareToken) return shareToken
    if (!plan) return null
    setSharing(true)
    try {
      const res = await fetch(`/api/meal-plans/${plan.id}/share`, { method: 'POST' })
      if (!res.ok) return null
      const data = await res.json() as { share_token: string }
      setShareToken(data.share_token)
      void fetchSurveyCount(plan.id)
      return data.share_token
    } catch {
      return null
    } finally {
      setSharing(false)
    }
  }

  async function copyLink() {
    const token = await ensureShareToken()
    if (!token) return
    try {
      await navigator.clipboard.writeText(`${window.location.origin}/s/${token}`)
      setCopied(true)
      setTimeout(() => setCopied(false), 2000)
    } catch { /* silent */ }
  }

  async function shareNative() {
    const token = await ensureShareToken()
    if (!token) return
    try {
      await navigator.share({
        title: 'Menu de la semaine — KeskonBouf',
        text:  'Donne ton avis sur notre menu de la semaine !',
        url:   `${window.location.origin}/s/${token}`,
      })
    } catch {
      /* utilisateur a annulé la feuille de partage — rien à faire */
    }
  }

  if (loading) {
    return (
      <div className="flex items-center justify-center min-h-[50vh]">
        <Loader2 className="h-6 w-6 text-[var(--kkb-coral)] animate-spin" />
      </div>
    )
  }

  if (!plan) {
    return (
      <div className="px-4 py-12 text-center space-y-4">
        <p className="text-sm font-quicksand text-[var(--kkb-text-secondary)]">
          Aucun menu à valider pour cette semaine.
        </p>
        <button
          type="button"
          onClick={() => router.push('/plan')}
          className="text-sm font-quicksand text-[var(--kkb-coral)] underline"
        >
          Retour au planning
        </button>
      </div>
    )
  }

  const activeConfigs = configs.filter(c => c.is_active)
  const { filled: filledSlots, total: totalSlots } = countFilledSlots(activeConfigs, plan.meal_plan_items)
  const daysComplete = DAY_OPTIONS.filter(d => isDayComplete(activeConfigs, plan.meal_plan_items, d.val)).length
  const servings = plan.meal_plan_items[0]?.servings ?? 4

  const monday = new Date(plan.week_start + 'T00:00:00')

  const statsRow = (
    <div className="grid grid-cols-3 gap-2 mx-4">
      {[
        { icon: Users,        value: servings,                      label: 'Convives' },
        { icon: CheckCircle2, value: `${daysComplete}/7`,            label: 'Jours'    },
        { icon: Utensils,     value: `${filledSlots}/${totalSlots}`, label: 'Repas'    },
      ].map(stat => (
        <div key={stat.label} className="bg-white border border-[var(--kkb-border)] rounded-[var(--kkb-radius-sm)] py-2.5 flex flex-col items-center gap-0.5">
          <stat.icon className="h-3.5 w-3.5 text-[var(--kkb-coral)]" />
          <span className="font-dosis font-bold text-sm text-[var(--kkb-text-primary)]">{stat.value}</span>
          <span className="text-[9px] font-quicksand font-bold uppercase tracking-wide text-[var(--kkb-text-tertiary)]">{stat.label}</span>
        </div>
      ))}
    </div>
  )

  const viewToggle = (
    <div className="flex items-center gap-2 mx-4">
      <button
        type="button"
        onClick={() => setViewMode('day')}
        className={`flex items-center gap-1.5 rounded-full px-3 py-1.5 text-xs font-quicksand font-bold transition-colors ${
          viewMode === 'day' ? 'bg-[var(--kkb-coral)] text-white' : 'bg-white border border-[var(--kkb-border)] text-[var(--kkb-text-secondary)]'
        }`}
      >
        <CalendarDays className="h-3.5 w-3.5" /> Par jour
      </button>
      <button
        type="button"
        onClick={() => setViewMode('type')}
        className={`flex items-center gap-1.5 rounded-full px-3 py-1.5 text-xs font-quicksand font-bold transition-colors ${
          viewMode === 'type' ? 'bg-[var(--kkb-coral)] text-white' : 'bg-white border border-[var(--kkb-border)] text-[var(--kkb-text-secondary)]'
        }`}
      >
        <ListChecks className="h-3.5 w-3.5" /> Par type de repas
      </button>
    </div>
  )

  const accordion = (
    <div className="space-y-2.5">
      {viewMode === 'day'
        ? DAY_OPTIONS.map((d, i) => {
            const date = new Date(monday)
            date.setDate(monday.getDate() + i)
            const dateLabel = `${d.full} ${date.getDate()} ${date.toLocaleDateString('fr-FR', { month: 'long' })}`
            return (
              <DayAccordionSection
                key={d.val}
                day={d.val}
                dateLabel={dateLabel}
                configs={activeConfigs}
                plan={plan}
                open={openDay === d.val}
                onToggle={() => setOpenDay(prev => prev === d.val ? null : d.val)}
              />
            )
          })
        : activeConfigs.map(config => (
            <MealAccordionSection
              key={config.meal_type}
              config={config}
              plan={plan}
              open={openMealType === config.meal_type}
              onToggle={() => setOpenMealType(prev => prev === config.meal_type ? null : config.meal_type)}
            />
          ))}
    </div>
  )

  const ctaSection = (
    <div className="mx-4 space-y-3">
      {validated && (
        <div className="bg-emerald-50 border border-emerald-200 rounded-2xl px-4 py-3.5 flex items-center gap-3">
          <CheckCircle2 className="h-5 w-5 text-emerald-600 flex-shrink-0" />
          <div>
            <p className="font-dosis font-bold text-sm text-emerald-800">Menu validé !</p>
            <p className="text-[11px] font-quicksand text-emerald-700 mt-0.5">
              Ce menu est confirmé pour la semaine.
            </p>
          </div>
        </div>
      )}

      {shareToken && (
        <p className="text-[11px] font-quicksand text-[var(--kkb-text-tertiary)] text-center">
          Lien valable 7 jours · {shareToken ? `${window.location.origin}/s/${shareToken}`.replace(/^https?:\/\//, '') : ''}
        </p>
      )}

      <div className="flex items-center gap-2">
        {canNativeShare && (
          <button
            type="button"
            onClick={() => { void shareNative() }}
            disabled={sharing}
            className="flex-1 flex items-center justify-center gap-1.5 border border-[var(--kkb-coral)] text-[var(--kkb-coral)] rounded-2xl py-3 font-dosis font-bold text-sm disabled:opacity-60 hover:bg-[var(--kkb-coral)]/5 transition-colors"
          >
            {sharing ? <Loader2 className="h-4 w-4 animate-spin" /> : <Share2 className="h-4 w-4" />}
            Partager
          </button>
        )}
        <button
          type="button"
          onClick={() => { void copyLink() }}
          disabled={sharing}
          className="flex-1 flex items-center justify-center gap-1.5 rounded-2xl py-3 font-dosis font-bold text-sm border border-[var(--kkb-border)] text-[var(--kkb-text-secondary)] hover:border-[var(--kkb-coral)] hover:text-[var(--kkb-coral)] transition-colors disabled:opacity-60"
        >
          <Copy className="h-4 w-4" />
          {copied ? 'Copié !' : 'Copier le lien'}
        </button>
      </div>

      <button
        type="button"
        onClick={() => { void validate() }}
        disabled={validating || validated}
        className="w-full bg-[var(--kkb-coral)] text-white rounded-2xl py-3.5 font-dosis font-bold text-base flex items-center justify-center gap-2 disabled:opacity-60 transition-opacity"
      >
        {validating
          ? <Loader2 className="h-5 w-5 animate-spin" />
          : <CheckCircle2 className="h-5 w-5" />
        }
        {validating ? 'Validation…' : validated ? 'Menu validé' : 'Valider le menu'}
      </button>

      {plan && surveyCount !== null && surveyCount > 0 && (
        <button
          type="button"
          onClick={() => router.push(`/votes/results?plan=${plan.id}`)}
          className="w-full border border-[var(--kkb-success)] text-[var(--kkb-success)] rounded-2xl py-3 font-dosis font-bold text-sm flex items-center justify-center gap-2 hover:bg-[var(--kkb-success-light)] transition-colors"
        >
          <BarChart3 className="h-4 w-4" />
          Voir les résultats du sondage ({surveyCount})
        </button>
      )}
    </div>
  )

  return (
    <div className="pb-8">
      {/* Header mobile */}
      <div className="lg:hidden sticky top-14 z-30 bg-[var(--kkb-bg)] border-b border-[var(--kkb-border)] px-4 h-12 flex items-center gap-3">
        <button
          type="button"
          onClick={() => router.back()}
          className="p-1.5 -ml-1.5 text-[var(--kkb-text-secondary)] hover:text-[var(--kkb-coral)] transition-colors"
          aria-label="Retour"
        >
          <ChevronLeft className="h-5 w-5" />
        </button>
        <div>
          <p className="font-dosis font-bold text-sm text-[var(--kkb-text-primary)]">
            Confirmer le menu
          </p>
          <p className="text-[11px] font-quicksand text-[var(--kkb-text-secondary)]">
            {formatWeekRange(plan.week_start)}
          </p>
        </div>
      </div>

      {apiError && (
        <p className="mx-4 mt-4 text-sm text-red-600 font-quicksand bg-red-50 px-4 py-2 rounded-xl">
          {apiError}
        </p>
      )}

      {/* ── Mobile ── */}
      <div className="lg:hidden space-y-4 py-4">
        {statsRow}
        {viewToggle}
        <div className="px-4">{accordion}</div>
        {ctaSection}
      </div>

      {/* ── Desktop ── */}
      <div className="hidden lg:block max-w-4xl mx-auto px-6 py-8 space-y-6">
        {/* Stepper — 2 étapes réelles, cf. /plan */}
        <div className="flex items-center justify-center gap-1.5">
          <div className="flex items-center gap-1.5">
            <button type="button" onClick={() => router.push('/plan')} className="w-5 h-5 rounded-full bg-[var(--kkb-success)] flex items-center justify-center">
              <Check className="h-3 w-3 text-white" />
            </button>
            <span className="text-[10px] font-quicksand font-bold uppercase tracking-wider text-[var(--kkb-text-tertiary)]">Planifier</span>
          </div>
          <ChevronRight className="h-3 w-3 text-[var(--kkb-border)]" />
          <div className="flex items-center gap-1.5">
            <div className="w-5 h-5 rounded-full bg-[var(--kkb-coral)] flex items-center justify-center">
              <span className="text-white text-[10px] font-bold">2</span>
            </div>
            <span className="text-[10px] font-quicksand font-bold uppercase tracking-wider text-[var(--kkb-coral)]">Synthèse &amp; Validation</span>
          </div>
        </div>

        {/* Bannière */}
        <div className="bg-white border border-[var(--kkb-border)] rounded-[var(--kkb-radius-card)] px-6 py-5 flex items-center gap-4">
          <div className="h-12 w-12 rounded-full bg-[var(--kkb-coral-light)] flex items-center justify-center shrink-0">
            <CheckCircle2 className="h-6 w-6 text-[var(--kkb-coral)]" />
          </div>
          <div>
            <h1 className="text-h1 text-[var(--kkb-text-primary)]">Confirmer le menu de la semaine</h1>
            <p className="text-sm font-quicksand text-[var(--kkb-text-secondary)]">{formatWeekRange(plan.week_start)}</p>
          </div>
        </div>

        {statsRow}
        {viewToggle}

        <div className="space-y-2.5">{accordion}</div>
      </div>

      {/* Barre d'action sticky desktop */}
      <div className="hidden lg:block fixed bottom-0 left-0 right-0 z-30 bg-white border-t border-[var(--kkb-border)] px-6 py-4">
        <div className="max-w-4xl mx-auto">{ctaSection}</div>
      </div>
      <div className="hidden lg:block h-32" aria-hidden="true" />
    </div>
  )
}

// ─── Export ───────────────────────────────────────────────────────────────────

export default function ValidatePage() {
  return (
    <Suspense fallback={
      <div className="flex items-center justify-center min-h-[50vh]">
        <Loader2 className="h-6 w-6 text-[var(--kkb-coral)] animate-spin" />
      </div>
    }>
      <ValidateInner />
    </Suspense>
  )
}

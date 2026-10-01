'use client'

import { Suspense, useEffect, useState } from 'react'
import { useRouter, useSearchParams } from 'next/navigation'
import {
  AlertTriangle,
  BarChart3,
  CheckCircle2,
  ChevronDown,
  ChevronLeft,
  ChevronRight,
  Clock,
  Copy,
  Loader2,
  MessageCircle,
  Share2,
  Users,
  Utensils,
} from 'lucide-react'
import { composedName } from '@/lib/utils/composed-name'
import { MEAL_LABEL, MEAL_EMOJI, type MealType } from '@/lib/constants/meal-type'
import { DAY_OPTIONS, formatWeekRange, type DayOfWeek } from '@/lib/utils/week'
import { sortByMealType } from '@/lib/utils/sort-meal-configs'
import { countFilledSlots, isDayComplete } from '@/lib/utils/plan-progress'

// ─── Types ────────────────────────────────────────────────────────────────────

interface MealConfig {
  meal_type:     MealType
  is_active:     boolean
  mode:          'daily' | 'template'
  display_order: number
}

interface PlanRecipe {
  name:          string
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

// ─── Sous-composant : ligne recette ──────────────────────────────────────────

function RecipeRow({ recipe, label, displayName, warnings }: {
  recipe:       PlanRecipe | null
  label:        string
  displayName?: string
  warnings?:    AllergyWarning[]
}) {
  return (
    <div className="flex items-center gap-3 px-3 py-2.5 border-b border-[var(--kkb-border)]/30 last:border-0">
      <p className="w-20 text-[10px] font-quicksand font-semibold text-[var(--kkb-text-tertiary)] flex-shrink-0">
        {label}
      </p>
      {recipe ? (
        <>
          <span className="text-base flex-shrink-0">
            {recipe.categories?.icon ?? '🍴'}
          </span>
          <div className="flex-1 min-w-0">
            <p className="text-xs font-quicksand font-medium text-[var(--kkb-text-primary)] truncate">
              {displayName ?? recipe.name}
            </p>
            {recipe.prep_time_min && (
              <div className="flex items-center gap-0.5 mt-0.5">
                <Clock className="h-2.5 w-2.5 text-[var(--kkb-text-tertiary)]" />
                <span className="text-[10px] font-quicksand text-[var(--kkb-text-secondary)]">
                  {recipe.prep_time_min} min
                </span>
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

// ─── Sous-composant : section accordéon d'un type de repas ──────────────────

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
        <span className="text-base">{MEAL_EMOJI[config.meal_type]}</span>
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
              displayName={templateItem ? composedName(templateItem.recipes?.name, templateItem.meal_compositions) : undefined}
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
                  displayName={item ? composedName(item.recipes?.name, item.meal_compositions) : undefined}
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

      setPlan(planData?.id ? planData : null)
      setConfigs(active)
      setOpenMealType(active[0]?.meal_type ?? null)

      if (planData?.status === 'finalized' || planData?.status === 'shared') setValidated(true)
      if (planData?.share_token) {
        setShareToken(planData.share_token)
        void fetchSurveyCount(planData.id)
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

  async function share() {
    if (!plan || sharing) return
    setSharing(true)
    try {
      const res = await fetch(`/api/meal-plans/${plan.id}/share`, { method: 'POST' })
      if (res.ok) {
        const data = await res.json() as { share_token: string }
        setShareToken(data.share_token)
        void fetchSurveyCount(plan.id)
      }
    } catch { /* silent */ } finally {
      setSharing(false)
    }
  }

  async function copyLink() {
    if (!shareToken) return
    try {
      await navigator.clipboard.writeText(`${window.location.origin}/s/${shareToken}`)
      setCopied(true)
      setTimeout(() => setCopied(false), 2000)
    } catch { /* silent */ }
  }

  async function shareNative() {
    if (!shareToken) return
    try {
      await navigator.share({
        title: 'Menu de la semaine — KeskonBouf',
        text:  'Donne ton avis sur notre menu de la semaine !',
        url:   `${window.location.origin}/s/${shareToken}`,
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
  const allergyAlerts = plan.meal_plan_items.reduce((acc, i) => acc + (i.allergy_warnings?.length ?? 0), 0)
  const servings = plan.meal_plan_items[0]?.servings ?? 4

  const shareUrl = shareToken ? `${window.location.origin}/s/${shareToken}` : ''
  const whatsappText = encodeURIComponent(
    `Notre menu de la semaine est prêt ! Donne ton avis : ${shareUrl}`
  )

  const statsRow = (
    <div className="grid grid-cols-4 gap-2 mx-4">
      {[
        { icon: Users,        value: servings,                      label: 'Convives' },
        { icon: CheckCircle2, value: `${daysComplete}/7`,            label: 'Jours'    },
        { icon: Utensils,     value: `${filledSlots}/${totalSlots}`, label: 'Repas'    },
        { icon: AlertTriangle, value: allergyAlerts,                 label: 'Alertes'  },
      ].map(stat => (
        <div key={stat.label} className="bg-white border border-[var(--kkb-border)] rounded-[var(--kkb-radius-sm)] py-2.5 flex flex-col items-center gap-0.5">
          <stat.icon className="h-3.5 w-3.5 text-[var(--kkb-coral)]" />
          <span className="font-dosis font-bold text-sm text-[var(--kkb-text-primary)]">{stat.value}</span>
          <span className="text-[9px] font-quicksand font-bold uppercase tracking-wide text-[var(--kkb-text-tertiary)]">{stat.label}</span>
        </div>
      ))}
    </div>
  )

  const accordion = (
    <div className="space-y-2.5">
      {activeConfigs.map(config => (
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
      {!validated ? (
        <button
          type="button"
          onClick={() => { void validate() }}
          disabled={validating}
          className="w-full bg-[var(--kkb-coral)] text-white rounded-2xl py-3.5 font-dosis font-bold text-base flex items-center justify-center gap-2 disabled:opacity-60 transition-opacity"
        >
          {validating
            ? <Loader2 className="h-5 w-5 animate-spin" />
            : <CheckCircle2 className="h-5 w-5" />
          }
          {validating ? 'Validation…' : 'Valider le menu'}
        </button>
      ) : (
        <>
          <div className="bg-emerald-50 border border-emerald-200 rounded-2xl px-4 py-3.5 flex items-center gap-3">
            <CheckCircle2 className="h-5 w-5 text-emerald-600 flex-shrink-0" />
            <div>
              <p className="font-dosis font-bold text-sm text-emerald-800">Menu validé !</p>
              <p className="text-[11px] font-quicksand text-emerald-700 mt-0.5">
                Ce menu est confirmé pour la semaine.
              </p>
            </div>
          </div>

          {!shareToken ? (
            <button
              type="button"
              onClick={() => { void share() }}
              disabled={sharing}
              className="w-full border border-[var(--kkb-coral)] text-[var(--kkb-coral)] rounded-2xl py-3 font-dosis font-bold text-sm flex items-center justify-center gap-2 disabled:opacity-60 hover:bg-[var(--kkb-coral)]/5 transition-colors"
            >
              {sharing
                ? <Loader2 className="h-4 w-4 animate-spin" />
                : <Share2 className="h-4 w-4" />
              }
              {sharing ? 'Génération du lien…' : 'Partager ce menu'}
            </button>
          ) : (
            <div className="bg-[var(--kkb-coral-light)] border border-[var(--kkb-border)] rounded-2xl px-4 py-3 space-y-2.5">
              <p className="text-[11px] font-quicksand font-semibold text-[var(--kkb-text-secondary)] uppercase tracking-wider">
                Lien de partage
              </p>
              <p className="text-xs font-quicksand text-[var(--kkb-text-primary)] truncate">
                {shareUrl}
              </p>
              <div className="flex items-center gap-2">
                <a
                  href={`https://wa.me/?text=${whatsappText}`}
                  target="_blank"
                  rel="noopener noreferrer"
                  className="flex-1 flex items-center justify-center gap-1.5 bg-emerald-500 text-white rounded-lg px-3 py-2 text-[11px] font-quicksand font-semibold hover:opacity-90 transition-opacity"
                >
                  <MessageCircle className="h-3 w-3" />
                  WhatsApp
                </a>
                {canNativeShare && (
                  <button
                    type="button"
                    onClick={() => { void shareNative() }}
                    className="flex-1 flex items-center justify-center gap-1.5 bg-[var(--kkb-coral)] text-white rounded-lg px-3 py-2 text-[11px] font-quicksand font-semibold hover:opacity-80 transition-opacity"
                  >
                    <Share2 className="h-3 w-3" />
                    Partager
                  </button>
                )}
                <button
                  type="button"
                  onClick={() => { void copyLink() }}
                  className="flex-shrink-0 flex items-center justify-center gap-1.5 rounded-lg px-3 py-2 text-[11px] font-quicksand font-semibold border border-[var(--kkb-border)] text-[var(--kkb-text-secondary)] hover:border-[var(--kkb-coral)] hover:text-[var(--kkb-coral)] transition-colors"
                >
                  <Copy className="h-3 w-3" />
                  {copied ? 'Copié !' : 'Copier'}
                </button>
              </div>
              <p className="text-[10px] font-quicksand text-[var(--kkb-text-tertiary)]">
                Ce lien est valable 30 jours.
              </p>
            </div>
          )}

          {/* Bouton résultats sondage — visible dès qu'un répondant existe */}
          {plan && surveyCount !== null && surveyCount > 0 && (
            <button
              type="button"
              onClick={() => router.push(`/plan/${plan.id}/survey`)}
              className="w-full border border-[var(--kkb-success)] text-[var(--kkb-success)] rounded-2xl py-3 font-dosis font-bold text-sm flex items-center justify-center gap-2 hover:bg-[var(--kkb-success-light)] transition-colors"
            >
              <BarChart3 className="h-4 w-4" />
              Voir les résultats du sondage ({surveyCount})
            </button>
          )}
        </>
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
        <div className="px-4">{accordion}</div>
        {ctaSection}
      </div>

      {/* ── Desktop ── */}
      <div className="hidden lg:block max-w-4xl mx-auto px-6 py-8 space-y-6">
        {/* Stepper — 2 étapes réelles, cf. /plan */}
        <div className="flex items-center justify-center gap-1.5">
          <div className="flex items-center gap-1.5">
            <button type="button" onClick={() => router.push('/plan')} className="w-5 h-5 rounded-full bg-[var(--kkb-success)] flex items-center justify-center">
              <span className="text-white text-[10px] font-bold">✓</span>
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

        <div className="space-y-2.5">{accordion}</div>
      </div>

      {/* Barre d'action sticky desktop */}
      <div className="hidden lg:block fixed bottom-0 left-0 right-0 z-30 bg-white border-t border-[var(--kkb-border)] px-6 py-4">
        <div className="max-w-4xl mx-auto">{ctaSection}</div>
      </div>
      <div className="hidden lg:block h-24" aria-hidden="true" />
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

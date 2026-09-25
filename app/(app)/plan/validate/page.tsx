'use client'

import { Suspense, useEffect, useState } from 'react'
import { useRouter, useSearchParams } from 'next/navigation'
import {
  BarChart3,
  CheckCircle2,
  ChevronLeft,
  Clock,
  Copy,
  Loader2,
  Share2,
  Utensils,
} from 'lucide-react'
import { composedName } from '@/lib/utils/composed-name'

// ─── Types ────────────────────────────────────────────────────────────────────

type MealType  = 'petit_dejeuner' | 'dejeuner' | 'gouter' | 'diner'
type DayOfWeek = 'lundi' | 'mardi' | 'mercredi' | 'jeudi' | 'vendredi' | 'samedi' | 'dimanche'

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

interface PlanItem {
  id:                string
  day_of_week:       DayOfWeek
  meal_type:         MealType
  applies_all_days:  boolean
  recipes:           PlanRecipe | null
  meal_compositions: Composition[]
}

interface Plan {
  id:              string
  week_start:      string
  status:          string
  share_token:     string | null
  meal_plan_items: PlanItem[]
}

// ─── Constantes ───────────────────────────────────────────────────────────────

const DAY_OPTIONS: { val: DayOfWeek; full: string }[] = [
  { val: 'lundi',    full: 'Lundi'    },
  { val: 'mardi',    full: 'Mardi'    },
  { val: 'mercredi', full: 'Mercredi' },
  { val: 'jeudi',    full: 'Jeudi'    },
  { val: 'vendredi', full: 'Vendredi' },
  { val: 'samedi',   full: 'Samedi'   },
  { val: 'dimanche', full: 'Dimanche' },
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

// ─── Helper ───────────────────────────────────────────────────────────────────

function formatWeekRange(weekStart: string): string {
  const start = new Date(weekStart + 'T00:00:00')
  const end   = new Date(start)
  end.setDate(start.getDate() + 6)
  const fmt = (d: Date) => d.toLocaleDateString('fr-FR', { day: 'numeric', month: 'short' })
  return `${fmt(start)} – ${fmt(end)}`
}

// ─── Sous-composant : ligne recette ──────────────────────────────────────────

function RecipeRow({ recipe, label, displayName }: {
  recipe:       PlanRecipe | null
  label:        string
  displayName?: string
}) {
  return (
    <div className="flex items-center gap-3 px-3 py-2.5 border-b border-[var(--mf-border-warm)]/30 last:border-0">
      <p className="w-20 text-[10px] font-quicksand font-semibold text-[var(--mf-text-tertiary)] flex-shrink-0">
        {label}
      </p>
      {recipe ? (
        <>
          <span className="text-base flex-shrink-0">
            {recipe.categories?.icon ?? '🍴'}
          </span>
          <div className="flex-1 min-w-0">
            <p className="text-xs font-quicksand font-medium text-[var(--mf-text-primary)] truncate">
              {displayName ?? recipe.name}
            </p>
            {recipe.prep_time_min && (
              <div className="flex items-center gap-0.5 mt-0.5">
                <Clock className="h-2.5 w-2.5 text-[var(--mf-text-tertiary)]" />
                <span className="text-[10px] font-quicksand text-[var(--mf-text-secondary)]">
                  {recipe.prep_time_min} min
                </span>
              </div>
            )}
          </div>
        </>
      ) : (
        <div className="flex items-center gap-2 flex-1">
          <Utensils className="h-3.5 w-3.5 text-[var(--mf-text-tertiary)] flex-shrink-0" />
          <p className="text-xs font-quicksand text-[var(--mf-text-tertiary)] italic">Non planifié</p>
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

      const active = (Array.isArray(configData) ? configData as MealConfig[] : [])
        .filter(c => c.is_active)
        .sort((a, b) => a.display_order - b.display_order)

      setPlan(planData?.id ? planData : null)
      setConfigs(active)

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
        title: 'Menu de la semaine — MenuFamille',
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
        <Loader2 className="h-6 w-6 text-[var(--mf-primary)] animate-spin" />
      </div>
    )
  }

  if (!plan) {
    return (
      <div className="px-4 py-12 text-center space-y-4">
        <p className="text-sm font-quicksand text-[var(--mf-text-secondary)]">
          Aucun menu à valider pour cette semaine.
        </p>
        <button
          type="button"
          onClick={() => router.push('/plan')}
          className="text-sm font-quicksand text-[var(--mf-primary)] underline"
        >
          Retour au planning
        </button>
      </div>
    )
  }

  const activeConfigs = configs.filter(c => c.is_active)

  let totalSlots  = 0
  let filledSlots = 0
  activeConfigs.forEach(c => {
    if (c.mode === 'template') {
      totalSlots++
      if (plan.meal_plan_items.some(i => i.meal_type === c.meal_type && i.applies_all_days)) filledSlots++
    } else {
      totalSlots += 7
      DAY_OPTIONS.forEach(d => {
        if (plan.meal_plan_items.some(
          i => i.meal_type === c.meal_type && i.day_of_week === d.val && !i.applies_all_days
        )) filledSlots++
      })
    }
  })

  const shareUrl = shareToken ? `${window.location.origin}/s/${shareToken}` : ''

  return (
    <div>
      {/* Header */}
      <div className="sticky top-14 z-30 bg-[var(--mf-bg-page)] border-b border-[var(--mf-border-warm)] px-4 h-12 flex items-center gap-3">
        <button
          type="button"
          onClick={() => router.back()}
          className="p-1.5 -ml-1.5 text-[var(--mf-text-secondary)] hover:text-[var(--mf-primary)] transition-colors"
          aria-label="Retour"
        >
          <ChevronLeft className="h-5 w-5" />
        </button>
        <div>
          <p className="font-dosis font-bold text-sm text-[var(--mf-text-primary)]">
            Confirmer le menu
          </p>
          <p className="text-[11px] font-quicksand text-[var(--mf-text-secondary)]">
            {formatWeekRange(plan.week_start)}
          </p>
        </div>
      </div>

      {/* Erreur */}
      {apiError && (
        <p className="mx-4 mt-4 text-sm text-red-600 font-quicksand bg-red-50 px-4 py-2 rounded-xl">
          {apiError}
        </p>
      )}

      {/* Résumé des repas */}
      <div className="py-4 space-y-3">
        {activeConfigs.map(config => {
          const templateItem = config.mode === 'template'
            ? (plan.meal_plan_items.find(i => i.meal_type === config.meal_type && i.applies_all_days) ?? null)
            : null

          return (
            <div
              key={config.meal_type}
              className="mx-4 bg-[var(--mf-bg-card)] border border-[var(--mf-border-warm)] rounded-xl overflow-hidden"
            >
              <div className="flex items-center gap-2 px-3 py-2 border-b border-[var(--mf-border-warm)]/50">
                <span className="text-base">{MEAL_EMOJI[config.meal_type]}</span>
                <span className="font-dosis font-semibold text-sm text-[var(--mf-text-primary)]">
                  {MEAL_LABEL[config.meal_type]}
                </span>
                <span className={`ml-auto text-[10px] font-quicksand font-bold uppercase tracking-wider px-1.5 py-0.5 rounded-full ${
                  config.mode === 'template'
                    ? 'bg-[var(--mf-gold-bg)] text-[var(--mf-gold)]'
                    : 'bg-[var(--mf-bg-page)] text-[var(--mf-text-tertiary)]'
                }`}>
                  {config.mode === 'template' ? 'Modèle' : 'Quotidien'}
                </span>
              </div>

              {config.mode === 'template' ? (
                <RecipeRow
                  recipe={templateItem?.recipes ?? null}
                  label="Toute la semaine"
                  displayName={templateItem ? composedName(templateItem.recipes?.name, templateItem.meal_compositions) : undefined}
                />
              ) : (
                DAY_OPTIONS.map(d => {
                  const item = plan.meal_plan_items.find(
                    i => i.meal_type === config.meal_type && i.day_of_week === d.val && !i.applies_all_days
                  ) ?? null
                  return (
                    <RecipeRow
                      key={d.val}
                      recipe={item?.recipes ?? null}
                      label={d.full}
                      displayName={item ? composedName(item.recipes?.name, item.meal_compositions) : undefined}
                    />
                  )
                })
              )}
            </div>
          )
        })}
      </div>

      {/* Compteur */}
      <div className="mx-4 mb-5 flex items-center gap-2">
        {filledSlots === totalSlots ? (
          <CheckCircle2 className="h-4 w-4 text-[var(--mf-green)] flex-shrink-0" />
        ) : (
          <div className="h-4 w-4 rounded-full border-2 border-[var(--mf-border-warm)] flex-shrink-0" />
        )}
        <p className="text-[11px] font-quicksand text-[var(--mf-text-secondary)]">
          {filledSlots === totalSlots
            ? `${filledSlots} repas planifiés`
            : `${filledSlots}/${totalSlots} repas planifiés — ${totalSlots - filledSlots} non renseigné${totalSlots - filledSlots > 1 ? 's' : ''}`
          }
        </p>
      </div>

      {/* CTA */}
      <div className="mx-4 mb-8 space-y-3">
        {!validated ? (
          <button
            type="button"
            onClick={() => { void validate() }}
            disabled={validating}
            className="w-full bg-[var(--mf-primary)] text-white rounded-2xl py-3.5 font-dosis font-bold text-base flex items-center justify-center gap-2 disabled:opacity-60 transition-opacity"
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
                className="w-full border border-[var(--mf-primary)] text-[var(--mf-primary)] rounded-2xl py-3 font-dosis font-bold text-sm flex items-center justify-center gap-2 disabled:opacity-60 hover:bg-[var(--mf-primary)]/5 transition-colors"
              >
                {sharing
                  ? <Loader2 className="h-4 w-4 animate-spin" />
                  : <Share2 className="h-4 w-4" />
                }
                {sharing ? 'Génération du lien…' : 'Partager ce menu'}
              </button>
            ) : (
              <div className="bg-[var(--mf-bg-card)] border border-[var(--mf-border-warm)] rounded-2xl px-4 py-3 space-y-2.5">
                <p className="text-[11px] font-quicksand font-semibold text-[var(--mf-text-secondary)] uppercase tracking-wider">
                  Lien de partage
                </p>
                <p className="text-xs font-quicksand text-[var(--mf-text-primary)] truncate">
                  {shareUrl}
                </p>
                <div className="flex items-center gap-2">
                  {canNativeShare && (
                    <button
                      type="button"
                      onClick={() => { void shareNative() }}
                      className="flex-1 flex items-center justify-center gap-1.5 bg-[var(--mf-primary)] text-white rounded-lg px-3 py-2 text-[11px] font-quicksand font-semibold hover:opacity-80 transition-opacity"
                    >
                      <Share2 className="h-3 w-3" />
                      Partager
                    </button>
                  )}
                  <button
                    type="button"
                    onClick={() => { void copyLink() }}
                    className={`flex items-center justify-center gap-1.5 rounded-lg px-3 py-2 text-[11px] font-quicksand font-semibold transition-colors ${
                      canNativeShare
                        ? 'flex-shrink-0 border border-[var(--mf-border-warm)] text-[var(--mf-text-secondary)] hover:border-[var(--mf-primary)] hover:text-[var(--mf-primary)]'
                        : 'flex-1 bg-[var(--mf-primary)] text-white hover:opacity-80'
                    }`}
                  >
                    <Copy className="h-3 w-3" />
                    {copied ? 'Copié !' : 'Copier'}
                  </button>
                </div>
                <p className="text-[10px] font-quicksand text-[var(--mf-text-tertiary)]">
                  Ce lien est valable 30 jours.
                </p>
              </div>
            )}

            {/* Bouton résultats sondage — visible dès qu'un répondant existe */}
            {plan && surveyCount !== null && surveyCount > 0 && (
              <button
                type="button"
                onClick={() => router.push(`/plan/${plan.id}/survey`)}
                className="w-full border border-[#2A7D4F] text-[#2A7D4F] rounded-2xl py-3 font-dosis font-bold text-sm flex items-center justify-center gap-2 hover:bg-[#F0FAF5] transition-colors"
              >
                <BarChart3 className="h-4 w-4" />
                Voir les résultats du sondage ({surveyCount})
              </button>
            )}
          </>
        )}
      </div>
    </div>
  )
}

// ─── Export ───────────────────────────────────────────────────────────────────

export default function ValidatePage() {
  return (
    <Suspense fallback={
      <div className="flex items-center justify-center min-h-[50vh]">
        <Loader2 className="h-6 w-6 text-[var(--mf-primary)] animate-spin" />
      </div>
    }>
      <ValidateInner />
    </Suspense>
  )
}

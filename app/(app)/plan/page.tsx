'use client'

import { useEffect, useRef, useState } from 'react'
import { useRouter } from 'next/navigation'
import {
  CheckCircle,
  ChevronRight,
  Clock,
  Loader2,
  LockOpen,
  Pencil,
  Settings,
  Timer,
  Utensils,
  Wand2,
} from 'lucide-react'

// ─── Types ────────────────────────────────────────────────────────────────────

type MealType    = 'petit_dejeuner' | 'dejeuner' | 'gouter' | 'diner'
type DayOfWeek   = 'lundi' | 'mardi' | 'mercredi' | 'jeudi' | 'vendredi' | 'samedi' | 'dimanche'
type ViewState   = 'loading' | 'before' | 'generating' | 'review'

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

interface PlanItem {
  id:             string
  day_of_week:    DayOfWeek
  meal_type:      MealType
  applies_all_days: boolean
  servings:       number
  is_locked:      boolean
  sort_order:     number
  recipes:        PlanRecipe | null
}

interface Plan {
  id:             string
  week_start:     string
  status:         string
  meal_plan_items: PlanItem[]
}

// ─── Constantes ───────────────────────────────────────────────────────────────

const GEN_STEPS = [
  'Sélection des recettes…',
  'Vérification de la variété…',
  'Prise en compte des restrictions…',
  'Finalisation…',
]

const DAY_OPTIONS: { val: DayOfWeek; label: string }[] = [
  { val: 'lundi',    label: 'Lun' },
  { val: 'mardi',    label: 'Mar' },
  { val: 'mercredi', label: 'Mer' },
  { val: 'jeudi',    label: 'Jeu' },
  { val: 'vendredi', label: 'Ven' },
  { val: 'samedi',   label: 'Sam' },
  { val: 'dimanche', label: 'Dim' },
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

// ─── Helpers ──────────────────────────────────────────────────────────────────

function getMondayISO(d: Date = new Date()): string {
  const day  = d.getDay()
  const diff = day === 0 ? -6 : 1 - day
  const mon  = new Date(d)
  mon.setDate(d.getDate() + diff)
  return mon.toISOString().split('T')[0]
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
  const sessionStartRef = useRef<number | null>(null)

  // ── Chargement initial ────────────────────────────────────────────────────

  useEffect(() => { void loadPlan() }, [])

  async function loadPlan() {
    setViewState('loading')
    setGenError(null)
    try {
      const [planRes, configRes] = await Promise.all([
        fetch(`/api/meal-plans?week=${getMondayISO()}`),
        fetch('/api/users/me/meal-config'),
      ])
      const planData: Plan       = await planRes.json()
      const configData: unknown  = await configRes.json()

      const active = (Array.isArray(configData) ? configData as MealConfig[] : [])
        .filter(c => c.is_active)
        .sort((a, b) => a.display_order - b.display_order)

      setConfigs(active)
      setPlan(planData?.id ? planData : null)

      if (planData?.meal_plan_items?.length > 0) {
        if (!sessionStartRef.current) sessionStartRef.current = Date.now()
        setViewState('review')
      } else {
        setViewState('before')
      }
    } catch {
      setGenError('Impossible de charger le planning')
      setViewState('before')
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
      const res = await fetch('/api/meal-plans/generate', { method: 'POST' })
      if (!res.ok) {
        const d = await res.json()
        throw new Error(d.error ?? 'Erreur lors de la génération')
      }

      const elapsed = Date.now() - start
      if (elapsed < 1800) await new Promise(r => setTimeout(r, 1800 - elapsed))

      clearInterval(ticker)
      setGenStep(4)
      await new Promise(r => setTimeout(r, 300))

      const planRes  = await fetch(`/api/meal-plans?week=${getMondayISO()}`)
      const planData: Plan = await planRes.json()
      setPlan(planData)
      sessionStartRef.current = Date.now()
      setModCount(0)
      setSessionTime(0)
      setViewState('review')
    } catch (e) {
      clearInterval(ticker)
      setGenError(e instanceof Error ? e.message : 'Erreur lors de la génération')
      setViewState('before')
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
  const weekStart     = plan?.week_start ?? getMondayISO()

  // ── Rendu ─────────────────────────────────────────────────────────────────

  return (
    <>
      {/* Sous-header : semaine + settings */}
      <div className="sticky top-14 z-30 bg-[var(--mf-bg-page)] border-b border-[var(--mf-border-warm)] px-4 h-10 flex items-center justify-between">
        <p className="font-quicksand text-xs font-semibold text-[var(--mf-text-secondary)]">
          {formatWeekRange(weekStart)}
        </p>
        <button
          type="button"
          onClick={() => router.push('/plan/configure')}
          className="p-1.5 text-[var(--mf-text-secondary)] hover:text-[var(--mf-primary)] transition-colors"
          aria-label="Configurer les repas"
        >
          <Settings className="h-4 w-4" />
        </button>
      </div>

      {/* Stepper */}
      <div className="bg-[var(--mf-bg-page)] border-b border-[var(--mf-border-warm)] px-4 py-2.5">
        <div className="flex items-center justify-center gap-1.5">
          {/* Étape 1 — CONFIGURER (fait) */}
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

          {/* Étape 2 — CHOISIR (active) */}
          <div className="flex items-center gap-1.5">
            <div className="w-5 h-5 rounded-full bg-[var(--mf-primary)] flex items-center justify-center">
              <span className="text-white text-[10px] font-bold">2</span>
            </div>
            <span className="text-[10px] font-quicksand font-bold uppercase tracking-wider text-[var(--mf-primary)]">
              Choisir
            </span>
          </div>

          <ChevronRight className="h-3 w-3 text-[var(--mf-border-warm)]" />

          {/* Étape 3 — VALIDER (inactif en J1) */}
          <div className="flex items-center gap-1.5 opacity-40">
            <div className="w-5 h-5 rounded-full bg-[var(--mf-border-warm)] flex items-center justify-center">
              <span className="text-[var(--mf-text-tertiary)] text-[10px] font-bold">3</span>
            </div>
            <span className="text-[10px] font-quicksand font-bold uppercase tracking-wider text-[var(--mf-text-tertiary)]">
              Valider
            </span>
          </div>
        </div>
      </div>

      {/* ── État : chargement ── */}
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
                  genStep > i
                    ? 'text-[var(--mf-text-primary)] font-medium'
                    : 'text-[var(--mf-text-tertiary)]'
                }`}>
                  {label}
                </p>
              </div>
            ))}
          </div>
        </div>
      )}

      {/* ── État : avant génération ── */}
      {viewState === 'before' && (
        <div className="flex flex-col items-center justify-center min-h-[55vh] gap-6 px-6 text-center">
          <div className="w-20 h-20 rounded-full bg-[var(--mf-bg-card)] flex items-center justify-center">
            <Wand2 className="h-10 w-10 text-[var(--mf-primary)]" />
          </div>
          <div className="space-y-2">
            <h1 className="font-dosis font-bold text-2xl text-[var(--mf-text-primary)]">
              Générer mon menu
            </h1>
            <p className="text-sm font-quicksand text-[var(--mf-text-secondary)] leading-relaxed max-w-xs">
              Laissez-nous composer votre semaine en quelques secondes
            </p>
          </div>

          {genError && (
            <p className="text-sm text-red-600 font-quicksand bg-red-50 px-4 py-2 rounded-xl max-w-xs">
              {genError}
            </p>
          )}

          {activeConfigs.length === 0 ? (
            <div className="space-y-3">
              <p className="text-sm text-[var(--mf-text-secondary)] font-quicksand">
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
          ) : (
            <button
              type="button"
              onClick={() => { void generateMenu() }}
              className="flex items-center gap-2 px-6 py-3.5 rounded-xl bg-[var(--mf-primary)] text-white font-quicksand font-semibold text-sm hover:bg-[var(--mf-primary-hover)] transition-colors"
            >
              <Wand2 className="h-4 w-4" />
              Générer mon menu
            </button>
          )}
        </div>
      )}

      {/* ── État : grille de révision ── */}
      {viewState === 'review' && (
        <div className="space-y-6 py-4 pb-10">
          {/* Barre stats */}
          <div className="flex items-center justify-end gap-4 px-4">
            <span className="flex items-center gap-1 text-[11px] font-quicksand text-[var(--mf-text-tertiary)]">
              <Pencil className="h-3 w-3" />
              {modCount}
            </span>
            <span className="flex items-center gap-1 text-[11px] font-quicksand text-[var(--mf-text-tertiary)]">
              <Timer className="h-3 w-3" />
              {formatTime(sessionTime)}
            </span>
            <button
              type="button"
              onClick={() => { void generateMenu() }}
              className="text-[11px] font-quicksand text-[var(--mf-primary)] underline"
            >
              Régénérer
            </button>
          </div>

          {/* Sections par type de repas */}
          {activeConfigs.map(config => (
            <div key={config.meal_type} className="space-y-2.5">
              {/* Section header */}
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

              {/* Cartes */}
              {config.mode === 'template' ? (
                <TemplateCard item={getTemplateItem(config.meal_type) ?? null} />
              ) : (
                <div className="flex gap-2 overflow-x-auto px-4 pb-1 scrollbar-hide">
                  {DAY_OPTIONS.map(d => (
                    <DailyCard
                      key={d.val}
                      dayLabel={d.label}
                      item={getDailyItem(config.meal_type, d.val) ?? null}
                    />
                  ))}
                </div>
              )}
            </div>
          ))}
        </div>
      )}
    </>
  )
}

// ─── Carte template (full-width) ──────────────────────────────────────────────

function TemplateCard({ item }: { item: PlanItem | null }) {
  const recipe = item?.recipes ?? null

  return (
    <div className="mx-4 bg-[var(--mf-bg-card)] border border-[var(--mf-border-warm)] rounded-xl p-3.5 flex items-center gap-3">
      <div className="flex-shrink-0">
        {recipe?.categories?.icon
          ? <span className="text-2xl">{recipe.categories.icon}</span>
          : <Utensils className="h-6 w-6 text-[var(--mf-text-tertiary)]" />}
      </div>
      <div className="flex-1 min-w-0">
        <p className="font-dosis font-semibold text-sm text-[var(--mf-text-primary)] truncate">
          {recipe?.name ?? '—'}
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
        <button
          type="button"
          aria-label={item?.is_locked ? 'Déverrouiller' : 'Verrouiller'}
          className="p-1.5 text-[var(--mf-text-tertiary)]"
        >
          <LockOpen className="h-4 w-4" />
        </button>
        <button
          type="button"
          aria-label="Changer ce repas"
          className="p-1.5 text-[var(--mf-text-secondary)]"
        >
          <Pencil className="h-4 w-4" />
        </button>
      </div>
    </div>
  )
}

// ─── Carte quotidienne (compact, scroll horizontal) ───────────────────────────

function DailyCard({ dayLabel, item }: { dayLabel: string; item: PlanItem | null }) {
  const recipe = item?.recipes ?? null

  return (
    <div className="flex-shrink-0 w-28 bg-[var(--mf-bg-card)] border border-[var(--mf-border-warm)] rounded-xl p-2.5 flex flex-col gap-1.5">
      <p className="text-[10px] font-quicksand font-bold uppercase tracking-wider text-[var(--mf-text-tertiary)]">
        {dayLabel}
      </p>
      <div className="flex-1">
        {recipe?.categories?.icon
          ? <span className="text-xl">{recipe.categories.icon}</span>
          : <Utensils className="h-5 w-5 text-[var(--mf-text-tertiary)]" />}
        <p className="text-[11px] font-quicksand font-semibold text-[var(--mf-text-primary)] mt-1 line-clamp-2 leading-tight">
          {recipe?.name ?? '—'}
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
        <button
          type="button"
          aria-label={item?.is_locked ? 'Déverrouiller' : 'Verrouiller'}
          className="p-1 text-[var(--mf-text-tertiary)]"
        >
          <LockOpen className="h-3.5 w-3.5" />
        </button>
        <button
          type="button"
          aria-label="Changer ce repas"
          className="p-1 text-[var(--mf-text-secondary)]"
        >
          <Pencil className="h-3.5 w-3.5" />
        </button>
      </div>
    </div>
  )
}

'use client'

import { useEffect, useMemo, useState } from 'react'
import { useRouter } from 'next/navigation'
import { CalendarDays, CupSoda, Hand, PlusCircle, Salad, Settings, UtensilsCrossed, Zap } from 'lucide-react'
import { DAY_OPTIONS, getMondayISO, formatWeekRange, dayOfWeekFromDate, type DayOfWeek } from '@/lib/utils/week'
import { MEAL_LABEL, MEAL_COLOR, type MealType } from '@/lib/constants/meal-type'
import { MEAL_ICON } from '@/lib/constants/meal-type-icon'
import { sortByMealType } from '@/lib/utils/sort-meal-configs'
import { agreementPct as agreementOf, sumCounts } from '@/lib/utils/survey-score'
import { MealCardHero } from '@/components/home/meal-card-hero'
import { MealCardCompact } from '@/components/home/meal-card-compact'
import { WeekDayPicker } from '@/components/home/week-day-picker'
import { UpcomingCarousel, type UpcomingDay } from '@/components/home/upcoming-carousel'
import { UpcomingGrid, type UpcomingGridDay } from '@/components/home/upcoming-grid'
import { HarmonyWidget } from '@/components/home/harmony-widget'
import { MemberResultsCard } from '@/components/home/member-results-card'
import { TipCard } from '@/components/home/tip-card'
import type { ChipItem } from '@/components/home/composition-carousel'
import { EmptyState } from '@/components/ui/empty-state'
import { SkeletonCard } from '@/components/ui/skeleton-card'

// ─── Types ────────────────────────────────────────────────────────────────────

interface RecipeRef {
  id: string
  name: string
  photo_url: string | null
  prep_time_min: number | null
  cook_time_min: number | null
  difficulty: string | null
  categories: { icon: string | null } | null
}

interface CompositionRecipeRef {
  id: string
  name: string
  categories: { icon: string | null } | null
}

interface Composition {
  id: string
  role: string
  sort_order: number
  recipe_id: string
  recipes: CompositionRecipeRef | null
}

interface PlanItem {
  id: string
  day_of_week: DayOfWeek
  meal_type: MealType
  applies_all_days: boolean
  servings: number
  recipes: RecipeRef | null
  meal_compositions: Composition[]
}

interface Plan {
  id: string
  week_start: string
  status: 'draft' | 'shared' | 'finalized'
  share_token: string | null
  meal_plan_items: PlanItem[]
}

interface MealConfig {
  meal_type: MealType
  is_active: boolean
  mode: 'daily' | 'template'
  display_order: number
  default_time: string | null
}

interface SurveyItemResult {
  id: string
  day_of_week: DayOfWeek
  aime: number
  bof: number
  naime_pas: number
}

interface SurveyResults {
  respondent_count: number
  items: SurveyItemResult[]
}

interface CommunityTip {
  id: string
  name: string
  description: string
}

// ─── Helpers ──────────────────────────────────────────────────────────────────

function formatTime(hhmm: string | null): string {
  if (!hhmm) return ''
  return hhmm.slice(0, 5).replace(':', 'h')
}

function toChips(compositions: Composition[]): ChipItem[] {
  return compositions
    .slice()
    .sort((a, b) => a.sort_order - b.sort_order)
    .filter((c): c is Composition & { recipes: CompositionRecipeRef } => !!c.recipes)
    .map(c => ({
      icon: c.role === 'drink' ? CupSoda : c.role === 'side' ? Salad : UtensilsCrossed,
      name: c.recipes.name,
    }))
}

export default function HomePage() {
  const router = useRouter()
  const [firstName, setFirstName]         = useState('')
  const [configs, setConfigs]             = useState<MealConfig[]>([])
  const [plan, setPlan]                   = useState<Plan | null>(null)
  const [memberCount, setMemberCount]     = useState(1)
  const [isMember, setIsMember]           = useState(false)
  const [surveyResults, setSurveyResults] = useState<SurveyResults | null>(null)
  const [communityTip, setCommunityTip]   = useState<CommunityTip | null>(null)
  const [loading, setLoading]             = useState(true)

  const weekStart = useMemo(() => getMondayISO(), [])
  const today     = useMemo(() => dayOfWeekFromDate(new Date()), [])
  const [selectedDay, setSelectedDay] = useState<DayOfWeek>(today)

  useEffect(() => {
    let cancelled = false

    async function load() {
      const [userRes, configRes, planRes, circlesRes, recipesRes] = await Promise.all([
        fetch('/api/users/me').then(r => r.json()).catch(() => null),
        fetch('/api/users/me/meal-config').then(r => r.json()).catch(() => []),
        fetch(`/api/meal-plans?week=${weekStart}`).then(r => r.json()).catch(() => null),
        fetch('/api/circles').then(r => r.json()).catch(() => null),
        fetch('/api/recipes?scope=communaute').then(r => r.json()).catch(() => []),
      ])
      if (cancelled) return

      setFirstName(userRes?.display_name?.split(' ')[0] ?? '')
      setConfigs(Array.isArray(configRes) ? configRes : [])
      setPlan(planRes?.id ? planRes : null)

      const circle = circlesRes?.data?.[0]
      setMemberCount(circle?.family_circle_members?.length ?? 1)
      setIsMember(circle?.my_role === 'membre')

      // Astuce du jour : piochee parmi les recettes communautaires avec une
      // description, rotation deterministe par jour (pas de contenu invente).
      const tipPool = (Array.isArray(recipesRes) ? recipesRes : [])
        .filter((r: { description?: string | null }) => r.description?.trim())
      if (tipPool.length > 0) {
        const dayIndex = Math.floor(Date.now() / 86_400_000) % tipPool.length
        const pick = tipPool[dayIndex]
        setCommunityTip({ id: pick.id, name: pick.name, description: pick.description })
      }

      if (planRes?.share_token) {
        const sr = await fetch(`/api/meal-plans/${planRes.id}/survey-results`).then(r => r.json()).catch(() => null)
        if (!cancelled) setSurveyResults(sr)
      }

      setLoading(false)
    }

    void load()
    return () => { cancelled = true }
  }, [weekStart])

  const activeConfigs = useMemo(
    () => sortByMealType(configs.filter(c => c.is_active)),
    [configs]
  )

  function getItemForDay(config: MealConfig, day: DayOfWeek): PlanItem | undefined {
    if (!plan) return undefined
    return config.mode === 'template'
      ? plan.meal_plan_items.find(i => i.meal_type === config.meal_type && i.applies_all_days)
      : plan.meal_plan_items.find(i => i.meal_type === config.meal_type && i.day_of_week === day && !i.applies_all_days)
  }

  const dayOpt      = DAY_OPTIONS.find(d => d.val === selectedDay)!
  const isToday     = selectedDay === today
  const selectedIdx = DAY_OPTIONS.findIndex(d => d.val === selectedDay)
  const selectedDate = useMemo(() => {
    const d = new Date(weekStart + 'T00:00:00')
    d.setDate(d.getDate() + selectedIdx)
    return d
  }, [weekStart, selectedIdx])
  const dayBadge = selectedDate.toLocaleDateString('fr-FR', { weekday: 'long', day: 'numeric', month: 'long' }).toUpperCase()

  const heroConfig  = activeConfigs.find(c => c.meal_type === 'dejeuner')
  const dinerConfig = activeConfigs.find(c => c.meal_type === 'diner')
  const heroItem    = heroConfig ? getItemForDay(heroConfig, selectedDay) : undefined

  function agreementForDay(day: DayOfWeek): number | null {
    if (!surveyResults) return null
    return agreementOf(sumCounts(surveyResults.items.filter(i => i.day_of_week === day)))
  }

  const agreementPct = useMemo(() => {
    if (!surveyResults || !heroItem) return null
    const match = surveyResults.items.find(i => i.id === heroItem.id)
    return match ? agreementOf(match) : null
  }, [surveyResults, heroItem])

  const upcomingDays: UpcomingDay[] = useMemo(() => {
    if (!plan || !heroConfig) return []
    const todayIdx = DAY_OPTIONS.findIndex(d => d.val === today)
    const out: UpcomingDay[] = []
    for (let i = 1; i <= 6 && out.length < 2; i++) {
      const idx = (todayIdx + i) % 7
      const opt = DAY_OPTIONS[idx]
      const item = getItemForDay(heroConfig, opt.val)
      if (!item?.recipes) continue
      const d = new Date(weekStart + 'T00:00:00')
      d.setDate(d.getDate() + idx)
      out.push({
        key:         item.id,
        dayLabel:    `${opt.full.slice(0, 3).toUpperCase()} ${d.getDate()}`,
        mealLabel:   MEAL_LABEL.dejeuner,
        title:       item.recipes.name,
        photoUrl:    item.recipes.photo_url,
        icon:        MEAL_ICON.dejeuner,
        prepTimeMin: item.recipes.prep_time_min,
      })
    }
    return out
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [plan, heroConfig, today, weekStart])

  const upcomingGridDays: UpcomingGridDay[] = useMemo(() => {
    if (!plan) return []
    const todayIdx = DAY_OPTIONS.findIndex(d => d.val === today)
    const out: UpcomingGridDay[] = []
    for (let i = 1; i <= 3; i++) {
      const idx = (todayIdx + i) % 7
      const opt = DAY_OPTIONS[idx]
      const lunchItem  = heroConfig  ? getItemForDay(heroConfig, opt.val)  : undefined
      const dinnerItem = dinerConfig ? getItemForDay(dinerConfig, opt.val) : undefined
      const d = new Date(weekStart + 'T00:00:00')
      d.setDate(d.getDate() + idx)
      out.push({
        key:          opt.val,
        dateLabel:    `${opt.full} ${d.getDate()}`,
        lunchTitle:   lunchItem?.recipes?.name ?? null,
        lunchPhoto:   lunchItem?.recipes?.photo_url ?? null,
        dinnerTitle:  dinnerItem?.recipes?.name ?? null,
        agreementPct: agreementForDay(opt.val),
      })
    }
    return out
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [plan, heroConfig, dinerConfig, today, weekStart, surveyResults])

  function goToPlan() { router.push('/plan') }

  const hasAnyItem = (plan?.meal_plan_items.length ?? 0) > 0

  const mealCardsContent = !hasAnyItem ? (
    <div className="rounded-[var(--kkb-radius-card)] border border-dashed border-[var(--kkb-border)] bg-white">
      {/* Génération via le parcours existant de /plan (écran d'attente + affichage du résultat) */}
      <EmptyState
        icon={UtensilsCrossed}
        title="Pas encore de menu cette semaine"
        description="Génère ton menu en un clic et régale ta famille !"
        ctaLabel="Générer ma semaine"
        ctaIcon={Zap}
        ctaAction={() => router.push('/plan?generate=1')}
        className="py-8"
      />
    </div>
  ) : activeConfigs.length === 0 ? (
    <div className="rounded-[var(--kkb-radius-card)] border border-dashed border-[var(--kkb-border)] bg-white">
      <EmptyState
        icon={Settings}
        title="Aucun repas activé"
        description="Choisis les repas à planifier pour ta famille."
        ctaLabel="Régler le rythme des repas"
        ctaHref="/settings/meal-config"
        className="py-8"
      />
    </div>
  ) : (
    <div className="space-y-4">
      {activeConfigs.map(config => {
        const item  = getItemForDay(config, selectedDay)
        const icon  = MEAL_ICON[config.meal_type]
        const label = MEAL_LABEL[config.meal_type]

        if (!item?.recipes) {
          return (
            <div
              key={config.meal_type}
              className="bg-white border border-dashed border-[var(--kkb-border)] rounded-xl p-4 flex items-center justify-between gap-3"
            >
              <div className="min-w-0">
                <p className="text-[10px] font-quicksand font-semibold uppercase text-[var(--kkb-text-tertiary)]">{label}</p>
                <p className="text-sm font-quicksand text-[var(--kkb-text-secondary)]">Pas encore planifié</p>
              </div>
              <button
                type="button"
                onClick={goToPlan}
                className="shrink-0 flex items-center gap-1 text-xs font-quicksand font-semibold text-[var(--kkb-coral)]"
              >
                <PlusCircle className="h-4 w-4" /> Ajouter
              </button>
            </div>
          )
        }

        if (config.meal_type === 'dejeuner') {
          return (
            <MealCardHero
              key={config.meal_type}
              icon={icon}
              timeLabel={`${label} · ${formatTime(config.default_time)}`}
              photoUrl={item.recipes.photo_url}
              recipeId={item.recipes.id}
              title={item.recipes.name}
              prepTimeMin={item.recipes.prep_time_min}
              difficulty={item.recipes.difficulty}
              respondentCount={surveyResults?.respondent_count ?? 0}
              memberCount={memberCount}
              agreementPct={agreementPct}
              compositionTitle="Accompagnements & Boissons"
              compositions={toChips(item.meal_compositions)}
              onAddComposition={goToPlan}
            />
          )
        }

        return (
          <MealCardCompact
            key={config.meal_type}
            icon={icon}
            badgeLabel={`${formatTime(config.default_time)} · ${label.toUpperCase()}`}
            badgeBg={MEAL_COLOR[config.meal_type].bg}
            badgeText={MEAL_COLOR[config.meal_type].text}
            photoUrl={item.recipes.photo_url}
            title={item.recipes.name}
            subtitle={item.servings ? `${item.servings} pers.` : ''}
            compositionTitle="Composantes & Extras"
            compositions={toChips(item.meal_compositions)}
            onEdit={goToPlan}
            onAddComposition={goToPlan}
          />
        )
      })}
    </div>
  )

  if (loading) {
    return (
      <div className="mx-auto max-w-sm space-y-4 px-4 pt-4 lg:grid lg:max-w-[1400px] lg:grid-cols-3 lg:gap-6 lg:space-y-0 lg:px-8 lg:py-8" aria-busy="true" aria-label="Chargement de l'accueil">
        <SkeletonCard variant="list" />
        <SkeletonCard variant="meal" />
        <SkeletonCard variant="meal" />
      </div>
    )
  }

  return (
    <>
    <div className="max-w-sm mx-auto px-4 pb-40 space-y-6 lg:hidden">
      {/* Salutation */}
      <section className="space-y-1 pt-2">
        <h1 className="text-h1 text-[var(--kkb-text-primary)] flex items-center gap-2">
          Bonjour{firstName ? `, ${firstName}` : ''} <Hand className="h-6 w-6 text-[var(--kkb-coral)]" />
        </h1>
        <p className="text-kkb-body text-[var(--kkb-text-secondary)]">Prête pour une nouvelle semaine de délices ?</p>
      </section>

      {isMember && <MemberResultsCard />}

      {/* Sélecteur de semaine */}
      <section className="space-y-2">
        <div className="flex items-center justify-between">
          <span className="text-kkb-label text-[var(--kkb-text-tertiary)]">{formatWeekRange(weekStart).toUpperCase()}</span>
          <CalendarDays className="h-4 w-4 text-[var(--kkb-coral)]" />
        </div>
        <WeekDayPicker weekStart={weekStart} selectedDay={selectedDay} onSelect={setSelectedDay} />
      </section>

      {/* Repas du jour sélectionné */}
      <section className="space-y-3">
        <div className="flex items-center justify-between gap-2">
          <h2 className="text-h2 text-[var(--kkb-text-primary)] flex items-center gap-1.5">
            <UtensilsCrossed className="h-4 w-4 text-[var(--kkb-coral)] shrink-0" />
            {isToday ? "Repas d'aujourd'hui" : `Repas du ${dayOpt.full.toLowerCase()}`}
          </h2>
          <span className="shrink-0 text-[10px] font-quicksand font-bold px-2 py-0.5 rounded-full bg-[var(--kkb-coral-light)] text-[var(--kkb-coral)]">
            {dayBadge}
          </span>
        </div>

        {mealCardsContent}
      </section>

      {/* Emplacement d'ancrage du FAB (cf. components/layout/fab.tsx) */}
      <div id="generate-slot" className="min-h-[52px]" />

      {/* Actions secondaires */}
      <section className="grid grid-cols-2 gap-2">
        <button
          type="button"
          onClick={goToPlan}
          className="border border-[var(--kkb-border)] bg-[var(--kkb-bg)]/70 hover:bg-[var(--kkb-bg)] text-[var(--kkb-coral)] py-3 px-3 rounded-xl text-btn-secondary flex items-center justify-center gap-1.5 active:scale-[0.98] transition-all"
        >
          <PlusCircle className="h-4 w-4" /> Ajouter un repas
        </button>
        <button
          type="button"
          onClick={() => router.push('/plan/configure')}
          className="border border-[var(--kkb-border)] bg-[var(--kkb-bg)]/70 hover:bg-[var(--kkb-bg)] text-[var(--kkb-text-secondary)] py-3 px-3 rounded-xl text-btn-secondary flex items-center justify-center gap-1.5 active:scale-[0.98] transition-all"
        >
          <Settings className="h-4 w-4" /> Ajuster mes préférences
        </button>
      </section>

      {/* À venir */}
      {upcomingDays.length > 0 && (
        <section className="space-y-3 pb-4">
          <div className="flex items-center justify-between">
            <h3 className="text-h2 text-[var(--kkb-text-primary)]">À venir</h3>
            <button type="button" onClick={goToPlan} className="text-xs font-quicksand text-[var(--kkb-coral)] flex items-center gap-0.5">
              Voir tout →
            </button>
          </div>
          <UpcomingCarousel days={upcomingDays} />
        </section>
      )}
    </div>

    {/* ─── Desktop (>=1024px) ─────────────────────────────────────────────── */}
    <div className="hidden lg:block px-8 py-8 max-w-[1400px] mx-auto">
      <section className="flex flex-row items-end justify-between gap-6 pb-8">
        <div className="flex flex-col gap-2">
          <div className="flex items-center gap-3">
            <span className="inline-flex items-center gap-1.5 px-3 py-1 rounded-full bg-[var(--kkb-teal-light)] text-[var(--kkb-teal)] text-sm font-quicksand font-semibold">
              <CalendarDays className="h-4 w-4" /> Semaine du {formatWeekRange(weekStart)}
            </span>
            {agreementPct !== null && (
              <span className="inline-flex items-center gap-1.5 px-2.5 py-1 rounded-full bg-[var(--kkb-success-light)] text-[var(--kkb-success)] text-kkb-label">
                <span className="h-1.5 w-1.5 rounded-full bg-[var(--kkb-success)]" />
                Harmonie familiale {agreementPct}%
              </span>
            )}
          </div>
          <h1 className="text-h1 text-[var(--kkb-text-primary)] text-3xl flex items-center gap-2">
            Bonjour{firstName ? ` ${firstName}` : ''} <Hand className="h-7 w-7 text-[var(--kkb-coral)]" />
          </h1>
          <p className="text-kkb-body text-base text-[var(--kkb-text-secondary)] max-w-xl">
            Prête pour une nouvelle semaine gourmande et sereine ?
          </p>
        </div>
        <div className="flex items-center gap-3 shrink-0">
          <button
            type="button"
            onClick={() => router.push('/plan/configure')}
            className="h-12 px-4 rounded-lg bg-white hover:bg-[var(--kkb-bg)] text-[var(--kkb-text-primary)] text-btn-secondary flex items-center gap-2 shadow-sm transition-colors"
          >
            <Settings className="h-5 w-5 text-[var(--kkb-teal)]" /> Ajuster préférences
          </button>
          <button
            type="button"
            onClick={() => router.push('/plan?generate=1')}
            className="h-12 px-6 rounded-lg bg-[var(--kkb-coral)] hover:bg-[var(--kkb-coral-hover)] text-white text-btn-primary flex items-center gap-2 shadow-md transition-all active:scale-95"
          >
            <Zap className="h-5 w-5" /> Générer ma semaine
          </button>
        </div>
      </section>

      {isMember && <div className="pb-8 max-w-xl"><MemberResultsCard /></div>}

      <div className="grid grid-cols-1 lg:grid-cols-12 gap-8 items-start">
        <div className="lg:col-span-8 flex flex-col gap-10 min-w-0">
          <section className="flex flex-col gap-5">
            <div className="flex items-center justify-between">
              <h2 className="text-h2 text-[var(--kkb-text-primary)] flex items-center gap-2">
                <UtensilsCrossed className="h-5 w-5 text-[var(--kkb-coral)]" />
                {isToday ? "Au menu aujourd'hui" : `Au menu — ${dayOpt.full}`}
              </h2>
              <span className="text-[10px] font-quicksand font-bold px-2.5 py-1 rounded-full bg-[var(--kkb-coral-light)] text-[var(--kkb-coral)] uppercase">
                {dayBadge}
              </span>
            </div>
            {mealCardsContent}
          </section>

          {upcomingGridDays.length > 0 && (
            <section className="flex flex-col gap-4">
              <div className="flex items-center justify-between">
                <h2 className="text-h2 text-[var(--kkb-text-primary)]">Aperçu des jours à venir</h2>
                <button type="button" onClick={goToPlan} className="text-sm font-quicksand text-[var(--kkb-coral)] flex items-center gap-1">
                  Planning complet →
                </button>
              </div>
              <UpcomingGrid days={upcomingGridDays} />
            </section>
          )}
        </div>

        <div className="lg:col-span-4 flex flex-col gap-6">
          <HarmonyWidget
            respondentCount={surveyResults?.respondent_count ?? 0}
            memberCount={memberCount}
            agreementPct={agreementPct}
            planId={plan?.id ?? null}
          />
          {communityTip && (
            <TipCard recipeId={communityTip.id} recipeName={communityTip.name} tip={communityTip.description} />
          )}
        </div>
      </div>
    </div>
    </>
  )
}

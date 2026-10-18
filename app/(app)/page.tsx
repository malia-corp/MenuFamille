'use client'

import { useEffect, useMemo, useState } from 'react'
import { useRouter } from 'next/navigation'
import { ChevronRight, CupSoda, Salad, Settings, SlidersHorizontal, UtensilsCrossed, Zap } from 'lucide-react'
import { DAY_OPTIONS, getMondayISO, formatWeekRange, dayOfWeekFromDate, type DayOfWeek } from '@/lib/utils/week'
import { type MealType } from '@/lib/constants/meal-type'
import { sortByMealType } from '@/lib/utils/sort-meal-configs'
import { agreementPct as agreementOf, sumCounts } from '@/lib/utils/survey-score'
import { HomeHero } from '@/components/home/home-hero'
import { DayTimeline, type TimelineChip, type TimelineEntry } from '@/components/home/day-timeline'
import { FamilyPulseCard } from '@/components/home/family-pulse-card'
import { UpcomingList, type UpcomingListDay } from '@/components/home/upcoming-list'
import { MemberHome } from '@/components/home/member-home'
import { TipCard } from '@/components/home/tip-card'
import { EmptyState } from '@/components/ui/empty-state'
import { HomeSkeleton } from '@/components/home/home-skeleton'
import { pickActiveCircle } from '@/lib/utils/active-circle'

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

function toChips(compositions: Composition[]): TimelineChip[] {
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

      const circle = pickActiveCircle<{ id: string; my_role: string; family_circle_members?: unknown[] }>(circlesRes)
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
  const dayLong = selectedDate.toLocaleDateString('fr-FR', { weekday: 'long', day: 'numeric', month: 'long' })

  const lunchConfig  = activeConfigs.find(c => c.meal_type === 'dejeuner')
  const dinnerConfig = activeConfigs.find(c => c.meal_type === 'diner')

  function agreementForDay(day: DayOfWeek): number | null {
    if (!surveyResults) return null
    return agreementOf(sumCounts(surveyResults.items.filter(i => i.day_of_week === day)))
  }

  // Les trois jours suivants (midi et soir), à partir d'aujourd'hui.
  const upcomingDays: UpcomingListDay[] = useMemo(() => {
    if (!plan) return []
    const todayIdx = DAY_OPTIONS.findIndex(d => d.val === today)
    const out: UpcomingListDay[] = []
    for (let i = 1; i <= 3; i++) {
      const idx = (todayIdx + i) % 7
      const opt = DAY_OPTIONS[idx]
      const d = new Date(weekStart + 'T00:00:00')
      d.setDate(d.getDate() + idx)
      out.push({
        key:          opt.val,
        dayShort:     opt.label,
        dayNum:       d.getDate(),
        lunchTitle:   lunchConfig  ? getItemForDay(lunchConfig, opt.val)?.recipes?.name ?? null  : null,
        dinnerTitle:  dinnerConfig ? getItemForDay(dinnerConfig, opt.val)?.recipes?.name ?? null : null,
        agreementPct: agreementForDay(opt.val),
      })
    }
    return out
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [plan, lunchConfig, dinnerConfig, today, weekStart, surveyResults])

  // Cases repas x jours remplies cette semaine (un repas « modèle » compte
  // pour les 7 jours).
  const plannedCount = useMemo(
    () => activeConfigs.reduce(
      (n, config) => n + DAY_OPTIONS.filter(d => getItemForDay(config, d.val)?.recipes).length,
      0
    ),
    // eslint-disable-next-line react-hooks/exhaustive-deps
    [activeConfigs, plan]
  )

  const timelineEntries: TimelineEntry[] = useMemo(() => {
    const now = new Date()
    const nowHHMM = `${String(now.getHours()).padStart(2, '0')}:${String(now.getMinutes()).padStart(2, '0')}`
    const next = isToday
      ? activeConfigs.find(c => c.default_time && c.default_time.slice(0, 5) > nowHHMM)?.meal_type
      : undefined
    return activeConfigs.map(config => {
      const item = getItemForDay(config, selectedDay)
      return {
        mealType: config.meal_type,
        time:     config.default_time ? formatTime(config.default_time) : null,
        isNext:   config.meal_type === next,
        meal: item?.recipes
          ? {
              title:       item.recipes.name,
              photoUrl:    item.recipes.photo_url,
              prepTimeMin: item.recipes.prep_time_min,
              servings:    item.servings || null,
              chips:       toChips(item.meal_compositions),
            }
          : null,
      }
    })
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [activeConfigs, plan, selectedDay, isToday])

  // Avis de la famille sur toute la semaine.
  const weekAgreementPct = useMemo(
    () => (surveyResults?.items.length ? agreementOf(sumCounts(surveyResults.items)) : null),
    [surveyResults]
  )

  function goToPlan() { router.push('/plan') }

  const hasAnyItem = (plan?.meal_plan_items.length ?? 0) > 0

  if (loading) return <HomeSkeleton />

  // Membre (ne planifie pas) : accueil dédié sur le menu de la famille.
  if (isMember) return <MemberHome firstName={firstName} />

  // Un seul bouton orange par vue : « Générer ma semaine » vit dans le
  // bandeau sur desktop, dans le bouton flottant (FAB) sur mobile.
  const heroActions = (
    <div className="hidden shrink-0 items-center gap-2 lg:flex">
      <button
        type="button"
        onClick={() => router.push('/settings/meal-config')}
        aria-label="Rythme des repas"
        title="Rythme des repas"
        className="flex h-12 min-w-12 items-center justify-center gap-2 rounded-full bg-white/10 px-3.5 font-quicksand text-sm font-semibold text-[var(--kkb-creme)] transition-colors hover:bg-white/20 xl:px-4"
      >
        <SlidersHorizontal className="h-4 w-4" /> <span className="hidden xl:inline">Rythme des repas</span>
      </button>
      <button
        type="button"
        onClick={() => router.push('/plan?generate=1')}
        className="flex h-12 items-center gap-2 rounded-full bg-[var(--kkb-coral)] px-5 text-btn-primary text-white transition-colors hover:bg-[var(--kkb-coral-hover)] active:scale-95"
      >
        <Zap className="h-5 w-5" /> Générer ma semaine
      </button>
    </div>
  )

  return (
    <div className="mx-auto max-w-sm px-4 pt-2 pb-8 lg:max-w-none lg:px-[var(--kkb-gutter)] lg:pt-0">
      <div className="space-y-6 lg:grid lg:grid-cols-12 lg:items-start lg:gap-6 lg:space-y-0">
        {/* ─── Colonne principale ─────────────────────────────────────────── */}
        <div className="space-y-6 lg:col-span-8">
          <HomeHero
            firstName={firstName}
            title={isToday
              ? <>On mange quoi<br className="lg:hidden" /> aujourd’hui&nbsp;?</>
              : <>Au menu<br className="lg:hidden" /> {dayOpt.full.toLowerCase()}</>}
            weekLabel={formatWeekRange(weekStart)}
            weekStart={weekStart}
            selectedDay={selectedDay}
            onSelectDay={setSelectedDay}
            plannedCount={plannedCount}
            slotCount={activeConfigs.length * 7}
            respondentCount={plan?.share_token ? (surveyResults?.respondent_count ?? 0) : null}
            memberCount={memberCount}
            actions={heroActions}
          />

          {/* Repas du jour sélectionné, sur une ligne de temps */}
          <section className="space-y-3">
            <div className="flex items-center justify-between gap-2 px-1">
              <h2 className="text-h2 text-[var(--kkb-profond)] first-letter:uppercase">
                {isToday ? 'Aujourd’hui' : dayLong}
              </h2>
              <button
                type="button"
                onClick={() => router.push('/settings/meal-config')}
                className="-mr-2 flex h-11 items-center gap-1.5 px-2 font-quicksand text-sm font-bold text-[var(--kkb-foret)] lg:hidden"
              >
                <SlidersHorizontal className="h-4 w-4" /> Horaires
              </button>
              <button
                type="button"
                onClick={goToPlan}
                className="-mr-2 hidden h-11 items-center gap-0.5 px-2 font-quicksand text-sm font-bold text-[var(--kkb-foret)] lg:flex"
              >
                Menu de la semaine <ChevronRight className="h-4 w-4" />
              </button>
            </div>

            {!hasAnyItem ? (
              <div className="rounded-[var(--kkb-r-xl)] border-[1.5px] border-dashed border-[var(--kkb-filet)]">
                <EmptyState
                  icon={UtensilsCrossed}
                  title="Pas encore de menu cette semaine"
                  description="Appuie sur « Générer ma semaine » : le menu de la famille est prêt en un clic."
                  className="py-8"
                />
              </div>
            ) : activeConfigs.length === 0 ? (
              <div className="rounded-[var(--kkb-r-xl)] border-[1.5px] border-dashed border-[var(--kkb-filet)]">
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
              <DayTimeline entries={timelineEntries} onOpen={goToPlan} />
            )}
          </section>

          {/* Emplacement d'ancrage du FAB, mobile (cf. components/layout/fab.tsx) */}
          <div id="generate-slot" className="min-h-[48px] lg:hidden" />
        </div>

        {/* ─── Colonne latérale ───────────────────────────────────────────── */}
        <aside className="space-y-6 lg:col-span-4">
          <FamilyPulseCard
            planId={plan?.id ?? null}
            shareToken={plan?.share_token ?? null}
            onShareToken={(token) => setPlan((p) => (p ? { ...p, share_token: token } : p))}
            respondentCount={surveyResults?.respondent_count ?? 0}
            memberCount={memberCount}
            agreementPct={weekAgreementPct}
          />

          {upcomingDays.length > 0 && (
            <section className="space-y-3">
              <div className="flex items-center justify-between px-1">
                <h2 className="text-h2 text-[var(--kkb-profond)]">À venir</h2>
                <button
                  type="button"
                  onClick={goToPlan}
                  className="-mr-2 flex h-11 items-center gap-0.5 px-2 font-quicksand text-sm font-bold text-[var(--kkb-foret)]"
                >
                  Tout voir <ChevronRight className="h-4 w-4" />
                </button>
              </div>
              <UpcomingList days={upcomingDays} onOpen={goToPlan} />
            </section>
          )}

          {communityTip && (
            <TipCard recipeId={communityTip.id} recipeName={communityTip.name} tip={communityTip.description} />
          )}
        </aside>
      </div>
    </div>
  )
}

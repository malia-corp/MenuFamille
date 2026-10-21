import { useCallback, useMemo, useState } from 'react'
import { Pressable, View } from 'react-native'
import { router } from 'expo-router'
import { ChevronRight, CupSoda, MessageCircleHeart, Salad, Settings, SlidersHorizontal, UtensilsCrossed, Zap } from 'lucide-react-native'
import { Bone, Button, EmptyState, Hero, Screen, Txt, useReloadOnFocus } from '@/components/ui'
import { DayTimeline, FamilyPulseCard, TipCard, UpcomingList, WeekDayPicker, type TimelineChip, type TimelineEntry, type UpcomingDay } from '@/components/home/HomeBlocks'
import { MemberHome } from '@/components/home/MemberHome'
import { get, request } from '@/lib/api'
import { useSession } from '@/lib/session'
import { pickActiveCircle } from '@/shared/active-circle'
import { sortByMealType } from '@/shared/sort-meal-configs'
import { agreementPct as agreementOf, sumCounts } from '@/shared/survey-score'
import { surveyLinkPayload } from '@/shared/share'
import { DAY_OPTIONS, dayOfWeekFromDate, formatWeekRange, getMondayISO, type DayOfWeek } from '@/shared/week'
import { capitalize, dayLong } from '@/shared/fr-date'
import type { MealType } from '@/shared/meal-type'
import { C, F, R } from '@/theme'

interface Composition { id: string; role: string; sort_order: number; recipe_id: string; recipes: { id: string; name: string } | null }
interface PlanItem {
  id: string; day_of_week: DayOfWeek; meal_type: MealType; applies_all_days: boolean; servings: number
  recipes: { id: string; name: string; photo_url: string | null; prep_time_min: number | null } | null
  meal_compositions: Composition[]
}
interface Plan { id: string; week_start: string; status: string; share_token: string | null; meal_plan_items: PlanItem[] }
interface MealConfig { meal_type: MealType; is_active: boolean; mode: 'daily' | 'template'; display_order: number; default_time: string | null }
interface SurveyResults { respondent_count: number; items: { id: string; day_of_week: DayOfWeek; aime: number; bof: number; naime_pas: number }[] }

const formatTime = (hhmm: string | null) => (hhmm ? hhmm.slice(0, 5).replace(':', 'h') : '')

function toChips(compositions: Composition[]): TimelineChip[] {
  return compositions.slice().sort((a, b) => a.sort_order - b.sort_order)
    .filter((c): c is Composition & { recipes: { id: string; name: string } } => !!c.recipes)
    .map(c => ({ icon: c.role === 'drink' ? CupSoda : c.role === 'side' ? Salad : UtensilsCrossed, name: c.recipes.name }))
}

// Accueil (cf. app/(app)/page.tsx) : planificatrice → bandeau, journée,
// avis de la famille, jours à venir, astuce ; membre → MemberHome.
export default function HomeScreen() {
  const role = useSession(s => s.role)
  const [firstName, setFirstName] = useState('')
  const [configs, setConfigs] = useState<MealConfig[]>([])
  const [plan, setPlan] = useState<Plan | null>(null)
  const [memberCount, setMemberCount] = useState(1)
  const [isMember, setIsMember] = useState(role === 'membre')
  const [survey, setSurvey] = useState<SurveyResults | null>(null)
  const [tip, setTip] = useState<{ id: string; name: string; description: string } | null>(null)
  const [loading, setLoading] = useState(true)

  const weekStart = useMemo(() => getMondayISO(), [])
  const today = useMemo(() => dayOfWeekFromDate(new Date()), [])
  const [selectedDay, setSelectedDay] = useState<DayOfWeek>(today)

  const load = useCallback(async () => {
    const [me, cfg, p, circles, recipes] = await Promise.all([
      get<{ display_name: string | null }>('/api/users/me'),
      get<MealConfig[]>('/api/users/me/meal-config'),
      get<Plan>(`/api/meal-plans?week=${weekStart}`),
      get<Parameters<typeof pickActiveCircle>[0]>('/api/circles'),
      get<{ id: string; name: string; description?: string | null }[]>('/api/recipes?scope=communaute'),
    ])
    setFirstName(me?.display_name?.split(' ')[0] ?? '')
    setConfigs(Array.isArray(cfg) ? cfg : [])
    setPlan(p?.id ? p : null)
    const circle = pickActiveCircle<{ id: string; my_role: string; family_circle_members?: unknown[] }>(circles as never)
    setMemberCount(circle?.family_circle_members?.length ?? 1)
    setIsMember(circle?.my_role === 'membre')
    // Astuce du jour : rotation déterministe parmi les recettes communautaires décrites.
    const pool = (Array.isArray(recipes) ? recipes : []).filter(r => r.description?.trim())
    if (pool.length) {
      const pick = pool[Math.floor(Date.now() / 86_400_000) % pool.length]
      setTip({ id: pick.id, name: pick.name, description: pick.description! })
    }
    setSurvey(p?.share_token ? await get<SurveyResults>(`/api/meal-plans/${p.id}/survey-results`) : null)
    setLoading(false)
  }, [weekStart])
  useReloadOnFocus(load)

  const active = useMemo(() => sortByMealType(configs.filter(c => c.is_active)), [configs])

  const itemFor = useCallback((config: MealConfig, day: DayOfWeek): PlanItem | undefined => {
    if (!plan) return undefined
    return config.mode === 'template'
      ? plan.meal_plan_items.find(i => i.meal_type === config.meal_type && i.applies_all_days)
      : plan.meal_plan_items.find(i => i.meal_type === config.meal_type && i.day_of_week === day && !i.applies_all_days)
  }, [plan])

  const isToday = selectedDay === today
  const dayOpt = DAY_OPTIONS.find(d => d.val === selectedDay)!
  const selectedIdx = DAY_OPTIONS.findIndex(d => d.val === selectedDay)
  const selectedDate = new Date(weekStart + 'T00:00:00'); selectedDate.setDate(selectedDate.getDate() + selectedIdx)

  const agreementForDay = (day: DayOfWeek) => survey ? agreementOf(sumCounts(survey.items.filter(i => i.day_of_week === day))) : null
  const lunch = active.find(c => c.meal_type === 'dejeuner')
  const dinner = active.find(c => c.meal_type === 'diner')

  const upcoming: UpcomingDay[] = useMemo(() => {
    if (!plan) return []
    const todayIdx = DAY_OPTIONS.findIndex(d => d.val === today)
    return [1, 2, 3].map(i => {
      const idx = (todayIdx + i) % 7
      const opt = DAY_OPTIONS[idx]
      const d = new Date(weekStart + 'T00:00:00'); d.setDate(d.getDate() + idx)
      return {
        key: opt.val, dayShort: opt.label, dayNum: d.getDate(),
        lunchTitle: lunch ? itemFor(lunch, opt.val)?.recipes?.name ?? null : null,
        dinnerTitle: dinner ? itemFor(dinner, opt.val)?.recipes?.name ?? null : null,
        agreementPct: agreementForDay(opt.val),
      }
    })
  }, [plan, lunch, dinner, today, weekStart, survey, itemFor]) // eslint-disable-line react-hooks/exhaustive-deps

  const planned = active.reduce((n, c) => n + DAY_OPTIONS.filter(d => itemFor(c, d.val)?.recipes).length, 0)

  const entries: TimelineEntry[] = useMemo(() => {
    const now = new Date()
    const hhmm = `${String(now.getHours()).padStart(2, '0')}:${String(now.getMinutes()).padStart(2, '0')}`
    const next = isToday ? active.find(c => c.default_time && c.default_time.slice(0, 5) > hhmm)?.meal_type : undefined
    return active.map(config => {
      const item = itemFor(config, selectedDay)
      return {
        mealType: config.meal_type,
        time: config.default_time ? formatTime(config.default_time) : null,
        isNext: config.meal_type === next,
        meal: item?.recipes ? {
          title: item.recipes.name, photoUrl: item.recipes.photo_url, prepTimeMin: item.recipes.prep_time_min,
          servings: item.servings || null, chips: toChips(item.meal_compositions),
        } : null,
      }
    })
  }, [active, selectedDay, isToday, itemFor])

  const weekAgreement = survey?.items.length ? agreementOf(sumCounts(survey.items)) : null

  async function sharePayload() {
    let token = plan?.share_token ?? null
    if (!token && plan) {
      const res = await request<{ share_token: string }>(`/api/meal-plans/${plan.id}/share`, { method: 'POST' }).catch(() => null)
      if (res?.ok && res.data?.share_token) {
        token = res.data.share_token
        setPlan(p => (p ? { ...p, share_token: token } : p))
      }
    }
    return token ? surveyLinkPayload(token) : null
  }

  if (isMember) return <MemberHome firstName={firstName} />

  if (loading) {
    return (
      <Screen>
        <Bone style={{ height: 300, borderRadius: R.xl }} />
        <Bone style={{ height: 24, width: 140 }} />
        <Bone style={{ height: 80, borderRadius: R.lg }} />
        <Bone style={{ height: 80, borderRadius: R.lg }} />
      </Screen>
    )
  }

  const goToPlan = () => router.push('/plan')
  const hasAnyItem = (plan?.meal_plan_items.length ?? 0) > 0
  const respondents = plan?.share_token ? (survey?.respondent_count ?? 0) : null

  return (
    <Screen onRefresh={load}>
      <Hero style={{ padding: 16, paddingTop: 20 }}>
        <View style={{ paddingHorizontal: 4 }}>
          <Txt style={{ fontFamily: F.bodyMedium, fontSize: 15, color: C.foret100 }}>Bonjour{firstName ? `, ${firstName}` : ''}</Txt>
          <Txt variant="h1" color={C.creme} style={{ marginTop: 2 }}>
            {isToday ? 'On mange quoi\naujourd’hui ?' : `Au menu\n${dayOpt.full.toLowerCase()}`}
          </Txt>
          <Txt style={{ marginTop: 12, fontFamily: F.bodySemi, fontSize: 14, color: C.foret100 }}>Semaine du {formatWeekRange(weekStart)}</Txt>
        </View>
        <View style={{ marginTop: 8 }}>
          <WeekDayPicker weekStart={weekStart} selected={selectedDay} onSelect={setSelectedDay} onDark />
        </View>
        <View style={{ marginTop: 12, flexDirection: 'row', gap: 8 }}>
          <View style={{ flex: 1, borderRadius: R.md, backgroundColor: C.white10, paddingHorizontal: 12, paddingVertical: 10 }}>
            <View style={{ flexDirection: 'row', alignItems: 'center', gap: 6 }}>
              <UtensilsCrossed size={14} color={C.sauge} />
              <Txt variant="meta" color={C.foret100}>Repas planifiés</Txt>
            </View>
            <Txt style={{ marginTop: 2, fontFamily: F.title, fontSize: 20, color: C.creme }}>
              {planned}<Txt style={{ fontFamily: F.bodyBold, fontSize: 14, color: C.foret100 }}>/{active.length * 7}</Txt>
            </Txt>
          </View>
          <View style={{ flex: 1, borderRadius: R.md, backgroundColor: C.white10, paddingHorizontal: 12, paddingVertical: 10 }}>
            <View style={{ flexDirection: 'row', alignItems: 'center', gap: 6 }}>
              <MessageCircleHeart size={14} color={C.jaune} />
              <Txt variant="meta" color={C.foret100}>Avis de la famille</Txt>
            </View>
            {respondents === null
              ? <Txt style={{ marginTop: 4, fontFamily: F.bodySemi, fontSize: 15, color: C.foret100 }}>À demander</Txt>
              : <Txt style={{ marginTop: 2, fontFamily: F.title, fontSize: 20, color: C.creme }}>{respondents}<Txt style={{ fontFamily: F.bodyBold, fontSize: 14, color: C.foret100 }}>/{memberCount}</Txt></Txt>}
          </View>
        </View>
        {/* Un seul bouton orange par vue : « Générer ma semaine » vit dans le bandeau. */}
        <Button label="Générer ma semaine" icon={Zap} tone="orange" size="lg" full style={{ marginTop: 14 }}
          onPress={() => router.push({ pathname: '/plan', params: { generate: '1' } })} />
      </Hero>

      <View style={{ gap: 12 }}>
        <View style={{ flexDirection: 'row', alignItems: 'center', justifyContent: 'space-between', paddingHorizontal: 4 }}>
          <Txt variant="h2" color={C.profond}>{isToday ? 'Aujourd’hui' : capitalize(dayLong(selectedDate))}</Txt>
          <Pressable onPress={() => router.push('/settings/meal-config')} accessibilityRole="button"
            style={{ height: 44, flexDirection: 'row', alignItems: 'center', gap: 6 }}>
            <SlidersHorizontal size={16} color={C.foret} />
            <Txt variant="bodyBold" color={C.foret} style={{ fontSize: 14 }}>Horaires</Txt>
          </Pressable>
        </View>
        {!hasAnyItem ? (
          <View style={{ borderRadius: R.xl, borderWidth: 1.5, borderStyle: 'dashed', borderColor: C.filet }}>
            <EmptyState icon={UtensilsCrossed} title="Pas encore de menu cette semaine"
              description="Appuie sur « Générer ma semaine » : le menu de la famille est prêt en un clic." />
          </View>
        ) : active.length === 0 ? (
          <View style={{ borderRadius: R.xl, borderWidth: 1.5, borderStyle: 'dashed', borderColor: C.filet }}>
            <EmptyState icon={Settings} title="Aucun repas activé" description="Choisis les repas à planifier pour ta famille."
              action={<Button label="Régler le rythme des repas" tone="ghost" onPress={() => router.push('/settings/meal-config')} />} />
          </View>
        ) : (
          <DayTimeline entries={entries} onOpen={goToPlan} />
        )}
      </View>

      <FamilyPulseCard
        planId={plan?.id ?? null}
        shareToken={plan?.share_token ?? null}
        respondentCount={survey?.respondent_count ?? 0}
        memberCount={memberCount}
        agreementPct={weekAgreement}
        sharePayload={sharePayload}
        onOpenResults={() => plan && router.push({ pathname: '/votes/results', params: { plan: plan.id } })}
      />

      {upcoming.length > 0 && (
        <View style={{ gap: 12 }}>
          <View style={{ flexDirection: 'row', alignItems: 'center', justifyContent: 'space-between', paddingHorizontal: 4 }}>
            <Txt variant="h2" color={C.profond}>À venir</Txt>
            <Pressable onPress={goToPlan} style={{ height: 44, flexDirection: 'row', alignItems: 'center', gap: 2 }}>
              <Txt variant="bodyBold" color={C.foret} style={{ fontSize: 14 }}>Tout voir</Txt>
              <ChevronRight size={16} color={C.foret} />
            </Pressable>
          </View>
          <UpcomingList days={upcoming} onOpen={goToPlan} />
        </View>
      )}

      {tip && <TipCard recipeId={tip.id} recipeName={tip.name} tip={tip.description} />}
    </Screen>
  )
}

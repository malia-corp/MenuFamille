import { useCallback, useEffect, useState } from 'react'
import { Image, Pressable, View } from 'react-native'
import { router, useLocalSearchParams } from 'expo-router'
import { AlertTriangle, ArrowLeft, BarChart3, CalendarDays, Check, CheckCircle2, ChevronDown, Link2, ListChecks, Plus } from 'lucide-react-native'
import { Bone, Button, EmptyState, MealTile, MealTypeIcon, Screen, Segmented, ShareActions, Txt } from '@/components/ui'
import { get, request } from '@/lib/api'
import { WEB_URL } from '@/lib/env'
import { surveyLinkPayload } from '@/shared/share'
import { MEAL_COLOR, MEAL_LABEL, type MealType } from '@/shared/meal-type'
import { DAY_OPTIONS, formatWeekRange, type DayOfWeek } from '@/shared/week'
import { sortByMealType } from '@/shared/sort-meal-configs'
import { countFilledSlots, isDayComplete } from '@/shared/plan-progress'
import { C, F, R } from '@/theme'

interface MealConfig { meal_type: MealType; is_active: boolean; mode: 'daily' | 'template'; display_order: number }
interface Warning { member_display_name: string; allergen: string }
interface PlanItem {
  id: string; day_of_week: DayOfWeek; meal_type: MealType; applies_all_days: boolean; servings: number
  recipes: { name: string; photo_url: string | null; prep_time_min: number | null } | null
  meal_compositions: { role: 'side' | 'drink'; sort_order: number; recipes: { name: string } | null }[]
  allergy_warnings?: Warning[]
}
interface Plan { id: string; week_start: string; status: string; share_token: string | null; meal_plan_items: PlanItem[] }

const MONTHS = ['janvier', 'février', 'mars', 'avril', 'mai', 'juin', 'juillet', 'août', 'septembre', 'octobre', 'novembre', 'décembre']

function extras(item: PlanItem | null): string[] {
  return (item?.meal_compositions ?? []).slice().sort((a, b) => a.sort_order - b.sort_order).map(c => c.recipes?.name).filter((n): n is string => !!n)
}

function Thumb({ mealType, item, w, h }: { mealType: MealType; item: PlanItem | null; w: number | `${number}%`; h: number }) {
  const color = MEAL_COLOR[mealType]
  return (
    <View style={{ width: w, height: h, borderRadius: R.md, overflow: 'hidden', backgroundColor: item?.recipes ? color.bg : C.creme, alignItems: 'center', justifyContent: 'center' }}>
      {item?.recipes?.photo_url
        ? <Image source={{ uri: item.recipes.photo_url }} style={{ position: 'absolute', top: 0, left: 0, right: 0, bottom: 0 }} resizeMode="cover" />
        : <MealTypeIcon type={mealType} size={20} color={item?.recipes ? color.text : C.texte2} />}
    </View>
  )
}

function Warnings({ list }: { list?: Warning[] }) {
  if (!list?.length) return null
  return (
    <View style={{ flexDirection: 'row', flexWrap: 'wrap', gap: 4 }}>
      {list.map((w, i) => (
        <View key={i} style={{ flexDirection: 'row', alignItems: 'center', gap: 4, borderRadius: R.pill, backgroundColor: C.dangerLight, paddingHorizontal: 8, paddingVertical: 2 }}>
          <AlertTriangle size={11} color={C.danger} />
          <Txt style={{ fontFamily: F.bodyBold, fontSize: 11, color: C.danger }}>{w.member_display_name} · {w.allergen}</Txt>
        </View>
      ))}
    </View>
  )
}

function CountBadge({ filled, total }: { filled: number; total: number }) {
  const done = filled === total
  return (
    <View style={{ flexDirection: 'row', alignItems: 'center', gap: 3, borderRadius: R.pill, paddingHorizontal: 10, paddingVertical: 2, backgroundColor: done ? C.sauge50 : C.jaune50 }}>
      {done && <Check size={12} color={C.foret500} />}
      <Txt style={{ fontFamily: F.bodyBold, fontSize: 12, color: done ? C.foret500 : C.jauneText }}>{filled}/{total}</Txt>
    </View>
  )
}

// Validation du menu et partage du sondage (cf. app/(app)/plan/validate/page.tsx).
export default function ValidateScreen() {
  const { week } = useLocalSearchParams<{ week?: string }>()
  const [plan, setPlan] = useState<Plan | null>(null)
  const [configs, setConfigs] = useState<MealConfig[]>([])
  const [loading, setLoading] = useState(true)
  const [apiError, setApiError] = useState<string | null>(null)
  const [validating, setValidating] = useState(false)
  const [validated, setValidated] = useState(false)
  const [shareToken, setShareToken] = useState<string | null>(null)
  const [surveyCount, setSurveyCount] = useState<number | null>(null)
  const [openType, setOpenType] = useState<MealType | null>(null)
  const [openDay, setOpenDay] = useState<DayOfWeek | null>('lundi')
  const [mode, setMode] = useState<'day' | 'type'>('day')

  const fetchSurveyCount = useCallback(async (planId: string) => {
    const d = await get<{ total_respondents?: number; respondent_count?: number }>(`/api/meal-plans/${planId}/survey-results`)
    if (d) setSurveyCount(d.total_respondents ?? d.respondent_count ?? 0)
  }, [])

  const load = useCallback(async () => {
    if (!week) return
    setLoading(true)
    try {
      const [p, cfg] = await Promise.all([request<Plan>(`/api/meal-plans?week=${week}`), get<MealConfig[]>('/api/users/me/meal-config')])
      const active = sortByMealType((Array.isArray(cfg) ? cfg : []).filter(c => c.is_active))
      setConfigs(active)
      setOpenType(active[0]?.meal_type ?? null)
      if (p.ok && p.data?.id && Array.isArray(p.data.meal_plan_items)) {
        const data = p.data
        setPlan(data)
        setOpenDay(DAY_OPTIONS.find(d => !isDayComplete(active, data.meal_plan_items, d.val))?.val ?? 'lundi')
        if (data.status === 'finalized' || data.status === 'shared') setValidated(true)
        if (data.share_token) { setShareToken(data.share_token); void fetchSurveyCount(data.id) }
      } else {
        setPlan(null)
        if (!p.ok) setApiError('Impossible de charger le planning de cette semaine')
      }
    } catch {
      setApiError('Impossible de charger le planning')
    } finally {
      setLoading(false)
    }
  }, [week, fetchSurveyCount])

  useEffect(() => {
    if (!week) { router.replace('/plan'); return }
    void load()
  }, [week, load])

  async function validate() {
    if (!plan || validating) return
    setValidating(true)
    const res = await request(`/api/meal-plans/${plan.id}/validate`, { method: 'POST' }).catch(() => null)
    if (res?.ok) setValidated(true)
    else setApiError('Erreur lors de la validation')
    setValidating(false)
  }

  // Le lien est créé à la demande : Partager et Copier n'attendent pas « Valider ».
  async function sharePayload() {
    let token = shareToken
    if (!token && plan) {
      const res = await request<{ share_token: string }>(`/api/meal-plans/${plan.id}/share`, { method: 'POST' }).catch(() => null)
      if (res?.ok && res.data?.share_token) {
        token = res.data.share_token
        setShareToken(token)
        void fetchSurveyCount(plan.id)
      }
    }
    return token ? surveyLinkPayload(token) : null
  }

  const backToPlan = (extra: Record<string, string> = {}) => router.navigate({ pathname: '/plan', params: { week: plan?.week_start ?? week ?? '', ...extra } })

  if (loading) {
    return (
      <Screen header={false} withTabBar={false}>
        <Bone style={{ height: 260, borderRadius: R.xl }} />
        <Bone style={{ height: 44, width: 220, borderRadius: R.pill }} />
        <Bone style={{ height: 120, borderRadius: R.xl }} />
        <Bone style={{ height: 60, borderRadius: R.xl }} />
      </Screen>
    )
  }

  if (!plan) {
    return (
      <Screen header={false} withTabBar={false}>
        <View style={{ borderRadius: R.xl, backgroundColor: '#FFFFFF' }}>
          <EmptyState icon={CalendarDays} title="Aucun menu à valider" description={apiError ?? 'Planifie d’abord les repas de cette semaine.'}
            action={<Button label="Aller au menu" tone="foret" onPress={() => backToPlan()} />} />
        </View>
      </Screen>
    )
  }

  const { filled, total } = countFilledSlots(configs, plan.meal_plan_items)
  const daysComplete = DAY_OPTIONS.filter(d => isDayComplete(configs, plan.meal_plan_items, d.val)).length
  const servings = plan.meal_plan_items[0]?.servings ?? 4
  const missing = Math.max(0, total - filled)
  const monday = new Date(plan.week_start + 'T00:00:00')
  const warnings = plan.meal_plan_items.flatMap(item => (item.allergy_warnings ?? []).map(w => ({ ...w, item })))
  const shareUrl = shareToken ? `${WEB_URL}/s/${shareToken}`.replace(/^https?:\/\//, '') : null
  const editMeal = (mealType: MealType, day: DayOfWeek) => backToPlan({ day, meal: mealType })
  const dayLabel = (i: number) => {
    const d = new Date(monday); d.setDate(monday.getDate() + i)
    return `${DAY_OPTIONS[i].full} ${d.getDate()} ${MONTHS[d.getMonth()]}`
  }
  const itemFor = (config: MealConfig, day: DayOfWeek) => config.mode === 'template'
    ? plan.meal_plan_items.find(i => i.meal_type === config.meal_type && i.applies_all_days) ?? null
    : plan.meal_plan_items.find(i => i.meal_type === config.meal_type && i.day_of_week === day && !i.applies_all_days) ?? null

  return (
    <Screen header={false} withTabBar={false} onRefresh={load}>
      {/* Bandeau */}
      <View style={{ backgroundColor: C.foret, borderRadius: R.xl, padding: 20 }}>
        <View style={{ flexDirection: 'row', alignItems: 'center', justifyContent: 'space-between' }}>
          <View style={{ flexDirection: 'row', alignItems: 'center', gap: 8 }}>
            <Pressable onPress={() => backToPlan()} accessibilityRole="button"
              style={{ flexDirection: 'row', alignItems: 'center', gap: 6, borderRadius: R.pill, backgroundColor: C.white10, paddingVertical: 4, paddingLeft: 4, paddingRight: 12 }}>
              <View style={{ width: 24, height: 24, borderRadius: R.pill, backgroundColor: C.sauge, alignItems: 'center', justifyContent: 'center' }}><Check size={14} color={C.profond} /></View>
              <Txt style={{ fontFamily: F.bodyBold, fontSize: 12, color: C.creme }}>Planifier</Txt>
            </Pressable>
            <View style={{ width: 16, height: 1, backgroundColor: C.white25 }} />
            <View style={{ flexDirection: 'row', alignItems: 'center', gap: 6, borderRadius: R.pill, backgroundColor: C.creme, paddingVertical: 4, paddingLeft: 4, paddingRight: 12 }}>
              <View style={{ width: 24, height: 24, borderRadius: R.pill, backgroundColor: C.foret, alignItems: 'center', justifyContent: 'center' }}>
                {validated ? <Check size={14} color={C.creme} /> : <Txt style={{ fontFamily: F.bodyBold, fontSize: 11, color: C.creme }}>2</Txt>}
              </View>
              <Txt style={{ fontFamily: F.bodyBold, fontSize: 12, color: C.foret }}>Valider</Txt>
            </View>
          </View>
          <Pressable onPress={() => (router.canGoBack() ? router.back() : backToPlan())} accessibilityRole="button" accessibilityLabel="Retour au menu"
            style={{ width: 40, height: 40, borderRadius: R.pill, backgroundColor: C.white10, alignItems: 'center', justifyContent: 'center' }}>
            <ArrowLeft size={20} color={C.creme} />
          </Pressable>
        </View>
        <Txt style={{ marginTop: 16, fontFamily: F.bodySemi, fontSize: 14, color: C.foret100 }}>Semaine du {formatWeekRange(plan.week_start)}</Txt>
        <Txt variant="h1" color={C.creme} style={{ marginTop: 2 }}>{validated ? 'Ton menu est prêt' : 'Prêt à passer à table ?'}</Txt>
        <Txt variant="small" color={C.foret100} style={{ marginTop: 4, fontSize: 14 }}>
          {validated
            ? 'Il est confirmé pour la semaine. Partage-le pour recueillir l’avis de la famille.'
            : missing === 0
              ? 'Tous les repas sont choisis. Un dernier coup d’œil, puis valide et demande l’avis de la famille.'
              : `${missing} repas ${missing > 1 ? 'restent' : 'reste'} à choisir. Tu peux valider quand même, ou les compléter avant.`}
        </Txt>
        <View style={{ marginTop: 20, flexDirection: 'row', gap: 8 }}>
          {[
            { label: 'Convives', value: String(servings), of: '' },
            { label: 'Jours prêts', value: String(daysComplete), of: '/7' },
            { label: 'Repas', value: String(filled), of: `/${total}` },
          ].map(s => (
            <View key={s.label} style={{ flex: 1, borderRadius: R.md, backgroundColor: C.white10, paddingHorizontal: 12, paddingVertical: 10 }}>
              <Txt variant="meta" color={C.foret100} numberOfLines={1}>{s.label}</Txt>
              <Txt style={{ marginTop: 2, fontFamily: F.title, fontSize: 20, color: C.creme }}>
                {s.value}{!!s.of && <Txt style={{ fontFamily: F.bodyBold, fontSize: 14, color: C.foret100 }}>{s.of}</Txt>}
              </Txt>
            </View>
          ))}
        </View>
      </View>

      {/* Points de vigilance */}
      {warnings.length > 0 && (
        <View style={{ borderRadius: R.xl, borderWidth: 1.5, borderColor: 'rgba(192,57,43,0.3)', backgroundColor: C.dangerLight, padding: 16 }}>
          <View style={{ flexDirection: 'row', alignItems: 'center', gap: 8 }}>
            <AlertTriangle size={16} color={C.danger} />
            <Txt variant="smallBold" color={C.danger} style={{ fontSize: 14 }}>{warnings.length} point{warnings.length > 1 ? 's' : ''} de vigilance</Txt>
          </View>
          <View style={{ marginTop: 8, gap: 4 }}>
            {warnings.map((w, i) => (
              <Txt key={i} style={{ fontSize: 14 }}>
                <Txt variant="bodyBold" style={{ fontSize: 14 }}>{w.item.recipes?.name ?? 'Repas'}</Txt>
                {' '}({MEAL_LABEL[w.item.meal_type]}{w.item.applies_all_days ? ', toute la semaine' : `, ${DAY_OPTIONS.find(d => d.val === w.item.day_of_week)?.full.toLowerCase()}`})
                {' '}contient <Txt variant="bodyBold" style={{ fontSize: 14 }}>{w.allergen}</Txt>, signalé pour {w.member_display_name}.
              </Txt>
            ))}
          </View>
        </View>
      )}

      {/* Le menu, jour par jour ou repas par repas */}
      <View style={{ gap: 12 }}>
        <Segmented<'day' | 'type'> value={mode} onChange={setMode}
          options={[{ value: 'day', label: 'Par jour', icon: CalendarDays }, { value: 'type', label: 'Par repas', icon: ListChecks }]} />
        <Txt variant="small" style={{ textAlign: 'center' }}>Touche un repas pour le changer.</Txt>

        {mode === 'day' ? DAY_OPTIONS.map((d, i) => {
          const rows = configs.map(config => ({ config, item: itemFor(config, d.val) }))
          const dayFilled = rows.filter(r => r.item?.recipes).length
          const warn = rows.reduce((n, r) => n + (r.item?.allergy_warnings?.length ?? 0), 0)
          const open = openDay === d.val
          return (
            <View key={d.val} style={{ borderRadius: R.xl, backgroundColor: '#FFFFFF' }}>
              <Pressable onPress={() => setOpenDay(p => (p === d.val ? null : d.val))} accessibilityRole="button" accessibilityState={{ expanded: open }}
                style={{ flexDirection: 'row', alignItems: 'center', gap: 8, paddingHorizontal: 16, paddingVertical: 14 }}>
                <Txt variant="h3" numberOfLines={1} style={{ flex: 1 }}>{dayLabel(i)}</Txt>
                {warn > 0 && (
                  <View style={{ flexDirection: 'row', alignItems: 'center', gap: 3, borderRadius: R.pill, backgroundColor: C.dangerLight, paddingHorizontal: 8, paddingVertical: 2 }}>
                    <AlertTriangle size={12} color={C.danger} /><Txt style={{ fontFamily: F.bodyBold, fontSize: 12, color: C.danger }}>{warn}</Txt>
                  </View>
                )}
                <CountBadge filled={dayFilled} total={configs.length} />
                <ChevronDown size={16} color={C.texte2} style={{ transform: [{ rotate: open ? '180deg' : '0deg' }] }} />
              </Pressable>
              {open && (
                <View style={{ flexDirection: 'row', flexWrap: 'wrap', gap: 8, paddingHorizontal: 12, paddingBottom: 12 }}>
                  {rows.map(({ config, item }) => {
                    const color = MEAL_COLOR[config.meal_type]
                    const more = extras(item)
                    return (
                      <Pressable key={config.meal_type} onPress={() => editMeal(config.meal_type, d.val)} accessibilityRole="button"
                        accessibilityLabel={`${MEAL_LABEL[config.meal_type]} : ${item?.recipes?.name ?? 'à choisir'}, modifier`}
                        style={{ width: '48%', flexGrow: 1, gap: 8, padding: 6, borderRadius: R.lg, backgroundColor: item?.recipes ? C.creme : 'transparent', borderWidth: item?.recipes ? 0 : 1.5, borderStyle: 'dashed', borderColor: C.filet }}>
                        <Thumb mealType={config.meal_type} item={item} w="100%" h={96} />
                        <View style={{ gap: 4, paddingHorizontal: 4, paddingBottom: 4 }}>
                          <View style={{ flexDirection: 'row', alignItems: 'center', gap: 4 }}>
                            <MealTypeIcon type={config.meal_type} size={12} />
                            <Txt style={{ fontFamily: F.bodyBold, fontSize: 11, color: color.text }}>{MEAL_LABEL[config.meal_type]}</Txt>
                          </View>
                          {item?.recipes
                            ? <Txt numberOfLines={2} style={{ fontFamily: F.bodyBold, fontSize: 13, lineHeight: 16, color: C.profond }}>{item.recipes.name}</Txt>
                            : <View style={{ flexDirection: 'row', alignItems: 'center', gap: 4 }}><Plus size={14} color={C.texte2} /><Txt style={{ fontFamily: F.bodySemi, fontSize: 13, color: C.texte2 }}>À choisir</Txt></View>}
                          {more.length > 0 && <Txt variant="meta" numberOfLines={1}>+ {more.join(', ')}</Txt>}
                          <Warnings list={item?.allergy_warnings} />
                        </View>
                      </Pressable>
                    )
                  })}
                </View>
              )}
            </View>
          )
        }) : configs.map(config => {
          const template = config.mode === 'template'
          const rows = template
            ? [{ label: 'Toute la semaine', day: 'lundi' as DayOfWeek, item: itemFor(config, 'lundi') }]
            : DAY_OPTIONS.map(d => ({ label: d.full, day: d.val, item: itemFor(config, d.val) }))
          const typeFilled = rows.filter(r => r.item?.recipes).length
          const open = openType === config.meal_type
          return (
            <View key={config.meal_type} style={{ borderRadius: R.xl, backgroundColor: '#FFFFFF' }}>
              <Pressable onPress={() => setOpenType(p => (p === config.meal_type ? null : config.meal_type))} accessibilityRole="button" accessibilityState={{ expanded: open }}
                style={{ flexDirection: 'row', alignItems: 'center', gap: 12, paddingHorizontal: 16, paddingVertical: 14 }}>
                <MealTile type={config.meal_type} size={36} />
                <View style={{ flex: 1 }}>
                  <Txt variant="h3">{MEAL_LABEL[config.meal_type]}</Txt>
                  <Txt variant="meta">{template ? 'Le même toute la semaine' : 'Un plat par jour'}</Txt>
                </View>
                <CountBadge filled={typeFilled} total={rows.length} />
                <ChevronDown size={16} color={C.texte2} style={{ transform: [{ rotate: open ? '180deg' : '0deg' }] }} />
              </Pressable>
              {open && (
                <View style={{ paddingHorizontal: 8, paddingBottom: 8 }}>
                  {rows.map(r => {
                    const more = extras(r.item)
                    return (
                      <Pressable key={r.label} onPress={() => editMeal(config.meal_type, r.day)} accessibilityRole="button"
                        style={({ pressed }) => ({ flexDirection: 'row', alignItems: 'center', gap: 12, paddingHorizontal: 8, paddingVertical: 8, borderRadius: R.lg, backgroundColor: pressed ? C.creme : 'transparent' })}>
                        <Txt style={{ width: 80, fontFamily: F.bodyBold, fontSize: 12, color: C.texte2 }}>{r.label}</Txt>
                        <Thumb mealType={config.meal_type} item={r.item} w={56} h={48} />
                        <View style={{ flex: 1, gap: 2 }}>
                          {r.item?.recipes
                            ? <Txt numberOfLines={1} variant="smallBold" style={{ fontSize: 14 }}>{r.item.recipes.name}</Txt>
                            : <Txt variant="small" style={{ fontSize: 14 }}>Pas encore choisi</Txt>}
                          {more.length > 0 && <Txt variant="meta" numberOfLines={1}>+ {more.join(', ')}</Txt>}
                          <Warnings list={r.item?.allergy_warnings} />
                        </View>
                      </Pressable>
                    )
                  })}
                </View>
              )}
            </View>
          )
        })}
      </View>

      {/* Valider et partager */}
      <View style={{ borderRadius: R.xl, backgroundColor: '#FFFFFF', padding: 20, gap: 16 }}>
        {!!apiError && (
          <View accessibilityRole="alert" style={{ borderRadius: R.md, backgroundColor: C.dangerLight, paddingHorizontal: 12, paddingVertical: 8 }}>
            <Txt variant="small" color={C.danger} style={{ fontSize: 14 }}>{apiError}</Txt>
          </View>
        )}
        <View style={{ flexDirection: 'row', alignItems: 'flex-start', gap: 12 }}>
          <View style={{ width: 36, height: 36, borderRadius: R.pill, backgroundColor: validated ? C.sauge : C.foret50, alignItems: 'center', justifyContent: 'center' }}>
            {validated ? <Check size={16} color={C.profond} /> : <Txt style={{ fontFamily: F.title, fontSize: 14, color: C.foret }}>1</Txt>}
          </View>
          <View style={{ flex: 1 }}>
            <Txt variant="h3">{validated ? 'Menu validé' : 'Valide le menu'}</Txt>
            <Txt variant="small" style={{ marginTop: 2, fontSize: 14 }}>
              {validated ? 'Il est confirmé pour la semaine. Tu peux encore le modifier depuis le menu.' : 'Il devient le menu de la semaine et affine les prochaines suggestions.'}
            </Txt>
          </View>
        </View>
        {!validated && <Button label={validating ? 'Validation…' : 'Valider le menu'} icon={CheckCircle2} tone="orange" size="lg" full loading={validating} onPress={() => void validate()} />}

        <View style={{ flexDirection: 'row', alignItems: 'flex-start', gap: 12, paddingTop: 16, borderTopWidth: 1, borderStyle: 'dashed', borderColor: C.filet }}>
          <View style={{ width: 36, height: 36, borderRadius: R.pill, backgroundColor: C.foret50, alignItems: 'center', justifyContent: 'center' }}>
            <Txt style={{ fontFamily: F.title, fontSize: 14, color: C.foret }}>2</Txt>
          </View>
          <View style={{ flex: 1 }}>
            <Txt variant="h3">Demande l’avis de la famille</Txt>
            <Txt variant="small" style={{ marginTop: 2, fontSize: 14 }}>Chacun donne son avis sur les repas, sans compte, en un geste.</Txt>
          </View>
        </View>
        <ShareActions getPayload={sharePayload} />
        {shareUrl && (
          <View style={{ flexDirection: 'row', alignItems: 'center', gap: 6, borderRadius: R.md, backgroundColor: C.creme, paddingHorizontal: 12, paddingVertical: 8 }}>
            <Link2 size={14} color={C.texte2} />
            <Txt variant="meta" numberOfLines={1} style={{ flex: 1 }}>{shareUrl}</Txt>
            <Txt variant="meta">· 7 jours</Txt>
          </View>
        )}
        {surveyCount !== null && surveyCount > 0 && (
          <Pressable onPress={() => router.push({ pathname: '/votes/results', params: { plan: plan.id } })} accessibilityRole="button"
            style={{ height: 44, flexDirection: 'row', alignItems: 'center', justifyContent: 'center', gap: 8, borderRadius: R.pill, backgroundColor: C.sauge50 }}>
            <BarChart3 size={16} color={C.foret} />
            <Txt variant="smallBold" color={C.foret} style={{ fontSize: 14 }}>{surveyCount} avis reçu{surveyCount > 1 ? 's' : ''} · voir les résultats</Txt>
          </Pressable>
        )}
      </View>
    </Screen>
  )
}

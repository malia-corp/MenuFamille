import { useCallback, useState } from 'react'
import { Image, Pressable, ScrollView, View } from 'react-native'
import { router } from 'expo-router'
import { ArrowRight, BarChart3, Check, CheckCircle, ChefHat, Clock, Lock, Users, UtensilsCrossed, Vote } from 'lucide-react-native'
import { Bone, Card, EmptyState, MealTypeIcon, ProgressBar, Screen, Txt, useReloadOnFocus } from '@/components/ui'
import { get } from '@/lib/api'
import { composedName } from '@/shared/composed-name'
import { MEAL_LABEL, MEAL_TYPE_ORDER, type MealType } from '@/shared/meal-type'
import { DAY_OPTIONS, dayOfWeekFromDate, formatWeekRange, getMondayISO, type DayOfWeek } from '@/shared/week'
import { capitalize, dayLong, relativeDay } from '@/shared/fr-date'
import { C, F, R } from '@/theme'

type Rating = 'excellent' | 'correct' | 'decevant'

interface Item {
  id: string
  meal_type: MealType
  day_of_week: DayOfWeek
  applies_all_days: boolean
  recipes: { name: string; photo_url: string | null; description: string | null; prep_time_min: number | null; cook_time_min: number | null } | null
  meal_compositions: { role: string; sort_order: number; recipes: { name: string } | null }[]
}

interface FamilyData {
  role: 'planificatrice' | 'membre' | null
  is_active: boolean
  circle_name: string | null
  planner_name: string | null
  meal_times: Record<string, string>
  plan: { id: string; week_start: string; status: string; share_token: string | null; meal_plan_items: Item[] } | null
}

interface VoteStatus { has_voted: boolean; total_respondents: number; member_count: number; voter_names: string[] }

interface MyFeedback {
  id: string
  rating: Rating
  message: string | null
  created_at: string
  item: { meal_type: MealType; day_of_week: string; recipes: { name: string } | null; meal_compositions: Item['meal_compositions'] }
}

// Émojis de réaction en échappements unicode (cf. CLAUDE.md).
export const RATING_EMOJI: Record<Rating, string> = { excellent: '\u{1F60A}', correct: '\u{1F610}', decevant: '\u{1F615}' }

const MOMENT: Record<MealType, string> = { petit_dejeuner: 'Ce matin', dejeuner: 'Ce midi', gouter: 'Cet après-midi', diner: 'Ce soir' }

function sides(item: Item): string[] {
  return [...item.meal_compositions].sort((a, b) => a.sort_order - b.sort_order).map(c => c.recipes?.name).filter((n): n is string => !!n)
}

// Accueil d'un membre (qui ne planifie pas) : sondage de la semaine, repas du
// jour, menu de la semaine et derniers avis (cf. components/home/member-home).
export function MemberHome({ firstName }: { firstName: string }) {
  const [data, setData] = useState<FamilyData | null>(null)
  const [vote, setVote] = useState<VoteStatus | null>(null)
  const [recent, setRecent] = useState<MyFeedback[]>([])
  const [loading, setLoading] = useState(true)

  const load = useCallback(async () => {
    const [fam, fb] = await Promise.all([
      get<FamilyData>(`/api/meal-plans/family?week=${getMondayISO()}`),
      get<MyFeedback[]>('/api/users/me/feedback?limit=3'),
    ])
    setData(fam)
    setRecent(Array.isArray(fb) ? fb : [])
    if (fam?.plan?.share_token) setVote(await get<VoteStatus>(`/api/meal-plans/${fam.plan.id}/survey-results/member`))
    setLoading(false)
  }, [])
  useReloadOnFocus(load)

  if (loading) {
    return (
      <Screen>
        <Bone style={{ height: 90, width: '70%' }} />
        <Bone style={{ height: 170, borderRadius: R.xl }} />
        <Bone style={{ height: 300, borderRadius: R.xl }} />
      </Screen>
    )
  }

  const planner = data?.planner_name ?? 'La cuisine'
  const plan = data?.plan ?? null
  const today = dayOfWeekFromDate(new Date())
  const todayIdx = DAY_OPTIONS.findIndex(d => d.val === today)

  const greeting = (
    <View style={{ paddingTop: 4 }}>
      <Txt style={{ fontFamily: F.bodyMedium, fontSize: 15, color: C.texte2 }}>Bonjour{firstName ? `, ${firstName}` : ''}</Txt>
      <Txt variant="h1" style={{ marginTop: 2 }}>On mange quoi{'\n'}aujourd’hui ?</Txt>
      <View style={{ marginTop: 12, alignSelf: 'flex-start', flexDirection: 'row', alignItems: 'center', gap: 6, borderRadius: R.pill, backgroundColor: '#FFFFFF', paddingHorizontal: 12, paddingVertical: 6 }}>
        <Users size={14} color={C.foret} />
        <Txt style={{ fontFamily: F.bodySemi, fontSize: 12, color: C.foret }}>
          {data?.circle_name ?? 'Ma table'}{plan ? ` · semaine du ${formatWeekRange(plan.week_start)}` : ''}
        </Txt>
      </View>
    </View>
  )

  // Accès désactivé : plus de menu ni de sondage, l'historique reste.
  if (data?.role === 'membre' && !data.is_active) {
    return (
      <Screen onRefresh={load}>
        {greeting}
        <Card>
          <EmptyState icon={Lock} title="Ton accès au cercle est désactivé"
            description="Tu ne vois plus le menu ni les sondages de ce cercle. Tes avis passés restent consultables."
            action={<Pressable onPress={() => router.push('/avis')} style={{ height: 44, justifyContent: 'center' }}><Txt variant="bodyBold" color={C.foret}>Voir mes avis</Txt></Pressable>} />
        </Card>
      </Screen>
    )
  }

  const items = plan?.meal_plan_items ?? []
  const byMeal = (a: Item, b: Item) => MEAL_TYPE_ORDER[a.meal_type] - MEAL_TYPE_ORDER[b.meal_type]
  const todayItems = items.filter(i => i.applies_all_days || i.day_of_week === today).sort(byMeal)
  const hero = todayItems.find(i => i.meal_type === 'dejeuner') ?? todayItems.find(i => !i.applies_all_days) ?? todayItems[0] ?? null
  const otherToday = todayItems.filter(i => i.id !== hero?.id)
  const week = DAY_OPTIONS.map((d, idx) => {
    const dayItems = items.filter(i => !i.applies_all_days && i.day_of_week === d.val).sort(byMeal)
    const main = dayItems.find(i => i.meal_type === 'dejeuner') ?? dayItems.find(i => i.meal_type === 'diner') ?? dayItems[0] ?? null
    return { ...d, idx, main }
  }).filter(d => d.main)
  const totalMins = hero ? (hero.recipes?.prep_time_min ?? 0) + (hero.recipes?.cook_time_min ?? 0) : 0
  const members = Math.max(vote?.member_count ?? 1, 1)

  return (
    <Screen onRefresh={load}>
      {greeting}

      {!plan ? (
        <View style={{ borderRadius: R.xl, borderWidth: 1.5, borderStyle: 'dashed', borderColor: C.filet, backgroundColor: '#FFFFFF' }}>
          <EmptyState icon={UtensilsCrossed} title="Le menu de la semaine se prépare"
            description={`${planner} n’a pas encore publié le menu. Tu pourras donner ton avis dès qu’il sera partagé.`} />
        </View>
      ) : (
        <>
          {plan.share_token && vote && (vote.has_voted ? (
            <Pressable onPress={() => router.push('/sondages')} accessibilityRole="button"
              style={({ pressed }) => ({ flexDirection: 'row', alignItems: 'center', gap: 12, borderRadius: R.xl, backgroundColor: C.sauge50, padding: 16, transform: [{ scale: pressed ? 0.99 : 1 }] })}>
              <View style={{ width: 44, height: 44, borderRadius: R.pill, backgroundColor: '#FFFFFF', alignItems: 'center', justifyContent: 'center' }}>
                <CheckCircle size={20} color={C.foret} />
              </View>
              <View style={{ flex: 1 }}>
                <Txt variant="h3">Merci, ton avis est transmis</Txt>
                <Txt variant="small">{vote.total_respondents}/{members} ont répondu · voir l’avis de la table</Txt>
              </View>
              <BarChart3 size={20} color={C.foret} />
            </Pressable>
          ) : (
            <View style={{ borderRadius: R.xl, backgroundColor: C.orange, padding: 20, gap: 16 }}>
              <View>
                <Txt style={{ fontFamily: F.title, fontSize: 20, lineHeight: 24, color: '#FFFFFF' }}>{planner} attend ton avis</Txt>
                <Txt variant="small" color="rgba(255,255,255,0.9)" style={{ marginTop: 4, fontSize: 14 }}>{items.length} repas à décider ensemble cette semaine.</Txt>
              </View>
              <View style={{ gap: 6 }}>
                <View style={{ flexDirection: 'row', justifyContent: 'space-between' }}>
                  <Txt style={{ fontFamily: F.bodyBold, fontSize: 12, color: '#FFFFFF' }}>Participation de la table</Txt>
                  <Txt style={{ fontFamily: F.bodyBold, fontSize: 12, color: '#FFFFFF' }}>{vote.total_respondents}/{members}</Txt>
                </View>
                <ProgressBar pct={Math.round((vote.total_respondents / members) * 100)} color={C.creme} track={C.white25} height={8} />
              </View>
              <View style={{ flexDirection: 'row', alignItems: 'center', justifyContent: 'space-between', gap: 12 }}>
                <View style={{ flexDirection: 'row' }}>
                  {vote.voter_names.slice(0, 4).map((n, i) => (
                    <View key={n} style={{ marginLeft: i ? -8 : 0, width: 36, height: 36, borderRadius: R.pill, borderWidth: 2, borderColor: C.orange, backgroundColor: C.creme, alignItems: 'center', justifyContent: 'center' }}>
                      <Txt style={{ fontFamily: F.title, fontSize: 12, color: C.orange700 }}>{n.charAt(0).toUpperCase()}</Txt>
                    </View>
                  ))}
                </View>
                <Pressable onPress={() => router.push(`/s/${plan.share_token}`)} accessibilityRole="button"
                  style={({ pressed }) => ({ height: 48, flexDirection: 'row', alignItems: 'center', gap: 6, paddingHorizontal: 20, borderRadius: R.pill, backgroundColor: C.creme, transform: [{ scale: pressed ? 0.95 : 1 }] })}>
                  <Vote size={16} color={C.orange700} />
                  <Txt style={{ fontFamily: F.bodyBold, fontSize: 15, color: C.orange700 }}>Donner mon avis</Txt>
                </Pressable>
              </View>
            </View>
          ))}

          {/* Au menu aujourd'hui */}
          <View style={{ gap: 12 }}>
            <View style={{ flexDirection: 'row', alignItems: 'baseline', justifyContent: 'space-between', gap: 8, paddingHorizontal: 4 }}>
              <Txt variant="h2" color={C.profond}>Au menu</Txt>
              <Txt style={{ fontFamily: F.bodySemi, fontSize: 13, color: C.texte2 }}>{capitalize(dayLong(new Date()))}</Txt>
            </View>
            {hero ? (
              <View style={{ borderRadius: R.xl, backgroundColor: '#FFFFFF', overflow: 'hidden' }}>
                <View style={{ margin: 6, aspectRatio: 5 / 4, borderRadius: R.lg, overflow: 'hidden', backgroundColor: C.orange50, alignItems: 'center', justifyContent: 'center' }}>
                  {hero.recipes?.photo_url
                    ? <Image source={{ uri: hero.recipes.photo_url }} style={{ position: 'absolute', top: 0, left: 0, right: 0, bottom: 0 }} resizeMode="cover" />
                    : <MealTypeIcon type={hero.meal_type} size={56} color={C.orange300} />}
                  {/* Voile dégradé : trois bandes de vert profond de plus en plus opaques */}
                  <View style={{ position: 'absolute', left: 0, right: 0, bottom: 0, height: '66%' }}>
                    <View style={{ flex: 1, backgroundColor: 'rgba(31,58,46,0.08)' }} />
                    <View style={{ flex: 1, backgroundColor: 'rgba(31,58,46,0.35)' }} />
                    <View style={{ flex: 1.4, backgroundColor: 'rgba(31,58,46,0.78)' }} />
                  </View>
                  <View style={{ position: 'absolute', left: 12, top: 12, flexDirection: 'row', alignItems: 'center', gap: 6, borderRadius: R.pill, backgroundColor: 'rgba(255,255,255,0.92)', paddingHorizontal: 12, paddingVertical: 6 }}>
                    <MealTypeIcon type={hero.meal_type} size={14} color={C.foret} />
                    <Txt style={{ fontFamily: F.bodyBold, fontSize: 12, color: C.foret }}>
                      {MOMENT[hero.meal_type]}{data?.meal_times[hero.meal_type] ? ` · ${data.meal_times[hero.meal_type].replace(':', 'h')}` : ''}
                    </Txt>
                  </View>
                  <View style={{ position: 'absolute', left: 16, right: 16, bottom: 16 }}>
                    <Txt style={{ fontFamily: F.title, fontSize: 22, lineHeight: 26, color: C.creme }}>{hero.recipes?.name ?? composedName(null, hero.meal_compositions)}</Txt>
                    <View style={{ marginTop: 4, flexDirection: 'row', flexWrap: 'wrap', gap: 12 }}>
                      <View style={{ flexDirection: 'row', alignItems: 'center', gap: 6 }}>
                        <ChefHat size={16} color="rgba(255,255,255,0.9)" />
                        <Txt style={{ fontFamily: F.bodyMedium, fontSize: 14, color: 'rgba(255,255,255,0.9)' }}>Par {planner}</Txt>
                      </View>
                      {totalMins > 0 && (
                        <View style={{ flexDirection: 'row', alignItems: 'center', gap: 4 }}>
                          <Clock size={14} color="rgba(255,255,255,0.9)" />
                          <Txt style={{ fontFamily: F.bodyMedium, fontSize: 14, color: 'rgba(255,255,255,0.9)' }}>{totalMins} min</Txt>
                        </View>
                      )}
                    </View>
                  </View>
                </View>
                <View style={{ paddingHorizontal: 16, paddingBottom: 16, paddingTop: 10, gap: 12 }}>
                  {!!hero.recipes?.description && <Txt variant="small" numberOfLines={2} style={{ fontSize: 14 }}>{hero.recipes.description}</Txt>}
                  {sides(hero).length > 0 && (
                    <View style={{ flexDirection: 'row', flexWrap: 'wrap', gap: 6 }}>
                      {sides(hero).map(n => (
                        <View key={n} style={{ height: 32, justifyContent: 'center', borderRadius: R.pill, backgroundColor: C.lin, paddingHorizontal: 12 }}>
                          <Txt style={{ fontFamily: F.bodySemi, fontSize: 13, color: C.profond }}>{n}</Txt>
                        </View>
                      ))}
                    </View>
                  )}
                  {otherToday.length > 0 && (
                    <View style={{ borderTopWidth: 1, borderColor: C.lin }}>
                      {otherToday.map((i, k) => (
                        <View key={i.id} style={{ flexDirection: 'row', alignItems: 'center', gap: 12, paddingVertical: 10, borderTopWidth: k ? 1 : 0, borderColor: C.lin }}>
                          <View style={{ width: 40, height: 40, borderRadius: R.pill, backgroundColor: C.creme, alignItems: 'center', justifyContent: 'center' }}>
                            <MealTypeIcon type={i.meal_type} size={16} color={C.foret} />
                          </View>
                          <View style={{ flex: 1 }}>
                            <Txt style={{ fontFamily: F.bodySemi, fontSize: 12, color: C.texte2 }}>{MEAL_LABEL[i.meal_type]}</Txt>
                            <Txt numberOfLines={1} variant="smallBold" style={{ fontSize: 14 }}>{composedName(i.recipes?.name, i.meal_compositions)}</Txt>
                          </View>
                        </View>
                      ))}
                    </View>
                  )}
                </View>
              </View>
            ) : (
              <Card><Txt variant="small" style={{ fontSize: 14 }}>Pas de repas prévu aujourd’hui.</Txt></Card>
            )}
          </View>

          {/* La semaine, qui défile jusqu'au jour courant */}
          {week.length > 0 && (
            <View style={{ gap: 12 }}>
              <Txt variant="h2" color={C.profond} style={{ paddingHorizontal: 4 }}>Cette semaine</Txt>
              <ScrollView horizontal showsHorizontalScrollIndicator={false} style={{ marginHorizontal: -16 }}
                contentContainerStyle={{ paddingHorizontal: 16, gap: 10 }}
                contentOffset={{ x: Math.max(0, week.findIndex(d => d.idx >= todayIdx)) * 154, y: 0 }}>
                {week.map(d => {
                  const isToday = d.val === today
                  const isPast = todayIdx >= 0 && d.idx < todayIdx
                  return (
                    <View key={d.val} style={{ width: 144, borderRadius: R.xl, padding: 14, backgroundColor: isToday ? C.foret : '#FFFFFF', opacity: isPast ? 0.6 : 1 }}>
                      <View style={{ flexDirection: 'row', alignItems: 'center', justifyContent: 'space-between' }}>
                        <Txt style={{ fontFamily: F.bodyBold, fontSize: 12, color: isToday ? C.jaune : C.texte2 }}>{isToday ? 'Aujourd’hui' : d.full}</Txt>
                        {isPast && <Check size={14} color={C.foret500} accessibilityLabel="Passé" />}
                      </View>
                      <Txt numberOfLines={2} style={{ marginTop: 8, fontFamily: F.titleBold, fontSize: 15, lineHeight: 20, color: isToday ? C.creme : C.profond }}>
                        {composedName(d.main!.recipes?.name, d.main!.meal_compositions)}
                      </Txt>
                      <Txt style={{ marginTop: 4, fontSize: 12, color: isToday ? 'rgba(255,255,255,0.8)' : C.texte2 }}>{MEAL_LABEL[d.main!.meal_type]}</Txt>
                    </View>
                  )
                })}
              </ScrollView>
            </View>
          )}
        </>
      )}

      {/* Mes derniers avis */}
      <View style={{ gap: 12 }}>
        <View style={{ flexDirection: 'row', alignItems: 'center', justifyContent: 'space-between', paddingHorizontal: 4 }}>
          <Txt variant="h2" color={C.profond}>Mes avis</Txt>
          <Pressable onPress={() => router.push('/avis')} style={{ height: 44, flexDirection: 'row', alignItems: 'center', gap: 4 }}>
            <Txt variant="bodyBold" color={C.foret} style={{ fontSize: 14 }}>Donner mon avis</Txt>
            <ArrowRight size={16} color={C.foret} />
          </Pressable>
        </View>
        {recent.length === 0 ? (
          <Card><Txt variant="small" style={{ fontSize: 14 }}>Tes avis sur les repas apparaîtront ici.</Txt></Card>
        ) : (
          <View style={{ borderRadius: R.xl, backgroundColor: '#FFFFFF', overflow: 'hidden' }}>
            {recent.map((f, i) => (
              <View key={f.id} style={{ flexDirection: 'row', gap: 12, padding: 14, borderTopWidth: i ? 1 : 0, borderColor: C.lin }}>
                <View style={{ width: 44, height: 44, borderRadius: R.pill, backgroundColor: C.creme, alignItems: 'center', justifyContent: 'center' }}>
                  <Txt style={{ fontSize: 20 }}>{RATING_EMOJI[f.rating]}</Txt>
                </View>
                <View style={{ flex: 1 }}>
                  <View style={{ flexDirection: 'row', justifyContent: 'space-between', gap: 8 }}>
                    <Txt numberOfLines={1} variant="smallBold" style={{ flex: 1, fontSize: 14 }}>{composedName(f.item.recipes?.name, f.item.meal_compositions)}</Txt>
                    <Txt variant="meta">{relativeDay(f.created_at)}</Txt>
                  </View>
                  <Txt variant="meta">{MEAL_LABEL[f.item.meal_type]}</Txt>
                  {!!f.message && <Txt variant="small" style={{ marginTop: 6, fontStyle: 'italic' }}>« {f.message} »</Txt>}
                </View>
              </View>
            ))}
            <Pressable onPress={() => router.push('/avis')} style={{ height: 48, flexDirection: 'row', alignItems: 'center', justifyContent: 'center', gap: 6, borderTopWidth: 1, borderColor: C.lin }}>
              <Txt variant="bodyBold" color={C.foret} style={{ fontSize: 14 }}>Tout l’historique</Txt>
              <ArrowRight size={16} color={C.foret} />
            </Pressable>
          </View>
        )}
      </View>
    </Screen>
  )
}

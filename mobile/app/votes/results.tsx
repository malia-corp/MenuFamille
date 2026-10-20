import { useCallback, useMemo, useState } from 'react'
import { Pressable, ScrollView, View } from 'react-native'
import { router, useLocalSearchParams } from 'expo-router'
import { formatDistanceToNow } from 'date-fns'
import { fr } from 'date-fns/locale'
import { ArrowLeft, CalendarDays, CalendarPlus, ChevronRight, Heart, MailOpen, MessageCircleWarning, PartyPopper, Pencil, Share2, Users, UtensilsCrossed, WifiOff, type LucideIcon } from 'lucide-react-native'
import { Bone, Button, Card, CardTitle, EmptyState, NameAvatar, Screen, Segmented, Select, ShareActions, Txt, useReloadOnFocus } from '@/components/ui'
import { ConsensusGauge, ResultCard, TEMPLATE_KEY, agreementTone, chronoCompare, countsOf, dayLabelOf, harmonyOf, type ResultItem, type SurveyResultsData } from '@/components/votes/VoteBits'
import { get, request } from '@/lib/api'
import { MEAL_LABEL, MEAL_TYPE_ORDER, type MealType } from '@/shared/meal-type'
import { agreementPct, isRejected, totalReactions } from '@/shared/survey-score'
import { surveyLinkPayload } from '@/shared/share'
import { DAY_OPTIONS, formatWeekRange } from '@/shared/week'
import { C, F, R } from '@/theme'

type LoadState = 'loading' | 'ready' | 'no_plan' | 'error'
type Sort = 'chrono' | 'best' | 'worst'
const SORTS: { value: Sort; label: string }[] = [
  { value: 'chrono', label: 'Ordre de la semaine' },
  { value: 'best', label: 'Les plus appréciés d’abord' },
  { value: 'worst', label: 'Les moins appréciés d’abord' },
]

function Centered({ icon, title, message, action, children }: { icon: LucideIcon; title: string; message: string; action?: { label: string; onPress: () => void }; children?: React.ReactNode }) {
  return (
    <Screen header={false} withTabBar={false}>
      <View style={{ borderRadius: R.xl, backgroundColor: '#FFFFFF', marginTop: 24 }}>
        <EmptyState icon={icon} title={title} description={message}
          action={<View style={{ gap: 10, alignSelf: 'stretch' }}>{children}{action && <Button label={action.label} tone="foret" onPress={action.onPress} />}</View>} />
      </View>
      <Button label="Retour" tone="link" onPress={() => (router.canGoBack() ? router.back() : router.replace('/'))} />
    </Screen>
  )
}

// Résultats du sondage, vue planificatrice (cf. app/(app)/votes/results/page.tsx).
export default function VotesResultsScreen() {
  const { plan } = useLocalSearchParams<{ plan?: string }>()
  const [state, setState] = useState<LoadState>('loading')
  const [data, setData] = useState<SurveyResultsData | null>(null)
  const [mode, setMode] = useState<'day' | 'type'>('day')
  const [chip, setChip] = useState<string | null>(null)
  const [sort, setSort] = useState<Sort>('chrono')

  const load = useCallback(async () => {
    try {
      let id = plan ?? null
      if (!id) {
        // Sans ?plan= : dernier plan partagé, sinon dernier plan tout court.
        const latest = (await get<{ id?: string }>('/api/meal-plans?latest=true&shared=true')) ?? (await get<{ id?: string }>('/api/meal-plans?latest=true'))
        id = latest?.id ?? null
      }
      if (!id) { setState('no_plan'); return }
      const res = await request<SurveyResultsData>(`/api/meal-plans/${id}/survey-results`)
      if (!res.ok || !res.data) { setState(res.status === 404 ? 'no_plan' : 'error'); return }
      setData(res.data)
      setState('ready')
    } catch {
      setState('error')
    }
  }, [plan])
  useReloadOnFocus(load)

  const derived = useMemo(() => {
    if (!data) return null
    const items = [...data.items].sort(chronoCompare)
    const voted = items.filter(i => totalReactions(countsOf(i)) > 0)
    const rejected = voted.filter(i => isRejected(countsOf(i)))
    const favorites = [...voted]
      .sort((a, b) => b.aime / totalReactions(countsOf(b)) - a.aime / totalReactions(countsOf(a)) || totalReactions(countsOf(b)) - totalReactions(countsOf(a)))
      .slice(0, 3)
    const toReview = voted.filter(i => i.naime_pas > 0)
      .sort((a, b) => (agreementPct(countsOf(a)) ?? 0) - (agreementPct(countsOf(b)) ?? 0) || b.naime_pas - a.naime_pas)
      .slice(0, 3)
    return { items, voted, rejected, favorites, toReview }
  }, [data])

  const back = () => (router.canGoBack() ? router.back() : router.replace('/'))
  const editItem = (item: ResultItem) => data && router.navigate({ pathname: '/plan', params: { week: data.week_start, day: item.day_of_week, meal: item.meal_type } })

  if (state === 'loading') {
    return (
      <Screen header={false} withTabBar={false}>
        <Bone style={{ height: 300, borderRadius: R.xl }} /><Bone style={{ height: 160, borderRadius: R.xl }} /><Bone style={{ height: 160, borderRadius: R.xl }} />
      </Screen>
    )
  }
  if (state !== 'ready' || !data || !derived) {
    return <Centered icon={state === 'error' ? WifiOff : CalendarPlus} title={state === 'error' ? 'Impossible de charger les résultats' : 'Aucun menu à afficher'}
      message={state === 'error' ? 'Réessaie dans un instant.' : 'Planifie un menu puis partage-le à ta famille pour recueillir leurs avis.'}
      action={{ label: 'Aller au menu', onPress: () => router.navigate('/plan') }} />
  }

  const weekRange = formatWeekRange(data.week_start)
  const memberCount = Math.max(data.member_count, 1)

  if (data.total_respondents === 0) {
    const token = data.share_token
    if (data.items.length === 0) {
      return <Centered icon={CalendarPlus} title="Menu à planifier"
        message={`Aucun repas n’est planifié pour la semaine du ${weekRange}. Planifie d’abord ton menu, puis partage-le à ta famille pour recueillir leurs avis.`}
        action={{ label: 'Planifier le menu', onPress: () => router.navigate({ pathname: '/plan', params: { week: data.week_start } }) }} />
    }
    if (!token) {
      return <Centered icon={Share2} title="Menu pas encore partagé"
        message={`Ton menu de la semaine du ${weekRange} est planifié mais pas encore partagé. Partage-le à ta famille pour recueillir leurs avis.`}
        action={{ label: 'Partager le menu', onPress: () => router.push({ pathname: '/plan/validate', params: { week: data.week_start } }) }} />
    }
    return (
      <Centered icon={MailOpen} title="En attente des avis de la famille" message="Partage le lien du menu pour recueillir les avis.">
        <ShareActions getPayload={() => surveyLinkPayload(token)} shareLabel="Renvoyer le lien" />
      </Centered>
    )
  }

  const { items, voted, rejected, favorites, toReview } = derived
  const harmony = harmonyOf(data.global_score)
  const allVoted = data.total_respondents >= memberCount
  const pending = Math.max(0, memberCount - data.total_respondents)
  const token = data.share_token
  const hasTemplate = items.some(i => i.applies_all_days)
  const groupKeyOf = (i: ResultItem) => (mode === 'day' ? (i.applies_all_days ? TEMPLATE_KEY : i.day_of_week) : i.meal_type)
  const chips = mode === 'day'
    ? [...(hasTemplate ? [{ value: TEMPLATE_KEY, label: 'Toute la semaine' }] : []),
       ...DAY_OPTIONS.filter(d => items.some(i => !i.applies_all_days && i.day_of_week === d.val)).map(d => ({ value: d.val as string, label: d.full }))]
    : (Object.keys(MEAL_TYPE_ORDER) as MealType[]).sort((a, b) => MEAL_TYPE_ORDER[a] - MEAL_TYPE_ORDER[b])
        .filter(t => items.some(i => i.meal_type === t)).map(t => ({ value: t as string, label: MEAL_LABEL[t] }))
  const scoreOf = (i: ResultItem, empty: number) => agreementPct(countsOf(i)) ?? empty
  const sortFn = (a: ResultItem, b: ResultItem) =>
    sort === 'best' ? scoreOf(b, -1) - scoreOf(a, -1) || chronoCompare(a, b)
      : sort === 'worst' ? scoreOf(a, 101) - scoreOf(b, 101) || chronoCompare(a, b)
        : chronoCompare(a, b)
  const groups = chips.filter(c => chip === null || c.value === chip)
    .map(c => ({ key: c.value, label: c.label, items: items.filter(i => groupKeyOf(i) === c.value).sort(sortFn) }))
    .filter(g => g.items.length > 0)
  const recapText = [
    `Résultats du sondage KeskonBouf — semaine du ${weekRange}`,
    `${data.total_respondents} avis · ${data.global_score ?? 0}% d'accord`,
    favorites.length ? `Les plus appréciés : ${favorites.map(f => f.main_name).filter(Boolean).join(', ')}` : '',
  ].filter(Boolean).join('\n')
  const names = data.respondents.map(r => r.name)

  return (
    <Screen header={false} withTabBar={false} onRefresh={load}>
      {/* Bandeau : accord global, participation, actions */}
      <View style={{ backgroundColor: C.foret, borderRadius: R.xl, padding: 20 }}>
        <View style={{ flexDirection: 'row', alignItems: 'flex-start', justifyContent: 'space-between', gap: 12 }}>
          <View style={{ flex: 1 }}>
            <Txt style={{ fontFamily: F.bodySemi, fontSize: 14, color: C.foret100 }}>Sondage · semaine du {weekRange}</Txt>
            <Txt variant="h1" color={C.creme} style={{ marginTop: 2 }}>Résultats du sondage</Txt>
          </View>
          <Pressable onPress={back} accessibilityRole="button" accessibilityLabel="Retour"
            style={{ width: 40, height: 40, borderRadius: R.pill, backgroundColor: C.white10, alignItems: 'center', justifyContent: 'center' }}>
            <ArrowLeft size={20} color={C.creme} />
          </Pressable>
        </View>
        <View style={{ marginTop: 16, flexDirection: 'row', alignItems: 'center', gap: 16 }}>
          <ConsensusGauge pct={data.global_score} label="d’accord" size={104} onDark />
          <View style={{ flex: 1, gap: 8 }}>
            <Txt variant="signature" color={C.creme}>{harmony.label}</Txt>
            <Txt variant="small" color={C.foret100} style={{ fontSize: 14 }}>
              {rejected.length === 0
                ? `Aucun des ${voted.length} repas notés n’est rejeté par la famille.`
                : `${rejected.length} repas sur ${voted.length} rejeté${rejected.length > 1 ? 's' : ''} par la majorité.`}
            </Txt>
          </View>
        </View>
        <View style={{ marginTop: 16, flexDirection: 'row', alignItems: 'center', gap: 10 }}>
          <View style={{ flexDirection: 'row' }}>
            {names.slice(0, 4).map((n, i) => (
              <View key={`${n}-${i}`} style={{ marginLeft: i ? -6 : 0, width: 28, height: 28, borderRadius: R.pill, borderWidth: 2, borderColor: C.foret, backgroundColor: C.foret100, alignItems: 'center', justifyContent: 'center' }}>
                <Txt style={{ fontFamily: F.bodyBold, fontSize: 12, color: C.foret }}>{n.trim().charAt(0).toUpperCase() || '?'}</Txt>
              </View>
            ))}
            {names.length > 4 && (
              <View style={{ marginLeft: -6, width: 28, height: 28, borderRadius: R.pill, borderWidth: 2, borderColor: C.foret, backgroundColor: C.white15, alignItems: 'center', justifyContent: 'center' }}>
                <Txt style={{ fontFamily: F.bodyBold, fontSize: 11, color: C.creme }}>+{names.length - 4}</Txt>
              </View>
            )}
            {pending > 0 && (
              <View style={{ marginLeft: -6, width: 28, height: 28, borderRadius: R.pill, borderWidth: 1.5, borderStyle: 'dashed', borderColor: C.foret300, backgroundColor: C.foret, alignItems: 'center', justifyContent: 'center' }}>
                <Txt style={{ fontFamily: F.bodyBold, fontSize: 11, color: C.foret100 }}>{pending}</Txt>
              </View>
            )}
          </View>
          <Txt style={{ fontFamily: F.bodySemi, fontSize: 12, color: C.foret100 }}>
            {allVoted ? 'Toute la famille a répondu' : `${data.total_respondents} sur ${memberCount} ont répondu`}
          </Txt>
        </View>
        <View style={{ marginTop: 20, gap: 8 }}>
          <Button label="Ajuster le menu" icon={Pencil} tone="orange" full onPress={() => router.navigate({ pathname: '/plan', params: { week: data.week_start } })} />
          <ShareActions getPayload={() => ({ title: 'Résultats du sondage — KeskonBouf', text: recapText })} onDark />
        </View>
      </View>

      {/* Les plus appréciés */}
      <Card style={{ gap: 12 }}>
        <CardTitle icon={Heart} title="Les plus appréciés" tileBg={C.jaune50} tileFg={C.jauneText} />
        {favorites.length === 0 ? <Txt variant="small" style={{ fontSize: 14 }}>Pas encore assez d’avis.</Txt> : favorites.map((f, idx) => (
          <View key={f.id} style={{ flexDirection: 'row', alignItems: 'center', gap: 12, paddingVertical: 6 }}>
            <View style={{ width: 32, height: 32, borderRadius: R.pill, backgroundColor: idx === 0 ? C.jaune : C.jaune50, alignItems: 'center', justifyContent: 'center' }}>
              <Txt style={{ fontFamily: F.title, fontSize: 14, color: idx === 0 ? C.jaune900 : C.jauneText }}>{idx + 1}</Txt>
            </View>
            <View style={{ flex: 1 }}>
              <Txt numberOfLines={1} variant="smallBold" style={{ fontSize: 14 }}>{f.main_name ?? 'Repas'}</Txt>
              <Txt variant="meta">{MEAL_LABEL[f.meal_type]} · {dayLabelOf(f)}</Txt>
            </View>
            <Txt style={{ fontFamily: F.bodySemi, fontSize: 12, color: C.texte2 }}>
              <Txt style={{ fontFamily: F.title, fontSize: 16, color: C.foret500 }}>{f.aime}</Txt> J’adore
            </Txt>
          </View>
        ))}
      </Card>

      {/* À revoir */}
      <Card style={{ gap: 12 }}>
        <CardTitle icon={MessageCircleWarning} title="À revoir" tileBg={C.orange50} tileFg={C.orangeText} />
        {toReview.length === 0 ? (
          <View style={{ flexDirection: 'row', alignItems: 'center', gap: 12, borderRadius: R.md, backgroundColor: C.sauge50, padding: 12 }}>
            <PartyPopper size={20} color={C.foret500} />
            <Txt style={{ flex: 1, fontSize: 14 }}>Aucun plat n’a déplu : le menu est prêt pour les fourneaux.</Txt>
          </View>
        ) : toReview.map(item => {
          const pct = agreementPct(countsOf(item))
          const tone = agreementTone(pct)
          return (
            <View key={item.id} style={{ flexDirection: 'row', alignItems: 'center', gap: 12, paddingVertical: 6 }}>
              <View style={{ height: 32, minWidth: 48, paddingHorizontal: 8, borderRadius: R.pill, backgroundColor: tone.bg, alignItems: 'center', justifyContent: 'center' }}>
                <Txt style={{ fontFamily: F.title, fontSize: 14, color: tone.text }}>{pct}%</Txt>
              </View>
              <View style={{ flex: 1 }}>
                <Txt numberOfLines={1} variant="smallBold" style={{ fontSize: 14 }}>{item.main_name ?? 'Repas'}</Txt>
                <Txt numberOfLines={1} variant="meta">{item.naime_pas} « Pas trop » · {MEAL_LABEL[item.meal_type]} · {dayLabelOf(item)}</Txt>
              </View>
              <Pressable onPress={() => editItem(item)} accessibilityRole="button" accessibilityLabel={`Changer ${item.main_name ?? 'ce repas'}`}
                style={{ height: 36, paddingHorizontal: 12, borderRadius: R.pill, borderWidth: 1.5, borderColor: C.filet, alignItems: 'center', justifyContent: 'center' }}>
                <Txt style={{ fontFamily: F.bodyBold, fontSize: 12, color: C.foret }}>Changer</Txt>
              </Pressable>
            </View>
          )
        })}
      </Card>

      {/* Qui a répondu */}
      <Card style={{ gap: 8 }}>
        <CardTitle icon={Users} title="Qui a répondu" />
        {data.respondents.slice(0, 5).map((r, i) => (
          <View key={`${r.name}-${i}`} style={{ flexDirection: 'row', alignItems: 'center', gap: 12, paddingVertical: 4 }}>
            <NameAvatar name={r.name} size={32} />
            <Txt numberOfLines={1} variant="smallBold" style={{ flex: 1, fontSize: 14 }}>{r.name}</Txt>
            <Txt variant="meta">{formatDistanceToNow(new Date(r.voted_at), { addSuffix: true, locale: fr })}</Txt>
          </View>
        ))}
        {data.respondents.length > 5 && <Txt variant="meta">et {data.respondents.length - 5} autre{data.respondents.length - 5 > 1 ? 's' : ''}</Txt>}
        {pending > 0 && token ? (
          <View style={{ gap: 8, paddingTop: 12, borderTopWidth: 1, borderStyle: 'dashed', borderColor: C.filet }}>
            <Txt variant="meta">{pending} avis attendu{pending > 1 ? 's' : ''}. Un petit rappel ?</Txt>
            <ShareActions getPayload={() => surveyLinkPayload(token)} shareLabel="Relancer" />
          </View>
        ) : (
          <Pressable onPress={() => router.navigate('/circle')} style={{ height: 40, flexDirection: 'row', alignItems: 'center', justifyContent: 'center', gap: 4 }}>
            <Txt variant="smallBold" color={C.foret} style={{ fontSize: 14 }}>Voir le cercle</Txt><ChevronRight size={16} color={C.foret} />
          </Pressable>
        )}
      </Card>

      {/* Repas par repas */}
      <View style={{ gap: 12 }}>
        <View style={{ flexDirection: 'row', alignItems: 'baseline', justifyContent: 'space-between', paddingHorizontal: 4 }}>
          <Txt variant="h2">Repas par repas</Txt>
          <Txt variant="meta">{voted.length} repas notés sur {items.length}</Txt>
        </View>
        <Segmented<'day' | 'type'> value={mode} onChange={m => { setMode(m); setChip(null) }}
          options={[{ value: 'day', label: 'Par jour', icon: CalendarDays }, { value: 'type', label: 'Par repas', icon: UtensilsCrossed }]} />
        <Select label="Trier les repas" value={sort} onChange={setSort} options={SORTS} searchable={false} size="sm" />
        <ScrollView horizontal showsHorizontalScrollIndicator={false} style={{ marginHorizontal: -16 }} contentContainerStyle={{ paddingHorizontal: 16, gap: 6 }}>
          {[{ value: null as string | null, label: 'Tous' }, ...chips].map(c => {
            const active = chip === c.value
            return (
              <Pressable key={c.value ?? 'all'} onPress={() => setChip(c.value)} accessibilityRole="button" accessibilityState={{ selected: active }}
                style={{ height: 36, justifyContent: 'center', paddingHorizontal: 14, borderRadius: R.pill, backgroundColor: active ? C.foret : '#FFFFFF' }}>
                <Txt style={{ fontFamily: F.bodyBold, fontSize: 13, color: active ? C.creme : C.texte2 }}>{c.label}</Txt>
              </Pressable>
            )
          })}
        </ScrollView>
        {groups.map(g => (
          <View key={g.key} style={{ gap: 12 }}>
            <View style={{ flexDirection: 'row', alignItems: 'center', gap: 12 }}>
              <Txt style={{ fontFamily: F.titleBold, fontSize: 16, color: C.profond }}>{g.label}</Txt>
              <View style={{ flex: 1, height: 1, backgroundColor: C.filet }} />
              <Txt style={{ fontFamily: F.bodySemi, fontSize: 12, color: C.texte2 }}>{g.items.length} repas</Txt>
            </View>
            {g.items.map(item => <ResultCard key={item.id} item={item} dayLabel={dayLabelOf(item)} onEdit={() => editItem(item)} />)}
          </View>
        ))}
      </View>
    </Screen>
  )
}

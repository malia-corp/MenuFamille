import { useCallback, useMemo, useState } from 'react'
import { View } from 'react-native'
import { router } from 'expo-router'
import { ArrowRight, CheckCircle, Inbox, PartyPopper, Shield, Vote, WifiOff } from 'lucide-react-native'
import { Bone, Button, EmptyState, Screen, Txt, useReloadOnFocus } from '@/components/ui'
import { ConsensusGauge, ResultCard, TEMPLATE_KEY, chronoCompare, countsOf, dayLabelOf, harmonyOf, type Reaction, type ResultItem } from '@/components/votes/VoteBits'
import { get, request } from '@/lib/api'
import { totalReactions } from '@/shared/survey-score'
import { formatWeekRange } from '@/shared/week'
import { C, F, R } from '@/theme'

type LoadState = 'loading' | 'ready' | 'no_survey' | 'error'
interface MemberResultsData {
  global_score: number | null; total_respondents: number
  per_item: { meal_plan_item_id: string; my_reaction: Reaction | null }[]
  week_start: string; member_count: number; voter_names: string[]; planner_name: string | null
  has_voted: boolean; share_token: string; status: string; items: ResultItem[]
}

const VOTER_COLORS = [C.orange, C.foret500, C.jaune700, C.foret, C.texte2]

function harmonyMessage(score: number | null): string {
  if (score === null) return 'Les avis de la famille arrivent bientôt.'
  if (score >= 80) return 'Toute la tablée a validé le menu dans un esprit de partage.'
  if (score >= 60) return 'La famille est globalement d’accord sur le menu de la semaine.'
  return 'Les avis sont partagés : la cuisine va ajuster quelques plats.'
}
const joinNames = (n: string[]) => (n.length <= 1 ? n.join('') : `${n.slice(0, -1).join(', ')} & ${n[n.length - 1]}`)

// Sondages, vue membre : résultats agrégés et son propre repère
// (cf. app/(app)/votes/results/member/page.tsx).
export default function MemberSurveysScreen() {
  const [state, setState] = useState<LoadState>('loading')
  const [data, setData] = useState<MemberResultsData | null>(null)

  const load = useCallback(async () => {
    try {
      const latest = await get<{ id?: string }>('/api/meal-plans/circle-latest')
      const id = latest?.id ?? null
      if (!id) { setState('no_survey'); return }
      const res = await request<MemberResultsData>(`/api/meal-plans/${id}/survey-results/member`)
      if (!res.ok || !res.data) { setState(res.status === 404 ? 'no_survey' : 'error'); return }
      setData(res.data)
      setState('ready')
    } catch {
      setState('error')
    }
  }, [])
  useReloadOnFocus(load)

  const groups = useMemo(() => {
    if (!data) return []
    const byKey = new Map<string, { label: string; items: ResultItem[] }>()
    for (const item of [...data.items].sort(chronoCompare)) {
      const key = item.applies_all_days ? TEMPLATE_KEY : item.day_of_week
      if (!byKey.has(key)) byKey.set(key, { label: dayLabelOf(item), items: [] })
      byKey.get(key)!.items.push(item)
    }
    return Array.from(byKey.entries()).map(([key, g]) => ({ key, ...g }))
  }, [data])

  if (state === 'loading') {
    return <Screen><Bone style={{ height: 120, borderRadius: R.xl }} /><Bone style={{ height: 170, borderRadius: R.xl }} /><Bone style={{ height: 200, borderRadius: R.xl }} /></Screen>
  }

  if (state !== 'ready' || !data) {
    return (
      <Screen onRefresh={load}>
        <View style={{ borderRadius: R.xl, backgroundColor: '#FFFFFF' }}>
          <EmptyState icon={state === 'error' ? WifiOff : Inbox}
            title={state === 'error' ? 'Impossible de charger les résultats' : 'Aucun sondage en cours'}
            description={state === 'error' ? 'Réessaie dans un instant.' : 'Quand ta famille partagera le menu de la semaine, les résultats des avis apparaîtront ici.'} />
        </View>
      </Screen>
    )
  }

  const myReactionOf = new Map(data.per_item.map(p => [p.meal_plan_item_id, p.my_reaction]))
  const harmony = harmonyOf(data.global_score)
  const openSurvey = () => router.push(`/s/${data.share_token}`)

  if (!data.has_voted) {
    return (
      <Screen onRefresh={load}>
        <View style={{ borderRadius: R.xl, backgroundColor: '#FFFFFF' }}>
          <EmptyState icon={Vote} title="Tu n’as pas encore donné ton avis" description={`${data.planner_name ?? 'Ta famille'} attend ta contribution pour finaliser la semaine.`}
            action={<Button label="Donner mon avis" iconRight={ArrowRight} tone="orange" onPress={openSurvey} />} />
        </View>
      </Screen>
    )
  }

  return (
    <Screen onRefresh={load}>
      <View style={{ alignItems: 'center', gap: 8 }}>
        <View style={{ flexDirection: 'row', alignItems: 'center', gap: 6, borderRadius: R.pill, backgroundColor: C.sauge50, paddingHorizontal: 12, paddingVertical: 4 }}>
          <Shield size={14} color={C.foret500} />
          <Txt style={{ fontFamily: F.bodyBold, fontSize: 12, color: C.foret500 }}>Avis anonymisés &amp; bienveillants</Txt>
        </View>
        <View style={{ flexDirection: 'row', alignItems: 'center', gap: 8 }}>
          <Txt variant="h2" color={C.profond}>Résultats de la famille</Txt>
          <PartyPopper size={22} color={C.orange} />
        </View>
        <Txt variant="meta">Semaine du {formatWeekRange(data.week_start)}{data.status === 'finalized' ? ' · Consultation clôturée' : ''}</Txt>
        {data.voter_names.length > 0 && (
          <View style={{ flexDirection: 'row', paddingTop: 4 }} accessibilityLabel={`${data.voter_names.length} personnes ont répondu`}>
            {data.voter_names.slice(0, 6).map((n, i) => (
              <View key={n} style={{ marginLeft: i ? -8 : 0, width: 32, height: 32, borderRadius: R.pill, borderWidth: 2, borderColor: '#FFFFFF', backgroundColor: VOTER_COLORS[i % VOTER_COLORS.length], alignItems: 'center', justifyContent: 'center' }}>
                <Txt style={{ fontFamily: F.title, fontSize: 12, color: '#FFFFFF' }}>{n.charAt(0).toUpperCase()}</Txt>
              </View>
            ))}
          </View>
        )}
      </View>

      {/* Indice d'harmonie */}
      <View style={{ borderRadius: R.xl, borderWidth: 1, borderColor: C.orange300, backgroundColor: C.orange50, padding: 16, gap: 12 }}>
        <View style={{ flexDirection: 'row', alignItems: 'center', justifyContent: 'space-between' }}>
          <Txt style={{ fontFamily: F.bodyBold, fontSize: 12, color: C.orangeText }}>Indice d’harmonie</Txt>
          <View style={{ borderRadius: R.pill, backgroundColor: C.sauge50, paddingHorizontal: 10, paddingVertical: 2 }}>
            <Txt style={{ fontFamily: F.bodyBold, fontSize: 11, color: C.foret500 }}>{data.total_respondents}/{Math.max(data.member_count, 1)} ont répondu</Txt>
          </View>
        </View>
        <View style={{ flexDirection: 'row', alignItems: 'center', gap: 16 }}>
          <ConsensusGauge pct={data.global_score} label="D’accord" size={104} />
          <View style={{ flex: 1, gap: 4 }}>
            <Txt variant="smallBold" color={harmony.color} style={{ fontSize: 14 }}>{harmony.label}</Txt>
            <Txt variant="small">{harmonyMessage(data.global_score)}</Txt>
            {data.voter_names.length > 0 && <Txt variant="meta">{joinNames(data.voter_names)}</Txt>}
          </View>
        </View>
      </View>

      {/* Résultats par repas : agrégats seulement, aucun commentaire nommé */}
      {groups.map(g => {
        const voted = g.items.filter(i => totalReactions(countsOf(i)) > 0).length
        return (
          <View key={g.key} style={{ gap: 12 }}>
            <View style={{ flexDirection: 'row', alignItems: 'center', gap: 8 }}>
              <View style={{ borderRadius: R.sm, backgroundColor: C.orange50, paddingHorizontal: 10, paddingVertical: 4 }}>
                <Txt style={{ fontFamily: F.titleBold, fontSize: 16, color: C.orangeText }}>{g.label}</Txt>
              </View>
              <Txt variant="meta">{voted} {voted > 1 ? 'repas notés' : 'repas noté'}</Txt>
            </View>
            {g.items.map(item => <ResultCard key={item.id} item={item} dayLabel={g.label} myReaction={myReactionOf.get(item.id) ?? null} />)}
          </View>
        )
      })}

      {data.status === 'finalized' ? (
        <View style={{ borderRadius: R.xl, backgroundColor: '#FFFFFF', padding: 16, gap: 12 }}>
          <View style={{ flexDirection: 'row', alignItems: 'flex-start', gap: 12 }}>
            <View style={{ width: 40, height: 40, borderRadius: R.pill, backgroundColor: C.foret500, alignItems: 'center', justifyContent: 'center' }}>
              <CheckCircle size={20} color="#FFFFFF" />
            </View>
            <View style={{ flex: 1 }}>
              <Txt variant="h3">Menu officiellement validé !</Txt>
              <Txt variant="small" style={{ fontSize: 14 }}>{data.planner_name ?? 'La planificatrice'} prépare la liste des courses pour le marché. Merci pour ta contribution conviviale !</Txt>
            </View>
          </View>
          <Button label="Consulter le menu de la semaine" iconRight={ArrowRight} tone="ghost" full onPress={() => router.navigate('/')} />
        </View>
      ) : (
        <Button label="Revoir mes avis" iconRight={ArrowRight} tone="link" onPress={openSurvey} />
      )}
    </Screen>
  )
}

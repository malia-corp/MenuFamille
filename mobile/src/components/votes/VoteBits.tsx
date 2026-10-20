import { useEffect, useRef } from 'react'
import { Animated, Image, Pressable, View } from 'react-native'
import Svg, { Circle } from 'react-native-svg'
import { CupSoda, Inbox, Lock, Pencil, Salad } from 'lucide-react-native'
import { MealTypeIcon, NameAvatar, Txt } from '@/components/ui'
import { MEAL_COLOR, MEAL_LABEL, MEAL_TYPE_ORDER, type MealType } from '@/shared/meal-type'
import { agreementPct, totalReactions, type ReactionCounts } from '@/shared/survey-score'
import { DAY_OPTIONS, type DayOfWeek } from '@/shared/week'
import { C, F, R } from '@/theme'

export type Reaction = 'aime' | 'bof' | 'naime_pas'
export interface ResultComment { respondent_name: string; comment: string; created_at: string }
export interface ResultItem {
  id: string; meal_type: MealType; day_of_week: DayOfWeek; applies_all_days: boolean
  recipe_name: string | null; main_name: string | null; photo_url: string | null; description: string | null
  side_names: string[]; drink_name: string | null; aime: number; bof: number; naime_pas: number; comments: ResultComment[]
}
export interface SurveyResultsData {
  global_score: number | null; total_respondents: number; week_start: string; member_count: number
  respondents: { name: string; voted_at: string }[]; share_token: string | null; items: ResultItem[]
}

export const TEMPLATE_KEY = 'semaine'
const DAY_INDEX = Object.fromEntries(DAY_OPTIONS.map((d, i) => [d.val, i])) as Record<DayOfWeek, number>

export const dayLabelOf = (i: ResultItem) => (i.applies_all_days ? 'Toute la semaine' : DAY_OPTIONS[DAY_INDEX[i.day_of_week]]?.full ?? i.day_of_week)
export const countsOf = (i: ResultItem): ReactionCounts => ({ aime: i.aime, bof: i.bof, naime_pas: i.naime_pas })
export function chronoCompare(a: ResultItem, b: ResultItem): number {
  if (a.applies_all_days !== b.applies_all_days) return a.applies_all_days ? -1 : 1
  return (DAY_INDEX[a.day_of_week] - DAY_INDEX[b.day_of_week]) || (MEAL_TYPE_ORDER[a.meal_type] - MEAL_TYPE_ORDER[b.meal_type])
}
export function harmonyOf(score: number | null): { label: string; color: string } {
  if (score === null) return { label: 'En attente des avis', color: C.texte2 }
  if (score >= 80) return { label: 'Excellente harmonie', color: C.foret500 }
  if (score >= 60) return { label: 'Bonne entente', color: C.foret }
  return { label: 'Avis partagés', color: C.jauneText }
}
export function agreementTone(pct: number | null): { bg: string; text: string } {
  if (pct === null) return { bg: C.lin, text: C.texte2 }
  if (pct >= 80) return { bg: C.sauge50, text: C.foret500 }
  if (pct >= 50) return { bg: C.jaune50, text: C.jauneText }
  return { bg: C.orange50, text: C.orangeText }
}

const AnimatedCircle = Animated.createAnimatedComponent(Circle)
const RR = 15.9155

// Jauge d'accord de la famille (cf. components/votes/consensus-gauge.tsx).
export function ConsensusGauge({ pct, label, size = 112, onDark }: { pct: number | null; label: string; size?: number; onDark?: boolean }) {
  const v = useRef(new Animated.Value(0)).current
  useEffect(() => { Animated.timing(v, { toValue: pct ?? 0, duration: 700, useNativeDriver: false }).start() }, [pct, v])
  return (
    <View style={{ width: size, height: size, alignItems: 'center', justifyContent: 'center' }} accessibilityLabel={`${pct ?? 0}% ${label}`}>
      <Svg viewBox="0 0 36 36" width={size} height={size} style={{ position: 'absolute', transform: [{ rotate: '-90deg' }] }}>
        <Circle cx="18" cy="18" r={RR} fill="none" stroke={onDark ? 'rgba(255,255,255,0.14)' : C.sauge50} strokeWidth={3.2} />
        <AnimatedCircle cx="18" cy="18" r={RR} fill="none" stroke={onDark ? C.sauge : C.foret500} strokeWidth={3.2} strokeLinecap="round"
          strokeDasharray={v.interpolate({ inputRange: [0, 100], outputRange: ['0 100', '100 100'] }) as unknown as string} />
      </Svg>
      <Txt style={{ fontFamily: F.title, fontSize: Math.round(size * 0.22), lineHeight: Math.round(size * 0.26), color: onDark ? C.creme : C.foret }}>{pct === null ? '—' : `${pct}%`}</Txt>
      <Txt style={{ fontFamily: F.bodyBold, fontSize: 12, color: onDark ? C.foret100 : C.texte2 }}>{label}</Txt>
    </View>
  )
}

const ROWS = [
  { key: 'aime', emoji: '\u{1F60A}', label: 'J’adore', color: C.foret500 },
  { key: 'bof', emoji: '\u{1F610}', label: 'Ça passe', color: C.jaune },
  { key: 'naime_pas', emoji: '\u{1F615}', label: 'Pas trop', color: C.orange },
] as const

export function ReactionBars({ counts }: { counts: ReactionCounts }) {
  const total = counts.aime + counts.bof + counts.naime_pas
  return (
    <View style={{ gap: 8 }}>
      <View style={{ height: 8, flexDirection: 'row', gap: 2, borderRadius: R.pill, overflow: 'hidden', backgroundColor: C.lin }}>
        {ROWS.map(r => (total > 0 && counts[r.key] > 0
          ? <View key={r.key} style={{ height: '100%', borderRadius: R.pill, backgroundColor: r.color, width: `${(counts[r.key] / total) * 100}%` }} />
          : null))}
      </View>
      <View style={{ flexDirection: 'row', flexWrap: 'wrap', columnGap: 12, rowGap: 4 }}>
        {ROWS.map(r => (
          <View key={r.key} style={{ flexDirection: 'row', alignItems: 'center', gap: 4 }}>
            <Txt style={{ fontSize: 14 }}>{r.emoji}</Txt>
            <Txt style={{ fontFamily: F.bodyBold, fontSize: 12, color: counts[r.key] > 0 ? C.profond : C.texte2 }}>{counts[r.key]}</Txt>
            <Txt variant="meta">{r.label}</Txt>
          </View>
        ))}
      </View>
    </View>
  )
}

const MY_REACTION: Record<Reaction, { emoji: string; label: string }> = {
  aime: { emoji: '\u{1F60A}', label: 'J’adore' }, bof: { emoji: '\u{1F610}', label: 'Ça passe' }, naime_pas: { emoji: '\u{1F615}', label: 'Pas trop' },
}

// Carte de résultat d'un repas (cf. components/votes/result-card.tsx).
export function ResultCard({ item, dayLabel, onEdit, myReaction }: { item: ResultItem; dayLabel: string; onEdit?: () => void; myReaction?: Reaction | null }) {
  const counts = countsOf(item)
  const total = totalReactions(counts)
  const pct = agreementPct(counts)
  const color = MEAL_COLOR[item.meal_type]
  const tone = agreementTone(pct)
  return (
    <View style={{ borderRadius: R.lg, backgroundColor: '#FFFFFF', padding: 16, gap: 12 }}>
      <View style={{ flexDirection: 'row', alignItems: 'flex-start', gap: 12 }}>
        <View style={{ width: 48, height: 48, borderRadius: R.md, overflow: 'hidden', backgroundColor: color.bg, alignItems: 'center', justifyContent: 'center' }}>
          {item.photo_url ? <Image source={{ uri: item.photo_url }} style={{ width: '100%', height: '100%' }} /> : <MealTypeIcon type={item.meal_type} size={20} />}
        </View>
        <View style={{ flex: 1 }}>
          <Txt style={{ fontFamily: F.bodySemi, fontSize: 12, color: color.text }}>
            {MEAL_LABEL[item.meal_type]} · {dayLabel}
            {pct !== null && <Txt style={{ fontFamily: F.bodyBold, fontSize: 12, color: tone.text }}> · {pct}% d’accord</Txt>}
          </Txt>
          <Txt variant="h3">{item.main_name ?? 'Repas non défini'}</Txt>
        </View>
        {onEdit && (
          <Pressable onPress={onEdit} accessibilityRole="button" accessibilityLabel={`Modifier ${item.main_name ?? 'ce repas'}`} hitSlop={6}
            style={{ width: 36, height: 36, borderRadius: R.pill, alignItems: 'center', justifyContent: 'center', marginTop: -4, marginRight: -6 }}>
            <Pencil size={16} color={C.texte2} />
          </Pressable>
        )}
      </View>

      {(item.side_names.length > 0 || !!item.drink_name || !!item.description) && (
        <View style={{ gap: 6 }}>
          {(item.side_names.length > 0 || !!item.drink_name) && (
            <View style={{ flexDirection: 'row', flexWrap: 'wrap', gap: 4 }}>
              {item.side_names.map(n => (
                <View key={n} style={{ flexDirection: 'row', alignItems: 'center', gap: 4, borderRadius: R.pill, backgroundColor: C.creme, paddingHorizontal: 8, paddingVertical: 2 }}>
                  <Salad size={12} color={C.texte2} /><Txt style={{ fontFamily: F.bodySemi, fontSize: 11, color: C.texte2 }}>{n}</Txt>
                </View>
              ))}
              {!!item.drink_name && (
                <View style={{ flexDirection: 'row', alignItems: 'center', gap: 4, borderRadius: R.pill, backgroundColor: C.creme, paddingHorizontal: 8, paddingVertical: 2 }}>
                  <CupSoda size={12} color={C.texte2} /><Txt style={{ fontFamily: F.bodySemi, fontSize: 11, color: C.texte2 }}>{item.drink_name}</Txt>
                </View>
              )}
            </View>
          )}
          {!!item.description && <Txt variant="small" numberOfLines={2}>{item.description}</Txt>}
        </View>
      )}

      {total === 0 ? (
        <View style={{ flexDirection: 'row', alignItems: 'center', gap: 6 }}>
          <Inbox size={14} color={C.texte2} /><Txt variant="meta">Aucun avis pour ce repas</Txt>
        </View>
      ) : <ReactionBars counts={counts} />}

      {myReaction !== undefined && (
        <View style={{ flexDirection: 'row', alignItems: 'center', gap: 6, borderRadius: R.md, backgroundColor: C.creme, paddingHorizontal: 12, paddingVertical: 8 }}>
          {myReaction ? (
            <>
              <Txt style={{ fontFamily: F.bodySemi, fontSize: 12, color: C.texte2 }}>Ton repère :</Txt>
              <Txt style={{ fontSize: 14 }}>{MY_REACTION[myReaction].emoji}</Txt>
              <Txt style={{ fontFamily: F.bodySemi, fontSize: 12, color: C.profond }}>{MY_REACTION[myReaction].label}</Txt>
            </>
          ) : <Txt style={{ flex: 1, fontFamily: F.bodySemi, fontSize: 12, color: C.texte2 }}>Tu n’as pas donné ton avis sur ce repas</Txt>}
          <View style={{ marginLeft: 'auto', flexDirection: 'row', alignItems: 'center', gap: 4, borderRadius: R.pill, backgroundColor: '#FFFFFF', paddingHorizontal: 8, paddingVertical: 2 }}>
            <Lock size={12} color={C.texte2} /><Txt style={{ fontFamily: F.bodyBold, fontSize: 12, color: C.texte2 }}>Privé</Txt>
          </View>
        </View>
      )}

      {item.comments.length > 0 && (
        <View style={{ gap: 8, paddingTop: 12, borderTopWidth: 1, borderStyle: 'dashed', borderColor: C.filet }}>
          {item.comments.map((c, i) => (
            <View key={i} style={{ flexDirection: 'row', alignItems: 'flex-start', gap: 8 }}>
              <NameAvatar name={c.respondent_name} size={26} />
              <View style={{ flexShrink: 1, borderRadius: R.md, borderTopLeftRadius: 4, backgroundColor: C.creme, paddingHorizontal: 12, paddingVertical: 6 }}>
                <Txt style={{ fontFamily: F.bodyBold, fontSize: 12, color: C.profond }}>{c.respondent_name}</Txt>
                <Txt variant="small">{c.comment}</Txt>
              </View>
            </View>
          ))}
        </View>
      )}
    </View>
  )
}

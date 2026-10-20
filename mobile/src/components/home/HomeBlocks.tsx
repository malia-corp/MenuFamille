import { useEffect, useRef, useState } from 'react'
import { Animated, Image, Pressable, View } from 'react-native'
import { router } from 'expo-router'
import Svg, { Circle } from 'react-native-svg'
import { ChevronRight, Clock, Lightbulb, MessageCircleHeart, Moon, Plus, ThumbsUp, Users, UtensilsCrossed, type LucideIcon } from 'lucide-react-native'
import { DAY_OPTIONS, type DayOfWeek } from '@/shared/week'
import { MEAL_COLOR, MEAL_FULL_LABEL, MEAL_LABEL, type MealType } from '@/shared/meal-type'
import { Card, MealTypeIcon, ShareActions, Txt, type SharePayload } from '@/components/ui'
import { C, F, R } from '@/theme'

// ─── Bande des 7 jours : la pastille glisse sous le jour choisi ──────────────

// complete : pastille « jour complet » (menu) à la place du repère « aujourd'hui ».
export function WeekDayPicker({ weekStart, selected, onSelect, onDark, complete }: {
  weekStart: string; selected: DayOfWeek; onSelect: (d: DayOfWeek) => void; onDark?: boolean; complete?: (d: DayOfWeek) => boolean
}) {
  const [width, setWidth] = useState(0)
  const idx = Math.max(0, DAY_OPTIONS.findIndex(d => d.val === selected))
  const x = useRef(new Animated.Value(idx)).current
  useEffect(() => { Animated.spring(x, { toValue: idx, useNativeDriver: true, bounciness: 8, speed: 14 }).start() }, [idx, x])
  const PAD = 6, GAP = 4
  const cell = width > 0 ? (width - PAD * 2 - GAP * 6) / 7 : 0
  const monday = new Date(weekStart + 'T00:00:00')
  const todayKey = new Date().toDateString()

  return (
    <View
      onLayout={e => setWidth(e.nativeEvent.layout.width)}
      style={{ flexDirection: 'row', gap: GAP, padding: PAD, borderRadius: R.lg, backgroundColor: onDark ? C.white10 : '#FFFFFF' }}
      accessibilityRole="tablist"
    >
      {cell > 0 && (
        <Animated.View pointerEvents="none" style={{
          position: 'absolute', top: PAD, bottom: PAD, left: PAD, width: cell, borderRadius: R.md, backgroundColor: onDark ? C.creme : C.foret,
          transform: [{ translateX: x.interpolate({ inputRange: [0, 6], outputRange: [0, 6 * (cell + GAP)] }) }],
        }} />
      )}
      {DAY_OPTIONS.map((d, i) => {
        const date = new Date(monday); date.setDate(monday.getDate() + i)
        const active = d.val === selected
        const today = date.toDateString() === todayKey
        const done = complete?.(d.val) ?? false
        const dot = complete ? (done ? (active ? C.sauge : C.foret500) : 'transparent') : today ? (active ? C.orange : C.jaune) : 'transparent'
        const fg = active ? (onDark ? C.foret : C.creme) : (onDark ? C.creme : C.profond)
        const sub = active ? (onDark ? C.foret500 : C.foret100) : (onDark ? C.foret100 : C.texte2)
        return (
          <Pressable key={d.val} onPress={() => onSelect(d.val)} accessibilityRole="tab" accessibilityState={{ selected: active }}
            accessibilityLabel={`${d.full} ${date.getDate()}${done ? ', complet' : ''}`}
            style={{ flex: 1, height: 58, alignItems: 'center', justifyContent: 'center', gap: 2 }}>
            <Txt style={{ fontFamily: F.bodySemi, fontSize: 11, color: sub }}>{d.label}</Txt>
            <Txt style={{ fontFamily: F.title, fontSize: 17, color: fg }}>{date.getDate()}</Txt>
            <View style={{ width: 5, height: 5, borderRadius: 3, backgroundColor: dot }} />
          </Pressable>
        )
      })}
    </View>
  )
}

// ─── Ligne de temps des repas d'un jour ──────────────────────────────────────

export interface TimelineChip { icon: LucideIcon; name: string }
export interface TimelineEntry {
  mealType: MealType
  time: string | null
  isNext: boolean
  meal: { title: string; photoUrl: string | null; prepTimeMin: number | null; servings: number | null; chips: TimelineChip[] } | null
}

export function DayTimeline({ entries, onOpen }: { entries: TimelineEntry[]; onOpen: () => void }) {
  return (
    <View>
      {entries.map((e, i) => {
        const color = MEAL_COLOR[e.mealType]
        const badge = e.time ? `${MEAL_LABEL[e.mealType]} · ${e.time}` : MEAL_LABEL[e.mealType]
        const last = i === entries.length - 1
        return (
          <View key={e.mealType} style={{ flexDirection: 'row', gap: 10 }}>
            <View style={{ width: 12, alignItems: 'center', paddingTop: 20 }}>
              <View style={{ width: 12, height: 12, borderRadius: 6, backgroundColor: color.text, borderWidth: 3, borderColor: C.creme }} />
              {!last && <View style={{ flex: 1, width: 1, marginTop: 4, backgroundColor: C.filet }} />}
            </View>
            <View style={{ flex: 1, paddingBottom: last ? 0 : 12 }}>
              {e.meal ? (
                <Pressable onPress={onOpen} accessibilityRole="button" accessibilityLabel={`${badge} : ${e.meal.title}`}
                  style={({ pressed }) => ({ backgroundColor: '#FFFFFF', borderRadius: R.lg, padding: 10, transform: [{ scale: pressed ? 0.99 : 1 }] })}>
                  <View style={{ flexDirection: 'row', alignItems: 'center', gap: 12 }}>
                    <View style={{ width: 56, height: 56, borderRadius: R.md, overflow: 'hidden', backgroundColor: color.bg, alignItems: 'center', justifyContent: 'center' }}>
                      {e.meal.photoUrl
                        ? <Image source={{ uri: e.meal.photoUrl }} style={{ width: '100%', height: '100%' }} />
                        : <MealTypeIcon type={e.mealType} size={24} />}
                    </View>
                    <View style={{ flex: 1, gap: 3 }}>
                      <View style={{ flexDirection: 'row', flexWrap: 'wrap', gap: 6 }}>
                        <View style={{ flexDirection: 'row', alignItems: 'center', gap: 4, borderRadius: R.pill, paddingHorizontal: 8, paddingVertical: 2, backgroundColor: color.bg }}>
                          <MealTypeIcon type={e.mealType} size={11} />
                          <Txt style={{ fontFamily: F.bodyBold, fontSize: 11, color: color.text }}>{badge}</Txt>
                        </View>
                        {e.isNext && (
                          <View style={{ borderRadius: R.pill, paddingHorizontal: 8, paddingVertical: 2, backgroundColor: C.jaune50 }}>
                            <Txt style={{ fontFamily: F.bodyBold, fontSize: 11, color: C.jauneText }}>Prochain</Txt>
                          </View>
                        )}
                      </View>
                      <Txt numberOfLines={2} style={{ fontFamily: F.titleBold, fontSize: 16, lineHeight: 20, color: C.profond }}>{e.meal.title}</Txt>
                      {(e.meal.prepTimeMin || e.meal.servings) ? (
                        <View style={{ flexDirection: 'row', gap: 12 }}>
                          {!!e.meal.prepTimeMin && <InlineMeta icon={Clock} text={`${e.meal.prepTimeMin} min`} />}
                          {!!e.meal.servings && <InlineMeta icon={Users} text={`${e.meal.servings} pers.`} />}
                        </View>
                      ) : null}
                    </View>
                    <ChevronRight size={20} color={C.foret300} />
                  </View>
                  {e.meal.chips.length > 0 && (
                    <View style={{ flexDirection: 'row', flexWrap: 'wrap', gap: 6, marginTop: 8, paddingTop: 8, borderTopWidth: 1, borderColor: C.lin }}>
                      {e.meal.chips.map((c, j) => (
                        <View key={j} style={{ flexDirection: 'row', alignItems: 'center', gap: 4, height: 28, maxWidth: 170, paddingHorizontal: 10, borderRadius: R.pill, backgroundColor: C.lin }}>
                          <c.icon size={12} color={C.foret} />
                          <Txt numberOfLines={1} style={{ fontFamily: F.bodySemi, fontSize: 12, color: C.profond }}>{c.name}</Txt>
                        </View>
                      ))}
                    </View>
                  )}
                </Pressable>
              ) : (
                <Pressable onPress={onOpen} accessibilityRole="button" accessibilityLabel={`Planifier le ${MEAL_FULL_LABEL[e.mealType]}`}
                  style={{ minHeight: 64, flexDirection: 'row', alignItems: 'center', gap: 12, paddingHorizontal: 12, paddingVertical: 10, borderRadius: R.lg, borderWidth: 1.5, borderStyle: 'dashed', borderColor: C.filet }}>
                  <View style={{ width: 40, height: 40, borderRadius: R.pill, backgroundColor: color.bg, alignItems: 'center', justifyContent: 'center' }}>
                    <MealTypeIcon type={e.mealType} size={20} />
                  </View>
                  <View style={{ flex: 1 }}>
                    <Txt style={{ fontFamily: F.titleBold, fontSize: 15, color: C.profond }}>{badge}</Txt>
                    <Txt variant="meta">Planifier le {MEAL_FULL_LABEL[e.mealType]}</Txt>
                  </View>
                  <View style={{ width: 36, height: 36, borderRadius: R.pill, backgroundColor: '#FFFFFF', alignItems: 'center', justifyContent: 'center' }}>
                    <Plus size={16} color={C.foret} />
                  </View>
                </Pressable>
              )}
            </View>
          </View>
        )
      })}
    </View>
  )
}

function InlineMeta({ icon: Icon, text }: { icon: LucideIcon; text: string }) {
  return (
    <View style={{ flexDirection: 'row', alignItems: 'center', gap: 4 }}>
      <Icon size={12} color={C.texte2} />
      <Txt variant="meta">{text}</Txt>
    </View>
  )
}

// ─── Les prochains jours ─────────────────────────────────────────────────────

export interface UpcomingDay { key: string; dayShort: string; dayNum: number; lunchTitle: string | null; dinnerTitle: string | null; agreementPct: number | null }

export function UpcomingList({ days, onOpen }: { days: UpcomingDay[]; onOpen: () => void }) {
  return (
    <View style={{ backgroundColor: '#FFFFFF', borderRadius: R.xl, overflow: 'hidden' }}>
      {days.map((d, i) => (
        <Pressable key={d.key} onPress={onOpen} accessibilityRole="button"
          style={({ pressed }) => ({ flexDirection: 'row', alignItems: 'center', gap: 12, padding: 12, borderTopWidth: i ? 1 : 0, borderColor: C.lin, backgroundColor: pressed ? C.creme : '#FFFFFF' })}>
          <View style={{ width: 48, height: 56, borderRadius: R.md, backgroundColor: C.foret50, alignItems: 'center', justifyContent: 'center' }}>
            <Txt style={{ fontFamily: F.bodySemi, fontSize: 11, color: C.texte2 }}>{d.dayShort}</Txt>
            <Txt style={{ fontFamily: F.title, fontSize: 18, color: C.foret }}>{d.dayNum}</Txt>
          </View>
          <View style={{ flex: 1, gap: 4 }}>
            <View style={{ flexDirection: 'row', alignItems: 'center', gap: 6 }}>
              <UtensilsCrossed size={14} color={C.orangeText} />
              <Txt numberOfLines={1} style={{ flex: 1, fontFamily: d.lunchTitle ? F.bodySemi : F.body, fontSize: 14, color: d.lunchTitle ? C.profond : C.texte2 }}>{d.lunchTitle ?? 'Midi à planifier'}</Txt>
            </View>
            <View style={{ flexDirection: 'row', alignItems: 'center', gap: 6 }}>
              <Moon size={14} color={C.foret} />
              <Txt numberOfLines={1} style={{ flex: 1, fontSize: 14, color: d.dinnerTitle ? C.profond : C.texte2 }}>{d.dinnerTitle ?? 'Soir à planifier'}</Txt>
            </View>
          </View>
          {d.agreementPct !== null && (
            <View style={{ flexDirection: 'row', alignItems: 'center', gap: 4, borderRadius: R.pill, paddingHorizontal: 8, paddingVertical: 4, backgroundColor: C.sauge50 }}>
              <ThumbsUp size={12} color={C.foret500} />
              <Txt style={{ fontFamily: F.bodyBold, fontSize: 12, color: C.foret500 }}>{d.agreementPct}%</Txt>
            </View>
          )}
        </Pressable>
      ))}
    </View>
  )
}

// ─── Astuce du jour ──────────────────────────────────────────────────────────

export function TipCard({ recipeId, recipeName, tip }: { recipeId: string; recipeName: string; tip: string }) {
  return (
    <Card padding={16}>
      <View style={{ flexDirection: 'row', alignItems: 'center', gap: 8 }}>
        <View style={{ width: 28, height: 28, borderRadius: R.pill, backgroundColor: C.jaune50, alignItems: 'center', justifyContent: 'center' }}>
          <Lightbulb size={16} color={C.jaune700} />
        </View>
        <Txt style={{ fontFamily: F.bodyBold, fontSize: 12, color: C.jauneText }}>Astuce du jour</Txt>
      </View>
      <Txt variant="small" numberOfLines={4} style={{ marginTop: 8, fontSize: 14 }}>{tip}</Txt>
      <Pressable onPress={() => router.push(`/recipes/${recipeId}`)} accessibilityRole="link" style={{ minHeight: 44, flexDirection: 'row', alignItems: 'center', gap: 2 }}>
        <Txt numberOfLines={1} style={{ fontFamily: F.bodyBold, fontSize: 14, color: C.foret, flexShrink: 1 }}>Voir « {recipeName} »</Txt>
        <ChevronRight size={16} color={C.foret} />
      </Pressable>
    </Card>
  )
}

// ─── Anneau d'accord ─────────────────────────────────────────────────────────

const RR = 15.9155
export function Ring({ pct, size = 72, onDark, label }: { pct: number | null; size?: number; onDark?: boolean; label?: string }) {
  const value = pct ?? 0
  return (
    <View style={{ width: size, height: size, alignItems: 'center', justifyContent: 'center' }}>
      <Svg viewBox="0 0 36 36" width={size} height={size} style={{ position: 'absolute', transform: [{ rotate: '-90deg' }] }}>
        <Circle cx="18" cy="18" r={RR} fill="none" stroke={onDark ? 'rgba(255,255,255,0.14)' : C.sauge50} strokeWidth={3.4} />
        {pct !== null && (
          <Circle cx="18" cy="18" r={RR} fill="none" stroke={onDark ? C.sauge : C.foret500} strokeWidth={3.4} strokeLinecap="round" strokeDasharray={`${value} 100`} />
        )}
      </Svg>
      {pct !== null
        ? <Txt style={{ fontFamily: F.title, fontSize: Math.round(size * 0.22), color: onDark ? C.creme : C.foret }}>{pct}%</Txt>
        : <MessageCircleHeart size={Math.round(size * 0.32)} color={onDark ? C.sauge : C.foret500} />}
      {!!label && pct !== null && <Txt style={{ fontFamily: F.bodyBold, fontSize: 11, color: onDark ? C.foret100 : C.texte2 }}>{label}</Txt>}
    </View>
  )
}

// ─── Avis de la famille sur le menu ──────────────────────────────────────────

export function FamilyPulseCard({ planId, shareToken, respondentCount, memberCount, agreementPct, sharePayload, onOpenResults }: {
  planId: string | null; shareToken: string | null; respondentCount: number; memberCount: number; agreementPct: number | null
  sharePayload: () => Promise<SharePayload | null>; onOpenResults: () => void
}) {
  const message = !planId
    ? 'Génère ton menu pour demander l’avis de ta famille.'
    : !shareToken
      ? 'Partage le sondage : chacun donne son avis en un geste.'
      : respondentCount === 0
        ? 'Le sondage est parti, les premiers avis arrivent bientôt.'
        : `${respondentCount} sur ${memberCount} ${respondentCount > 1 ? 'ont' : 'a'} donné son avis.`
  return (
    <Card padding={16} style={{ gap: 14 }}>
      <View style={{ flexDirection: 'row', alignItems: 'center', gap: 16 }}>
        <Ring pct={agreementPct} />
        <View style={{ flex: 1 }}>
          <Txt variant="h3">L’avis de la famille</Txt>
          {agreementPct !== null && <Txt style={{ fontFamily: F.bodySemi, fontSize: 12, color: C.foret500 }}>apprécient le menu</Txt>}
          <Txt variant="small" style={{ marginTop: 4 }}>{message}</Txt>
        </View>
      </View>
      {planId && <ShareActions getPayload={sharePayload} />}
      {planId && shareToken && respondentCount > 0 && (
        <Pressable onPress={onOpenResults} accessibilityRole="button" style={{ height: 44, flexDirection: 'row', alignItems: 'center', justifyContent: 'center', gap: 2 }}>
          <Txt style={{ fontFamily: F.bodyBold, fontSize: 14, color: C.foret }}>Lire les avis</Txt>
          <ChevronRight size={16} color={C.foret} />
        </Pressable>
      )}
    </Card>
  )
}

import { useCallback, useState } from 'react'
import { Image, Pressable, TextInput, View } from 'react-native'
import Svg, { Circle } from 'react-native-svg'
import { Check, Heart, History, Lock, Mic, ShieldCheck, Sparkles, Star } from 'lucide-react-native'
import { Bone, Button, EmptyState, MealTypeIcon, Screen, Txt, useReloadOnFocus } from '@/components/ui'
import { get, request } from '@/lib/api'
import { toast } from '@/lib/toast'
import { composedName } from '@/shared/composed-name'
import { MEAL_LABEL, type MealType } from '@/shared/meal-type'
import { formatWeekRange, getMondayISO } from '@/shared/week'
import { C, F, R } from '@/theme'

type Rating = 'excellent' | 'correct' | 'decevant'
type Status = 'past' | 'today' | 'future'
interface Composition { role: string; sort_order: number; recipes: { name: string } | null }
interface MealPlanItem { id: string; meal_type: MealType; day_of_week: string; applies_all_days: boolean; recipes: { name: string; photo_url: string | null } | null; meal_compositions: Composition[] }
interface MealPlan { id: string; week_start: string; meal_plan_items: MealPlanItem[] }
interface FeedbackEntry { id: string; meal_plan_item_id: string; rating: Rating; message: string | null; created_at: string }
interface HistoryEntry extends FeedbackEntry { week_start: string | null; item: MealPlanItem }
interface FamilyResponse { role: 'planificatrice' | 'membre' | null; is_active: boolean; planner_name: string | null; plan: MealPlan | null; meal_times: Record<string, string> }
interface Template { id: string; category: Rating; message: string }

const DAY_ORDER = ['lundi', 'mardi', 'mercredi', 'jeudi', 'vendredi', 'samedi', 'dimanche']
const MEAL_ORDER: MealType[] = ['petit_dejeuner', 'dejeuner', 'gouter', 'diner']
// Émojis de réaction en échappements unicode (cf. CLAUDE.md).
const RATINGS: { value: Rating; emoji: string; label: string; hint: string; tone: string; light: string }[] = [
  { value: 'excellent', emoji: '\u{1F60A}', label: 'J’ai adoré', hint: 'Savoureux & riche', tone: C.foret500, light: C.sauge50 },
  { value: 'correct', emoji: '\u{1F610}', label: 'Ça passe', hint: 'Bien dosé', tone: C.jauneText, light: C.jaune50 },
  { value: 'decevant', emoji: '\u{1F615}', label: 'Pas trop', hint: 'À réajuster', tone: C.danger, light: C.dangerLight },
]
const RATING_EMOJI: Record<Rating, string> = { excellent: '\u{1F60A}', correct: '\u{1F610}', decevant: '\u{1F615}' }
const CATCH_UP_SHOWN = 4

function statusOfDay(day: string, weekStart: string): Status {
  const idx = DAY_ORDER.indexOf(day)
  const d = new Date(`${weekStart}T00:00:00`); d.setDate(d.getDate() + (idx >= 0 ? idx : 0))
  const t = new Date(); t.setHours(0, 0, 0, 0)
  if (d < t) return 'past'
  if (d.getTime() === t.getTime()) return 'today'
  return 'future'
}
const cap = (s: string) => s.charAt(0).toUpperCase() + s.slice(1)
const dayLabel = (i: MealPlanItem) => (i.applies_all_days ? 'Toute la semaine' : cap(i.day_of_week))
const sidesOf = (i: MealPlanItem) => [...i.meal_compositions].sort((a, b) => a.sort_order - b.sort_order).map(c => c.recipes?.name).filter(Boolean).join(' · ')
const fmtTime = (t: string | undefined) => (t ? t.replace(':', 'h') : null)

function Thumb({ item, size }: { item: MealPlanItem; size: number }) {
  return (
    <View style={{ width: size, height: size, borderRadius: R.sm, overflow: 'hidden', backgroundColor: C.orange50, alignItems: 'center', justifyContent: 'center' }}>
      {item.recipes?.photo_url ? <Image source={{ uri: item.recipes.photo_url }} style={{ width: '100%', height: '100%' }} /> : <MealTypeIcon type={item.meal_type} size={24} color={C.orange} />}
    </View>
  )
}

function SectionLabel({ children, color = C.texte2, icon }: { children: string; color?: string; icon?: React.ReactNode }) {
  return (
    <View style={{ flexDirection: 'row', alignItems: 'center', gap: 6 }}>
      {icon}
      <Txt style={{ fontFamily: F.bodyBold, fontSize: 11, letterSpacing: 1, textTransform: 'uppercase', color }}>{children}</Txt>
    </View>
  )
}

// Avis post-repas (cf. app/(app)/feedback/page.tsx).
export default function FeedbackScreen() {
  const [family, setFamily] = useState<FamilyResponse | null>(null)
  const [plan, setPlan] = useState<MealPlan | null>(null)
  const [feedbacks, setFeedbacks] = useState<FeedbackEntry[]>([])
  const [history, setHistory] = useState<HistoryEntry[]>([])
  const [loading, setLoading] = useState(true)
  const [focusId, setFocusId] = useState<string | null>(null)
  const [rating, setRating] = useState<Rating | null>(null)
  const [templates, setTemplates] = useState<Template[]>([])
  const [selectedTpl, setSelectedTpl] = useState<string | null>(null)
  const [customMsg, setCustomMsg] = useState('')
  const [submitting, setSubmitting] = useState(false)
  const [showAll, setShowAll] = useState(false)

  const load = useCallback(async () => {
    try {
      const [fam, hist] = await Promise.all([
        get<FamilyResponse>(`/api/meal-plans/family?week=${getMondayISO()}`),
        get<HistoryEntry[]>('/api/users/me/feedback?limit=40'),
      ])
      setFamily(fam)
      setHistory(Array.isArray(hist) ? hist : [])
      // Sans cercle : son propre menu.
      const planData = fam?.role ? fam.plan ?? null : await get<MealPlan>('/api/meal-plans')
      setPlan(planData?.id ? planData : null)
      if (!planData?.id) return
      // Planificatrice : tous les avis de la famille. Membre : les siens.
      const fb = await get<FeedbackEntry[]>(fam?.role === 'membre' ? `/api/users/me/feedback?plan=${planData.id}` : `/api/meal-plans/${planData.id}/feedback`)
      if (Array.isArray(fb)) setFeedbacks(fb)
    } catch {
      toast.error('Erreur de connexion')
    } finally {
      setLoading(false)
    }
  }, [])
  useReloadOnFocus(load)

  function focus(item: MealPlanItem) {
    setFocusId(item.id); setRating(null); setSelectedTpl(null); setCustomMsg(''); setTemplates([])
  }

  async function selectRating(value: Rating) {
    setRating(value); setSelectedTpl(null)
    const t = await get<Template[]>(`/api/feedback-templates?rating=${value}`)
    setTemplates(Array.isArray(t) ? t : [])
  }

  const planner = family?.role === 'membre' ? family.planner_name : null
  const cook = planner ?? 'la cuisine du foyer'
  const mealTimes = family?.meal_times ?? {}

  async function submit(item: MealPlanItem) {
    if (!rating) return
    setSubmitting(true)
    try {
      const res = await request<{ error?: string }>(`/api/meal-plan-items/${item.id}/feedback`, {
        method: 'POST', json: { rating, template_id: selectedTpl ?? undefined, custom_message: customMsg.trim() || undefined },
      })
      if (res.ok) {
        toast.success(planner ? `Avis envoyé à ${planner}` : 'Avis enregistré, merci !')
        setFocusId(null); setRating(null); setSelectedTpl(null); setCustomMsg('')
        await load()
      } else toast.error(res.data?.error ?? 'Impossible d’enregistrer ton avis')
    } catch {
      toast.error('Erreur de connexion')
    } finally {
      setSubmitting(false)
    }
  }

  if (loading) {
    return <Screen><Bone style={{ height: 90, width: '80%' }} /><Bone style={{ height: 420, borderRadius: R.xl }} /><Bone style={{ height: 80, borderRadius: R.xl }} /></Screen>
  }

  const currentIds = new Set(plan?.meal_plan_items.map(i => i.id) ?? [])
  const pastHistory = history.filter(h => !currentIds.has(h.meal_plan_item_id))
  const historySection = pastHistory.length > 0 ? (
    <View style={{ gap: 8 }}>
      <SectionLabel icon={<History size={14} color={C.texte2} />}>Mon historique d’avis</SectionLabel>
      {pastHistory.map(h => (
        <View key={h.id} style={{ flexDirection: 'row', gap: 12, borderRadius: R.lg, backgroundColor: '#FFFFFF', padding: 12 }}>
          <Thumb item={h.item} size={48} />
          <View style={{ flex: 1 }}>
            <Txt style={{ fontFamily: F.bodySemi, fontSize: 11, color: C.texte2 }}>
              {h.week_start ? `Semaine du ${formatWeekRange(h.week_start)} · ` : ''}{dayLabel(h.item)} · {MEAL_LABEL[h.item.meal_type]}
            </Txt>
            <View style={{ flexDirection: 'row', alignItems: 'center', gap: 6 }}>
              <Txt style={{ fontSize: 16 }}>{RATING_EMOJI[h.rating]}</Txt>
              <Txt numberOfLines={1} style={{ flex: 1, fontFamily: F.titleBold, fontSize: 14, color: C.profond }}>{composedName(h.item.recipes?.name, h.item.meal_compositions)}</Txt>
            </View>
            {!!h.message && <Txt variant="meta" style={{ marginTop: 2, fontStyle: 'italic' }}>“{h.message}”</Txt>}
          </View>
        </View>
      ))}
    </View>
  ) : null

  if (family?.role === 'membre' && !family.is_active) {
    return (
      <Screen onRefresh={load}>
        <Txt variant="h1">Mes avis sur les repas</Txt>
        <View style={{ borderRadius: R.xl, backgroundColor: '#FFFFFF' }}>
          <EmptyState icon={Lock} title="Ton accès au cercle est désactivé" description="Tu ne peux plus noter les repas de ce cercle, mais tu retrouves ci-dessous l’historique de tes avis." />
        </View>
        {historySection ?? <Txt variant="small" style={{ textAlign: 'center', fontStyle: 'italic' }}>Aucun avis donné pour l’instant.</Txt>}
      </Screen>
    )
  }

  if (!plan) {
    return (
      <Screen onRefresh={load}>
        <View style={{ borderRadius: R.xl, backgroundColor: '#FFFFFF' }}>
          <EmptyState icon={Star} title="Aucun menu cette semaine"
            description={planner ? `Dès que ${planner} aura préparé le menu, tu pourras donner ton avis sur chaque repas.` : 'Les repas de la semaine apparaîtront ici pour que tu puisses donner ton avis.'} />
        </View>
        {historySection}
      </Screen>
    )
  }

  const sorted = [...plan.meal_plan_items].sort((a, b) => (DAY_ORDER.indexOf(a.day_of_week) - DAY_ORDER.indexOf(b.day_of_week)) || (MEAL_ORDER.indexOf(a.meal_type) - MEAL_ORDER.indexOf(b.meal_type)))
  const fbMap = new Map(feedbacks.map(f => [f.meal_plan_item_id, f]))
  const statusOf = (i: MealPlanItem) => statusOfDay(i.applies_all_days ? 'lundi' : i.day_of_week, plan.week_start)
  const rateable = sorted.filter(i => statusOf(i) !== 'future')
  const rated = rateable.filter(i => fbMap.has(i.id))
  const toRate = rateable.filter(i => !fbMap.has(i.id))
  const upcoming = sorted.filter(i => statusOf(i) === 'future')
  const featured = toRate.find(i => i.id === focusId) ?? toRate.find(i => statusOf(i) === 'today') ?? toRate[0] ?? null
  const catchUp = toRate.filter(i => i.id !== featured?.id)
  const pct = rateable.length > 0 ? Math.round((rated.length / rateable.length) * 100) : 0
  const featuredTime = featured ? fmtTime(mealTimes[featured.meal_type]) : null

  return (
    <Screen onRefresh={load}>
      <View style={{ gap: 6 }}>
        <Txt style={{ fontFamily: F.bodySemi, fontSize: 12, color: C.texte2 }}>Semaine du {formatWeekRange(plan.week_start)}</Txt>
        <Txt variant="h1">Mes avis sur les repas</Txt>
        <Txt variant="small" style={{ fontSize: 14 }}>Pour guider {cook} avec amour sur les épices, le dosage du sel et les portions du foyer, en toute sérénité.</Txt>
      </View>

      {rateable.length > 0 && (
        <View style={{ flexDirection: 'row', alignItems: 'center', gap: 16, borderRadius: R.lg, backgroundColor: '#FFFFFF', padding: 16 }} accessibilityLabel={`${pct} % des repas notés`}>
          <View style={{ width: 56, height: 56, alignItems: 'center', justifyContent: 'center' }}>
            <Svg viewBox="0 0 36 36" width={56} height={56} style={{ position: 'absolute', transform: [{ rotate: '-90deg' }] }}>
              <Circle cx="18" cy="18" r={15.9155} fill="none" stroke={C.creme} strokeWidth={4} />
              <Circle cx="18" cy="18" r={15.9155} fill="none" stroke={C.orange} strokeWidth={4} strokeDasharray={`${pct} 100`} />
            </Svg>
            <Txt style={{ fontFamily: F.title, fontSize: 13, color: C.orange }}>{pct}%</Txt>
          </View>
          <View style={{ flex: 1 }}>
            <Txt variant="smallBold" style={{ fontSize: 14 }}>{rated.length} repas sur {rateable.length} notés</Txt>
            <Txt variant="meta">{rated.length > 0 ? 'Merci ! Tes retours aident à préparer le marché.' : 'Note les repas déjà servis cette semaine.'}</Txt>
          </View>
        </View>
      )}

      {featured ? (
        <View style={{ gap: 12 }}>
          <View style={{ flexDirection: 'row', flexWrap: 'wrap', alignItems: 'center', justifyContent: 'space-between', gap: 8 }}>
            <SectionLabel color={C.orangeText}>{statusOf(featured) === 'today' ? 'À noter aujourd’hui' : 'À noter'}</SectionLabel>
            <View style={{ flexDirection: 'row', alignItems: 'center', gap: 6, borderRadius: R.pill, backgroundColor: C.orange50, paddingHorizontal: 10, paddingVertical: 4 }}>
              <MealTypeIcon type={featured.meal_type} size={14} color={C.orangeText} />
              <Txt style={{ fontFamily: F.bodyBold, fontSize: 12, color: C.orangeText }}>{dayLabel(featured)} · {MEAL_LABEL[featured.meal_type]}{featuredTime ? ` · ${featuredTime}` : ''}</Txt>
            </View>
          </View>

          <View style={{ borderRadius: R.xl, borderWidth: 2, borderColor: C.orange, backgroundColor: '#FFFFFF', overflow: 'hidden' }}>
            <View style={{ height: 200, backgroundColor: C.foret500 }}>
              {featured.recipes?.photo_url && <Image source={{ uri: featured.recipes.photo_url }} style={{ position: 'absolute', top: 0, left: 0, right: 0, bottom: 0 }} resizeMode="cover" />}
              <View style={{ position: 'absolute', left: 0, right: 0, bottom: 0, height: '70%' }}>
                <View style={{ flex: 1, backgroundColor: 'rgba(0,0,0,0.05)' }} /><View style={{ flex: 1, backgroundColor: 'rgba(0,0,0,0.3)' }} /><View style={{ flex: 1.3, backgroundColor: 'rgba(0,0,0,0.62)' }} />
              </View>
              <View style={{ position: 'absolute', left: 12, top: 12, flexDirection: 'row', alignItems: 'center', gap: 6, borderRadius: R.pill, backgroundColor: 'rgba(255,255,255,0.92)', paddingHorizontal: 10, paddingVertical: 4 }}>
                <MealTypeIcon type={featured.meal_type} size={14} color={C.orange} />
                <Txt style={{ fontFamily: F.bodyBold, fontSize: 11, color: C.profond }}>
                  {statusOf(featured) === 'today' ? `Servi aujourd’hui${featuredTime ? ` à ${featuredTime}` : ''}` : `Servi ${featured.applies_all_days ? 'cette semaine' : featured.day_of_week}`}
                </Txt>
              </View>
              <View style={{ position: 'absolute', left: 16, right: 16, bottom: 12 }}>
                <Txt style={{ fontFamily: F.title, fontSize: 19, lineHeight: 23, color: '#FFFFFF' }}>{featured.recipes?.name ?? composedName(null, featured.meal_compositions)}</Txt>
                {!!sidesOf(featured) && <Txt style={{ fontSize: 13, color: 'rgba(255,255,255,0.85)' }}>Accompagnements : {sidesOf(featured)}</Txt>}
              </View>
            </View>

            <View style={{ padding: 16, gap: 16 }}>
              <View>
                <Txt variant="h3">Comment était ce repas pour toi ?</Txt>
                <Txt variant="small">Un ressenti sincère et doux pour parfaire la prochaine recette</Txt>
              </View>
              <View style={{ flexDirection: 'row', gap: 8 }}>
                {RATINGS.map(r => {
                  const active = rating === r.value
                  return (
                    <Pressable key={r.value} onPress={() => { if (featured.id !== focusId) setFocusId(featured.id); void selectRating(r.value) }}
                      accessibilityRole="button" accessibilityState={{ selected: active }} accessibilityLabel={r.label}
                      style={{ flex: 1, alignItems: 'center', gap: 4, borderRadius: R.md, borderWidth: 2, paddingHorizontal: 4, paddingVertical: 10,
                        backgroundColor: active ? r.light : C.creme, borderColor: active ? r.tone : C.lin }}>
                      <Txt style={{ fontSize: 26, lineHeight: 32 }}>{r.emoji}</Txt>
                      <Txt style={{ fontFamily: F.bodyBold, fontSize: 12, color: active ? r.tone : C.texte2 }}>{r.label}</Txt>
                      {active && <Txt style={{ fontSize: 11, color: r.tone }}>{r.hint}</Txt>}
                    </Pressable>
                  )
                })}
              </View>

              {rating && templates.length > 0 && (
                <View style={{ gap: 8 }}>
                  <SectionLabel>Impressions rapides (optionnel)</SectionLabel>
                  <View style={{ flexDirection: 'row', flexWrap: 'wrap', gap: 6 }}>
                    {templates.map(t => {
                      const active = selectedTpl === t.id
                      const tone = RATINGS.find(r => r.value === rating)!
                      return (
                        <Pressable key={t.id} onPress={() => setSelectedTpl(active ? null : t.id)} accessibilityRole="button" accessibilityState={{ selected: active }}
                          style={{ borderRadius: R.pill, borderWidth: 1, borderColor: tone.tone, backgroundColor: active ? tone.tone : tone.light, paddingHorizontal: 12, paddingVertical: 6 }}>
                          <Txt style={{ fontFamily: F.bodySemi, fontSize: 12, color: active ? '#FFFFFF' : tone.tone }}>{t.message}</Txt>
                        </Pressable>
                      )
                    })}
                  </View>
                </View>
              )}

              <View style={{ justifyContent: 'center' }}>
                <TextInput value={customMsg} onChangeText={setCustomMsg} placeholder={`Un petit mot doux ou un conseil pour ${planner ?? 'la cuisine'}`} placeholderTextColor={C.texte2}
                  accessibilityLabel="Commentaire"
                  style={{ minHeight: 46, borderRadius: R.sm, borderWidth: 1, borderColor: C.filet, backgroundColor: C.creme, paddingLeft: 12, paddingRight: 40, fontFamily: F.body, fontSize: 14, color: C.profond }} />
                <Pressable onPress={() => toast.info('Bientôt disponible')} accessibilityLabel="Dicter un message" hitSlop={8} style={{ position: 'absolute', right: 10 }}>
                  <Mic size={16} color={C.texte2} />
                </Pressable>
              </View>

              <Button label={submitting ? 'Envoi…' : 'Enregistrer mon avis'} icon={Sparkles} tone="orange" size="lg" full loading={submitting} disabled={!rating} onPress={() => void submit(featured)} />
              {planner && (
                <View style={{ flexDirection: 'row', alignItems: 'center', justifyContent: 'center', gap: 6 }}>
                  <ShieldCheck size={14} color={C.foret500} /><Txt variant="meta">Transmis uniquement à {planner}</Txt>
                </View>
              )}
            </View>
          </View>
        </View>
      ) : (
        <View style={{ borderRadius: R.xl, backgroundColor: '#FFFFFF' }}>
          <EmptyState icon={Check} title={rateable.length > 0 ? 'Tout est noté, merci !' : 'Rien à noter pour l’instant'}
            description={rateable.length > 0 ? `Tes avis aident ${cook} à préparer la suite de la semaine.` : 'Les repas s’ouvrent à la notation le jour où ils sont servis.'} />
        </View>
      )}

      {catchUp.length > 0 && (
        <View style={{ gap: 8 }}>
          <SectionLabel>À rattraper</SectionLabel>
          {(showAll ? catchUp : catchUp.slice(0, CATCH_UP_SHOWN)).map(item => (
            <Pressable key={item.id} onPress={() => focus(item)} accessibilityRole="button"
              style={({ pressed }) => ({ flexDirection: 'row', alignItems: 'center', gap: 12, borderRadius: R.lg, borderWidth: 1, borderColor: pressed ? C.orange : C.lin, backgroundColor: '#FFFFFF', padding: 12 })}>
              <MealTypeIcon type={item.meal_type} size={20} color={C.orange} />
              <View style={{ flex: 1 }}>
                <Txt style={{ fontFamily: F.bodySemi, fontSize: 11, color: C.texte2 }}>{dayLabel(item)} · {MEAL_LABEL[item.meal_type]}</Txt>
                <Txt numberOfLines={1} style={{ fontFamily: F.titleBold, fontSize: 14, color: C.profond }}>{composedName(item.recipes?.name, item.meal_compositions)}</Txt>
              </View>
              <View style={{ borderRadius: R.pill, backgroundColor: C.foret, paddingHorizontal: 12, paddingVertical: 4 }}>
                <Txt style={{ fontFamily: F.bodyBold, fontSize: 11, color: C.creme }}>Noter</Txt>
              </View>
            </Pressable>
          ))}
          {catchUp.length > CATCH_UP_SHOWN && (
            <Button label={showAll ? 'Réduire' : `Voir les ${catchUp.length - CATCH_UP_SHOWN} autres`} tone="link" onPress={() => setShowAll(v => !v)} />
          )}
        </View>
      )}

      {rated.length > 0 && (
        <View style={{ gap: 8 }}>
          <View style={{ flexDirection: 'row', alignItems: 'center', gap: 8 }}>
            <SectionLabel>Déjà notés cette semaine</SectionLabel>
            <View style={{ borderRadius: R.pill, backgroundColor: C.sauge50, paddingHorizontal: 8, paddingVertical: 2 }}>
              <Txt style={{ fontFamily: F.bodyBold, fontSize: 11, color: C.foret500 }}>{rated.length} repas</Txt>
            </View>
          </View>
          {rated.map(item => {
            const fb = fbMap.get(item.id)!
            return (
              <View key={item.id} style={{ flexDirection: 'row', gap: 12, borderRadius: R.lg, backgroundColor: '#FFFFFF', padding: 12 }}>
                <Thumb item={item} size={64} />
                <View style={{ flex: 1, gap: 4 }}>
                  <View style={{ flexDirection: 'row', alignItems: 'center', justifyContent: 'space-between', gap: 6 }}>
                    <View style={{ borderRadius: R.pill, backgroundColor: C.creme, paddingHorizontal: 8, paddingVertical: 2, flexShrink: 1 }}>
                      <Txt numberOfLines={1} style={{ fontFamily: F.bodyBold, fontSize: 10, color: C.texte2 }}>{dayLabel(item)} · {MEAL_LABEL[item.meal_type]}</Txt>
                    </View>
                    <View style={{ flexDirection: 'row', alignItems: 'center', gap: 3, borderRadius: R.pill, backgroundColor: C.sauge50, paddingHorizontal: 8, paddingVertical: 2 }}>
                      <Txt style={{ fontFamily: F.bodyBold, fontSize: 10, color: C.foret500 }}>Transmis</Txt><Check size={12} color={C.foret500} />
                    </View>
                  </View>
                  <View style={{ flexDirection: 'row', alignItems: 'center', gap: 6 }}>
                    <Txt style={{ fontSize: 16 }}>{RATING_EMOJI[fb.rating]}</Txt>
                    <Txt numberOfLines={1} style={{ flex: 1, fontFamily: F.titleBold, fontSize: 14, color: C.profond }}>{composedName(item.recipes?.name, item.meal_compositions)}</Txt>
                  </View>
                  {!!fb.message && <Txt variant="small" style={{ fontStyle: 'italic' }}>“{fb.message}”</Txt>}
                </View>
              </View>
            )
          })}
        </View>
      )}

      {upcoming.length > 0 && (
        <View style={{ gap: 8 }}>
          <View style={{ flexDirection: 'row', alignItems: 'baseline', justifyContent: 'space-between' }}>
            <SectionLabel>Repas à venir</SectionLabel>
            <Txt variant="meta">À évaluer plus tard</Txt>
          </View>
          <View style={{ gap: 8, opacity: 0.5 }} accessibilityState={{ disabled: true }}>
            {upcoming.map(item => {
              const time = fmtTime(mealTimes[item.meal_type])
              return (
                <View key={item.id} style={{ flexDirection: 'row', alignItems: 'center', gap: 12, borderRadius: R.lg, backgroundColor: '#FFFFFF', padding: 12 }}>
                  <Lock size={16} color={C.texte2} />
                  <View style={{ flex: 1 }}>
                    <Txt numberOfLines={1} variant="bodySemi" style={{ fontSize: 14 }}>{composedName(item.recipes?.name, item.meal_compositions)}</Txt>
                    <Txt style={{ fontSize: 11, color: C.texte2 }}>{dayLabel(item)} · {MEAL_LABEL[item.meal_type]}{time ? ` (${time})` : ''}</Txt>
                  </View>
                  <View style={{ borderRadius: R.pill, borderWidth: 1, borderColor: C.filet, backgroundColor: C.creme, paddingHorizontal: 8, paddingVertical: 2 }}>
                    <Txt style={{ fontFamily: F.bodySemi, fontSize: 11, color: C.texte2 }}>Dès {item.day_of_week}</Txt>
                  </View>
                </View>
              )
            })}
          </View>
        </View>
      )}

      <View style={{ flexDirection: 'row', alignItems: 'flex-start', gap: 12, borderRadius: R.lg, backgroundColor: '#FFFFFF', padding: 16 }}>
        <Heart size={20} color={C.orange} />
        <Txt variant="small" style={{ flex: 1 }}>Chaque retour aide {cook} à doser les condiments, éviter le gaspillage et dresser la liste du grand marché du samedi avec l’esprit léger.</Txt>
      </View>

      {historySection}
    </Screen>
  )
}

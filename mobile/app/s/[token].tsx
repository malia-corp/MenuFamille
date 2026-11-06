import { useEffect, useRef, useState } from 'react'
import { ActivityIndicator, Animated, Image, KeyboardAvoidingView, Platform, Pressable, ScrollView, TextInput, View } from 'react-native'
import { useSafeAreaInsets } from 'react-native-safe-area-context'
import AsyncStorage from '@react-native-async-storage/async-storage'
import { router, useLocalSearchParams } from 'expo-router'
import { ArrowRight, CalendarDays, Check, Clock, CupSoda, Lock, MessageCircle, Salad, Send, Tag, UserCircle, Utensils, XCircle, type LucideIcon } from 'lucide-react-native'
import { Logo, LogoLoaderScreen } from '@/components/brand/Logo'
import { Button, Txt } from '@/components/ui'
import { request } from '@/lib/api'
import { useSession } from '@/lib/session'
import { toast } from '@/lib/toast'
import { MEAL_LABEL, MEAL_TYPE_ORDER, type MealType } from '@/shared/meal-type'
import { MEAL_ICON } from '@/shared/meal-type-icon'
import { DAY_OPTIONS, formatWeekRange, type DayOfWeek } from '@/shared/week'
import { C, F, R, SHADOW } from '@/theme'

type Reaction = 'aime' | 'bof' | 'naime_pas'
interface SurveyItem {
  id: string; day_of_week: DayOfWeek; meal_type: MealType; applies_all_days: boolean; servings: number
  recipe: { id: string; name: string; photo_url: string | null; description: string | null; prep_time_min: number | null; category: { icon: string | null; name: string } | null } | null
  compositions: { id: string; role: string; name: string | null }[]
}
interface SurveyData {
  plan: { id: string; week_start: string; planner_name: string | null; family_name: string | null }
  items: SurveyItem[]
  existing_response: { id: string; respondent_name: string; answers: { item_id: string; reaction: string; comment: string | null }[] } | null
  viewer: { display_name: string } | null
}
interface AnswerState { reaction: Reaction | null; comment: string }

const MOMENT: Record<MealType, string> = { petit_dejeuner: 'Matin', dejeuner: 'Midi', gouter: 'Après-midi', diner: 'Soir' }
const REACTIONS: { value: Reaction; emoji: string; label: string; bg: string; border: string; fg: string }[] = [
  { value: 'aime', emoji: '\u{1F60A}', label: 'J’adore', bg: C.sauge50, border: C.foret500, fg: C.foret },
  { value: 'bof', emoji: '\u{1F610}', label: 'Ça passe', bg: C.jaune50, border: C.jaune, fg: C.jauneText },
  { value: 'naime_pas', emoji: '\u{1F615}', label: 'Pas trop', bg: C.orange50, border: C.orange300, fg: C.orange700 },
]
const KEY_NAME = 'kkb_respondent_name'
const KEY_RESP = (t: string) => `kkb_survey_resp_${t}`
const KEY_DONE = (t: string) => `kkb_survey_done_${t}`

function PopEmoji({ emoji, trigger }: { emoji: string; trigger: number }) {
  const s = useRef(new Animated.Value(1)).current
  useEffect(() => {
    if (!trigger) return
    Animated.sequence([
      Animated.timing(s, { toValue: 1.45, duration: 140, useNativeDriver: true }),
      Animated.spring(s, { toValue: 1, useNativeDriver: true, bounciness: 14 }),
    ]).start()
  }, [trigger, s])
  return <Animated.Text style={{ fontSize: 22, lineHeight: 26, transform: [{ scale: s }] }}>{emoji}</Animated.Text>
}

// Carte de vote d'un repas (cf. components/survey/meal-vote-card.tsx).
function MealVoteCard({ label, withIcon, item, answer, onReact, onComment, onSaveComment, savingComment, justSaved, disabled }: {
  label: string; withIcon: boolean; item: SurveyItem; answer: AnswerState | undefined
  onReact: (r: Reaction) => void; onComment: (v: string) => void; onSaveComment: () => void; savingComment: boolean; justSaved: boolean; disabled: boolean
}) {
  const [open, setOpen] = useState(false)
  const [pops, setPops] = useState<Record<string, number>>({})
  const Icon = MEAL_ICON[item.meal_type]
  const sides = item.compositions.filter(c => c.role === 'side' && c.name)
  const drink = item.compositions.find(c => c.role === 'drink' && c.name)
  const reaction = answer?.reaction ?? null
  const comment = answer?.comment ?? ''
  return (
    <View style={{ borderRadius: R.xl, backgroundColor: '#FFFFFF', padding: 6 }}>
      <View style={{ aspectRatio: 16 / 10, borderRadius: R.lg, overflow: 'hidden', backgroundColor: C.orange50, alignItems: 'center', justifyContent: 'center' }}>
        {item.recipe?.photo_url
          ? <Image source={{ uri: item.recipe.photo_url }} style={{ position: 'absolute', top: 0, left: 0, right: 0, bottom: 0 }} resizeMode="cover" accessibilityLabel={item.recipe.name} />
          : <Icon size={48} color={C.orange300} />}
        <View style={{ position: 'absolute', left: 10, top: 10, maxWidth: '62%', flexDirection: 'row', alignItems: 'center', gap: 6, borderRadius: R.pill, backgroundColor: 'rgba(255,255,255,0.92)', paddingHorizontal: 12, paddingVertical: 6 }}>
          {withIcon && <Icon size={14} color={C.foret} />}
          <Txt numberOfLines={1} style={{ fontFamily: F.bodyBold, fontSize: 12, color: C.foret, flexShrink: 1 }}>{label}</Txt>
        </View>
        {item.recipe?.category && (
          <View style={{ position: 'absolute', right: 10, top: 10, maxWidth: '38%', flexDirection: 'row', alignItems: 'center', gap: 4, borderRadius: R.pill, backgroundColor: 'rgba(255,255,255,0.92)', paddingHorizontal: 10, paddingVertical: 6 }}>
            <Tag size={12} color={C.texte2} />
            <Txt numberOfLines={1} style={{ fontFamily: F.bodyBold, fontSize: 11, color: C.texte2, flexShrink: 1 }}>{item.recipe.category.name}</Txt>
          </View>
        )}
      </View>

      <View style={{ paddingHorizontal: 10, paddingTop: 12, gap: 6 }}>
        <Txt style={{ fontFamily: F.titleBold, fontSize: 18, lineHeight: 22, color: C.profond }}>{item.recipe?.name ?? 'Repas non défini'}</Txt>
        {(sides.length > 0 || drink) && (
          <View style={{ flexDirection: 'row', flexWrap: 'wrap', gap: 6 }}>
            {sides.map(s => (
              <View key={s.id} style={{ flexDirection: 'row', alignItems: 'center', gap: 4, borderRadius: R.pill, backgroundColor: C.lin, paddingHorizontal: 10, paddingVertical: 4 }}>
                <Salad size={14} color={C.profond} /><Txt style={{ fontFamily: F.bodySemi, fontSize: 12, color: C.profond }}>{s.name}</Txt>
              </View>
            ))}
            {drink && (
              <View style={{ flexDirection: 'row', alignItems: 'center', gap: 4, borderRadius: R.pill, backgroundColor: C.lin, paddingHorizontal: 10, paddingVertical: 4 }}>
                <CupSoda size={14} color={C.profond} /><Txt style={{ fontFamily: F.bodySemi, fontSize: 12, color: C.profond }}>{drink.name}</Txt>
              </View>
            )}
          </View>
        )}
        {!!item.recipe?.description && <Txt variant="small" numberOfLines={3}>{item.recipe.description}</Txt>}
      </View>

      <View style={{ flexDirection: 'row', gap: 8, paddingHorizontal: 4, paddingTop: 12 }}>
        {REACTIONS.map(r => {
          const active = reaction === r.value
          return (
            <Pressable key={r.value} disabled={disabled} onPress={() => { setPops(p => ({ ...p, [r.value]: (p[r.value] ?? 0) + 1 })); onReact(r.value) }}
              accessibilityRole="button" accessibilityLabel={r.label} accessibilityState={{ selected: active, disabled }}
              style={{ flex: 1, height: 64, alignItems: 'center', justifyContent: 'center', gap: 2, borderRadius: R.lg, borderWidth: 2, opacity: disabled ? 0.4 : 1,
                backgroundColor: active ? r.bg : C.creme, borderColor: active ? r.border : 'transparent' }}>
              <PopEmoji emoji={r.emoji} trigger={pops[r.value] ?? 0} />
              <Txt style={{ fontFamily: F.bodyBold, fontSize: 13, color: active ? r.fg : C.texte2 }}>{r.label}</Txt>
            </Pressable>
          )
        })}
        <Pressable disabled={disabled} onPress={() => setOpen(o => !o)} accessibilityRole="button" accessibilityLabel="Ajouter une note" accessibilityState={{ expanded: open }}
          style={{ width: 48, borderRadius: R.lg, alignItems: 'center', justifyContent: 'center', opacity: disabled ? 0.4 : 1, backgroundColor: open || comment ? C.foret : C.creme }}>
          <MessageCircle size={16} color={open || comment ? C.creme : C.foret} />
        </Pressable>
      </View>

      {open && (
        <View style={{ paddingHorizontal: 4, paddingTop: 10, paddingBottom: 6, gap: 8 }}>
          <TextInput value={comment} onChangeText={onComment} placeholder="Un mot pour la cuisine…" placeholderTextColor={C.texte2} multiline
            accessibilityLabel="Un mot pour la cuisine"
            style={{ minHeight: 64, borderRadius: R.md, backgroundColor: C.creme, paddingHorizontal: 14, paddingVertical: 10, fontFamily: F.body, fontSize: 15, color: C.profond, textAlignVertical: 'top' }} />
          <Button label="Enregistrer" tone="foret" size="sm" onPress={onSaveComment} disabled={!reaction} loading={savingComment} style={{ alignSelf: 'flex-start' }} />
          {!reaction && <Txt style={{ fontSize: 11, color: C.texte2 }}>Choisis d’abord une réaction pour enregistrer ta note.</Txt>}
        </View>
      )}

      <View style={{ paddingHorizontal: 10, paddingVertical: 6, flexDirection: 'row', alignItems: 'center', gap: 4, opacity: justSaved ? 1 : 0 }}>
        <Check size={12} color={C.foret500} /><Txt style={{ fontFamily: F.bodySemi, fontSize: 11, color: C.foret500 }}>Sauvegardé</Txt>
      </View>
    </View>
  )
}

function Separator({ label }: { label: string }) {
  return (
    <View style={{ marginVertical: 8, flexDirection: 'row', alignItems: 'center', gap: 12 }}>
      <View style={{ flex: 1, height: 1, backgroundColor: C.filet }} />
      <Txt style={{ fontFamily: F.bodyBold, fontSize: 12, color: C.texte2 }}>{label}</Txt>
      <View style={{ flex: 1, height: 1, backgroundColor: C.filet }} />
    </View>
  )
}

function StatusScreen({ icon: Icon, title, message }: { icon: LucideIcon; title: string; message: string }) {
  return (
    <View style={{ flex: 1, alignItems: 'center', justifyContent: 'center', gap: 12, paddingHorizontal: 24, backgroundColor: C.creme }}>
      <Icon size={48} color={C.texte2} />
      <Txt variant="h2" color={C.profond} style={{ textAlign: 'center' }}>{title}</Txt>
      <Txt variant="small" style={{ textAlign: 'center', fontSize: 14 }}>{message}</Txt>
      <Button label="Retour à l’accueil" tone="foret" onPress={() => router.replace('/')} />
    </View>
  )
}

// Sondage public (cf. app/s/[token]/_survey-page-client.tsx) : accessible sans compte.
export default function PublicSurveyScreen() {
  const { token } = useLocalSearchParams<{ token: string }>()
  const insets = useSafeAreaInsets()
  const signedIn = !!useSession(s => s.session)
  const [state, setState] = useState<'loading' | 'not_found' | 'expired' | 'ready'>('loading')
  const [data, setData] = useState<SurveyData | null>(null)
  const [name, setName] = useState('')
  const [responseId, setResponseId] = useState<string | null>(null)
  const [answers, setAnswers] = useState<Record<string, AnswerState>>({})
  const [submitted, setSubmitted] = useState(false)
  const [submitting, setSubmitting] = useState(false)
  const [savingCommentId, setSavingCommentId] = useState<string | null>(null)
  const [justSavedId, setJustSavedId] = useState<string | null>(null)
  const [error, setError] = useState<string | null>(null)
  const [viewMode, setViewMode] = useState<'type' | 'day'>('type')
  const [filter, setFilter] = useState<string | null>(null)
  const savedTimer = useRef<ReturnType<typeof setTimeout> | null>(null)

  useEffect(() => {
    void (async () => {
      const [storedName, storedResp, done] = await Promise.all([
        AsyncStorage.getItem(KEY_NAME), AsyncStorage.getItem(KEY_RESP(token)), AsyncStorage.getItem(KEY_DONE(token)),
      ]).catch(() => [null, null, null] as const)
      if (storedName) setName(storedName)
      setSubmitted(done === '1')
      try {
        const res = await request<SurveyData>(`/api/surveys/${token}${storedResp ? `?response_id=${storedResp}` : ''}`)
        if (res.status === 410) { setState('expired'); return }
        if (!res.ok || !res.data) { setState('not_found'); return }
        const json = res.data
        setData(json)
        if (json.viewer?.display_name) setName(json.viewer.display_name)
        if (json.existing_response) {
          setResponseId(json.existing_response.id)
          if (!storedName && !json.viewer) setName(json.existing_response.respondent_name)
          const hydrated: Record<string, AnswerState> = {}
          for (const a of json.existing_response.answers) hydrated[a.item_id] = { reaction: a.reaction as Reaction, comment: a.comment ?? '' }
          setAnswers(hydrated)
        }
        setState('ready')
      } catch {
        setState('not_found')
      }
    })()
  }, [token])

  const ratedCount = Object.values(answers).filter(a => a.reaction !== null).length
  const totalCount = data?.items.length ?? 0
  const nameLocked = !!data?.viewer

  async function saveAnswer(itemId: string, reaction: Reaction, comment: string) {
    if (!name.trim()) return false
    void AsyncStorage.setItem(KEY_NAME, name.trim()).catch(() => {})
    const res = await request<{ response_id?: string; error?: string }>(`/api/surveys/${token}/answers/${itemId}`, {
      method: 'POST', json: { respondent_name: name.trim(), reaction, comment: comment.trim() || undefined, response_id: responseId ?? undefined },
    }).catch(() => null)
    if (!res?.ok) { setError(res?.data?.error ?? 'Erreur lors de la sauvegarde'); return false }
    if (!responseId && res.data?.response_id) {
      setResponseId(res.data.response_id)
      void AsyncStorage.setItem(KEY_RESP(token), res.data.response_id).catch(() => {})
    }
    if (savedTimer.current) clearTimeout(savedTimer.current)
    setJustSavedId(itemId)
    savedTimer.current = setTimeout(() => setJustSavedId(null), 1500)
    return true
  }

  function react(itemId: string, reaction: Reaction) {
    if (!name.trim()) return
    setAnswers(p => ({ ...p, [itemId]: { reaction, comment: p[itemId]?.comment ?? '' } }))
    void saveAnswer(itemId, reaction, answers[itemId]?.comment ?? '')
  }

  async function saveComment(itemId: string) {
    const a = answers[itemId]
    if (!a?.reaction) return
    setSavingCommentId(itemId)
    await saveAnswer(itemId, a.reaction, a.comment)
    setSavingCommentId(null)
  }

  async function submit() {
    if (!responseId || ratedCount === 0) return
    setSubmitting(true); setError(null)
    const res = await request<{ error?: string }>(`/api/surveys/${token}/responses`, { method: 'POST', json: { response_id: responseId } }).catch(() => null)
    setSubmitting(false)
    if (!res?.ok) { setError(res?.data?.error ?? 'Erreur lors de l’envoi'); return }
    void AsyncStorage.setItem(KEY_DONE(token), '1').catch(() => {})
    setSubmitted(true)
    const planner = data?.plan.planner_name?.trim().split(/\s+/)[0]
    toast.success(planner ? `Avis envoyé à ${planner}` : 'Avis envoyé !')
  }

  function modify() {
    void AsyncStorage.removeItem(KEY_DONE(token)).catch(() => {})
    setSubmitted(false)
  }

  if (state === 'loading') return <View style={{ flex: 1, backgroundColor: C.creme }}><LogoLoaderScreen label="Le menu de la semaine arrive…" /></View>
  if (state === 'expired') return <StatusScreen icon={Clock} title="Ce lien a expiré" message="Le menu de cette semaine n’est plus disponible." />
  if (state === 'not_found' || !data) return <StatusScreen icon={XCircle} title="Lien introuvable" message="Ce lien de sondage n’existe pas ou n’est plus valide." />

  const templateItems = data.items.filter(i => i.applies_all_days)
  const dailyItems = data.items.filter(i => !i.applies_all_days)
  const byType = new Map<MealType, SurveyItem[]>()
  for (const it of dailyItems) byType.set(it.meal_type, [...(byType.get(it.meal_type) ?? []), it])
  const mealTypes = (Object.keys(MEAL_TYPE_ORDER) as MealType[]).sort((a, b) => MEAL_TYPE_ORDER[a] - MEAL_TYPE_ORDER[b]).filter(mt => byType.has(mt))
  const monday = new Date(data.plan.week_start + 'T00:00:00')
  const dateNum = (day: DayOfWeek) => { const d = new Date(monday); d.setDate(monday.getDate() + DAY_OPTIONS.findIndex(o => o.val === day)); return d.getDate() }
  const dayLabelFor = (i: SurveyItem) => (i.applies_all_days ? 'Toute la semaine' : `${DAY_OPTIONS.find(d => d.val === i.day_of_week)?.full ?? ''} ${dateNum(i.day_of_week)} · ${MOMENT[i.meal_type]}`)
  const activeDays = DAY_OPTIONS.filter(d => dailyItems.some(i => i.day_of_week === d.val))
  const chips = viewMode === 'type'
    ? mealTypes.map(mt => ({ value: mt as string, label: MEAL_LABEL[mt], icon: MEAL_ICON[mt] as LucideIcon | null, count: byType.get(mt)!.length }))
    : activeDays.map(d => ({ value: d.val as string, label: `${d.full.slice(0, 3)} ${dateNum(d.val)}`, icon: null, count: dailyItems.filter(i => i.day_of_week === d.val).length }))
  const sections = viewMode === 'type'
    ? mealTypes.filter(mt => filter === null || filter === mt).map(mt => ({ key: mt as string, title: MEAL_LABEL[mt], icon: MEAL_ICON[mt] as LucideIcon, items: byType.get(mt)! }))
    : activeDays.filter(d => filter === null || filter === d.val).map(d => ({ key: d.val as string, title: `${d.full} ${dateNum(d.val)}`, icon: CalendarDays as LucideIcon, items: dailyItems.filter(i => i.day_of_week === d.val) }))
  const plannerFirst = data.plan.planner_name?.trim().split(/\s+/)[0] ?? 'votre famille'
  const pct = totalCount > 0 ? Math.round((ratedCount / totalCount) * 100) : 0

  const card = (item: SurveyItem, byDay = false) => (
    <MealVoteCard key={item.id} item={item}
      label={item.applies_all_days ? `${MEAL_LABEL[item.meal_type]} · Toute la semaine` : byDay ? MEAL_LABEL[item.meal_type] : dayLabelFor(item)}
      withIcon={item.applies_all_days || byDay} answer={answers[item.id]}
      onReact={r => react(item.id, r)}
      onComment={v => setAnswers(p => ({ ...p, [item.id]: { reaction: p[item.id]?.reaction ?? null, comment: v } }))}
      onSaveComment={() => void saveComment(item.id)} savingComment={savingCommentId === item.id} justSaved={justSavedId === item.id} disabled={!name.trim()} />
  )

  return (
    <KeyboardAvoidingView behavior={Platform.OS === 'ios' ? 'padding' : undefined} style={{ flex: 1, backgroundColor: C.creme }}>
      {/* En-tête public */}
      <View style={{ paddingTop: insets.top + 8, paddingHorizontal: 16, paddingBottom: 8, flexDirection: 'row', alignItems: 'center', justifyContent: 'space-between', gap: 12 }}>
        <Logo size={32} />
        {!!(data.plan.family_name || data.plan.planner_name) && (
          <Txt numberOfLines={1} style={{ flexShrink: 1, fontFamily: F.bodySemi, fontSize: 12, color: C.texte2 }}>
            {data.plan.family_name ? `Famille ${data.plan.family_name}` : `Par ${data.plan.planner_name}`}
          </Txt>
        )}
      </View>

      <ScrollView contentContainerStyle={{ paddingHorizontal: 16, paddingTop: 8, paddingBottom: 220 + insets.bottom, gap: 16 }} keyboardShouldPersistTaps="handled">
        <View style={{ gap: 8, paddingHorizontal: 4 }}>
          <View style={{ alignSelf: 'flex-start', flexDirection: 'row', alignItems: 'center', gap: 6, borderRadius: R.pill, backgroundColor: '#FFFFFF', paddingHorizontal: 12, paddingVertical: 6 }}>
            <CalendarDays size={14} color={C.foret} />
            <Txt style={{ fontFamily: F.bodySemi, fontSize: 12, color: C.foret }}>Semaine du {formatWeekRange(data.plan.week_start)}</Txt>
          </View>
          <Txt variant="h1">Le menu de {plannerFirst}</Txt>
          <Txt style={{ fontSize: 15, lineHeight: 24, color: C.texte2 }}>Dis ce qui te fait envie cette semaine : la table décide ensemble.</Txt>
        </View>

        <View>
          <Txt style={{ paddingHorizontal: 4, marginBottom: 8, fontFamily: F.bodySemi, fontSize: 14, color: C.texte2 }}>Ton prénom</Txt>
          <View style={{ height: 48, flexDirection: 'row', alignItems: 'center', gap: 10, borderRadius: R.pill, paddingHorizontal: 16, backgroundColor: nameLocked ? C.lin : '#FFFFFF' }}>
            <UserCircle size={20} color={C.texte2} />
            <TextInput value={name} onChangeText={setName} editable={!nameLocked} placeholder="Comment tu t’appelles ?" placeholderTextColor={C.texte2}
              onBlur={() => { if (!nameLocked && name.trim()) void AsyncStorage.setItem(KEY_NAME, name.trim()).catch(() => {}) }}
              accessibilityLabel="Ton prénom" style={{ flex: 1, fontFamily: F.body, fontSize: 15, color: nameLocked ? C.texte2 : C.profond, paddingVertical: 0 }} />
            {nameLocked && <Lock size={14} color={C.texte2} />}
          </View>
          {nameLocked && <Txt variant="meta" style={{ marginTop: 6, paddingHorizontal: 4 }}>Ton nom vient de ton profil.</Txt>}
        </View>

        {templateItems.length > 0 && (
          <>
            <Separator label="Toute la semaine" />
            {templateItems.map(i => card(i))}
          </>
        )}

        {data.items.length > 0 && (
          <>
            <Separator label="Au programme" />
            <View style={{ flexDirection: 'row', borderRadius: R.pill, backgroundColor: '#FFFFFF', padding: 4 }} accessibilityRole="tablist">
              {([['type', Utensils, 'Par repas'], ['day', CalendarDays, 'Par jour']] as const).map(([v, Icon, label]) => {
                const active = viewMode === v
                return (
                  <Pressable key={v} onPress={() => { setViewMode(v); setFilter(null) }} accessibilityRole="tab" accessibilityState={{ selected: active }}
                    style={{ flex: 1, height: 44, flexDirection: 'row', alignItems: 'center', justifyContent: 'center', gap: 6, borderRadius: R.pill, backgroundColor: active ? C.foret : 'transparent' }}>
                    <Icon size={16} color={active ? C.creme : C.texte2} />
                    <Txt style={{ fontFamily: F.bodyBold, fontSize: 14, color: active ? C.creme : C.texte2 }}>{label}</Txt>
                  </Pressable>
                )
              })}
            </View>
            <ScrollView horizontal showsHorizontalScrollIndicator={false} style={{ marginHorizontal: -16 }} contentContainerStyle={{ paddingHorizontal: 16, gap: 8 }}>
              {[{ value: null as string | null, label: 'Tous', icon: null as LucideIcon | null, count: dailyItems.length }, ...chips].map(c => {
                const active = filter === c.value
                return (
                  <Pressable key={c.value ?? 'all'} onPress={() => setFilter(c.value)} accessibilityRole="button" accessibilityState={{ selected: active }}
                    style={{ height: 36, flexDirection: 'row', alignItems: 'center', gap: 6, paddingHorizontal: 14, borderRadius: R.pill, backgroundColor: active ? C.sauge50 : '#FFFFFF', borderWidth: active ? 1 : 0, borderColor: C.foret300 }}>
                    {c.icon && <c.icon size={14} color={active ? C.foret : C.texte2} />}
                    <Txt style={{ fontFamily: F.bodyBold, fontSize: 13, color: active ? C.foret : C.texte2 }}>{c.label} <Txt style={{ fontFamily: F.bodyBold, fontSize: 13, color: active ? C.foret500 : C.texte2, opacity: 0.7 }}>{c.count}</Txt></Txt>
                  </Pressable>
                )
              })}
            </ScrollView>
          </>
        )}

        {sections.map(s => (
          <View key={s.key} style={{ gap: 12 }}>
            <View style={{ flexDirection: 'row', alignItems: 'center', gap: 10, paddingHorizontal: 4 }}>
              <View style={{ width: 36, height: 36, borderRadius: R.pill, backgroundColor: '#FFFFFF', alignItems: 'center', justifyContent: 'center' }}><s.icon size={18} color={C.foret} /></View>
              <Txt variant="h2" color={C.profond}>{s.title}</Txt>
            </View>
            {s.items.map(i => card(i, viewMode === 'day'))}
          </View>
        ))}

        {data.items.length === 0 && <Txt variant="small" style={{ textAlign: 'center', paddingVertical: 32 }}>Ce menu ne contient aucun repas planifié pour le moment.</Txt>}
        {!!error && <Txt variant="small" color={C.danger} style={{ textAlign: 'center' }}>{error}</Txt>}

        <View style={{ paddingTop: 16, alignItems: 'center', gap: 2 }}>
          <Txt style={{ fontSize: 11, color: C.texte2, textAlign: 'center' }}>
            Lien partagé par {data.plan.family_name ? `la Famille ${data.plan.family_name}` : plannerFirst} · Menu du {formatWeekRange(data.plan.week_start)}
          </Txt>
          <Txt style={{ fontSize: 11, color: C.texte2 }}>Cuisine du cœur, sérénité & partage</Txt>
        </View>
      </ScrollView>

      {/* Barre d'envoi */}
      <View style={[{ position: 'absolute', left: 12, right: 12, bottom: insets.bottom + 12, borderRadius: R.xl, backgroundColor: '#FFFFFF', paddingHorizontal: 16, paddingVertical: 14, gap: 10 }, SHADOW.sheet]}>
        <View style={{ gap: 6 }}>
          <Txt variant="small" style={{ fontSize: 14 }}><Txt variant="smallBold" style={{ fontSize: 14 }}>{ratedCount}/{totalCount}</Txt> repas notés</Txt>
          <View style={{ height: 8, borderRadius: R.pill, backgroundColor: C.sauge50, overflow: 'hidden' }}>
            <View style={{ height: '100%', width: `${pct}%`, borderRadius: R.pill, backgroundColor: C.sauge }} />
          </View>
        </View>
        {submitted ? (
          <>
            <Pressable onPress={modify} accessibilityRole="button"
              style={{ height: 48, borderRadius: R.pill, backgroundColor: C.lin, alignItems: 'center', justifyContent: 'center' }}>
              <Txt style={{ fontFamily: F.bodyBold, fontSize: 16, color: C.foret }}>Modifier mes avis</Txt>
            </Pressable>
            {signedIn && (
              <Pressable onPress={() => router.navigate('/sondages')} style={{ height: 36, flexDirection: 'row', alignItems: 'center', justifyContent: 'center', gap: 4 }}>
                <Txt variant="smallBold" color={C.foret} style={{ fontSize: 14 }}>Voir l’avis de la table</Txt><ArrowRight size={16} color={C.foret} />
              </Pressable>
            )}
          </>
        ) : (
          <>
            <Pressable onPress={() => void submit()} disabled={ratedCount === 0 || !name.trim() || submitting} accessibilityRole="button"
              style={{ height: 48, flexDirection: 'row', alignItems: 'center', justifyContent: 'center', gap: 8, borderRadius: R.pill, backgroundColor: C.orange, opacity: ratedCount === 0 || !name.trim() ? 0.5 : 1 }}>
              {submitting ? <ActivityIndicator color="#FFFFFF" size="small" /> : <Send size={16} color="#FFFFFF" />}
              <Txt style={{ fontFamily: F.bodyBold, fontSize: 16, color: '#FFFFFF' }}>Envoyer</Txt>
            </Pressable>
            <Txt variant="meta" style={{ textAlign: 'center' }}>Tu pourras modifier tes avis ensuite.</Txt>
          </>
        )}
      </View>
    </KeyboardAvoidingView>
  )
}

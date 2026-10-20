import { useCallback, useEffect, useMemo, useState } from 'react'
import { Alert, Pressable, TextInput, View } from 'react-native'
import * as Clipboard from 'expo-clipboard'
import { router } from 'expo-router'
import QRCode from 'react-native-qrcode-svg'
import { Check, ChevronDown, Clock, Info, Key, KeyRound, Link2, Lock, LogOut, Plus, PlusCircle, Power, QrCode, Search, UserMinus, Users, X } from 'lucide-react-native'
import { Bone, Button, Card, CardTitle, EmptyState, Field, MealTile, Screen, ShareActions, Sheet, Toggle, Txt, useReloadOnFocus } from '@/components/ui'
import { get, request } from '@/lib/api'
import { useSession } from '@/lib/session'
import { toast } from '@/lib/toast'
import { pickActiveCircle } from '@/shared/active-circle'
import { PREF_TYPE_OPTIONS, prefChipStyle, type Pref, type PrefType, type Severity } from '@/shared/dietary-pref'
import { MEAL_LABEL, type MealType } from '@/shared/meal-type'
import { circleInvitePayload, circleJoinLinkPayload, circleJoinUrl } from '@/shared/share'
import { C, F, R } from '@/theme'

const AVATAR_COLORS = [C.orange, C.foret500, C.jaune900, C.foret, C.texte2]
const ROLE_LABEL: Record<string, string> = { planificatrice: 'Planificatrice', membre: 'Membre' }
const ROLE_DESCRIPTION: Record<string, string> = {
  planificatrice: 'Planifie les repas de la semaine, valide la liste de courses et coordonne les sondages de la famille.',
  membre: 'Donne son avis sur les repas de la semaine et partage ses retours après chaque repas.',
}

interface Member { id: string; role: string; joined_at: string; is_active?: boolean; users: { id: string; display_name: string; email: string; member_dietary_prefs: Pref[] } | null }
interface Circle { id: string; name: string; invite_code: string | null; created_by: string; family_circle_members: Member[]; my_role: string; my_is_active: boolean }
interface MealConfig { meal_type: MealType; is_active: boolean; mode: 'daily' | 'template'; default_time: string | null }

const joinNames = (n: string[]) => (n.length <= 1 ? n.join('') : `${n.slice(0, -1).join(', ')} et ${n[n.length - 1]}`)
const displayOf = (m: Member) => m.users!.display_name || m.users!.email

async function copyJoinLink(name: string, code: string) {
  const p = circleJoinLinkPayload(name, code)
  await Clipboard.setStringAsync(p.url ?? p.text)
  toast.success('Lien copié !')
}

function RoleBadge({ role }: { role: string }) {
  const planner = role === 'planificatrice'
  return (
    <View style={{ alignSelf: 'flex-start', borderRadius: R.pill, paddingHorizontal: 8, paddingVertical: 2, backgroundColor: planner ? C.foret : C.foret50 }}>
      <Txt style={{ fontFamily: F.bodyBold, fontSize: 12, color: planner ? C.creme : C.foret }}>{ROLE_LABEL[role] ?? role}</Txt>
    </View>
  )
}

// Ma table : cercle familial, invitation, membres et préférences (cf. app/(app)/circle/page.tsx).
export default function CircleScreen() {
  const refreshViewer = useSession(s => s.refreshViewer)
  const [circles, setCircles] = useState<Circle[]>([])
  const [me, setMe] = useState<string | null>(null)
  const [loading, setLoading] = useState(true)
  const [activeId, setActiveId] = useState<string | null>(null)
  const [viewedId, setViewedId] = useState<string | null>(null)
  const [activating, setActivating] = useState(false)
  const [mealConfigs, setMealConfigs] = useState<MealConfig[]>([])
  const [plannerName, setPlannerName] = useState<string | null>(null)
  const [stats, setStats] = useState<{ meals_rated_month: number; favorites_count: number } | null>(null)
  const [switcherOpen, setSwitcherOpen] = useState(false)
  const [query, setQuery] = useState('')
  const [showQr, setShowQr] = useState(false)
  const [sheetTarget, setSheetTarget] = useState<{ circleId: string; userId: string; displayName: string } | null>(null)
  const [prefValue, setPrefValue] = useState('')
  const [prefType, setPrefType] = useState<PrefType>('allergy')
  const [prefSeverity, setPrefSeverity] = useState<Severity>('strict')
  const [savingPref, setSavingPref] = useState(false)
  const [confirmDeleteId, setConfirmDeleteId] = useState<string | null>(null)

  const load = useCallback(async () => {
    const [res, s] = await Promise.all([
      get<{ data?: Circle[]; active_circle_id?: string | null; viewer_id?: string }>('/api/circles'),
      get<{ meals_rated_month: number; favorites_count: number }>('/api/users/me/stats'),
    ])
    if (!res) toast.error('Erreur de connexion')
    setCircles(res?.data ?? [])
    setActiveId(pickActiveCircle(res)?.id ?? null)
    setMe(res?.viewer_id ?? null)
    setStats(s)
    setLoading(false)
  }, [])
  useReloadOnFocus(load)

  const shown = circles.find(c => c.id === (viewedId ?? activeId)) ?? circles[0]

  useEffect(() => {
    setMealConfigs([]); setPlannerName(null)
    if (!shown?.id || !shown.my_is_active) return
    void get<{ configs?: MealConfig[]; planner_name?: string | null }>(`/api/circles/${shown.id}/meal-config`).then(res => {
      setMealConfigs(Array.isArray(res?.configs) ? res.configs : [])
      setPlannerName(res?.planner_name ?? null)
    })
  }, [shown?.id, shown?.my_is_active])

  const patchMember = (circleId: string, userId: string, fn: (m: Member) => Member | null) =>
    setCircles(prev => prev.map(c => (c.id !== circleId ? c : {
      ...c, family_circle_members: c.family_circle_members.map(m => (m.users?.id === userId ? fn(m) : m)).filter((m): m is Member => !!m),
    })))

  async function activate(id: string) {
    setActivating(true)
    const res = await request<{ error?: string }>('/api/circles/active', { method: 'PUT', json: { circle_id: id } }).catch(() => null)
    setActivating(false)
    if (!res?.ok) { toast.error(res?.data?.error ?? 'Impossible d’activer ce cercle'); return }
    setActiveId(id)
    toast.success(`Cercle actif : ${circles.find(c => c.id === id)?.name ?? ''}`)
    void refreshViewer() // rôle et onglets suivent le cercle actif
  }

  async function setMemberActive(circleId: string, userId: string, on: boolean) {
    const res = await request<{ error?: string }>(`/api/circles/${circleId}/members/${userId}`, { method: 'PATCH', json: { is_active: on } }).catch(() => null)
    if (!res?.ok) { toast.error(res?.data?.error ?? 'Impossible de changer le statut'); return }
    patchMember(circleId, userId, m => ({ ...m, is_active: on }))
    toast.success(on ? 'Membre réactivé' : 'Membre désactivé')
  }

  function removeMember(circleId: string, userId: string, name: string) {
    Alert.alert(`Retirer ${name} ?`, 'Ce membre quittera la tablée.', [
      { text: 'Annuler', style: 'cancel' },
      { text: 'Retirer', style: 'destructive', onPress: async () => {
        const res = await request(`/api/circles/${circleId}/members/${userId}`, { method: 'DELETE' }).catch(() => null)
        if (res?.ok) patchMember(circleId, userId, () => null)
      } },
    ])
  }

  function leaveCircle(circleId: string) {
    if (!me) return
    Alert.alert('Quitter le cercle ?', 'Tu ne verras plus le menu de ce cercle.', [
      { text: 'Annuler', style: 'cancel' },
      { text: 'Quitter', style: 'destructive', onPress: async () => {
        const res = await request(`/api/circles/${circleId}/members/${me}`, { method: 'DELETE' }).catch(() => null)
        if (!res?.ok) return
        const remaining = circles.filter(c => c.id !== circleId)
        setCircles(remaining)
        if (activeId === circleId) setActiveId(remaining[0]?.id ?? null)
        if (viewedId === circleId) setViewedId(null)
        void refreshViewer()
      } },
    ])
  }

  async function savePref() {
    if (!sheetTarget || !prefValue.trim() || savingPref) return
    setSavingPref(true)
    const res = await request<Pref>(`/api/circles/${sheetTarget.circleId}/members/${sheetTarget.userId}/prefs`, {
      method: 'POST', json: { pref_type: prefType, value: prefValue.trim(), severity: prefType === 'allergy' ? prefSeverity : undefined },
    }).catch(() => null)
    setSavingPref(false)
    if (!res?.ok || !res.data) return
    const saved = res.data
    patchMember(sheetTarget.circleId, sheetTarget.userId, m => ({ ...m, users: { ...m.users!, member_dietary_prefs: [...m.users!.member_dietary_prefs.filter(p => p.id !== saved.id), saved] } }))
    setSheetTarget(null)
  }

  async function deletePref(circleId: string, userId: string, prefId: string) {
    if (confirmDeleteId !== prefId) {
      setConfirmDeleteId(prefId)
      setTimeout(() => setConfirmDeleteId(cur => (cur === prefId ? null : cur)), 3000)
      return
    }
    setConfirmDeleteId(null)
    const res = await request(`/api/circles/${circleId}/members/${userId}/prefs/${prefId}`, { method: 'DELETE' }).catch(() => null)
    if (res?.ok) patchMember(circleId, userId, m => ({ ...m, users: { ...m.users!, member_dietary_prefs: m.users!.member_dietary_prefs.filter(p => p.id !== prefId) } }))
  }

  const visibleCircles = useMemo(() => {
    const q = query.trim().toLowerCase()
    return q ? circles.filter(c => c.name.toLowerCase().includes(q)) : circles
  }, [circles, query])

  if (loading) {
    return (
      <Screen>
        <Bone style={{ height: 240, borderRadius: R.xl }} /><Bone style={{ height: 220, borderRadius: R.xl }} /><Bone style={{ height: 140, borderRadius: R.xl }} />
      </Screen>
    )
  }

  if (circles.length === 0) {
    return (
      <Screen onRefresh={load}>
        <Card>
          <EmptyState icon={Users} title="Pas encore de cercle" description="Crée ou rejoins un cercle familial pour planifier ensemble." />
          <View style={{ gap: 10 }}>
            <Button label="Créer un cercle" icon={Plus} tone="orange" full onPress={() => router.push('/circle/create')} />
            <Button label="Rejoindre avec un code" icon={Key} tone="ghost" full onPress={() => router.push('/circle/join')} />
          </View>
        </Card>
      </Screen>
    )
  }

  const circle = shown
  const isActiveCircle = circle.id === activeId
  const members = (circle.family_circle_members ?? []).filter(m => m.users)
  const isPlanner = circle.my_role === 'planificatrice'
  const meMember = members.find(m => m.users!.id === me)

  function PrefChips({ m, small }: { m: Member; small?: boolean }) {
    const u = m.users!
    const canManage = u.id === me || isPlanner
    return (
      <View style={{ flexDirection: 'row', flexWrap: 'wrap', gap: 6 }}>
        {(u.member_dietary_prefs ?? []).map(pref => {
          const s = prefChipStyle(pref)
          const confirming = confirmDeleteId === pref.id
          const fg = confirming ? C.danger : s.fg
          return (
            <Pressable key={pref.id} disabled={!canManage} onPress={() => void deletePref(circle.id, u.id, pref.id)}
              accessibilityLabel={confirming ? `Supprimer ${pref.value} ?` : pref.value}
              style={{ flexDirection: 'row', alignItems: 'center', gap: 4, borderRadius: R.pill, borderWidth: 1, paddingHorizontal: small ? 8 : 10, paddingVertical: small ? 2 : 4,
                borderColor: confirming ? C.danger : s.border, backgroundColor: confirming ? C.dangerLight : s.bg }}>
              {confirming ? <X size={12} color={fg} /> : s.Icon ? <s.Icon size={12} color={fg} /> : null}
              <Txt style={{ fontFamily: F.bodySemi, fontSize: small ? 11 : 12, color: fg }}>{confirming ? 'Supprimer ?' : pref.value}</Txt>
            </Pressable>
          )
        })}
        {canManage && (
          <Pressable onPress={() => { setSheetTarget({ circleId: circle.id, userId: u.id, displayName: displayOf(m) }); setPrefValue(''); setPrefType('allergy'); setPrefSeverity('strict') }}
            accessibilityRole="button" accessibilityLabel={`Ajouter une préférence pour ${displayOf(m)}`}
            style={{ flexDirection: 'row', alignItems: 'center', gap: 4, borderRadius: R.pill, borderWidth: 1, borderStyle: 'dashed', borderColor: C.foret300, paddingHorizontal: small ? 8 : 10, paddingVertical: small ? 2 : 4 }}>
            <Plus size={12} color={C.foret} />
            <Txt style={{ fontFamily: F.bodySemi, fontSize: small ? 11 : 12, color: C.foret }}>Ajouter</Txt>
          </Pressable>
        )}
      </View>
    )
  }

  const switcherTrigger = (
    <Pressable onPress={() => { setQuery(''); setSwitcherOpen(true) }} accessibilityRole="button" accessibilityLabel={`Cercle consulté : ${circle.name}. Changer de cercle`}
      style={{ marginTop: 2, flexDirection: 'row', alignItems: 'center', gap: 8, alignSelf: 'flex-start', maxWidth: '100%' }}>
      <Txt variant="h1" color={C.creme} numberOfLines={1} style={{ flexShrink: 1 }}>{circle.name}</Txt>
      <ChevronDown size={20} color={C.foret100} />
    </Pressable>
  )
  const eyebrow = <Txt style={{ fontFamily: F.bodySemi, fontSize: 14, color: C.foret100 }}>Cercle familial{circles.length > 1 ? ` · ${circles.length} cercles` : ''}</Txt>

  const otherActions = (
    <View style={{ gap: 4 }}>
      <Pressable onPress={() => router.push('/circle/create')} accessibilityRole="button"
        style={{ height: 44, flexDirection: 'row', alignItems: 'center', justifyContent: 'center', gap: 8, borderRadius: R.pill, borderWidth: 1.5, borderStyle: 'dashed', borderColor: C.foret300 }}>
        <Plus size={16} color={C.foret} /><Txt style={{ fontFamily: F.bodySemi, fontSize: 14, color: C.foret }}>Créer ou rejoindre un autre cercle</Txt>
      </Pressable>
      {!isPlanner && <Button label="Quitter le cercle" icon={LogOut} tone="danger" full onPress={() => leaveCircle(circle.id)} />}
    </View>
  )

  const switcherSheet = (
    <Sheet open={switcherOpen} onClose={() => setSwitcherOpen(false)} title="Mes cercles" subtitle="Consulter un cercle ne l’active pas."
      footer={(
        <View style={{ flexDirection: 'row', gap: 8 }}>
          <Button label="Créer un cercle" icon={PlusCircle} tone="ghost" size="sm" flex onPress={() => { setSwitcherOpen(false); router.push('/circle/create') }} />
          <Button label="Rejoindre" icon={Key} tone="ghost" size="sm" flex onPress={() => { setSwitcherOpen(false); router.push('/circle/join') }} />
        </View>
      )}>
      <View style={{ paddingHorizontal: 16, paddingBottom: 8, gap: 8 }}>
        <View style={{ height: 44, flexDirection: 'row', alignItems: 'center', gap: 8, borderRadius: R.pill, backgroundColor: '#FFFFFF', paddingHorizontal: 14 }}>
          <Search size={16} color={C.texte2} />
          <TextInput value={query} onChangeText={setQuery} placeholder="Rechercher un cercle…" placeholderTextColor={C.texte2} accessibilityLabel="Rechercher un cercle"
            style={{ flex: 1, fontFamily: F.body, fontSize: 14, color: C.profond, paddingVertical: 0 }} />
        </View>
        {visibleCircles.map(c => {
          const selected = c.id === circle.id
          const disabled = c.my_is_active === false
          const count = c.family_circle_members?.length ?? 0
          return (
            <Pressable key={c.id} onPress={() => { setViewedId(c.id); setSwitcherOpen(false); setShowQr(false) }} accessibilityRole="button" accessibilityState={{ selected }}
              style={{ flexDirection: 'row', alignItems: 'center', gap: 12, borderRadius: R.md, padding: 10, backgroundColor: selected ? C.foret50 : '#FFFFFF' }}>
              <View style={{ width: 36, height: 36, borderRadius: R.pill, backgroundColor: C.sauge50, alignItems: 'center', justifyContent: 'center' }}><Users size={16} color={C.foret500} /></View>
              <View style={{ flex: 1 }}>
                <Txt numberOfLines={1} variant="smallBold" style={{ fontSize: 14 }}>{c.name}</Txt>
                <Txt variant="meta">{disabled ? 'Accès désactivé' : `${count} ${count > 1 ? 'membres' : 'membre'}`}</Txt>
              </View>
              {c.id === activeId && <View style={{ borderRadius: R.pill, backgroundColor: C.sauge50, paddingHorizontal: 8, paddingVertical: 2 }}><Txt style={{ fontFamily: F.bodyBold, fontSize: 10, color: C.foret500 }}>Actif</Txt></View>}
              {selected && <Check size={16} color={C.foret500} />}
            </Pressable>
          )
        })}
        {visibleCircles.length === 0 && <Txt variant="small" style={{ fontStyle: 'italic', padding: 12 }}>Aucun cercle ne correspond</Txt>}
      </View>
    </Sheet>
  )

  const prefSheet = (
    <Sheet open={!!sheetTarget} onClose={() => setSheetTarget(null)} title={sheetTarget ? `Préférence de ${sheetTarget.displayName}` : ''}
      footer={<Button label={savingPref ? 'Enregistrement…' : 'Enregistrer'} icon={Check} tone="orange" full onPress={() => void savePref()} disabled={!prefValue.trim()} loading={savingPref} />}>
      <View style={{ paddingHorizontal: 20, paddingBottom: 12, gap: 12 }}>
        <Field value={prefValue} onChangeText={setPrefValue} placeholder="Ingrédient ou plat…" autoFocus accessibilityLabel="Ingrédient ou plat" />
        <View style={{ flexDirection: 'row', flexWrap: 'wrap', gap: 8 }}>
          {PREF_TYPE_OPTIONS.map(o => {
            const sel = prefType === o.value
            return (
              <Pressable key={o.value} onPress={() => setPrefType(o.value)} accessibilityRole="radio" accessibilityState={{ checked: sel }}
                style={{ width: '48%', flexGrow: 1, height: 40, alignItems: 'center', justifyContent: 'center', borderRadius: R.md, borderWidth: 1, borderColor: sel ? C.foret : C.filet, backgroundColor: sel ? C.foret : '#FFFFFF' }}>
                <Txt style={{ fontFamily: F.bodySemi, fontSize: 12, color: sel ? C.creme : C.texte2 }}>{o.label}</Txt>
              </Pressable>
            )
          })}
        </View>
        {prefType === 'allergy' && (
          <View style={{ flexDirection: 'row', gap: 8 }}>
            {([['strict', 'Sévère (exclure des repas)'], ['light', 'Légère (éviter)']] as const).map(([s, label]) => {
              const sel = prefSeverity === s
              return (
                <Pressable key={s} onPress={() => setPrefSeverity(s)} accessibilityRole="radio" accessibilityState={{ checked: sel }}
                  style={{ flex: 1, minHeight: 40, paddingHorizontal: 6, alignItems: 'center', justifyContent: 'center', borderRadius: R.md, borderWidth: 1,
                    borderColor: sel ? (s === 'strict' ? C.danger : C.jaune) : C.filet, backgroundColor: sel ? (s === 'strict' ? C.dangerLight : C.jaune50) : '#FFFFFF' }}>
                  <Txt style={{ textAlign: 'center', fontFamily: F.bodySemi, fontSize: 12, color: sel && s === 'strict' ? C.danger : C.texte2 }}>{label}</Txt>
                </Pressable>
              )
            })}
          </View>
        )}
      </View>
    </Sheet>
  )

  // Accès mis en pause par la planificatrice : seulement ses informations.
  if (!circle.my_is_active) {
    return (
      <Screen onRefresh={load}>
        <View style={{ backgroundColor: C.foret, borderRadius: R.xl, padding: 20 }}>
          {eyebrow}{switcherTrigger}
          <View style={{ marginTop: 16, alignSelf: 'flex-start', height: 32, flexDirection: 'row', alignItems: 'center', gap: 6, borderRadius: R.pill, backgroundColor: C.white10, paddingHorizontal: 12 }}>
            <Lock size={14} color={C.foret100} /><Txt style={{ fontFamily: F.bodyBold, fontSize: 12, color: C.foret100 }}>Accès en pause</Txt>
          </View>
        </View>
        <Card>
          <EmptyState icon={Lock} title="Ton accès à ce cercle est en pause"
            description="La planificatrice a mis ta participation en pause : tu ne vois plus le menu, les sondages ni les membres. Tu gardes l’historique de tes avis."
            action={<Button label="Voir mes avis" tone="link" onPress={() => router.push('/avis')} />} />
        </Card>
        {meMember && <Card style={{ gap: 12 }}><Txt variant="h3">Mon assiette personnalisée</Txt><PrefChips m={meMember} /></Card>}
        {otherActions}
        {switcherSheet}{prefSheet}
      </Screen>
    )
  }

  const inviteCode = circle.invite_code ?? ''
  const activeMembers = members.filter(m => m.is_active !== false)
  const activeMeals = mealConfigs.filter(c => c.is_active)

  return (
    <Screen onRefresh={load}>
      {/* Bandeau : le cercle, son statut, ses chiffres */}
      <View style={{ backgroundColor: C.foret, borderRadius: R.xl, padding: 20 }}>
        {eyebrow}{switcherTrigger}
        <Txt variant="small" color={C.foret100} style={{ marginTop: 8, fontSize: 14 }}>
          Vos avis et vos appétits guident le menu de la semaine{plannerName && !isPlanner ? `, préparé par ${plannerName}` : ''}.
        </Txt>
        <View style={{ marginTop: 16, flexDirection: 'row', flexWrap: 'wrap', alignItems: 'center', gap: 12 }}>
          {isActiveCircle ? (
            <View style={{ height: 32, flexDirection: 'row', alignItems: 'center', gap: 6, borderRadius: R.pill, backgroundColor: C.sauge, paddingHorizontal: 12 }}>
              <View style={{ width: 6, height: 6, borderRadius: 3, backgroundColor: C.profond }} />
              <Txt style={{ fontFamily: F.bodyBold, fontSize: 12, color: C.profond }}>Cercle actif</Txt>
            </View>
          ) : (
            <Button label="Activer ce cercle" icon={Power} tone="orange" size="sm" loading={activating} onPress={() => void activate(circle.id)} />
          )}
          <View style={{ flexDirection: 'row' }}>
            {members.slice(0, 5).map((m, i) => (
              <View key={m.id} style={{ marginLeft: i ? -6 : 0, width: 32, height: 32, borderRadius: R.pill, borderWidth: 2, borderColor: C.foret, backgroundColor: C.foret100, alignItems: 'center', justifyContent: 'center' }}>
                <Txt style={{ fontFamily: F.bodyBold, fontSize: 12, color: C.foret }}>{displayOf(m)[0].toUpperCase()}</Txt>
              </View>
            ))}
            {members.length > 5 && (
              <View style={{ marginLeft: -6, width: 32, height: 32, borderRadius: R.pill, borderWidth: 2, borderColor: C.foret, backgroundColor: C.white15, alignItems: 'center', justifyContent: 'center' }}>
                <Txt style={{ fontFamily: F.bodyBold, fontSize: 11, color: C.creme }}>+{members.length - 5}</Txt>
              </View>
            )}
          </View>
        </View>
        <Txt numberOfLines={2} style={{ marginTop: 8, fontFamily: F.bodySemi, fontSize: 13, color: C.foret100 }}>{joinNames(members.map(displayOf))}</Txt>
        <View style={{ marginTop: 16, flexDirection: 'row', gap: 8 }}>
          {[
            { label: 'Convives', value: activeMembers.length, total: members.length },
            { label: 'Notés ce mois', value: stats?.meals_rated_month },
            { label: 'Plats favoris', value: stats?.favorites_count },
          ].map(s => (
            <View key={s.label} style={{ flex: 1, borderRadius: R.md, backgroundColor: C.white10, paddingHorizontal: 12, paddingVertical: 10 }}>
              <Txt variant="meta" color={C.foret100}>{s.label}</Txt>
              <Txt style={{ marginTop: 2, fontFamily: F.title, fontSize: 20, color: C.creme }}>
                {s.value ?? '–'}{s.total !== undefined && s.total !== s.value && <Txt style={{ fontFamily: F.bodyBold, fontSize: 14, color: C.foret100 }}>/{s.total}</Txt>}
              </Txt>
            </View>
          ))}
        </View>
      </View>

      {/* Inviter à table */}
      <Card style={{ gap: 12 }}>
        <CardTitle icon={KeyRound} title="Inviter à table" />
        <View style={{ borderRadius: R.lg, borderWidth: 1.5, borderStyle: 'dashed', borderColor: C.foret300, backgroundColor: C.foret50, paddingHorizontal: 16, paddingVertical: 12, alignItems: 'center' }}>
          {showQr ? (
            <View style={{ flexDirection: 'row', alignItems: 'center', gap: 16 }}>
              <View style={{ borderRadius: R.sm, backgroundColor: '#FFFFFF', padding: 6 }}>
                <QRCode value={circleJoinUrl(inviteCode)} size={104} color={C.foret} backgroundColor="#FFFFFF" />
              </View>
              <View style={{ flexShrink: 1, gap: 6 }}>
                <Txt style={{ fontFamily: F.title, fontSize: 20, letterSpacing: 2, color: C.foret }}>{inviteCode}</Txt>
                <Txt variant="meta">À scanner avec l’appareil photo.</Txt>
              </View>
            </View>
          ) : (
            <>
              <Txt style={{ fontFamily: F.bodySemi, fontSize: 12, color: C.texte2 }}>Code du foyer</Txt>
              <Txt style={{ fontFamily: F.title, fontSize: 32, lineHeight: 40, letterSpacing: 4, color: C.foret }} selectable>{inviteCode}</Txt>
            </>
          )}
        </View>
        <Txt variant="small">Un proche, un invité du dimanche : avec ce code, il rejoint la tablée et donne son avis sur les repas.</Txt>
        <ShareActions getPayload={() => circleInvitePayload(circle.name, inviteCode)} copyLabel="Copier" />
        <View style={{ flexDirection: 'row', gap: 8 }}>
          <Button label="Copier le lien" icon={Link2} tone="ghost" flex onPress={() => void copyJoinLink(circle.name, inviteCode)} />
          <Button icon={QrCode} tone="ghost" accessibilityLabel={showQr ? 'Afficher le code' : 'Afficher le QR code'} onPress={() => setShowQr(v => !v)} />
        </View>
      </Card>

      {/* La tablée */}
      <View style={{ gap: 12 }}>
        <View style={{ flexDirection: 'row', alignItems: 'center', gap: 8, paddingHorizontal: 4 }}>
          <Txt variant="h2">La tablée</Txt>
          <View style={{ borderRadius: R.pill, backgroundColor: C.foret50, paddingHorizontal: 10, paddingVertical: 2 }}>
            <Txt style={{ fontFamily: F.bodyBold, fontSize: 14, color: C.foret }}>{members.length}</Txt>
          </View>
        </View>
        <Txt variant="meta" style={{ paddingHorizontal: 4 }}>Les préférences de chacun guident la génération du menu.</Txt>
        {members.length <= 1 && (
          <View style={{ borderRadius: R.lg, borderWidth: 1.5, borderStyle: 'dashed', borderColor: C.filet, backgroundColor: '#FFFFFF' }}>
            <EmptyState icon={Users} title="La table n’attend plus que ta famille" description="Partage le code du foyer ou le lien d’accès pour qu’elle te rejoigne." />
          </View>
        )}
        {members.map((m, index) => {
          const u = m.users!
          const isMe = u.id === me
          const canManage = isPlanner && !isMe
          const inactive = m.is_active === false
          return (
            <View key={m.id} style={{ borderRadius: R.lg, backgroundColor: '#FFFFFF', padding: 16, gap: 12 }}>
              <View style={{ flexDirection: 'row', alignItems: 'center', gap: 12, opacity: inactive ? 0.6 : 1 }}>
                <View style={{ width: 44, height: 44, borderRadius: R.pill, backgroundColor: AVATAR_COLORS[index % AVATAR_COLORS.length], alignItems: 'center', justifyContent: 'center' }}>
                  <Txt style={{ fontFamily: F.title, fontSize: 18, color: '#FFFFFF' }}>{displayOf(m)[0].toUpperCase()}</Txt>
                </View>
                <View style={{ flex: 1, gap: 4 }}>
                  <View style={{ flexDirection: 'row', alignItems: 'center', gap: 6 }}>
                    <Txt variant="h3" numberOfLines={1} style={{ flexShrink: 1 }}>{displayOf(m)}</Txt>
                    {isMe && <View style={{ borderRadius: R.pill, backgroundColor: C.jaune50, paddingHorizontal: 8, paddingVertical: 2 }}><Txt style={{ fontFamily: F.bodyBold, fontSize: 11, color: C.jauneText }}>Moi</Txt></View>}
                  </View>
                  <View style={{ flexDirection: 'row', alignItems: 'center', gap: 6 }}>
                    <RoleBadge role={m.role} />
                    {inactive && <Txt variant="meta" style={{ fontFamily: F.bodySemi }}>· En pause</Txt>}
                  </View>
                </View>
              </View>
              <PrefChips m={m} small />
              {canManage && (
                <View style={{ flexDirection: 'row', alignItems: 'center', justifyContent: 'space-between', gap: 8, paddingTop: 12, borderTopWidth: 1, borderStyle: 'dashed', borderColor: C.filet }}>
                  {m.role === 'membre' ? (
                    <View style={{ flexDirection: 'row', alignItems: 'center', gap: 8 }}>
                      <Toggle value={!inactive} onChange={on => void setMemberActive(circle.id, u.id, on)} label={`Participation de ${displayOf(m)}`} />
                      <Txt style={{ fontFamily: F.bodySemi, fontSize: 12, color: C.texte2 }}>{inactive ? 'En pause' : 'Participe'}</Txt>
                    </View>
                  ) : <View />}
                  <Pressable onPress={() => removeMember(circle.id, u.id, displayOf(m))} accessibilityRole="button"
                    style={{ height: 36, flexDirection: 'row', alignItems: 'center', gap: 4, paddingHorizontal: 10, borderRadius: R.pill }}>
                    <UserMinus size={14} color={C.danger} /><Txt style={{ fontFamily: F.bodySemi, fontSize: 12, color: C.danger }}>Retirer</Txt>
                  </Pressable>
                </View>
              )}
            </View>
          )
        })}
      </View>

      {/* Moments de repas */}
      {mealConfigs.length > 0 && (
        <Card style={{ gap: 8 }}>
          <CardTitle icon={Clock} title="Moments de repas" right={isPlanner ? (
            <Pressable onPress={() => router.push('/settings/meal-config')} hitSlop={8}><Txt style={{ fontFamily: F.bodyBold, fontSize: 12, color: C.foret }}>Ajuster</Txt></Pressable>
          ) : undefined} />
          {mealConfigs.map(c => (
            <View key={c.meal_type} style={{ flexDirection: 'row', alignItems: 'center', gap: 12, paddingVertical: 6, opacity: c.is_active ? 1 : 0.5 }}>
              <MealTile type={c.meal_type} size={36} />
              <Txt variant="smallBold" style={{ flex: 1, fontSize: 14 }}>{MEAL_LABEL[c.meal_type]}</Txt>
              <Txt variant="meta">
                {c.is_active
                  ? <><Txt style={{ fontFamily: F.title, fontSize: 14, color: C.profond }}>{c.default_time ? c.default_time.slice(0, 5) : '—'}</Txt> · {c.mode === 'daily' ? 'chaque jour' : 'toute la semaine'}</>
                  : 'Pas prévu'}
              </Txt>
            </View>
          ))}
          <Txt variant="meta">{activeMeals.length} moment{activeMeals.length > 1 ? 's' : ''} par jour{plannerName && !isPlanner ? `, réglés par ${plannerName}` : ''}.</Txt>
        </Card>
      )}

      {/* Qui fait quoi */}
      <Card style={{ gap: 12 }}>
        <CardTitle icon={Info} title="Qui fait quoi" />
        {(['planificatrice', 'membre'] as const).map(r => (
          <View key={r} style={{ gap: 4 }}>
            <RoleBadge role={r} />
            <Txt variant="small">{ROLE_DESCRIPTION[r]}</Txt>
          </View>
        ))}
      </Card>

      {otherActions}
      {switcherSheet}{prefSheet}
    </Screen>
  )
}

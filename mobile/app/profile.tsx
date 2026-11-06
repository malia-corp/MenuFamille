import { useCallback, useState } from 'react'
import { Pressable, TextInput, View } from 'react-native'
import { router } from 'expo-router'
import {
  ArrowLeft, Bell, CalendarDays, Check, ChefHat, ChevronRight, Globe, LifeBuoy, LogOut, Pencil, Settings, Share2, SlidersHorizontal,
  Sparkles, UserPlus, Users, UtensilsCrossed, X,
} from 'lucide-react-native'
import { Bone, Card, CardTitle, Screen, ShareActions, Txt, useReloadOnFocus } from '@/components/ui'
import { DietaryPrefsSheet } from '@/components/settings/DietaryPrefsSheet'
import { SettingRow } from '@/components/settings/SettingRow'
import { get, request } from '@/lib/api'
import { useSession } from '@/lib/session'
import { toast } from '@/lib/toast'
import { pickActiveCircle } from '@/shared/active-circle'
import { prefChipStyle, type Pref } from '@/shared/dietary-pref'
import { appSharePayload } from '@/shared/share'
import { C, F, R } from '@/theme'

interface UserProfile { id: string; display_name: string; family_size: number; dietary_prefs: Record<string, unknown> }
interface Stats { recipes_shared: number; meals_planned: number; approval_pct: number | null }
interface Circle { id: string; name: string; my_role: string; family_circle_members: { id: string; role: string; users: { id: string; display_name: string; email: string } | null }[] }

const AVATAR_COLORS = [C.orange, C.foret500, C.jaune900, C.foret, C.texte2]
const ROLE_LABEL: Record<string, string> = { planificatrice: 'Organisatrice', membre: 'Membre' }
const MEMBERS_SHOWN = 4


// Mon profil (cf. app/(app)/profile/page.tsx).
export default function ProfileScreen() {
  const { logout, refreshViewer } = useSession()
  const [profile, setProfile] = useState<UserProfile | null>(null)
  const [prefs, setPrefs] = useState<Pref[]>([])
  const [stats, setStats] = useState<Stats | null>(null)
  const [circle, setCircle] = useState<Circle | null>(null)
  const [prefsOpen, setPrefsOpen] = useState(false)
  const [loading, setLoading] = useState(true)
  const [editMode, setEditMode] = useState(false)
  const [editName, setEditName] = useState('')
  const [saving, setSaving] = useState(false)

  const load = useCallback(async () => {
    const [p, dp, s, c] = await Promise.all([
      get<UserProfile>('/api/users/me'),
      get<{ data?: Pref[] }>('/api/users/me/dietary-prefs'),
      get<Stats>('/api/users/me/stats'),
      get<{ data?: Circle[]; active_circle_id?: string | null }>('/api/circles'),
    ])
    if (!p) toast.error('Erreur de connexion')
    setProfile(p); setPrefs(Array.isArray(dp?.data) ? dp.data : []); setStats(s); setCircle(pickActiveCircle(c))
    setLoading(false)
  }, [])
  useReloadOnFocus(load)

  async function saveEdit() {
    if (!editName.trim()) return
    setSaving(true)
    const res = await request<UserProfile>('/api/users/me', { method: 'PUT', json: { display_name: editName.trim() } }).catch(() => null)
    setSaving(false)
    if (res?.ok && res.data) { setProfile(res.data); setEditMode(false); toast.success('Nom mis à jour'); void refreshViewer() }
    else toast.error('Impossible d’enregistrer')
  }

  async function handleLogout() {
    await logout()
    router.replace('/login')
  }

  if (loading) {
    return <Screen header={false} withTabBar={false}><Bone style={{ height: 220, borderRadius: R.xl }} /><Bone style={{ height: 140, borderRadius: R.xl }} /><Bone style={{ height: 300, borderRadius: R.xl }} /></Screen>
  }

  const name = profile?.display_name || 'Toi'
  const isPlanner = circle?.my_role === 'planificatrice'
  const members = (circle?.family_circle_members ?? []).filter(m => m.users)
  const cuisines = Array.isArray(profile?.dietary_prefs?.cuisines) ? (profile!.dietary_prefs.cuisines as string[]) : []

  return (
    <Screen header={false} withTabBar={false} onRefresh={load}>
      {/* Bandeau : identité et impact */}
      <View style={{ backgroundColor: C.foret, borderRadius: R.xl, padding: 20 }}>
        <Pressable onPress={() => (router.canGoBack() ? router.back() : router.replace('/'))} accessibilityRole="button" accessibilityLabel="Retour"
          style={{ marginBottom: 16, width: 40, height: 40, borderRadius: R.pill, backgroundColor: C.white10, alignItems: 'center', justifyContent: 'center' }}>
          <ArrowLeft size={20} color={C.creme} />
        </Pressable>
        <View style={{ flexDirection: 'row', alignItems: 'center', gap: 16 }}>
          <View style={{ width: 72, height: 72, borderRadius: R.pill, backgroundColor: C.creme, borderWidth: 4, borderColor: C.white10, alignItems: 'center', justifyContent: 'center' }}>
            <Txt style={{ fontFamily: F.title, fontSize: 32, color: C.foret }}>{name[0].toUpperCase()}</Txt>
          </View>
          <View style={{ flex: 1 }}>
            {editMode ? (
              <View style={{ flexDirection: 'row', alignItems: 'center', gap: 6 }}>
                <TextInput value={editName} onChangeText={setEditName} editable={!saving} autoFocus accessibilityLabel="Ton prénom" returnKeyType="done" onSubmitEditing={() => void saveEdit()}
                  style={{ flex: 1, height: 44, borderRadius: R.pill, backgroundColor: '#FFFFFF', paddingHorizontal: 16, fontFamily: F.titleBold, fontSize: 17, color: C.profond }} />
                <Pressable onPress={() => void saveEdit()} disabled={saving || !editName.trim()} accessibilityLabel="Enregistrer"
                  style={{ width: 44, height: 44, borderRadius: R.pill, backgroundColor: C.sauge, alignItems: 'center', justifyContent: 'center', opacity: !editName.trim() ? 0.5 : 1 }}>
                  <Check size={20} color={C.profond} />
                </Pressable>
                <Pressable onPress={() => setEditMode(false)} accessibilityLabel="Annuler"
                  style={{ width: 44, height: 44, borderRadius: R.pill, backgroundColor: C.white10, alignItems: 'center', justifyContent: 'center' }}>
                  <X size={20} color={C.creme} />
                </Pressable>
              </View>
            ) : (
              <>
                <Txt style={{ fontFamily: F.bodySemi, fontSize: 14, color: C.foret100 }}>Mon profil</Txt>
                <View style={{ flexDirection: 'row', alignItems: 'center', gap: 8 }}>
                  <Txt variant="h1" color={C.creme} numberOfLines={1} style={{ flexShrink: 1 }}>{name}</Txt>
                  <Pressable onPress={() => { setEditName(profile?.display_name ?? ''); setEditMode(true) }} accessibilityLabel="Modifier mon prénom"
                    style={{ width: 32, height: 32, borderRadius: R.pill, backgroundColor: C.white10, alignItems: 'center', justifyContent: 'center' }}>
                    <Pencil size={14} color={C.creme} />
                  </Pressable>
                </View>
              </>
            )}
            {circle && (
              <View style={{ marginTop: 8, alignSelf: 'flex-start', flexDirection: 'row', alignItems: 'center', gap: 6, borderRadius: R.pill, backgroundColor: C.white10, paddingHorizontal: 10, paddingVertical: 4 }}>
                {isPlanner ? <ChefHat size={14} color={C.jaune} /> : <Users size={14} color={C.sauge} />}
                <Txt numberOfLines={1} style={{ fontFamily: F.bodyBold, fontSize: 12, color: C.creme }}>{isPlanner ? 'Organisatrice' : 'Membre'} · {circle.name}</Txt>
              </View>
            )}
          </View>
        </View>
        <View style={{ marginTop: 20, flexDirection: 'row', gap: 8 }}>
          {[
            { label: 'Recettes', value: stats ? String(stats.recipes_shared) : '–' },
            { label: 'Repas', value: stats ? String(stats.meals_planned) : '–' },
            { label: 'Avis +', value: stats?.approval_pct != null ? `${stats.approval_pct}%` : '–' },
          ].map(s => (
            <View key={s.label} style={{ flex: 1, borderRadius: R.md, backgroundColor: C.white10, paddingHorizontal: 12, paddingVertical: 10 }}>
              <Txt variant="meta" color={C.foret100}>{s.label}</Txt>
              <Txt style={{ marginTop: 2, fontFamily: F.title, fontSize: 20, color: C.creme }}>{s.value}</Txt>
            </View>
          ))}
        </View>
      </View>

      {/* Mon assiette */}
      <Card style={{ gap: 12 }}>
        <CardTitle icon={UtensilsCrossed} title="Mon assiette" right={(
          <Pressable onPress={() => setPrefsOpen(true)} accessibilityRole="button"
            style={{ height: 36, flexDirection: 'row', alignItems: 'center', gap: 6, borderRadius: R.pill, backgroundColor: C.foret50, paddingHorizontal: 14 }}>
            <SlidersHorizontal size={14} color={C.foret} /><Txt variant="smallBold" color={C.foret} style={{ fontSize: 14 }}>Ajuster</Txt>
          </Pressable>
        )} />
        {prefs.length === 0 && cuisines.length === 0 ? (
          <Pressable onPress={() => setPrefsOpen(true)} style={{ borderRadius: R.lg, borderWidth: 1.5, borderStyle: 'dashed', borderColor: C.filet, paddingHorizontal: 16, paddingVertical: 20 }}>
            <Txt variant="small" style={{ textAlign: 'center', fontSize: 14 }}>Ajoute tes allergies, tes envies et ce que tu n’aimes pas : le menu en tiendra compte.</Txt>
          </Pressable>
        ) : (
          <View style={{ flexDirection: 'row', flexWrap: 'wrap', gap: 6 }}>
            {prefs.map(p => {
              const s = prefChipStyle(p)
              return (
                <View key={p.id} style={{ flexDirection: 'row', alignItems: 'center', gap: 4, borderRadius: R.pill, borderWidth: 1, borderColor: s.border, backgroundColor: s.bg, paddingHorizontal: 10, paddingVertical: 4 }}>
                  {s.Icon && <s.Icon size={12} color={s.fg} />}
                  <Txt style={{ fontFamily: F.bodySemi, fontSize: 12, color: s.fg }}>{p.value}</Txt>
                </View>
              )
            })}
            {cuisines.map(c => (
              <View key={c} style={{ borderRadius: R.pill, backgroundColor: C.sauge50, paddingHorizontal: 10, paddingVertical: 4 }}>
                <Txt style={{ fontFamily: F.bodySemi, fontSize: 12, color: C.foret500 }}>{c}</Txt>
              </View>
            ))}
          </View>
        )}
        <View style={{ flexDirection: 'row', alignItems: 'flex-start', gap: 6 }}>
          <Sparkles size={14} color={C.foret500} style={{ marginTop: 2 }} />
          <Txt variant="meta" style={{ flex: 1 }}>Ces choix guident automatiquement la génération du menu de la semaine.</Txt>
        </View>
      </Card>

      {/* Mon cercle */}
      <Card style={{ gap: 8 }}>
        <CardTitle icon={Users} title="Mon cercle" right={(
          <Pressable onPress={() => router.navigate('/circle')} hitSlop={8} style={{ flexDirection: 'row', alignItems: 'center', gap: 2 }}>
            <Txt variant="smallBold" color={C.foret} style={{ fontSize: 14 }}>Gérer</Txt><ChevronRight size={16} color={C.foret} />
          </Pressable>
        )} />
        {members.length > 0 ? (
          <>
            {members.slice(0, MEMBERS_SHOWN).map((m, i) => {
              const n = m.users!.display_name || m.users!.email
              return (
                <View key={m.id} style={{ flexDirection: 'row', alignItems: 'center', gap: 12, paddingVertical: 4 }}>
                  <View style={{ width: 36, height: 36, borderRadius: R.pill, backgroundColor: AVATAR_COLORS[i % AVATAR_COLORS.length], alignItems: 'center', justifyContent: 'center' }}>
                    <Txt style={{ fontFamily: F.title, fontSize: 14, color: '#FFFFFF' }}>{n.charAt(0).toUpperCase()}</Txt>
                  </View>
                  <Txt numberOfLines={1} variant="smallBold" style={{ flex: 1, fontSize: 14 }}>{n}</Txt>
                  <Txt variant="meta">{ROLE_LABEL[m.role] ?? m.role}</Txt>
                </View>
              )
            })}
            {members.length > MEMBERS_SHOWN && <Txt variant="meta">et {members.length - MEMBERS_SHOWN} autre{members.length - MEMBERS_SHOWN > 1 ? 's' : ''}</Txt>}
          </>
        ) : <Txt variant="small" style={{ fontSize: 14 }}>Pas encore de cercle : crée-le pour planifier en famille.</Txt>}
        <Pressable onPress={() => router.navigate('/circle')} accessibilityRole="button"
          style={{ marginTop: 4, height: 44, flexDirection: 'row', alignItems: 'center', justifyContent: 'center', gap: 8, borderRadius: R.pill, backgroundColor: C.foret50 }}>
          <UserPlus size={16} color={C.foret} /><Txt variant="smallBold" color={C.foret} style={{ fontSize: 14 }}>Inviter à ma table</Txt>
        </Pressable>
      </Card>

      {/* Réglages */}
      <Card padding={0} style={{ overflow: 'hidden' }}>
        <View style={{ paddingHorizontal: 20, paddingTop: 20, paddingBottom: 4 }}><CardTitle icon={Settings} title="Réglages" /></View>
        <View style={{ paddingHorizontal: 8, paddingBottom: 8 }}>
          {isPlanner && <SettingRow icon={CalendarDays} label="Rythme des repas" sub="Repas préparés, heures, fréquence" onPress={() => router.push('/settings/meal-config')} />}
          <SettingRow icon={Bell} label="Notifications" sub="Rappels et demandes d’avis" onPress={() => router.push('/settings/notifications')} />
          <SettingRow icon={Globe} label="Langue & unités culinaires" sub="Français · mesures locales" soon />
          <SettingRow icon={LifeBuoy} label="Aide & astuces" soon />
          <SettingRow icon={Settings} label="Tous les paramètres" sub="Compte, préférences, rythme" onPress={() => router.push('/settings')} />
        </View>
        <View style={{ gap: 12, paddingHorizontal: 20, paddingVertical: 16, borderTopWidth: 1, borderStyle: 'dashed', borderColor: C.filet }}>
          <SettingRow icon={Share2} label="Partager KeskonBouf" sub="Fais découvrir l’app à tes proches" chevron={false} />
          <ShareActions getPayload={appSharePayload} />
        </View>
        <Pressable onPress={() => void handleLogout()} accessibilityRole="button"
          style={({ pressed }) => ({ flexDirection: 'row', alignItems: 'center', justifyContent: 'center', gap: 8, paddingVertical: 16, borderTopWidth: 1, borderColor: C.lin, backgroundColor: pressed ? C.dangerLight : 'transparent' })}>
          <LogOut size={16} color={C.danger} /><Txt variant="smallBold" color={C.danger} style={{ fontSize: 14 }}>Se déconnecter</Txt>
        </Pressable>
      </Card>

      <DietaryPrefsSheet open={prefsOpen} prefs={prefs} onChange={setPrefs} onClose={() => setPrefsOpen(false)} />
    </Screen>
  )
}

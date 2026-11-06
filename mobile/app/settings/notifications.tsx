import { useCallback, useEffect, useState } from 'react'
import { Linking, Pressable, View } from 'react-native'
import { useSafeAreaInsets } from 'react-native-safe-area-context'
import { router } from 'expo-router'
import { ArrowLeft, Bell, BellOff, BellRing, Check, CheckCircle2, Info, MessageSquare, Smartphone } from 'lucide-react-native'
import { Bone, Button, Card, CardTitle, EmptyState, MealTile, Screen, TimeField, Toggle, Txt } from '@/components/ui'
import { request } from '@/lib/api'
import { toast } from '@/lib/toast'
import { askPermission, readPermission, scheduleMealReminders, type PermissionState } from '@/lib/reminders'
import { MEAL_LABEL, type MealType } from '@/shared/meal-type'
import { C, F, R, SHADOW } from '@/theme'

interface MealConfig { meal_type: MealType; is_active: boolean; display_order: number; default_time: string }
interface NotifPref { meal_type: MealType; reminder_enabled: boolean; reminder_time: string | null; days_of_week: number[]; feedback_enabled: boolean; feedback_delay_min: number }

const DAYS = [
  { label: 'L', full: 'Lundi', value: 1 }, { label: 'M', full: 'Mardi', value: 2 }, { label: 'M', full: 'Mercredi', value: 3 },
  { label: 'J', full: 'Jeudi', value: 4 }, { label: 'V', full: 'Vendredi', value: 5 }, { label: 'S', full: 'Samedi', value: 6 }, { label: 'D', full: 'Dimanche', value: 7 },
]
const DELAYS = [{ label: '30 min', value: 30 }, { label: '1 h', value: 60 }, { label: '2 h', value: 120 }, { label: '3 h', value: 180 }]
const PERMISSION_LABEL: Record<PermissionState, string> = { granted: 'Autorisées', default: 'À autoriser', denied: 'Bloquées', unsupported: 'Non prises en charge' }
const defaultPref = (t: MealType, time: string): NotifPref => ({ meal_type: t, reminder_enabled: false, reminder_time: time, days_of_week: [1, 2, 3, 4, 5, 6, 7], feedback_enabled: false, feedback_delay_min: 120 })

// Notifications (cf. app/(app)/settings/notifications/page.tsx). Les rappels
// sont planifiés sur l'appareil (notifications locales) à l'enregistrement.
export default function NotificationsScreen() {
  const insets = useSafeAreaInsets()
  const [configs, setConfigs] = useState<MealConfig[]>([])
  const [prefs, setPrefs] = useState<Record<string, NotifPref>>({})
  const [savedPrefs, setSavedPrefs] = useState<Record<string, NotifPref>>({})
  const [loading, setLoading] = useState(true)
  const [saving, setSaving] = useState(false)
  const [permission, setPermission] = useState<PermissionState>('default')

  useEffect(() => { void readPermission().then(setPermission) }, [])

  const load = useCallback(async () => {
    setLoading(true)
    try {
      const [cfg, pr] = await Promise.all([
        request<MealConfig[]>('/api/users/me/meal-config'),
        request<NotifPref[]>('/api/users/me/notification-prefs'),
      ])
      const configData = cfg.ok && Array.isArray(cfg.data) ? cfg.data : []
      const prefData = pr.ok && Array.isArray(pr.data) ? pr.data : []
      const active = configData.filter(c => c.is_active)
      setConfigs(active)
      const map: Record<string, NotifPref> = {}
      for (const c of active) map[c.meal_type] = prefData.find(p => p.meal_type === c.meal_type) ?? defaultPref(c.meal_type, c.default_time)
      setPrefs(map); setSavedPrefs(map)
    } catch {
      toast.error('Erreur de connexion')
    } finally {
      setLoading(false)
    }
  }, [])
  useEffect(() => { void load() }, [load])

  const update = (t: MealType, p: Partial<NotifPref>) => setPrefs(prev => ({ ...prev, [t]: { ...prev[t], ...p } }))
  function toggleDay(t: MealType, day: number) {
    const cur = prefs[t]?.days_of_week ?? [1, 2, 3, 4, 5, 6, 7]
    const next = cur.includes(day) ? cur.filter(d => d !== day) : [...cur, day]
    update(t, { days_of_week: next.length ? next : cur })
  }

  // Permission demandée au premier passage sur ON ou via « Autoriser » (jamais au chargement).
  async function ensurePermission(): Promise<boolean> {
    const result = await askPermission()
    setPermission(result)
    if (result === 'unsupported') { toast.warning('Notifications non prises en charge sur cet appareil'); return false }
    if (result !== 'granted') { toast.warning('Autorise les notifications dans les réglages de ton téléphone.'); return false }
    return true
  }

  async function onReminderToggle(t: MealType, on: boolean) {
    if (on && !(await ensurePermission())) return
    update(t, { reminder_enabled: on })
  }

  async function save() {
    setSaving(true)
    const rows = Object.values(prefs)
    const res = await request('/api/users/me/notification-prefs', { method: 'PUT', json: rows }).catch(() => null)
    setSaving(false)
    if (!res?.ok) { toast.error('Impossible d’enregistrer'); return }
    setSavedPrefs(prefs)
    await scheduleMealReminders(rows).catch(() => {})
    toast.success('Préférences enregistrées')
  }

  if (loading) return <Screen header={false} withTabBar={false}><Bone style={{ height: 240, borderRadius: R.xl }} /><Bone style={{ height: 260, borderRadius: R.xl }} /></Screen>

  const list = configs.filter(c => prefs[c.meal_type])
  const reminders = list.filter(c => prefs[c.meal_type].reminder_enabled).length
  const feedbacks = list.filter(c => prefs[c.meal_type].feedback_enabled).length
  const dirty = JSON.stringify(prefs) !== JSON.stringify(savedPrefs)
  const blocked = permission === 'denied' || permission === 'unsupported'

  return (
    <View style={{ flex: 1, backgroundColor: C.creme }}>
      <Screen header={false} withTabBar={false} contentStyle={{ paddingBottom: (list.length ? 110 : 32) + insets.bottom }}>
        <View style={{ backgroundColor: C.foret, borderRadius: R.xl, padding: 20 }}>
          <View style={{ flexDirection: 'row', alignItems: 'center', justifyContent: 'space-between' }}>
            <Txt style={{ fontFamily: F.bodySemi, fontSize: 14, color: C.foret100 }}>Réglages</Txt>
            <Pressable onPress={() => router.back()} accessibilityRole="button" accessibilityLabel="Retour"
              style={{ width: 40, height: 40, borderRadius: R.pill, backgroundColor: C.white10, alignItems: 'center', justifyContent: 'center' }}>
              <ArrowLeft size={20} color={C.creme} />
            </Pressable>
          </View>
          <Txt variant="h1" color={C.creme} style={{ marginTop: 4 }}>Notifications</Txt>
          <Txt variant="small" color={C.foret100} style={{ marginTop: 4, fontSize: 14 }}>
            Un petit rappel avant de passer en cuisine, et une demande d’avis après le repas pour que le menu s’améliore chaque semaine.
          </Txt>
          <View style={{ marginTop: 20, flexDirection: 'row', gap: 8 }}>
            {[
              { label: 'Rappels', value: `${reminders}`, of: `/${list.length}` },
              { label: 'Avis demandés', value: `${feedbacks}`, of: `/${list.length}` },
            ].map(s => (
              <View key={s.label} style={{ flex: 1, borderRadius: R.md, backgroundColor: C.white10, paddingHorizontal: 12, paddingVertical: 10 }}>
                <Txt variant="meta" color={C.foret100} numberOfLines={1}>{s.label}</Txt>
                <Txt style={{ marginTop: 2, fontFamily: F.title, fontSize: 20, color: C.creme }}>{s.value}<Txt style={{ fontFamily: F.bodyBold, fontSize: 14, color: C.foret100 }}>{s.of}</Txt></Txt>
              </View>
            ))}
            <View style={{ flex: 1, borderRadius: R.md, backgroundColor: C.white10, paddingHorizontal: 12, paddingVertical: 10 }}>
              <Txt variant="meta" color={C.foret100} numberOfLines={1}>Cet appareil</Txt>
              <Txt style={{ marginTop: 4, fontFamily: F.bodyBold, fontSize: 13, color: C.creme }}>{PERMISSION_LABEL[permission]}</Txt>
            </View>
          </View>
          {permission === 'default' && <Button label="Autoriser les notifications" icon={BellRing} tone="creme" style={{ marginTop: 16, alignSelf: 'flex-start' }} onPress={() => void ensurePermission()} />}
          {blocked && (
            <View style={{ marginTop: 16, flexDirection: 'row', alignItems: 'flex-start', gap: 8, borderRadius: R.md, backgroundColor: C.white10, paddingHorizontal: 12, paddingVertical: 10 }}>
              <BellOff size={16} color={C.jaune} style={{ marginTop: 2 }} />
              <View style={{ flex: 1, gap: 6 }}>
                <Txt variant="small" color={C.creme} style={{ fontSize: 14 }}>
                  {permission === 'denied' ? 'Les notifications sont bloquées pour KeskonBouf : réactive-les dans les réglages de ton téléphone.' : 'Cet appareil ne reçoit pas les notifications.'}
                </Txt>
                {permission === 'denied' && <Pressable onPress={() => void Linking.openSettings()}><Txt variant="smallBold" color={C.sauge} style={{ fontSize: 14 }}>Ouvrir les réglages</Txt></Pressable>}
              </View>
            </View>
          )}
        </View>

        {list.length === 0 ? (
          <View style={{ borderRadius: R.xl, backgroundColor: '#FFFFFF' }}>
            <EmptyState icon={Bell} title="Aucun repas actif" description="Choisis d’abord les repas que tu prépares : leurs rappels apparaîtront ici."
              action={<Button label="Régler le rythme des repas" tone="foret" onPress={() => router.replace('/settings/meal-config')} />} />
          </View>
        ) : list.map(cfg => {
          const pref = prefs[cfg.meal_type]
          const name = MEAL_LABEL[cfg.meal_type].toLowerCase()
          return (
            <Card key={cfg.meal_type} style={{ gap: 8 }}>
              <View style={{ flexDirection: 'row', alignItems: 'center', gap: 12, marginBottom: 8 }}>
                <MealTile type={cfg.meal_type} size={44} />
                <View>
                  <Txt variant="h3">{MEAL_LABEL[cfg.meal_type]}</Txt>
                  {!!cfg.default_time && <Txt variant="meta">Repas à {cfg.default_time.slice(0, 5).replace(':', 'h')}</Txt>}
                </View>
              </View>

              <View style={{ borderRadius: R.lg, backgroundColor: C.creme, padding: 12, gap: 12 }}>
                <View style={{ flexDirection: 'row', alignItems: 'center', justifyContent: 'space-between' }}>
                  <View style={{ flexDirection: 'row', alignItems: 'center', gap: 8 }}><BellRing size={16} color={C.foret500} /><Txt variant="smallBold" style={{ fontSize: 14 }}>Rappel</Txt></View>
                  <Toggle value={pref.reminder_enabled} onChange={on => void onReminderToggle(cfg.meal_type, on)} label={`Rappel du ${name}`} />
                </View>
                {pref.reminder_enabled && (
                  <>
                    <View style={{ flexDirection: 'row', alignItems: 'center', justifyContent: 'space-between' }}>
                      <Txt variant="small" style={{ fontSize: 14 }}>À</Txt>
                      <TimeField value={(pref.reminder_time ?? cfg.default_time ?? '').slice(0, 5)} onChange={v => update(cfg.meal_type, { reminder_time: v })} label={`Heure du rappel du ${name}`} />
                    </View>
                    <View style={{ flexDirection: 'row', justifyContent: 'space-between', gap: 4 }} accessibilityLabel="Jours du rappel">
                      {DAYS.map(d => {
                        const on = pref.days_of_week.includes(d.value)
                        return (
                          <Pressable key={d.value} onPress={() => toggleDay(cfg.meal_type, d.value)} accessibilityRole="button" accessibilityState={{ selected: on }} accessibilityLabel={d.full}
                            style={{ width: 36, height: 36, borderRadius: R.pill, alignItems: 'center', justifyContent: 'center', backgroundColor: on ? C.foret : '#FFFFFF' }}>
                            <Txt style={{ fontFamily: F.bodyBold, fontSize: 12, color: on ? C.creme : C.texte2 }}>{d.label}</Txt>
                          </Pressable>
                        )
                      })}
                    </View>
                  </>
                )}
              </View>

              <View style={{ borderRadius: R.lg, backgroundColor: C.creme, padding: 12, gap: 12 }}>
                <View style={{ flexDirection: 'row', alignItems: 'center', justifyContent: 'space-between' }}>
                  <View style={{ flexDirection: 'row', alignItems: 'center', gap: 8 }}><MessageSquare size={16} color={C.foret500} /><Txt variant="smallBold" style={{ fontSize: 14 }}>Demande d’avis</Txt></View>
                  <Toggle value={pref.feedback_enabled} onChange={on => update(cfg.meal_type, { feedback_enabled: on })} label={`Avis après le ${name}`} />
                </View>
                {pref.feedback_enabled && (
                  <View style={{ gap: 8 }}>
                    <Txt variant="small" style={{ fontSize: 14 }}>Après le repas</Txt>
                    <View style={{ flexDirection: 'row', gap: 4, borderRadius: R.pill, backgroundColor: '#FFFFFF', padding: 4 }} accessibilityRole="radiogroup">
                      {DELAYS.map(d => {
                        const on = pref.feedback_delay_min === d.value
                        return (
                          <Pressable key={d.value} onPress={() => update(cfg.meal_type, { feedback_delay_min: d.value })} accessibilityRole="radio" accessibilityState={{ checked: on }}
                            style={{ flex: 1, height: 32, borderRadius: R.pill, alignItems: 'center', justifyContent: 'center', backgroundColor: on ? C.foret : 'transparent' }}>
                            <Txt style={{ fontFamily: F.bodyBold, fontSize: 12, color: on ? C.creme : C.texte2 }}>{d.label}</Txt>
                          </Pressable>
                        )
                      })}
                    </View>
                  </View>
                )}
              </View>
            </Card>
          )
        })}

        <Card style={{ gap: 12 }}>
          <CardTitle icon={Info} title="Bon à savoir" />
          {[
            { icon: BellRing, strong: 'Le rappel', text: ' arrive à l’heure choisie, les jours cochés, directement sur ce téléphone.' },
            { icon: MessageSquare, strong: 'La demande d’avis', text: ' part après le repas : la famille répond d’un geste, et les plats aimés reviennent plus souvent.' },
            { icon: Smartphone, strong: 'Sur chaque appareil', text: ', les rappels se règlent depuis l’app : enregistre tes préférences pour les activer ici.' },
          ].map(t => (
            <View key={t.strong} style={{ flexDirection: 'row', gap: 10 }}>
              <t.icon size={16} color={C.foret500} style={{ marginTop: 2 }} />
              <Txt variant="small" style={{ flex: 1, fontSize: 14 }}><Txt variant="smallBold" style={{ fontSize: 14 }}>{t.strong}</Txt>{t.text}</Txt>
            </View>
          ))}
        </Card>
      </Screen>

      {list.length > 0 && (
        <View style={[{ position: 'absolute', left: 16, right: 16, bottom: insets.bottom + 16, flexDirection: 'row', alignItems: 'center', gap: 8, borderRadius: R.pill, backgroundColor: '#FFFFFF', padding: 8, paddingLeft: 20 }, SHADOW.float]}>
          {dirty
            ? <Txt numberOfLines={1} variant="smallBold" style={{ flex: 1, fontSize: 14 }}>Modifications à enregistrer</Txt>
            : <View style={{ flex: 1, flexDirection: 'row', alignItems: 'center', gap: 6 }}><CheckCircle2 size={16} color={C.foret500} /><Txt numberOfLines={1} variant="small" color={C.foret500} style={{ fontSize: 14 }}>Préférences à jour</Txt></View>}
          {dirty && !saving && <Button label="Annuler" tone="link" size="sm" onPress={() => setPrefs(savedPrefs)} />}
          <Button label="Enregistrer" icon={Check} tone="orange" onPress={() => void save()} disabled={!dirty} loading={saving} />
        </View>
      )}
    </View>
  )
}

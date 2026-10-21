import { useCallback, useEffect, useMemo, useState } from 'react'
import { Pressable, View } from 'react-native'
import { useSafeAreaInsets } from 'react-native-safe-area-context'
import { router } from 'expo-router'
import { ArrowLeft, CalendarDays, Check, CheckCircle2, Clock, LayoutGrid, Repeat, Sparkles, WifiOff } from 'lucide-react-native'
import { Bone, Button, Card, CardTitle, EmptyState, MealTypeIcon, Screen, Segmented, TimeField, Toggle, Txt } from '@/components/ui'
import { request } from '@/lib/api'
import { toast } from '@/lib/toast'
import { MEAL_COLOR, MEAL_TYPE_ORDER, type MealType } from '@/shared/meal-type'
import { C, F, R, SHADOW } from '@/theme'

type Mode = 'daily' | 'template'
interface MealConfig { id: string; meal_type: MealType; is_active: boolean; mode: Mode; display_order: number; default_time: string | null }

const CARD_ORDER: MealType[] = ['dejeuner', 'diner', 'petit_dejeuner', 'gouter']
const CARD_TEXT: Record<MealType, { title: string; moment: string; daily: string; template: string; inactive: string }> = {
  dejeuner: { title: 'Déjeuner', moment: 'Pause midi', daily: '7 recettes uniques à savourer chaque midi', template: 'Un même plat du midi pour toute la semaine', inactive: '' },
  diner: { title: 'Dîner', moment: 'Repas du soir', daily: '7 recettes différentes pour chaque soir', template: 'Marmite familiale prête pour la semaine (ex : soupe, sauce graine)', inactive: 'Optionnel · Pour garder la main sur les repas du soir.' },
  petit_dejeuner: { title: 'Petit-déjeuner', moment: 'Début de journée', daily: 'Un petit-déjeuner différent chaque matin', template: 'Formule récurrente (koko, akassa ou thé & pain)', inactive: 'Optionnel · Pour bien démarrer la journée sans y penser.' },
  gouter: { title: 'Goûter', moment: 'Pause de 16h', daily: 'Un en-cas différent chaque après-midi', template: 'Les mêmes fruits et en-cas toute la semaine', inactive: 'Optionnel · Pour anticiper les fruits et en-cas des enfants.' },
}
const GRID_LABEL: Record<MealType, string> = { petit_dejeuner: 'Matin', dejeuner: 'Midi', gouter: '16h', diner: 'Soir' }
const DAYS = ['Lun', 'Mar', 'Mer', 'Jeu', 'Ven', 'Sam', 'Dim']
const MINUTES_PER_DECISION = 15

const fmt = (t: string | null) => (t ? t.slice(0, 5) : '')
function saving(min: number) { const h = Math.floor(min / 60), m = min % 60; return h === 0 ? `${m} min` : m === 0 ? `${h}h` : `${h}h${String(m).padStart(2, '0')}` }
const same = (a: MealConfig[], b: MealConfig[]) => a.every(c => { const o = b.find(x => x.meal_type === c.meal_type); return !!o && o.is_active === c.is_active && o.mode === c.mode && fmt(o.default_time) === fmt(c.default_time) })

// Rythme des repas (cf. app/(app)/settings/meal-config/page.tsx).
export default function MealConfigScreen() {
  const insets = useSafeAreaInsets()
  const [saved, setSaved] = useState<MealConfig[]>([])
  const [draft, setDraft] = useState<MealConfig[]>([])
  const [loading, setLoading] = useState(true)
  const [failed, setFailed] = useState(false)
  const [busy, setBusy] = useState(false)

  const load = useCallback(async () => {
    setLoading(true); setFailed(false)
    try {
      const res = await request<MealConfig[]>('/api/users/me/meal-config')
      if (!res.ok || !Array.isArray(res.data)) throw new Error()
      setSaved(res.data); setDraft(res.data)
    } catch {
      setFailed(true)
    } finally {
      setLoading(false)
    }
  }, [])
  useEffect(() => { void load() }, [load])

  const patch = (t: MealType, ch: Partial<Pick<MealConfig, 'is_active' | 'mode' | 'default_time'>>) => setDraft(p => p.map(c => (c.meal_type === t ? { ...c, ...ch } : c)))

  async function save() {
    setBusy(true)
    const res = await request<MealConfig[] & { error?: string }>('/api/users/me/meal-config', {
      method: 'PUT', json: draft.map(c => ({ meal_type: c.meal_type, is_active: c.is_active, mode: c.mode, default_time: c.default_time ? fmt(c.default_time) : null })),
    }).catch(() => null)
    setBusy(false)
    if (!res?.ok || !Array.isArray(res.data)) { toast.error((res?.data as { error?: string } | undefined)?.error ?? 'Erreur de connexion'); return }
    setSaved(res.data); setDraft(res.data)
    toast.success('Rythme des repas enregistré')
  }

  const cards = useMemo(() => CARD_ORDER.map(t => draft.find(c => c.meal_type === t)).filter((c): c is MealConfig => !!c), [draft])
  const rows = useMemo(() => [...draft].sort((a, b) => MEAL_TYPE_ORDER[a.meal_type] - MEAL_TYPE_ORDER[b.meal_type]), [draft])
  const active = draft.filter(c => c.is_active)
  const dishes = active.reduce((n, c) => n + (c.mode === 'daily' ? 7 : 1), 0)
  const savedMinutes = (active.length * 7 - dishes) * MINUTES_PER_DECISION
  const dirty = !same(draft, saved)

  if (loading) return <Screen header={false} withTabBar={false}><Bone style={{ height: 230, borderRadius: R.xl }} /><Bone style={{ height: 200, borderRadius: R.xl }} /><Bone style={{ height: 200, borderRadius: R.xl }} /></Screen>
  if (failed) {
    return (
      <Screen header={false} withTabBar={false}>
        <View style={{ borderRadius: R.xl, backgroundColor: '#FFFFFF', marginTop: 24 }}>
          <EmptyState icon={WifiOff} title="Impossible de charger ton rythme" description="Vérifie ta connexion puis réessaie." action={<Button label="Réessayer" tone="foret" onPress={() => void load()} />} />
        </View>
      </Screen>
    )
  }

  return (
    <View style={{ flex: 1, backgroundColor: C.creme }}>
      <Screen header={false} withTabBar={false} contentStyle={{ paddingBottom: 110 + insets.bottom }}>
        <View style={{ backgroundColor: C.foret, borderRadius: R.xl, padding: 20 }}>
          <View style={{ flexDirection: 'row', alignItems: 'center', justifyContent: 'space-between', gap: 12 }}>
            <Pressable onPress={() => router.back()} accessibilityRole="button" accessibilityLabel="Retour"
              style={{ width: 40, height: 40, borderRadius: R.pill, backgroundColor: C.white10, alignItems: 'center', justifyContent: 'center' }}>
              <ArrowLeft size={20} color={C.creme} />
            </Pressable>
            <Txt style={{ flex: 1, fontFamily: F.bodySemi, fontSize: 14, color: C.foret100 }}>Réglages · organisation familiale</Txt>
            <Pressable onPress={() => router.navigate('/plan')} accessibilityRole="button" accessibilityLabel="Aller au menu de la semaine"
              style={{ width: 40, height: 40, borderRadius: R.pill, backgroundColor: C.white10, alignItems: 'center', justifyContent: 'center' }}>
              <CalendarDays size={18} color={C.creme} />
            </Pressable>
          </View>
          <Txt variant="h1" color={C.creme} style={{ marginTop: 12 }}>Rythme des repas</Txt>
          <Txt variant="small" color={C.foret100} style={{ marginTop: 4, fontSize: 14 }}>
            Choisis les repas que tu prépares et leur fréquence : un plat différent chaque jour, ou le même toute la semaine pour souffler.
          </Txt>
          <View style={{ marginTop: 20, flexDirection: 'row', gap: 8 }}>
            {[
              { label: 'Repas actifs', value: String(active.length), of: '/4' },
              { label: 'Plats à choisir', value: String(dishes), of: ' / sem.' },
              { label: 'Temps gagné', value: savedMinutes > 0 ? saving(savedMinutes) : '—', of: '' },
            ].map(s => (
              <View key={s.label} style={{ flex: 1, borderRadius: R.md, backgroundColor: C.white10, paddingHorizontal: 12, paddingVertical: 10 }}>
                <Txt variant="meta" color={C.foret100} numberOfLines={1}>{s.label}</Txt>
                <Txt style={{ marginTop: 2, fontFamily: F.title, fontSize: 20, color: C.creme }}>
                  {s.value}{!!s.of && <Txt style={{ fontFamily: F.bodyBold, fontSize: 12, color: C.foret100 }}>{s.of}</Txt>}
                </Txt>
              </View>
            ))}
          </View>
        </View>

        {cards.map(c => {
          const t = CARD_TEXT[c.meal_type]
          const color = MEAL_COLOR[c.meal_type]
          const pillar = c.meal_type === 'dejeuner'
          const on = c.is_active
          const benefit = c.mode === 'daily'
            ? { label: 'Varié', bg: C.sauge50, fg: C.foret500 }
            : { label: c.meal_type === 'petit_dejeuner' ? 'Économique' : 'Gain de temps', bg: C.jaune50, fg: C.jauneText }
          return (
            <Card key={c.meal_type} style={{ gap: 14 }}>
              <View style={{ flexDirection: 'row', alignItems: 'flex-start', gap: 12 }}>
                <View style={{ width: 44, height: 44, borderRadius: R.pill, backgroundColor: on ? color.bg : C.creme, alignItems: 'center', justifyContent: 'center' }}>
                  <MealTypeIcon type={c.meal_type} size={20} color={on ? color.text : C.texte2} />
                </View>
                <View style={{ flex: 1 }}>
                  <Txt variant="h3" color={on ? C.profond : C.texte2}>{t.title}</Txt>
                  <Txt variant="meta">{t.moment}</Txt>
                </View>
                {pillar ? (
                  <View style={{ borderRadius: R.pill, backgroundColor: C.foret50, paddingHorizontal: 10, paddingVertical: 4 }}>
                    <Txt style={{ fontFamily: F.bodyBold, fontSize: 11, color: C.foret }}>Toujours actif</Txt>
                  </View>
                ) : <Toggle value={on} onChange={v => patch(c.meal_type, { is_active: v })} label={`Préparer le ${t.title.toLowerCase()}`} />}
              </View>
              {on ? (
                <>
                  <View style={{ flexDirection: 'row', alignItems: 'center', justifyContent: 'space-between', gap: 12, borderRadius: R.lg, backgroundColor: C.creme, paddingHorizontal: 12, paddingVertical: 8 }}>
                    <View style={{ flexDirection: 'row', alignItems: 'center', gap: 8 }}>
                      <Clock size={16} color={C.foret500} /><Txt variant="smallBold" style={{ fontSize: 14 }}>Heure du repas</Txt>
                    </View>
                    <TimeField value={fmt(c.default_time)} onChange={v => patch(c.meal_type, { default_time: v || null })} label={`Heure du ${t.title.toLowerCase()}`} />
                  </View>
                  <Segmented<Mode> tone="creme" value={c.mode} onChange={m => patch(c.meal_type, { mode: m })}
                    options={[{ value: 'daily', label: 'Chaque jour', icon: LayoutGrid }, { value: 'template', label: 'Toute la semaine', icon: Repeat }]} />
                  <View style={{ flexDirection: 'row', alignItems: 'flex-start', justifyContent: 'space-between', gap: 12 }}>
                    <Txt variant="small" style={{ flex: 1 }}>{c.mode === 'daily' ? t.daily : t.template}</Txt>
                    <View style={{ borderRadius: R.pill, backgroundColor: benefit.bg, paddingHorizontal: 8, paddingVertical: 2 }}>
                      <Txt style={{ fontFamily: F.bodyBold, fontSize: 11, color: benefit.fg }}>{benefit.label}</Txt>
                    </View>
                  </View>
                </>
              ) : (
                <View style={{ borderRadius: R.lg, borderWidth: 1.5, borderStyle: 'dashed', borderColor: C.filet, padding: 12 }}>
                  <Txt variant="small">{t.inactive} Active-le pour l’ajouter à tes menus.</Txt>
                </View>
              )}
            </Card>
          )
        })}

        {/* Aperçu de la semaine */}
        <Card style={{ gap: 12 }}>
          <CardTitle icon={CalendarDays} title="Aperçu de la semaine" />
          <View style={{ gap: 4 }}>
            <View style={{ flexDirection: 'row', gap: 4 }}>
              <View style={{ width: 44 }} />
              {DAYS.map(d => <Txt key={d} style={{ flex: 1, textAlign: 'center', fontFamily: F.bodyBold, fontSize: 11, color: C.texte2 }}>{d}</Txt>)}
            </View>
            {rows.map(c => {
              const color = MEAL_COLOR[c.meal_type]
              return (
                <View key={c.meal_type} style={{ flexDirection: 'row', alignItems: 'center', gap: 4 }}>
                  <Txt style={{ width: 44, fontFamily: F.bodyBold, fontSize: 11, color: C.texte2 }}>{GRID_LABEL[c.meal_type]}</Txt>
                  {!c.is_active ? (
                    <View style={{ flex: 1, height: 28, borderRadius: R.sm, borderWidth: 1, borderStyle: 'dashed', borderColor: C.filet, alignItems: 'center', justifyContent: 'center' }}>
                      <Txt style={{ fontFamily: F.bodySemi, fontSize: 10, color: C.texte2 }}>Pas prévu</Txt>
                    </View>
                  ) : c.mode === 'template' ? (
                    <View style={{ flex: 1, height: 28, borderRadius: R.sm, backgroundColor: color.bg, flexDirection: 'row', alignItems: 'center', justifyContent: 'center', gap: 4 }}>
                      <Repeat size={12} color={color.text} /><Txt style={{ fontFamily: F.bodyBold, fontSize: 11, color: color.text }}>Le même toute la semaine</Txt>
                    </View>
                  ) : DAYS.map(d => (
                    <View key={d} style={{ flex: 1, height: 28, borderRadius: R.sm, backgroundColor: color.bg, alignItems: 'center', justifyContent: 'center' }}>
                      <MealTypeIcon type={c.meal_type} size={13} />
                    </View>
                  ))}
                </View>
              )
            })}
          </View>
          <View style={{ gap: 6, paddingTop: 12, borderTopWidth: 1, borderStyle: 'dashed', borderColor: C.filet }}>
            <Txt variant="small" style={{ fontSize: 14 }}><Txt style={{ fontFamily: F.title, fontSize: 18, color: C.profond }}>{dishes}</Txt> {dishes > 1 ? 'plats' : 'plat'} à choisir chaque semaine</Txt>
            {savedMinutes > 0 && (
              <View style={{ flexDirection: 'row', alignItems: 'center', gap: 6 }}>
                <Sparkles size={14} color={C.foret500} /><Txt variant="meta" color={C.foret500}>Environ {saving(savedMinutes)} de réflexion en moins par semaine</Txt>
              </View>
            )}
          </View>
        </Card>
      </Screen>

      {/* Barre d'enregistrement */}
      <View style={[{ position: 'absolute', left: 16, right: 16, bottom: insets.bottom + 16, flexDirection: 'row', alignItems: 'center', gap: 8, borderRadius: R.pill, backgroundColor: '#FFFFFF', padding: 8, paddingLeft: 20 }, SHADOW.float]}>
        {dirty
          ? <Txt numberOfLines={1} variant="smallBold" style={{ flex: 1, fontSize: 14 }}>Modifications à enregistrer</Txt>
          : <View style={{ flex: 1, flexDirection: 'row', alignItems: 'center', gap: 6 }}><CheckCircle2 size={16} color={C.foret500} /><Txt numberOfLines={1} variant="small" color={C.foret500} style={{ fontSize: 14 }}>Ton rythme est à jour</Txt></View>}
        {dirty && !busy && <Button label="Annuler" tone="link" size="sm" onPress={() => setDraft(saved)} />}
        <Button label="Enregistrer" icon={Check} tone="orange" onPress={() => void save()} disabled={!dirty} loading={busy} />
      </View>
    </View>
  )
}

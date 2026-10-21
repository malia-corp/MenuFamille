import { useCallback, useState } from 'react'
import { Pressable, View } from 'react-native'
import { router } from 'expo-router'
import { ArrowLeft, Bell, CalendarDays, Globe, HelpCircle, Info, LogOut, Scale, Share2, Users, UtensilsCrossed } from 'lucide-react-native'
import { Screen, ShareActions, Txt, useReloadOnFocus } from '@/components/ui'
import { DietaryPrefsSheet } from '@/components/settings/DietaryPrefsSheet'
import { SettingRow } from '@/components/settings/SettingRow'
import { get } from '@/lib/api'
import { useSession } from '@/lib/session'
import { toast } from '@/lib/toast'
import type { Pref } from '@/shared/dietary-pref'
import { appSharePayload } from '@/shared/share'
import { C, F, R } from '@/theme'

function Section({ label, children }: { label: string; children: React.ReactNode }) {
  return (
    <View style={{ gap: 8 }}>
      <Txt style={{ paddingHorizontal: 4, fontFamily: F.bodyBold, fontSize: 12, color: C.texte2 }}>{label}</Txt>
      <View style={{ borderRadius: R.xl, backgroundColor: '#FFFFFF', padding: 6 }}>{children}</View>
    </View>
  )
}

function prefsSummary(prefs: Pref[]): string {
  if (prefs.length === 0) return 'Allergies, goûts et coups de cœur'
  const allergies = prefs.filter(p => p.pref_type === 'allergy').length
  const others = prefs.length - allergies
  return [allergies ? `${allergies} allergie${allergies > 1 ? 's' : ''}` : null, others ? `${others} goût${others > 1 ? 's' : ''}` : null].filter(Boolean).join(' · ')
}

// Paramètres (cf. app/(app)/settings/page.tsx).
export default function SettingsScreen() {
  const logout = useSession(s => s.logout)
  const [prefs, setPrefs] = useState<Pref[]>([])
  const [prefsOpen, setPrefsOpen] = useState(false)
  const load = useCallback(async () => {
    const res = await get<{ data?: Pref[] }>('/api/users/me/dietary-prefs')
    setPrefs(Array.isArray(res?.data) ? res.data : [])
  }, [])
  useReloadOnFocus(load)
  const soon = () => toast.info('Bientôt disponible')

  return (
    <Screen header={false} withTabBar={false}>
      <View style={{ flexDirection: 'row', alignItems: 'center', gap: 12 }}>
        <Pressable onPress={() => router.back()} accessibilityRole="button" accessibilityLabel="Retour"
          style={{ width: 40, height: 40, borderRadius: R.pill, backgroundColor: '#FFFFFF', alignItems: 'center', justifyContent: 'center' }}>
          <ArrowLeft size={20} color={C.foret} />
        </Pressable>
        <Txt variant="h1">Paramètres</Txt>
      </View>

      <Section label="Planification">
        <SettingRow icon={CalendarDays} label="Rythme des repas" sub="Repas actifs et fréquence" onPress={() => router.push('/settings/meal-config')} />
        <SettingRow icon={Bell} label="Notifications" sub="Rappels de repas et avis" onPress={() => router.push('/settings/notifications')} />
        <SettingRow icon={Users} label="Mon cercle familial" sub="Membres et code d’invitation" onPress={() => router.navigate('/circle')} />
      </Section>

      <Section label="Mes préférences">
        <SettingRow icon={UtensilsCrossed} label="Préférences alimentaires" sub={prefsSummary(prefs)} onPress={() => setPrefsOpen(true)} />
        <SettingRow icon={Globe} label="Langue & Unités culinaires" sub="Français · Mesures locales" onPress={soon} />
        <SettingRow icon={Scale} label="Unités de mesure" sub="Grammes, louches, tasses…" onPress={soon} />
      </Section>

      <Section label="Application">
        <SettingRow icon={HelpCircle} label="Aide & Astuces familiales" onPress={soon} />
        <View style={{ padding: 6, gap: 12 }}>
          <SettingRow icon={Share2} label="Partager KeskonBouf" sub="Fais découvrir l’application à tes proches" chevron={false} />
          <ShareActions getPayload={appSharePayload} />
        </View>
        <SettingRow icon={Info} label="Version" sub="KeskonBouf v1.0 · application mobile" chevron={false} />
      </Section>

      <Section label="Compte">
        <Pressable onPress={async () => { await logout(); router.replace('/login') }} accessibilityRole="button"
          style={({ pressed }) => ({ minHeight: 56, flexDirection: 'row', alignItems: 'center', gap: 12, paddingHorizontal: 12, borderRadius: R.lg, backgroundColor: pressed ? C.dangerLight : 'transparent' })}>
          <View style={{ width: 40, height: 40, borderRadius: R.pill, backgroundColor: C.dangerLight, alignItems: 'center', justifyContent: 'center' }}><LogOut size={16} color={C.danger} /></View>
          <Txt variant="bodySemi" color={C.danger}>Se déconnecter</Txt>
        </Pressable>
      </Section>

      <DietaryPrefsSheet open={prefsOpen} prefs={prefs} onChange={setPrefs} onClose={() => setPrefsOpen(false)} />
    </Screen>
  )
}

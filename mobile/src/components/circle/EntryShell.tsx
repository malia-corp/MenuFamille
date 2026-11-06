import { KeyboardAvoidingView, Platform, Pressable, ScrollView, View } from 'react-native'
import { useSafeAreaInsets } from 'react-native-safe-area-context'
import { ArrowLeft, Check, type LucideIcon } from 'lucide-react-native'
import { Txt } from '@/components/ui'
import { C, F, R } from '@/theme'

// Mise en page commune à la création et à l'adhésion d'un cercle : panneau vert
// (explication, étapes) puis carte blanche (formulaire).
export function EntryShell({ aside, onBack, children }: { aside: React.ReactNode; onBack?: () => void; children: React.ReactNode }) {
  const insets = useSafeAreaInsets()
  return (
    <KeyboardAvoidingView behavior={Platform.OS === 'ios' ? 'padding' : undefined} style={{ flex: 1, backgroundColor: C.creme }}>
      <ScrollView contentContainerStyle={{ padding: 16, paddingTop: insets.top + 8, paddingBottom: insets.bottom + 32, gap: 16 }} keyboardShouldPersistTaps="handled">
        <View style={{ backgroundColor: C.foret, borderRadius: R.xl, padding: 20 }}>
          {onBack && (
            <Pressable onPress={onBack} accessibilityRole="button" accessibilityLabel="Retour"
              style={{ marginBottom: 16, width: 40, height: 40, borderRadius: R.pill, backgroundColor: C.white10, alignItems: 'center', justifyContent: 'center' }}>
              <ArrowLeft size={20} color={C.creme} />
            </Pressable>
          )}
          {aside}
        </View>
        <View style={{ backgroundColor: '#FFFFFF', borderRadius: R.xl, padding: 20 }}>{children}</View>
      </ScrollView>
    </KeyboardAvoidingView>
  )
}

export interface EntryStep { icon: LucideIcon; title: string; text: string }

// Étapes du parcours ; current = étape en cours (les précédentes sont cochées).
export function EntrySteps({ steps, current }: { steps: EntryStep[]; current: number }) {
  return (
    <View style={{ marginTop: 20, flexDirection: 'row', gap: 8 }}>
      {steps.map(({ icon: Icon, title }, i) => {
        const done = i < current
        const now = i === current
        return (
          <View key={title} style={{ flex: 1, alignItems: 'center', gap: 8 }} accessibilityState={{ selected: now }}>
            <View style={{ width: 40, height: 40, borderRadius: R.pill, alignItems: 'center', justifyContent: 'center', backgroundColor: done ? C.sauge : now ? C.creme : C.white10 }}>
              {done ? <Check size={20} color={C.profond} /> : <Icon size={20} color={now ? C.foret : C.sauge} />}
            </View>
            <Txt style={{ textAlign: 'center', fontFamily: F.bodyBold, fontSize: 12, lineHeight: 15, color: done ? C.foret100 : C.creme }}>{title}</Txt>
          </View>
        )
      })}
    </View>
  )
}

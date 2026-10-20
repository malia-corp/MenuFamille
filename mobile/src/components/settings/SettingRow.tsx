import { Pressable, View } from 'react-native'
import { ChevronRight, type LucideIcon } from 'lucide-react-native'
import { Txt } from '@/components/ui'
import { C, F, R } from '@/theme'

// Ligne de réglage ; « Bientôt » pour ce qui n'est pas encore disponible.
export function SettingRow({ icon: Icon, label, sub, onPress, soon, chevron = true }: { icon: LucideIcon; label: string; sub?: string; onPress?: () => void; soon?: boolean; chevron?: boolean }) {
  return (
    <Pressable onPress={onPress} disabled={!onPress || soon} accessibilityRole={onPress ? 'button' : undefined}
      style={({ pressed }) => ({ minHeight: 56, flexDirection: 'row', alignItems: 'center', gap: 12, borderRadius: R.lg, paddingHorizontal: 12, paddingVertical: 10, backgroundColor: pressed ? C.creme : 'transparent', opacity: soon ? 0.6 : 1 })}>
      <View style={{ width: 40, height: 40, borderRadius: R.pill, backgroundColor: C.creme, alignItems: 'center', justifyContent: 'center' }}><Icon size={16} color={C.foret} /></View>
      <View style={{ flex: 1 }}>
        <Txt variant="bodySemi">{label}</Txt>
        {!!sub && <Txt variant="meta">{sub}</Txt>}
      </View>
      {soon
        ? <View style={{ borderRadius: R.pill, backgroundColor: C.lin, paddingHorizontal: 8, paddingVertical: 2 }}><Txt style={{ fontFamily: F.bodyBold, fontSize: 11, color: C.texte2 }}>Bientôt</Txt></View>
        : chevron && onPress ? <ChevronRight size={16} color={C.texte2} /> : null}
    </Pressable>
  )
}

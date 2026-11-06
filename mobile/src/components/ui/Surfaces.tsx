import { Pressable, View, type StyleProp, type ViewStyle } from 'react-native'
import type { LucideIcon } from 'lucide-react-native'
import { C, F, R } from '@/theme'
import { Txt } from './Txt'

// Carte blanche des pages (les cartes se détachent par le blanc sur crème,
// sans ombre).
export function Card({ children, style, padding = 20, onPress }: {
  children: React.ReactNode; style?: StyleProp<ViewStyle>; padding?: number; onPress?: () => void
}) {
  const s = [{ backgroundColor: C.carte, borderRadius: R.xl, padding }, style]
  if (onPress) {
    return (
      <Pressable onPress={onPress} style={({ pressed }) => [s, { transform: [{ scale: pressed ? 0.99 : 1 }] }]}>
        {children}
      </Pressable>
    )
  }
  return <View style={s}>{children}</View>
}

// Bandeau vert forêt en tête des écrans.
export function Hero({ children, style }: { children: React.ReactNode; style?: StyleProp<ViewStyle> }) {
  return <View style={[{ backgroundColor: C.foret, borderRadius: R.xl, padding: 20 }, style]}>{children}</View>
}

// Pastille ronde d'icône (titre de carte, ligne de réglage…).
export function IconTile({ icon: Icon, size = 32, bg = C.foret50, fg = C.foret }: { icon: LucideIcon; size?: number; bg?: string; fg?: string }) {
  return (
    <View style={{ width: size, height: size, borderRadius: R.pill, backgroundColor: bg, alignItems: 'center', justifyContent: 'center' }}>
      <Icon size={Math.round(size * 0.5)} color={fg} />
    </View>
  )
}

export function CardTitle({ icon, title, right, tileBg, tileFg }: {
  icon: LucideIcon; title: string; right?: React.ReactNode; tileBg?: string; tileFg?: string
}) {
  return (
    <View style={{ flexDirection: 'row', alignItems: 'center', gap: 10 }}>
      <IconTile icon={icon} bg={tileBg} fg={tileFg} />
      <Txt variant="h3" style={{ flex: 1 }} numberOfLines={1}>{title}</Txt>
      {right}
    </View>
  )
}

// Tuiles de chiffres sur le bandeau vert.
export function StatTiles({ items, style }: {
  items: { icon?: LucideIcon; label: string; value: React.ReactNode }[]; style?: StyleProp<ViewStyle>
}) {
  return (
    <View style={[{ flexDirection: 'row', gap: 8 }, style]}>
      {items.map(s => (
        <View key={s.label} style={{ flex: 1, backgroundColor: C.white10, borderRadius: R.md, paddingHorizontal: 12, paddingVertical: 10 }}>
          <Txt variant="meta" color={C.foret100} numberOfLines={1}>{s.label}</Txt>
          {typeof s.value === 'string' || typeof s.value === 'number'
            ? <Txt variant="number" color={C.creme} style={{ marginTop: 2 }}>{s.value}</Txt>
            : <View style={{ marginTop: 2 }}>{s.value}</View>}
        </View>
      ))}
    </View>
  )
}

export function Chip({ label, icon: Icon, bg = C.foret50, fg = C.foret, border, style }: {
  label: string; icon?: LucideIcon; bg?: string; fg?: string; border?: string; style?: StyleProp<ViewStyle>
}) {
  return (
    <View style={[{ flexDirection: 'row', alignItems: 'center', gap: 4, alignSelf: 'flex-start', backgroundColor: bg, borderRadius: R.pill, paddingHorizontal: 10, paddingVertical: 4, borderWidth: border ? 1 : 0, borderColor: border }, style]}>
      {Icon && <Icon size={12} color={fg} />}
      <Txt style={{ fontFamily: F.bodyBold, fontSize: 12, color: fg }} numberOfLines={1}>{label}</Txt>
    </View>
  )
}

// Puce sélectionnable (filtres, choix).
export function ChoiceChip({ label, active, onPress, icon: Icon, onDark }: {
  label: string; active: boolean; onPress: () => void; icon?: LucideIcon; onDark?: boolean
}) {
  const bg = active ? (onDark ? C.creme : C.foret) : (onDark ? C.white10 : '#FFFFFF')
  const fg = active ? (onDark ? C.foret : C.creme) : (onDark ? C.creme : C.texte2)
  return (
    <Pressable
      accessibilityRole="button"
      accessibilityState={{ selected: active }}
      onPress={onPress}
      style={({ pressed }) => ({ flexDirection: 'row', alignItems: 'center', gap: 6, height: 38, paddingHorizontal: 14, borderRadius: R.pill, backgroundColor: bg, transform: [{ scale: pressed ? 0.96 : 1 }] })}
    >
      {Icon && <Icon size={15} color={fg} />}
      <Txt style={{ fontFamily: F.bodyBold, fontSize: 13, color: fg }}>{label}</Txt>
    </Pressable>
  )
}

export function ProgressBar({ pct, color = C.sauge, track = C.lin, height = 6 }: { pct: number; color?: string; track?: string; height?: number }) {
  return (
    <View style={{ height, borderRadius: R.pill, backgroundColor: track, overflow: 'hidden' }}>
      <View style={{ width: `${Math.max(0, Math.min(100, pct))}%`, height: '100%', borderRadius: R.pill, backgroundColor: color }} />
    </View>
  )
}

export function Divider({ dashed, style }: { dashed?: boolean; style?: StyleProp<ViewStyle> }) {
  return <View style={[{ borderTopWidth: 1, borderColor: C.filet, borderStyle: dashed ? 'dashed' : 'solid' }, style]} />
}

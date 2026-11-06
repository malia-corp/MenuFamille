import { ActivityIndicator, Pressable, StyleSheet, View, type StyleProp, type ViewStyle } from 'react-native'
import type { LucideIcon } from 'lucide-react-native'
import { C, F, R } from '@/theme'
import { Txt } from './Txt'

// orange : l'action principale (une seule par écran) · foret : action forte
// secondaire · ghost : contour filet · soft : vert très clair · onDark :
// translucide sur le bandeau vert · creme : clair sur le vert · danger : texte rouge.
export type ButtonTone = 'orange' | 'foret' | 'ghost' | 'soft' | 'onDark' | 'creme' | 'danger' | 'link'

const TONES: Record<ButtonTone, { bg: string; fg: string; border?: string }> = {
  orange: { bg: C.orange, fg: '#FFFFFF' },
  foret:  { bg: C.foret, fg: C.creme },
  ghost:  { bg: '#FFFFFF', fg: C.foret, border: C.filet },
  soft:   { bg: C.foret50, fg: C.foret },
  onDark: { bg: C.white10, fg: C.creme },
  creme:  { bg: C.creme, fg: C.foret },
  danger: { bg: 'transparent', fg: C.danger },
  link:   { bg: 'transparent', fg: C.foret },
}

interface ButtonProps {
  label?:    string
  icon?:     LucideIcon
  iconRight?: LucideIcon
  tone?:     ButtonTone
  size?:     'sm' | 'md' | 'lg'
  onPress?:  () => void
  disabled?: boolean
  loading?:  boolean
  full?:     boolean
  flex?:     boolean
  style?:    StyleProp<ViewStyle>
  accessibilityLabel?: string
}

export function Button({
  label, icon: Icon, iconRight: IconRight, tone = 'foret', size = 'md', onPress, disabled, loading, full, flex, style, accessibilityLabel,
}: ButtonProps) {
  const t = TONES[tone]
  const h = size === 'sm' ? 36 : size === 'lg' ? 52 : 44
  const iconOnly = !label
  return (
    <Pressable
      accessibilityRole="button"
      accessibilityLabel={accessibilityLabel ?? label}
      accessibilityState={{ disabled: !!disabled || !!loading, busy: !!loading }}
      onPress={onPress}
      disabled={disabled || loading}
      style={({ pressed }) => [
        styles.base,
        {
          height: h,
          minWidth: h,
          paddingHorizontal: iconOnly ? 0 : size === 'sm' ? 14 : 20,
          backgroundColor: t.bg,
          borderWidth: t.border ? 1.5 : 0,
          borderColor: t.border,
          opacity: disabled ? 0.5 : 1,
          transform: [{ scale: pressed ? 0.97 : 1 }],
        },
        full && { alignSelf: 'stretch' },
        flex && { flex: 1 },
        style,
      ]}
    >
      {loading ? <ActivityIndicator size="small" color={t.fg} /> : Icon ? <Icon size={size === 'lg' ? 20 : 17} color={t.fg} /> : null}
      {!!label && (
        <Txt style={{ fontFamily: F.bodyBold, fontSize: size === 'sm' ? 13 : 15, color: t.fg }} numberOfLines={1}>
          {label}
        </Txt>
      )}
      {IconRight ? <IconRight size={17} color={t.fg} /> : null}
    </Pressable>
  )
}

// Bouton rond icône seule (retour, options…).
export function IconButton({ icon: Icon, onPress, label, tone = 'ghostRound', size = 40, style }: {
  icon: LucideIcon; onPress?: () => void; label: string; tone?: 'ghostRound' | 'onDark' | 'creme' | 'white'; size?: number; style?: StyleProp<ViewStyle>
}) {
  const bg = tone === 'onDark' ? C.white10 : tone === 'creme' ? C.creme : tone === 'white' ? 'rgba(255,255,255,0.92)' : '#FFFFFF'
  const fg = tone === 'onDark' ? C.creme : C.foret
  return (
    <Pressable
      accessibilityRole="button"
      accessibilityLabel={label}
      onPress={onPress}
      hitSlop={6}
      style={({ pressed }) => [{ width: size, height: size, borderRadius: R.pill, backgroundColor: bg, alignItems: 'center', justifyContent: 'center', transform: [{ scale: pressed ? 0.94 : 1 }] }, style]}
    >
      <Icon size={Math.round(size * 0.45)} color={fg} />
    </Pressable>
  )
}

export function ButtonRow({ children, style }: { children: React.ReactNode; style?: StyleProp<ViewStyle> }) {
  return <View style={[{ flexDirection: 'row', gap: 8, alignItems: 'center' }, style]}>{children}</View>
}

const styles = StyleSheet.create({
  base: {
    flexDirection: 'row',
    alignItems: 'center',
    justifyContent: 'center',
    gap: 8,
    borderRadius: R.pill,
  },
})

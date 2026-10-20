import { useEffect, useRef, useState } from 'react'
import { Animated, Easing, Pressable, Switch as RNSwitch, View, type LayoutChangeEvent, type StyleProp, type ViewStyle } from 'react-native'
import type { LucideIcon } from 'lucide-react-native'
import { C, F, R } from '@/theme'
import { Txt } from './Txt'

// Bascule à pastille glissante (Par jour / Par repas, Chaque jour / Toute la
// semaine…) : la pastille vert forêt glisse sous l'option choisie.
export function Segmented<V extends string>({ options, value, onChange, tone = 'white', style }: {
  options: { value: V; label: string; icon?: LucideIcon }[]
  value: V
  onChange: (v: V) => void
  tone?: 'white' | 'creme'
  style?: StyleProp<ViewStyle>
}) {
  const [width, setWidth] = useState(0)
  const idx = Math.max(0, options.findIndex(o => o.value === value))
  const x = useRef(new Animated.Value(idx)).current
  useEffect(() => {
    Animated.spring(x, { toValue: idx, useNativeDriver: true, bounciness: 8, speed: 14 }).start()
  }, [idx, x])
  const seg = width > 0 ? (width - 8) / options.length : 0

  return (
    <View
      accessibilityRole="radiogroup"
      onLayout={(e: LayoutChangeEvent) => setWidth(e.nativeEvent.layout.width)}
      style={[{ flexDirection: 'row', padding: 4, borderRadius: R.pill, backgroundColor: tone === 'white' ? '#FFFFFF' : C.creme }, style]}
    >
      {seg > 0 && (
        <Animated.View
          pointerEvents="none"
          style={{
            position: 'absolute', top: 4, bottom: 4, left: 4, width: seg, borderRadius: R.pill, backgroundColor: C.foret,
            transform: [{ translateX: x.interpolate({ inputRange: [0, Math.max(1, options.length - 1)], outputRange: [0, seg * Math.max(1, options.length - 1)] }) }],
          }}
        />
      )}
      {options.map(o => {
        const active = o.value === value
        const fg = active ? C.creme : C.texte2
        return (
          <Pressable
            key={o.value}
            accessibilityRole="radio"
            accessibilityState={{ checked: active }}
            onPress={() => onChange(o.value)}
            style={{ flex: 1, height: 36, flexDirection: 'row', alignItems: 'center', justifyContent: 'center', gap: 6 }}
          >
            {o.icon && <o.icon size={15} color={fg} />}
            <Txt style={{ fontFamily: F.bodyBold, fontSize: 13, color: fg }} numberOfLines={1}>{o.label}</Txt>
          </Pressable>
        )
      })}
    </View>
  )
}

export function Toggle({ value, onChange, label, disabled }: { value: boolean; onChange: (v: boolean) => void; label: string; disabled?: boolean }) {
  return (
    <RNSwitch
      accessibilityLabel={label}
      value={value}
      onValueChange={onChange}
      disabled={disabled}
      trackColor={{ false: C.filet, true: C.foret500 }}
      thumbColor="#FFFFFF"
      ios_backgroundColor={C.filet}
      {...({ activeThumbColor: '#FFFFFF' } as object)}
    />
  )
}

// Bloc de squelette : reflet qui pulse (l'équivalent du kkb-bone du web).
export function Bone({ style, dark }: { style?: StyleProp<ViewStyle>; dark?: boolean }) {
  const o = useRef(new Animated.Value(0.55)).current
  useEffect(() => {
    const loop = Animated.loop(Animated.sequence([
      Animated.timing(o, { toValue: 1, duration: 700, easing: Easing.inOut(Easing.ease), useNativeDriver: true }),
      Animated.timing(o, { toValue: 0.55, duration: 700, easing: Easing.inOut(Easing.ease), useNativeDriver: true }),
    ]))
    loop.start()
    return () => loop.stop()
  }, [o])
  return <Animated.View style={[{ backgroundColor: dark ? 'rgba(255,255,255,0.14)' : C.filet, borderRadius: 8, opacity: o }, style]} />
}

export function EmptyState({ icon: Icon, title, description, action, style }: {
  icon: LucideIcon; title: string; description?: string; action?: React.ReactNode; style?: StyleProp<ViewStyle>
}) {
  return (
    <View style={[{ alignItems: 'center', gap: 10, paddingVertical: 32, paddingHorizontal: 24 }, style]}>
      <View style={{ width: 52, height: 52, borderRadius: R.pill, backgroundColor: C.foret50, alignItems: 'center', justifyContent: 'center' }}>
        <Icon size={24} color={C.foret} />
      </View>
      <Txt variant="h3" style={{ textAlign: 'center' }}>{title}</Txt>
      {!!description && <Txt variant="small" style={{ textAlign: 'center' }}>{description}</Txt>}
      {action}
    </View>
  )
}

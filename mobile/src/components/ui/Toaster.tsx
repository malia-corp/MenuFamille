import { useCallback, useEffect, useRef, useState } from 'react'
import { Animated, Easing, Pressable, View } from 'react-native'
import { useSafeAreaInsets } from 'react-native-safe-area-context'
import { Check, CircleAlert, Info, TriangleAlert, X, type LucideIcon } from 'lucide-react-native'
import { useToastStore, type ToastItem, type ToastVariant } from '@/lib/toast'
import { C, F, R, SHADOW } from '@/theme'
import { Txt } from './Txt'

const STYLE: Record<ToastVariant, { icon: LucideIcon; tile: string; fg: string; bar: string }> = {
  success: { icon: Check,         tile: C.sauge,   fg: C.profond, bar: C.sauge },
  error:   { icon: CircleAlert,   tile: C.orange,  fg: '#FFFFFF', bar: C.orange300 },
  warning: { icon: TriangleAlert, tile: C.jaune,   fg: C.profond, bar: C.jaune },
  info:    { icon: Info,          tile: C.white15, fg: C.creme,   bar: 'rgba(255,255,255,0.5)' },
}

// Messages éphémères, en haut de l'écran (même rendu que la version web).
export function Toaster() {
  const toasts = useToastStore(s => s.toasts)
  const dismiss = useToastStore(s => s.dismiss)
  const insets = useSafeAreaInsets()
  return (
    <View pointerEvents="box-none" style={{ position: 'absolute', top: insets.top + 8, left: 16, right: 16, gap: 8, zIndex: 1000, elevation: 1000 }}>
      {toasts.map(t => <Toast key={t.id} toast={t} onDismiss={dismiss} />)}
    </View>
  )
}

// Se ferme seul après sa durée ; un appui maintenu met le compte à rebours en pause.
function Toast({ toast, onDismiss }: { toast: ToastItem; onDismiss: (id: number) => void }) {
  const { icon: Icon, tile, fg, bar } = STYLE[toast.variant]
  const [paused, setPaused] = useState(false)
  const enter = useRef(new Animated.Value(0)).current
  const progress = useRef(new Animated.Value(1)).current
  const remaining = useRef(toast.duration)

  const close = useCallback(() => {
    Animated.timing(enter, { toValue: 0, duration: 180, useNativeDriver: true }).start(() => onDismiss(toast.id))
  }, [enter, onDismiss, toast.id])

  useEffect(() => {
    Animated.spring(enter, { toValue: 1, useNativeDriver: true, bounciness: 8 }).start()
  }, [enter])

  useEffect(() => {
    if (paused) return
    const started = Date.now()
    const anim = Animated.timing(progress, { toValue: 0, duration: remaining.current, easing: Easing.linear, useNativeDriver: false })
    anim.start()
    const timer = setTimeout(close, remaining.current)
    return () => {
      clearTimeout(timer)
      anim.stop()
      remaining.current = Math.max(0, remaining.current - (Date.now() - started))
    }
  }, [paused, close, progress])

  return (
    <Animated.View
      accessibilityRole={toast.variant === 'error' ? 'alert' : 'text'}
      accessibilityLiveRegion="polite"
      style={[{
        opacity: enter,
        transform: [{ translateY: enter.interpolate({ inputRange: [0, 1], outputRange: [-12, 0] }) }, { scale: enter.interpolate({ inputRange: [0, 1], outputRange: [0.96, 1] }) }],
      }]}
    >
      <Pressable
        onPressIn={() => setPaused(true)}
        onPressOut={() => setPaused(false)}
        style={[{ flexDirection: 'row', alignItems: 'center', gap: 12, backgroundColor: C.profond, borderRadius: R.lg, paddingVertical: 8, paddingLeft: 8, paddingRight: 6, overflow: 'hidden' }, SHADOW.float]}
      >
        <View style={{ width: 36, height: 36, borderRadius: R.pill, backgroundColor: tile, alignItems: 'center', justifyContent: 'center' }}>
          <Icon size={18} color={fg} />
        </View>
        <Txt style={{ flex: 1, fontFamily: F.bodySemi, fontSize: 14, color: C.creme, paddingVertical: 4 }}>{toast.message}</Txt>
        <Pressable accessibilityRole="button" accessibilityLabel="Fermer" onPress={close} hitSlop={8}
          style={{ width: 32, height: 32, borderRadius: R.pill, alignItems: 'center', justifyContent: 'center' }}>
          <X size={16} color={C.foret100} />
        </Pressable>
        <View style={{ position: 'absolute', left: 16, right: 16, bottom: 4, height: 3, borderRadius: 2, backgroundColor: C.white10, overflow: 'hidden' }}>
          <Animated.View style={{ height: '100%', backgroundColor: bar, borderRadius: 2, width: progress.interpolate({ inputRange: [0, 1], outputRange: ['0%', '100%'] }) }} />
        </View>
      </Pressable>
    </Animated.View>
  )
}

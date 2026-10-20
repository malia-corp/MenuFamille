import { useEffect, useRef } from 'react'
import { AccessibilityInfo, Animated, Easing, View } from 'react-native'
import Svg, { Circle, Ellipse, G, Path, Rect } from 'react-native-svg'
import { C as T, F } from '@/theme'
import { Txt } from '@/components/ui/Txt'

// Logo KeskonBouf (guide de marque v1.0, chapitre 02) : carnet ouvert,
// assiette où sourit un visage entouré de cinq convives. Tracé identique à
// components/brand/logo.tsx du web.

const G_ = '#294E3B', M = '#4C7A5E', O = '#E66B43', Y = '#F7C24A', S = '#8CBF96', CR = '#FFF7EE'
const RAYS = ['M8 58 L20 64', 'M5 80 L19 80', 'M8 102 L20 96', 'M192 58 L180 64', 'M195 80 L181 80', 'M192 102 L180 96']

export function LogoMark({ size = 32, reversed = false, rays = true }: { size?: number; reversed?: boolean; rays?: boolean }) {
  const line = reversed ? CR : G_
  return (
    <Svg viewBox="0 0 200 155" width={(size * 200) / 155} height={size} accessibilityElementsHidden importantForAccessibility="no">
      {rays && size >= 32 && (
        <G fill="none" stroke={Y} strokeWidth={5} strokeLinecap="round">
          {RAYS.map(d => <Path key={d} d={d} />)}
        </G>
      )}
      <G stroke={line} strokeWidth={5} strokeLinejoin="round" strokeLinecap="round">
        <Path d="M44 132 L38 150 L62 134 Z" fill={O} />
        <Path d="M100 34 L34 26 L34 132 L100 140 L166 132 L166 26 Z" fill={O} />
        <Path d="M100 36 Q74 20 42 20 L42 124 Q74 122 100 136 Z" fill={O} />
        <Path d="M100 36 Q126 20 158 20 L158 124 Q126 122 100 136 Z" fill={S} />
      </G>
      <Circle cx="100" cy="78" r="45" fill={CR} />
      <Plate />
    </Svg>
  )
}

// Contenu de l'assiette : couverts, convives, visage.
function Plate({ guestOpacity }: { guestOpacity?: Animated.AnimatedInterpolation<number>[] }) {
  const guests = [
    <Circle key="t" cx="70" cy="13" r="12" fill={O} />,
    <Ellipse key="l" cx="38" cy="32" rx="13" ry="9.5" transform="rotate(-32 38 32)" fill={M} />,
    <Ellipse key="r" cx="102" cy="32" rx="12" ry="9" transform="rotate(32 102 32)" fill={Y} />,
    <Circle key="br" cx="98" cy="95" r="10.5" fill={G_} />,
    <Circle key="bl" cx="42" cy="95" r="10.5" fill={M} />,
  ]
  return (
    <G transform="translate(100 79) scale(0.56) translate(-70 -58)">
      <Rect x="3" y="26" width="3.6" height="22" rx="1.8" fill={G_} />
      <Rect x="8.6" y="26" width="3.6" height="22" rx="1.8" fill={G_} />
      <Rect x="14.2" y="26" width="3.6" height="22" rx="1.8" fill={G_} />
      <Rect x="19.8" y="26" width="3.6" height="22" rx="1.8" fill={G_} />
      <Rect x="3" y="42" width="20.4" height="12" rx="6" fill={G_} />
      <Rect x="9" y="48" width="8.4" height="54" rx="4.2" fill={G_} />
      <Path d="M124 20 Q140 34 135 66 L124 66 Z" fill={G_} />
      <Rect x="123.5" y="60" width="10" height="42" rx="5" fill={G_} />
      {guests.map((g, i) => guestOpacity
        ? <AnimatedG key={i} opacity={guestOpacity[i]}>{g}</AnimatedG>
        : g)}
      <Circle cx="70" cy="60" r="30" fill={O} />
      <Path d="M55 63 Q70 81 85 63" fill="none" stroke={CR} strokeWidth={5} strokeLinecap="round" />
    </G>
  )
}

const AnimatedG = Animated.createAnimatedComponent(G)

// Logo complet : symbole + mot-symbole (Montserrat Black en capitales).
export function Logo({ size = 40, reversed = false }: { size?: number; reversed?: boolean }) {
  return (
    <View accessibilityRole="image" accessibilityLabel="KeskonBouf" style={{ flexDirection: 'row', alignItems: 'center', gap: size * 0.18 }}>
      <LogoMark size={size} reversed={reversed} />
      <Txt style={{ fontFamily: F.titleBlack, fontSize: size * 0.44, color: reversed ? T.creme : T.foret, letterSpacing: -0.5 }}>KESKONBOUF</Txt>
    </View>
  )
}

// « Les convives s'installent » : les cinq convives prennent place un à un,
// les rayons s'allument ; immobile si l'appareil demande moins d'animations.
export function LogoLoader({ size = 96, reversed = false }: { size?: number; reversed?: boolean }) {
  const t = useRef(new Animated.Value(1)).current
  useEffect(() => {
    let loop: Animated.CompositeAnimation | null = null
    AccessibilityInfo.isReduceMotionEnabled().then(reduce => {
      if (reduce) return
      t.setValue(0)
      loop = Animated.loop(Animated.timing(t, { toValue: 1, duration: 2600, easing: Easing.linear, useNativeDriver: false }))
      loop.start()
    }).catch(() => {})
    return () => loop?.stop()
  }, [t])

  const guestOpacity = [0, 0.12, 0.24, 0.36, 0.48].map(delay => {
    const start = 0.04 + delay / 2.6
    return t.interpolate({ inputRange: [0, start, start + 0.08, 0.76, 0.88, 1], outputRange: [0, 0, 1, 1, 0, 0], extrapolate: 'clamp' })
  })
  const raysOpacity = t.interpolate({ inputRange: [0, 0.36, 0.46, 0.7, 0.84, 1], outputRange: [0, 0, 1, 1, 0, 0] })
  const line = reversed ? CR : G_

  return (
    <Svg viewBox="0 0 200 155" width={(size * 200) / 155} height={size}>
      <AnimatedG opacity={raysOpacity} fill="none" stroke={Y} strokeWidth={5} strokeLinecap="round">
        {RAYS.map(d => <Path key={d} d={d} />)}
      </AnimatedG>
      <G stroke={line} strokeWidth={5} strokeLinejoin="round" strokeLinecap="round">
        <Path d="M44 132 L38 150 L62 134 Z" fill={O} />
        <Path d="M100 34 L34 26 L34 132 L100 140 L166 132 L166 26 Z" fill={O} />
        <Path d="M100 36 Q74 20 42 20 L42 124 Q74 122 100 136 Z" fill={O} />
        <Path d="M100 36 Q126 20 158 20 L158 124 Q126 122 100 136 Z" fill={S} />
      </G>
      <Circle cx="100" cy="78" r="45" fill={CR} />
      <Plate guestOpacity={guestOpacity} />
    </Svg>
  )
}

export function LogoLoaderScreen({ label = 'Chargement…' }: { label?: string }) {
  return (
    <View accessibilityRole="progressbar" accessibilityLabel={label} style={{ flex: 1, minHeight: 360, alignItems: 'center', justifyContent: 'center', gap: 16, backgroundColor: T.creme }}>
      <LogoLoader size={88} />
      <Txt variant="bodySemi" color={T.texte2} style={{ fontSize: 14 }}>{label}</Txt>
    </View>
  )
}

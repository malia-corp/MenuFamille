import { Pressable, View } from 'react-native'
import { Tabs } from 'expo-router'
import { useSafeAreaInsets } from 'react-native-safe-area-context'
import type { BottomTabBarProps } from '@react-navigation/bottom-tabs'
import { BookOpen, CalendarDays, Home, MessageSquare, Users, Vote, type LucideIcon } from 'lucide-react-native'
import { useSession } from '@/lib/session'
import { Txt } from '@/components/ui'
import { C, F, R, SHADOW } from '@/theme'

const META: Record<string, { label: string; icon: LucideIcon }> = {
  index:    { label: 'Accueil',  icon: Home },
  plan:     { label: 'Menu',     icon: CalendarDays },
  recipes:  { label: 'Recettes', icon: BookOpen },
  sondages: { label: 'Sondages', icon: Vote },
  avis:     { label: 'Avis',     icon: MessageSquare },
  circle:   { label: 'Ma table', icon: Users },
}

// Onglets selon le rôle (cf. components/layout/nav-items.ts du web) :
// planificatrice → Accueil, Menu, Recettes, Ma table ;
// membre → Accueil, Sondages, Avis, Ma table.
export default function TabsLayout() {
  const role = useSession(s => s.role)
  const member = role === 'membre'
  return (
    <Tabs screenOptions={{ headerShown: false }} tabBar={props => <PillTabBar {...props} member={member} />}>
      <Tabs.Screen name="index" />
      <Tabs.Screen name="plan"     options={{ href: member ? null : undefined }} />
      <Tabs.Screen name="recipes"  options={{ href: member ? null : undefined }} />
      <Tabs.Screen name="sondages" options={{ href: member ? undefined : null }} />
      <Tabs.Screen name="avis"     options={{ href: member ? undefined : null }} />
      <Tabs.Screen name="circle" />
    </Tabs>
  )
}

// Barre basse : pilule vert profond flottante ; l'onglet actif s'élargit et
// affiche son libellé (comme components/layout/bottom-nav.tsx).
const PLANNER_TABS = new Set(['index', 'plan', 'recipes', 'circle'])
const MEMBER_TABS = new Set(['index', 'sondages', 'avis', 'circle'])

function PillTabBar({ state, navigation, member }: BottomTabBarProps & { member: boolean }) {
  const insets = useSafeAreaInsets()
  const visible = state.routes.filter(r => (member ? MEMBER_TABS : PLANNER_TABS).has(r.name))
  return (
    <View pointerEvents="box-none" style={{ position: 'absolute', left: 16, right: 16, bottom: Math.max(insets.bottom, 12) + 4, alignItems: 'center' }}>
      <View style={[{ flexDirection: 'row', width: '100%', maxWidth: 420, padding: 6, gap: 4, borderRadius: R.pill, backgroundColor: C.profond }, SHADOW.float]}>
        {visible.map(route => {
          const focused = state.routes[state.index]?.key === route.key
          const meta = META[route.name] ?? { label: route.name, icon: Home }
          const Icon = meta.icon
          return (
            <Pressable
              key={route.key}
              accessibilityRole="tab"
              accessibilityState={{ selected: focused }}
              accessibilityLabel={meta.label}
              onPress={() => {
                const event = navigation.emit({ type: 'tabPress', target: route.key, canPreventDefault: true })
                if (!focused && !event.defaultPrevented) navigation.navigate(route.name)
              }}
              style={{
                flex: focused ? 2.2 : 1, height: 52, borderRadius: R.pill, flexDirection: 'row', alignItems: 'center', justifyContent: 'center', gap: 8,
                backgroundColor: focused ? C.creme : 'transparent',
              }}
            >
              <Icon size={21} color={focused ? C.foret : C.foret100} />
              {focused && <Txt numberOfLines={1} style={{ fontFamily: F.bodyBold, fontSize: 13, color: C.foret }}>{meta.label}</Txt>}
            </Pressable>
          )
        })}
      </View>
    </View>
  )
}

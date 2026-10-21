import { useCallback, useRef, useState } from 'react'
import { Pressable, RefreshControl, ScrollView, View, type StyleProp, type ViewStyle } from 'react-native'
import { useSafeAreaInsets } from 'react-native-safe-area-context'
import { router, useFocusEffect } from 'expo-router'
import { Bell } from 'lucide-react-native'
import { LogoMark } from '@/components/brand/Logo'
import { useSession } from '@/lib/session'
import { get } from '@/lib/api'
import { C, F, R } from '@/theme'
import { Txt } from './Txt'

// Hauteur réservée en bas pour la barre d'onglets flottante.
export const TAB_BAR_SPACE = 104

// Défilement d'un écran : marges, tirer pour rafraîchir, place pour la barre basse.
export function Screen({ children, onRefresh, withTabBar = true, header = true, style, contentStyle, scroll = true }: {
  children: React.ReactNode
  onRefresh?: () => Promise<void> | void
  withTabBar?: boolean
  header?: boolean
  style?: StyleProp<ViewStyle>
  contentStyle?: StyleProp<ViewStyle>
  scroll?: boolean
}) {
  const insets = useSafeAreaInsets()
  const [refreshing, setRefreshing] = useState(false)
  const refresh = useCallback(async () => {
    if (!onRefresh) return
    setRefreshing(true)
    try { await onRefresh() } finally { setRefreshing(false) }
  }, [onRefresh])

  const padTop = header ? 0 : insets.top + 8
  const padBottom = (withTabBar ? TAB_BAR_SPACE : 32) + insets.bottom

  return (
    <View style={[{ flex: 1, backgroundColor: C.creme }, style]}>
      {header && <AppHeader />}
      {scroll ? (
        <ScrollView
          contentContainerStyle={[{ paddingHorizontal: 16, paddingTop: padTop + 4, paddingBottom: padBottom, gap: 16 }, contentStyle]}
          keyboardShouldPersistTaps="handled"
          refreshControl={onRefresh ? <RefreshControl refreshing={refreshing} onRefresh={refresh} tintColor={C.foret} colors={[C.foret]} /> : undefined}
        >
          {children}
        </ScrollView>
      ) : (
        <View style={[{ flex: 1, paddingTop: padTop }, contentStyle]}>{children}</View>
      )}
    </View>
  )
}

// En-tête des onglets : logo, foyer, cloche (avis reçus) et avatar (profil).
export function AppHeader() {
  const insets = useSafeAreaInsets()
  const { displayName, circleName } = useSession()
  const [count, setCount] = useState(0)

  useFocusEffect(useCallback(() => {
    void get<{ count?: number }>('/api/surveys/unread-count').then(d => setCount(d?.count ?? 0))
  }, []))

  return (
    <View style={{ paddingTop: insets.top + 6, paddingHorizontal: 16, paddingBottom: 8, flexDirection: 'row', alignItems: 'center', gap: 10, backgroundColor: C.creme }}>
      <View style={{ width: 48, height: 48, borderRadius: R.pill, backgroundColor: '#FFFFFF', alignItems: 'center', justifyContent: 'center' }}>
        <LogoMark size={30} rays={false} />
      </View>
      <View style={{ flex: 1 }}>
        <Txt variant="meta" style={{ fontSize: 12 }}>Foyer</Txt>
        <Txt numberOfLines={1} style={{ fontFamily: F.title, fontSize: 17, color: C.foret }}>{circleName ?? 'KeskonBouf'}</Txt>
      </View>
      <Pressable
        accessibilityRole="button"
        accessibilityLabel={count > 0 ? `${count} nouveaux avis` : 'Notifications'}
        onPress={() => router.push(count > 0 ? '/votes/results' : '/settings/notifications')}
        style={{ width: 44, height: 44, borderRadius: R.pill, backgroundColor: '#FFFFFF', alignItems: 'center', justifyContent: 'center' }}
      >
        <Bell size={20} color={count > 0 ? C.orange : C.texte2} />
        {count > 0 && (
          <View style={{ position: 'absolute', top: 4, right: 4, minWidth: 18, height: 18, paddingHorizontal: 4, borderRadius: 9, backgroundColor: C.orange, borderWidth: 2, borderColor: '#FFFFFF', alignItems: 'center', justifyContent: 'center' }}>
            <Txt style={{ fontFamily: F.bodyBold, fontSize: 10, color: '#FFFFFF', lineHeight: 12 }}>{count > 9 ? '9+' : count}</Txt>
          </View>
        )}
      </Pressable>
      <Pressable
        accessibilityRole="button"
        accessibilityLabel="Mon profil"
        onPress={() => router.push('/profile')}
        style={{ width: 44, height: 44, borderRadius: R.pill, backgroundColor: C.foret, alignItems: 'center', justifyContent: 'center' }}
      >
        <Txt style={{ fontFamily: F.bodyBold, fontSize: 16, color: C.creme }}>{(displayName ?? '?').charAt(0).toUpperCase()}</Txt>
      </Pressable>
    </View>
  )
}

// Charge à l'arrivée sur l'écran, puis à chaque retour (après une modification ailleurs).
export function useReloadOnFocus(load: () => void | Promise<void>) {
  const ref = useRef(load)
  ref.current = load
  useFocusEffect(useCallback(() => {
    void ref.current()
  }, []))
}

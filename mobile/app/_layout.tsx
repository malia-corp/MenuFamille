import { useEffect } from 'react'
import { View } from 'react-native'
import { Stack, router, useSegments } from 'expo-router'
import { StatusBar } from 'expo-status-bar'
import { SafeAreaProvider } from 'react-native-safe-area-context'
import * as SplashScreen from 'expo-splash-screen'
import * as Notifications from 'expo-notifications'
import { useFonts } from 'expo-font'
import { Montserrat_700Bold, Montserrat_800ExtraBold, Montserrat_900Black } from '@expo-google-fonts/montserrat'
import { Quicksand_400Regular, Quicksand_500Medium, Quicksand_600SemiBold, Quicksand_700Bold } from '@expo-google-fonts/quicksand'
import { BricolageGrotesque_600SemiBold } from '@expo-google-fonts/bricolage-grotesque'
import { supabase } from '@/lib/supabase'
import { useSession } from '@/lib/session'
import { get } from '@/lib/api'
import { scheduleMealReminders, type ReminderPref } from '@/lib/reminders'
import { Toaster } from '@/components/ui'
import { LogoLoaderScreen } from '@/components/brand/Logo'
import { C } from '@/theme'

SplashScreen.preventAutoHideAsync().catch(() => {})

// Écrans accessibles sans compte : connexion et sondage public.
const PUBLIC_GROUPS = new Set(['(auth)', 's'])

export default function RootLayout() {
  const [fontsLoaded] = useFonts({
    Montserrat_700Bold, Montserrat_800ExtraBold, Montserrat_900Black,
    Quicksand_400Regular, Quicksand_500Medium, Quicksand_600SemiBold, Quicksand_700Bold,
    BricolageGrotesque_600SemiBold,
  })
  const { session, ready, setSession, refreshViewer } = useSession()
  const segments = useSegments()

  // Session : lecture au démarrage puis suivi des changements.
  useEffect(() => {
    supabase.auth.getSession().then(({ data }) => setSession(data.session))
    const { data: sub } = supabase.auth.onAuthStateChange((_event, s) => setSession(s))
    return () => sub.subscription.unsubscribe()
  }, [setSession])

  useEffect(() => { if (session) void refreshViewer() }, [session, refreshViewer])

  // Rappels locaux : reprogrammés au démarrage depuis les préférences enregistrées.
  const userId = session?.user.id
  useEffect(() => {
    if (!userId) return
    void get<ReminderPref[]>('/api/users/me/notification-prefs').then(p => { if (Array.isArray(p)) void scheduleMealReminders(p).catch(() => {}) })
  }, [userId])

  // Garde : sans session, vers la connexion ; connecté, jamais sur la connexion.
  useEffect(() => {
    if (!ready || !fontsLoaded) return
    const group = segments[0] ?? ''
    const isPublic = PUBLIC_GROUPS.has(group)
    if (!session && !isPublic) router.replace('/login')
    else if (session && group === '(auth)' && segments[1] === 'login') router.replace('/')
  }, [ready, fontsLoaded, session, segments])

  useEffect(() => {
    if (fontsLoaded && ready) SplashScreen.hideAsync().catch(() => {})
  }, [fontsLoaded, ready])

  // Rappel touché : ouvre l'app sur l'écran visé.
  useEffect(() => {
    const sub = Notifications.addNotificationResponseReceivedListener(r => {
      const url = r.notification.request.content.data?.url
      if (typeof url === 'string') router.push(url)
    })
    return () => sub.remove()
  }, [])

  if (!fontsLoaded || !ready) return <View style={{ flex: 1, backgroundColor: C.creme }}><LogoLoaderScreen /></View>

  return (
    <SafeAreaProvider>
      <StatusBar style="dark" />
      <Stack screenOptions={{ headerShown: false, contentStyle: { backgroundColor: C.creme }, animation: 'slide_from_right' }} />
      <Toaster />
    </SafeAreaProvider>
  )
}

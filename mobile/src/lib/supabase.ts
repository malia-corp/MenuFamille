import 'react-native-url-polyfill/auto'
import AsyncStorage from '@react-native-async-storage/async-storage'
import { AppState, Platform } from 'react-native'
import { createClient } from '@supabase/supabase-js'
import { SUPABASE_ANON_KEY, SUPABASE_URL } from './env'

// Client Supabase de l'app : session conservée sur l'appareil, rafraîchie
// tant que l'app est au premier plan. Sert à l'authentification et à l'envoi
// des photos (Storage) ; toute la logique métier passe par l'API web.
export const supabase = createClient(SUPABASE_URL || 'http://localhost', SUPABASE_ANON_KEY || 'anon', {
  auth: {
    storage:            Platform.OS === 'web' ? undefined : AsyncStorage,
    autoRefreshToken:   true,
    persistSession:     true,
    detectSessionInUrl: false,
  },
})

if (Platform.OS !== 'web') {
  AppState.addEventListener('change', state => {
    if (state === 'active') supabase.auth.startAutoRefresh()
    else supabase.auth.stopAutoRefresh()
  })
}

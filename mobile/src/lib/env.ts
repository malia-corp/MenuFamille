// Configuration lue au build (variables EXPO_PUBLIC_*, cf. .env.example).
export const API_URL = (process.env.EXPO_PUBLIC_API_URL ?? 'http://localhost:3000').replace(/\/$/, '')
export const SUPABASE_URL = process.env.EXPO_PUBLIC_SUPABASE_URL ?? ''
export const SUPABASE_ANON_KEY = process.env.EXPO_PUBLIC_SUPABASE_ANON_KEY ?? ''

// Lien public (sondage, invitation) : le site web, même origine que l'API.
export const WEB_URL = API_URL

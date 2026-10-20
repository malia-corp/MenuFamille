import { create } from 'zustand'
import type { Session } from '@supabase/supabase-js'
import { supabase } from './supabase'
import { api, clearApiCache, get } from './api'
import { pickActiveCircle } from '@/shared/active-circle'
import { cancelMealReminders } from './reminders'

export type Role = 'planificatrice' | 'membre' | null

interface Viewer {
  role:        Role
  displayName: string | null
  circleName:  string | null
}

interface SessionState extends Viewer {
  session: Session | null
  ready:   boolean // session lue au démarrage
  setSession: (s: Session | null) => void
  refreshViewer: () => Promise<void>
  logout: () => Promise<void>
}

// Session et « qui regarde » : rôle dans le cercle actif (navigation), nom,
// nom du cercle — l'équivalent de getViewer() du layout web.
export const useSession = create<SessionState>((set, get_) => ({
  session: null,
  ready: false,
  role: null,
  displayName: null,
  circleName: null,

  setSession: session => set({ session, ready: true }),

  refreshViewer: async () => {
    if (!get_().session) { set({ role: null, displayName: null, circleName: null }); return }
    const [me, circles] = await Promise.all([
      get<{ display_name: string | null }>('/api/users/me'),
      get<{ data?: { id: string; name: string; my_role: string }[]; active_circle_id?: string | null }>('/api/circles'),
    ])
    const circle = pickActiveCircle(circles)
    set({
      displayName: me?.display_name ?? null,
      role: (circle?.my_role as Role) ?? null,
      circleName: circle?.name ?? null,
    })
  },

  // Déconnexion : session, caches et rappels locaux (comme lib/utils/logout.ts).
  logout: async () => {
    await api('/api/auth/logout', { method: 'POST' }).catch(() => {})
    await supabase.auth.signOut().catch(() => {})
    await clearApiCache()
    await cancelMealReminders().catch(() => {})
    set({ session: null, role: null, displayName: null, circleName: null })
  },
}))

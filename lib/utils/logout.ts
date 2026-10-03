import { clearUserCaches } from './service-worker'

// Déconnexion commune (menu avatar, profil, paramètres).
export async function logout(): Promise<void> {
  await fetch('/api/auth/logout', { method: 'POST' }).catch(() => {})
  await clearUserCaches().catch(() => {})
}

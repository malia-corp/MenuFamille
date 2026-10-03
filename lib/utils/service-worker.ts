// Enregistrement unique du service worker (push + cache hors connexion).
// En dev, `?dev=1` coupe la mise en cache dans le SW (code non hashé).
export function registerServiceWorker(): Promise<ServiceWorkerRegistration> | null {
  if (typeof navigator === 'undefined' || !('serviceWorker' in navigator)) return null
  const url = process.env.NODE_ENV === 'production' ? '/sw.js' : '/sw.js?dev=1'
  return navigator.serviceWorker.register(url)
}

// Données propres au compte (réponses API, pages) : à vider à la déconnexion.
export async function clearUserCaches(): Promise<void> {
  if (typeof caches === 'undefined') return
  const names = await caches.keys()
  await Promise.all(names.filter((n) => n.startsWith('kkb-user-')).map((n) => caches.delete(n)))
}

// Service worker KeskonBouf : notifications push + cache hors connexion.
// Écrit à la main (pas de next-pwa) pour garder les handlers push existants.
// Enregistré via lib/utils/service-worker.ts ; en dev (`?dev=1`) le cache est
// désactivé pour ne jamais servir de code périmé pendant le rechargement à chaud.

const CACHE_DISABLED = new URL(self.location.href).searchParams.get('dev') === '1'

const VERSION = 'v1'
const CACHES = {
  static: `kkb-static-${VERSION}`,
  images: `kkb-images-${VERSION}`,
  ref:    `kkb-ref-${VERSION}`,
  // Données propres à l'utilisateur : vidées à la déconnexion (préfixe
  // kkb-user-, cf. lib/utils/logout.ts).
  api:    `kkb-user-api-${VERSION}`,
  pages:  `kkb-user-pages-${VERSION}`,
}

const HOUR = 60 * 60 * 1000
const DAY  = 24 * HOUR

self.addEventListener('install', () => {
  self.skipWaiting()
})

self.addEventListener('activate', (event) => {
  const keep = new Set(Object.values(CACHES))
  event.waitUntil(
    caches.keys()
      .then((names) => Promise.all(names.filter((n) => n.startsWith('kkb-') && !keep.has(n)).map((n) => caches.delete(n))))
      .then(() => self.clients.claim())
  )
})

// ─── Stratégies ──────────────────────────────────────────────────────────────

// Copie de la réponse avec sa date de mise en cache (pour l'expiration).
async function put(cacheName, request, response) {
  if (!response) return
  const cache = await caches.open(cacheName)
  // Image d'une autre origine (réponse opaque, illisible) : stockée telle
  // quelle, sans date — elle n'expire qu'au changement de VERSION.
  if (response.type === 'opaque') {
    await cache.put(request, response.clone())
    return
  }
  if (!response.ok) return
  const headers = new Headers(response.headers)
  headers.set('sw-cached-at', String(Date.now()))
  const body = await response.clone().blob()
  await cache.put(request, new Response(body, { status: response.status, statusText: response.statusText, headers }))
}

async function getFresh(cacheName, request, maxAge) {
  const cache = await caches.open(cacheName)
  const hit = await cache.match(request)
  if (!hit) return null
  const at = Number(hit.headers.get('sw-cached-at') || 0)
  if (maxAge && at && Date.now() - at > maxAge) {
    await cache.delete(request)
    return null
  }
  return hit
}

async function networkFirst(cacheName, request, maxAge) {
  try {
    const response = await fetch(request)
    put(cacheName, request, response).catch(() => {})
    return response
  } catch (err) {
    const cached = await getFresh(cacheName, request, maxAge)
    if (cached) return cached
    throw err
  }
}

async function cacheFirst(cacheName, request, maxAge) {
  const cached = await getFresh(cacheName, request, maxAge)
  if (cached) return cached
  const response = await fetch(request)
  put(cacheName, request, response).catch(() => {})
  return response
}

async function staleWhileRevalidate(cacheName, request, maxAge, event) {
  const cached = await getFresh(cacheName, request, maxAge)
  const network = fetch(request).then(async (response) => {
    put(cacheName, request, response).catch(() => {})
    return response
  })
  if (cached) {
    event.waitUntil(network.catch(() => {}))
    return cached
  }
  return network
}

// ─── Routage ─────────────────────────────────────────────────────────────────

self.addEventListener('fetch', (event) => {
  if (CACHE_DISABLED) return
  const { request } = event
  if (request.method !== 'GET') return

  const url = new URL(request.url)
  const sameOrigin = url.origin === self.location.origin

  // Pages : réseau d'abord, dernière version vue si hors connexion.
  if (request.mode === 'navigate' && sameOrigin) {
    event.respondWith(networkFirst(CACHES.pages, request, DAY))
    return
  }

  if (sameOrigin && url.pathname.startsWith('/_next/static/')) {
    event.respondWith(cacheFirst(CACHES.static, request))
    return
  }

  if (sameOrigin && url.pathname.startsWith('/api/meal-plans/')) {
    event.respondWith(networkFirst(CACHES.api, request, HOUR))
    return
  }

  if (sameOrigin && url.pathname === '/api/recipes') {
    event.respondWith(staleWhileRevalidate(CACHES.api, request, DAY, event))
    return
  }

  if (sameOrigin && url.pathname === '/api/categories') {
    event.respondWith(cacheFirst(CACHES.ref, request, 7 * DAY))
    return
  }

  // Images (photos de recettes, y compris le stockage Supabase et /_next/image).
  if (request.destination === 'image' || (sameOrigin && url.pathname.startsWith('/_next/image'))) {
    event.respondWith(cacheFirst(CACHES.images, request, 30 * DAY))
  }
})

// ─── Notifications push ──────────────────────────────────────────────────────

self.addEventListener('push', (event) => {
  if (!event.data) return

  let payload = {}
  try { payload = event.data.json() } catch { payload = { title: 'KeskonBouf', body: event.data.text() } }

  const { title = 'KeskonBouf', body = '', url = '/' } = payload

  event.waitUntil(
    self.registration.showNotification(title, {
      body,
      icon:  '/logo-icon-192.png',
      badge: '/logo-icon-192.png',
      data:  { url },
    })
  )
})

self.addEventListener('notificationclick', (event) => {
  event.notification.close()
  const url = event.notification.data?.url ?? '/'
  event.waitUntil(
    clients.matchAll({ type: 'window', includeUncontrolled: true }).then((windowClients) => {
      const existing = windowClients.find(w => w.url.includes(self.location.origin))
      if (existing) { existing.focus(); existing.navigate(url) }
      else clients.openWindow(url)
    })
  )
})

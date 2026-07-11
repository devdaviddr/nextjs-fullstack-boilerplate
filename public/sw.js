// Hand-rolled service worker — no build step, Turbopack-safe.
//
// SECURITY: this SW must never cache authenticated or dynamic responses.
// Caching /dashboard HTML or any /api response could leak one user's data to
// the next person on a shared device. Only immutable, non-personalized assets
// are cached; everything else is network-only with an offline fallback.
//
// Bump CACHE_VERSION to force old caches to be discarded on next activate.
const CACHE_VERSION = 'v1'
const ASSET_CACHE = `assets-${CACHE_VERSION}`
const OFFLINE_URL = '/offline'
const PRECACHE = [OFFLINE_URL, '/icon-192.png', '/manifest.webmanifest']

self.addEventListener('install', (event) => {
  event.waitUntil(
    caches.open(ASSET_CACHE).then((cache) => cache.addAll(PRECACHE)),
  )
  self.skipWaiting()
})

self.addEventListener('activate', (event) => {
  event.waitUntil(
    caches
      .keys()
      .then((keys) =>
        Promise.all(
          keys
            .filter((k) => k !== ASSET_CACHE)
            .map((k) => caches.delete(k)),
        ),
      )
      .then(() => self.clients.claim()),
  )
})

// Allow the page to trigger an immediate activation of a waiting SW.
self.addEventListener('message', (event) => {
  if (event.data === 'SKIP_WAITING') self.skipWaiting()
})

function isCacheableAsset(url) {
  return (
    url.pathname.startsWith('/_next/static/') ||
    url.pathname.startsWith('/icon-') ||
    /\.(?:css|js|woff2?|png|jpg|jpeg|gif|svg|webp|ico)$/.test(url.pathname)
  )
}

self.addEventListener('fetch', (event) => {
  const { request } = event
  if (request.method !== 'GET') return

  const url = new URL(request.url)

  // Only handle same-origin requests.
  if (url.origin !== self.location.origin) return

  // NEVER cache auth or API traffic — always hit the network.
  if (
    url.pathname.startsWith('/api/') ||
    url.pathname.startsWith('/api/auth/')
  ) {
    return
  }

  // Immutable, non-personalized assets → cache-first (stale-while-revalidate).
  if (isCacheableAsset(url)) {
    event.respondWith(
      caches.open(ASSET_CACHE).then(async (cache) => {
        const cached = await cache.match(request)
        const network = fetch(request)
          .then((response) => {
            if (response.ok) cache.put(request, response.clone())
            return response
          })
          .catch(() => cached)
        return cached || network
      }),
    )
    return
  }

  // Navigations (pages) → network-only, so authenticated HTML is never cached.
  // Fall back to the offline page when the network is unavailable.
  if (request.mode === 'navigate') {
    event.respondWith(
      fetch(request).catch(() => caches.match(OFFLINE_URL)),
    )
    return
  }

  // Everything else: pass through to the network.
})

// --- Push notifications (left as hooks; wire up later) ----------------------
// self.addEventListener('push', (event) => { /* show notification */ })
// self.addEventListener('notificationclick', (event) => { /* focus client */ })

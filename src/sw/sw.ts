// Hand-written service worker. The build replaces __SW_VERSION__ and __SW_PRECACHE__
// (see the precache plugin in vite.config.ts), so every deploy gets a fresh cache.

// `export {}` makes this a module so `self` can be narrowed to the service worker scope.
// oxlint-disable-next-line unicorn/require-module-specifiers
export {}
declare const self: ServiceWorkerGlobalScope
declare const __SW_VERSION__: string
declare const __SW_PRECACHE__: string[]

const CACHE = `bdl-${__SW_VERSION__}`
const FONT_ORIGINS = new Set(['https://fonts.googleapis.com', 'https://fonts.gstatic.com'])

self.addEventListener('install', event => {
  event.waitUntil(caches.open(CACHE).then(cache => cache.addAll(__SW_PRECACHE__)))
})

// No skipWaiting on install: the page asks for it from the "Update available" toast,
// so an update never swaps code out from under a puzzle in progress.
self.addEventListener('message', event => {
  if (event.data === 'skipWaiting') void self.skipWaiting()
})

self.addEventListener('activate', event => {
  event.waitUntil(
    (async () => {
      for (const key of await caches.keys()) if (key !== CACHE) await caches.delete(key)
      await self.clients.claim()
    })(),
  )
})

self.addEventListener('fetch', event => {
  const { request } = event
  if (request.method !== 'GET') return
  const { origin } = new URL(request.url)
  if (origin !== self.location.origin && !FONT_ORIGINS.has(origin)) return
  event.respondWith(request.mode === 'navigate' ? networkFirst(request) : cacheFirst(request))
})

async function networkFirst(request: Request): Promise<Response> {
  const cache = await caches.open(CACHE)
  try {
    const response = await fetch(request)
    if (response.ok) await cache.put(request, response.clone())
    return response
  } catch {
    return (
      (await cache.match(request, { ignoreSearch: true })) ??
      (await cache.match(self.registration.scope)) ??
      Response.error()
    )
  }
}

async function cacheFirst(request: Request): Promise<Response> {
  const cache = await caches.open(CACHE)
  const hit = await cache.match(request)
  if (hit) return hit
  const response = await fetch(request)
  if (response.ok) await cache.put(request, response.clone())
  return response
}

// Registers the service worker and reports when a new version is waiting.
// The update is applied only when the player taps "Update", never mid-puzzle.

type Listener = (waiting: ServiceWorker) => void

export function registerServiceWorker(onUpdate: Listener): void {
  if (!import.meta.env.PROD || !('serviceWorker' in navigator)) return
  let reloading = false
  navigator.serviceWorker.addEventListener('controllerchange', () => {
    if (reloading) return
    reloading = true
    location.reload()
  })
  void navigator.serviceWorker
    .register(`${import.meta.env.BASE_URL}sw.js`, { scope: import.meta.env.BASE_URL })
    .then(registration => {
      if (registration.waiting && navigator.serviceWorker.controller) onUpdate(registration.waiting)
      registration.addEventListener('updatefound', () => {
        const worker = registration.installing
        worker?.addEventListener('statechange', () => {
          if (worker.state === 'installed' && navigator.serviceWorker.controller) onUpdate(worker)
        })
      })
      document.addEventListener('visibilitychange', () => {
        if (document.visibilityState === 'visible') void registration.update()
      })
    })
    .catch((error: unknown) => console.warn('Service worker registration failed', error))
}

export function applyUpdate(waiting: ServiceWorker): void {
  waiting.postMessage('skipWaiting')
}

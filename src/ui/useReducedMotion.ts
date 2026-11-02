import { useSyncExternalStore } from 'react'

const query = matchMedia('(prefers-reduced-motion: reduce)')

export function useReducedMotion(): boolean {
  return useSyncExternalStore(
    notify => {
      query.addEventListener('change', notify)
      return () => query.removeEventListener('change', notify)
    },
    () => query.matches,
  )
}

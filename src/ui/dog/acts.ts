// How each engine dog act looks and sounds. Every act ends back in the idle pose.
import type { DogPose } from '../../art/dog.ts'
import type { DogSound } from '../../audio/dogSounds.ts'
import type { DogAct } from '../../engine/dog.ts'

export const IDLE_POSE: DogPose = 'sit'

export const ACTS: Record<DogAct, { pose: DogPose; sound: DogSound | null; ms: number }> = {
  trot: { pose: 'trot', sound: 'panting', ms: 1400 },
  paw: { pose: 'paw', sound: null, ms: 1500 },
  sniff: { pose: 'sniff', sound: 'sniffing', ms: 1600 },
  fetch: { pose: 'fetch', sound: 'happyBark', ms: 1800 },
  bark: { pose: 'wag', sound: 'happyBark', ms: 1000 },
  wag: { pose: 'wag', sound: 'tailThump', ms: 1400 },
  standGuard: { pose: 'standGuard', sound: 'growl', ms: 2200 },
  nuzzle: { pose: 'nuzzle', sound: 'panting', ms: 1600 },
}

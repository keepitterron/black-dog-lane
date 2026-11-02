// Plays engine dog acts one after another: pose + sound for the act's duration, then idle.
import { useEffect, useState } from 'react'
import type { DogPose } from '../../art/dog.ts'
import { playDogSound } from '../../audio/dogSounds.ts'
import type { DogAct } from '../../engine/dog.ts'
import { ACTS, IDLE_POSE } from './acts.ts'

type Current = { pose: DogPose; act: DogAct | null }
export type DogActor = Current & { play: (act: DogAct) => void; stop: () => void }

function createQueue(show: (current: Current) => void) {
  let queue: DogAct[] = []
  let timer: ReturnType<typeof setTimeout> | null = null
  const next = (): void => {
    const act = queue.shift()
    if (!act) {
      timer = null
      return show({ pose: IDLE_POSE, act: null })
    }
    const spec = ACTS[act]
    show({ pose: spec.pose, act })
    if (spec.sound) playDogSound(spec.sound)
    timer = setTimeout(next, spec.ms)
  }
  const play = (act: DogAct): void => {
    queue.push(act)
    if (!timer) next()
  }
  const stop = (): void => {
    queue = []
    if (timer) clearTimeout(timer)
    timer = null
    show({ pose: IDLE_POSE, act: null })
  }
  return { play, stop }
}

export function useDogActor(): DogActor {
  const [current, setCurrent] = useState<Current>({ pose: IDLE_POSE, act: null })
  const [queue] = useState(() => createQueue(setCurrent))
  useEffect(() => queue.stop, [queue])
  return { ...current, play: queue.play, stop: queue.stop }
}
